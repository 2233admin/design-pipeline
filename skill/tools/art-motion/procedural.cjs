"use strict";

// Seeded procedural materials and print-style processing for the materials catalog.
//
// Generators (raster PNG unless noted): paper, halftone, print (ink flats), architecture (SVG),
// motif (SVG). Effects turn any PNG into woodcut, halftone, papercut, photocopy or duotone.
// The same params + seed + version give the same bytes; materials-core records all three.
//
// Texture generators are calibrated, not tuned by eye: paper and ink flats are synthesised by
// random-phase noise shaped to the octave-band spectrum measured on a real scan, then matched to
// its lightness quantiles (texture-stats.cjs measures both). Profiles live in
// references/material-calibration.json or in a project's materials/calibration/<id>.json.

const fs = require("node:fs");
const path = require("node:path");
const { fail } = require("../../scripts/contract-utils.cjs");
const { decodePng } = require("../../scripts/png-core.cjs");
const { gaussianBlur, labPlanes, seededRandom } = require("./assets.cjs");
const { BAND_EDGES_MM, fft2 } = require("./texture-stats.cjs");

const SCOPE = "procedural";
const CALIBRATION = path.resolve(__dirname, "../../references/material-calibration.json");
const GENERATORS = Object.freeze({ paper: 1, halftone: 1, print: 1, architecture: 1, motif: 1 });
const EFFECTS = Object.freeze({ woodcut: 1, halftone: 1, papercut: 1, photocopy: 1, duotone: 1 });
const MAX_PIXELS = 16 * 1024 * 1024;

// ---- params ------------------------------------------------------------------------------------

function num(params, key, fallback, min, max) {
  const value = params[key] ?? fallback;
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) fail(SCOPE, `params.${key} must be a number from ${min} to ${max}`, { code: "OPTION_VALUE_INVALID" });
  return value;
}

function pick(params, key, fallback, allowed) {
  const value = params[key] ?? fallback;
  if (!allowed.includes(value)) fail(SCOPE, `params.${key} must be one of ${allowed.join(", ")}`, { code: "OPTION_VALUE_INVALID" });
  return value;
}

function hex(value, label) {
  if (typeof value !== "string" || !/^#[0-9a-f]{6}$/i.test(value)) fail(SCOPE, `${label} must be a #rrggbb colour`, { code: "OPTION_VALUE_INVALID" });
  return [1, 3, 5].map((i) => parseInt(value.slice(i, i + 2), 16));
}

function checkSeed(seed) {
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) fail(SCOPE, "--seed must be an integer from 0 to 4294967295", { code: "OPTION_VALUE_INVALID" });
  return seed;
}

function size(params, defaults) {
  const width = num(params, "width", defaults[0], 16, 8192), height = num(params, "height", defaults[1], 16, 8192);
  if (!Number.isInteger(width) || !Number.isInteger(height)) fail(SCOPE, "width and height must be integers", { code: "OPTION_VALUE_INVALID" });
  if (width * height > MAX_PIXELS) fail(SCOPE, `${width}x${height} exceeds ${MAX_PIXELS} pixels`, { code: "OPTION_VALUE_INVALID" });
  return [width, height];
}

// ---- calibration profiles ---------------------------------------------------------------------

function builtinProfiles() {
  return fs.existsSync(CALIBRATION) ? JSON.parse(fs.readFileSync(CALIBRATION, "utf8")) : { profiles: {} };
}

// A profile id is either built in or a project file materials/calibration/<id>.json.
function loadProfile(id, project) {
  const builtin = builtinProfiles().profiles[id];
  if (builtin) return { id, origin: "builtin", ...builtin };
  if (project) {
    const file = path.join(project, "materials", "calibration", `${id}.json`);
    if (fs.existsSync(file)) return { id, origin: "project", ...JSON.parse(fs.readFileSync(file, "utf8")) };
  }
  const known = Object.keys(builtinProfiles().profiles);
  fail(SCOPE, `unknown calibration profile ${id}. Fix: use one of ${known.join(", ")} or measure a scan with materials measure --name ${id}`, { code: "OPTION_VALUE_INVALID" });
}

// ---- colour ------------------------------------------------------------------------------------

function linearToSrgb(c) {
  const v = c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
  return Math.max(0, Math.min(255, Math.round(v * 255)));
}

function labToRgb(L, A, B) {
  const fy = (L + 16) / 116, fx = fy + A / 500, fz = fy - B / 200;
  const inv = (t) => (t ** 3 > 216 / 24389 ? t ** 3 : (116 * t - 16) / (24389 / 27));
  const x = 0.95047 * inv(fx), y = inv(fy), z = 1.08883 * inv(fz);
  return [
    linearToSrgb(3.2406 * x - 1.5372 * y - 0.4986 * z),
    linearToSrgb(-0.9689 * x + 1.8758 * y + 0.0415 * z),
    linearToSrgb(0.0557 * x - 0.204 * y + 1.057 * z),
  ];
}

function rgbToLab(rgb) {
  const lab = labPlanes({ width: 1, height: 1, data: Buffer.from([...rgb, 255]) });
  return [lab.L[0], lab.A[0], lab.B[0]];
}

const image = (width, height) => ({ width, height, data: Buffer.alloc(width * height * 4) });

// ---- noise -------------------------------------------------------------------------------------

function whiteNoise(n, random) {
  const out = new Float32Array(n);
  for (let i = 0; i < n; i += 1) out[i] = random.normal();
  return out;
}

// Smooth value noise with feature size `scale` px, mean 0, sd about 1, seeded.
function valueNoise(width, height, scale, random) {
  const gw = Math.ceil(width / scale) + 3, gh = Math.ceil(height / scale) + 3, grid = whiteNoise(gw * gh, random), out = new Float32Array(width * height);
  const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  for (let y = 0; y < height; y += 1) {
    const gy = y / scale, y0 = Math.floor(gy), ty = fade(gy - y0);
    for (let x = 0; x < width; x += 1) {
      const gx = x / scale, x0 = Math.floor(gx), tx = fade(gx - x0);
      const a = grid[y0 * gw + x0], b = grid[y0 * gw + x0 + 1], c = grid[(y0 + 1) * gw + x0], d = grid[(y0 + 1) * gw + x0 + 1];
      out[y * width + x] = (a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty) * 1.6;
    }
  }
  return out;
}

function fbm(width, height, scale, octaves, random, gain = 0.5) {
  const out = new Float32Array(width * height);
  let amp = 1, total = 0;
  for (let o = 0; o < octaves; o += 1) {
    const layer = valueNoise(width, height, Math.max(1, scale / 2 ** o), random);
    for (let i = 0; i < out.length; i += 1) out[i] += amp * layer[i];
    total += amp * amp; amp *= gain;
  }
  const norm = 1 / Math.sqrt(total);
  for (let i = 0; i < out.length; i += 1) out[i] *= norm;
  return out;
}

const nextPow2 = (n) => 2 ** Math.ceil(Math.log2(n));

// Random-phase noise whose octave-band amplitudes (L* RMS) equal the profile's, with the profile's
// orientation. This is spectrum-matching texture synthesis: the realisation is new, its band
// energy is the scan's. Output is periodic over the power-of-two canvas it is cut from.
function spectralNoise(width, height, { bands, pxPerMm, anisotropy = 0, orientationDeg = 0, line = null }, random) {
  const W = nextPow2(width), H = nextPow2(height), re = whiteNoise(W * H, random), im = new Float32Array(W * H);
  const reD = Float64Array.from(re), imD = Float64Array.from(im);
  fft2(reD, imD, W, H);
  const table = BAND_EDGES_MM.slice(0, -1).map((lo, i) => ({ label: `${lo}-${BAND_EDGES_MM[i + 1]}mm`, lo: lo * pxPerMm, hi: BAND_EDGES_MM[i + 1] * pxPerMm }));
  const target = table.map((band) => {
    let amp = bands[band.label];
    if (amp === undefined) return 0;
    if (line && line.periodMm * pxPerMm >= band.lo && line.periodMm * pxPerMm < band.hi) amp = Math.sqrt(Math.max(0, amp * amp - line.amplitude * line.amplitude));
    return amp;
  });
  // Finer bands the scan could not resolve but a finer generated grid can take the nearest
  // measured band's amplitude, falling 3 dB per octave, so the texture does not stop dead at a band
  // edge. Coarser unmeasured bands stay empty: no evidence, no energy.
  const known = target.map((v, i) => (bands[table[i].label] !== undefined ? i : -1)).filter((i) => i >= 0);
  if (known.length) for (let i = 0; i < known[0]; i += 1) target[i] = target[known[0]] * 0.7 ** (known[0] - i);
  const theta0 = (orientationDeg * Math.PI) / 180, a = Math.min(0.9, anisotropy);
  const bandOf = new Int8Array(W * H).fill(-1), power = new Float64Array(table.length);
  for (let ky = 0; ky < H; ky += 1) for (let kx = 0; kx < W; kx += 1) {
    const fx = (kx < W / 2 ? kx : kx - W) / W, fy = (ky < H / 2 ? ky : ky - H) / H, r = Math.hypot(fx, fy), i = ky * W + kx;
    if (!r) { reD[i] = 0; imD[i] = 0; continue; }
    const period = 1 / r, b = table.findIndex((band) => period >= band.lo && period < band.hi && band.lo >= 2);
    if (b < 0) { reD[i] = 0; imD[i] = 0; continue; }
    // 1/f amplitude inside an octave, times the measured orientation.
    const shape = (1 / r) * (1 + a * Math.cos(2 * (Math.atan2(fy, fx) - theta0)));
    reD[i] *= shape; imD[i] *= shape;
    bandOf[i] = b; power[b] += reD[i] * reD[i] + imD[i] * imD[i];
  }
  // Unnormalised forward FFT: variance of the inverse = sum |F|^2 / (W H)^2.
  const scale = table.map((_, b) => (power[b] ? (target[b] * W * H) / Math.sqrt(power[b]) : 0));
  for (let i = 0; i < W * H; i += 1) if (bandOf[i] >= 0) { reD[i] *= scale[bandOf[i]]; imD[i] *= scale[bandOf[i]]; }
  fft2(reD, imD, W, H, true);
  const out = new Float32Array(width * height);
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) out[y * width + x] = reD[y * W + x];
  if (line) {
    const t = (line.angleDeg * Math.PI) / 180, period = line.periodMm * pxPerMm, warp = valueNoise(width, height, period * 12, random), mod = valueNoise(width, height, period * 30, random);
    for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
      const i = y * width + x, u = x * Math.cos(t) + y * Math.sin(t);
      out[i] += line.amplitude * Math.SQRT2 * Math.cos((2 * Math.PI * u) / period + warp[i] * 0.15) * (0.85 + 0.15 * mod[i]);
    }
  }
  return out;
}

// Map values so their quantiles equal the target centred quantiles (histogram matching).
function matchQuantiles(values, quantiles) {
  const keys = [1, 5, 10, 25, 50, 75, 90, 95, 99], q = keys.map((k) => quantiles[`p${k}`]);
  if (q.some((v) => !Number.isFinite(v))) return values;
  let min = Infinity, max = -Infinity;
  for (const v of values) { if (v < min) min = v; if (v > max) max = v; }
  const bins = 4096, hist = new Float64Array(bins), span = max - min || 1;
  for (const v of values) hist[Math.min(bins - 1, Math.floor(((v - min) / span) * bins))] += 1;
  const cdf = new Float64Array(bins);
  let acc = 0;
  for (let i = 0; i < bins; i += 1) { acc += hist[i]; cdf[i] = (acc - hist[i] / 2) / values.length; }
  const pts = [[0, q[0] - (q[1] - q[0]) * 0.8], ...keys.map((k, i) => [k / 100, q[i]]), [1, q[8] + (q[8] - q[7]) * 0.8]];
  const inverse = (p) => {
    for (let i = 1; i < pts.length; i += 1) if (p <= pts[i][0]) return pts[i - 1][1] + ((p - pts[i - 1][0]) / (pts[i][0] - pts[i - 1][0])) * (pts[i][1] - pts[i - 1][1]);
    return pts[pts.length - 1][1];
  };
  const lut = Float32Array.from(cdf, inverse), out = new Float32Array(values.length);
  for (let i = 0; i < values.length; i += 1) out[i] = lut[Math.min(bins - 1, Math.floor(((values[i] - min) / span) * bins))];
  // The histogram decides the shape (skew, dark specks, light fibres); the spectrum already set the
  // amplitude, so restore the field's RMS.
  const rms = (v) => { let m = 0, s2 = 0; for (const x of v) m += x; m /= v.length; for (const x of v) s2 += (x - m) ** 2; return [m, Math.sqrt(s2 / v.length)]; };
  const [, before] = rms(values), [mean, after] = rms(out), k = after ? before / after : 1;
  for (let i = 0; i < out.length; i += 1) out[i] = (out[i] - mean) * k;
  return out;
}

// ---- paper -------------------------------------------------------------------------------------

const PAPER_DEFAULTS = Object.freeze({ profile: "laid-cream", pxPerMm: 4, strength: 1, creases: 0, wrinkle: 0, age: 0, foxing: 0, stains: 0, output: "color", whiteQuantile: 0.6 });

// L* deviation field of a paper (texture + non-stationary wear), plus its base Lab.
function paperField(width, height, params, random, project) {
  const profile = loadProfile(params.profile, project);
  if (!["paper", "print"].includes(profile.kind)) fail(SCOPE, `profile ${profile.id} is a ${profile.kind} profile, not paper`, { code: "OPTION_VALUE_INVALID" });
  const stats = profile.stats, pxPerMm = params.pxPerMm;
  let field = spectralNoise(width, height, { bands: stats.bands, pxPerMm, anisotropy: stats.anisotropy, orientationDeg: stats.orientationDeg, line: params.laid === false ? null : stats.line }, random);
  field = matchQuantiles(field, stats.quantiles);
  const base = [...(params.tint ? rgbToLab(hex(params.tint, "params.tint")) : stats.meanLab)];
  const A = new Float32Array(width * height), B = new Float32Array(width * height);
  for (let i = 0; i < field.length; i += 1) field[i] *= params.strength;
  const mm = pxPerMm;
  if (params.wrinkle > 0) {
    // Height field of soft wrinkles lit from the top left: shading = slope along the light.
    const h = fbm(width, height, 40 * mm, 3, random, 0.45);
    for (let y = 1; y < height - 1; y += 1) for (let x = 1; x < width - 1; x += 1) {
      const i = y * width + x, slope = (h[i - 1] - h[i + 1] + h[i - width] - h[i + width]) * 0.5;
      field[i] += params.wrinkle * slope * 40 * mm * 0.35;
    }
  }
  for (let c = 0; c < params.creases; c += 1) {
    // A fold: a straight ridge, lighter on the lit side, darker on the other, a little grime in it.
    const angle = random.uniform() * Math.PI, cx = random.uniform() * width, cy = random.uniform() * height, nx = Math.cos(angle), ny = Math.sin(angle), w = (0.6 + random.uniform()) * mm;
    const wobble = valueNoise(width, height, 30 * mm, random);
    for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
      const i = y * width + x, d = ((x - cx) * nx + (y - cy) * ny) / w + wobble[i] * 0.8;
      if (Math.abs(d) > 6) continue;
      field[i] += 4.5 * d * Math.exp(-d * d / 2) - 2.2 * Math.exp(-d * d * 2);
    }
  }
  if (params.age > 0) {
    // Yellowing toward the edges (oxidation starts at exposed edges) plus overall toning.
    const reach = 25 * mm;
    for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
      const i = y * width + x, edge = Math.exp(-Math.min(x, y, width - 1 - x, height - 1 - y) / reach);
      field[i] -= params.age * (2 + 5 * edge); B[i] += params.age * (6 + 9 * edge); A[i] += params.age * (0.8 + 1.5 * edge);
    }
  }
  const spots = Math.round(params.foxing * (width * height) / (mm * mm * 2500));
  for (let s = 0; s < spots; s += 1) {
    const cx = random.uniform() * width, cy = random.uniform() * height, r = (0.3 + random.uniform() ** 2 * 2.5) * mm, depth = 4 + random.uniform() * 10;
    for (let y = Math.max(0, Math.floor(cy - 3 * r)); y < Math.min(height, cy + 3 * r); y += 1) for (let x = Math.max(0, Math.floor(cx - 3 * r)); x < Math.min(width, cx + 3 * r); x += 1) {
      const d = Math.hypot(x - cx, y - cy) / r, k = Math.exp(-d * d * 1.5), i = y * width + x;
      field[i] -= depth * k; A[i] += depth * 0.35 * k; B[i] += depth * 1.1 * k;
    }
  }
  for (let s = 0; s < params.stains; s += 1) {
    // A dried water stain: a slightly darker disc with a darker tide line at its rim.
    const cx = random.uniform() * width, cy = random.uniform() * height, r = (10 + random.uniform() * 30) * mm, edge = valueNoise(width, height, 8 * mm, random);
    for (let y = Math.max(0, Math.floor(cy - 1.4 * r)); y < Math.min(height, cy + 1.4 * r); y += 1) for (let x = Math.max(0, Math.floor(cx - 1.4 * r)); x < Math.min(width, cx + 1.4 * r); x += 1) {
      const i = y * width + x, d = Math.hypot(x - cx, y - cy) / r + edge[i] * 0.06;
      if (d > 1.2) continue;
      const inside = d < 1 ? 1 : 0, rim = Math.exp(-((((d - 1) * r) / (0.8 * mm)) ** 2));
      field[i] -= 1.2 * inside + 5 * rim; B[i] += 2 * inside + 6 * rim;
    }
  }
  return { field, A, B, base, profile };
}

function paper(params, seed, project) {
  const p = { ...PAPER_DEFAULTS, ...params };
  const [width, height] = size(p, [1024, 1024]);
  num(p, "pxPerMm", 4, 0.5, 60); num(p, "strength", 1, 0, 4); num(p, "creases", 0, 0, 20); num(p, "wrinkle", 0, 0, 3); num(p, "age", 0, 0, 2); num(p, "foxing", 0, 0, 5); num(p, "stains", 0, 0, 10);
  pick(p, "output", "color", ["color", "multiply"]); num(p, "whiteQuantile", 0.6, 0.5, 1);
  const random = seededRandom(seed), { field, A, B, base, profile } = paperField(width, height, p, random, project), out = image(width, height);
  if (p.output === "multiply") {
    // Neutral layer for mix-blend-mode: multiply over an existing design. Multiply can only darken,
    // so the white point sits at whiteQuantile of the field: the lighter tail goes to white (no
    // change), the rest darkens by the paper's own L*. 0.6 keeps the mean shift near 0.5 sigma;
    // 1 keeps every fluctuation but greys the whole page by about 2.5 sigma.
    const sorted = Float32Array.from(field).sort(), top = sorted[Math.round(p.whiteQuantile * (sorted.length - 1))];
    const white = rgbToLab([255, 255, 255])[0];
    for (let i = 0; i < field.length; i += 1) {
      const [r, g, b] = labToRgb(white + Math.min(0, field[i] - top), A[i] * 0.3, B[i] * 0.3);
      out.data.set([r, g, b, 255], i * 4);
    }
  } else {
    for (let i = 0; i < field.length; i += 1) out.data.set([...labToRgb(base[0] + field[i], base[1] + A[i], base[2] + B[i]), 255], i * 4);
  }
  return { image: out, params: { ...p, width, height }, profile: { id: profile.id, origin: profile.origin, ...(profile.sha256 ? { sha256: profile.sha256 } : {}) }, measureAs: { kind: "paper", pxPerMm: p.pxPerMm } };
}

// ---- halftone ----------------------------------------------------------------------------------

const SPOTS = {
  round: (u, v) => Math.cos(2 * Math.PI * u) + Math.cos(2 * Math.PI * v), // Euclidean: round, checker at 50%
  ellipse: (u, v) => Math.cos(2 * Math.PI * u) + 0.6 * Math.cos(2 * Math.PI * v),
  square: (u, v) => -Math.max(Math.abs(u), Math.abs(v)),
  line: (u) => Math.cos(2 * Math.PI * u),
  cross: (u, v) => -Math.min(Math.abs(u), Math.abs(v)),
};
const SPOT_TABLE = new Map();
function spotTable(shape) {
  if (!SPOT_TABLE.has(shape)) {
    const n = 128, values = new Float32Array(n * n);
    for (let y = 0; y < n; y += 1) for (let x = 0; x < n; x += 1) values[y * n + x] = SPOTS[shape]((x + 0.5) / n - 0.5, (y + 0.5) / n - 0.5);
    const sorted = values.sort(), mean = sorted.reduce((a, b) => a + b, 0) / sorted.length;
    SPOT_TABLE.set(shape, { sorted, sd: Math.sqrt(sorted.reduce((a, b) => a + (b - mean) ** 2, 0) / sorted.length) });
  }
  return SPOT_TABLE.get(shape);
}

function inverseNormal(p) {
  // Acklam's rational approximation, |error| < 1.2e-9.
  const a = [-39.6968302866538, 220.946098424521, -275.928510446969, 138.357751867269, -30.6647980661472, 2.50662827745924];
  const b = [-54.4760987982241, 161.585836858041, -155.698979859887, 66.8013118877197, -13.2806815528857];
  const c = [-0.00778489400243029, -0.322396458041136, -2.40075827716184, -2.54973253934373, 4.37466414146497, 2.93816398269878];
  const d = [0.00778469570904146, 0.32246712907004, 2.445134137143, 3.75440866190742];
  const q = Math.min(1 - 1e-9, Math.max(1e-9, p));
  if (q < 0.02425) { const t = Math.sqrt(-2 * Math.log(q)); return (((((c[0] * t + c[1]) * t + c[2]) * t + c[3]) * t + c[4]) * t + c[5]) / ((((d[0] * t + d[1]) * t + d[2]) * t + d[3]) * t + 1); }
  if (q > 1 - 0.02425) { const t = Math.sqrt(-2 * Math.log(1 - q)); return -(((((c[0] * t + c[1]) * t + c[2]) * t + c[3]) * t + c[4]) * t + c[5]) / ((((d[0] * t + d[1]) * t + d[2]) * t + d[3]) * t + 1); }
  const t = q - 0.5, r = t * t;
  return ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * t) / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}

const HALFTONE_DEFAULTS = Object.freeze({ periodPx: 12, angleDeg: 45, shape: "round", mode: "am", coverage: 0.35, ink: "#0d0b0b", paper: "none", roughness: 0.35, mottle: 0.08, gain: 0.08, pxPerMm: 4, supersample: 3 });

function halftoneParams(params) {
  const p = { ...HALFTONE_DEFAULTS, ...params };
  if (params.lpi !== undefined) p.periodPx = (25.4 * num(p, "pxPerMm", 4, 0.5, 60)) / num(params, "lpi", 0, 5, 400);
  num(p, "periodPx", 12, 2, 400); num(p, "angleDeg", 45, -360, 360); num(p, "roughness", 0.35, 0, 2); num(p, "mottle", 0.08, 0, 1); num(p, "gain", 0.08, 0, 0.5); num(p, "supersample", 3, 1, 6);
  pick(p, "shape", "round", Object.keys(SPOTS)); pick(p, "mode", "am", ["am", "fm"]); hex(p.ink, "params.ink");
  return p;
}

// Coverage field (0..1 per pixel) to ink alpha: AM (spot function) or FM (clustered stochastic).
function screen(width, height, coverage, p, random) {
  const ss = Math.round(p.supersample), alpha = new Float32Array(width * height), period = p.periodPx;
  const rough = valueNoise(width * ss, height * ss, Math.max(1.5, (period * ss) / 3.2), random);
  const rough2 = valueNoise(width * ss, height * ss, Math.max(1, (period * ss) / 9), random);
  const mottle = fbm(width, height, period * 2.5, 3, random);
  const cov = (i) => { const c = Math.min(1, Math.max(0, coverage(i))); return Math.min(1, c + p.gain * 4 * c * (1 - c)); };
  if (p.mode === "fm") {
    const grain = Math.max(1, period / 2.4), W = width * ss, H = height * ss;
    let field = whiteNoise(W * H, random);
    const fine = gaussianBlur(field, W, H, (grain * ss) / 2.2), coarse = gaussianBlur(field, W, H, (grain * ss) * 1.2);
    let sd = 0;
    for (let i = 0; i < fine.length; i += 1) { fine[i] -= coarse[i]; sd += fine[i] * fine[i]; }
    sd = Math.sqrt(sd / fine.length) || 1;
    field = fine;
    for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
      const c = cov(y * width + x);
      if (c <= 0) continue;
      const t = inverseNormal(1 - c) * sd;
      let hit = 0;
      for (let sy = 0; sy < ss; sy += 1) for (let sx = 0; sx < ss; sx += 1) { const j = (y * ss + sy) * W + x * ss + sx; if (field[j] + p.roughness * 0.5 * sd * rough2[j] >= t) hit += 1; }
      alpha[y * width + x] = hit / (ss * ss);
    }
  } else {
    const { sorted, sd } = spotTable(p.shape), t0 = (p.angleDeg * Math.PI) / 180, cos = Math.cos(t0), sin = Math.sin(t0), W = width * ss;
    for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
      const c = cov(y * width + x);
      if (c <= 0) continue;
      const t = c >= 1 ? -Infinity : sorted[Math.min(sorted.length - 1, Math.floor((1 - c) * sorted.length))];
      let hit = 0;
      for (let sy = 0; sy < ss; sy += 1) for (let sx = 0; sx < ss; sx += 1) {
        const px = x + (sx + 0.5) / ss, py = y + (sy + 0.5) / ss, j = (y * ss + sy) * W + x * ss + sx;
        const u = (px * cos + py * sin) / period, v = (-px * sin + py * cos) / period;
        const s = SPOTS[p.shape](u - Math.floor(u) - 0.5, v - Math.floor(v) - 0.5) + p.roughness * sd * (0.75 * rough[j] + 0.35 * rough2[j]);
        if (s >= t) hit += 1;
      }
      alpha[y * width + x] = hit / (ss * ss);
    }
  }
  for (let i = 0; i < alpha.length; i += 1) alpha[i] *= Math.min(1, Math.max(0, 1 - p.mottle * (0.5 + 0.5 * mottle[i])));
  return alpha;
}

function coverageFunction(spec, width, height) {
  if (typeof spec === "number") {
    if (spec < 0 || spec > 1) fail(SCOPE, "params.coverage must be 0..1 or a ramp", { code: "OPTION_VALUE_INVALID" });
    return () => spec;
  }
  if (spec && typeof spec === "object" && ["x", "y", "radial"].includes(spec.ramp)) {
    const from = spec.from ?? 0.05, to = spec.to ?? 0.85;
    if (![from, to].every((v) => Number.isFinite(v) && v >= 0 && v <= 1)) fail(SCOPE, "params.coverage.from and .to must be 0..1", { code: "OPTION_VALUE_INVALID" });
    return (i) => {
      const x = (i % width) / (width - 1), y = Math.floor(i / width) / (height - 1);
      const t = spec.ramp === "x" ? x : spec.ramp === "y" ? y : Math.min(1, Math.hypot(x - 0.5, y - 0.5) * 2);
      return from + (to - from) * t;
    };
  }
  fail(SCOPE, 'params.coverage must be a number 0..1 or {"ramp":"x"|"y"|"radial","from":0.05,"to":0.85}', { code: "OPTION_VALUE_INVALID" });
}

// Ink alpha composited over a paper (multiply, as ink prints) or left as a transparent ink layer.
function inkOnPaper(width, height, layers, paperSpec, random, project, pxPerMm) {
  const out = image(width, height);
  let ground = null;
  if (paperSpec && paperSpec !== "none") {
    if (/^#/.test(paperSpec)) { const rgb = hex(paperSpec, "params.paper"); ground = (i) => rgb; }
    else {
      const sheet = paper({ profile: paperSpec, width, height, pxPerMm }, Math.floor(random.uniform() * 0xffffffff), project).image.data;
      ground = (i) => [sheet[i * 4], sheet[i * 4 + 1], sheet[i * 4 + 2]];
    }
  }
  for (let i = 0; i < width * height; i += 1) {
    if (ground) {
      const rgb = ground(i).map((v) => v / 255);
      for (const { alpha, ink, shade } of layers) for (let c = 0; c < 3; c += 1) rgb[c] *= 1 - alpha[i] * (1 - (shade ? shade[i * 3 + c] : ink[c]) / 255);
      out.data.set([...rgb.map((v) => Math.round(v * 255)), 255], i * 4);
    } else {
      // Transparent layer: one ink only (the first); alpha carries the dots, shade the ink's grain.
      const { alpha, ink, shade } = layers[0];
      out.data.set([...(shade ? shade.subarray(i * 3, i * 3 + 3) : ink), Math.round(alpha[i] * 255)], i * 4);
    }
  }
  return out;
}

function halftone(params, seed, project) {
  const p = halftoneParams(params);
  const [width, height] = size(p, [1024, 1024]);
  const random = seededRandom(seed), alpha = screen(width, height, coverageFunction(p.coverage, width, height), p, random);
  return { image: inkOnPaper(width, height, [{ alpha, ink: hex(p.ink, "params.ink") }], p.paper, random, project, p.pxPerMm), params: { ...p, width, height }, measureAs: { kind: "halftone", pxPerMm: p.pxPerMm } };
}

// ---- print (ink flats) -------------------------------------------------------------------------

const PRINT_DEFAULTS = Object.freeze({ profile: "woodblock-indigo", ink: "#1d2a3a", paper: "laid-cream", pxPerMm: 4, margin: 0.08, edgeRoughMm: 0.35, starvation: 0, pile: 0.25, strength: 1, misregisterMm: [0, 0], second: null });

// A flat of ink as it prints: grain, wood grain and light specks from a measured ink-flat profile
// (its spectrum and lightness quantiles already hold the specks), extra starved voids only when
// asked (starvation, a fraction of the area), ink piled at the edges, a rough edge, and an
// optional second ink misregistered by misregisterMm.
function printFlat(params, seed, project) {
  const p = { ...PRINT_DEFAULTS, ...params };
  const [width, height] = size(p, [1024, 1024]);
  num(p, "pxPerMm", 4, 0.5, 60); num(p, "margin", 0.08, 0, 0.45); num(p, "edgeRoughMm", 0.35, 0, 5); num(p, "pile", 0.25, 0, 1); num(p, "strength", 1, 0, 4);
  if (!Array.isArray(p.misregisterMm) || p.misregisterMm.length !== 2 || p.misregisterMm.some((v) => !Number.isFinite(v) || Math.abs(v) > 20)) fail(SCOPE, "params.misregisterMm must be [dx, dy] in mm, each within 20", { code: "OPTION_VALUE_INVALID" });
  const profile = loadProfile(p.profile, project);
  if (profile.kind !== "print") fail(SCOPE, `profile ${profile.id} is a ${profile.kind} profile; print needs an ink-flat profile`, { code: "OPTION_VALUE_INVALID" });
  const stats = profile.stats, random = seededRandom(seed), mm = p.pxPerMm;
  const starvation = num(p, "starvation", 0, 0, 0.6);
  // The ink colour is how the flat should look on this paper: divide out the paper's own colour
  // so ink x paper lands on it (multiply compositing, as ink prints).
  const paperRgb = p.paper === "none" ? [255, 255, 255] : /^#/.test(p.paper) ? hex(p.paper, "params.paper") : labToRgb(...loadProfile(p.paper, project).stats.meanLab);
  const layer = (ink, offset) => {
    let grain = spectralNoise(width, height, { bands: stats.bands, pxPerMm: mm, anisotropy: stats.anisotropy, orientationDeg: stats.orientationDeg }, random);
    grain = matchQuantiles(grain, stats.quantiles);
    const inkLab = rgbToLab(ink), shade = new Uint8Array(width * height * 3);
    const voids = gaussianBlur(whiteNoise(width * height, random), width, height, 0.35 * mm), sorted = Float32Array.from(voids).sort();
    const tVoid = sorted[Math.min(sorted.length - 1, Math.floor((1 - starvation) * sorted.length))];
    const edgeNoise = valueNoise(width, height, 1.2 * mm, random), m = p.margin;
    const alpha = new Float32Array(width * height), [dx, dy] = offset.map((v) => v * mm);
    for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
      const i = y * width + x, fx = x - dx, fy = y - dy;
      const inside = Math.min(fx - m * width, width * (1 - m) - fx, fy - m * height, height * (1 - m) - fy) + edgeNoise[i] * p.edgeRoughMm * mm;
      if (inside <= 0) continue;
      // grain is in L* units of the scan's flat: the ink's own lightness varies by it (as the flat
      // would print on white), ink piles up and darkens within about 0.6 mm of the edge.
      const pile = p.pile * 10 * Math.exp(-inside / (0.6 * mm));
      const rgb = labToRgb(Math.max(0, inkLab[0] + grain[i] * p.strength - pile), inkLab[1], inkLab[2]);
      for (let c = 0; c < 3; c += 1) shade[i * 3 + c] = Math.min(255, Math.round((rgb[c] * 255) / Math.max(paperRgb[c], 1)));
      alpha[i] = Math.min(1, inside) * (starvation > 0 && voids[i] > tVoid ? 0.35 : 1);
    }
    return { alpha, ink, shade };
  };
  const layers = [layer(hex(p.ink, "params.ink"), [0, 0])];
  if (p.second) layers.push(layer(hex(p.second, "params.second"), p.misregisterMm));
  return { image: inkOnPaper(width, height, layers, p.paper, random, project, mm), params: { ...p, width, height, starvation }, profile: { id: profile.id, origin: profile.origin }, measureAs: { kind: "print", pxPerMm: mm, roi: [p.margin + 0.05, p.margin + 0.05, 1 - p.margin - 0.05, 1 - p.margin - 0.05] } };
}

// ---- architecture (SVG) ------------------------------------------------------------------------

const pts = (a) => a.map((q) => q.map((v) => +v.toFixed(2)).join(",")).join(" ");
const lerp = (a, b, t) => a + (b - a) * t;
const lp = (p, q, t) => [lerp(p[0], q[0], t), lerp(p[1], q[1], t)];

const ARCH_DEFAULTS = Object.freeze({ scene: "corridor", width: 1920, height: 1080, vp: [0.5, 0.45], depth: 8, ratio: 0.74, stroke: "#0d0b0b", fill: "#f2eee4", accent: "#d10e1f", floorA: "#0d0b0b", floorB: "#f2eee4", strokeWidth: 4, tiles: 8, doors: 3, lights: true });
const SCENES = ["corridor", "stairs", "windows", "arcade", "checker"];

// Distance from point p to the infinite line through a and b.
function lineResidual(a, b, p) {
  const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy);
  return len ? Math.abs(dy * (p[0] - a[0]) - dx * (p[1] - a[1])) / len : 0;
}

function architecture(params, seed) {
  const p = { ...ARCH_DEFAULTS, ...params };
  const [W, H] = size(p, [1920, 1080]);
  pick(p, "scene", "corridor", SCENES);
  for (const key of ["stroke", "fill", "accent", "floorA", "floorB"]) hex(p[key], `params.${key}`);
  if (!Array.isArray(p.vp) || p.vp.length !== 2 || p.vp.some((v) => !Number.isFinite(v) || v < -1 || v > 2)) fail(SCOPE, "params.vp must be [x, y] fractions of the canvas (may lie outside, -1..2)", { code: "OPTION_VALUE_INVALID" });
  num(p, "depth", 8, 1, 40); num(p, "ratio", 0.74, 0.3, 0.97); num(p, "strokeWidth", 4, 0.5, 40); num(p, "tiles", 8, 2, 40); num(p, "doors", 3, 0, 20);
  const random = seededRandom(seed), vp = [p.vp[0] * W, p.vp[1] * H], sw = p.strokeWidth, o = [], residuals = [];
  const S = (q) => `stroke="${p.stroke}" stroke-width="${q.toFixed(2)}"`;
  if (p.scene === "corridor" || p.scene === "arcade") {
    const fr = [];
    for (let k = 0; k <= p.depth; k += 1) {
      const s = p.ratio ** k, tl = [vp[0] - vp[0] * s - 0.02 * W * s, vp[1] - vp[1] * s - 0.02 * H * s], br = [vp[0] + (W - vp[0]) * s + 0.02 * W * s, vp[1] + (H - vp[1]) * s + 0.02 * H * s];
      fr.push([tl, [br[0], tl[1]], br, [tl[0], br[1]]]);
    }
    for (let k = 0; k < p.depth; k += 1) {
      const a = fr[k], b = fr[k + 1];
      o.push(`<polygon points="${pts([a[0], a[1], b[1], b[0]])}" fill="${p.fill}"/>`, `<polygon points="${pts([a[0], b[0], b[3], a[3]])}" fill="${p.fill}"/>`, `<polygon points="${pts([a[1], b[1], b[2], a[2]])}" fill="${p.fill}"/>`);
      for (let r = 0; r < 2; r += 1) for (let i = 0; i < p.tiles; i += 1) {
        const L0 = lp(a[3], b[3], r / 2), R0 = lp(a[2], b[2], r / 2), L1 = lp(a[3], b[3], (r + 1) / 2), R1 = lp(a[2], b[2], (r + 1) / 2);
        o.push(`<polygon points="${pts([lp(L0, R0, i / p.tiles), lp(L0, R0, (i + 1) / p.tiles), lp(L1, R1, (i + 1) / p.tiles), lp(L1, R1, i / p.tiles)])}" fill="${(i + r) % 2 ? p.floorA : p.floorB}"/>`);
      }
      if (p.scene === "arcade") {
        // An arch per bay on both walls: a semicircle on the bay's opening, in wall perspective.
        for (const side of [[0, 3], [1, 2]]) {
          const top0 = a[side[0]], bot0 = a[side[1]], top1 = b[side[0]], bot1 = b[side[1]], arch = [];
          for (let t = 0; t <= 16; t += 1) {
            const ang = Math.PI * (t / 16), u = 0.5 - 0.42 * Math.cos(ang), hgt = 0.55 + 0.25 * Math.sin(ang);
            arch.push(lp(lp(bot0, bot1, u), lp(top0, top1, u), hgt));
          }
          arch.push(lp(bot0, bot1, 0.92), lp(bot0, bot1, 0.08));
          o.push(`<polygon points="${pts(arch)}" fill="${p.stroke}"/>`);
        }
      }
      if (p.lights && p.scene === "corridor") {
        const c0 = lp(a[0], a[1], 0.5), c1 = lp(b[0], b[1], 0.5), q0 = lp(c0, c1, 0.3), q1 = lp(c0, c1, 0.6), w0 = (a[1][0] - a[0][0]) * 0.07, w1 = (b[1][0] - b[0][0]) * 0.07;
        o.push(`<polygon points="${pts([[q0[0] - w0, q0[1]], [q0[0] + w0, q0[1]], [q1[0] + w1, q1[1]], [q1[0] - w1, q1[1]]])}" fill="${p.fill}" ${S(sw * 0.5)}/>`);
      }
    }
    if (p.scene === "corridor") for (let d = 0; d < p.doors; d += 1) {
      const k = Math.min(p.depth - 1, Math.floor(random.uniform() * Math.min(p.depth, 5))), a = fr[k], b = fr[k + 1], side = random.uniform() < 0.5 ? [0, 3] : [1, 2];
      const B0 = lp(a[side[1]], b[side[1]], 0.25), B1 = lp(a[side[1]], b[side[1]], 0.7), T0 = lp(B0, lp(a[side[0]], b[side[0]], 0.25), 0.62), T1 = lp(B1, lp(a[side[0]], b[side[0]], 0.7), 0.62);
      o.push(`<polygon points="${pts([B0, T0, T1, B1])}" fill="${d % 2 ? p.accent : p.stroke}" ${S(sw * 0.6)}/>`);
    }
    for (let k = 0; k <= p.depth; k += 1) o.push(`<polygon points="${pts(fr[k])}" fill="none" ${S(Math.max(1, sw * p.ratio ** (k * 0.6)))}/>`);
    for (let c = 0; c < 4; c += 1) {
      o.push(`<line x1="${fr[0][c][0].toFixed(2)}" y1="${fr[0][c][1].toFixed(2)}" x2="${fr[p.depth][c][0].toFixed(2)}" y2="${fr[p.depth][c][1].toFixed(2)}" ${S(sw)}/>`);
      residuals.push(lineResidual(fr[0][c], fr[p.depth][c], vp));
    }
    o.push(`<polygon points="${pts(fr[p.depth])}" fill="${p.accent}"/>`);
  } else if (p.scene === "checker") {
    const hy = vp[1], spread = W * 2.2, rows = Math.round(p.tiles * 1.4), cols = p.tiles * 2;
    o.push(`<rect width="${W}" height="${H}" fill="${p.floorB}"/>`);
    const xs = (i, Y) => vp[0] + (vp[0] - spread / 2 + (spread * i) / cols - vp[0]) * ((Y - hy) / (H - hy));
    const ys = (j) => hy + (H - hy) * (j / rows) ** 1.9;
    for (let j = 0; j < rows; j += 1) for (let i = 0; i < cols; i += 1) {
      if ((i + j) % 2) continue;
      const Y0 = ys(j), Y1 = ys(j + 1);
      o.push(`<polygon points="${pts([[xs(i, Y0), Y0], [xs(i + 1, Y0), Y0], [xs(i + 1, Y1), Y1], [xs(i, Y1), Y1]])}" fill="${p.floorA}"/>`);
    }
    for (let i = 0; i <= cols; i += 2) residuals.push(lineResidual([xs(i, ys(1)), ys(1)], [xs(i, H), H], vp));
    o.push(`<rect width="${W}" height="${hy.toFixed(2)}" fill="${p.fill}"/>`);
  } else if (p.scene === "stairs") {
    // Stairs climbing to the vanishing point: each tread a band shrinking toward vp.
    const x0 = W * 0.2, x1 = W * 0.8, base = H;
    for (let i = 0; i < p.depth * 2; i += 1) {
      const s0 = 0.86 ** i, s1 = 0.86 ** (i + 1), P = (x, k) => [vp[0] + (x - vp[0]) * k, vp[1] + (base - vp[1]) * k];
      const L0 = P(x0, s0), R0 = P(x1, s0), L1 = P(x0, s1), R1 = P(x1, s1), Lm = lp(L0, L1, 0.45), Rm = lp(R0, R1, 0.45);
      o.push(`<polygon points="${pts([L0, R0, Rm, Lm])}" fill="${p.stroke}"/>`, `<polygon points="${pts([Lm, Rm, R1, L1])}" fill="${p.fill}" ${S(sw * 0.5)}/>`);
      if (i === 0) residuals.push(lineResidual(L0, L1, vp), lineResidual(R0, R1, vp));
    }
  } else if (p.scene === "windows") {
    // A facade of identical windows receding to the vanishing point (one-point perspective).
    const cols = p.tiles, rows = Math.max(2, Math.round(p.tiles * 0.7)), lit = new Set(Array.from({ length: Math.max(1, Math.round(cols * rows * 0.06)) }, () => Math.floor(random.uniform() * cols * rows)));
    o.push(`<rect width="${W}" height="${H}" fill="${p.fill}"/>`);
    // A wall from the left canvas edge receding to vp: every row line runs through vp.
    const P = (u, v) => { const s = p.ratio ** ((u * p.depth) / cols); return [vp[0] + (0 - vp[0]) * s, vp[1] + (v * H - vp[1]) * s]; };
    for (let r = 0; r < rows; r += 1) for (let c = 0; c < cols; c += 1) {
      const g = 0.18, q = [P(c + g, (r + g) / rows), P(c + 1 - g, (r + g) / rows), P(c + 1 - g, (r + 1 - g) / rows), P(c + g, (r + 1 - g) / rows)];
      o.push(`<polygon points="${pts(q)}" fill="${lit.has(r * cols + c) ? p.accent : p.stroke}"/>`);
    }
    for (let r = 0; r <= rows; r += 1) residuals.push(lineResidual(P(0, r / rows), P(cols, r / rows), vp));
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="${p.fill}"/>${o.join("")}</svg>\n`;
  return { svg, params: { ...p, width: W, height: H }, geometry: { vanishingPoint: vp.map((v) => +v.toFixed(2)), vanishingResidualPx: +Math.max(0, ...residuals).toFixed(4), linesChecked: residuals.length } };
}

// ---- motif (SVG) -------------------------------------------------------------------------------

const MOTIF_DEFAULTS = Object.freeze({ motif: "gear", width: 1024, height: 1024, count: 14, fill: "#0d0b0b", accent: "#d10e1f", background: "none", inner: 0.78 });
const MOTIFS = ["gear", "rosette", "star", "sunburst", "rings", "spiral", "lattice"];

function motif(params, seed) {
  const p = { ...MOTIF_DEFAULTS, ...params };
  const [W, H] = size(p, [1024, 1024]);
  pick(p, "motif", "gear", MOTIFS); num(p, "count", 14, 3, 96); num(p, "inner", 0.78, 0.1, 0.98); hex(p.fill, "params.fill"); hex(p.accent, "params.accent");
  if (p.background !== "none") hex(p.background, "params.background");
  const random = seededRandom(seed), cx = W / 2, cy = H / 2, R = Math.min(W, H) * 0.46, n = Math.round(p.count), o = [];
  const polar = (r, a) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  if (p.motif === "gear") {
    const q = [];
    for (let i = 0; i < n * 4; i += 1) q.push(polar(i % 4 < 2 ? R : R * p.inner, (i / (n * 4)) * 2 * Math.PI));
    o.push(`<path fill-rule="evenodd" fill="${p.fill}" d="M${pts(q).replace(/ /g, " L")} Z M${cx + R * 0.3},${cy} a${R * 0.3},${R * 0.3} 0 1,0 ${-R * 0.6},0 a${R * 0.3},${R * 0.3} 0 1,0 ${R * 0.6},0 Z"/>`);
  } else if (p.motif === "rosette") {
    for (let i = 0; i < n; i += 1) o.push(`<ellipse cx="${cx}" cy="${cy - R * 0.5}" rx="${(R * Math.PI / n) * 0.62}" ry="${R * 0.5}" fill="${i % 2 ? p.fill : p.accent}" transform="rotate(${(360 / n) * i} ${cx} ${cy})"/>`);
    o.push(`<circle cx="${cx}" cy="${cy}" r="${R * 0.2}" fill="${p.fill}"/>`);
  } else if (p.motif === "star") {
    const q = [];
    for (let i = 0; i < n * 2; i += 1) q.push(polar(i % 2 ? R * (1 - p.inner) + R * 0.15 : R, (i / (n * 2)) * 2 * Math.PI - Math.PI / 2));
    o.push(`<polygon points="${pts(q)}" fill="${p.fill}"/>`);
  } else if (p.motif === "sunburst") {
    for (let i = 0; i < n; i += 1) o.push(`<polygon points="${pts([[cx, cy], polar(R * 1.6, (i / n) * 2 * Math.PI), polar(R * 1.6, ((i + 0.5) / n) * 2 * Math.PI)])}" fill="${p.fill}"/>`);
  } else if (p.motif === "rings") {
    for (let i = n; i > 0; i -= 1) o.push(`<circle cx="${cx}" cy="${cy}" r="${(R * i / n).toFixed(2)}" fill="${i % 2 ? p.fill : p.background === "none" ? "#ffffff" : p.background}"/>`);
  } else if (p.motif === "spiral") {
    const q = [];
    for (let t = 0; t <= n * 40; t += 1) { const a = (t / 40) * 2 * Math.PI * 0.5, r = (R * t) / (n * 40); q.push(polar(r, a)); }
    o.push(`<polyline points="${pts(q)}" fill="none" stroke="${p.fill}" stroke-width="${(R / n) * 0.35}"/>`);
  } else if (p.motif === "lattice") {
    const step = Math.min(W, H) / n;
    for (let y = 0; y < n; y += 1) for (let x = 0; x < n; x += 1) {
      if ((x + y) % 2) continue;
      const jx = (random.uniform() - 0.5) * step * 0.04, jy = (random.uniform() - 0.5) * step * 0.04;
      o.push(`<rect x="${(x * step + jx).toFixed(2)}" y="${(y * step + jy).toFixed(2)}" width="${step.toFixed(2)}" height="${step.toFixed(2)}" fill="${p.fill}" transform="rotate(45 ${(x * step + step / 2).toFixed(2)} ${(y * step + step / 2).toFixed(2)}) scale(1)"/>`);
    }
  }
  const bg = p.background === "none" ? "" : `<rect width="${W}" height="${H}" fill="${p.background}"/>`;
  return { svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${bg}${o.join("")}</svg>\n`, params: { ...p, width: W, height: H } };
}

// ---- generator entry ---------------------------------------------------------------------------

function generate(name, params = {}, seed = 1, project = null) {
  if (!Object.hasOwn(GENERATORS, name)) fail(SCOPE, `--generator must be one of ${Object.keys(GENERATORS).join(", ")}`, { code: "OPTION_VALUE_INVALID" });
  if (!params || typeof params !== "object" || Array.isArray(params)) fail(SCOPE, "--params must be a JSON object", { code: "OPTION_VALUE_INVALID" });
  checkSeed(seed);
  // A misspelt param would otherwise be recorded and silently ignored.
  const takes = { paper: [PAPER_DEFAULTS, "tint", "laid"], halftone: [HALFTONE_DEFAULTS, "lpi"], print: [PRINT_DEFAULTS], architecture: [ARCH_DEFAULTS], motif: [MOTIF_DEFAULTS] }[name];
  const allowed = new Set([...Object.keys(takes[0]), ...takes.slice(1), "width", "height"]), unknown = Object.keys(params).filter((key) => !allowed.has(key));
  if (unknown.length) fail(SCOPE, `${name} does not take params.${unknown.join(", params.")}; it takes ${[...allowed].join(", ")}`, { code: "OPTION_VALUE_INVALID" });
  const run = { paper, halftone, print: printFlat, architecture, motif }[name](params, seed, project);
  return { generator: name, version: GENERATORS[name], seed, format: run.svg ? "svg" : "png", ...run };
}

// ---- effects -------------------------------------------------------------------------------------

function sourcePlanes(input) {
  const img = Buffer.isBuffer(input) ? decodePng(input, "process input") : input;
  if (img.width * img.height > MAX_PIXELS) fail(SCOPE, `input is ${img.width}x${img.height}; at most ${MAX_PIXELS} pixels`, { code: "INPUT_TOO_LARGE" });
  const lab = labPlanes(img), alpha = new Float32Array(img.width * img.height);
  for (let i = 0; i < alpha.length; i += 1) alpha[i] = img.data[i * 4 + 3] / 255;
  return { img, lab, alpha, width: img.width, height: img.height };
}

// Tone from lightness: 0 paper .. 1 full ink, with contrast around the image's own range.
function tone(lab, alpha, { contrast = 1, gamma = 1 } = {}) {
  const values = [];
  for (let i = 0; i < lab.L.length; i += 7) if (alpha[i] > 0.5) values.push(lab.L[i]);
  const sorted = Float32Array.from(values.length ? values : [0, 100]).sort();
  const lo = sorted[Math.floor(sorted.length * 0.01)], hi = sorted[Math.floor(sorted.length * 0.99)], span = Math.max(hi - lo, 5);
  const out = new Float32Array(lab.L.length);
  for (let i = 0; i < out.length; i += 1) {
    const t = 1 - (lab.L[i] - lo) / span;
    out[i] = Math.min(1, Math.max(0, ((Math.min(1, Math.max(0, t)) - 0.5) * contrast + 0.5))) ** gamma;
  }
  return out;
}

function keepAlpha(out, alpha) {
  for (let i = 0; i < alpha.length; i += 1) out.data[i * 4 + 3] = Math.round(out.data[i * 4 + 3] * alpha[i]);
  return out;
}

const EFFECT_DEFAULTS = Object.freeze({
  halftone: { periodPx: 10, angleDeg: 45, shape: "round", mode: "am", ink: "#0d0b0b", paper: "none", contrast: 1.1, gamma: 1 },
  duotone: { inks: ["#0d0b0b", "#d10e1f"], angles: [45, 15], periodPx: 9, paper: "laid-cream", misregisterMm: [0.6, -0.4], pxPerMm: 4, split: 0.55, contrast: 1.1 },
  woodcut: { periodPx: 6, angleDeg: 30, warp: 0.35, ink: "#0d0b0b", paper: "laid-cream", pxPerMm: 4, contrast: 1.2, grain: "woodblock-indigo" },
  photocopy: { contrast: 2.2, threshold: 0.5, toner: 0.0025, streaks: 0.5, bloomPx: 1.5, background: 0.04 },
  papercut: { layers: 3, palette: null, paper: "laid-cream", pxPerMm: 4, minFeatureMm: 1.2, edgeRoughMm: 0.25, shadowMm: 1.2, lift: 0.5 },
});

function effectHalftone(src, p, random, project) {
  const t = tone(src.lab, src.alpha, p), hp = halftoneParams({ ...p, coverage: 0 });
  const alpha = screen(src.width, src.height, (i) => t[i] * (src.alpha[i] > 0.02 ? 1 : 0), hp, random);
  const out = inkOnPaper(src.width, src.height, [{ alpha, ink: hex(p.ink, "params.ink") }], p.paper, random, project, hp.pxPerMm);
  return p.paper === "none" ? out : keepAlpha(out, src.alpha);
}

function effectDuotone(src, p, random, project) {
  if (!Array.isArray(p.inks) || p.inks.length !== 2) fail(SCOPE, "params.inks must be two #rrggbb colours (dark first)", { code: "OPTION_VALUE_INVALID" });
  const t = tone(src.lab, src.alpha, p), split = num(p, "split", 0.55, 0.1, 0.9), mm = p.pxPerMm, [dx, dy] = p.misregisterMm.map((v) => Math.round(v * mm));
  // Dark ink carries the shadows, the second ink the mid-tones; the second plate is offset.
  const darkCov = (i) => Math.max(0, (t[i] - split) / (1 - split)), midCov = (i) => { const x = (i % src.width) - dx, y = Math.floor(i / src.width) - dy; if (x < 0 || y < 0 || x >= src.width || y >= src.height) return 0; const j = y * src.width + x; return src.alpha[j] > 0.02 ? Math.min(1, t[j] / split) * 0.85 : 0; };
  const a1 = screen(src.width, src.height, (i) => (src.alpha[i] > 0.02 ? darkCov(i) : 0), halftoneParams({ ...p, angleDeg: p.angles[0], coverage: 0 }), random);
  const a2 = screen(src.width, src.height, midCov, halftoneParams({ ...p, angleDeg: p.angles[1], coverage: 0 }), random);
  const out = inkOnPaper(src.width, src.height, [{ alpha: a2, ink: hex(p.inks[1], "params.inks[1]") }, { alpha: a1, ink: hex(p.inks[0], "params.inks[0]") }], p.paper, random, project, mm);
  return p.paper === "none" ? out : keepAlpha(out, src.alpha);
}

function effectWoodcut(src, p, random, project) {
  const { width, height } = src, t = tone(src.lab, src.alpha, p), mm = p.pxPerMm;
  const smooth = gaussianBlur(t, width, height, Math.max(0.6, p.periodPx / 6)), warp = fbm(width, height, p.periodPx * 30, 2, random), edge = valueNoise(width, height, Math.max(1.5, p.periodPx / 3), random);
  const a = (p.angleDeg * Math.PI) / 180, cos = Math.cos(a), sin = Math.sin(a), alpha = new Float32Array(width * height);
  // Gouged lines: ink where tone beats a line profile, so line width follows the tone (as a burin
  // or gouge cut does), lines bend with a slow warp, edges stay ragged.
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    const i = y * width + x, u = (x * cos + y * sin) / p.periodPx + warp[i] * p.warp, line = 0.5 + 0.5 * Math.cos(2 * Math.PI * u);
    const v = smooth[i] - line + 0.08 * edge[i];
    alpha[i] = src.alpha[i] > 0.02 ? Math.min(1, Math.max(0, v * 3 + 0.5)) : 0;
  }
  const grain = printFlat({ profile: p.grain, ink: p.ink, paper: "none", width, height, pxPerMm: mm, margin: 0, edgeRoughMm: 0, pile: 0 }, Math.floor(random.uniform() * 0xffffffff), project).image.data;
  for (let i = 0; i < alpha.length; i += 1) alpha[i] *= grain[i * 4 + 3] / 255;
  const out = inkOnPaper(width, height, [{ alpha, ink: hex(p.ink, "params.ink") }], p.paper, random, project, mm);
  return p.paper === "none" ? out : keepAlpha(out, src.alpha);
}

function effectPhotocopy(src, p, random) {
  const { width, height } = src, t = tone(src.lab, src.alpha, { contrast: 1 }), blur = gaussianBlur(t, width, height, 0.8), out = image(width, height);
  const bloom = gaussianBlur(t, width, height, p.bloomPx), streak = valueNoise(width, 1, 6 + random.uniform() * 10, random), speck = whiteNoise(width * height, random), haze = fbm(width, height, 60, 3, random);
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    const i = y * width + x;
    // Steep transfer curve (toner either sticks or not), bloom of dark edges, light streaks from a
    // dirty drum, random toner specks and grey haze in the paper areas.
    let k = 1 / (1 + Math.exp(-p.contrast * 6 * (Math.max(blur[i], bloom[i] * 0.9) - p.threshold)));
    k = Math.min(1, k + p.background * (0.5 + 0.5 * haze[i]));
    if (speck[i] > inverseNormal(1 - p.toner)) k = Math.max(k, 0.85);
    k *= 1 - p.streaks * 0.25 * Math.max(0, streak[x]);
    const v = Math.round(255 * (1 - k * 0.94));
    out.data.set([v, v, v, Math.round(src.alpha[i] * 255)], i * 4);
  }
  return out;
}

function effectPapercut(src, p, random, project) {
  const { width, height } = src, mm = p.pxPerMm, layers = Math.round(num(p, "layers", 3, 1, 5)), t = tone(src.lab, src.alpha, { contrast: 1 });
  const pad = Math.ceil((p.shadowMm * layers + 2) * mm), W = width + 2 * pad, H = height + 2 * pad;
  // Posterise into `layers` colours by k-means in Lab inside the silhouette (deterministic
  // farthest-point start). The largest cluster is the base sheet cut to the whole silhouette;
  // the others are cut from their own sheets and stacked by area, largest first, so small
  // details (eyes, spots) land on top as they would in a paper collage.
  const samples = [];
  for (let i = 0; i < t.length; i += 3) if (src.alpha[i] > 0.5) samples.push([src.lab.L[i], src.lab.A[i], src.lab.B[i]]);
  if (!samples.length) fail(SCOPE, "papercut needs an opaque silhouette; the input is fully transparent", { code: "INPUT_EMPTY" });
  const centres = [samples[Math.floor(samples.length / 2)]];
  const d2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
  while (centres.length < layers) {
    let far = samples[0], farD = -1;
    for (const q of samples) { const d = Math.min(...centres.map((c) => d2(q, c))); if (d > farD) { farD = d; far = q; } }
    centres.push(far);
  }
  for (let iter = 0; iter < 12; iter += 1) {
    const sum = centres.map(() => [0, 0, 0, 0]);
    for (const q of samples) { let k = 0; for (let c = 1; c < centres.length; c += 1) if (d2(q, centres[c]) < d2(q, centres[k])) k = c; sum[k][0] += q[0]; sum[k][1] += q[1]; sum[k][2] += q[2]; sum[k][3] += 1; }
    sum.forEach((v, k) => { if (v[3]) centres[k] = [v[0] / v[3], v[1] / v[3], v[2] / v[3]]; });
  }
  const label = new Int8Array(t.length).fill(-1), area = new Float64Array(layers);
  for (let i = 0; i < t.length; i += 1) {
    if (src.alpha[i] <= 0.5) continue;
    const q = [src.lab.L[i], src.lab.A[i], src.lab.B[i]];
    let k = 0;
    for (let c = 1; c < layers; c += 1) if (d2(q, centres[c]) < d2(q, centres[k])) k = c;
    label[i] = k; area[k] += 1;
  }
  const order = [...centres.keys()].filter((k) => area[k] > 0).sort((a, b) => area[b] - area[a]);
  const palette = p.palette || order.map((k) => `#${labToRgb(...centres[k]).map((v) => v.toString(16).padStart(2, "0")).join("")}`);
  if (!Array.isArray(palette) || palette.length !== order.length) fail(SCOPE, `params.palette must list ${order.length} #rrggbb colours, base sheet first`, { code: "OPTION_VALUE_INVALID" });
  const inLayer = (i, k) => (k === 0 ? src.alpha[i] > 0.5 : label[i] === order[k]);
  // Premultiplied "over" compositing: shadow of each layer first, then the layer itself.
  const out = image(W, H), C = new Float32Array(W * H * 3), A = new Float32Array(W * H);
  const light = [-0.7071, -0.7071];
  for (let k = 0; k < order.length; k += 1) {
    const mask = new Float32Array(W * H);
    for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) mask[(y + pad) * W + x + pad] = inLayer(y * width + x, k) ? 1 : 0;
    // Scissors and knives cannot follow sub-millimetre detail: blur by the minimum feature size,
    // re-threshold with a little noise for the hand-cut wobble.
    const soft = gaussianBlur(mask, W, H, (p.minFeatureMm * mm) / 2.5), wobble = valueNoise(W, H, 2.5 * mm, random), cut = new Float32Array(W * H);
    for (let i = 0; i < cut.length; i += 1) cut[i] = Math.min(1, Math.max(0, (soft[i] - 0.5 + wobble[i] * p.edgeRoughMm * 0.12) * 4 + 0.5));
    const sheet = paper({ profile: p.paper, width: W, height: H, pxPerMm: mm, tint: palette[k] }, Math.floor(random.uniform() * 0xffffffff), project).image.data;
    // Shadow cast onto what is below: the base sheet stands off the board, upper layers sit on
    // foam pads (lift), so their shadows are shorter and sharper.
    const lift = p.shadowMm * mm * (k ? p.lift : 1), blurred = gaussianBlur(cut, W, H, lift * 0.6 + 0.5), sx = Math.round(lift * 0.7), sy = Math.round(lift);
    for (let y = 0; y < H; y += 1) for (let x = 0; x < W; x += 1) {
      const i = y * W + x, sa = y - sy >= 0 && x - sx >= 0 ? blurred[(y - sy) * W + x - sx] * 0.45 : 0;
      if (!sa) continue;
      for (let c = 0; c < 3; c += 1) C[i * 3 + c] *= 1 - sa;
      A[i] = sa + A[i] * (1 - sa);
    }
    // Paper edge: the cut face catches light on the lit side and falls into shade on the other.
    for (let y = 1; y < H - 1; y += 1) for (let x = 1; x < W - 1; x += 1) {
      const i = y * W + x, a = cut[i];
      if (a <= 0) continue;
      const gx = (cut[i + 1] - cut[i - 1]) / 2, gy = (cut[i + W] - cut[i - W]) / 2, facing = -(gx * light[0] + gy * light[1]);
      const shade = 1 + Math.max(-0.35, Math.min(0.35, facing * 0.9));
      for (let c = 0; c < 3; c += 1) C[i * 3 + c] = Math.min(255, sheet[i * 4 + c] * shade) * a + C[i * 3 + c] * (1 - a);
      A[i] = a + A[i] * (1 - a);
    }
  }
  for (let i = 0; i < W * H; i += 1) {
    const a = A[i] || 1;
    out.data.set([Math.round(C[i * 3] / a), Math.round(C[i * 3 + 1] / a), Math.round(C[i * 3 + 2] / a), Math.round(A[i] * 255)], i * 4);
  }
  return { image: out, padPx: pad, palette };
}

// Bad effect params are usage errors with the allowed range, never a crash or a NaN image.
function checkEffectParams(effect, p) {
  const known = new Set([...Object.keys(EFFECT_DEFAULTS[effect]), ...(["halftone", "duotone"].includes(effect) ? [...Object.keys(HALFTONE_DEFAULTS), "lpi"] : [])]);
  const unknown = Object.keys(p).filter((key) => !known.has(key));
  if (unknown.length) fail(SCOPE, `${effect} does not take params.${unknown.join(", params.")}; it takes ${[...known].join(", ")}`, { code: "OPTION_VALUE_INVALID" });
  const paperSpec = (key) => { if (p[key] !== "none" && !(typeof p[key] === "string" && (/^#[0-9a-f]{6}$/i.test(p[key]) || /^[a-z0-9-]+$/.test(p[key])))) fail(SCOPE, `params.${key} must be "none", a #rrggbb colour or a paper profile id`, { code: "OPTION_VALUE_INVALID" }); };
  if (effect === "halftone") { num(p, "contrast", 1.1, 0.1, 10); num(p, "gamma", 1, 0.1, 10); halftoneParams(p); paperSpec("paper"); }
  if (effect === "duotone") {
    num(p, "contrast", 1.1, 0.1, 10); num(p, "pxPerMm", 4, 0.5, 60); num(p, "split", 0.55, 0.1, 0.9); paperSpec("paper");
    if (!Array.isArray(p.inks) || p.inks.length !== 2) fail(SCOPE, "params.inks must be two #rrggbb colours (dark first)", { code: "OPTION_VALUE_INVALID" });
    p.inks.forEach((ink, i) => hex(ink, `params.inks[${i}]`));
    if (!Array.isArray(p.angles) || p.angles.length !== 2 || p.angles.some((v) => !Number.isFinite(v))) fail(SCOPE, "params.angles must be two screen angles in degrees", { code: "OPTION_VALUE_INVALID" });
    if (!Array.isArray(p.misregisterMm) || p.misregisterMm.length !== 2 || p.misregisterMm.some((v) => !Number.isFinite(v) || Math.abs(v) > 20)) fail(SCOPE, "params.misregisterMm must be [dx, dy] in mm, each within 20", { code: "OPTION_VALUE_INVALID" });
    halftoneParams({ ...p, angleDeg: p.angles[0] });
  }
  if (effect === "woodcut") { num(p, "periodPx", 6, 2, 200); num(p, "angleDeg", 30, -360, 360); num(p, "warp", 0.35, 0, 3); num(p, "pxPerMm", 4, 0.5, 60); num(p, "contrast", 1.2, 0.1, 10); hex(p.ink, "params.ink"); paperSpec("paper"); if (typeof p.grain !== "string") fail(SCOPE, "params.grain must be an ink-flat profile id", { code: "OPTION_VALUE_INVALID" }); }
  if (effect === "photocopy") { num(p, "contrast", 2.2, 0.1, 10); num(p, "threshold", 0.5, 0, 1); num(p, "toner", 0.0025, 0, 0.2); num(p, "streaks", 0.5, 0, 2); num(p, "bloomPx", 1.5, 0, 20); num(p, "background", 0.04, 0, 1); }
  if (effect === "papercut") {
    num(p, "layers", 3, 1, 5); num(p, "pxPerMm", 4, 0.5, 60); num(p, "minFeatureMm", 1.2, 0, 20); num(p, "edgeRoughMm", 0.25, 0, 5); num(p, "shadowMm", 1.2, 0, 20); num(p, "lift", 0.5, 0, 1);
    if (typeof p.paper !== "string" || !/^[a-z0-9-]+$/.test(p.paper)) fail(SCOPE, "params.paper must be a paper profile id (each sheet is cut from it)", { code: "OPTION_VALUE_INVALID" });
    if (p.palette !== null && (!Array.isArray(p.palette) || p.palette.some((c, i) => !hex(c, `params.palette[${i}]`)))) fail(SCOPE, "params.palette must be a list of #rrggbb colours, base sheet first", { code: "OPTION_VALUE_INVALID" });
  }
}

function processImage(input, effect, params = {}, seed = 1, project = null) {
  if (!Object.hasOwn(EFFECTS, effect)) fail(SCOPE, `--effect must be one of ${Object.keys(EFFECTS).join(", ")}`, { code: "OPTION_VALUE_INVALID" });
  if (!params || typeof params !== "object" || Array.isArray(params)) fail(SCOPE, "--params must be a JSON object", { code: "OPTION_VALUE_INVALID" });
  checkSeed(seed);
  const p = { ...EFFECT_DEFAULTS[effect], ...params };
  checkEffectParams(effect, p);
  const src = sourcePlanes(input), random = seededRandom(seed);
  let result;
  if (effect === "halftone") result = { image: effectHalftone(src, p, random, project) };
  else if (effect === "duotone") result = { image: effectDuotone(src, p, random, project) };
  else if (effect === "woodcut") result = { image: effectWoodcut(src, p, random, project) };
  else if (effect === "photocopy") result = { image: effectPhotocopy(src, p, random) };
  else result = effectPapercut(src, p, random, project);
  return { effect, version: EFFECTS[effect], seed, params: { ...p, ...(result.palette ? { palette: result.palette } : {}) }, image: result.image, ...(result.padPx ? { padPx: result.padPx } : {}) };
}

module.exports = { EFFECTS, GENERATORS, builtinProfiles, generate, labToRgb, loadProfile, processImage, spectralNoise };

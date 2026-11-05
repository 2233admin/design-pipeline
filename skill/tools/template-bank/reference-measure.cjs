"use strict";

// Model-free measurements of one reference image, ported from the Arknights / Endfield study's
// features (art-study model/features.py and scripts/measure.py) so a reference set can be measured
// the same way the hand-made style packs were. No model, no OCR: pixels, plus layout boxes when the
// board supplies annotations.
//
// Pixels: decoded by ffmpeg (any png / jpg / webp still), long edge 480 px, area filter, as the study.
//   palette   OKLab k-means (k = 6, k-means++ with a fixed seed, 2 attempts on every 4th pixel):
//             ground_L / ground_C of the largest cluster, main_share (its pixel share),
//             hue_spread (chroma-weighted circular std of the hue of pixels with C > 0.04, degrees),
//             accent_share (C > 0.12), neutral_share (C < 0.04), palette (6 centres with shares)
//   balance   weight_cx, weight_cy, weight_off (visual-weight centre; weight = |L - ground L| + 2C + 2*clip(grad))
//   symmetry  lr_symmetry = 1 - mean |L - mirrored L| / 0.5 (1 = mirror-symmetric)
//   space     quiet_share (16 x 16 cells with Sobel gradient of L below 0.05), quiet_lr (left - right)
//   texture   spec_hf (share of radial power above 1/4 Nyquist, 256 px Hann-windowed L), spec_slope
// Boxes (fractions of the frame, from the board's annotations): title centre, area and side, text
// margins, type-size ratio, figure centre and width, title-over-figure overlap, title orientation.

const path = require("node:path");
const { spawnSync } = require("node:child_process");

const LONG_EDGE = 480;
const CHROMA_COLOURED = 0.04;
const CHROMA_ACCENT = 0.12;
const QUIET_GRAD = 0.05;
const QUIET_GRID = 16;

class MeasureError extends Error {
  constructor(message, code = "REFERENCE_UNREADABLE") { super(message); this.code = code; }
}

const MAX_BUFFER = 256 << 20;

/** A short, path-free message from a tool's stderr (its last line, file paths reduced to names). */
function shortError(stderr, file) {
  let line = String(stderr || "").trim().split("\n").pop() || "no message";
  if (file) line = line.split(file).join(path.basename(file));
  line = line.replace(/(?:[A-Za-z]:)?[\\/][^\s:'"]*[\\/]([^\s:'"\\/]+)/g, "$1");
  return line.length > 160 ? `${line.slice(0, 157)}...` : line;
}

function run(command, args, { binary = false, file = null } = {}) {
  const child = spawnSync(command, args, { encoding: binary ? "buffer" : "utf8", maxBuffer: MAX_BUFFER, windowsHide: true });
  if (child.error?.code === "ENOBUFS") throw new MeasureError(`${path.basename(String(file))}: decoded output is larger than ${MAX_BUFFER >> 20} MB. Fix: give a smaller crop or image`, "REFERENCE_UNREADABLE");
  if (child.error?.code === "ENOENT") throw new MeasureError(`${path.basename(command)} was not found. Fix: install ffmpeg/ffprobe on PATH or pass --ffmpeg / --ffprobe`, "TOOL_MISSING");
  if (child.error) throw new MeasureError(`${path.basename(command)} could not run on ${path.basename(String(file))}: ${child.error.code || child.error.message}`, "REFERENCE_UNREADABLE");
  if (child.status !== 0) throw new MeasureError(`${path.basename(command)} could not read ${path.basename(String(file))}: ${shortError(child.stderr, file)}`);
  return child.stdout;
}

function probeSize(file, tools = {}) {
  const out = run(tools.ffprobe || "ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0:s=x", file], { file });
  const match = /^(\d+)x(\d+)/.exec(String(out).trim());
  if (!match) throw new MeasureError(`could not read the size of ${path.basename(file)}`);
  return [Number(match[1]), Number(match[2])];
}

/**
 * First frame of an image as RGB. With `longEdge`, scaled so the long edge is exactly `longEdge`
 * (down or up, area filter, as the study's cv2.resize); with longEdge 0, native size, except that
 * a frame too big for the output buffer is scaled down to fit (`scale` reports the factor).
 */
function decode(file, { longEdge = LONG_EDGE, crop = null, tools = {} } = {}) {
  const [W, H] = probeSize(file, tools);
  const filters = [];
  let [w, h] = [W, H];
  if (crop) {
    const [x, y, cw, ch] = crop.map(Math.round);
    filters.push("format=rgb24", `crop=${cw}:${ch}:${x}:${y}`); // rgb first: a 4:2:0 crop rounds odd sizes
    [w, h] = [cw, ch];
  }
  const fit = Math.min(1, Math.sqrt((MAX_BUFFER * 0.9) / (w * h * 3)));
  const k = longEdge ? longEdge / Math.max(w, h) : fit;
  const [tw, th] = [Math.max(8, Math.round(w * k)), Math.max(8, Math.round(h * k))];
  // Area filter to shrink; nearest neighbour to enlarge, which is what cv2 INTER_AREA does on an
  // integer upscale (the study's resize), so small references measure as in Python.
  if (tw !== w || th !== h) filters.push(`scale=${tw}:${th}:flags=${tw > w || th > h ? "neighbor" : "area"}`);
  const args = ["-v", "error", "-i", file, "-frames:v", "1", ...(filters.length ? ["-vf", filters.join(",")] : []), "-pix_fmt", "rgb24", "-f", "rawvideo", "pipe:1"];
  const raw = run(tools.ffmpeg || "ffmpeg", args, { binary: true, file });
  if (raw.length !== tw * th * 3) throw new MeasureError(`decoded ${raw.length} bytes from ${path.basename(file)}, expected ${tw * th * 3} (an animated or unsupported image?)`);
  return { width: tw, height: th, source: [W, H], scale: tw / w, rgb: new Uint8Array(raw.buffer, raw.byteOffset, raw.length) };
}

// ---- colour ----------------------------------------------------------------------------------

const LINEAR = new Float32Array(256).map((_, i) => { const c = i / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });

function oklabOf(r, g, b) {
  const [lr, lg, lb] = [LINEAR[r], LINEAR[g], LINEAR[b]];
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}

function oklabToHex([L, a, b]) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const lin = [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
  return `#${lin.map((v) => { const c = Math.max(0, Math.min(1, v)); const e = c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055; return Math.round(e * 255).toString(16).padStart(2, "0"); }).join("").toUpperCase()}`;
}

function hexToOklab(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex).trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return oklabOf((n >> 16) & 255, (n >> 8) & 255, n & 255);
}

function toOklab(img) {
  const n = img.width * img.height;
  const lab = new Float32Array(n * 3);
  for (let i = 0; i < n; i += 1) {
    const [L, a, b] = oklabOf(img.rgb[i * 3], img.rgb[i * 3 + 1], img.rgb[i * 3 + 2]);
    lab[i * 3] = L; lab[i * 3 + 1] = a; lab[i * 3 + 2] = b;
  }
  return lab;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/** k-means++ in OKLab; returns centres and per-cluster counts over all pixels. Deterministic. */
function kmeans(lab, k = 6, { step = 4, iterations = 30, attempts = 2, seed = 1 } = {}) {
  const n = lab.length / 3;
  const idx = [];
  for (let i = 0; i < n; i += step) idx.push(i);
  const m = idx.length;
  const X = new Float32Array(m * 3);
  idx.forEach((p, j) => { X[j * 3] = lab[p * 3]; X[j * 3 + 1] = lab[p * 3 + 1]; X[j * 3 + 2] = lab[p * 3 + 2]; });
  const d2 = (j, c, C) => { const dx = X[j * 3] - C[c * 3], dy = X[j * 3 + 1] - C[c * 3 + 1], dz = X[j * 3 + 2] - C[c * 3 + 2]; return dx * dx + dy * dy + dz * dz; };
  const rand = mulberry32(seed);
  let best = null;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const C = new Float32Array(k * 3);
    const first = Math.floor(rand() * m);
    C.set(X.subarray(first * 3, first * 3 + 3), 0);
    const dist = new Float32Array(m).fill(Infinity);
    for (let c = 1; c < k; c += 1) {
      let total = 0;
      for (let j = 0; j < m; j += 1) { dist[j] = Math.min(dist[j], d2(j, c - 1, C)); total += dist[j]; }
      let r = rand() * total, pick = m - 1;
      if (total > 0) for (let j = 0; j < m; j += 1) { r -= dist[j]; if (r <= 0) { pick = j; break; } }
      C.set(X.subarray(pick * 3, pick * 3 + 3), c * 3);
    }
    const label = new Int32Array(m);
    let compactness = 0;
    for (let it = 0; it < iterations; it += 1) {
      compactness = 0;
      for (let j = 0; j < m; j += 1) {
        let bi = 0, bd = Infinity;
        for (let c = 0; c < k; c += 1) { const d = d2(j, c, C); if (d < bd) { bd = d; bi = c; } }
        label[j] = bi; compactness += bd;
      }
      const sum = new Float64Array(k * 3), cnt = new Float64Array(k);
      for (let j = 0; j < m; j += 1) { const c = label[j]; cnt[c] += 1; sum[c * 3] += X[j * 3]; sum[c * 3 + 1] += X[j * 3 + 1]; sum[c * 3 + 2] += X[j * 3 + 2]; }
      let moved = 0;
      for (let c = 0; c < k; c += 1) {
        if (!cnt[c]) continue;
        for (let q = 0; q < 3; q += 1) { const v = sum[c * 3 + q] / cnt[c]; moved = Math.max(moved, Math.abs(v - C[c * 3 + q])); C[c * 3 + q] = v; }
      }
      if (moved < 1e-3) break;
    }
    if (!best || compactness < best.compactness) best = { compactness, C: C.slice() };
  }
  const counts = new Float64Array(k);
  for (let p = 0; p < n; p += 1) {
    let bi = 0, bd = Infinity;
    for (let c = 0; c < k; c += 1) {
      const dx = lab[p * 3] - best.C[c * 3], dy = lab[p * 3 + 1] - best.C[c * 3 + 1], dz = lab[p * 3 + 2] - best.C[c * 3 + 2];
      const d = dx * dx + dy * dy + dz * dz;
      if (d < bd) { bd = d; bi = c; }
    }
    counts[bi] += 1;
  }
  return [...Array(k).keys()].map((c) => ({ lab: [best.C[c * 3], best.C[c * 3 + 1], best.C[c * 3 + 2]], share: counts[c] / n })).sort((a, b) => b.share - a.share);
}

function circularStdDeg(angles, weights) {
  let sx = 0, sy = 0, sw = 0;
  for (let i = 0; i < angles.length; i += 1) { sx += weights[i] * Math.cos(angles[i]); sy += weights[i] * Math.sin(angles[i]); sw += weights[i]; }
  if (!sw) return 0;
  const R = Math.hypot(sx, sy) / sw;
  return (Math.sqrt(Math.max(0, -2 * Math.log(Math.max(R, 1e-9)))) * 180) / Math.PI;
}

function paletteFeatures(lab) {
  const n = lab.length / 3;
  const clusters = kmeans(lab);
  const ground = clusters[0];
  const hues = [], weights = [];
  let accent = 0, neutral = 0;
  for (let p = 0; p < n; p += 1) {
    const a = lab[p * 3 + 1], b = lab[p * 3 + 2], C = Math.hypot(a, b);
    if (C > CHROMA_ACCENT) accent += 1;
    if (C < CHROMA_COLOURED) neutral += 1;
    else { hues.push(Math.atan2(b, a)); weights.push(C); }
  }
  return {
    features: {
      ground_L: ground.lab[0], ground_C: Math.hypot(ground.lab[1], ground.lab[2]), main_share: ground.share,
      hue_spread: hues.length > 50 ? circularStdDeg(hues, weights) : 0, accent_share: accent / n, neutral_share: neutral / n,
    },
    palette: clusters.map((c) => ({ hex: oklabToHex(c.lab), L: round(c.lab[0], 3), C: round(Math.hypot(c.lab[1], c.lab[2]), 3), hue: round(((Math.atan2(c.lab[2], c.lab[1]) * 180) / Math.PI + 360) % 360, 0), share: round(c.share, 3) })),
    groundL: ground.lab[0],
  };
}

// ---- structure -------------------------------------------------------------------------------

function channel(lab, w, h, q = 0) {
  const out = new Float32Array(w * h);
  for (let i = 0; i < w * h; i += 1) out[i] = lab[i * 3 + q];
  return out;
}

/** Sobel magnitude (3x3, reflect-101 borders, as OpenCV's default). */
function sobel(L, w, h) {
  const G = new Float32Array(w * h);
  const at = (x, y) => {
    const xx = x < 0 ? -x : x >= w ? 2 * w - 2 - x : x;
    const yy = y < 0 ? -y : y >= h ? 2 * h - 2 - y : y;
    return L[yy * w + xx];
  };
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const gx = at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1) - at(x - 1, y - 1) - 2 * at(x - 1, y) - at(x - 1, y + 1);
      const gy = at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1) - at(x - 1, y - 1) - 2 * at(x, y - 1) - at(x + 1, y - 1);
      G[y * w + x] = Math.hypot(gx, gy);
    }
  }
  return G;
}

function balance(lab, w, h, groundL, G) {
  let sw = 0, sx = 0, sy = 0;
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const i = y * w + x;
      const weight = Math.abs(lab[i * 3] - groundL) + 2 * Math.hypot(lab[i * 3 + 1], lab[i * 3 + 2]) + 2 * Math.min(1, Math.max(0, G[i]));
      sw += weight; sx += weight * x; sy += weight * y;
    }
  }
  const cx = sw ? sx / sw / w : 0.5, cy = sw ? sy / sw / h : 0.5;
  return { weight_cx: cx, weight_cy: cy, weight_off: Math.hypot(cx - 0.5, cy - 0.5) };
}

function whitespace(G, w, h, n = QUIET_GRID) {
  const ch = Math.floor(h / n), cw = Math.floor(w / n);
  let quiet = 0, left = 0, right = 0;
  for (let gy = 0; gy < n; gy += 1) {
    for (let gx = 0; gx < n; gx += 1) {
      let s = 0;
      for (let y = gy * ch; y < (gy + 1) * ch; y += 1) for (let x = gx * cw; x < (gx + 1) * cw; x += 1) s += G[y * w + x];
      if (s / (ch * cw) < QUIET_GRAD) { quiet += 1; if (gx < n / 2) left += 1; else right += 1; }
    }
  }
  const half = (n * n) / 2;
  return { quiet_share: quiet / (n * n), quiet_lr: left / half - right / half };
}

function symmetry(L, w, h) {
  let s = 0;
  for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) s += Math.abs(L[y * w + x] - L[y * w + (w - 1 - x)]);
  return { lr_symmetry: 1 - s / (w * h) / 0.5 };
}

/** Area resample of a single-channel float image (OpenCV INTER_AREA for downscaling). */
function resizeArea(src, w, h, tw, th) {
  const out = new Float32Array(tw * th);
  const sx = w / tw, sy = h / th;
  for (let ty = 0; ty < th; ty += 1) {
    const y0 = ty * sy, y1 = y0 + sy;
    for (let tx = 0; tx < tw; tx += 1) {
      const x0 = tx * sx, x1 = x0 + sx;
      let s = 0, a = 0;
      for (let y = Math.floor(y0); y < Math.min(h, Math.ceil(y1)); y += 1) {
        const wy = Math.min(y + 1, y1) - Math.max(y, y0);
        for (let x = Math.floor(x0); x < Math.min(w, Math.ceil(x1)); x += 1) {
          const wx = Math.min(x + 1, x1) - Math.max(x, x0);
          s += src[y * w + x] * wx * wy; a += wx * wy;
        }
      }
      out[ty * tw + tx] = a ? s / a : 0;
    }
  }
  return out;
}

function fft1d(re, im, inverse = false) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i += 1) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = ((inverse ? 2 : -2) * Math.PI) / len;
    const wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let j = 0; j < len / 2; j += 1) {
        const ar = re[i + j], ai = im[i + j];
        const br = re[i + j + len / 2] * cr - im[i + j + len / 2] * ci, bi = re[i + j + len / 2] * ci + im[i + j + len / 2] * cr;
        re[i + j] = ar + br; im[i + j] = ai + bi; re[i + j + len / 2] = ar - br; im[i + j + len / 2] = ai - bi;
        const nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr;
      }
    }
  }
}

function spectrum(L, w, h) {
  const N = 256;
  const g = resizeArea(L, w, h, N, N);
  let mean = 0;
  for (const v of g) mean += v;
  mean /= N * N;
  const han = Float64Array.from({ length: N }, (_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (N - 1)));
  const re = Array.from({ length: N }, (_, y) => Float64Array.from({ length: N }, (_, x) => (g[y * N + x] - mean) * han[y] * han[x]));
  const im = Array.from({ length: N }, () => new Float64Array(N));
  for (let y = 0; y < N; y += 1) fft1d(re[y], im[y]);
  for (let x = 0; x < N; x += 1) {
    const cr = Float64Array.from({ length: N }, (_, y) => re[y][x]), ci = Float64Array.from({ length: N }, (_, y) => im[y][x]);
    fft1d(cr, ci);
    for (let y = 0; y < N; y += 1) { re[y][x] = cr[y]; im[y][x] = ci[y]; }
  }
  const sum = new Float64Array(N), cnt = new Float64Array(N);
  for (let y = 0; y < N; y += 1) {
    for (let x = 0; x < N; x += 1) {
      const fy = y < N / 2 ? y : y - N, fx = x < N / 2 ? x : x - N; // fftshift-equivalent radius
      const r = Math.floor(Math.hypot(fx, fy));
      if (r < N) { sum[r] += re[y][x] ** 2 + im[y][x] ** 2; cnt[r] += 1; }
    }
  }
  const rad = [...sum].map((s, r) => s / Math.max(1, cnt[r]));
  const xs = [], ys = [];
  for (let f = 2; f < 128; f += 1) { xs.push(Math.log(f)); ys.push(Math.log(rad[f] + 1e-12)); }
  const mx = xs.reduce((a, b) => a + b) / xs.length, my = ys.reduce((a, b) => a + b) / ys.length;
  let num = 0, den = 0;
  xs.forEach((x, i) => { num += (x - mx) * (ys[i] - my); den += (x - mx) ** 2; });
  let total = 0, high = 0;
  for (let r = 1; r < 128; r += 1) { const p = rad[r] * r; total += p; if (r >= 32) high += p; }
  return { spec_slope: num / den, spec_hf: total ? high / total : 0 };
}

/** Near-black uniform rows at the top and bottom (video letterbox, phone bars), as the study.
 * A frame that is black for more than a quarter of its height is a black card, not a letterbox. */
function letterbox(img) {
  const { width: w, height: h, rgb } = img;
  const row = (y) => {
    let s = 0, s2 = 0;
    for (let x = 0; x < w; x += 1) { const v = (rgb[(y * w + x) * 3] + rgb[(y * w + x) * 3 + 1] + rgb[(y * w + x) * 3 + 2]) / 765; s += v; s2 += v * v; }
    const mean = s / w;
    return mean < 0.04 && Math.sqrt(Math.max(0, s2 / w - mean * mean)) < 0.03;
  };
  let top = 0, bottom = 0;
  while (top < h && row(top)) top += 1;
  while (bottom < h - top && row(h - 1 - bottom)) bottom += 1;
  if (top + bottom > h * 0.25) return [0, 0];
  return [top, bottom];
}

function cropRows(img, top, bottom) {
  if (!top && !bottom) return img;
  const h = img.height - top - bottom;
  return { ...img, height: h, rgb: img.rgb.subarray(top * img.width * 3, (top + h) * img.width * 3) };
}

const round = (v, d = 4) => (v === null || v === undefined || Number.isNaN(v) ? null : Number(v.toFixed(d)));

/** Pixel features of one decoded image. */
function measurePixels(decoded) {
  const [top, bottom] = letterbox(decoded);
  const img = cropRows(decoded, top, bottom);
  const { width: w, height: h } = img;
  const lab = toOklab(img);
  const L = channel(lab, w, h, 0);
  const G = sobel(L, w, h);
  const pal = paletteFeatures(lab);
  // Whitespace needs a 16 x 16 grid of whole pixels: a side under 16 px (an extreme strip even at
  // a 480 px long edge) has no cells, so it is left out of the whitespace statistics, not zero.
  const notes = [];
  const space = w >= QUIET_GRID && h >= QUIET_GRID ? whitespace(G, w, h) : (notes.push(`whitespace not measured: ${w}x${h} px is under ${QUIET_GRID} px on a side`), {});
  const features = { ...pal.features, ...balance(lab, w, h, pal.groundL, G), ...symmetry(L, w, h), ...space, ...spectrum(L, w, h) };
  return { features: Object.fromEntries(Object.entries(features).map(([k, v]) => [k, round(v)])), palette: pal.palette, letterbox: [round(top / decoded.height, 3), round(bottom / decoded.height, 3)], measuredAt: [w, h], notes };
}

// ---- boxes (annotations) ---------------------------------------------------------------------

/** Layout features from annotation boxes: { title: [x0,y0,x1,y1], text: [{box,size,vert}], fig: [x0,x1], logo, orient }. */
function measureBoxes(ann) {
  if (!ann) return {};
  const out = {};
  const title = ann.title;
  if (title) {
    const [x0, y0, x1, y1] = title;
    out.title_cx = (x0 + x1) / 2; out.title_cy = (y0 + y1) / 2; out.title_area = Math.max(0, x1 - x0) * Math.max(0, y1 - y0);
    out.title_side = out.title_cx < 0.4 ? "left" : out.title_cx > 0.6 ? "right" : "centre";
    out.title_band = out.title_cy < 0.4 ? "upper" : out.title_cy > 0.6 ? "lower" : "middle";
  }
  if (ann.fig) {
    const [f0, f1] = ann.fig;
    out.fig_cx = (f0 + f1) / 2; out.fig_w = Math.max(0, f1 - f0);
    if (title && title[2] > title[0]) out.title_fig_overlap = Math.max(0, Math.min(title[2], f1) - Math.max(title[0], f0)) / (title[2] - title[0]);
  }
  const boxes = (ann.text || []).map((t) => t.box).concat(title ? [title] : []);
  if (boxes.length) {
    out.margin_x = Math.max(0, Math.min(...boxes.map((b) => Math.min(b[0], 1 - b[2]))));
    out.margin_y = Math.max(0, Math.min(...boxes.map((b) => Math.min(b[1], 1 - b[3]))));
  }
  const sizes = (ann.text || []).map((t) => t.size).filter((s) => s > 0).sort((a, b) => b - a);
  if (sizes.length >= 2) {
    const rest = sizes.slice(1);
    out.type_ratio = sizes[0] / rest[Math.floor(rest.length / 2)];
  }
  if (ann.orient) out.title_vertical = ann.orient === "V" ? 1 : 0;
  if (ann.logo) out.logo_corner = ann.logo;
  for (const key of Object.keys(out)) if (typeof out[key] === "number") out[key] = round(out[key]);
  return out;
}

// ---- type style of a text crop ---------------------------------------------------------------

/** Otsu threshold of a grey histogram (0..255). */
function otsu(grey) {
  const hist = new Float64Array(256);
  for (const v of grey) hist[v] += 1;
  const n = grey.length;
  let sum = 0;
  for (let i = 0; i < 256; i += 1) sum += i * hist[i];
  let sb = 0, wb = 0, best = 0, t = 127;
  for (let i = 0; i < 256; i += 1) {
    wb += hist[i]; if (!wb) continue;
    const wf = n - wb; if (!wf) break;
    sb += i * hist[i];
    const mb = sb / wb, mf = (sum - sb) / wf;
    const between = wb * wf * (mb - mf) ** 2;
    if (between > best) { best = between; t = i; }
  }
  return t;
}

function runLengths(mask, w, h, horizontal) {
  const runs = [];
  const [outer, inner] = horizontal ? [h, w] : [w, h];
  for (let o = 0; o < outer; o += 1) {
    let len = 0;
    for (let i = 0; i <= inner; i += 1) {
      const on = i < inner && mask[horizontal ? o * w + i : i * w + o];
      if (on) len += 1;
      else if (len) { runs.push(len); len = 0; }
    }
  }
  return runs.sort((a, b) => a - b);
}

const quantile = (sorted, q) => {
  if (!sorted.length) return null;
  const pos = (sorted.length - 1) * q, lo = Math.floor(pos), hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
};

/**
 * Stroke style of a text crop: ink by Otsu (the minority class), stem width from horizontal runs
 * and bar thickness from vertical runs (the lower half of each run distribution, so crossings and
 * long bars do not count). contrast = stem / bar, the same ratio the open-font catalog measures on
 * 十 (stem at 85% height / bar at 15% width; high at 1.8). weight = stem / text height.
 */
function strokeStyle(decoded, { vertical = false, sizePx = null } = {}) {
  const { width: w, height: h, rgb } = decoded;
  const grey = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i += 1) grey[i] = Math.round(0.299 * rgb[i * 3] + 0.587 * rgb[i * 3 + 1] + 0.114 * rgb[i * 3 + 2]);
  const t = otsu(grey);
  let dark = 0;
  for (const v of grey) if (v <= t) dark += 1;
  const inkDark = dark <= grey.length / 2;
  const mask = new Uint8Array(w * h);
  let ink = 0, y0 = h, y1 = -1, x0 = w, x1 = -1;
  for (let i = 0; i < w * h; i += 1) {
    mask[i] = (inkDark ? grey[i] <= t : grey[i] > t) ? 1 : 0;
    if (mask[i]) { ink += 1; const x = i % w, y = (i - x) / w; y0 = Math.min(y0, y); y1 = Math.max(y1, y); x0 = Math.min(x0, x); x1 = Math.max(x1, x); }
  }
  const inkShare = ink / (w * h);
  // Glyph size: the annotated text size when given, else the median height of the ink lines
  // (rows, or columns for vertical text, split where the ink nearly vanishes), so a three-line
  // title is not read as one tall glyph.
  const textHeight = sizePx || lineHeight(mask, w, h, vertical) || Math.max(1, vertical ? x1 - x0 + 1 : y1 - y0 + 1);
  const lowerPart = (runs) => {
    const cut = runs.filter((r) => r >= 2 && r <= textHeight * 0.5);
    return cut.length >= 6 ? quantile(cut, 0.35) : null;
  };
  const hr = runLengths(mask, w, h, true), vr = runLengths(mask, w, h, false);
  const stem = lowerPart(hr), bar = lowerPart(vr);
  if (!stem || !bar || inkShare < 0.02 || inkShare > 0.7 || textHeight < 16) return { measurable: false, inkShare: round(inkShare, 3), heightPx: textHeight, reason: textHeight < 16 ? `text ${textHeight} px high; strokes need 16 px or more (crop the original, not a thumbnail)` : "no clear ink against the ground (busy art behind the text)" };
  return { measurable: true, contrast: round(stem / bar, 2), stem: round(stem, 1), bar: round(bar, 1), weight: round(stem / textHeight, 3), inkShare: round(inkShare, 3), heightPx: textHeight };
}

function lineHeight(mask, w, h, vertical) {
  const [n, m] = vertical ? [w, h] : [h, w];
  const profile = new Float64Array(n);
  for (let i = 0; i < n; i += 1) { let c = 0; for (let j = 0; j < m; j += 1) c += mask[vertical ? j * w + i : i * w + j]; profile[i] = c / m; }
  const peak = Math.max(...profile);
  if (!peak) return null;
  const lines = [];
  let start = -1;
  for (let i = 0; i <= n; i += 1) {
    const on = i < n && profile[i] > peak * 0.2;
    if (on && start < 0) start = i;
    else if (!on && start >= 0) { if (i - start >= 8) lines.push(i - start); start = -1; }
  }
  return lines.length ? quantile(lines.sort((a, b) => a - b), 0.5) : null;
}

const CONTRAST_HIGH = 1.8; // the open-font catalog's "high" (stem / bar of 十)
const CONTRAST_LOW = 1.35;
// Stem / glyph height -> the lightest CSS weight to ask the catalog for (measured on Noto Sans and
// Serif CJK SC Medium, Bold, Black: 0.09-0.10 Medium, 0.12 Bold, 0.14-0.16 Black).
const WEIGHT_STEPS = [[0.125, 900], [0.105, 700], [0.08, 500], [0, 400]];

/** A type role from measured strokes: mincho (thick stems, thin bars) or gothic (even strokes). */
function classifyStroke(s) {
  if (!s?.measurable) return { style: null, contrast: null, weight: null, reason: s?.reason || "not measured" };
  const weight = WEIGHT_STEPS.find(([min]) => s.weight >= min)[1];
  const contrast = s.contrast >= CONTRAST_HIGH ? "high" : "low";
  if (s.contrast >= CONTRAST_HIGH) return { style: "mincho", contrast, weight, reason: `stem / bar ${s.contrast} >= ${CONTRAST_HIGH}: thick stems, thin bars` };
  if (s.contrast <= CONTRAST_LOW) return { style: "gothic", contrast, weight, reason: `stem / bar ${s.contrast} <= ${CONTRAST_LOW}: even strokes (a brush kai also reads even here; judge by eye)` };
  return { style: null, contrast, weight, reason: `stem / bar ${s.contrast} between ${CONTRAST_LOW} and ${CONTRAST_HIGH}: a light mincho, a rounded or brush face; judge by eye` };
}

module.exports = {
  MAX_BUFFER, CHROMA_ACCENT, CHROMA_COLOURED, CONTRAST_HIGH, CONTRAST_LOW, LONG_EDGE, MeasureError, WEIGHT_STEPS,
  classifyStroke, decode, hexToOklab, kmeans, letterbox, measureBoxes, measurePixels, oklabOf, oklabToHex, probeSize, quantile, round, shortError, strokeStyle,
};

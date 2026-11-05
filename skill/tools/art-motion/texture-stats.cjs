"use strict";

// Texture statistics for "how close to a real scan" questions. Everything is measured on CIE L*
// (the lightness a viewer sees) so amplitudes read in L* units: about 1 L* RMS is the level where
// a fine texture starts to be visible on a flat field.
//
// - Paper and ink flats: band amplitudes from a Welch-averaged, Hann-windowed power spectrum in
//   octave bands of physical period (mm, when px/mm is known), centred L* quantiles, mean Lab and
//   orientation (fibre direction, laid lines).
// - Halftone: screen period / angle from the strongest spectral peak, coverage, the 2nd-harmonic
//   ratio (dot edge sharpness) and the share of variance off the screen lattice (raggedness, ink
//   mottle, paper).
// Distances come with yardsticks measured on real scans: two crops of the same sheet (natural
// variation) and two different papers. A number is reported, never a visual verdict.

const { fail } = require("../../scripts/contract-utils.cjs");
const { gaussianBlur, labPlanes } = require("./assets.cjs");

const SCOPE = "texture stats";
const BAND_EDGES_MM = Object.freeze([0.25, 0.5, 1, 2, 4, 8, 16, 32, 64]);
const QUANTILES = Object.freeze([1, 5, 10, 25, 50, 75, 90, 95, 99]);
const KINDS = Object.freeze(["paper", "print", "halftone"]);
const EPS = 0.02; // L* floor so an empty band does not dominate the dB distance

// ---- FFT ------------------------------------------------------------------------------------

function isPow2(n) {
  return n > 0 && (n & (n - 1)) === 0;
}

function fft1(re, im, n, offset, stride, inverse) {
  // In-place iterative radix-2 on a strided view.
  for (let i = 1, j = 0; i < n; i += 1) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      const a = offset + i * stride, b = offset + j * stride;
      let t = re[a]; re[a] = re[b]; re[b] = t;
      t = im[a]; im[a] = im[b]; im[b] = t;
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const angle = ((inverse ? 2 : -2) * Math.PI) / len, wr = Math.cos(angle), wi = Math.sin(angle);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k += 1) {
        const a = offset + (i + k) * stride, b = offset + (i + k + len / 2) * stride;
        const xr = re[b] * cr - im[b] * ci, xi = re[b] * ci + im[b] * cr;
        re[b] = re[a] - xr; im[b] = im[a] - xi;
        re[a] += xr; im[a] += xi;
        const nr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr; cr = nr;
      }
    }
  }
}

// 2-D FFT of a width x height (both powers of two) complex plane, row-major. Inverse is scaled.
function fft2(re, im, width, height, inverse = false) {
  if (!isPow2(width) || !isPow2(height)) fail(SCOPE, `fft2 needs power-of-two sizes, got ${width}x${height}`);
  for (let y = 0; y < height; y += 1) fft1(re, im, width, y * width, 1, inverse);
  for (let x = 0; x < width; x += 1) fft1(re, im, height, x, width, inverse);
  if (inverse) {
    const scale = 1 / (width * height);
    for (let i = 0; i < re.length; i += 1) { re[i] *= scale; im[i] *= scale; }
  }
}

// ---- image preparation ----------------------------------------------------------------------

// L* (and a*, b*) of an image; transparent pixels are composited over white first, so an ink
// layer with alpha is measured as it prints on white paper.
function lightness(image) {
  let flat = image;
  if (image.data.some((_, i) => i % 4 === 3 && image.data[i] < 255)) {
    const data = Buffer.from(image.data);
    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3] / 255;
      for (let c = 0; c < 3; c += 1) data[i + c] = Math.round(data[i + c] * a + 255 * (1 - a));
      data[i + 3] = 255;
    }
    flat = { width: image.width, height: image.height, data };
  }
  return labPlanes(flat);
}

function roiRect(roi, width, height) {
  if (roi === undefined || roi === null) return { x: 0, y: 0, w: width, h: height };
  if (!Array.isArray(roi) || roi.length !== 4 || roi.some((v) => !Number.isFinite(v) || v < 0 || v > 1) || roi[0] >= roi[2] || roi[1] >= roi[3]) {
    fail(SCOPE, "params.roi must be [x0, y0, x1, y1] fractions with x0 < x1 and y0 < y1", { code: "OPTION_VALUE_INVALID" });
  }
  const x = Math.round(roi[0] * width), y = Math.round(roi[1] * height);
  return { x, y, w: Math.round(roi[2] * width) - x, h: Math.round(roi[3] * height) - y };
}

function tileSize(rect) {
  let n = 1;
  while (n * 2 <= Math.min(rect.w, rect.h) && n * 2 <= 1024) n *= 2;
  if (n < 64) fail(SCOPE, `the measured region is ${rect.w}x${rect.h} px; at least 64x64 is needed. Fix: widen params.roi or measure a larger scan`, { code: "INPUT_TOO_SMALL" });
  return n;
}

// Up to 16 non-overlapping NxN tiles covering the region (Welch averaging).
function tiles(rect, n, max = 16) {
  const nx = Math.floor(rect.w / n), ny = Math.floor(rect.h / n), out = [];
  const step = Math.max(1, Math.ceil(Math.sqrt((nx * ny) / max)));
  for (let ty = 0; ty < ny; ty += step) for (let tx = 0; tx < nx; tx += step) {
    if (out.length < max) out.push({ x: rect.x + tx * n + Math.floor((rect.w - nx * n) / 2), y: rect.y + ty * n + Math.floor((rect.h - ny * n) / 2) });
  }
  return out;
}

const HANN = new Map();
function hann(n) {
  if (!HANN.has(n)) HANN.set(n, Float64Array.from({ length: n }, (_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / n)));
  return HANN.get(n);
}

// Average power spectrum (variance per bin, L*^2) of the region; DC removed per tile.
function powerSpectrum(L, width, rect) {
  const n = tileSize(rect), list = tiles(rect, n), w = hann(n);
  const power = new Float64Array(n * n), re = new Float64Array(n * n), im = new Float64Array(n * n);
  let s2 = 0;
  for (let y = 0; y < n; y += 1) for (let x = 0; x < n; x += 1) s2 += (w[x] * w[y]) ** 2;
  for (const tile of list) {
    let mean = 0;
    for (let y = 0; y < n; y += 1) for (let x = 0; x < n; x += 1) mean += L[(tile.y + y) * width + tile.x + x];
    mean /= n * n;
    im.fill(0);
    for (let y = 0; y < n; y += 1) for (let x = 0; x < n; x += 1) re[y * n + x] = (L[(tile.y + y) * width + tile.x + x] - mean) * w[x] * w[y];
    fft2(re, im, n, n);
    for (let i = 0; i < n * n; i += 1) power[i] += (re[i] * re[i] + im[i] * im[i]) / (n * n * s2);
  }
  for (let i = 0; i < n * n; i += 1) power[i] /= list.length;
  power[0] = 0;
  return { n, power, tiles: list.length };
}

const freq = (k, n) => (k < n / 2 ? k : k - n);

// ---- paper / ink flat statistics ------------------------------------------------------------

function bandTable(pxPerMm, n) {
  if (pxPerMm) {
    return BAND_EDGES_MM.slice(0, -1).map((lo, i) => ({ label: `${lo}-${BAND_EDGES_MM[i + 1]}mm`, loPx: lo * pxPerMm, hiPx: BAND_EDGES_MM[i + 1] * pxPerMm }))
      .filter((band) => band.loPx >= 2.5 && band.hiPx <= n / 2);
  }
  const out = [];
  for (let lo = 2; lo * 2 <= n / 2; lo *= 2) out.push({ label: `${lo}-${lo * 2}px`, loPx: lo, hiPx: lo * 2 });
  return out;
}

function quantiles(values) {
  const sorted = Float32Array.from(values).sort();
  return QUANTILES.map((q) => sorted[Math.min(sorted.length - 1, Math.round((q / 100) * (sorted.length - 1)))]);
}

function regionValues(plane, width, rect, maxSamples = 1 << 20) {
  const step = Math.max(1, Math.ceil(Math.sqrt((rect.w * rect.h) / maxSamples))), out = [];
  for (let y = rect.y; y < rect.y + rect.h; y += step) for (let x = rect.x; x < rect.x + rect.w; x += step) out.push(plane[y * width + x]);
  return out;
}

const round = (value, digits = 3) => Number(value.toFixed(digits));

function surfaceStats(image, { pxPerMm = null, roi } = {}) {
  if (pxPerMm !== null && !(Number.isFinite(pxPerMm) && pxPerMm > 0 && pxPerMm < 200)) fail(SCOPE, "params.pxPerMm must be a number of pixels per millimetre (300 dpi = 11.81)", { code: "OPTION_VALUE_INVALID" });
  const lab = lightness(image), rect = roiRect(roi, image.width, image.height);
  const { n, power, tiles: tileCount } = powerSpectrum(lab.L, image.width, rect);
  const bands = bandTable(pxPerMm, n).map((band) => ({ ...band, power: 0 }));
  let exx = 0, eyy = 0, exy = 0, total = 0, peak = { power: 0 };
  const ringMedian = new Map();
  for (let ky = 0; ky < n; ky += 1) for (let kx = 0; kx < n; kx += 1) {
    const p = power[ky * n + kx];
    if (!p) continue;
    const fx = freq(kx, n), fy = freq(ky, n), r = Math.hypot(fx, fy), period = n / r;
    total += p;
    for (const band of bands) if (period >= band.loPx && period < band.hiPx) band.power += p;
    if (period >= 2.5 && period <= n / 4) {
      exx += (p * fx * fx) / (r * r); eyy += (p * fy * fy) / (r * r); exy += (p * fx * fy) / (r * r);
      const ring = Math.round(r);
      if (!ringMedian.has(ring)) ringMedian.set(ring, []);
      ringMedian.get(ring).push(p);
      if (p > peak.power && fy >= 0) peak = { power: p, fx, fy, r };
    }
  }
  const anis = Math.sqrt((exx - eyy) ** 2 + 4 * exy * exy) / Math.max(exx + eyy, 1e-12);
  // A line pattern (laid lines, a mesh) shows as one bin far above the median of its ring.
  let line = null;
  if (peak.power) {
    const ring = ringMedian.get(Math.round(peak.r)).sort((a, b) => a - b), med = ring[ring.length >> 1] || 1e-12;
    const ratio = peak.power / med;
    if (ratio >= 25) line = { periodPx: round(n / peak.r, 2), ...(pxPerMm ? { periodMm: round(n / peak.r / pxPerMm, 3) } : {}), angleDeg: round(((Math.atan2(peak.fy, peak.fx) * 180) / Math.PI + 180) % 180, 1), amplitude: round(Math.sqrt(2 * peak.power), 3), peakRatio: round(ratio, 1) };
  }
  const values = regionValues(lab.L, image.width, rect), mean = values.reduce((a, b) => a + b, 0) / values.length;
  // Quantiles of the texture the bands describe: lightness minus its local mean over a quarter
  // tile, so shading across the sheet (light fall-off, vignetting) does not widen them.
  const crop = new Float32Array(rect.w * rect.h);
  for (let y = 0; y < rect.h; y += 1) for (let x = 0; x < rect.w; x += 1) crop[y * rect.w + x] = lab.L[(rect.y + y) * image.width + rect.x + x];
  const local = gaussianBlur(crop, rect.w, rect.h, n / 8);
  for (let i = 0; i < crop.length; i += 1) crop[i] -= local[i];
  const q = quantiles(regionValues(crop, rect.w, { x: 0, y: 0, w: rect.w, h: rect.h })).map((v) => round(v, 3));
  const meanOf = (plane) => round(regionValues(plane, image.width, rect).reduce((a, b) => a + b, 0) / values.length, 2);
  const visible = bands.filter((band) => band.loPx >= (pxPerMm ? 0.5 * pxPerMm : 2) && band.hiPx <= (pxPerMm ? 8 * pxPerMm : 64)).reduce((a, band) => a + band.power, 0);
  return {
    units: pxPerMm ? "mm" : "px",
    pxPerMm: pxPerMm ? round(pxPerMm, 3) : null,
    region: { x: rect.x, y: rect.y, width: rect.w, height: rect.h, tile: n, tiles: tileCount },
    meanLab: [meanOf(lab.L), meanOf(lab.A), meanOf(lab.B)],
    rmsL: round(Math.sqrt(total), 3),
    visibleRmsL: round(Math.sqrt(visible), 3),
    bands: Object.fromEntries(bands.map((band) => [band.label, round(Math.sqrt(band.power), 4)])),
    quantiles: Object.fromEntries(QUANTILES.map((p, i) => [`p${p}`, q[i]])),
    anisotropy: round(anis, 3),
    orientationDeg: round((((Math.atan2(2 * exy, exx - eyy) / 2) * 180) / Math.PI + 180) % 180, 1),
    line,
    lightFraction: round(regionValues(crop, rect.w, { x: 0, y: 0, w: rect.w, h: rect.h }).filter((v) => v > q[4] + 10).length / values.length, 4),
  };
}

// ---- halftone statistics ---------------------------------------------------------------------

function halftoneStats(image, { pxPerMm = null, roi } = {}) {
  const lab = lightness(image), rect = roiRect(roi, image.width, image.height);
  const { n, power } = powerSpectrum(lab.L, image.width, rect);
  let best = { p: 0 };
  for (let ky = 0; ky < n; ky += 1) for (let kx = 0; kx < n; kx += 1) {
    const fx = freq(kx, n), fy = freq(ky, n), r = Math.hypot(fx, fy);
    if (r < n / 40 || r > n / 2.5 || fy < 0) continue;
    // Whitened (x r^2): image content falls off about as 1/f^2, a screen is a spike.
    const p = power[ky * n + kx] * r * r;
    if (p > best.p) best = { p, fx, fy, r };
  }
  if (!best.p) fail(SCOPE, "no screen peak between 2.5 and 40 px; this does not look like a halftone at this resolution", { code: "MEASURE_FAILED" });
  const at = (fx, fy, radius = 2) => {
    let sum = 0;
    for (let dy = -radius; dy <= radius; dy += 1) for (let dx = -radius; dx <= radius; dx += 1) {
      const x = Math.round(fx) + dx, y = Math.round(fy) + dy;
      if (Math.abs(x) >= n / 2 || Math.abs(y) >= n / 2) continue;
      sum += power[((y + n) % n) * n + ((x + n) % n)];
    }
    return sum;
  };
  const f1 = [best.fx, best.fy], f2 = [-best.fy, best.fx];
  let lattice = 0, total = 0;
  const seen = new Set();
  for (let m = -4; m <= 4; m += 1) for (let k = -4; k <= 4; k += 1) {
    if (!m && !k) continue;
    const fx = m * f1[0] + k * f2[0], fy = m * f1[1] + k * f2[1];
    if (Math.abs(fx) >= n / 2 - 2 || Math.abs(fy) >= n / 2 - 2) continue;
    for (let dy = -2; dy <= 2; dy += 1) for (let dx = -2; dx <= 2; dx += 1) {
      const x = Math.round(fx) + dx, y = Math.round(fy) + dy, key = `${x},${y}`;
      if (seen.has(key)) continue;
      seen.add(key);
      lattice += power[((y + n) % n) * n + ((x + n) % n)];
    }
  }
  // Only the band above 0.6 x the screen frequency counts: image content (a face, a sky gradient)
  // lives below it, so what is left off the lattice there is dot raggedness, ink mottle and paper.
  for (const key of seen) {
    const [x, y] = key.split(",").map(Number);
    if (Math.hypot(x, y) < 0.6 * best.r) lattice -= power[((y + n) % n) * n + ((x + n) % n)];
  }
  for (let ky = 0; ky < n; ky += 1) for (let kx = 0; kx < n; kx += 1) if (Math.hypot(freq(kx, n), freq(ky, n)) >= 0.6 * best.r) total += power[ky * n + kx];
  const fundamental = at(f1[0], f1[1]) + at(f2[0], f2[1]);
  const second = at(2 * f1[0], 2 * f1[1]) + at(2 * f2[0], 2 * f2[1]);
  const values = regionValues(lab.L, image.width, rect), sorted = Float32Array.from(values).sort();
  const paper = sorted[Math.round(0.97 * (sorted.length - 1))], ink = sorted[Math.round(0.03 * (sorted.length - 1))];
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const periodPx = n / best.r;
  return {
    pxPerMm: pxPerMm ? round(pxPerMm, 3) : null,
    region: { x: rect.x, y: rect.y, width: rect.w, height: rect.h, tile: n },
    periodPx: round(periodPx, 3),
    ...(pxPerMm ? { periodMm: round(periodPx / pxPerMm, 4), lpi: round((25.4 * pxPerMm) / periodPx, 1) } : {}),
    angleDeg: round((((Math.atan2(best.fy, best.fx) * 180) / Math.PI) % 90 + 90) % 90, 1),
    coverage: round(Math.min(1, Math.max(0, (paper - mean) / Math.max(paper - ink, 1))), 3),
    paperL: round(paper, 2),
    inkL: round(ink, 2),
    harmonic2Ratio: round(Math.sqrt(second / Math.max(fundamental, 1e-12)), 4),
    offLatticeFraction: round(Math.max(0, 1 - lattice / Math.max(total, 1e-12)), 4),
  };
}

function measure(image, kind, params = {}) {
  if (!KINDS.includes(kind)) fail(SCOPE, `--kind must be one of ${KINDS.join(", ")}`, { code: "OPTION_VALUE_INVALID" });
  const options = { pxPerMm: params.pxPerMm ?? null, roi: params.roi };
  return { kind, ...(kind === "halftone" ? halftoneStats(image, options) : surfaceStats(image, options)) };
}

// Two halves of the region, measured separately: the natural variation of one real sheet.
function halves(roi) {
  const [x0, y0, x1, y1] = roi || [0, 0, 1, 1];
  return (x1 - x0) >= (y1 - y0)
    ? [[x0, y0, (x0 + x1) / 2, y1], [(x0 + x1) / 2, y0, x1, y1]]
    : [[x0, y0, x1, (y0 + y1) / 2], [x0, (y0 + y1) / 2, x1, y1]];
}

// ---- distances --------------------------------------------------------------------------------

// `within` (optional): only bands also present in a third measurement, such as the profile a
// generator was fitted on, so a band the fit never saw is not counted against the generator.
function surfaceDistance(a, b, within = null) {
  const shared = Object.keys(a.bands).filter((key) => key in b.bands && a.units === b.units && (!within || key in within.bands));
  if (!shared.length) return { comparable: false, reason: a.units !== b.units ? "one side has px/mm and the other does not; pass params.pxPerMm for both" : "no octave band is resolved in both images" };
  const db = shared.map((key) => 20 * Math.log10((a.bands[key] + EPS) / (b.bands[key] + EPS)));
  const qa = Object.values(a.quantiles), qb = Object.values(b.quantiles);
  return {
    comparable: true,
    bands: shared,
    spectralDb: round(Math.sqrt(db.reduce((s, v) => s + v * v, 0) / db.length), 3),
    bandDb: Object.fromEntries(shared.map((key, i) => [key, round(db[i], 2)])),
    histogramL: round(qa.reduce((s, v, i) => s + Math.abs(v - qb[i]), 0) / qa.length, 3),
    visibleRmsRatio: round((a.visibleRmsL + EPS) / (b.visibleRmsL + EPS), 3),
    anisotropy: round(Math.abs(a.anisotropy - b.anisotropy), 3),
    meanDeltaE: round(Math.hypot(a.meanLab[0] - b.meanLab[0], a.meanLab[1] - b.meanLab[1], a.meanLab[2] - b.meanLab[2]), 2),
  };
}

function halftoneDistance(a, b) {
  const db = (x, y) => 20 * Math.log10((x + 1e-3) / (y + 1e-3));
  return {
    comparable: true,
    offLattice: round(Math.abs(a.offLatticeFraction - b.offLatticeFraction), 4),
    harmonic2Db: round(Math.abs(db(a.harmonic2Ratio, b.harmonic2Ratio)), 3),
    coverage: round(Math.abs(a.coverage - b.coverage), 3),
    contrastL: round(Math.abs((a.paperL - a.inkL) - (b.paperL - b.inkL)), 2),
    ...(a.lpi && b.lpi ? { lpiRatio: round(a.lpi / b.lpi, 3) } : {}),
    angleDeg: round(Math.min(Math.abs(a.angleDeg - b.angleDeg), 90 - Math.abs(a.angleDeg - b.angleDeg)), 1),
  };
}

function distance(a, b, within = null) {
  if (a.kind !== b.kind && !(a.kind !== "halftone" && b.kind !== "halftone")) fail(SCOPE, `cannot compare a ${a.kind} measurement with a ${b.kind} one`, { code: "OPTION_VALUE_INVALID" });
  return a.kind === "halftone" ? halftoneDistance(a, b) : surfaceDistance(a, b, within);
}

// Place a distance against the yardsticks of its reference profile.
// natural: two crops of the same real sheet; between: two different real papers/flats.
function assess(kind, d, yardsticks = {}) {
  if (!d.comparable) return { level: "not-comparable", reason: d.reason };
  const metric = kind === "halftone" ? "offLattice" : "spectralDb";
  const value = d[metric], natural = yardsticks.natural?.[metric], between = yardsticks.between?.[metric];
  let level = "no-yardstick";
  if (Number.isFinite(natural) && value <= Math.max(natural * 1.5, kind === "halftone" ? 0.02 : 1)) level = "within-natural-variation";
  else if (Number.isFinite(between) && value <= between) level = "within-real-range";
  else if (Number.isFinite(between) || Number.isFinite(natural)) level = "unlike-reference";
  return { metric, value, natural: natural ?? null, between: between ?? null, level };
}

module.exports = { BAND_EDGES_MM, KINDS, assess, distance, fft2, halves, isPow2, lightness, measure, roiRect };

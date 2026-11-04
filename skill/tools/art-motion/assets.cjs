"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { assertKeys, fail, pngDimensions, resolveInside, sha256 } = require("../../scripts/contract-utils.cjs");
const { decodePng, encodePng } = require("../../scripts/png-core.cjs");

const SCOPE = "art-motion assets";
const MAX_INPUTS = 200;
const MAX_FRAMES = 1000;
const MAX_PNG_BYTES = 128 * 1024 * 1024;
const MAX_TOTAL_PIXELS = 16 * 1024 * 1024;

function finite(value, label, min, max) {
  if (!Number.isFinite(value) || value < min || value > max) fail(SCOPE, `${label} must be between ${min} and ${max}`);
}

function relativePath(root, value, label, mustExist = false) {
  if (typeof value !== "string" || !value.trim() || path.isAbsolute(value) || /^[a-z]:/i.test(value) || value.includes("\\") || value.split("/").some((part) => !part || part === "." || part === "..")) {
    fail(SCOPE, `${label} must be a contained relative path using forward slashes`);
  }
  return resolveInside(root, value, label, { mustExist, scope: SCOPE });
}

function pngHeaderBudget(header, byteLength, label) {
  if (byteLength > MAX_PNG_BYTES) fail(SCOPE, `${label} exceeds the 128 MiB PNG input limit`);
  const size = pngDimensions(header);
  if (!size) fail(SCOPE, `${label} has no valid PNG IHDR header`);
  const pixels = size.width * size.height;
  if (!Number.isSafeInteger(pixels) || pixels < 1 || pixels > MAX_TOTAL_PIXELS) fail(SCOPE, `${label} exceeds the ${MAX_TOTAL_PIXELS.toLocaleString()}-pixel per-image limit`);
  return { ...size, pixels, bytes: byteLength };
}

function filePngBudget(file, label, totals) {
  const bytes = fs.statSync(file).size;
  if (bytes > MAX_PNG_BYTES || totals.bytes + bytes > MAX_PNG_BYTES) fail(SCOPE, `${label} exceeds the 128 MiB aggregate PNG input limit`);
  const header = Buffer.alloc(24), fd = fs.openSync(file, "r");
  let read;
  try { read = fs.readSync(fd, header, 0, header.length, 0); } finally { fs.closeSync(fd); }
  const size = pngHeaderBudget(header.subarray(0, read), bytes, label);
  if (totals.pixels + size.pixels > MAX_TOTAL_PIXELS) fail(SCOPE, `${label} exceeds the ${MAX_TOTAL_PIXELS.toLocaleString()}-pixel aggregate image limit`);
  totals.bytes += size.bytes; totals.pixels += size.pixels;
  return size;
}

function pixelBox(image, predicate, padding = 0) {
  let minX = image.width, minY = image.height, maxX = -1, maxY = -1;
  for (let y = 0; y < image.height; y += 1) for (let x = 0; x < image.width; x += 1) {
    if (!predicate(image.data[(y * image.width + x) * 4 + 3])) continue;
    minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
  }
  if (maxX < 0) fail(SCOPE, "no pixels remain above the requested alpha threshold");
  const x = Math.max(0, minX - padding), y = Math.max(0, minY - padding);
  return { x, y, width: Math.min(image.width, maxX + 1 + padding) - x, height: Math.min(image.height, maxY + 1 + padding) - y };
}

function cropImage(image, rect) {
  const data = Buffer.alloc(rect.width * rect.height * 4);
  for (let y = 0; y < rect.height; y += 1) {
    const start = ((rect.y + y) * image.width + rect.x) * 4;
    image.data.copy(data, y * rect.width * 4, start, start + rect.width * 4);
  }
  return { width: rect.width, height: rect.height, data };
}

function smoothstep(a, b, value) {
  const x = Math.max(0, Math.min(1, (value - a) / (b - a)));
  return x * x * (3 - 2 * x);
}

function keyedImage(input, options) {
  assertKeys(options, ["mode", "soft", "hard"], ["mode", "soft", "hard", "keyColor", "despill", "alphaThreshold", "padding"], "options", SCOPE);
  if (!Buffer.isBuffer(input)) fail(SCOPE, "input must be PNG bytes");
  pngHeaderBudget(input.subarray(0, 24), input.length, "key input");
  if (!(["chroma", "white-matte"].includes(options.mode))) fail(SCOPE, "mode must be chroma or white-matte");
  finite(options.soft, "soft", 0, 441.7); finite(options.hard, "hard", 0.01, 441.7);
  if (options.soft >= options.hard) fail(SCOPE, "soft must be lower than hard");
  const despill = options.despill ?? 0.5, alphaThreshold = options.alphaThreshold ?? 12, padding = options.padding ?? 2;
  finite(despill, "despill", 0, 1); finite(alphaThreshold, "alphaThreshold", 0, 254); finite(padding, "padding", 0, 128);
  if (!Number.isInteger(alphaThreshold) || !Number.isInteger(padding)) fail(SCOPE, "alphaThreshold and padding must be integers");
  let keyColor = null;
  if (options.mode === "chroma") {
    if (!Array.isArray(options.keyColor) || options.keyColor.length !== 3 || options.keyColor.some((channel) => !Number.isInteger(channel) || channel < 0 || channel > 255)) fail(SCOPE, "chroma mode requires keyColor as three integer channels from 0 to 255");
    keyColor = [...options.keyColor];
  } else if (options.keyColor !== undefined) fail(SCOPE, "keyColor is only valid in chroma mode");

  const image = decodePng(input, "key input");
  const result = { width: image.width, height: image.height, data: Buffer.from(image.data) };
  let keyChannel = 0;
  if (keyColor) keyChannel = keyColor.indexOf(Math.max(...keyColor));
  for (let index = 0; index < result.data.length; index += 4) {
    const r = result.data[index], g = result.data[index + 1], b = result.data[index + 2];
    let strength;
    if (keyColor) {
      strength = Math.hypot(r - keyColor[0], g - keyColor[1], b - keyColor[2]);
    } else {
      strength = Math.hypot(255 - r, 255 - g, 255 - b);
    }
    const alpha = smoothstep(options.soft, options.hard, strength);
    result.data[index + 3] = Math.round(result.data[index + 3] * alpha);
    if (keyColor && despill > 0) {
      const others = [0, 1, 2].filter((channel) => channel !== keyChannel);
      const spill = result.data[index + keyChannel] - Math.max(result.data[index + others[0]], result.data[index + others[1]]);
      if (spill > 0) result.data[index + keyChannel] = Math.round(result.data[index + keyChannel] - spill * despill * alpha);
    }
  }
  const bounds = pixelBox(result, (alpha) => alpha > alphaThreshold, padding);
  return {
    image: cropImage(result, bounds),
    placement: { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height, canvasWidth: image.width, canvasHeight: image.height },
    input: { width: image.width, height: image.height, sha256: sha256(input) },
  };
}

function splitSprites(input, options) {
  assertKeys(options, ["axis", "minGapPx", "alphaThreshold"], ["axis", "minGapPx", "alphaThreshold", "minSpanPx", "minAreaPx", "paddingPx", "maxSprites"], "options", SCOPE);
  if (!Buffer.isBuffer(input)) fail(SCOPE, "input must be PNG bytes");
  pngHeaderBudget(input.subarray(0, 24), input.length, "sprite sheet");
  if (!["x", "y"].includes(options.axis)) fail(SCOPE, "axis must be x or y");
  const minGapPx = options.minGapPx, alphaThreshold = options.alphaThreshold;
  finite(minGapPx, "minGapPx", 1, 4096); finite(alphaThreshold, "alphaThreshold", 0, 254);
  if (!Number.isInteger(minGapPx) || !Number.isInteger(alphaThreshold)) fail(SCOPE, "minGapPx and alphaThreshold must be integers");
  const minSpanPx = options.minSpanPx ?? 1, minAreaPx = options.minAreaPx ?? 1, paddingPx = options.paddingPx ?? 0, maxSprites = options.maxSprites ?? 128;
  finite(minSpanPx, "minSpanPx", 1, 16384); finite(minAreaPx, "minAreaPx", 1, 64e6); finite(paddingPx, "paddingPx", 0, 1024); finite(maxSprites, "maxSprites", 1, MAX_FRAMES);
  if (![minSpanPx, minAreaPx, paddingPx, maxSprites].every(Number.isInteger)) fail(SCOPE, "minSpanPx, minAreaPx, paddingPx and maxSprites must be integers");
  const image = decodePng(input, "sprite sheet");
  const length = options.axis === "x" ? image.width : image.height;
  const project = Array.from({ length }, () => false);
  for (let along = 0; along < length; along += 1) {
    const acrossLength = options.axis === "x" ? image.height : image.width;
    for (let across = 0; across < acrossLength; across += 1) {
      const x = options.axis === "x" ? along : across, y = options.axis === "x" ? across : along;
      if (image.data[(y * image.width + x) * 4 + 3] > alphaThreshold) { project[along] = true; break; }
    }
  }
  const spans = [];
  let start = -1, last = -1;
  for (let i = 0; i < length; i += 1) if (project[i]) {
    if (start < 0) start = i;
    else if (i - last > minGapPx) { spans.push([start, last + 1]); start = i; }
    last = i;
  }
  if (start >= 0) spans.push([start, last + 1]);
  const frames = [];
  for (const [lo, hi] of spans) {
    if (hi - lo < minSpanPx) continue;
    const areaRect = options.axis === "x" ? { x: lo, y: 0, width: hi - lo, height: image.height } : { x: 0, y: lo, width: image.width, height: hi - lo };
    const strip = cropImage(image, areaRect);
    const localBounds = pixelBox(strip, (alpha) => alpha > alphaThreshold, paddingPx);
    const rect = { x: areaRect.x + localBounds.x, y: areaRect.y + localBounds.y, width: localBounds.width, height: localBounds.height };
    if (rect.width * rect.height < minAreaPx) continue;
    frames.push({ rect, image: cropImage(image, rect) });
    if (frames.length > maxSprites) fail(SCOPE, `sprite count exceeds maxSprites ${maxSprites}`);
  }
  if (!frames.length) fail(SCOPE, "no sprite spans met the configured thresholds");
  return { sheet: { width: image.width, height: image.height, sha256: sha256(input) }, frames: frames.map((frame, index) => ({ index, ...frame.rect, image: frame.image })) };
}

function prepareOutput(root, relative, entries) {
  const directory = relativePath(root, relative, "output directory");
  if (fs.existsSync(directory)) fail(SCOPE, `output already exists: ${relative}`);
  const names = entries.map((entry) => entry.name);
  if (new Set(names).size !== names.length) fail(SCOPE, "output names collide");
  for (const entry of entries) if (path.basename(entry.name) !== entry.name || entry.name.includes("..")) fail(SCOPE, `unsafe output name: ${entry.name}`);
  fs.mkdirSync(directory, { recursive: true });
  const createdFiles = [];
  try {
    for (const entry of entries) {
      const target = path.join(directory, entry.name);
      const fd = fs.openSync(target, "wx");
      createdFiles.push(target);
      try { fs.writeFileSync(fd, entry.bytes); } finally { fs.closeSync(fd); }
    }
  } catch (error) {
    for (const target of createdFiles) {
      try { fs.unlinkSync(target); } catch { /* remove only files this call successfully created */ }
    }
    try { fs.rmdirSync(directory); } catch { /* leave nonempty/shared parent paths intact */ }
    throw error;
  }
  return directory;
}

function keyFiles(rootInput, files, outputDirectory, options) {
  const root = fs.realpathSync(rootInput);
  if (!Array.isArray(files) || !files.length || files.length > MAX_INPUTS) fail(SCOPE, `files must contain 1..${MAX_INPUTS} paths`);
  const totals = { bytes: 0, pixels: 0 };
  const sources = files.map((file) => {
    const inputPath = relativePath(root, file, "input", true);
    filePngBudget(inputPath, `input ${file}`, totals);
    return { file, inputPath };
  });
  const prepared = sources.map(({ file, inputPath }) => {
    const input = fs.readFileSync(inputPath);
    const keyed = keyedImage(input, options), stem = path.basename(file, path.extname(file));
    return { name: `${stem}.png`, bytes: encodePng(keyed.image), metadata: { id: stem, source: file, ...keyed.input, ...keyed.placement } };
  });
  const metadata = { operation: "keyed-sprites", mode: options.mode, frames: prepared.map((item) => item.metadata) };
  const dir = prepareOutput(root, outputDirectory, [...prepared.map(({ name, bytes }) => ({ name, bytes })), { name: "sprites.json", bytes: Buffer.from(`${JSON.stringify(metadata, null, 2)}\n`) }]);
  return { directory: path.relative(root, dir).split(path.sep).join("/"), metadata };
}

function splitFile(rootInput, inputFile, outputDirectory, options) {
  const root = fs.realpathSync(rootInput), inputPath = relativePath(root, inputFile, "input", true);
  filePngBudget(inputPath, `input ${inputFile}`, { bytes: 0, pixels: 0 });
  const input = fs.readFileSync(inputPath);
  const split = splitSprites(input, options), entries = [], frames = [];
  for (const frame of split.frames) {
    const name = `frame-${String(frame.index).padStart(4, "0")}.png`;
    entries.push({ name, bytes: encodePng(frame.image) });
    frames.push({ id: frame.index, file: name, x: frame.x, y: frame.y, width: frame.width, height: frame.height, canvasWidth: split.sheet.width, canvasHeight: split.sheet.height, sourceSha256: split.sheet.sha256 });
  }
  const metadata = { operation: "sprite-split", source: inputFile, axis: options.axis, frames };
  entries.push({ name: "sprites.json", bytes: Buffer.from(`${JSON.stringify(metadata, null, 2)}\n`) });
  const dir = prepareOutput(root, outputDirectory, entries);
  return { directory: path.relative(root, dir).split(path.sep).join("/"), metadata };
}

function inspectRegions(rootInput, frames, options) {
  const root = fs.realpathSync(rootInput);
  assertKeys(options, ["region", "policy"], ["region", "policy"], "options", SCOPE);
  assertKeys(options.region, ["x", "y", "width", "height"], ["x", "y", "width", "height"], "region", SCOPE);
  assertKeys(options.policy, ["kind", "luminanceBelow", "maxPixels"], ["kind", "luminanceBelow", "maxPixels"], "policy", SCOPE);
  if (options.policy.kind !== "dark-pixels-on-light-background") fail(SCOPE, "policy.kind must explicitly be dark-pixels-on-light-background");
  finite(options.policy.luminanceBelow, "policy.luminanceBelow", 0, 255); finite(options.policy.maxPixels, "policy.maxPixels", 0, 64e6);
  for (const key of ["luminanceBelow", "maxPixels"]) if (!Number.isInteger(options.policy[key])) fail(SCOPE, `policy.${key} must be an integer`);
  for (const key of ["x", "y"]) finite(options.region[key], `region.${key}`, 0, 1);
  for (const key of ["width", "height"]) finite(options.region[key], `region.${key}`, Number.EPSILON, 1);
  if (options.region.x + options.region.width > 1 || options.region.y + options.region.height > 1) fail(SCOPE, "normalized region must stay inside the frame");
  if (!Array.isArray(frames) || !frames.length || frames.length > MAX_FRAMES) fail(SCOPE, `frames must contain 1..${MAX_FRAMES} sampled frames`);
  const totals = { bytes: 0, pixels: 0 };
  const ids = new Set(); let dimensions = null;
  const measurements = frames.map((frame, index) => {
    assertKeys(frame, ["id", "path", "atSec"], ["id", "path", "atSec"], `frames[${index}]`, SCOPE);
    if (typeof frame.id !== "string" || !frame.id.trim() || ids.has(frame.id)) fail(SCOPE, `frames[${index}].id must be unique and non-empty`);
    ids.add(frame.id); finite(frame.atSec, `frames[${index}].atSec`, 0, Number.MAX_SAFE_INTEGER);
    const file = relativePath(root, frame.path, `frames[${index}].path`, true);
    filePngBudget(file, `frames[${index}]`, totals);
    const bytes = fs.readFileSync(file), image = decodePng(bytes, frame.path);
    if (!dimensions) dimensions = { width: image.width, height: image.height };
    if (image.width !== dimensions.width || image.height !== dimensions.height) fail(SCOPE, "sampled frames must share dimensions");
    const x0 = Math.floor(options.region.x * image.width), y0 = Math.floor(options.region.y * image.height);
    const x1 = Math.min(image.width, Math.ceil((options.region.x + options.region.width) * image.width));
    const y1 = Math.min(image.height, Math.ceil((options.region.y + options.region.height) * image.height));
    let darkPixels = 0;
    for (let y = y0; y < y1; y += 1) for (let x = x0; x < x1; x += 1) {
      const offset = (y * image.width + x) * 4;
      const luma = Math.round(0.2126 * image.data[offset] + 0.7152 * image.data[offset + 1] + 0.0722 * image.data[offset + 2]);
      if (image.data[offset + 3] > 0 && luma < options.policy.luminanceBelow) darkPixels += 1;
    }
    return { id: frame.id, path: frame.path, atSec: frame.atSec, sha256: sha256(bytes), regionPixels: (x1 - x0) * (y1 - y0), darkPixels, exceedsPolicy: darkPixels > options.policy.maxPixels };
  });
  return { sourceFrames: measurements.map(({ id, atSec, path: framePath, sha256: digest }) => ({ id, atSec, path: framePath, sha256: digest })), dimensions, region: options.region, pixelRegion: { x: Math.floor(options.region.x * dimensions.width), y: Math.floor(options.region.y * dimensions.height), width: Math.ceil((options.region.x + options.region.width) * dimensions.width) - Math.floor(options.region.x * dimensions.width), height: Math.ceil((options.region.y + options.region.height) * dimensions.height) - Math.floor(options.region.y * dimensions.height) }, policy: options.policy, measurements, limits: "Only supplied sampled PNG frames were measured. The dark-pixel policy is valid only for the explicitly selected light-background region; this is a diagnostic, not a general safe-area or creative-acceptance gate." };
}

// ---------------------------------------------------------------------------------------------
// Collage cutting: object/print mattes, paper-white sticker edge, ink-only layer, hand-cut plate.
// Ported from the SHAFT-style material study (numpy/OpenCV) to dependency-free typed-array code.
// Inputs are PNG bytes like the keying route above; every operation is deterministic for a seed.

const CUT_MODES = Object.freeze(["border", "paper", "white-matte", "none"]);
const CUT_FINISHES = Object.freeze(["cut", "sticker", "ink", "plate"]);
const CUT_PARAMS = Object.freeze(["threshold", "close", "open", "holeMax", "keep", "minFraction", "roi", "exclude", "box", "edgePx", "shadow", "seed", "jitter", "paper"]);

function srgbToLinear(value) {
  const c = value / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}
const LINEAR = Float32Array.from({ length: 256 }, (_, index) => srgbToLinear(index));

function labPlanes(image) {
  const n = image.width * image.height, L = new Float32Array(n), A = new Float32Array(n), B = new Float32Array(n);
  const f = (t) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);
  for (let i = 0; i < n; i += 1) {
    const r = LINEAR[image.data[i * 4]], g = LINEAR[image.data[i * 4 + 1]], b = LINEAR[image.data[i * 4 + 2]];
    const x = f((0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047), y = f(0.2126 * r + 0.7152 * g + 0.0722 * b), z = f((0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883);
    L[i] = 116 * y - 16; A[i] = 500 * (x - y); B[i] = 200 * (y - z);
  }
  return { width: image.width, height: image.height, L, A, B };
}

function median(values) {
  const sorted = Float32Array.from(values).sort();
  return sorted.length ? sorted[sorted.length >> 1] : 0;
}

function percentile(values, p) {
  const sorted = Float32Array.from(values).sort();
  return sorted.length ? sorted[Math.min(sorted.length - 1, Math.max(0, Math.round((p / 100) * (sorted.length - 1))))] : 0;
}

function borderIndices(width, height, band) {
  const out = [];
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    if (x < band || y < band || x >= width - band || y >= height - band) out.push(y * width + x);
  }
  return out;
}

// Exact squared Euclidean distance transform (Felzenszwalb & Huttenlocher), to the nearest `true`.
function distanceSquared(mask, width, height) {
  const INF = 1e20, out = new Float64Array(width * height), size = Math.max(width, height);
  const f = new Float64Array(size), d = new Float64Array(size), v = new Int32Array(size), z = new Float64Array(size + 1);
  const pass = (n) => {
    let k = 0; v[0] = 0; z[0] = -INF; z[1] = INF;
    for (let q = 1; q < n; q += 1) {
      let s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
      while (s <= z[k]) { k -= 1; s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]); }
      k += 1; v[k] = q; z[k] = s; z[k + 1] = INF;
    }
    k = 0;
    for (let q = 0; q < n; q += 1) { while (z[k + 1] < q) k += 1; d[q] = (q - v[k]) ** 2 + f[v[k]]; }
  };
  for (let x = 0; x < width; x += 1) {
    for (let y = 0; y < height; y += 1) f[y] = mask[y * width + x] ? 0 : INF;
    pass(height);
    for (let y = 0; y < height; y += 1) out[y * width + x] = d[y];
  }
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) f[x] = out[y * width + x];
    pass(width);
    for (let x = 0; x < width; x += 1) out[y * width + x] = d[x];
  }
  return out;
}

function dilate(mask, width, height, radius) {
  if (radius <= 0) return Uint8Array.from(mask);
  const dist = distanceSquared(mask, width, height), r2 = radius * radius, out = new Uint8Array(mask.length);
  for (let i = 0; i < out.length; i += 1) out[i] = dist[i] <= r2 ? 1 : 0;
  return out;
}

function erode(mask, width, height, radius) {
  if (radius <= 0) return Uint8Array.from(mask);
  const inverse = new Uint8Array(mask.length);
  for (let i = 0; i < mask.length; i += 1) inverse[i] = mask[i] ? 0 : 1;
  const grown = dilate(inverse, width, height, radius), out = new Uint8Array(mask.length);
  for (let i = 0; i < out.length; i += 1) out[i] = grown[i] ? 0 : 1;
  return out;
}

// 8-connected labels; returns { labels, sizes (index = label - 1), touches (component reaches the image border) }.
function labelComponents(mask, width, height) {
  const labels = new Int32Array(mask.length), queue = new Int32Array(mask.length), sizes = [], touches = [];
  let next = 0;
  for (let start = 0; start < mask.length; start += 1) {
    if (!mask[start] || labels[start]) continue;
    next += 1; labels[start] = next;
    let head = 0, tail = 0, size = 0, edge = false;
    queue[tail++] = start;
    while (head < tail) {
      const index = queue[head++], x = index % width, y = (index - x) / width;
      size += 1;
      if (x === 0 || y === 0 || x === width - 1 || y === height - 1) edge = true;
      for (let dy = -1; dy <= 1; dy += 1) for (let dx = -1; dx <= 1; dx += 1) {
        const nx = x + dx, ny = y + dy;
        if ((dx || dy) && nx >= 0 && ny >= 0 && nx < width && ny < height) {
          const neighbor = ny * width + nx;
          if (mask[neighbor] && !labels[neighbor]) { labels[neighbor] = next; queue[tail++] = neighbor; }
        }
      }
    }
    sizes.push(size); touches.push(edge);
  }
  return { labels, sizes, touches };
}

function gaussianBlur(plane, width, height, sigma) {
  if (sigma <= 0) return Float32Array.from(plane);
  const radius = Math.max(1, Math.ceil(sigma * 3)), kernel = new Float32Array(radius * 2 + 1);
  let sum = 0;
  for (let i = -radius; i <= radius; i += 1) { kernel[i + radius] = Math.exp(-(i * i) / (2 * sigma * sigma)); sum += kernel[i + radius]; }
  for (let i = 0; i < kernel.length; i += 1) kernel[i] /= sum;
  const tmp = new Float32Array(plane.length), out = new Float32Array(plane.length);
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    let acc = 0;
    for (let k = -radius; k <= radius; k += 1) acc += plane[y * width + Math.min(width - 1, Math.max(0, x + k))] * kernel[k + radius];
    tmp[y * width + x] = acc;
  }
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    let acc = 0;
    for (let k = -radius; k <= radius; k += 1) acc += tmp[Math.min(height - 1, Math.max(0, y + k)) * width + x] * kernel[k + radius];
    out[y * width + x] = acc;
  }
  return out;
}

function seededRandom(seed) {
  let state = seed >>> 0;
  const uniform = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return { uniform, normal: () => Math.sqrt(-2 * Math.log(1 - uniform())) * Math.cos(2 * Math.PI * uniform()) };
}

function fillPolygon(points, width, height) {
  const mask = new Uint8Array(width * height);
  for (let y = 0; y < height; y += 1) {
    const cy = y + 0.5, crossings = [];
    for (let i = 0; i < points.length; i += 1) {
      const [x0, y0] = points[i], [x1, y1] = points[(i + 1) % points.length];
      if ((y0 <= cy && y1 > cy) || (y1 <= cy && y0 > cy)) crossings.push(x0 + ((cy - y0) / (y1 - y0)) * (x1 - x0));
    }
    crossings.sort((a, b) => a - b);
    for (let i = 0; i + 1 < crossings.length; i += 2) {
      for (let x = Math.max(0, Math.ceil(crossings[i] - 0.5)); x < Math.min(width, Math.ceil(crossings[i + 1] - 0.5)); x += 1) mask[y * width + x] = 1;
    }
  }
  return mask;
}

function normalizedRect(value, label) {
  if (!Array.isArray(value) || value.length !== 4 || value.some((v) => !Number.isFinite(v) || v < 0 || v > 1) || value[0] >= value[2] || value[1] >= value[3]) {
    fail(SCOPE, `${label} must be [x0, y0, x1, y1] fractions with x0 < x1 and y0 < y1`);
  }
  return value;
}

function cutParams(options) {
  assertKeys(options, ["mode"], ["mode", "finishes", "params"], "options", SCOPE);
  if (!CUT_MODES.includes(options.mode)) fail(SCOPE, `mode must be one of ${CUT_MODES.join(", ")}`);
  const finishes = options.finishes ?? (options.mode === "none" ? ["ink", "plate"] : ["cut", "sticker"]);
  if (!Array.isArray(finishes) || !finishes.length || finishes.some((finish) => !CUT_FINISHES.includes(finish))) fail(SCOPE, `finishes must list ${CUT_FINISHES.join(", ")}`);
  if (options.mode === "none" && finishes.some((finish) => finish === "cut" || finish === "sticker")) fail(SCOPE, "mode none has no matte; pick ink or plate, or a matte mode for cut/sticker");
  const p = options.params ?? {};
  if (typeof p !== "object" || Array.isArray(p)) fail(SCOPE, "params must be an object");
  for (const key of Object.keys(p)) if (!CUT_PARAMS.includes(key)) fail(SCOPE, `unknown cut param ${key}; known: ${CUT_PARAMS.join(", ")}`);
  const value = (key, fallback, min, max, integer = false) => {
    const v = p[key] ?? fallback;
    finite(v, key, min, max);
    if (integer && !Number.isInteger(v)) fail(SCOPE, `${key} must be an integer`);
    return v;
  };
  const params = {
    threshold: value("threshold", options.mode === "paper" ? 18 : 12, 1, 100),
    close: value("close", 4, 0, 64, true), open: value("open", 1, 0, 32, true),
    holeMax: value("holeMax", 0.004, 0, 1), keep: value("keep", 1, 1, 64, true), minFraction: value("minFraction", 0.004, 0, 1),
    edgePx: p.edgePx === undefined ? null : value("edgePx", 0, 1, 256, true), seed: value("seed", 7, 0, 2 ** 31, true), jitter: value("jitter", 0.006, 0, 0.05),
    roi: p.roi === undefined ? null : normalizedRect(p.roi, "roi"), box: p.box === undefined ? null : normalizedRect(p.box, "box"),
    exclude: (p.exclude ?? []).map((rect, index) => normalizedRect(rect, `exclude[${index}]`)),
    shadow: p.shadow ?? [7, 9, 7, 0.42], paper: p.paper ?? [244, 240, 230],
  };
  if (!Array.isArray(params.shadow) || params.shadow.length !== 4 || params.shadow.some((v) => !Number.isFinite(v))) fail(SCOPE, "shadow must be [dx, dy, blurPx, opacity]");
  if (!Array.isArray(params.paper) || params.paper.length !== 3 || params.paper.some((v) => !Number.isInteger(v) || v < 0 || v > 255)) fail(SCOPE, "paper must be three integer channels");
  return { mode: options.mode, finishes, params };
}

// Least-squares fit of v = a + bx + cy + dx^2 + exy + fy^2 over the given cells; returns the surface.
function quadraticSurface(plane, width, height, cells) {
  const terms = (x, y) => [1, x, y, x * x, x * y, y * y];
  const M = Array.from({ length: 6 }, () => new Float64Array(7));
  for (const s of cells) {
    const x = (s % width) / width - 0.5, y = Math.floor(s / width) / height - 0.5, t = terms(x, y);
    for (let i = 0; i < 6; i += 1) { for (let j = 0; j < 6; j += 1) M[i][j] += t[i] * t[j]; M[i][6] += t[i] * plane[s]; }
  }
  for (let i = 0; i < 6; i += 1) M[i][i] += 1e-6;
  for (let col = 0; col < 6; col += 1) {
    let pivot = col;
    for (let row = col + 1; row < 6; row += 1) if (Math.abs(M[row][col]) > Math.abs(M[pivot][col])) pivot = row;
    [M[col], M[pivot]] = [M[pivot], M[col]];
    for (let row = 0; row < 6; row += 1) if (row !== col) {
      const factor = M[row][col] / M[col][col];
      for (let k = col; k < 7; k += 1) M[row][k] -= factor * M[col][k];
    }
  }
  const coef = M.map((row, i) => row[6] / row[i]), out = new Float32Array(width * height);
  for (let s = 0; s < out.length; s += 1) {
    const t = terms((s % width) / width - 0.5, Math.floor(s / width) / height - 0.5);
    out[s] = t.reduce((acc, value, i) => acc + value * coef[i], 0);
  }
  return out;
}

// Background distance per pixel and how uniform the background sample was.
function backgroundDistance(lab, mode, threshold) {
  const { width, height, L, A, B } = lab, n = width * height, distance = new Float32Array(n);
  const band = Math.max(2, Math.round(Math.min(width, height) * 0.01));
  const border = borderIndices(width, height, band);
  if (mode === "white-matte") {
    for (let i = 0; i < n; i += 1) distance[i] = Math.hypot(100 - L[i], A[i], B[i]);
  } else if (mode === "border") {
    const ref = [median(border.map((i) => L[i])), median(border.map((i) => A[i])), median(border.map((i) => B[i]))];
    for (let i = 0; i < n; i += 1) distance[i] = Math.hypot(L[i] - ref[0], A[i] - ref[1], B[i] - ref[2]);
  } else {
    // paper: the sheet's tone drifts, so compare each pixel with a smoothed estimate of the paper itself.
    const factor = Math.max(1, Math.round(Math.max(width, height) / 160)), sw = Math.ceil(width / factor), sh = Math.ceil(height / factor);
    const small = [new Float32Array(sw * sh), new Float32Array(sw * sh), new Float32Array(sw * sh)], counts = new Float32Array(sw * sh);
    for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
      const s = Math.floor(y / factor) * sw + Math.floor(x / factor), i = y * width + x;
      small[0][s] += L[i]; small[1][s] += A[i]; small[2][s] += B[i]; counts[s] += 1;
    }
    for (let s = 0; s < counts.length; s += 1) for (const plane of small) plane[s] /= counts[s];
    // Model the backdrop as a smooth quadratic surface per channel (handles studio gradients and
    // vignettes), fitted first to the border and then refitted to every cell that matches it.
    const smallBorder = borderIndices(sw, sh, 3);
    let support = smallBorder, surface = null;
    const paperLike = new Uint8Array(sw * sh);
    for (let round = 0; round < 3; round += 1) {
      surface = small.map((plane) => quadraticSurface(plane, sw, sh, support));
      support = [];
      for (let s = 0; s < paperLike.length; s += 1) {
        paperLike[s] = Math.hypot(small[0][s] - surface[0][s], small[1][s] - surface[1][s], small[2][s] - surface[2][s]) < threshold ? 1 : 0;
        if (paperLike[s]) support.push(s);
      }
      if (support.length < 12) { support = smallBorder; break; }
    }
    let estimate = small.map((plane, c) => plane.map((v, s) => (paperLike[s] ? v : surface[c][s])));
    for (let round = 0; round < 3; round += 1) {
      estimate = estimate.map((plane, c) => gaussianBlur(plane, sw, sh, 3).map((v, s) => (paperLike[s] ? small[c][s] : v)));
    }
    estimate = estimate.map((plane) => gaussianBlur(plane, sw, sh, 2));
    const sample = (plane, x, y) => {
      const fx = Math.min(sw - 1, Math.max(0, (x + 0.5) / factor - 0.5)), fy = Math.min(sh - 1, Math.max(0, (y + 0.5) / factor - 0.5));
      const x0 = Math.floor(fx), y0 = Math.floor(fy), x1 = Math.min(sw - 1, x0 + 1), y1 = Math.min(sh - 1, y0 + 1), tx = fx - x0, ty = fy - y0;
      return (plane[y0 * sw + x0] * (1 - tx) + plane[y0 * sw + x1] * tx) * (1 - ty) + (plane[y1 * sw + x0] * (1 - tx) + plane[y1 * sw + x1] * tx) * ty;
    };
    for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
      const i = y * width + x;
      distance[i] = Math.hypot(L[i] - sample(estimate[0], x, y), A[i] - sample(estimate[1], x, y), B[i] - sample(estimate[2], x, y));
    }
  }
  // Spread of the background sample around its own reference: high means a gradient, vignette or
  // textured backdrop that a single-reference matte cannot separate cleanly.
  const spread = percentile(border.map((i) => distance[i]), 90);
  return { distance, backgroundSpread: Number(spread.toFixed(2)) };
}

function cleanMask(mask, width, height, { close, open, holeMax }) {
  let m = close ? erode(dilate(mask, width, height, close), width, height, close) : Uint8Array.from(mask);
  if (open) m = dilate(erode(m, width, height, open), width, height, open);
  const background = new Uint8Array(m.length);
  for (let i = 0; i < m.length; i += 1) background[i] = m[i] ? 0 : 1;
  const holes = labelComponents(background, width, height), limit = holeMax * m.length;
  for (let i = 0; i < m.length; i += 1) {
    const label = holes.labels[i];
    if (label && !holes.touches[label - 1] && holes.sizes[label - 1] < limit) m[i] = 1;
  }
  return m;
}

function rgbaFromMask(image, alpha, rect) {
  const out = Buffer.alloc(rect.width * rect.height * 4);
  for (let y = 0; y < rect.height; y += 1) for (let x = 0; x < rect.width; x += 1) {
    const src = (rect.y + y) * image.width + rect.x + x, dst = (y * rect.width + x) * 4;
    out[dst] = image.data[src * 4]; out[dst + 1] = image.data[src * 4 + 1]; out[dst + 2] = image.data[src * 4 + 2];
    out[dst + 3] = Math.round(Math.min(1, Math.max(0, alpha[src])) * (image.data[src * 4 + 3] / 255) * 255);
  }
  return { width: rect.width, height: rect.height, data: out };
}

// Paper-white cut edge (dilated, rounded alpha) plus a soft drop shadow, baked into a padded RGBA.
function stickerImage(image, options = {}) {
  const longSide = Math.max(image.width, image.height);
  const edge = options.edgePx ?? Math.max(4, Math.round(0.014 * longSide));
  const [dx, dy, blur, opacity] = options.shadow ?? [7, 9, 7, 0.42], paper = options.paper ?? [244, 240, 230];
  const pad = Math.ceil(edge + blur * 3 + Math.max(Math.abs(dx), Math.abs(dy)));
  const width = image.width + pad * 2, height = image.height + pad * 2, solid = new Uint8Array(width * height);
  for (let y = 0; y < image.height; y += 1) for (let x = 0; x < image.width; x += 1) {
    if (image.data[(y * image.width + x) * 4 + 3] > 40) solid[(y + pad) * width + x + pad] = 1;
  }
  // Dilate, then round off small concavities so the edge reads as cut with scissors, not traced.
  const grown = dilate(solid, width, height, edge);
  const rounded = gaussianBlur(Float32Array.from(grown), width, height, Math.max(1, edge * 0.35));
  const edgeMask = new Uint8Array(width * height);
  for (let i = 0; i < edgeMask.length; i += 1) edgeMask[i] = rounded[i] > 0.5 ? 1 : 0;
  const edgeAlpha = gaussianBlur(Float32Array.from(edgeMask), width, height, 0.7);
  const shifted = new Float32Array(width * height);
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    const sx = x - Math.round(dx), sy = y - Math.round(dy);
    if (sx >= 0 && sy >= 0 && sx < width && sy < height) shifted[y * width + x] = edgeMask[sy * width + sx];
  }
  const shadow = gaussianBlur(shifted, width, height, blur);
  const out = Buffer.alloc(width * height * 4);
  const over = (index, r, g, b, a) => {
    const da = out[index + 3] / 255, oa = a + da * (1 - a);
    if (oa <= 0) return;
    out[index] = Math.round((r * a + out[index] * da * (1 - a)) / oa);
    out[index + 1] = Math.round((g * a + out[index + 1] * da * (1 - a)) / oa);
    out[index + 2] = Math.round((b * a + out[index + 2] * da * (1 - a)) / oa);
    out[index + 3] = Math.round(oa * 255);
  };
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    const i = y * width + x, o = i * 4;
    over(o, 20, 12, 12, Math.min(1, shadow[i] * opacity));
    over(o, paper[0], paper[1], paper[2], Math.min(1, edgeAlpha[i]));
    const ix = x - pad, iy = y - pad;
    if (ix >= 0 && iy >= 0 && ix < image.width && iy < image.height) {
      const s = (iy * image.width + ix) * 4;
      over(o, image.data[s], image.data[s + 1], image.data[s + 2], image.data[s + 3] / 255);
    }
  }
  return { width, height, data: out, edgePx: edge, padPx: pad };
}

// Ink-only layer: black with alpha = ink density against the sheet's own paper tone.
function inkImage(image, lab) {
  const n = image.width * image.height, paper = percentile(lab.L, 92), ink = percentile(lab.L, 3), out = Buffer.alloc(n * 4);
  for (let i = 0; i < n; i += 1) {
    let a = Math.min(1, Math.max(0, (paper - lab.L[i]) / Math.max(paper - ink, 1))) ** 0.9;
    if (a < 0.06) a = 0;
    out[i * 4 + 3] = Math.round(a * 255);
  }
  return { width: image.width, height: image.height, data: out, paperL: Number(paper.toFixed(2)), inkL: Number(ink.toFixed(2)) };
}

// Rectangular plate with a hand-cut (jittered polygon) edge, then the sticker edge and shadow.
function plateImage(image, params) {
  const rect = params.box
    ? { x: Math.round(params.box[0] * image.width), y: Math.round(params.box[1] * image.height), width: Math.round((params.box[2] - params.box[0]) * image.width), height: Math.round((params.box[3] - params.box[1]) * image.height) }
    : { x: 0, y: 0, width: image.width, height: image.height };
  const crop = cropImage(image, rect), { width: w, height: h } = crop, random = seededRandom(params.seed), points = [], margin = 0.012;
  const corners = [[margin * w, margin * h], [w * (1 - margin), margin * h], [w * (1 - margin), h * (1 - margin)], [margin * w, h * (1 - margin)]];
  for (let c = 0; c < 4; c += 1) {
    const [p, q] = [corners[c], corners[(c + 1) % 4]];
    for (let t = 0; t < 3; t += 1) points.push([p[0] + (q[0] - p[0]) * (t / 3) + random.normal() * params.jitter * w, p[1] + (q[1] - p[1]) * (t / 3) + random.normal() * params.jitter * h]);
  }
  const mask = fillPolygon(points.map(([x, y]) => [Math.min(w - 1, Math.max(0, x)), Math.min(h - 1, Math.max(0, y))]), w, h);
  for (let i = 0; i < mask.length; i += 1) crop.data[i * 4 + 3] = mask[i] ? crop.data[i * 4 + 3] : 0;
  return { ...stickerImage(crop, { edgePx: params.edgePx ?? 10, shadow: params.shadow, paper: params.paper }), placement: rect };
}

// Cut one source into collage pieces. Returns images plus measurements and findings that say,
// with a fix, where the matte is likely dirty (uneven backdrop, a piece running into the frame).
function cutCollage(input, options) {
  if (!Buffer.isBuffer(input)) fail(SCOPE, "input must be PNG bytes");
  pngHeaderBudget(input.subarray(0, 24), input.length, "cut input");
  const { mode, finishes, params } = cutParams(options);
  const image = decodePng(input, "cut input"), lab = labPlanes(image), n = image.width * image.height;
  const outputs = [], findings = [], pieces = [];
  let measurements = { mode, width: image.width, height: image.height };
  if (mode !== "none") {
    const { distance, backgroundSpread } = backgroundDistance(lab, mode, params.threshold);
    let mask = new Uint8Array(n);
    for (let i = 0; i < n; i += 1) mask[i] = distance[i] > params.threshold ? 1 : 0;
    const roi = params.roi ?? [0, 0, 1, 1];
    for (let y = 0; y < image.height; y += 1) for (let x = 0; x < image.width; x += 1) {
      const fx = (x + 0.5) / image.width, fy = (y + 0.5) / image.height;
      if (fx < roi[0] || fx > roi[2] || fy < roi[1] || fy > roi[3] || params.exclude.some((r) => fx >= r[0] && fx <= r[2] && fy >= r[1] && fy <= r[3])) mask[y * image.width + x] = 0;
    }
    mask = cleanMask(mask, image.width, image.height, params);
    const components = labelComponents(mask, image.width, image.height);
    const order = components.sizes.map((size, index) => ({ size, label: index + 1 })).sort((a, b) => b.size - a.size)
      .filter(({ size }) => size >= params.minFraction * n).slice(0, params.keep);
    const unevenLimit = params.threshold * 0.6;
    measurements = { ...measurements, threshold: params.threshold, backgroundSpread, foregroundFraction: Number((mask.reduce((a, b) => a + b, 0) / n).toFixed(4)), components: components.sizes.length, kept: order.length };
    if (backgroundSpread > unevenLimit) {
      findings.push({ code: "matte-uneven-background", severity: "warn", message: `background spread ${backgroundSpread} exceeds ${unevenLimit.toFixed(1)} (gradient, vignette or texture); the matte keeps backdrop or bites the object`, fix: mode === "border" ? "Rerun with --mode paper, narrow params.roi to the object, or use a plain-background photograph of the object" : "Narrow params.roi, raise params.threshold, or retouch the mask by hand before using the piece" });
    }
    if (!order.length) findings.push({ code: "matte-empty", severity: "error", message: "no foreground component met minFraction", fix: "Lower params.threshold or params.minFraction, or check that the object differs from its background" });
    const roiPx = [roi[0] * image.width, roi[1] * image.height, roi[2] * image.width, roi[3] * image.height];
    order.forEach(({ label }, k) => {
      const piece = new Float32Array(n);
      let minX = image.width, minY = image.height, maxX = -1, maxY = -1;
      for (let i = 0; i < n; i += 1) if (components.labels[i] === label) {
        piece[i] = 1;
        const x = i % image.width, y = (i - x) / image.width;
        if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y;
      }
      const alpha = gaussianBlur(piece, image.width, image.height, 1);
      const pad = 4, rect = { x: Math.max(0, minX - pad), y: Math.max(0, minY - pad) };
      rect.width = Math.min(image.width, maxX + 1 + pad) - rect.x; rect.height = Math.min(image.height, maxY + 1 + pad) - rect.y;
      const touches = minX <= roiPx[0] + 1 || minY <= roiPx[1] + 1 || maxX >= roiPx[2] - 2 || maxY >= roiPx[3] - 2;
      if (touches) findings.push({ code: "matte-touches-frame", severity: "warn", piece: k, message: `piece ${k} runs into the ${params.roi ? "roi" : "image"} edge; it probably carries backdrop, plate border or a neighbour`, fix: "Inspect the piece; narrow params.roi or add params.exclude rectangles around the frame, then cut again" });
      const cut = rgbaFromMask(image, alpha, rect);
      const id = `piece-${k}`;
      pieces.push({ piece: k, area: components.sizes[label - 1], touchesFrame: touches });
      if (finishes.includes("cut")) outputs.push({ name: `${id}.png`, finish: "cut", piece: k, image: cut, placement: rect });
      if (finishes.includes("sticker")) {
        const sticker = stickerImage(cut, { edgePx: params.edgePx ?? undefined, shadow: params.shadow, paper: params.paper });
        outputs.push({ name: `${id}-sticker.png`, finish: "sticker", piece: k, image: sticker, placement: rect, edgePx: sticker.edgePx });
      }
    });
  }
  if (pieces.length) measurements = { ...measurements, pieces };
  if (finishes.includes("ink")) {
    const ink = inkImage(image, lab);
    outputs.push({ name: "ink.png", finish: "ink", image: ink, placement: { x: 0, y: 0, width: image.width, height: image.height } });
    measurements = { ...measurements, paperL: ink.paperL, inkL: ink.inkL };
    if (ink.paperL - ink.inkL < 25) findings.push({ code: "ink-low-contrast", severity: "warn", message: `paper L ${ink.paperL} vs ink L ${ink.inkL}: the ink layer will be faint or blotchy`, fix: "Use a line print or engraving with clear paper, or skip the ink finish for this source" });
  }
  if (finishes.includes("plate")) {
    const plate = plateImage(image, params);
    outputs.push({ name: "plate.png", finish: "plate", image: plate, placement: plate.placement, edgePx: plate.edgePx });
  }
  return { input: { width: image.width, height: image.height, sha256: sha256(input) }, mode, finishes, params, measurements, findings, outputs };
}

module.exports = { CUT_FINISHES, CUT_MODES, cutCollage, inkImage, inspectRegions, keyFiles, keyedImage, plateImage, splitFile, splitSprites, stickerImage };

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

module.exports = { inspectRegions, keyFiles, keyedImage, splitFile, splitSprites };

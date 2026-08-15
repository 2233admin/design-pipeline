"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");
const { isObject, resolveInside, sha256, sortValue } = require("../../contract-utils.cjs");

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const HASH = /^[a-f0-9]{64}$/;
const COLOR_CHANNELS = new Map([[0, 1], [2, 3], [3, 1], [4, 2], [6, 4]]);
const BIT_DEPTHS = new Map([[0, [1, 2, 4, 8, 16]], [2, [8, 16]], [3, [1, 2, 4, 8]], [4, [8, 16]], [6, [8, 16]]]);
const ADAM7 = [[0, 0, 8, 8], [4, 0, 8, 8], [0, 4, 4, 8], [2, 0, 4, 4], [0, 2, 2, 4], [1, 0, 2, 2], [0, 1, 1, 2]];

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function paeth(left, above, upperLeft) {
  const estimate = left + above - upperLeft;
  const leftDistance = Math.abs(estimate - left);
  const aboveDistance = Math.abs(estimate - above);
  const upperLeftDistance = Math.abs(estimate - upperLeft);
  return leftDistance <= aboveDistance && leftDistance <= upperLeftDistance ? left : aboveDistance <= upperLeftDistance ? above : upperLeft;
}

function unfilter(row, previous, bytesPerPixel, filter) {
  const result = Buffer.alloc(row.length);
  for (let index = 0; index < row.length; index += 1) {
    const raw = row[index];
    const left = index >= bytesPerPixel ? result[index - bytesPerPixel] : 0;
    const above = previous ? previous[index] : 0;
    const upperLeft = previous && index >= bytesPerPixel ? previous[index - bytesPerPixel] : 0;
    if (filter === 0) result[index] = raw;
    else if (filter === 1) result[index] = (raw + left) & 0xff;
    else if (filter === 2) result[index] = (raw + above) & 0xff;
    else if (filter === 3) result[index] = (raw + Math.floor((left + above) / 2)) & 0xff;
    else if (filter === 4) result[index] = (raw + paeth(left, above, upperLeft)) & 0xff;
    else throw new Error(`unsupported PNG filter ${filter}`);
  }
  return result;
}

function sampleAt(row, sample, bitDepth) {
  if (bitDepth === 8) return row[sample];
  if (bitDepth === 16) return row.readUInt16BE(sample * 2);
  const bit = sample * bitDepth;
  const shift = 8 - bitDepth - (bit % 8);
  return (row[Math.floor(bit / 8)] >>> shift) & ((1 << bitDepth) - 1);
}

function passSize(size, start, step) {
  return size <= start ? 0 : Math.ceil((size - start) / step);
}

function inspectPixels(row, width, colorType, bitDepth, paletteEntries, transparency, counters) {
  const channels = COLOR_CHANNELS.get(colorType);
  const max = colorType === 3 ? 255 : bitDepth === 16 ? 65535 : (1 << bitDepth) - 1;
  for (let x = 0; x < width; x += 1) {
    const base = x * channels;
    let alpha = max;
    if (colorType === 4) alpha = sampleAt(row, base + 1, bitDepth);
    else if (colorType === 6) alpha = sampleAt(row, base + 3, bitDepth);
    else if (colorType === 3) {
      const index = sampleAt(row, base, bitDepth);
      if (index >= paletteEntries) throw new Error(`PNG palette index ${index} is out of range`);
      alpha = transparency && index < transparency.length ? transparency[index] : 255;
    } else if (colorType === 0 && transparency) {
      alpha = sampleAt(row, base, bitDepth) === transparency.readUInt16BE(0) ? 0 : max;
    } else if (colorType === 2 && transparency) {
      const transparent = [transparency.readUInt16BE(0), transparency.readUInt16BE(2), transparency.readUInt16BE(4)];
      alpha = transparent.every((value, index) => sampleAt(row, base + index, bitDepth) === value) ? 0 : max;
    }
    if (alpha === 0) counters.transparent += 1;
    else if (alpha < max) counters.partial += 1;
    else counters.opaque += 1;
  }
}

function decodePng(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 57 || !buffer.subarray(0, 8).equals(PNG_SIGNATURE)) throw new Error("PNG signature is invalid or truncated");
  let offset = 8;
  let ihdr = null;
  let paletteEntries = 0;
  let transparency = null;
  let sawIdat = false;
  let idatEnded = false;
  let sawIend = false;
  const idat = [];
  while (offset < buffer.length) {
    if (offset + 12 > buffer.length) throw new Error("PNG chunk header is truncated");
    const length = buffer.readUInt32BE(offset);
    if (length > 256 * 1024 * 1024 || offset + 12 + length > buffer.length) throw new Error("PNG chunk payload is truncated or oversized");
    const typeBuffer = buffer.subarray(offset + 4, offset + 8);
    const type = typeBuffer.toString("ascii");
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    const declaredCrc = buffer.readUInt32BE(offset + 8 + length);
    if (crc32(Buffer.concat([typeBuffer, data])) !== declaredCrc) throw new Error(`PNG ${type} chunk CRC mismatch`);
    if (!ihdr && type !== "IHDR") throw new Error("PNG IHDR must be the first chunk");
    if (sawIdat && type !== "IDAT") idatEnded = true;
    if (type === "IHDR") {
      if (ihdr || length !== 13) throw new Error("PNG IHDR is duplicated or malformed");
      ihdr = {
        width: data.readUInt32BE(0), height: data.readUInt32BE(4), bitDepth: data[8], colorType: data[9],
        compression: data[10], filter: data[11], interlace: data[12],
      };
    } else if (type === "PLTE") {
      if (sawIdat || length === 0 || length % 3 !== 0 || length > 768) throw new Error("PNG PLTE is malformed or out of order");
      paletteEntries = length / 3;
    } else if (type === "tRNS") {
      if (sawIdat) throw new Error("PNG tRNS must precede IDAT");
      transparency = Buffer.from(data);
    } else if (type === "IDAT") {
      if (idatEnded) throw new Error("PNG IDAT chunks must be consecutive");
      sawIdat = true;
      idat.push(Buffer.from(data));
    } else if (type === "IEND") {
      if (length !== 0) throw new Error("PNG IEND must be empty");
      sawIend = true;
      offset += 12 + length;
      break;
    } else if (type[0] === type[0].toUpperCase()) throw new Error(`unsupported critical PNG chunk ${type}`);
    offset += 12 + length;
  }
  if (!ihdr || !sawIdat || !sawIend || offset !== buffer.length) throw new Error("PNG is missing IHDR, IDAT, IEND, or has trailing bytes");
  if (!ihdr.width || !ihdr.height || ihdr.width * ihdr.height > 100_000_000) throw new Error("PNG dimensions are invalid or exceed the decode budget");
  const allowedDepths = BIT_DEPTHS.get(ihdr.colorType);
  if (!allowedDepths || !allowedDepths.includes(ihdr.bitDepth)) throw new Error("PNG color type and bit depth are incompatible");
  if (ihdr.compression !== 0 || ihdr.filter !== 0 || ![0, 1].includes(ihdr.interlace)) throw new Error("PNG compression, filter, or interlace method is unsupported");
  if (ihdr.colorType === 3 && (!paletteEntries || paletteEntries > (1 << ihdr.bitDepth))) throw new Error("indexed PNG requires a compatible palette");
  if (transparency) {
    if (ihdr.colorType === 0 && transparency.length !== 2) throw new Error("grayscale PNG tRNS is malformed");
    if (ihdr.colorType === 2 && transparency.length !== 6) throw new Error("truecolor PNG tRNS is malformed");
    if (ihdr.colorType === 3 && (!paletteEntries || transparency.length > paletteEntries)) throw new Error("indexed PNG tRNS is malformed");
    if ([4, 6].includes(ihdr.colorType)) throw new Error("PNG with alpha channel cannot contain tRNS");
  }
  let decoded;
  try { decoded = zlib.inflateSync(Buffer.concat(idat), { maxOutputLength: 512 * 1024 * 1024 }); }
  catch (error) { throw new Error(`PNG IDAT cannot be inflated: ${error.message}`); }
  const channels = COLOR_CHANNELS.get(ihdr.colorType);
  const bytesPerPixel = Math.max(1, Math.ceil(channels * ihdr.bitDepth / 8));
  const passes = ihdr.interlace === 0 ? [[0, 0, 1, 1]] : ADAM7;
  const counters = { transparent: 0, partial: 0, opaque: 0 };
  let decodedOffset = 0;
  let pixelCount = 0;
  for (const [startX, startY, stepX, stepY] of passes) {
    const passWidth = passSize(ihdr.width, startX, stepX);
    const passHeight = passSize(ihdr.height, startY, stepY);
    if (!passWidth || !passHeight) continue;
    const rowBytes = Math.ceil(passWidth * channels * ihdr.bitDepth / 8);
    let previous = null;
    for (let rowIndex = 0; rowIndex < passHeight; rowIndex += 1) {
      if (decodedOffset + 1 + rowBytes > decoded.length) throw new Error("PNG decoded scanlines are truncated");
      const filter = decoded[decodedOffset];
      const raw = decoded.subarray(decodedOffset + 1, decodedOffset + 1 + rowBytes);
      const row = unfilter(raw, previous, bytesPerPixel, filter);
      inspectPixels(row, passWidth, ihdr.colorType, ihdr.bitDepth, paletteEntries, transparency, counters);
      previous = row;
      decodedOffset += 1 + rowBytes;
      pixelCount += passWidth;
    }
  }
  if (decodedOffset !== decoded.length || pixelCount !== ihdr.width * ihdr.height) throw new Error("PNG decoded scanline length is invalid");
  return {
    width: ihdr.width,
    height: ihdr.height,
    bitDepth: ihdr.bitDepth,
    colorType: ihdr.colorType,
    interlaced: ihdr.interlace === 1,
    hasTransparency: counters.transparent > 0 || counters.partial > 0,
    allTransparent: counters.opaque === 0 && counters.partial === 0,
  };
}

function loadEvidenceContext(input = {}, options = {}) {
  if (!isObject(input)) return { status: "invalid", errors: [{ code: "CF_EVIDENCE_INPUT_INVALID", message: "evidence must be an object" }], screenshots: [] };
  const declarations = input.screenshots || [];
  if (!Array.isArray(declarations)) return { status: "invalid", errors: [{ code: "CF_EVIDENCE_INPUT_INVALID", message: "evidence.screenshots must be an array" }], screenshots: [] };
  const ids = new Set();
  const screenshots = [];
  const errors = [];
  for (let index = 0; index < declarations.length; index += 1) {
    const declaration = declarations[index];
    if (!isObject(declaration) || typeof declaration.id !== "string" || !declaration.id.trim() || ids.has(declaration.id)) {
      errors.push({ code: "CF_EVIDENCE_INPUT_INVALID", message: `evidence.screenshots[${index}] has an invalid or duplicate id` });
      continue;
    }
    ids.add(declaration.id);
    if (typeof declaration.sha256 !== "string" || !HASH.test(declaration.sha256)) {
      errors.push({ code: "CF_EVIDENCE_HASH_INVALID", id: declaration.id, message: "screenshot sha256 is invalid" });
      continue;
    }
    let file;
    try { file = resolveInside(options.projectRoot, declaration.path, `evidence.screenshots[${index}].path`, { scope: "component-first evidence" }); }
    catch (error) {
      errors.push({ code: "CF_EVIDENCE_PATH_INVALID", id: declaration.id, message: error.message });
      continue;
    }
    const relative = path.relative(options.projectRoot, file).split(path.sep).join("/");
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
      screenshots.push({ id: declaration.id, path: relative, status: "missing", sha256: declaration.sha256 });
      continue;
    }
    let bytes;
    try { bytes = fs.readFileSync(file); }
    catch (error) {
      errors.push({ code: "CF_EVIDENCE_PATH_INVALID", id: declaration.id, message: error.message });
      continue;
    }
    const actualSha256 = sha256(bytes);
    if (!crypto.timingSafeEqual(Buffer.from(actualSha256), Buffer.from(declaration.sha256))) {
      errors.push({ code: "CF_EVIDENCE_HASH_MISMATCH", id: declaration.id, message: "screenshot bytes do not match the declared sha256" });
      continue;
    }
    let png;
    try { png = decodePng(bytes); }
    catch (error) {
      errors.push({ code: "CF_EVIDENCE_PNG_INVALID", id: declaration.id, message: error.message });
      continue;
    }
    const minWidth = declaration.minWidth ?? options.minimumWidth ?? 64;
    const minHeight = declaration.minHeight ?? options.minimumHeight ?? 48;
    if (!Number.isInteger(minWidth) || minWidth < 1 || !Number.isInteger(minHeight) || minHeight < 1 || png.width < minWidth || png.height < minHeight) {
      errors.push({ code: "CF_EVIDENCE_PNG_DIMENSIONS_INVALID", id: declaration.id, message: `screenshot ${png.width}x${png.height} is below ${minWidth}x${minHeight}` });
      continue;
    }
    const allowTransparent = declaration.allowTransparent ?? options.allowTransparent ?? false;
    if (!allowTransparent && png.allTransparent) {
      errors.push({ code: "CF_EVIDENCE_PNG_TRANSPARENCY_INVALID", id: declaration.id, message: "screenshot is fully transparent" });
      continue;
    }
    screenshots.push(sortValue({ id: declaration.id, path: relative, status: "ready", sha256: actualSha256, png }));
  }
  return sortValue({ status: errors.length ? "invalid" : "ready", errors, screenshots });
}

module.exports = { decodePng, loadEvidenceContext };

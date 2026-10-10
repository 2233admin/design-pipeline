"use strict";

// Layer A fidelity metrics. The reconstruction and website-clone contracts have always declared
// `maxPixelDifferenceRatio` and `minSsim`, but the numbers were supplied from outside, so the
// contract asserted a measurement nobody took. This module takes it: decode both rasters to RGBA8,
// then compute the two declared metrics over the unmasked region. Element-level match
// (recall/precision/F1, position, color, text) needs a DOM-aware extractor and is a later slice;
// nothing here fabricates it.

const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");
const { fail, resolveInside, sha256 } = require("./contract-utils.cjs");

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const CHANNELS = new Map([[0, 1], [2, 3], [3, 1], [4, 2], [6, 4]]);
const MAX_PIXELS = 40_000_000;
const SSIM_WINDOW = 8;
const SSIM_C1 = (0.01 * 255) ** 2;
const SSIM_C2 = (0.03 * 255) ** 2;

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

function unfilter(row, previous, bytesPerPixel, filter) {
  const out = Buffer.from(row);
  for (let index = 0; index < out.length; index += 1) {
    const left = index >= bytesPerPixel ? out[index - bytesPerPixel] : 0;
    const up = previous ? previous[index] : 0;
    const upLeft = previous && index >= bytesPerPixel ? previous[index - bytesPerPixel] : 0;
    if (filter === 0) continue;
    if (filter === 1) out[index] = (out[index] + left) & 0xff;
    else if (filter === 2) out[index] = (out[index] + up) & 0xff;
    else if (filter === 3) out[index] = (out[index] + ((left + up) >> 1)) & 0xff;
    else if (filter === 4) out[index] = (out[index] + paeth(left, up, upLeft)) & 0xff;
    else fail("fidelity-metrics", `unsupported PNG row filter ${filter}`);
  }
  return out;
}

// Strictness matches the repository's existing PNG evidence loader: every chunk's CRC is checked,
// IHDR must come first, IEND must terminate, and trailing bytes are rejected. A weaker decoder
// here would make the Layer A gate softer than the conformance evidence gate it feeds.
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buffer) {
  let remainder = 0xffffffff;
  for (const byte of buffer) remainder = CRC_TABLE[(remainder ^ byte) & 0xff] ^ (remainder >>> 8);
  return (remainder ^ 0xffffffff) >>> 0;
}

// Deliberately narrow: non-interlaced 8-bit PNG, which is what every EvidencePort screenshot
// adapter in this repository writes. An unsupported raster is a stated refusal, never a guess.
function decodeRgba(buffer, label) {
  if (buffer.length < 8 || !buffer.subarray(0, 8).equals(PNG_SIGNATURE)) fail("fidelity-metrics", `${label} is not a PNG`);
  let offset = 8;
  let header = null;
  let palette = null;
  let ended = false;
  let idatEnded = false;
  const idat = [];
  while (offset + 8 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const typeBuffer = buffer.subarray(offset + 4, offset + 8);
    const type = typeBuffer.toString("latin1");
    if (offset + 12 + length > buffer.length) fail("fidelity-metrics", `${label} has a truncated ${type} chunk`);
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    if (crc32(Buffer.concat([typeBuffer, data])) !== buffer.readUInt32BE(offset + 8 + length)) {
      fail("fidelity-metrics", `${label} ${type} chunk CRC does not match its bytes`, { code: "FIDELITY_RASTER_CORRUPT" });
    }
    if (ended) fail("fidelity-metrics", `${label} has a chunk after IEND`, { code: "FIDELITY_RASTER_CORRUPT" });
    if (!header && type !== "IHDR") fail("fidelity-metrics", `${label} must open with IHDR`, { code: "FIDELITY_RASTER_CORRUPT" });
    if (type === "IHDR") {
      if (header || length !== 13) fail("fidelity-metrics", `${label} has a duplicated or malformed IHDR`, { code: "FIDELITY_RASTER_CORRUPT" });
      header = {
        width: data.readUInt32BE(0), height: data.readUInt32BE(4),
        bitDepth: data[8], colorType: data[9],
        compression: data[10], filterMethod: data[11], interlace: data[12],
      };
      // Half-supporting transparency would silently change every diff and SSIM value, so an
      // indexed raster or any color-key transparency is refused rather than approximated.
    } else if (type === "PLTE") palette = Buffer.from(data);
    else if (type === "tRNS") fail("fidelity-metrics", `${label} carries tRNS transparency, which this adapter does not interpret`, { code: "FIDELITY_RASTER_UNSUPPORTED" });
    else if (type === "IDAT") {
      if (idatEnded) fail("fidelity-metrics", `${label} has non-consecutive IDAT chunks`, { code: "FIDELITY_RASTER_CORRUPT" });
      idat.push(Buffer.from(data));
    } else if (type === "IEND") ended = true;
    if (idat.length && type !== "IDAT") idatEnded = true;
    offset += 12 + length;
  }
  if (!ended) fail("fidelity-metrics", `${label} is missing IEND`, { code: "FIDELITY_RASTER_CORRUPT" });
  if (offset !== buffer.length) fail("fidelity-metrics", `${label} has trailing bytes after IEND`, { code: "FIDELITY_RASTER_CORRUPT" });
  if (!header || !idat.length) fail("fidelity-metrics", `${label} is missing IHDR or IDAT`);
  if (header.compression !== 0) fail("fidelity-metrics", `${label} declares compression method ${header.compression}; only 0 is defined`, { code: "FIDELITY_RASTER_CORRUPT" });
  if (header.filterMethod !== 0) fail("fidelity-metrics", `${label} declares filter method ${header.filterMethod}; only 0 is defined`, { code: "FIDELITY_RASTER_CORRUPT" });
  if (header.colorType === 3) fail("fidelity-metrics", `${label} is an indexed PNG, which this adapter does not measure`, { code: "FIDELITY_RASTER_UNSUPPORTED" });
  if (header.bitDepth !== 8) fail("fidelity-metrics", `${label} bit depth ${header.bitDepth} is unsupported; use 8-bit`);
  if (header.interlace !== 0) fail("fidelity-metrics", `${label} is interlaced, which is unsupported`);
  const channels = CHANNELS.get(header.colorType);
  if (!channels) fail("fidelity-metrics", `${label} color type ${header.colorType} is unsupported`);
  if (header.colorType === 3 && !palette) fail("fidelity-metrics", `${label} is indexed without a palette`);
  const pixels = header.width * header.height;
  if (!pixels || pixels > MAX_PIXELS) fail("fidelity-metrics", `${label} dimensions are invalid or exceed the decode budget`);

  let decoded;
  try { decoded = zlib.inflateSync(Buffer.concat(idat), { maxOutputLength: 512 * 1024 * 1024 }); }
  catch (error) { fail("fidelity-metrics", `${label} IDAT cannot be inflated: ${error.message}`); }

  const rowBytes = header.width * channels;
  if (decoded.length !== (rowBytes + 1) * header.height) fail("fidelity-metrics", `${label} decoded scanlines are truncated`);
  const rgba = Buffer.alloc(pixels * 4);
  let previous = null;
  for (let y = 0; y < header.height; y += 1) {
    const start = y * (rowBytes + 1);
    const row = unfilter(decoded.subarray(start + 1, start + 1 + rowBytes), previous, channels, decoded[start]);
    for (let x = 0; x < header.width; x += 1) {
      const source = x * channels;
      const target = (y * header.width + x) * 4;
      if (header.colorType === 0 || header.colorType === 4) {
        rgba.fill(row[source], target, target + 3);
        rgba[target + 3] = header.colorType === 4 ? row[source + 1] : 255;
      }
      else if (header.colorType === 3) {
        const entry = row[source] * 3;
        if (entry + 2 >= palette.length) fail("fidelity-metrics", `${label} palette index is out of range`);
        rgba[target] = palette[entry]; rgba[target + 1] = palette[entry + 1]; rgba[target + 2] = palette[entry + 2]; rgba[target + 3] = 255;
      } else {
        rgba[target] = row[source]; rgba[target + 1] = row[source + 1]; rgba[target + 2] = row[source + 2];
        rgba[target + 3] = header.colorType === 6 ? row[source + 3] : 255;
      }
    }
    previous = row;
  }
  return { width: header.width, height: header.height, rgba };
}

function luma(rgba, index) {
  return 0.2126 * rgba[index] + 0.7152 * rgba[index + 1] + 0.0722 * rgba[index + 2];
}

function pixelDifferenceRatio(reference, implementation, grid, tolerance) {
  let compared = 0;
  let different = 0;
  for (let pixel = 0; pixel < reference.width * reference.height; pixel += 1) {
    if (grid && grid[pixel]) continue;
    compared += 1;
    const index = pixel * 4;
    for (let channel = 0; channel < 4; channel += 1) {
      if (Math.abs(reference.rgba[index + channel] - implementation.rgba[index + channel]) > tolerance) { different += 1; break; }
    }
  }
  return { compared, different, ratio: compared ? different / compared : 0 };
}

// Windowed SSIM on luma. A window overlapping any intentional mask is skipped whole rather than
// partially sampled, so a masked region cannot quietly raise or lower the score.
function structuralSimilarity(reference, implementation, grid) {
  const { width, height } = reference;
  let total = 0;
  let windows = 0;
  for (let top = 0; top < height; top += SSIM_WINDOW) {
    for (let left = 0; left < width; left += SSIM_WINDOW) {
      const bottom = Math.min(top + SSIM_WINDOW, height);
      const right = Math.min(left + SSIM_WINDOW, width);
      let count = 0;
      let sumA = 0; let sumB = 0; let sumAA = 0; let sumBB = 0; let sumAB = 0;
      let masked = false;
      for (let y = top; y < bottom && !masked; y += 1) {
        for (let x = left; x < right; x += 1) {
          const pixel = y * width + x;
          if (grid && grid[pixel]) { masked = true; break; }
          const a = luma(reference.rgba, pixel * 4);
          const b = luma(implementation.rgba, pixel * 4);
          count += 1; sumA += a; sumB += b; sumAA += a * a; sumBB += b * b; sumAB += a * b;
        }
      }
      if (masked || count < 2) continue;
      const meanA = sumA / count;
      const meanB = sumB / count;
      const varA = sumAA / count - meanA * meanA;
      const varB = sumBB / count - meanB * meanB;
      const covariance = sumAB / count - meanA * meanB;
      total += ((2 * meanA * meanB + SSIM_C1) * (2 * covariance + SSIM_C2))
        / ((meanA * meanA + meanB * meanB + SSIM_C1) * (varA + varB + SSIM_C2));
      windows += 1;
    }
  }
  return windows ? Math.max(0, Math.min(1, total / windows)) : null;
}

// Renders are read through the repository's containment helper, never by raw path. An absolute
// path, a `..` escape, or a symlink/junction that leaves the project root is refused before any
// byte is read, and the receipt records the normalized relative path that was actually measured.
function readRaster(projectRoot, raw, label) {
  const file = resolveInside(projectRoot, raw, label, { scope: "fidelity-metrics" });
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) fail("fidelity-metrics", `${label} is not an existing file`, { code: "FIDELITY_RENDER_MISSING" });
  let bytes;
  try { bytes = fs.readFileSync(file); }
  catch (error) { fail("fidelity-metrics", `${label} cannot be read: ${error.message}`); }
  const relative = path.relative(path.resolve(projectRoot), file).split(path.sep).join("/");
  // The reconstruction evidence contract asserts bare 64-hex render hashes, not a prefixed digest.
  return { path: relative, digest: sha256(bytes), raster: decodeRgba(bytes, label) };
}

// The authoritative Layer A receipt already exists: `design-pipeline.reconstruction-evidence.v1`,
// validated by `validateEvidenceReceipt` in reconstruction-fidelity-contract.cjs:191-250, with
// bare 64-hex render hashes, a viewport that must match the locked render, and metrics that must
// equal `finalComparison.metrics`. This adapter produces exactly that receipt so the existing gate
// binds and freshness-checks it. No parallel receipt chain is invented for Layer A; arm briefs and
// judgment receipts belong to Layer C.
const MASK_MODE_NOTE = "intentionalMasks in the reconstruction contract are raster paths, not rectangles";

function measureFidelity(input = {}) {
  const { projectRoot, referencePath, implementationPath, diffPath, mode = "exact-reconstruction", perChannelTolerance = 0, scenarioId, dimension } = input;
  // The dimension is required and must be exactly reference-fidelity. A missing or unrelated
  // dimension previously serialized as reference-fidelity anyway, which forged an A receipt.
  if (dimension !== "reference-fidelity") {
    fail("fidelity-metrics", `fidelity metrics apply only to a reference-fidelity scenario, not ${dimension === undefined ? "an unstated dimension" : dimension}`, { code: "FIDELITY_DIMENSION_REFUSED" });
  }
  if (typeof projectRoot !== "string" || !projectRoot) fail("fidelity-metrics", "projectRoot is required");
  if (!Number.isInteger(perChannelTolerance) || perChannelTolerance < 0 || perChannelTolerance > 255) fail("fidelity-metrics", "perChannelTolerance must be an integer 0..255");
  // Exact reconstruction is the only mode this slice measures, and the contract already forbids
  // masks there (reconstruction-fidelity-contract.cjs:73-75). A masked mode needs mask rasters
  // decoded and intersected, which is a separate, explicitly designed slice - not a silent
  // reinterpretation of a path list as rectangles.
  if (mode !== "exact-reconstruction") {
    fail("fidelity-metrics", `mode ${mode} is not measured yet; ${MASK_MODE_NOTE}`, { code: "FIDELITY_MODE_UNSUPPORTED" });
  }
  if (Object.hasOwn(input, "intentionalMasks") && (!Array.isArray(input.intentionalMasks) || input.intentionalMasks.length)) {
    fail("fidelity-metrics", `exact reconstruction forbids intentional masks; ${MASK_MODE_NOTE}`, { code: "FIDELITY_MASKS_FORBIDDEN" });
  }

  const reference = readRaster(projectRoot, referencePath, "reference render");
  const implementation = readRaster(projectRoot, implementationPath, "implementation render");
  const diff = readRaster(projectRoot, diffPath, "diff artifact");
  if (reference.raster.width !== implementation.raster.width || reference.raster.height !== implementation.raster.height) {
    fail("fidelity-metrics", `render dimensions differ: reference ${reference.raster.width}x${reference.raster.height}, implementation ${implementation.raster.width}x${implementation.raster.height}`, { code: "FIDELITY_DIMENSION_MISMATCH" });
  }

  const difference = pixelDifferenceRatio(reference.raster, implementation.raster, null, perChannelTolerance);
  const ssim = structuralSimilarity(reference.raster, implementation.raster, null);
  if (ssim === null) fail("fidelity-metrics", "the renders are too small to measure structural similarity", { code: "FIDELITY_NOT_MEASURABLE" });

  return {
    // Strictly the contract's six keys, so `validateEvidenceReceipt` accepts it unchanged.
    receipt: {
      schema: "design-pipeline.reconstruction-evidence.v1",
      referenceSha256: reference.digest,
      implementationSha256: implementation.digest,
      diffSha256: diff.digest,
      viewport: { width: reference.raster.width, height: reference.raster.height },
      metrics: { pixelDifferenceRatio: difference.ratio, ssim },
    },
    // Adapter provenance travels beside the receipt, never inside it.
    measurement: {
      scenarioId: typeof scenarioId === "string" && scenarioId ? scenarioId : null,
      dimension: "reference-fidelity",
      mode,
      referencePath: reference.path,
      implementationPath: implementation.path,
      diffPath: diff.path,
      perChannelTolerance,
      comparedPixels: difference.compared,
      differentPixels: difference.different,
      // Element-level match is not measured by this adapter. It is absent, never defaulted.
      unmeasured: ["blockRecall", "blockPrecision", "blockF1", "extraElementRate", "positionMatch", "colorMatch", "textMatch"],
    },
  };
}

function evaluateFidelityThresholds(receipt, thresholds = {}) {
  const { maxPixelDifferenceRatio, minSsim } = thresholds;
  if (typeof maxPixelDifferenceRatio !== "number" || typeof minSsim !== "number") fail("fidelity-metrics", "thresholds require maxPixelDifferenceRatio and minSsim");
  const { pixelDifferenceRatio: ratio, ssim } = receipt.metrics;
  const reasons = [];
  if (ratio > maxPixelDifferenceRatio) reasons.push(`pixel difference ${ratio} > ${maxPixelDifferenceRatio}`);
  if (ssim < minSsim) reasons.push(`ssim ${ssim} < ${minSsim}`);
  return { status: reasons.length ? "fidelity-limited" : "ready", reasons };
}

module.exports = { decodeRgba, evaluateFidelityThresholds, measureFidelity };

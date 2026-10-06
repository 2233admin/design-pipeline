"use strict";

// Pixel diagnostics, shared by still-image comparison and existing video observation reports.
// Method reference: huashu-art-motion analyze/breakdown.py and engine/compare.py;
// this implementation uses the pipeline's PNG codec and source containment.
const fs = require("node:fs");
const path = require("node:path");
const { decodePng, encodePng } = require("../../scripts/png-core.cjs");
const { fail, pngDimensions, resolveInside, sha256 } = require("../../scripts/contract-utils.cjs");
const scope = "visual diagnostics";

function validateImage(image) {
  if (!image || !Number.isInteger(image.width) || !Number.isInteger(image.height) || image.width < 1 || image.height < 1 || image.width * image.height > 64e6 || !Buffer.isBuffer(image.data) || image.data.length !== image.width * image.height * 4) fail(scope, "expected bounded RGBA image data");
}

function sampleImage(image, { maxWidth = 320, maxHeight = 180 } = {}) {
  validateImage(image);
  if (![maxWidth, maxHeight].every((n) => Number.isInteger(n) && n >= 1 && n <= 2048)) fail(scope, "sample bounds must be integers in 1..2048");
  const scale = Math.min(1, maxWidth / image.width, maxHeight / image.height);
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const data = Buffer.alloc(width * height * 4);
  // ponytail: integer box averages are diagnostic thumbnails, not a resampling filter for final art.
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    const x0 = Math.floor(x * image.width / width), x1 = Math.floor((x + 1) * image.width / width);
    const y0 = Math.floor(y * image.height / height), y1 = Math.floor((y + 1) * image.height / height);
    const sum = [0, 0, 0];
    for (let sy = y0; sy < y1; sy += 1) for (let sx = x0; sx < x1; sx += 1) {
      const j = (sy * image.width + sx) * 4, a = image.data[j + 3] / 255;
      for (let c = 0; c < 3; c += 1) sum[c] += image.data[j + c] * a + 255 * (1 - a);
    }
    const i = (y * width + x) * 4, count = (x1 - x0) * (y1 - y0);
    for (let c = 0; c < 3; c += 1) data[i + c] = Math.round(sum[c] / count);
    data[i + 3] = 255;
  }
  return { width, height, data };
}

function motionMap(images) {
  if (!Array.isArray(images) || images.length < 2 || images.length > 400) fail(scope, "a map needs 2..400 sampled images");
  images.forEach(validateImage);
  const { width, height } = images[0], size = width * height;
  if (images.some((image) => image.width !== width || image.height !== height)) fail(scope, "map images must have equal dimensions");
  if (size * images.length > 64e6) fail(scope, "map exceeds the 64 million sampled-pixel work budget");
  const maxima = new Uint8Array(size);
  for (let k = 1; k < images.length; k += 1) {
    const a = images[k - 1].data, b = images[k].data;
    for (let p = 0; p < size; p += 1) {
      const i = p * 4, aa = a[i + 3] / 255, ba = b[i + 3] / 255;
      let delta = Math.abs(a[i + 3] - b[i + 3]);
      for (let c = 0; c < 3; c += 1) delta = Math.max(delta, Math.abs(a[i + c] * aa - b[i + c] * ba));
      maxima[p] = Math.max(maxima[p], Math.round(delta));
    }
  }
  let changedPixels = 0, peakDifference = 0, total = 0;
  const data = Buffer.alloc(size * 4);
  for (let p = 0; p < size; p += 1) {
    const d = maxima[p];
    if (d) changedPixels += 1;
    peakDifference = Math.max(peakDifference, d); total += d;
    data[p * 4] = Math.min(255, d * 3);
    data[p * 4 + 1] = Math.max(0, Math.round((d - 85) * 1.5));
    data[p * 4 + 3] = 255;
  }
  return { image: { width, height, data }, pairCount: images.length - 1, changedPixels, peakDifference, meanDifference: total / size };
}

function compareComposition(rootInput, { image, source, output }) {
  const root = fs.realpathSync(rootInput);
  const locate = (raw, label, mustExist) => resolveInside(root, raw, label, { scope, mustExist });
  const candidatePath = locate(image, "image", true), sourcePath = locate(source, "source", true);
  const outputPath = locate(output, "output", false);
  if (fs.existsSync(outputPath)) fail(scope, "output already exists; choose a new comparison directory");
  const read = (file) => {
    if (!fs.statSync(file).isFile() || fs.statSync(file).size > 128e6) fail(scope, "input must be a PNG file no larger than 128 MB");
    const bytes = fs.readFileSync(file), dimensions = pngDimensions(bytes);
    if (!dimensions || dimensions.width * dimensions.height > 16e6) fail(scope, "comparison inputs must be PNGs no larger than 16 megapixels");
    return { bytes, decoded: decodePng(bytes) };
  };
  const candidate = read(candidatePath), reference = read(sourcePath);
  const { width, height } = reference.decoded;
  if (candidate.decoded.width !== width || candidate.decoded.height !== height) fail(scope, "comparison requires equal dimensions; explicitly align/crop inputs first");
  const delta = motionMap([reference.decoded, candidate.decoded]);
  const paired = { width: width * 2, height, data: Buffer.alloc(width * height * 8) };
  for (let y = 0; y < height; y += 1) {
    reference.decoded.data.copy(paired.data, y * width * 8, y * width * 4, (y + 1) * width * 4);
    candidate.decoded.data.copy(paired.data, y * width * 8 + width * 4, y * width * 4, (y + 1) * width * 4);
  }
  const relative = (file) => path.relative(root, file).split(path.sep).join("/");
  const report = {
    status: "compared", source: { path: relative(sourcePath), sha256: sha256(reference.bytes) },
    image: { path: relative(candidatePath), sha256: sha256(candidate.bytes) }, width, height,
    metrics: { changedPixels: delta.changedPixels, changedFraction: delta.changedPixels / (width * height), peakDifference: delta.peakDifference, meanDifference: delta.meanDifference },
    limitations: ["Exact pixel alignment is required; no registration, resizing or color-profile conversion is performed.", "Difference is maximum channel change in premultiplied RGBA (0..255); invisible RGB is ignored, alpha changes remain visible.", "Difference includes rasterization and compression artifacts; it measures neither similarity of intent nor aesthetic quality."],
    creativeAcceptance: "not-assessed",
  };
  const artifacts = { "side-by-side.png": encodePng(paired), "difference.png": encodePng(delta.image) };
  report.artifacts = Object.entries(artifacts).map(([name, bytes]) => ({ path: relative(path.join(outputPath, name)), sha256: sha256(bytes) }));
  // No receipt or gate: the source and output hashes describe this one immutable diagnostic run.
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.mkdirSync(outputPath);
  for (const [name, bytes] of Object.entries(artifacts)) fs.writeFileSync(path.join(outputPath, name), bytes, { flag: "wx" });
  fs.writeFileSync(path.join(outputPath, "report.json"), `${JSON.stringify(report, null, 2)}\n`, { flag: "wx" });
  fs.writeFileSync(path.join(outputPath, "index.html"), `<!doctype html><html lang="en"><meta charset="utf-8"><title>Composition comparison</title><style>body{margin:24px;font:16px/1.5 system-ui;color:#eee;background:#202329}img{display:block;max-width:100%;height:auto;background:repeating-conic-gradient(#ddd 0 25%,#fff 0 50%) 0/20px 20px}p{max-width:75ch}a{color:#9cf}</style><h1>Reference (left) / candidate (right)</h1><p>Same-size original pixels, no alignment or resizing. Open the image for full-resolution inspection.</p><a href="side-by-side.png"><img alt="Reference at left and candidate at right" src="side-by-side.png"></a><h2>Pixel changes</h2><p>Black: unchanged. Red to yellow: greater maximum channel difference, including alpha. This is a diagnostic, not a quality score.</p><a href="difference.png"><img alt="Map of pixel changes" src="difference.png"></a><p><a href="report.json">Source hashes, metrics and limits</a></p></html>`, { flag: "wx" });
  return { ...report, report: relative(path.join(outputPath, "report.json")), viewerPath: relative(path.join(outputPath, "index.html")) };
}

module.exports = { sampleImage, motionMap, compareComposition };

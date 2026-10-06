"use strict";
const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { sampleImage, motionMap, compareComposition } = require("../skill/tools/visual-diagnostics/diagnostics.cjs");
const { encodePng, decodePng } = require("../skill/scripts/png-core.cjs");
const { sha256 } = require("../skill/scripts/contract-utils.cjs");

const solid = (width, height, rgba = [255, 255, 255, 255]) => ({ width, height, data: Buffer.from(Array(width * height).fill(rgba).flat()) });

test("spatial map locates changes, ignores invisible RGB and retains alpha changes", () => {
  const a = solid(4, 2), b = solid(4, 2), c = solid(4, 2);
  b.data.set([0, 0, 0, 255], 4); c.data.set([0, 0, 0, 255], 20);
  const map = motionMap([a, b, c]);
  assert.equal(map.pairCount, 2); assert.equal(map.changedPixels, 2); assert.equal(map.peakDifference, 255);
  assert.equal(map.meanDifference, 255 / 4);
  assert.deepEqual([...map.image.data.subarray(0, 4)], [0, 0, 0, 255]);
  assert.deepEqual([...map.image.data.subarray(4, 8)], [255, 255, 0, 255]);
  assert.equal(motionMap([solid(1, 1, [40, 70, 10, 0]), solid(1, 1, [250, 0, 0, 0])]).changedPixels, 0);
  assert.equal(motionMap([solid(1, 1, [255, 255, 255, 0]), solid(1, 1)]).changedPixels, 1);
  assert.throws(() => motionMap([a]), /2\.\.400/);
  assert.throws(() => motionMap([a, solid(2, 2)]), /equal dimensions/);
});

test("sampling respects aspect and work bounds and averages over white", () => {
  const source = solid(4, 2, [0, 0, 0, 0]); source.data.set([0, 0, 0, 255], 0);
  const image = sampleImage(source, { maxWidth: 2, maxHeight: 2 });
  assert.equal(image.width, 2); assert.equal(image.height, 1);
  assert.deepEqual([...image.data], [191, 191, 191, 255, 255, 255, 255, 255]);
  assert.deepEqual(sampleImage(solid(1, 2)), solid(1, 2));
  assert.throws(() => sampleImage(source, { maxWidth: Infinity }), /bounds/);
  assert.throws(() => sampleImage({ width: 2, height: 2, data: Buffer.alloc(3) }), /RGBA/);
});

test("comparison CLI preserves original scale, binds hashes and refuses unsafe or existing output", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "visual-comparison-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const source = solid(4, 2), candidate = solid(4, 2, [0, 80, 190, 255]);
  fs.writeFileSync(path.join(root, "ref.png"), encodePng(source));
  fs.writeFileSync(path.join(root, "candidate.png"), encodePng(candidate));
  const run = spawnSync(process.execPath, [path.join(__dirname, "../skill/scripts/designer-pipeline.cjs"), "composition", "compare", "--root", root, "--source", "ref.png", "--image", "candidate.png", "--output", "comparison"], { encoding: "utf8", windowsHide: true });
  assert.equal(run.status, 0, run.stderr || run.stdout);
  const report = JSON.parse(fs.readFileSync(path.join(root, "comparison/report.json")));
  assert.equal(report.status, "compared"); assert.equal(report.creativeAcceptance, "not-assessed");
  assert.equal(report.source.sha256, sha256(fs.readFileSync(path.join(root, "ref.png"))));
  assert.equal(report.metrics.changedPixels, 8);
  for (const item of report.artifacts) assert.equal(sha256(fs.readFileSync(path.join(root, item.path))), item.sha256);
  const paired = decodePng(fs.readFileSync(path.join(root, "comparison/side-by-side.png")));
  assert.equal(paired.width, 8); assert.equal(paired.height, 2);
  assert.deepEqual(paired.data.subarray(0, 16), source.data.subarray(0, 16));
  assert.deepEqual(paired.data.subarray(16, 32), candidate.data.subarray(0, 16));
  const options = { source: "ref.png", image: "candidate.png", output: "comparison" };
  assert.throws(() => compareComposition(root, options), /already exists/);
  assert.throws(() => compareComposition(root, { ...options, output: "../outside" }), /inside/);
  assert.throws(() => compareComposition(root, { ...options, image: "../outside.png", output: "new" }), /inside/);
  fs.writeFileSync(path.join(root, "small.png"), encodePng(solid(2, 2)));
  assert.throws(() => compareComposition(root, { ...options, image: "small.png", output: "mismatch" }), /equal dimensions/);
  assert.equal(fs.existsSync(path.join(root, "mismatch")), false);
  assert.equal(fs.existsSync(path.join(root, "new")), false);
});

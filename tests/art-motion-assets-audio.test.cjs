"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { after, test } = require("node:test");
const { decodePng, encodePng } = require("../skill/scripts/png-core.cjs");
const { inspectRegions, keyFiles, keyedImage, splitFile, splitSprites } = require("../skill/tools/art-motion/assets.cjs");
const { alignCuesToGrid, encodeWav24, renderCues, writeCueWav } = require("../skill/tools/art-motion/audio.cjs");

const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "art-motion-assets-audio-"));
after(() => fs.rmSync(temporary, { recursive: true, force: true }));

function rgba(width, height, fill = [0, 0, 0, 0]) {
  const data = Buffer.alloc(width * height * 4);
  for (let i = 0; i < data.length; i += 4) data.set(fill, i);
  return { width, height, data };
}

function pngHeader(width, height) {
  const header = Buffer.alloc(24);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(header);
  header.writeUInt32BE(13, 8); header.write("IHDR", 12); header.writeUInt32BE(width, 16); header.writeUInt32BE(height, 20);
  return header;
}

test("keying crops to visible bounds, preserves placement and despills edges", () => {
  const sheet = rgba(8, 6, [0, 255, 0, 255]);
  for (let y = 2; y < 4; y += 1) for (let x = 3; x < 6; x += 1) sheet.data.set([240, 28, 20, 255], (y * 8 + x) * 4);
  sheet.data.set([50, 240, 40, 255], (2 * 8 + 2) * 4);
  const keyed = keyedImage(encodePng(sheet), { mode: "chroma", keyColor: [0, 255, 0], soft: 20, hard: 150, despill: 0.5, padding: 0 });
  assert.deepEqual(keyed.placement, { x: 2, y: 2, width: 4, height: 2, canvasWidth: 8, canvasHeight: 6 });
  const edge = (0 * keyed.image.width + 0) * 4;
  assert.ok(keyed.image.data[edge + 3] > 0 && keyed.image.data[edge + 3] < 255);
  assert.ok(keyed.image.data[edge + 1] < 240, "dominant green is reduced on partially transparent edge");
  assert.equal(keyed.image.data[(1 * keyed.image.width + 1) * 4 + 3], 255);
});

test("white-matte removes white while retaining colored strokes", () => {
  const image = rgba(5, 5, [255, 255, 255, 255]);
  for (let y = 1; y < 4; y += 1) image.data.set([20, 40, 60, 255], (y * 5 + 2) * 4);
  const result = keyedImage(encodePng(image), { mode: "white-matte", soft: 0, hard: 80, padding: 0 });
  assert.deepEqual(result.placement, { x: 2, y: 1, width: 1, height: 3, canvasWidth: 5, canvasHeight: 5 });
  assert.equal(result.image.data[3], 255);
});

test("sprite split records source-canvas coordinates and writes only into a new output directory", () => {
  const sheet = rgba(12, 6);
  for (let y = 1; y < 4; y += 1) for (const x of [1, 2, 8, 9]) sheet.data.set([80, 120, 200, 255], (y * 12 + x) * 4);
  const png = encodePng(sheet);
  const split = splitSprites(png, { axis: "x", minGapPx: 2, alphaThreshold: 8, minSpanPx: 1, minAreaPx: 1, paddingPx: 0, maxSprites: 10 });
  assert.equal(split.frames.length, 2);
  assert.deepEqual(split.frames.map(({ x, y, width, height }) => ({ x, y, width, height })), [
    { x: 1, y: 1, width: 2, height: 3 }, { x: 8, y: 1, width: 2, height: 3 },
  ]);
  const root = path.join(temporary, "sprites"); fs.mkdirSync(root);
  fs.writeFileSync(path.join(root, "sheet.png"), png);
  const result = splitFile(root, "sheet.png", "poses", { axis: "x", minGapPx: 2, alphaThreshold: 8, paddingPx: 0 });
  const meta = JSON.parse(fs.readFileSync(path.join(root, result.directory, "sprites.json"), "utf8"));
  assert.deepEqual(meta.frames.map((frame) => frame.x), [1, 8]);
  assert.deepEqual(decodePng(fs.readFileSync(path.join(root, "poses", "frame-0000.png"))).width, 2);
  assert.throws(() => splitFile(root, "sheet.png", "poses", { axis: "x", minGapPx: 2, alphaThreshold: 8 }), /already exists/);
  assert.throws(() => splitFile(root, "../sheet.png", "other", { axis: "x", minGapPx: 2, alphaThreshold: 8 }), /contained relative/);
});

test("keyed files produce origin metadata without overwriting a prior directory", () => {
  const root = path.join(temporary, "key-files"); fs.mkdirSync(root);
  const image = rgba(4, 4, [0, 255, 0, 255]);
  for (let y = 1; y < 3; y += 1) for (let x = 1; x < 3; x += 1) image.data.set([240, 0, 0, 255], (y * 4 + x) * 4);
  fs.writeFileSync(path.join(root, "actor.png"), encodePng(image));
  const result = keyFiles(root, ["actor.png"], "prepared", { mode: "chroma", keyColor: [0, 255, 0], soft: 10, hard: 100, padding: 0 });
  assert.equal(result.metadata.frames[0].x, 1);
  assert.equal(result.metadata.frames[0].canvasWidth, 4);
  assert.throws(() => keyFiles(root, ["actor.png"], "prepared", { mode: "chroma", keyColor: [0, 255, 0], soft: 10, hard: 100 }), /already exists/);
});

test("PNG input budgets reject oversized dimensions and aggregate batches before decoding", () => {
  assert.throws(() => keyedImage(pngHeader(5000, 5000), { mode: "white-matte", soft: 0, hard: 80 }), /pixel per-image limit/);
  const root = path.join(temporary, "pixel-budget"); fs.mkdirSync(root);
  fs.writeFileSync(path.join(root, "first.png"), pngHeader(4300, 2000));
  fs.writeFileSync(path.join(root, "second.png"), pngHeader(4300, 2000));
  assert.throws(() => keyFiles(root, ["first.png", "second.png"], "out", { mode: "white-matte", soft: 0, hard: 80 }), /aggregate image limit/);
  assert.equal(fs.existsSync(path.join(root, "out")), false, "budget checks run before creating outputs");
  const huge = path.join(root, "huge.png"), fd = fs.openSync(huge, "w");
  try { fs.ftruncateSync(fd, 128 * 1024 * 1024 + 1); } finally { fs.closeSync(fd); }
  assert.throws(() => keyFiles(root, ["huge.png"], "huge-out", { mode: "white-matte", soft: 0, hard: 80 }), /128 MiB/);
});

test("asset output failure removes only files and leaf directory created by that call", () => {
  const root = path.join(temporary, "rollback"); fs.mkdirSync(root);
  const image = rgba(4, 4, [0, 255, 0, 255]);
  for (let y = 1; y < 3; y += 1) for (let x = 1; x < 3; x += 1) image.data.set([240, 0, 0, 255], (y * 4 + x) * 4);
  fs.writeFileSync(path.join(root, "actor.png"), encodePng(image));
  const originalOpen = fs.openSync; let calls = 0;
  fs.openSync = function (file, flags, ...args) {
    if (String(file).includes(`${path.sep}partial${path.sep}`) && flags === "wx" && ++calls === 2) throw new Error("simulated output failure");
    return originalOpen.call(this, file, flags, ...args);
  };
  try {
    assert.throws(() => keyFiles(root, ["actor.png"], "partial", { mode: "chroma", keyColor: [0, 255, 0], soft: 10, hard: 100 }), /simulated output failure/);
  } finally { fs.openSync = originalOpen; }
  assert.equal(fs.existsSync(path.join(root, "partial")), false);
  assert.equal(fs.existsSync(path.join(root, "actor.png")), true, "the source remains untouched");
});

test("region diagnostic reports sampled-frame hashes and applies only the explicit pale-region policy", () => {
  const root = path.join(temporary, "regions"); fs.mkdirSync(root);
  const clean = rgba(10, 10, [250, 250, 250, 255]);
  const marked = rgba(10, 10, [250, 250, 250, 255]);
  for (const [x, y] of [[4, 8], [5, 8], [6, 8]]) marked.data.set([10, 10, 10, 255], (y * 10 + x) * 4);
  fs.writeFileSync(path.join(root, "clean.png"), encodePng(clean)); fs.writeFileSync(path.join(root, "marked.png"), encodePng(marked));
  const report = inspectRegions(root, [
    { id: "f-1", path: "clean.png", atSec: 1.2 }, { id: "f-2", path: "marked.png", atSec: 1.4 },
  ], { region: { x: 0, y: 0.7, width: 1, height: 0.3 }, policy: { kind: "dark-pixels-on-light-background", luminanceBelow: 95, maxPixels: 2 } });
  assert.deepEqual(report.measurements.map((item) => item.exceedsPolicy), [false, true]);
  assert.equal(report.measurements[1].darkPixels, 3);
  assert.equal(report.sourceFrames[1].sha256.length, 64);
  assert.match(report.limits, /diagnostic, not a general/);
  assert.throws(() => inspectRegions(root, [{ id: "x", path: "clean.png", atSec: 0 }], { region: { x: 0, y: 0.7, width: 1, height: 0.3 }, policy: { kind: "unspecified", luminanceBelow: 90, maxPixels: 0 } }), /explicitly be/);
});

test("existing score-grid alignment is optional, bounded, and records the scheduled cue time", () => {
  const grid = { schema: "design-pipeline.score-grid.v1", bpm: 120, cps: 0.5, beatsPerCycle: 4, durationSec: 2, beats: [0, 0.5, 1, 1.5], events: [{ atSec: 0.25 }, { atSec: 0.75 }] };
  const cue = { id: "hit", atSec: 0.24, durationSec: 0.2, type: "metal", gain: 0.1 };
  const [aligned] = alignCuesToGrid([cue], grid, { basis: "event", toleranceSec: 0.02, onExceed: "reject" });
  assert.equal(aligned.atSec, 0.25);
  assert.equal(aligned.alignment.requestedAtSec, 0.24);
  assert.throws(() => alignCuesToGrid([{ ...cue, atSec: 0.4 }], grid, { basis: "beat", toleranceSec: 0.01, onExceed: "reject" }), /tolerance/);
});

test("pan is equal-power with a centered default and hard left/right endpoints", () => {
  const render = (pan) => renderCues({ durationSec: 0.5, sampleRate: 16000, events: [{ id: "pan", atSec: 0, durationSec: 0.4, type: "tone", frequencyHz: 440, gain: 0.2, ...(pan === undefined ? {} : { pan }) }] });
  const center = render();
  assert.deepEqual(center.left, center.right, "default pan is center with equal-power gains");
  const left = render(-1), right = render(1);
  assert.ok(left.left.some((sample) => sample !== 0)); assert.ok(left.right.every((sample) => sample === 0));
  assert.ok(right.right.some((sample) => sample !== 0)); assert.ok(right.left.every((sample) => sample === 0));
});

test("tone, FM, pluck, inharmonic metal, filtered noise and echoes render repeatable 24-bit WAV", () => {
  const events = [
    { id: "tone", atSec: 0, durationSec: 0.45, type: "tone", frequencyHz: 440, gain: 0.06, partials: [{ ratio: 1, gain: 1 }, { ratio: 2.1, gain: 0.3 }], cutoffHz: 5000 },
    { id: "fm", atSec: 0.25, durationSec: 0.4, type: "fm", frequencyHz: 330, modRatio: 1.5, modIndex: 4, gain: 0.07, attackSec: 0.01, releaseSec: 0.15 },
    { id: "pluck", atSec: 0.5, durationSec: 0.5, type: "pluck", frequencyHz: 196, feedback: 0.985, gain: 0.05, echoDelaySec: 0.12, echoFeedback: 0.3, echoes: 2 },
    { id: "metal", atSec: 0.75, durationSec: 0.4, type: "metal", frequencyHz: 620, gain: 0.05, partials: [{ ratio: 1, gain: 1, decaySec: 0.25 }, { ratio: 2.76, gain: 0.4, decaySec: 0.12 }] },
    { id: "whoosh", atSec: 1, durationSec: 0.4, type: "noise-sweep", cutoffHz: 500, cutoffEndHz: 7000, gain: 0.04, attackSec: 0.02, releaseSec: 0.18 },
  ];
  const a = renderCues({ durationSec: 1.5, sampleRate: 16000, seed: 73, events });
  const b = renderCues({ durationSec: 1.5, sampleRate: 16000, seed: 73, events });
  assert.deepEqual(a.left, b.left); assert.deepEqual(a.right, b.right);
  assert.ok(a.peak > 0 && a.peak < 0.999);
  const unfilteredPluck = renderCues({ durationSec: 0.6, sampleRate: 16000, seed: 73, events: [{ id: "pluck", atSec: 0, durationSec: 0.5, type: "pluck", frequencyHz: 196, gain: 0.05 }] });
  const filteredPluck = renderCues({ durationSec: 0.6, sampleRate: 16000, seed: 73, events: [{ id: "pluck", atSec: 0, durationSec: 0.5, type: "pluck", frequencyHz: 196, gain: 0.05, cutoffHz: 120 }] });
  assert.notDeepEqual(filteredPluck.left, unfilteredPluck.left, "the optional low-pass filter affects plucks");
  const plainFm = renderCues({ durationSec: 0.5, sampleRate: 16000, seed: 73, events: [{ id: "fm", atSec: 0, durationSec: 0.4, type: "fm", frequencyHz: 330, modIndex: 0, gain: 0.05 }] });
  const modulatedFm = renderCues({ durationSec: 0.5, sampleRate: 16000, seed: 73, events: [{ id: "fm", atSec: 0, durationSec: 0.4, type: "fm", frequencyHz: 330, modIndex: 4, modRatio: 1.5, gain: 0.05 }] });
  assert.notDeepEqual(modulatedFm.left, plainFm.left, "the modulation index and ratio produce audible FM variation");
  const wav = encodeWav24(a);
  assert.equal(wav.toString("ascii", 0, 4), "RIFF"); assert.equal(wav.toString("ascii", 8, 12), "WAVE");
  assert.equal(wav.readUInt16LE(34), 24); assert.equal(wav.readUInt32LE(24), 16000);
  assert.equal(wav.readUInt32LE(40), a.frameCount * 6);
  assert.throws(() => renderCues({ durationSec: 1, sampleRate: 8000, events: [{ id: "alias", atSec: 0, durationSec: 0.3, type: "tone", frequencyHz: 2000 }] }), /Nyquist/);
  assert.throws(() => renderCues({ durationSec: 1, sampleRate: 8000, events: [{ id: "fm-alias", atSec: 0, durationSec: 0.3, type: "fm", frequencyHz: 1000, modRatio: 4, modIndex: 1 }] }), /Nyquist/);
  assert.throws(() => renderCues({ durationSec: 1, sampleRate: 8000, events: [{ id: "metal-no-frequency", atSec: 0, durationSec: 0.3, type: "metal" }] }), /frequencyHz/);
  assert.throws(() => renderCues({ durationSec: 1, sampleRate: 8000, events: [{ id: "bad-filter", atSec: 0, durationSec: 0.3, type: "tone", frequencyHz: 200, cutoffHz: 5000 }] }), /cutoffHz/);
  assert.throws(() => renderCues({ durationSec: 1, sampleRate: 8000, events: [{ id: "out-of-range", atSec: 1, durationSec: 0.3, type: "tone", frequencyHz: 200 }] }), /before the requested output duration/);
  const root = path.join(temporary, "audio"); fs.mkdirSync(root);
  const written = writeCueWav(root, "generated/cues.wav", { durationSec: 1.5, sampleRate: 16000, seed: 73, events });
  const bytes = fs.readFileSync(path.join(root, written.path));
  assert.equal(bytes.toString("ascii", 0, 4), "RIFF"); assert.equal(bytes.length, written.bytes);
  assert.throws(() => writeCueWav(root, "generated/cues.wav", { durationSec: 1.5, sampleRate: 16000, seed: 73, events }), /already exists/);
});

test("font subset checks glyph coverage and writes a new WOFF without touching the source font", () => {
  const root = path.join(temporary, "font"); fs.mkdirSync(root);
  const fixtureBuilder = String.raw`
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
from pathlib import Path
root = Path(r"${root.replace(/\\/g, "\\\\")}")
builder = FontBuilder(1000, isTTF=True)
order = [".notdef", "space", "A"]
builder.setupGlyphOrder(order)
builder.setupCharacterMap({32: "space", 65: "A"})
glyphs = {}
for name in order:
    pen = TTGlyphPen(None)
    if name == "A":
        pen.moveTo((50, 0)); pen.lineTo((300, 700)); pen.lineTo((550, 0)); pen.closePath()
    glyphs[name] = pen.glyph()
builder.setupGlyf(glyphs)
builder.setupHorizontalMetrics({".notdef": (500, 0), "space": (250, 0), "A": (600, 0)})
builder.setupHorizontalHeader(ascent=800, descent=-200)
builder.setupOS2(sTypoAscender=800, sTypoDescender=-200, usWinAscent=800, usWinDescent=200)
builder.setupNameTable({"familyName": "Local Test", "styleName": "Regular", "uniqueFontIdentifier": "Local Test Regular", "fullName": "Local Test Regular", "psName": "LocalTest-Regular"})
builder.setupPost(); builder.setupMaxp(); builder.save(root / "source.ttf")
`;
  const python = process.env.FONTTOOLS_PYTHON || "python";
  const built = spawnSync(python, ["-c", fixtureBuilder], { encoding: "utf8", windowsHide: true });
  assert.equal(built.status, 0, `fontTools fixture creation failed: ${built.stderr || built.stdout}`);
  const script = path.resolve(__dirname, "../skill/tools/art-motion/font-subset.py");
  const run = (output, args = []) => spawnSync(python, [script, "--root", root, "--font", "source.ttf", "--output", output, "--text", "A", ...args], { encoding: "utf8", windowsHide: true });
  const rejected = run("missing.woff", ["--text", "B"]);
  assert.notEqual(rejected.status, 0); assert.match(rejected.stderr, /lacks requested glyph/);
  assert.equal(fs.existsSync(path.join(root, "missing.woff")), false);
  const oversizedText = path.join(root, "large.txt"), fd = fs.openSync(oversizedText, "w");
  try { fs.ftruncateSync(fd, 8 * 1024 * 1024 + 1); } finally { fs.closeSync(fd); }
  const rejectedLargeText = run("large.woff", ["--text-file", "large.txt"]);
  assert.notEqual(rejectedLargeText.status, 0); assert.match(rejectedLargeText.stderr, /aggregate text limit/);
  assert.equal(fs.existsSync(path.join(root, "large.woff")), false);
  const oversizedFont = path.join(root, "large.ttf"), fontFd = fs.openSync(oversizedFont, "w");
  try { fs.ftruncateSync(fontFd, 64 * 1024 * 1024 + 1); } finally { fs.closeSync(fontFd); }
  const rejectedLargeFont = spawnSync(python, [script, "--root", root, "--font", "large.ttf", "--output", "large-font.woff", "--text", "A"], { encoding: "utf8", windowsHide: true });
  assert.notEqual(rejectedLargeFont.status, 0); assert.match(rejectedLargeFont.stderr, /64 MiB input limit/);
  assert.equal(fs.existsSync(path.join(root, "large-font.woff")), false);
  const accepted = run("subset.woff", ["--text", "B", "--allow-missing"]);
  assert.equal(accepted.status, 0, accepted.stderr);
  const report = JSON.parse(accepted.stdout);
  assert.deepEqual(report.missingGlyphs, ["B"]);
  assert.equal(fs.readFileSync(path.join(root, "subset.woff")).toString("ascii", 0, 4), "wOFF");
  assert.equal(fs.readFileSync(path.join(root, "source.ttf")).subarray(0, 4).toString("hex"), "00010000");
  assert.notEqual(run("subset.woff").status, 0, "existing outputs must be refused");
});

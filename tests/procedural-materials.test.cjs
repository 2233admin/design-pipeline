"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { after, test } = require("node:test");
const { decodePng, encodePng } = require("../skill/scripts/png-core.cjs");
const { seededRandom } = require("../skill/tools/art-motion/assets.cjs");
const procedural = require("../skill/tools/art-motion/procedural.cjs");
const stats = require("../skill/tools/art-motion/texture-stats.cjs");
const materials = require("../skill/scripts/material-core.cjs");
const zlib = require("node:zlib");
const crypto = require("node:crypto");
const sha = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");

// A valid RGBA PNG of the same pixels with a different deflate stream (level 1, filter 0).
function encodePngOtherwise({ width, height, data }) {
  const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = (buf) => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (type, body) => { const len = Buffer.alloc(4); len.writeUInt32BE(body.length); const tb = Buffer.concat([Buffer.from(type), body]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(tb)); return Buffer.concat([len, tb, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4); ihdr[8] = 8; ihdr[9] = 6;
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) data.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw, { level: 1 })), chunk("IEND", Buffer.alloc(0))]);
}
const { execute } = require("../skill/scripts/cli-core.cjs");

const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "procedural-"));
after(() => fs.rmSync(temporary, { recursive: true, force: true }));

const cli = (args) => { const r = execute([...args, "--json"]); return { ...r.output, exitCode: r.exitCode }; };
const project = (name) => { const dir = path.join(temporary, name); fs.mkdirSync(dir, { recursive: true }); return dir; };
const bytesOf = (run) => (run.svg ? Buffer.from(run.svg) : encodePng(run.image));
const calibration = procedural.builtinProfiles();

// ---- reproducibility ---------------------------------------------------------------------------

test("every generator gives the same bytes for the same params and seed, and different bytes for another seed", () => {
  const cases = [
    ["paper", { profile: "wove-cream", width: 160, height: 128, creases: 1, foxing: 1, age: 0.5, stains: 1 }],
    ["paper", { profile: "laid-cream", width: 128, height: 128, output: "multiply" }],
    ["halftone", { width: 128, height: 96, coverage: { ramp: "x" }, paper: "laid-cream" }],
    ["halftone", { width: 128, height: 96, mode: "fm", coverage: 0.3 }],
    ["print", { width: 128, height: 128, second: "#d10e1f", misregisterMm: [1, 0.5] }],
    ["architecture", { scene: "corridor", width: 320, height: 180, doors: 2 }],
    ["motif", { motif: "lattice", width: 200, height: 200, count: 8 }],
  ];
  for (const [name, params] of cases) {
    const a = procedural.generate(name, params, 7), b = procedural.generate(name, params, 7), c = procedural.generate(name, params, 8);
    assert.ok(bytesOf(a).equals(bytesOf(b)), `${name} is reproducible`);
    if (name !== "architecture" || params.doors) assert.ok(!bytesOf(a).equals(bytesOf(c)), `${name} depends on the seed`);
    assert.equal(a.version, procedural.GENERATORS[name]);
  }
});

test("bad generator input is a usage error with the allowed values", () => {
  assert.throws(() => procedural.generate("marble", {}, 1), /paper, halftone, print, architecture, motif/);
  assert.throws(() => procedural.generate("paper", { profile: "nope" }, 1), /unknown calibration profile nope.*laid-cream/);
  assert.throws(() => procedural.generate("paper", { profile: "autotype-1904", width: 64, height: 64 }, 1), /halftone profile, not paper/);
  assert.throws(() => procedural.generate("halftone", { coverage: 1.4 }, 1), /coverage/);
  assert.throws(() => procedural.generate("paper", {}, -1), /--seed/);
  assert.throws(() => procedural.generate("architecture", { vp: [5, 0] }, 1), /params.vp/);
  // Booleans are booleans and counts are whole numbers.
  assert.throws(() => procedural.generate("paper", { laid: "no", width: 64, height: 64 }, 1), /params.laid must be true or false/);
  assert.throws(() => procedural.generate("paper", { creases: 1.5, width: 64, height: 64 }, 1), /params.creases must be a whole number/);
  assert.throws(() => procedural.generate("architecture", { lights: 0 }, 1), /params.lights must be true or false/);
  assert.throws(() => procedural.generate("motif", { count: 7.5 }, 1), /params.count must be a whole number/);
  assert.throws(() => procedural.generate("paper", { profile: "../calibration/x", width: 64, height: 64 }, 1), /must match/);
  // A misspelt param is refused, not recorded and ignored.
  assert.throws(() => procedural.generate("paper", { strenght: 2 }, 1), /does not take params.strenght/);
  // Effect params are checked before any pixel work: no crash, no NaN image.
  const png = encodePng({ width: 32, height: 32, data: Buffer.alloc(32 * 32 * 4, 200) });
  assert.throws(() => procedural.processImage(png, "duotone", { misregisterMm: 3 }, 1), /misregisterMm/);
  assert.throws(() => procedural.processImage(png, "woodcut", { periodPx: 0 }, 1), /periodPx/);
  assert.throws(() => procedural.processImage(png, "photocopy", { bloomPx: -1 }, 1), /bloomPx/);
  assert.throws(() => procedural.processImage(png, "papercut", { paper: "#ffffff" }, 1), /paper profile id/);
  assert.throws(() => procedural.processImage(png, "halftone", { lpii: 80 }, 1), /does not take params.lpii/);
});

// ---- calibration ---------------------------------------------------------------------------------

test("built-in profiles carry the sample's provenance, px/mm evidence and a held-out natural variation", () => {
  for (const [id, profile] of Object.entries(calibration.profiles)) {
    assert.ok(["CC0", "PDM", "public-domain"].includes(profile.sample.license), `${id} sample is open`);
    assert.match(profile.sample.sha256, /^[0-9a-f]{64}$/);
    assert.ok(profile.pxPerMm > 0 && profile.pxPerMmEvidence, `${id} states where px/mm comes from`);
    assert.ok(profile.heldOut && profile.natural.comparable, `${id} has a held-out region`);
    assert.equal(typeof profile.grading.calibrated, "boolean", `${id} says whether it can grade`);
  }
  // Graded only where the sheet is clearly more like itself than like its nearest other sheet.
  const graded = Object.entries(calibration.profiles).filter(([, p]) => p.grading.calibrated).map(([id]) => id).sort();
  assert.deepEqual(graded, ["laid-cream", "woodblock-indigo", "wove-toned"]);
  for (const id of graded) {
    const p = calibration.profiles[id];
    assert.ok(p.natural.spectralDb < 0.8 * p.between.spectralDb && p.natural.histogramL < 0.8 * p.between.histogramL, id);
  }
  // One halftone sample, whose two crops differ by 0.43 off-lattice: no grade until owner scans.
  assert.equal(calibration.profiles["autotype-1904"].grading.calibrated, false);
});

const yard = (p) => ({ natural: p.natural, between: p.between, grading: p.grading });

test("white noise and flat fields are unlike every profile, calibrated or not; no screen is unlike a halftone", () => {
  const W = 512, random = seededRandom(5), noise = { width: W, height: W, data: Buffer.alloc(W * W * 4) };
  for (let i = 0; i < W * W; i += 1) { const v = 128 + Math.round((random.uniform() * 2 - 1) * 4); noise.data.set([v, v, v, 255], i * 4); }
  const flat = { width: W, height: W, data: Buffer.alloc(W * W * 4, 200) };
  for (const [id, profile] of Object.entries(calibration.profiles)) {
    for (const [label, image] of [["noise", noise], ["flat", flat]]) {
      const m = stats.measure(image, profile.kind, { pxPerMm: profile.pxPerMm });
      const verdict = stats.assess(profile.kind, stats.distance(m, profile.heldOut, profile.stats), yard(profile));
      assert.equal(verdict.level, "unlike-reference", `${label} vs ${id}: ${JSON.stringify(verdict)}`);
    }
  }
  // Noise-free synthetics: smooth gradients and clean stripes have near-zero rings and one axis of
  // energy; they are not screens.
  const synth = (f) => { const im = { width: W, height: W, data: Buffer.alloc(W * W * 4) }; for (let y = 0; y < W; y += 1) for (let x = 0; x < W; x += 1) { const v = f(x, y); im.data.set([v, v, v, 255], (y * W + x) * 4); } return im; };
  for (const [label, image] of [["vertical gradient", synth((x, y) => Math.round((y / W) * 255))], ["6 px stripes", synth((x) => (x % 6 < 3 ? 0 : 255))], ["diagonal stripes", synth((x, y) => ((x + y) % 6 < 3 ? 0 : 255))]]) {
    const m = stats.measure(image, "halftone", { pxPerMm: 4 });
    assert.equal(m.screen, false, `${label}: ${JSON.stringify(m)}`);
    const ref = calibration.profiles["autotype-1904"];
    assert.equal(stats.assess("halftone", stats.distance(m, ref.heldOut, ref.stats), yard(ref)).level, "unlike-reference", label);
  }
  // Laid lines and wood grain are single spikes, not a 2-D screen.
  for (const image of [procedural.generate("paper", { width: 512, height: 512 }, 1).image, procedural.generate("print", { width: 512, height: 512, margin: 0 }, 1).image]) {
    assert.equal(stats.measure(image, "halftone", { pxPerMm: 4 }).screen, false);
  }
});

test("generated paper reproduces the fitted band spectrum and sits within the scan's own variation", () => {
  const profile = calibration.profiles["wove-cream"];
  const run = procedural.generate("paper", { profile: "wove-cream", pxPerMm: profile.pxPerMm, width: 512, height: 512 }, 3);
  const measured = stats.measure(run.image, "paper", { pxPerMm: profile.pxPerMm });
  for (const [band, amp] of Object.entries(profile.stats.bands)) {
    assert.ok(Math.abs(20 * Math.log10(measured.bands[band] / amp)) < 2, `${band}: ${measured.bands[band]} vs ${amp}`);
  }
  const d = stats.distance(measured, profile.heldOut, profile.stats);
  // wove-cream's two crops differ more than it differs from wove-toned: it cannot grade.
  assert.equal(stats.assess("paper", d, yard(profile)).level, "not-calibrated");
  const toned = calibration.profiles["wove-toned"];
  const m2 = stats.measure(procedural.generate("paper", { profile: "wove-toned", pxPerMm: toned.pxPerMm, width: 512, height: 512 }, 3).image, "paper", { pxPerMm: toned.pxPerMm });
  const v = stats.assess("paper", stats.distance(m2, toned.heldOut, toned.stats), yard(toned));
  assert.ok(["within-natural-variation", "within-real-range"].includes(v.level), JSON.stringify(v));
  assert.ok(v.histogramL && Number.isFinite(v.histogramL.value), "the grade includes the histogram distance");
});

test("a too-faint paper (the old procedural overlay's failure) is measured as unlike the scan", () => {
  const profile = calibration.profiles["laid-cream"];
  const faint = procedural.generate("paper", { profile: "laid-cream", pxPerMm: profile.pxPerMm, width: 512, height: 512, strength: 0.15 }, 3);
  const d = stats.distance(stats.measure(faint.image, "paper", { pxPerMm: profile.pxPerMm }), profile.heldOut, profile.stats);
  assert.ok(d.spectralDb > 12, `faint paper is ${d.spectralDb} dB off`);
  assert.equal(stats.assess("paper", d, yard(profile)).level, "unlike-reference");
});

test("halftone statistics recover the screen, and roughness moves the off-lattice share toward print", () => {
  const clean = procedural.generate("halftone", { periodPx: 12, angleDeg: 30, coverage: 0.3, gain: 0, roughness: 0, mottle: 0, paper: "#ffffff", width: 512, height: 512 }, 1);
  const s = stats.measure(clean.image, "halftone", { pxPerMm: 4 });
  assert.ok(Math.abs(s.periodPx - 12) < 0.4, `period ${s.periodPx}`);
  assert.ok(Math.abs(s.angleDeg - 30) < 2, `angle ${s.angleDeg}`);
  assert.ok(Math.abs(s.coverage - 0.3) < 0.06, `coverage ${s.coverage}`);
  assert.ok(s.offLatticeFraction < 0.08, `clean screen ${s.offLatticeFraction}`);
  const rough = stats.measure(procedural.generate("halftone", { periodPx: 12, angleDeg: 30, coverage: 0.3, paper: "#ffffff", width: 512, height: 512 }, 1).image, "halftone", { pxPerMm: 4 });
  assert.ok(rough.offLatticeFraction > s.offLatticeFraction + 0.1, `rough ${rough.offLatticeFraction}`);
  const fm = stats.measure(procedural.generate("halftone", { periodPx: 8, mode: "fm", coverage: 0.4, paper: "#ffffff", width: 256, height: 256 }, 1).image, "paper", { pxPerMm: 4 });
  assert.ok(fm.rmsL > 20, "FM grains are printed, not a flat grey");
});

test("an ink flat drawn from a print profile lands near the scan's held-out region", () => {
  const profile = calibration.profiles["woodblock-indigo"];
  const run = procedural.generate("print", { profile: "woodblock-indigo", ink: "#1d2a3a", paper: "none", margin: 0, edgeRoughMm: 0, pile: 0, pxPerMm: profile.pxPerMm, width: 512, height: 512 }, 2);
  const d = stats.distance(stats.measure(run.image, "print", { pxPerMm: profile.pxPerMm }), profile.heldOut, profile.stats);
  assert.ok(d.spectralDb <= Math.max(1.5 * profile.natural.spectralDb, 1.5), `print ${d.spectralDb} dB vs natural ${profile.natural.spectralDb}`);
});

// ---- line art ------------------------------------------------------------------------------------

test("architecture scenes converge on their vanishing point and stay valid SVG", () => {
  for (const scene of ["corridor", "arcade", "checker", "stairs", "windows"]) {
    const run = procedural.generate("architecture", { scene, vp: [0.42, 0.4], width: 640, height: 360 }, 4);
    assert.match(run.svg, /^<svg xmlns="http:\/\/www.w3.org\/2000\/svg" width="640" height="360" viewBox="0 0 640 360">/);
    assert.ok(run.geometry.linesChecked > 0, scene);
    assert.ok(run.geometry.vanishingResidualPx < 0.05, `${scene} residual ${run.geometry.vanishingResidualPx}`);
    assert.deepEqual(run.geometry.vanishingPoint, [268.8, 144]);
  }
  for (const motif of ["gear", "rosette", "star", "sunburst", "rings", "spiral", "lattice"]) assert.match(procedural.generate("motif", { motif, width: 120, height: 120 }, 1).svg, /<\/svg>\n$/);
});

// ---- effects -------------------------------------------------------------------------------------

function sticker() {
  // A dark wing shape with a red and a white spot on transparency.
  const w = 160, h = 120, data = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) {
    const i = (y * w + x) * 4, wing = ((x - 80) / 70) ** 2 + ((y - 60) / 45) ** 2 < 1;
    if (!wing) continue;
    const red = Math.hypot(x - 50, y - 50) < 14, white = Math.hypot(x - 110, y - 70) < 9;
    data.set(red ? [209, 14, 31, 255] : white ? [240, 236, 228, 255] : [20, 18, 18, 255], i);
  }
  return encodePng({ width: w, height: h, data });
}

test("every effect is reproducible and keeps the source's transparency", () => {
  const input = sticker(), source = decodePng(input);
  for (const effect of Object.keys(procedural.EFFECTS)) {
    const a = procedural.processImage(input, effect, {}, 5), b = procedural.processImage(input, effect, {}, 5);
    assert.ok(encodePng(a.image).equals(encodePng(b.image)), `${effect} reproducible`);
    if (effect === "papercut") continue;
    assert.equal(a.image.width, source.width);
    // Outside the wing nothing is printed (or the pixel stays transparent).
    assert.equal(a.image.data[3], 0, `${effect} keeps the corner transparent`);
  }
});

test("papercut stacks colour clusters by area, each cut from its own textured sheet with a shadow", () => {
  const out = procedural.processImage(sticker(), "papercut", { layers: 3 }, 1);
  assert.deepEqual(out.params.palette.length, 3);
  assert.equal(out.params.palette[0], "#141212", "the dominant colour is the base sheet");
  const img = out.image, pad = out.padPx, at = (x, y) => img.data.subarray((y * img.width + x) * 4, (y * img.width + x) * 4 + 4);
  // The red spot survives as its own sheet; its fill is textured paper, not a flat colour.
  const reds = [];
  for (let y = 44; y < 56; y += 1) for (let x = 44; x < 56; x += 1) reds.push(at(x + pad, y + pad)[0]);
  assert.ok(Math.min(...reds) > 120, "red sheet is on top of the base");
  assert.ok(new Set(reds).size > 3, "red sheet carries paper texture");
  // A shadow falls outside the silhouette, down and to the right, as partial alpha.
  assert.ok(at(150 + pad + 3, 60 + pad + 4)[3] > 0 && at(150 + pad + 3, 60 + pad + 4)[3] < 255, "drop shadow beyond the right edge");
  assert.equal(at(1, 1)[3], 0);
});

// ---- catalog, replay, lineage ----------------------------------------------------------------

test("generate records generator, version, params, seed and similarity; replay proves the bytes; tampering is caught", () => {
  const root = project("generate"), base = ["--root", root, "--project-root", "."];
  const gen = cli(["materials", "generate", ...base, "--generator", "paper", "--seed", "9", "--params", '{"profile":"wove-cream","width":256,"height":256,"pxPerMm":10.556}', "--name", "sheet", "--use", "poster ground"]);
  assert.equal(gen.exitCode, 0, JSON.stringify(gen));
  assert.equal(gen.file, "materials/generated/sheet.png");
  assert.deepEqual([gen.record.license, gen.record.commercialUse, gen.record.source, gen.record.author], ["generated", true, "procedural", "design-pipeline procedural generator"]);
  assert.deepEqual([gen.record.generator.name, gen.record.generator.version, gen.record.generator.seed, gen.record.generator.params.profile], ["paper", 1, 9, "wove-cream"]);
  assert.equal(gen.record.generator.profile.origin, "builtin");
  assert.equal(gen.similarity.reference.id, "wove-cream");
  assert.ok(Number.isFinite(gen.record.similarity.value) && gen.record.similarity.natural > 0);
  assert.equal(gen.creativeAcceptance, "not-assessed");
  assert.equal(cli(["materials", "generate", ...base, "--generator", "paper", "--seed", "9", "--name", "sheet"]).error.code, "OUTPUT_EXISTS");
  const replay = cli(["materials", "generate", ...base, "--file", "materials/generated/sheet.png"]);
  assert.deepEqual([replay.status, replay.exitCode], ["reproduced", 0]);
  assert.equal(cli(["materials", "check", ...base]).status, "passed");
  const file = path.join(root, "materials/generated/sheet.png"), original = fs.readFileSync(file);
  const edited = decodePng(original); edited.data[0] ^= 0xff;
  fs.writeFileSync(file, encodePng(edited));
  const tampered = cli(["materials", "generate", ...base, "--file", "materials/generated/sheet.png"]);
  assert.deepEqual([tampered.status, tampered.exitCode], ["differs", 2]);
  assert.match(tampered.fix, /edited after generation/);
  assert.ok(cli(["materials", "check", ...base]).findings.some((f) => f.code === "material-changed"));
  fs.writeFileSync(file, original);
  // Pixels are compared, not deflate bytes: the same pixels written by another PNG encoder (as an
  // older zlib would have written them) still replay as reproduced.
  const recoded = encodePngOtherwise(decodePng(original));
  assert.notEqual(sha(recoded), sha(original));
  fs.writeFileSync(file, recoded);
  const recs = materials.readRecords(path.join(root, "materials"));
  recs["generated/sheet.png"].sha256 = sha(recoded);
  materials.writeRecords(path.join(root, "materials"), recs);
  const recodedReplay = cli(["materials", "generate", ...base, "--file", "materials/generated/sheet.png"]);
  assert.deepEqual([recodedReplay.status, recodedReplay.compared], ["reproduced", "decoded-rgba"], JSON.stringify(recodedReplay));
  fs.writeFileSync(file, original);
  recs["generated/sheet.png"].sha256 = sha(original);
  materials.writeRecords(path.join(root, "materials"), recs);
  // A generator record without its seed cannot be reproduced.
  const records = materials.readRecords(path.join(root, "materials"));
  delete records["generated/sheet.png"].generator.seed;
  materials.writeRecords(path.join(root, "materials"), records);
  const check = cli(["materials", "check", ...base]);
  assert.equal(check.exitCode, 2);
  assert.ok(check.findings.some((f) => f.code === "material-generator-incomplete" && /seed/.test(f.message)));
});

test("process keeps lineage; a changed source makes the processed file stale with the re-run command", () => {
  const root = project("process"), base = ["--root", root, "--project-root", "."], dir = path.join(root, "materials");
  fs.mkdirSync(path.join(dir, "owner"), { recursive: true });
  fs.writeFileSync(path.join(dir, "owner", "wing.png"), sticker());
  assert.equal(cli(["materials", "process", ...base, "--file", "materials/owner/wing.png", "--effect", "halftone"]).error.code, "LICENSE_UNRECORDED");
  cli(["materials", "add", ...base, "--file", "materials/owner/wing.png", "--license", "CC0", "--by", "Owner"]);
  const done = cli(["materials", "process", ...base, "--file", "materials/owner/wing.png", "--effect", "duotone", "--seed", "3", "--params", '{"misregisterMm":[1,0]}']);
  assert.equal(done.exitCode, 0, JSON.stringify(done));
  assert.equal(done.file, "materials/processed/wing-duotone.png");
  assert.deepEqual([done.record.license, done.record.derivedFrom.operation, done.record.derivedFrom.effect, done.record.derivedFrom.seed], ["CC0", "process", "duotone", 3]);
  assert.deepEqual(done.record.derivedFrom.params.misregisterMm, [1, 0]);
  assert.equal(cli(["materials", "process", ...base, "--file", "materials/owner/wing.png", "--effect", "emboss"]).error.code, "OPTION_VALUE_INVALID");
  fs.writeFileSync(path.join(dir, "owner", "wing.png"), encodePng({ ...decodePng(sticker()), data: Buffer.alloc(160 * 120 * 4, 200) }));
  cli(["materials", "add", ...base, "--file", "materials/owner/wing.png", "--license", "CC0", "--by", "Owner", "--replace"]);
  const stale = cli(["materials", "check", ...base]).findings.find((f) => f.code === "material-derived-stale");
  assert.match(stale.fix, /materials process --project-root \S+ --file materials\/owner\/wing.png --effect duotone --seed 3 .*--replace/);
});

test("an owner scan becomes a project calibration profile; editing the profile makes its textures stale", () => {
  const root = project("calibrate"), base = ["--root", root, "--project-root", "."], dir = path.join(root, "materials");
  fs.mkdirSync(path.join(dir, "scans"), { recursive: true });
  // Stand-in scan: a generated laid paper at 300 dpi, saved as if scanned.
  fs.writeFileSync(path.join(dir, "scans", "sheet.png"), encodePng(procedural.generate("paper", { profile: "laid-cream", pxPerMm: 11.81, width: 512, height: 256 }, 4).image));
  assert.equal(cli(["materials", "measure", ...base, "--file", "materials/scans/sheet.png", "--kind", "paper", "--name", "my-paper", "--params", '{"pxPerMm":11.81}']).error.code, "LICENSE_UNRECORDED");
  cli(["materials", "add", ...base, "--file", "materials/scans/sheet.png", "--license", "owner-scan", "--by", "Owner", "--kind", "scan"]);
  const unscaled = cli(["materials", "measure", ...base, "--file", "materials/scans/sheet.png", "--kind", "paper"]);
  assert.match(unscaled.warning, /pxPerMm/);
  assert.equal(cli(["materials", "measure", ...base, "--file", "materials/scans/sheet.png", "--kind", "paper", "--name", "laid-cream", "--params", '{"pxPerMm":11.81}']).error.code, "OUTPUT_EXISTS");
  const cal = cli(["materials", "measure", ...base, "--file", "materials/scans/sheet.png", "--kind", "paper", "--name", "my-paper", "--params", '{"pxPerMm":11.81}']);
  assert.deepEqual([cal.status, cal.profile.file], ["calibrated", "materials/calibration/my-paper.json"]);
  assert.ok(cal.profile.natural.comparable);
  const gen = cli(["materials", "generate", ...base, "--generator", "paper", "--seed", "2", "--params", '{"profile":"my-paper","width":256,"height":256,"pxPerMm":11.81}']);
  assert.equal(gen.exitCode, 0, JSON.stringify(gen));
  assert.equal(gen.record.generator.profile.origin, "project");
  assert.deepEqual(gen.record.calibration.map((c) => [c.id, c.file]), [["my-paper", "materials/calibration/my-paper.json"]]);
  assert.match(gen.record.calibration[0].sha256, /^[0-9a-f]{64}$/);
  // A processed file printed on the owner's paper depends on that profile too.
  const cutout = cli(["materials", "process", ...base, "--file", gen.file, "--effect", "halftone", "--params", '{"paper":"my-paper","periodPx":6}']);
  assert.equal(cutout.exitCode, 0, JSON.stringify(cutout));
  assert.equal(cutout.record.calibration[0].id, "my-paper");
  const measured = cli(["materials", "measure", ...base, "--file", gen.file]);
  assert.equal(measured.reference.id, "my-paper");
  // The stand-in "scan" is generated laid-cream, so it is closer to that built-in sheet (about 1 dB)
  // than its own two halves are to each other: the owner profile says it cannot grade, and why.
  assert.equal(cal.profile.grading.calibrated, false, JSON.stringify(cal.profile));
  assert.equal(measured.assessment.level, "not-calibrated", JSON.stringify(measured.assessment));
  assert.match(measured.assessment.reason, /natural .* between/);
  assert.equal(cli(["materials", "profiles", ...base]).project[0], "my-paper");
  // Graded against the owner profile with --reference: that profile is lineage too.
  const judged = cli(["materials", "generate", ...base, "--generator", "paper", "--seed", "4", "--name", "judged", "--reference", "my-paper", "--params", '{"profile":"wove-toned","width":256,"height":256,"pxPerMm":11.81}']);
  assert.deepEqual(judged.record.calibration.map((c) => [c.id, c.origin]), [["wove-toned", "builtin"], ["my-paper", "project"]]);
  assert.equal(cli(["materials", "generate", ...base, "--generator", "paper", "--reference", "../../etc/x", "--params", '{"width":64,"height":64}']).error.code, "OPTION_VALUE_INVALID");
  const profileFile = path.join(dir, "calibration", "my-paper.json");
  fs.writeFileSync(profileFile, fs.readFileSync(profileFile, "utf8").replace('"measured"', '"note": "edited", "measured"'));
  const check = cli(["materials", "check", ...base]);
  const stale = check.findings.filter((f) => f.code === "material-calibration-stale");
  assert.deepEqual(stale.map((f) => f.file).sort(), [gen.file, cutout.file, judged.file].map((f) => f.replace("materials/", "")).sort(), JSON.stringify(check.findings));
  assert.ok(stale.every((f) => /materials (generate|process) --project-root \S+ .*--replace/.test(f.fix)));
  // A built-in profile entry that changed (here: the digest recorded for it no longer matches)
  // makes its files stale too.
  const recordsFile = path.join(dir, "licenses.json"), records = JSON.parse(fs.readFileSync(recordsFile, "utf8"));
  const judgedRel = judged.file.replace("materials/", "");
  records[judgedRel].calibration[0].sha256 = "0".repeat(64);
  fs.writeFileSync(recordsFile, JSON.stringify(records, null, 2));
  const again = cli(["materials", "check", ...base]).findings.filter((f) => f.code === "material-calibration-stale" && f.file === judgedRel);
  assert.ok(again.some((f) => /wove-toned/.test(f.message)), JSON.stringify(again));
});

test("measure without a reference profile on a texture that looks nothing like paper reports unlike-reference, exit 2", () => {
  const root = project("unlike"), base = ["--root", root, "--project-root", "."], dir = path.join(root, "materials");
  fs.mkdirSync(path.join(dir, "owner"), { recursive: true });
  const random = seededRandom(1), w = 256, data = Buffer.alloc(w * w * 4);
  for (let i = 0; i < w * w; i += 1) { const v = random.uniform() < 0.5 ? 40 : 220; data.set([v, v, v, 255], i * 4); }
  fs.writeFileSync(path.join(dir, "owner", "noise.png"), encodePng({ width: w, height: w, data }));
  cli(["materials", "add", ...base, "--file", "materials/owner/noise.png", "--license", "CC0", "--by", "Owner"]);
  const result = cli(["materials", "measure", ...base, "--file", "materials/owner/noise.png", "--kind", "paper", "--reference", "wove-cream", "--params", '{"pxPerMm":4}']);
  assert.deepEqual([result.assessment.level, result.exitCode], ["unlike-reference", 2]);
});

test("the default name carries the seed only when the output depends on it", () => {
  const root = project("seed-name"), base = ["--root", root, "--project-root", "."];
  const star = cli(["materials", "generate", ...base, "--generator", "motif", "--seed", "3", "--params", '{"motif":"star","width":64,"height":64}']);
  assert.equal(star.file, "materials/generated/motif-star.svg");
  assert.equal(star.record.generator.seed, 3, "the seed is still recorded");
  assert.equal(cli(["materials", "generate", ...base, "--generator", "motif", "--seed", "3", "--params", '{"motif":"lattice","width":64,"height":64}']).file, "materials/generated/motif-lattice-s3.svg");
  assert.equal(cli(["materials", "generate", ...base, "--generator", "architecture", "--seed", "2", "--params", '{"scene":"checker","width":64,"height":64}']).file, "materials/generated/architecture-checker.svg");
});

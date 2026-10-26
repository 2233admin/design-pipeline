"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { spawnSync } = require("node:child_process");
const { checkStoryboard } = require("../skill/scripts/film-core.cjs");
const { CUT_CAMERAS, CUT_ENERGY, CUT_SIZES, CUT_TRANSITIONS, renderCutSheet, seedCuts, timeLabel } = require("../skill/scripts/film-cut-core.cjs");

const CLI = path.join(__dirname, "..", "skill", "scripts", "designer-pipeline.cjs");

function beat(id, startSec, endSec, handoff) {
  return { id, startSec, endSec, role: "action", subject: id, productAction: `shows ${id}`, transformation: { kind: "state-change", from: "a", to: "b" }, handoff, motion: ["camera-push"] };
}
function cut(no, startSec, endSec, extra = {}) {
  return { no, startSec, endSec, size: "UP", camera: ["FIX"], picture: `picture ${no}`, transition: "CT", ...extra };
}
function board(extra = {}) {
  return {
    schema: "design-pipeline.film-storyboard.v1",
    id: "cuts-test",
    durationSec: 6,
    fps: 24,
    grammar: "match-cut-montage",
    benefit: "Cut sheet test.",
    proofAction: "Cuts line up.",
    sound: { mode: "silent", reason: "test" },
    beats: [beat("one", 0, 3, "open"), beat("two", 3, 6, "hard-cut")],
    cuts: [cut("001", 0, 1.5), cut("002", 1.5, 3), cut("003", 3, 6)],
    ...extra,
  };
}
const codes = (result) => result.findings.map((finding) => finding.code);
const withoutRhythm = (result) => codes(result).filter((code) => !["no-rest", "uniform-cadence"].includes(code));
const run = (b, options = {}) => checkStoryboard(b, { filmRhythm: false, ...options });

test("a contiguous cut list inside its beats has no cut finding", () => {
  assert.deepEqual(withoutRhythm(run(board())), []);
});

test("a board without cuts checks as before", () => {
  const plain = board();
  delete plain.cuts;
  assert.equal(run(plain).status, "passed");
});

test("gaps, overlaps and beat spans fail with the cut numbers", () => {
  const gap = run(board({ cuts: [cut("001", 0, 1.5), cut("002", 1.8, 3), cut("003", 3, 6)] }));
  assert.equal(gap.status, "failed");
  assert.ok(gap.findings.some((finding) => finding.code === "cut-gap" && finding.message.includes("001") && finding.message.includes("002")));
  const overlap = run(board({ cuts: [cut("001", 0, 1.8), cut("002", 1.5, 3), cut("003", 3, 6)] }));
  assert.ok(codes(overlap).includes("cut-overlap"));
  const span = run(board({ cuts: [cut("001", 0, 3.5), cut("002", 3.5, 6)] }));
  const spanFinding = span.findings.find((finding) => finding.code === "cut-beat-span");
  assert.ok(spanFinding && spanFinding.message.includes("one") && spanFinding.message.includes("two"));
});

test("open ends and empty cuts fail", () => {
  assert.ok(codes(run(board({ cuts: [cut("001", 0.5, 3), cut("002", 3, 6)] }))).includes("cut-open-start"));
  assert.ok(codes(run(board({ cuts: [cut("001", 0, 3), cut("002", 3, 5)] }))).includes("cut-open-end"));
});

test("vocabulary outside the cut sheet fails with the allowed list", () => {
  const result = run(board({ cuts: [cut("001", 0, 3, { size: "MEDIUM", camera: ["DOLLY"], transition: "DISSOLVE" }), cut("002", 3, 6)] }));
  const fields = result.findings.filter((finding) => finding.code === "cut-vocabulary");
  assert.equal(fields.length, 3);
  assert.ok(fields.every((finding) => finding.fix && finding.message.includes("allowed:")));
});

test("an undescribed cut fails", () => {
  const result = run(board({ cuts: [cut("001", 0, 3, { picture: "" }), cut("002", 3, 6, { size: undefined })] }));
  assert.equal(result.findings.filter((finding) => finding.code === "cut-undescribed").length, 2);
});

test("duplicate cut numbers and unknown keys are contract errors", () => {
  assert.throws(() => run(board({ cuts: [cut("001", 0, 3), cut("001", 3, 6)] })), /duplicates cut number/);
  assert.throws(() => run(board({ cuts: [cut("001", 0, 3, { shot: "x" }), cut("002", 3, 6)] })), /unsupported properties/);
  assert.throws(() => run(board({ cuts: undefined, referenceCuts: "ref.json" })), /need cuts/);
});

test("the sheet shows seconds plus frames and one row per cut", () => {
  assert.equal(timeLabel(3.5, 24), "3+12");
  const html = renderCutSheet(board({ cuts: [cut("001", 0, 3.5, { dialogue: "line <b>", thumb: "t/001.png" }), cut("002", 3.5, 6)] }));
  assert.equal((html.match(/<tr>/g) || []).length, 3);
  assert.ok(html.includes("3+12"));
  assert.ok(html.includes("line &lt;b&gt;"));
  assert.ok(html.includes('src="t/001.png"'));
  for (const label of ["CUT", "画", "アクション", "セリフ・文字", "音", "秒+コマ"]) assert.ok(html.includes(label), label);
});

// ---- reference shots ----

function report(shots) {
  return {
    durationSec: shots[shots.length - 1].endSec,
    frames: shots.map((shot, index) => ({ id: `frame-${index + 1}`, path: `frames/frame-${index + 1}.png` })),
    segments: shots.map((shot, index) => ({ id: `shot-${String(index + 1).padStart(3, "0")}`, reason: "detected-shot", frameIds: [`frame-${index + 1}`], motion: { meanShare: 0.1, peakShare: 0.5 }, soundEvents: [], silences: [], ...shot })),
  };
}
const THREE = [{ startSec: 0, endSec: 1.5 }, { startSec: 1.5, endSec: 3 }, { startSec: 3, endSec: 6, soundEvents: [{ atSec: 4, strength: 0.2 }] }];

test("seeding makes one empty cut per detected shot and refuses to overwrite", () => {
  const seeded = seedCuts({ id: "x" }, report(THREE), { thumbPath: (frame) => frame.path });
  assert.equal(seeded.length, 3);
  assert.deepEqual(seeded.map((entry) => [entry.startSec, entry.endSec, entry.ref, entry.picture]), [[0, 1.5, "shot-001", ""], [1.5, 3, "shot-002", ""], [3, 6, "shot-003", ""]]);
  assert.equal(seeded[2].sound[0].atSec, 4);
  assert.equal(seeded[0].thumb, "frames/frame-1.png");
  assert.throws(() => seedCuts({ id: "x", cuts: seeded }, report(THREE)), /refusing to overwrite/);
  assert.throws(() => seedCuts({ id: "x" }, { segments: [{ reason: "ordered-window", startSec: 0, endSec: 2 }] }), /detected-shot/);
});

function project(shots, extra = {}) {
  const dir = fs.mkdtempSync(path.join(process.env.TEMP || os.tmpdir(), "film-cuts-"));
  fs.writeFileSync(path.join(dir, "reference-shots.json"), JSON.stringify(report(shots)));
  const seeded = seedCuts({ id: "x" }, report(shots));
  const cuts = seeded.map((entry, index) => ({ ...entry, picture: `p${index}`, size: "UP", camera: ["FIX"] }));
  return { dir, cuts, board: board({ cuts, referenceCuts: "reference-shots.json", ...extra }) };
}

test("a remake aligned with its reference reports no parity finding", () => {
  const { dir, board: b } = project(THREE);
  try {
    const result = run(b, { projectRoot: dir });
    assert.equal(result.status, "passed");
    assert.deepEqual(withoutRhythm(result), []);
    assert.equal(result.parity.status, "compared");
    assert.equal(result.parity.referenceShots, 3);
    assert.equal(result.creativeAcceptance, "not-assessed");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("parity lists missing shots and drift as warnings, and fails them under parityStrict", () => {
  const { dir, cuts } = project(THREE);
  try {
    const drifted = [{ ...cuts[0], endSec: 2 }, { ...cuts[1], startSec: 2, endSec: 3 }, cuts[2]];
    const result = run(board({ cuts: drifted, referenceCuts: "reference-shots.json" }), { projectRoot: dir });
    assert.equal(result.status, "passed");
    const drift = result.findings.find((finding) => finding.code === "parity-cut-drift");
    assert.ok(drift && drift.severity === "warn" && drift.message.includes("002"));
    const strict = run(board({ cuts: drifted, referenceCuts: "reference-shots.json", parityStrict: true }), { projectRoot: dir });
    assert.equal(strict.status, "failed");
    const missing = run(board({ cuts: [cuts[0], { ...cuts[1], endSec: 6 }], referenceCuts: "reference-shots.json" }), { projectRoot: dir });
    const missingFinding = missing.findings.find((finding) => finding.code === "parity-shot-missing");
    assert.ok(missingFinding && missingFinding.message.includes("shot-003"));
    assert.equal(missing.parity.counts.missing, 1);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("parity names undeclared reference sound and energy mismatches", () => {
  const { dir, cuts } = project(THREE);
  try {
    const quiet = cuts.map((entry) => ({ ...entry }));
    delete quiet[2].sound;
    quiet[0].energy = "high";
    const result = run(board({ cuts: quiet, referenceCuts: "reference-shots.json" }), { projectRoot: dir });
    assert.ok(codes(result).includes("parity-sound-missing"));
    assert.ok(codes(result).includes("parity-energy-mismatch"));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("an unreadable reference fails and a reference outside the project is a contract error", () => {
  const { dir, cuts } = project(THREE);
  try {
    const missing = run(board({ cuts, referenceCuts: "nope.json" }), { projectRoot: dir });
    assert.equal(missing.status, "failed");
    assert.ok(codes(missing).includes("parity-reference-unreadable"));
    assert.throws(() => run(board({ cuts, referenceCuts: "../escape.json" }), { projectRoot: dir }), /inside the project/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("film cut-sheet seeds from a report, writes the sheet and rejects a second seed", () => {
  const root = fs.mkdtempSync(path.join(process.env.TEMP || os.tmpdir(), "film-cuts-cli-"));
  try {
    const projectDir = path.join(root, "film");
    fs.mkdirSync(projectDir);
    const plain = board();
    delete plain.cuts;
    fs.writeFileSync(path.join(projectDir, "storyboard.json"), JSON.stringify(plain));
    fs.writeFileSync(path.join(root, "report.json"), JSON.stringify(report(THREE)));
    const call = (...args) => spawnSync(process.execPath, [CLI, "film", "cut-sheet", "--root", root, "--project-root", projectDir, ...args], { encoding: "utf8" });
    const none = call();
    assert.equal(none.status, 1);
    assert.ok(none.stdout.includes("--from-reference"));
    const seeded = call("--from-reference", path.join(root, "report.json"));
    assert.equal(seeded.status, 0, seeded.stdout + seeded.stderr);
    const written = JSON.parse(fs.readFileSync(path.join(projectDir, "storyboard.json"), "utf8"));
    assert.equal(written.cuts.length, 3);
    assert.equal(written.referenceCuts, "reference-shots.json");
    assert.ok(fs.existsSync(path.join(projectDir, "reference-shots.json")));
    assert.ok(fs.readFileSync(path.join(projectDir, "cut-sheet.html"), "utf8").includes("<tr>"));
    const again = call("--from-reference", path.join(root, "report.json"));
    assert.equal(again.status, 1);
    assert.ok(again.stdout.includes("refusing to overwrite"));
    const unchanged = JSON.parse(fs.readFileSync(path.join(projectDir, "storyboard.json"), "utf8"));
    assert.deepEqual(unchanged, written);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("the film workflow guide lists every cut vocabulary value the gate accepts", () => {
  const guide = fs.readFileSync(path.join(__dirname, "..", "skill", "references", "workflow-film.md"), "utf8");
  const start = guide.indexOf("- Cut sheet (shot-for-shot work)");
  const section = guide.slice(start, guide.indexOf("- Carry:", start));
  assert.ok(start >= 0 && section.length > 0, "workflow-film.md has a Cut sheet bullet before the Carry bullet");
  const sets = { size: CUT_SIZES, camera: CUT_CAMERAS, transition: CUT_TRANSITIONS, energy: CUT_ENERGY };
  for (const [name, values] of Object.entries(sets)) {
    for (const value of values) assert.ok(section.includes(`\`${value}\``), `${name} value ${value} is missing from the guide`);
  }
});

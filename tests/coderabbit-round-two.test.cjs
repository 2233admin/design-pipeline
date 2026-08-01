"use strict";

// Round-two CodeRabbit regression suite.
//
// Three findings in this round changed behaviour, and all three share one shape: a gate that
// reported on a question it never actually asked. `measurable` asked whether a path resolved and
// answered as if it had opened a raster; the freshness of a capture against the source it claims to
// have measured was recorded in the document and read by nobody; and the clone scaffolder owed a
// graybox to every reference route while only ever telling the author to capture one for the
// primary. Each test below names the finding it pins and states the pre-fix answer, because the
// pre-fix answer was never a crash - it was a quiet `ready`, and a reader cannot recover that from
// the code once the check exists.
//
// The raster bytes are built in `helpers/reference-fixtures.cjs` rather than checked in as a binary
// fixture: the gate reads a 24-byte header and never decodes, so 33 bytes of signature and IHDR are
// the whole of what it means to be a measurable raster here.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const { checkReconstruction } = require("../skill/scripts/reconstruction-core.cjs");
const fixtures = require("./helpers/reference-fixtures.cjs");

const {
  matchingRegions,
  pngBytes,
  writeArtifact,
  writeJson,
  writeRaster,
} = fixtures;

const repoRoot = path.resolve(__dirname, "..");
const initializer = path.join(repoRoot, "skill", "scripts", "init-website-clone.cjs");

const CAPTURED_AT = "2026-02-11T09:00:00.000Z";
const BEFORE_CAPTURE = "2026-02-10T09:00:00.000Z";
const AFTER_CAPTURE = "2026-02-12T09:00:00.000Z";

const createdRoots = new Set();

test.after(() => {
  for (const root of createdRoots) fs.rmSync(root, { recursive: true, force: true });
});

function tempRoot(label) {
  const root = fixtures.tempRoot(`design-pipeline-round-two-${label}-`);
  createdRoots.add(root);
  return root;
}

// --- shared documents ---------------------------------------------------------------------------
// The comparison addresses exactly the two regions the shared planar composition declares, so the
// binding is satisfied by default and the only thing under test in each case is the one it names.

function comparisonRegions() {
  return matchingRegions(
    ["board", "register"],
    (id) => `${id} holds the recorded row and column structure.`,
  );
}

function grayboxBlock(overrides = {}) {
  return fixtures.grayboxBlock({
    capturedAt: CAPTURED_AT,
    comparison: { mode: "measured", regions: comparisonRegions() },
    ...overrides,
  });
}

// A change whose only defect is the one the caller introduces: an approved planar reference with a
// resolved source, a graybox capture on disk, and a measured comparison over both declared regions.
// Every field the gates read is in order, which is the state the pre-fix code reported `ready` from.
function measuredRoot(label, { source = {}, graybox = {} } = {}) {
  const root = tempRoot(label);
  writeArtifact(root, "graybox.png");
  writeJson(root, "reference-evidence.json", fixtures.planarReference({
    source: fixtures.resolvedSource(source),
    graybox: grayboxBlock(graybox),
  }));
  return root;
}

function graybox(root) {
  return checkReconstruction(root, { stage: "graybox" });
}

// ================================================================================================
// FINDING 1: `measurable` accepted a non-raster
// ================================================================================================
//
// Pre-fix, `rasterOnDisk` was `fs.existsSync(file) && fs.statSync(file).isFile()`, `resolvable` was
// set from it, and `measurable`/`fidelityEvidence` were derived from `resolvable`. Nothing opened
// the bytes, so a text file named `reference.png` granted a measured comparison fidelity evidence -
// which four fixtures in this suite were doing, with the ASCII string "evidence" standing in for a
// raster. Existence was never the question the gate claimed to be answering.
//
// Each case below asserts three things together, because any one of them alone can be satisfied by
// a gate that is still wrong: the stage blocks, it blocks for a reason that describes *this* file
// rather than some other change's problem, and no fidelity evidence is granted.

function assertNoFidelity(result, reason) {
  assert.equal(result.status, "blocked");
  assert.equal(result.reason, reason);
  assert.ok(result.reasons.includes(reason));
  assert.equal(result.measurable, false);
  assert.equal(result.fidelityEvidence, false);
  // The declared mode is reported as declared. A refused `measured` claim is never quietly
  // rewritten into the `qualitative` one the gate would have accepted.
  assert.equal(result.comparisonMode, "measured");
  assert.equal(result.source.raster.ok, false);
  assert.equal(result.source.raster.reason, reason);
}

test("finding 1: a zero-byte file named .png is not a raster and grants no fidelity evidence", () => {
  const root = measuredRoot("raster-empty");
  writeArtifact(root, "reference.png", Buffer.alloc(0));
  // The file exists and is a regular file, so every pre-fix predicate passed on it.
  assert.equal(fs.statSync(path.join(root, "reference.png")).size, 0);

  const result = graybox(root);
  assertNoFidelity(result, "reference-source-not-raster");
  // A zero-byte file fails at the signature, not at the size header: there is nothing here that
  // claims to be a PNG, so "truncated" would describe a repair this file does not need.
  assert.equal(result.reasons.includes("reference-source-raster-truncated"), false);
  assert.match(result.blockers.join("\n"), /reference\.png/);
});

test("finding 1: a directory named .png is unreadable rather than measurable", () => {
  const root = measuredRoot("raster-directory");
  fs.mkdirSync(path.join(root, "reference.png"));
  assert.equal(fs.existsSync(path.join(root, "reference.png")), true);

  const result = graybox(root);
  assertNoFidelity(result, "reference-source-raster-unreadable");
  // The directory is present, so it is not the missing-file story and must not borrow its reason.
  assert.equal(result.reasons.includes("reference-source-raster-missing"), false);
  assert.match(result.blockers.join("\n"), /not a regular file/);
});

test("finding 1: arbitrary non-image bytes named .png are not a raster", () => {
  const root = measuredRoot("raster-prose");
  writeArtifact(root, "reference.png", "This is prose describing the reference, not the reference.");

  assertNoFidelity(graybox(root), "reference-source-not-raster");
});

test("finding 1: a PNG signature with no readable IHDR size is truncated, not measurable", () => {
  // Three separate corruptions, one fact: the file says PNG and cannot say how big it is. They
  // share a reason because they share a repair - export the still again - and each is checked so a
  // later narrowing of the header read cannot silently stop covering one of them.
  const cases = [
    ["truncated-short", pngBytes().subarray(0, 12)],
    ["truncated-zero-dimension", pngBytes({ width: 0 })],
    ["truncated-first-chunk", pngBytes({ chunkType: "IDAT" })],
  ];
  for (const [label, bytes] of cases) {
    const root = measuredRoot(label);
    writeArtifact(root, "reference.png", bytes);
    const result = graybox(root);
    assert.equal(result.source.raster.ok, false, label);
    assertNoFidelity(result, "reference-source-raster-truncated");
    // The signature is intact, so this is not the not-a-raster story.
    assert.equal(result.reasons.includes("reference-source-not-raster"), false, label);
  }
});

test("finding 1: a real PNG still measures and is still fidelity evidence", () => {
  // The check closes the unbacked claim without closing the measured chain: this is the only case
  // in the block that reaches `ready`, and it is the only one holding real raster bytes.
  const root = measuredRoot("raster-valid");
  writeRaster(root, "reference.png");

  const result = graybox(root);
  assert.equal(result.status, "ready", result.blockers.join("\n"));
  assert.equal(result.measurable, true);
  assert.equal(result.fidelityEvidence, true);
  assert.equal(result.comparisonMode, "measured");
  // The gate read the header rather than trusting the extension, and says what it found there.
  assert.deepEqual(result.source.raster, { ok: true, width: 723, height: 405 });
  assert.equal(result.source.resolvable, true);
});

test("finding 1: a missing file, an escaping path, and an undeclared path keep separate reasons", () => {
  // One generic refusal used to cover all of these plus the four above. The refusal was always
  // right; the reason sent the reader to the wrong repair.
  const missing = graybox(measuredRoot("raster-missing"));
  assertNoFidelity(missing, "reference-source-raster-missing");
  assert.match(missing.blockers.join("\n"), /not present in the change root/);

  const escaping = graybox(measuredRoot("raster-escape", {
    source: { path: "../escape.png" },
  }));
  assertNoFidelity(escaping, "reference-source-raster-uncontained");
  // Pre-fix this state was folded into the shared reason, whose blocker text asserted the file was
  // "not present in the change root" - a claim the gate never checked, because it refused to look.
  assert.match(escaping.blockers.join("\n"), /does not resolve inside the change root/);

  for (const [label, declaredPath] of [["null", null], ["blank", "   "]]) {
    const undeclared = graybox(measuredRoot(`raster-path-${label}`, {
      source: { path: declaredPath },
    }));
    assertNoFidelity(undeclared, "reference-source-path-undeclared");
    assert.equal(undeclared.source.path, null, label);
  }
});

// The raster check is graybox-scoped, and this pins that scope rather than assuming it. The
// geometry stage compares landmarks against the same source and does not consult `source.raster`,
// so a non-raster reaches `ready` there. That is a stated gap, not a claim of coverage: a change
// that later gates geometry on the raster should fail this test and rewrite it deliberately.
test("finding 1 scope: the geometry stage does not consult the reference raster", () => {
  const { readyRoot } = require("./fixtures/reconstruction-fixture.cjs");
  const root = readyRoot();
  createdRoots.add(root);
  writeJson(root, "reference-evidence.json", fixtures.planarReference({
    source: fixtures.resolvedSource(),
  }));
  writeArtifact(root, "reference.png", "not a raster");

  const geometry = checkReconstruction(root, { stage: "geometry" });
  assert.equal(geometry.source.raster.ok, false);
  assert.equal(geometry.source.raster.reason, "reference-source-not-raster");
  // The state is carried and reported; the stage simply does not gate on it.
  assert.equal(geometry.status, "ready", geometry.blockers.join("\n"));
  assert.equal(geometry.reasons.includes("reference-source-not-raster"), false);
});

// ================================================================================================
// FINDING 3691889244: `resolvedAt` had no reader
// ================================================================================================
//
// Pre-fix, `resolvedAt` appeared in the schema, in the reference validator's type check, and in
// prose. `reconstruction-core.cjs` never mentioned it - `resolvedSourceState` did not even carry it
// onto the source state - so a capture taken while the source was still pending could be relabelled
// `measured` the moment the source landed, and nothing compared the two moments.

function freshnessRoot(label, resolvedAt, grayboxOverrides = {}) {
  const root = measuredRoot(label, {
    source: resolvedAt === undefined ? {} : { resolvedAt },
    graybox: grayboxOverrides,
  });
  writeRaster(root, "reference.png");
  return root;
}

test("freshness: a capture taken before the source resolved cannot claim to have measured it", () => {
  const result = graybox(freshnessRoot("stale", AFTER_CAPTURE));
  assert.equal(result.status, "blocked");
  assert.equal(result.reason, "graybox-capture-predates-source");
  assert.equal(result.fidelityEvidence, false);
  // `measurable` stays a property of the disk. The raster is real and could support a measurement;
  // what it cannot support is *this* capture's claim to have made one. Collapsing the two facts
  // would send the author to re-export a raster that was never the problem.
  assert.equal(result.measurable, true);
  assert.equal(result.source.raster.ok, true);
  assert.equal(result.source.resolvedAt, AFTER_CAPTURE);
  assert.match(result.blockers.join("\n"), /re-run rather than re-labelled/);
});

test("freshness: a capture taken after - or exactly at - the resolution still measures", () => {
  const after = graybox(freshnessRoot("fresh", BEFORE_CAPTURE));
  assert.equal(after.status, "ready", after.blockers.join("\n"));
  assert.equal(after.fidelityEvidence, true);
  // The field is carried onto the source state, which is what separates "compared and fresh" from
  // the pre-fix "not read at all". Without this the whole test would pass against a gate that has
  // no freshness check, since every capture was ready then.
  assert.equal(after.source.resolvedAt, BEFORE_CAPTURE);

  // Equal timestamps pass. The comparison is strictly-earlier, so a capture and a resolution
  // recorded at the same moment is not manufactured into a staleness failure.
  const equal = graybox(freshnessRoot("fresh-equal", CAPTURED_AT));
  assert.equal(equal.status, "ready", equal.blockers.join("\n"));
  assert.equal(equal.fidelityEvidence, true);
  assert.equal(equal.source.resolvedAt, CAPTURED_AT);
});

// MUST-STILL-HOLD GUARD: this passes against the pre-fix tree, and is meant to. The finding was a
// missing reader, so the risk the fix carries is over-reach - a freshness check that demands a
// `resolvedAt` no legacy document records would block every change written before the pending
// state existed. This pins the absent-field default against that fix, not against the defect.
test("freshness: a document with no resolvedAt is not compared and keeps its legacy verdict", () => {
  // Absent field, legacy default: a document that never went through a pending phase records no
  // resolution moment, and inventing one - or blocking for the lack of one - would break every
  // change written before the pending state existed.
  const legacy = freshnessRoot("legacy-no-resolved-at", undefined);
  assert.equal(
    Object.hasOwn(fixtures.readJson(legacy, "reference-evidence.json").source, "resolvedAt"),
    false,
  );

  const result = graybox(legacy);
  assert.equal(result.status, "ready", result.blockers.join("\n"));
  assert.equal(result.fidelityEvidence, true);
  assert.equal(Object.hasOwn(result.source, "resolvedAt"), false);
  assert.equal(result.reasons.includes("graybox-capture-predates-source"), false);
});

test("freshness: only a measured claim is compared - a stale qualitative capture still passes", () => {
  // A qualitative capture against a pending source is the documented output of the pending phase.
  // It never claimed to have measured against the source, so the source landing afterwards does not
  // retroactively invalidate it - and it is not fidelity evidence either way, which is what keeps
  // this from being a hole. Blocking it would break the workflow while catching no dishonest claim.
  const result = graybox(freshnessRoot("stale-qualitative", AFTER_CAPTURE, {
    comparison: { mode: "qualitative", regions: comparisonRegions() },
  }));
  assert.equal(result.status, "ready", result.blockers.join("\n"));
  assert.equal(result.comparisonMode, "qualitative");
  assert.equal(result.fidelityEvidence, false);
  assert.equal(result.reasons.includes("graybox-capture-predates-source"), false);
  // The pass is a scope decision, not an unread field: the same `resolvedAt` that blocks the
  // measured capture above is on the state here and deliberately not applied. Asserting only the
  // `ready` would pass identically against a gate that never read the field at all.
  assert.equal(result.source.resolvedAt, AFTER_CAPTURE);
});

test("freshness: a resolvedAt that cannot be compared is a loud failure, never a quiet pass", () => {
  // Present-but-malformed is the opposite of absent. Dropping an unreadable `resolvedAt` on the
  // floor would return the freshness check to answering `fresh` because it had nothing to compare.
  for (const [label, resolvedAt] of [["unparseable", "some time last week"], ["non-string", 1770000000000]]) {
    const result = graybox(freshnessRoot(`resolved-at-${label}`, resolvedAt));
    assert.equal(result.status, "blocked", label);
    assert.equal(result.reason, "reference-source-resolved-at-invalid", label);
    assert.equal(result.fidelityEvidence, false, label);
    // The whole source declaration is unreadable, so nothing downstream of it is asserted either.
    assert.equal(result.source.availability, "unknown", label);
    assert.equal(result.measurable, false, label);
  }
});

test("freshness: a pending source that also records resolvedAt contradicts itself and blocks", () => {
  // The schema forbids `resolvedAt` under `availability: pending`; `reconstruction-core` reads the
  // document raw and never runs the reference validator, so it has to refuse the pair itself.
  const root = tempRoot("resolved-at-contradictory");
  writeArtifact(root, "graybox.png");
  writeJson(root, "reference-evidence.json", fixtures.planarReference({
    source: fixtures.pendingSource({ resolvedAt: AFTER_CAPTURE }),
    graybox: grayboxBlock({ comparison: { mode: "qualitative", regions: comparisonRegions() } }),
  }));

  const result = graybox(root);
  assert.equal(result.status, "blocked");
  assert.equal(result.reason, "reference-source-resolved-at-contradictory");
  // Not the ordinary pending story: a document that says the source both never arrived and landed
  // at a known moment is an authoring fault, and reporting it as `source-pending` would hide that.
  assert.equal(result.reasons.includes("source-pending"), false);
  assert.equal(result.source.availability, "unknown");
});

// MUST-STILL-HOLD GUARD: this passes against the pre-fix tree, because the contract already
// refused an unparseable `capturedAt` before this round. It is here to say so.
test("freshness: an uncomparable capture timestamp is refused by the contract before the gate", () => {
  // Pinning where this is caught, because the freshness reader carries its own
  // `graybox-capture-uncomparable` guard and that guard is unreachable: `validateGraybox` rejects a
  // `capturedAt` that is not a timestamp first, and it throws rather than blocking. The guard is
  // worth keeping - the alternative to naming an uncomparable pair is counting it as fresh - but a
  // reader should not go looking for a reason string no document can produce. If validation is ever
  // loosened, this test fails and the guard becomes the reachable path it was written to be.
  const root = freshnessRoot("uncomparable-capture", AFTER_CAPTURE, { capturedAt: "whenever" });
  assert.throws(() => graybox(root), /capturedAt must be an ISO 8601 timestamp/);
});

// ================================================================================================
// FINDING: the clone scaffolder owed a graybox to every reference route
// ================================================================================================
//
// Pre-fix, the only graybox task the checklist could emit was gated on `target.role === "primary"`,
// while the reconciliation task at the end was unconditional. `references/reference-spec.md`
// requires `graybox.png` on every reference route, so a change scaffolded with `--reference-url`
// was walked from the first render straight into a reconciliation citing a graybox nothing had told
// the author to capture.

const RECONCILIATION_BASE = "- [ ] Fill the `Spec Reconciliation` section in design.md: cite the graybox capture the spec was written against, record every value the implementation changed with an observed cause, and pass `designer-pipeline reconciliation check`.";

function scaffoldProject() {
  const projectRoot = tempRoot("clone");
  fs.mkdirSync(path.join(projectRoot, "openspec", "changes"), { recursive: true });
  for (const foundation of ["DESIGN.md", "MOTION.md"]) {
    fs.copyFileSync(path.join(repoRoot, foundation), path.join(projectRoot, foundation));
  }
  return projectRoot;
}

function runScaffold(...args) {
  const projectRoot = scaffoldProject();
  const result = spawnSync(
    process.execPath,
    [initializer, "--project-root", projectRoot, "--change-id", "clone-x", ...args],
    { encoding: "utf8" },
  );
  return { projectRoot, result };
}

function scaffold(...args) {
  const { projectRoot, result } = runScaffold(...args);
  assert.equal(result.status, 0, result.stderr);
  return fs.readFileSync(
    path.join(projectRoot, "openspec", "changes", "clone-x", "tasks.md"),
    "utf8",
  ).split("\n");
}

function lineIndex(tasks, pattern) {
  const index = tasks.findIndex((line) => pattern.test(line));
  assert.notEqual(index, -1, `no task line matched ${pattern}`);
  return index;
}

// MUST-STILL-HOLD GUARD: this passes against the pre-fix tree. The primary ordering and the
// settled reconciliation wording were already correct; the fix split one role-conditional helper
// into three, and the thing that split could break is the case that was already right. Pinned
// byte-identical so a later edit to the shared reconciliation string has to be deliberate.
test("scaffolder: a primary target is told to capture its graybox before the design spec", () => {
  const tasks = scaffold("--url", "https://example.com");

  const capture = lineIndex(tasks, /Capture a layout-only graybox for each primary target/);
  const spec = lineIndex(tasks, /Write one complete spec before each bounded builder slice/);
  assert.ok(capture < spec, "the primary graybox capture does not precede the spec task");
  assert.match(tasks[capture], /before writing design\.md/);
  assert.match(tasks[capture], /\(example-com\)/);

  // A change with one graybox ordering has no ambiguity to resolve, so the settled reconciliation
  // line stands byte-identical. The disambiguating sentence is added only where two orderings
  // coexist, which is what the next test checks.
  assert.equal(tasks[lineIndex(tasks, /Spec Reconciliation/)], RECONCILIATION_BASE);
  // No reference target, so no first-render capture is owed.
  assert.equal(tasks.some((line) => /reference target/.test(line)), false);
});

test("scaffolder: a constraint target is owed a post-render graybox before reconciliation", () => {
  const tasks = scaffold(
    "--url", "https://example.com",
    "--reference-url", "https://reference.example.org/about",
  );

  const primaryCapture = lineIndex(tasks, /graybox for each primary target/);
  const spec = lineIndex(tasks, /Write one complete spec before each bounded builder slice/);
  const build = lineIndex(tasks, /Assemble and run the target project's build checks/);
  const referenceCapture = lineIndex(tasks, /graybox for each reference target/);
  const reconciliation = lineIndex(tasks, /Spec Reconciliation/);

  // The whole finding: this line did not exist, so the checklist below it cited a capture the
  // author was never asked to take.
  assert.match(tasks[referenceCapture], /\(reference-example-org-about\)/);
  assert.match(tasks[referenceCapture], /from the first render/);
  assert.match(tasks[referenceCapture], /reconstruction check --stage graybox/);

  // A constraint keeps the normal order - spec first, capture from the first render - which is what
  // makes it a different task from the primary one rather than the same task run twice.
  assert.ok(primaryCapture < spec, "the primary capture does not precede the spec");
  assert.ok(build < referenceCapture, "the reference capture does not follow the first render");
  assert.ok(referenceCapture < reconciliation, "the reference capture does not precede reconciliation");

  // Two orderings coexist, so the reconciliation task now says which capture belongs to which role
  // instead of naming "the graybox capture" and leaving the author to guess.
  const cited = tasks[reconciliation];
  assert.ok(cited.startsWith(RECONCILIATION_BASE), cited);
  assert.match(cited, /pre-spec graybox for the primary targets \(example-com\)/);
  assert.match(cited, /first-render graybox for the reference targets \(reference-example-org-about\)/);

  // Each capture task names only the targets whose ordering it governs.
  assert.equal(/reference-example-org-about/.test(tasks[primaryCapture]), false);
  assert.equal(/example-com[,)]/.test(tasks[referenceCapture]), false);
});

test("scaffolder: every target of each role is named in its own capture task", () => {
  const tasks = scaffold(
    "--url", "https://example.com",
    "--url", "https://shop.example.com",
    "--reference-url", "https://reference.example.org/about",
    "--reference-url", "https://reference.example.org/pricing",
  );

  const primaryCapture = tasks[lineIndex(tasks, /graybox for each primary target/)];
  const referenceCapture = tasks[lineIndex(tasks, /graybox for each reference target/)];
  for (const id of ["example-com", "shop-example-com"]) {
    assert.match(primaryCapture, new RegExp(id));
  }
  for (const id of ["reference-example-org-about", "reference-example-org-pricing"]) {
    assert.match(referenceCapture, new RegExp(id));
  }
});

// A target set with no reference at all cannot be scaffolded: in this script every target *is* a
// reference - `primary` is the clone form of a `primary-target` reference and `reference` is the
// constraint form - so the reference-free set is the empty one, and the empty one is refused. This
// is a must-still-hold guard, not a regression test for the finding: it passed before the fix and
// is asserted so that `taskList`'s new empty-set handling stays defensive rather than becoming a
// reachable state where a change is scaffolded owing neither a graybox nor a reconciliation.
test("scaffolder guard: a target set with no primary is refused rather than scaffolded", () => {
  const { projectRoot, result } = runScaffold(
    "--reference-url", "https://reference.example.org/about",
  );
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /at least one primary --url is required/);
  assert.equal(fs.existsSync(path.join(projectRoot, "openspec", "changes", "clone-x")), false);
});

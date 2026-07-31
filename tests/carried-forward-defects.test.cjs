"use strict";

// Carried-forward defect regression suite.
//
// Every defect below is one of two shapes: a gate reporting success on evidence it never checked,
// or a validator letting the author choose the verdict. Each test is named after the defect id
// (D1..D5, F5, F8, F10) it closes, so a reviewer reading a failure can map it straight back to the
// finding that demanded it. Nothing here asserts that a report is well formed - each one asserts
// that the gate refuses a document it used to wave through, and that the legacy signal it is
// allowed to keep (an ABSENT field) is still honoured beside the broken one it must now reject.

const assert = require("node:assert/strict");
const childProcess = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

// --- D1 kernel simulation ------------------------------------------------------------------------
// `cli-core.cjs` destructures `spawnSync` at load time, so the stub has to be installed before the
// module is required. It delegates to the real implementation for every spawn that is not an armed
// kernel invocation, which leaves the CLI subprocess helper further down untouched. Simulating the
// kernel is the point: the defect is in how `runKernel` maps a status it is handed, not in whether
// some real kernel can be coaxed into producing a 3, and a test that waited for a genuine measured
// fidelity mismatch would be testing the wrong module.
const actualSpawnSync = childProcess.spawnSync;
const KERNEL_SCRIPT = "audit-capabilities.cjs";
let armedKernel = null;

childProcess.spawnSync = function spawnSyncStub(command, args, options) {
  const armedForThisCall = armedKernel
    && Array.isArray(args)
    && args.some((arg) => String(arg).endsWith(KERNEL_SCRIPT));
  if (!armedForThisCall) return actualSpawnSync(command, args, options);
  return { stdout: "", stderr: "", status: null, signal: null, error: undefined, ...armedKernel };
};

const cliCore = require("../skill/scripts/cli-core.cjs");
const {
  checkReconstruction,
} = require("../skill/scripts/reconstruction-core.cjs");
const {
  checkReferenceEvidence,
  validateComposition,
  validateReferenceEvidence,
} = require("../skill/scripts/reference-evidence-core.cjs");
const {
  checkSpecReconciliation,
} = require("../skill/scripts/check-spec-reconciliation.cjs");
const fixtures = require("./helpers/reference-fixtures.cjs");

const {
  matchingRegions,
  queryParameterMode,
  writeArtifact,
  writeJson,
} = fixtures;

const repoRoot = path.resolve(__dirname, "..");
const cli = path.join(repoRoot, "skill", "scripts", "designer-pipeline.cjs");
const cloneInit = path.join(repoRoot, "skill", "scripts", "init-website-clone.cjs");

const CAPTURED_AT = "2026-02-11T09:00:00.000Z";
const RECONCILED_AT = "2026-02-12T09:00:00.000Z";

const createdRoots = new Set();

test.after(() => {
  childProcess.spawnSync = actualSpawnSync;
  for (const root of createdRoots) fs.rmSync(root, { recursive: true, force: true });
});

function tempRoot(label) {
  const root = fixtures.tempRoot(`design-pipeline-carried-${label}-`);
  createdRoots.add(root);
  return fs.realpathSync(root);
}

// --- shared documents ----------------------------------------------------------------------------
// The comparison names exactly the two ids `boardRegisterComposition` declares, so the region
// binding is satisfied by default and whatever a test below blocks on is the fault under test.

function comparisonRegions(ids = ["board", "register"]) {
  return matchingRegions(ids, (id) => `${id} holds the recorded row and column structure.`);
}

function grayboxBlock(overrides = {}) {
  return fixtures.grayboxBlock({
    capturedAt: CAPTURED_AT,
    runtimeMode: queryParameterMode(),
    comparison: { mode: "qualitative", regions: comparisonRegions() },
    ...overrides,
  });
}

function measuredGrayboxBlock(overrides = {}) {
  return grayboxBlock({
    comparison: { mode: "measured", regions: comparisonRegions() },
    ...overrides,
  });
}

function runCli(args, cwd) {
  const child = actualSpawnSync(
    process.execPath,
    [cli, ...args, "--json"],
    { cwd, encoding: "utf8", windowsHide: true },
  );
  let output;
  try {
    output = JSON.parse(child.stdout);
  } catch {
    output = { parseError: child.stdout, stderr: child.stderr };
  }
  return { ...child, output };
}

// --- D1 ------------------------------------------------------------------------------------------
// The kernel contract is 0 success, 1 invalid/error, 2 blocked, 3 measured fidelity mismatch. The
// wrapper used to collapse everything that was not 2 into 0, so a kernel that measured a fidelity
// mismatch and said so was reported to the caller as a clean success.

test("D1: a kernel exit status is propagated as returned rather than normalised to success", () => {
  const root = tempRoot("d1");

  function runArmed(response) {
    armedKernel = response;
    try {
      return cliCore.execute(["source", "audit", "--root", root, "--json"]);
    } finally {
      armedKernel = null;
    }
  }

  // Exit 3 is the defect: a measured fidelity mismatch used to leave the process with status 0 and
  // the report labelled `complete`, which is a gate announcing a result it was told it did not get.
  const mismatch = runArmed({ status: 3, stdout: JSON.stringify({ measured: true }) });
  assert.equal(mismatch.exitCode, 3);
  assert.notEqual(mismatch.exitCode, 0);
  assert.equal(mismatch.output.ok, true);
  assert.equal(mismatch.output.status, "fidelity-limited");
  assert.notEqual(mismatch.output.status, "complete");

  // The statuses that were already faithful stay faithful.
  const success = runArmed({ status: 0, stdout: JSON.stringify({ measured: false }) });
  assert.equal(success.exitCode, 0);
  assert.equal(success.output.status, "complete");

  const blocked = runArmed({ status: 2, stdout: JSON.stringify({ blocked: true }) });
  assert.equal(blocked.exitCode, 2);
  assert.equal(blocked.output.status, "blocked");

  // Exit 1 surfaces as 1, carrying the kernel's own message rather than a wrapper paraphrase.
  const failed = runArmed({ status: 1, stderr: "audit-capabilities: registry is unreadable" });
  assert.equal(failed.exitCode, 1);
  assert.equal(failed.output.ok, false);
  assert.equal(failed.output.error.code, "KERNEL_FAILED");
  assert.match(failed.output.error.message, /registry is unreadable/);

  // A signal-killed child - the 60s timeout kill in particular - leaves `error` unset and only
  // `signal` populated, so it is checked on its own and gets its own distinct code.
  const signaled = runArmed({ status: null, signal: "SIGTERM" });
  assert.equal(signaled.exitCode, 1);
  assert.notEqual(signaled.exitCode, 0);
  assert.equal(signaled.output.ok, false);
  assert.equal(signaled.output.error.code, "KERNEL_SIGNALED");
  assert.match(signaled.output.error.message, /SIGTERM/);

  // Neither a status nor a signal is not a success either, and neither is a status the wrapper has
  // never heard of: an unrecognised status is surfaced, never rounded down to 0.
  const statusless = runArmed({ status: null, signal: null });
  assert.equal(statusless.exitCode, 1);
  assert.equal(statusless.output.error.code, "KERNEL_STATUS_MISSING");

  const unsupported = runArmed({ status: 7, stdout: "{}" });
  assert.equal(unsupported.exitCode, 1);
  assert.equal(unsupported.output.error.code, "KERNEL_STATUS_UNSUPPORTED");
  assert.match(unsupported.output.error.message, /unsupported status 7/);

  // A spawn that never started keeps the code it always had; the new codes did not absorb it.
  const spawnError = runArmed({ status: null, error: new Error("spawn ENOENT") });
  assert.equal(spawnError.exitCode, 1);
  assert.equal(spawnError.output.error.code, "KERNEL_FAILED");

  // Nothing above changed how an unstubbed kernel behaves.
  const live = cliCore.execute(["source", "audit", "--root", root, "--json"]);
  assert.equal(live.exitCode, 0);
  assert.equal(live.output.status, "complete");
});

// --- D2 ------------------------------------------------------------------------------------------
// Absence of evidence was being read as evidence. A change with no reference document, and a
// document that never names a source, both used to hardcode `resolvable: true`, so a comparison
// claiming `measured` was accepted as fidelity evidence with nothing on disk behind it.

test("D2: a measured comparison with no source on disk is not ready and is not fidelity evidence", () => {
  // The probe verbatim: a root holding a graybox capture and a reconstruction carrier, nothing else.
  const unrecorded = tempRoot("d2-unrecorded");
  writeArtifact(unrecorded, "graybox.png");
  writeJson(unrecorded, "reconstruction.json", { graybox: measuredGrayboxBlock() });
  assert.equal(fs.existsSync(path.join(unrecorded, "reference-evidence.json")), false);

  const noDocument = checkReconstruction(unrecorded, { stage: "graybox" });
  assert.notEqual(noDocument.status, "ready");
  assert.equal(noDocument.status, "blocked");
  assert.equal(noDocument.fidelityEvidence, false);
  assert.equal(noDocument.measurable, false);
  assert.equal(noDocument.source.resolvable, false);
  assert.ok(noDocument.reasons.includes("reference-source-unrecorded"));
  // The declared mode is reported as declared: a claim the gate refused is never quietly rewritten
  // into the qualitative one it would have accepted.
  assert.equal(noDocument.comparisonMode, "measured");

  // The same for a reference document that is present and simply never names a source. The legacy
  // `resolved` availability survives - an older change keeps its geometry behaviour - but it
  // resolves nothing, and the measured claim blocks on a reason that names that, not on some other
  // change's problem.
  const undeclared = tempRoot("d2-undeclared");
  writeArtifact(undeclared, "graybox.png");
  writeJson(undeclared, "reconstruction.json", { graybox: measuredGrayboxBlock() });
  const sourceless = fixtures.planarReference();
  delete sourceless.source;
  writeJson(undeclared, "reference-evidence.json", sourceless);

  const noSource = checkReconstruction(undeclared, { stage: "graybox" });
  assert.notEqual(noSource.status, "ready");
  assert.equal(noSource.reason, "reference-source-undeclared");
  assert.equal(noSource.source.availability, "resolved");
  assert.equal(noSource.source.resolvable, false);
  assert.equal(noSource.measurable, false);
  assert.equal(noSource.fidelityEvidence, false);
  // Each refusal keeps its own reason: neither of these is the pending-source story.
  assert.equal(noSource.reasons.includes("reference-source-unrecorded"), false);
  assert.equal(noSource.reasons.includes("source-pending"), false);

  // A source that is declared and actually on disk still measures, so the fix blocks the unbacked
  // claim rather than the measured chain.
  const resolved = tempRoot("d2-resolved");
  writeArtifact(resolved, "graybox.png");
  writeArtifact(resolved, "reference.png");
  writeJson(resolved, "reconstruction.json", { graybox: measuredGrayboxBlock() });
  writeJson(resolved, "reference-evidence.json", fixtures.planarReference());
  const measured = checkReconstruction(resolved, { stage: "graybox" });
  assert.equal(measured.status, "ready");
  assert.equal(measured.measurable, true);
  assert.equal(measured.fidelityEvidence, true);
});

// --- D3 ------------------------------------------------------------------------------------------
// The graybox stage reads its region binding out of `reference-evidence.json`. A parse failure held
// quietly in the source state while the verdict said `ready` was the stage reporting on a document
// it never managed to open - and it was only noticed on the measured path, where measurability
// happened to consult the same state.

test("D3: an unparseable reference document blocks the graybox stage on the qualitative path", () => {
  const root = tempRoot("d3");
  writeArtifact(root, "graybox.png");
  writeJson(root, "reconstruction.json", { graybox: grayboxBlock() });
  writeArtifact(root, "reference-evidence.json", "{ this is not json");

  const result = checkReconstruction(root, { stage: "graybox" });
  // A qualitative comparison never asks whether the source is measurable, which is exactly why this
  // path used to reach `ready` with an unreadable document sitting beside it.
  assert.equal(result.comparisonMode, "qualitative");
  assert.notEqual(result.status, "ready");
  assert.equal(result.status, "blocked");
  assert.notDeepEqual(result.reasons, []);
  assert.equal(result.reason, "reference-source-unparseable");
  assert.equal(result.source.invalid.reason, "reference-source-unparseable");
  assert.match(result.blockers.join("\n"), /cannot be parsed/);
  assert.match(result.blockers.join("\n"), /unreadable reference document/);
  // The fault is reported once, by the reason that names it, rather than falling through to the
  // generic measurability refusal.
  assert.equal(result.reasons.includes("graybox-comparison-unmeasurable"), false);

  // A document that is present and readable still passes: unreadable is the fault, not present.
  writeJson(root, "reference-evidence.json", fixtures.planarReference());
  assert.equal(checkReconstruction(root, { stage: "graybox" }).status, "ready");
});

// --- D4 ------------------------------------------------------------------------------------------
// Two carriers holding a graybox block is an authoring error, not a precedence question. Returning
// the first holder let an approved block in `reconstruction.json` stand in for a rejected block in
// `reference-evidence.json` - the gate reporting on a block while a block that says the opposite
// sits unread in the same change.

test("D4: two carriers holding a graybox block conflict instead of one masking the other", () => {
  const root = tempRoot("d4");
  writeArtifact(root, "graybox.png");
  writeArtifact(root, "reference.png");
  writeJson(root, "reconstruction.json", {
    graybox: grayboxBlock({
      approval: { status: "approved", evidence: "Layout-only capture reviewed against the reference." },
    }),
  });
  writeJson(root, "reference-evidence.json", fixtures.planarReference({
    graybox: grayboxBlock({
      approval: { status: "rejected", evidence: "The board and register structure was wrong." },
    }),
  }));

  const conflicted = checkReconstruction(root, { stage: "graybox" });
  assert.notEqual(conflicted.status, "ready");
  assert.equal(conflicted.status, "blocked");
  assert.equal(conflicted.reason, "graybox-carrier-conflict");
  // Both holders are named, because the repair is to delete one and the author has to know which.
  assert.match(conflicted.blockers.join("\n"), /reconstruction\.json/);
  assert.match(conflicted.blockers.join("\n"), /reference-evidence\.json/);
  // No winner is picked and neither block is validated, so nothing is reported as the block that
  // was checked.
  assert.equal(conflicted.carrier, null);
  assert.equal(conflicted.graybox, null);
  assert.equal(conflicted.artifact, null);
  // The approved block never masks the rejected one, and the rejection is not smuggled in either:
  // the disagreement itself is the whole verdict.
  assert.equal(conflicted.reasons.includes("graybox-approval-rejected"), false);
  assert.deepEqual(conflicted.reasons, ["graybox-carrier-conflict"]);

  // Keeping exactly one carrier is what clears it - and the one that survives is the one that gets
  // reported, whichever verdict it holds.
  const referenceOnly = fixtures.planarReference({
    graybox: grayboxBlock({
      approval: { status: "rejected", evidence: "The board and register structure was wrong." },
    }),
  });
  fs.rmSync(path.join(root, "reconstruction.json"));
  writeJson(root, "reference-evidence.json", referenceOnly);
  const rejected = checkReconstruction(root, { stage: "graybox" });
  assert.equal(rejected.status, "blocked");
  assert.equal(rejected.carrier, "reference-evidence.json");
  assert.ok(rejected.reasons.includes("graybox-approval-rejected"));
});

// --- D5 ------------------------------------------------------------------------------------------
// The modal `rows x columns` structure used to come from a strictly-greater scan over a Map, which
// kept whichever tied key was written first. That let an author flip the verdict by re-sorting the
// table: the same four regions passed in one order and failed in the other.

test("D5: an exact tie in region structure produces the same verdict in either row order", () => {
  const declared = {
    A: { id: "A", rows: 1, columns: 3, breaksFrom: [] },
    B: { id: "B", rows: 1, columns: 3, breaksFrom: ["A"] },
    C: { id: "C", rows: 5, columns: 7, breaksFrom: [] },
    D: { id: "D", rows: 5, columns: 7, breaksFrom: [] },
  };
  function composition(order) {
    return { uniform: false, regions: order.map((id) => declared[id]) };
  }

  function verdict(order) {
    try {
      validateComposition(composition(order));
      return { threw: false, message: null };
    } catch (error) {
      return { threw: true, message: error.message };
    }
  }

  const written = verdict(["A", "B", "C", "D"]);
  const reordered = verdict(["C", "D", "A", "B"]);

  // Both orders block, and they block with the byte-identical message: the modal keys are sorted,
  // so even the text naming the tie cannot depend on how the table was written.
  assert.equal(written.threw, true);
  assert.equal(reordered.threw, true);
  assert.equal(written.message, reordered.message);
  assert.match(written.message, /composition ambiguity:/);
  assert.match(written.message, /1x3 and 5x7 each describe 2 region\(s\)/);
  // C and D are the regions nothing accounts for; A is named by B, and B names what it breaks from.
  assert.match(written.message, /so C, D cannot be read as following a norm/);
  // A tie is an ambiguity, not a contradiction, and it does not borrow the contradiction reason.
  assert.equal(written.message.includes("composition contradiction"), false);

  // A tie that is fully accounted for is still valid, in either order: the rule added is "no region
  // gets a free pass when nothing is modal", not "a tie is illegal".
  const accounted = {
    board: { id: "board", rows: 2, columns: 1, breaksFrom: ["register"] },
    register: { id: "register", rows: 1, columns: 3, breaksFrom: [] },
  };
  assert.deepEqual(
    validateComposition({ uniform: false, regions: [accounted.board, accounted.register] }),
    ["board", "register"],
  );
  assert.deepEqual(
    validateComposition({ uniform: false, regions: [accounted.register, accounted.board] }),
    ["register", "board"],
  );
});

// --- F5 ------------------------------------------------------------------------------------------
// Keying the composition and intent requirements on the declared version alone made `v1` a switch
// that turned the whole checklist off. A document could carry a current-era graybox block, declare
// the older version, and have its comparison bound against a composition that was never recorded -
// so a region id nothing declares was checked against nothing and passed.

test("F5: a v1 document carrying a graybox block cannot escape the composition binding", () => {
  const undeclaredRegion = grayboxBlock({
    comparison: { mode: "qualitative", regions: comparisonRegions(["region-that-does-not-exist"]) },
  });

  // A v1 label on a document carrying a v2-era graybox block is current work wearing a stale
  // version string, not an older document, so it is validated as v2 and owes what v2 owes.
  assert.throws(
    () => validateReferenceEvidence(fixtures.fixedCameraReference({ graybox: undeclaredRegion })),
    (error) => {
      assert.match(error.message, /schema era mismatch:/);
      assert.match(error.message, /carries the v2-era graybox block/);
      assert.match(error.message, /must record intent and composition/);
      return true;
    },
  );

  const root = tempRoot("f5-era");
  writeArtifact(root, "graybox.png");
  writeJson(root, "reference-evidence.json", fixtures.fixedCameraReference({ graybox: undeclaredRegion }));
  assert.throws(() => checkReferenceEvidence(root), /schema era mismatch:/);

  // Once the document declares what it actually is, the binding it was dodging does its job: a
  // comparison naming a region the composition never declares is rejected outright.
  assert.throws(
    () => validateReferenceEvidence(fixtures.planarReference({ graybox: undeclaredRegion })),
    /names an undeclared composition region id region-that-does-not-exist/,
  );

  // And the same document naming the declared regions validates, so the rule closes the hole
  // without closing the route.
  const bound = fixtures.planarReference({ graybox: grayboxBlock() });
  assert.equal(validateReferenceEvidence(bound), bound);
});

test("F5: a genuine legacy v1 document with no v2-era construct still validates unchanged", () => {
  // An ABSENT `intent` and an ABSENT `composition` on a v1 document are a real signal about its age.
  // Nothing is retroactively required of it, and it is not retroactively invalid.
  const legacy = fixtures.fixedCameraReference();
  assert.equal(Object.hasOwn(legacy, "intent"), false);
  assert.equal(Object.hasOwn(legacy, "composition"), false);
  assert.equal(Object.hasOwn(legacy, "graybox"), false);
  assert.equal(validateReferenceEvidence(legacy), legacy);

  // Volunteering a composition is supplying more evidence, not entering the v2 era, so it stays
  // valid too: `composition` is deliberately not one of the constructs that triggers the rule.
  const withComposition = fixtures.fixedCameraReference({
    composition: fixtures.boardRegisterComposition(),
  });
  assert.equal(validateReferenceEvidence(withComposition), withComposition);

  // Still valid is not the same as still passing: the aggregate blocks it on the stage it owes,
  // reporting a contract that read cleanly rather than a document that failed to parse.
  const root = tempRoot("f5-legacy");
  writeJson(root, "reference-evidence.json", legacy);
  const aggregate = checkReferenceEvidence(root);
  assert.equal(aggregate.contractValid, true);
  assert.equal(aggregate.status, "blocked");
  assert.equal(aggregate.reason, "graybox-missing");
});

// --- F8 ------------------------------------------------------------------------------------------
// A gate an agent has to remember to run separately is not a gate. `reference check` is the command
// the agent is told to run, and it used to report `ready` on a change that had a reference and no
// Spec Reconciliation section at all - the reconciliation gate existed, and nothing forced it.

test("F8: the aggregate reference check surfaces reconciliation and cannot be ready while it blocks", () => {
  const root = tempRoot("f8");
  writeArtifact(root, "graybox.png");
  writeArtifact(root, "reference.png");
  writeArtifact(root, "reference.md", "# Reference\n\nThe planar HUD clock treatment.\n");
  writeJson(root, "reference-evidence.json", fixtures.planarReference({ graybox: grayboxBlock() }));
  writeArtifact(root, "design.md", "# Change Design\n\n## Product Design Output\n\nProse.\n");

  // Every stage the reference carrier knows about is in order, so the carrier gate on its own says
  // ready. That is the false green: the only thing between an agent and it was remembering to type
  // a second command.
  const carrierOnly = checkReferenceEvidence(root);
  assert.equal(carrierOnly.status, "ready");
  assert.equal(checkSpecReconciliation(root).status, "blocked");

  const blocked = runCli(["reference", "check", "--root", root, "--change-root", "."], root);
  assert.equal(blocked.status, 2, blocked.stderr || JSON.stringify(blocked.output));
  assert.equal(blocked.output.status, "blocked");
  assert.notEqual(blocked.output.status, "ready");
  assert.equal(blocked.output.reason, "reconciliation-section-missing");
  // The stage is reported on every call, beside the stages that passed, not only when it fails.
  assert.equal(blocked.output.stages.reconciliation.status, "blocked");
  assert.equal(blocked.output.stages.reconciliation.reason, "reconciliation-section-missing");
  assert.equal(blocked.output.stages.graybox.status, "ready");
  // The stage's own blockers trail the aggregate's, so the report says what to repair.
  assert.match(blocked.output.blockers.join("\n"), /Spec Reconciliation/);

  // Writing the section is what clears the aggregate, and the stage stays visible when it passes.
  writeArtifact(root, "design.md", [
    "# Change Design",
    "",
    "## Spec Reconciliation",
    "",
    `Graybox: \`graybox.png\`, captured ${CAPTURED_AT}`,
    `Reconciled: ${RECONCILED_AT}`,
    "",
    "| Value | Specified | Implemented | Cause |",
    "| --- | --- | --- | --- |",
    "",
  ].join("\n"));
  const cleared = runCli(["reference", "check", "--root", root, "--change-root", "."], root);
  assert.equal(cleared.status, 0, cleared.stderr || JSON.stringify(cleared.output));
  assert.equal(cleared.output.status, "ready");
  assert.equal(cleared.output.stages.reconciliation.status, "ready");
});

// --- F10 -----------------------------------------------------------------------------------------
// Applicability used to be keyed on `reference-evidence.json` / `reference.md` - two files no script
// in this repo writes. A reference-driven change therefore stayed `applicable: false` until the
// agent remembered to hand-author a carrier, which is the same not-forced pattern the gate exists
// to close. It is now keyed on manifests the scaffolder itself writes at `change init`.

test("F10: a freshly scaffolded reference-driven change is applicable before any carrier is written", () => {
  const projectRoot = tempRoot("f10");
  fs.mkdirSync(path.join(projectRoot, "openspec", "changes"), { recursive: true });
  for (const foundation of ["DESIGN.md", "MOTION.md"]) {
    fs.copyFileSync(path.join(repoRoot, foundation), path.join(projectRoot, foundation));
  }
  const scaffold = actualSpawnSync(
    process.execPath,
    [cloneInit, "--project-root", projectRoot, "--change-id", "carried-clone", "--url", "https://example.com"],
    { encoding: "utf8", windowsHide: true },
  );
  assert.equal(scaffold.status, 0, scaffold.stderr || scaffold.stdout);
  const changeRoot = path.join(projectRoot, "openspec", "changes", "carried-clone");

  // The crux: neither hand-authored carrier exists yet. A website clone reconstructs a site it did
  // not author, and `website-cloning.json` is written by the scaffolder, so the obligation is
  // recognised from the change's first moment.
  for (const carrier of ["reference-evidence.json", "reference.md"]) {
    assert.equal(fs.existsSync(path.join(changeRoot, carrier)), false, carrier);
  }
  assert.equal(fs.existsSync(path.join(changeRoot, "website-cloning.json")), true);

  const fresh = checkSpecReconciliation(changeRoot);
  assert.equal(fresh.applicable, true);
  assert.deepEqual(fresh.referenceSignals, ["website-cloning.json"]);
  // Applicable means the scaffolded placeholders are blockers rather than warnings: `<iso8601>` is
  // not a timestamp and the capture it names is not on disk, so an untouched stub cannot pass.
  assert.equal(fresh.status, "blocked");
  assert.ok(fresh.reasons.includes("reconciliation-timestamp-invalid"));
  assert.ok(fresh.reasons.includes("reconciliation-capture-missing"));
  assert.deepEqual(fresh.warnings, []);

  // An ABSENT manifest still keeps the carrier-only default: a change the scaffolders never touched
  // is a real legacy signal, and it is not dragged into the obligation.
  const untouched = tempRoot("f10-untouched");
  writeArtifact(untouched, "design.md", "# Change Design\n\n## Product Design Output\n\nProse.\n");
  const legacy = checkSpecReconciliation(untouched);
  assert.equal(legacy.applicable, false);
  assert.equal(legacy.status, "ready");
  assert.deepEqual(legacy.referenceSignals, []);

  // A manifest that is PRESENT but cannot be believed is not a legacy signal, it is a broken
  // document: while it is unreadable the gate cannot even decide whether the obligation exists, so
  // it blocks on its own authority instead of being downgraded to an `applicable: false` warning.
  const broken = tempRoot("f10-broken");
  writeArtifact(broken, "design.md", "# Change Design\n\n## Product Design Output\n\nProse.\n");
  writeArtifact(broken, "website-cloning.json", "{ not json");
  const unreadable = checkSpecReconciliation(broken);
  assert.equal(unreadable.status, "blocked");
  assert.equal(unreadable.reason, "reconciliation-manifest-unreadable");
  assert.equal(unreadable.applicable, false);
  assert.deepEqual(unreadable.warnings, []);
});

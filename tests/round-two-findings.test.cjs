"use strict";

// Round-two regression suite.
//
// The five spec deltas were implemented once and every reviewer came back with the same class of
// defect one layer up: the checks reported correctly when asked, and almost nothing forced them to
// be asked. Each test below is named after the finding it closes (F1..F10) so a future reviewer can
// map a failure straight back to the review that demanded it. None of these assert that a report is
// well formed - they assert that the gate fires without being invited to.

const assert = require("node:assert/strict");
const childProcess = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const referenceCore = require("../skill/scripts/reference-evidence-core.cjs");
const reconstructionCore = require("../skill/scripts/reconstruction-core.cjs");
const reconstructionContract = require("../skill/scripts/reconstruction-contract.cjs");
const {
  checkSpecReconciliation,
} = require("../skill/scripts/check-spec-reconciliation.cjs");
const {
  exactReconstruction,
  readyRoot,
} = require("./fixtures/reconstruction-fixture.cjs");
const fixtures = require("./helpers/reference-fixtures.cjs");

const {
  checkReferenceEvidence,
  validateComposition,
  validateReferenceEvidence,
} = referenceCore;
const { checkReconstruction } = reconstructionCore;
const {
  exactPlanarReference,
  matchingRegions,
  planarCues,
  queryParameterMode,
  resolvedSource,
  rootAttributeMode,
  writeArtifact,
  writeJson,
} = fixtures;

const repoRoot = path.resolve(__dirname, "..");
const cli = path.join(repoRoot, "skill", "scripts", "designer-pipeline.cjs");
const synthesisInit = path.join(repoRoot, "skill", "scripts", "init-design-synthesis.cjs");
const cloneInit = path.join(repoRoot, "skill", "scripts", "init-website-clone.cjs");

const CAPTURED_AT = "2026-02-11T09:00:00.000Z";
const RECONCILED_AT = "2026-02-12T09:00:00.000Z";

const createdRoots = new Set();

test.after(() => {
  for (const root of createdRoots) fs.rmSync(root, { recursive: true, force: true });
});

function track(root) {
  createdRoots.add(root);
  return fs.realpathSync(root);
}

function tempRoot(label = "round-two") {
  return track(fixtures.tempRoot(`design-pipeline-${label}-`));
}

function runCli(args, cwd) {
  const child = childProcess.spawnSync(
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

// --- shared documents -------------------------------------------------------------------------
// The shared composition names exactly the two region ids the graybox comparison addresses, so the
// bidirectional binding is satisfied by default and every failure below is the one under test.

// A 2.5d primary-target reference: the exact shape that used to reach `ready` with no graybox
// anywhere, because the graybox rule only covered the 3d and hybrid routes.
function planarReference(overrides = {}) {
  return fixtures.planarReference({
    intent: fixtures.directionalIntent({ role: "primary-target" }),
    ...overrides,
  });
}

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

// --- F1 ----------------------------------------------------------------------------------------

test("F1: the aggregate reference check blocks a 2.5d primary-target that has no graybox block", () => {
  const root = tempRoot("f1-aggregate");
  writeJson(root, "reference-evidence.json", planarReference());

  // Everything else about this change is in order - approved reference, resolved source, no
  // reconstruction owed - and that is exactly the state that used to report `ready` with no
  // structural proof of any kind on a planar route.
  const result = checkReferenceEvidence(root);
  assert.notEqual(result.status, "ready");
  assert.equal(result.status, "blocked");
  assert.equal(result.reason, "graybox-missing");
  assert.equal(result.contractValid, true);
  assert.match(result.blockers.join("\n"), /graybox block is missing/);
  // The stage is reported on every call, not only when someone thinks to ask for it.
  assert.equal(result.stages.graybox.status, "blocked");
  assert.equal(result.stages.graybox.reason, "graybox-missing");

  // The same holds on the exact-reconstruction route, where a fully measured geometry stage is not
  // permitted to carry the aggregate to ready on its own.
  const exactRoot = track(readyRoot());
  writeJson(exactRoot, "reference-evidence.json", exactPlanarReference());
  const exact = checkReferenceEvidence(exactRoot);
  assert.equal(exact.stages.geometry.status, "ready");
  assert.equal(exact.stages.graybox.status, "blocked");
  assert.notEqual(exact.status, "ready");
  assert.equal(exact.reason, "graybox-missing");

  // And the aggregate the agent is actually told to run exits non-zero.
  const cliResult = runCli(["reference", "check", "--root", root, "--change-root", "."], root);
  assert.equal(cliResult.status, 2, cliResult.stderr || cliResult.stdout);
  assert.equal(cliResult.output.ok, true);
  assert.equal(cliResult.output.status, "blocked");
  assert.equal(cliResult.output.reason, "graybox-missing");
});

test("F1: graybox.png is a required artifact on every route, not only 3d and hybrid", () => {
  const byRoute = {
    "2d": planarReference({
      route: "2d",
      classification: {
        objectDimensionality: "2d",
        cameraModel: "none",
        interactionModel: "none",
        outputSurface: "screen-space-ui",
        runtimeFamily: "flat-screen-ui",
      },
      spatialCues: Object.fromEntries(
        Object.keys(planarCues()).map((cue) => [cue, { present: false, evidence: "Reads flat." }]),
      ),
    }),
    "2.5d": planarReference(),
    "3d": planarReference({
      route: "3d",
      classification: {
        objectDimensionality: "3d",
        cameraModel: "fixed-perspective",
        interactionModel: "none",
        outputSurface: "locked-cinematic-frame",
        runtimeFamily: "shallow-relief-3d",
      },
      requiredArtifacts: ["reference.md", "scene.json", "3d.md", "graybox.png"],
    }),
    hybrid: planarReference({
      route: "hybrid",
      requiredArtifacts: ["reference.md", "scene.json", "3d.md", "graybox.png"],
    }),
  };

  for (const [route, reference] of Object.entries(byRoute)) {
    assert.doesNotThrow(() => validateReferenceEvidence(reference), `${route} baseline`);
    const withoutGraybox = {
      ...reference,
      requiredArtifacts: reference.requiredArtifacts.filter((item) => item !== "graybox.png"),
    };
    assert.throws(
      () => validateReferenceEvidence(withoutGraybox),
      /every reference route requires graybox\.png/,
      `${route} must still owe a graybox capture`,
    );
  }
});

// --- F2 ----------------------------------------------------------------------------------------

test("F2: a declared-resolved source whose file is absent grants no fidelity evidence", () => {
  const root = tempRoot("f2-unwritten-source");
  writeArtifact(root, "graybox.png");
  // `source.availability` says resolved and `source.path` names a raster - but nothing was ever
  // written there. Measurability is a property of the disk, never of the declaration.
  writeJson(root, "reference-evidence.json", planarReference({
    graybox: grayboxBlock({
      comparison: { mode: "measured", regions: comparisonRegions() },
    }),
  }));
  assert.equal(fs.existsSync(path.join(root, "reference.png")), false);

  const state = reconstructionCore.referenceSourceState(root);
  assert.equal(state.availability, "resolved");
  assert.equal(state.resolvable, false);

  const claimed = checkReconstruction(root, { stage: "graybox" });
  assert.notEqual(claimed.status, "ready");
  assert.equal(claimed.reason, "graybox-comparison-unmeasurable");
  assert.equal(claimed.measurable, false);
  assert.equal(claimed.fidelityEvidence, false);
  assert.match(claimed.blockers.join("\n"), /reference\.png/);

  // The only comparison this change can actually make is a qualitative one, and a qualitative
  // graybox passes the ordering gate while proving nothing about fidelity.
  writeJson(root, "reference-evidence.json", planarReference({ graybox: grayboxBlock() }));
  const qualitative = checkReconstruction(root, { stage: "graybox" });
  assert.equal(qualitative.status, "ready");
  assert.equal(qualitative.comparisonMode, "qualitative");
  assert.equal(qualitative.measurable, false);
  assert.equal(qualitative.fidelityEvidence, false);

  // Writing the declared raster is what changes the verdict - nothing else does.
  writeArtifact(root, "reference.png");
  writeJson(root, "reference-evidence.json", planarReference({
    graybox: grayboxBlock({
      comparison: { mode: "measured", regions: comparisonRegions() },
    }),
  }));
  const measured = checkReconstruction(root, { stage: "graybox" });
  assert.equal(measured.status, "ready");
  assert.equal(measured.measurable, true);
  assert.equal(measured.fidelityEvidence, true);
});

// --- F3 ----------------------------------------------------------------------------------------

// The point of F3 is agreement, so every case is evaluated through both carriers and the two
// verdicts are compared to each other. Asserting either one alone would let the pair drift.

function grayboxVerdict(result) {
  return {
    status: result.status,
    reason: result.reason,
    reasons: result.reasons,
    blockers: result.blockers,
    comparisonMode: result.comparisonMode,
    measurable: result.measurable,
    fidelityEvidence: result.fidelityEvidence,
  };
}

function attempt(fn) {
  try {
    return { ok: true, verdict: grayboxVerdict(fn()) };
  } catch (error) {
    return { ok: false, message: error.message };
  }
}

// `reference-evidence.json` holds the block; there is no reconstruction.json at all.
function throughReferenceCarrier(block) {
  const root = tempRoot("f3-reference-carrier");
  writeArtifact(root, "graybox.png");
  writeArtifact(root, "reference.png");
  writeJson(root, "reference-evidence.json", planarReference({ graybox: block }));
  return attempt(() => checkReconstruction(root, { stage: "graybox" }));
}

// `reconstruction.json` holds the block; the reference document is present but carries none.
function throughReconstructionCarrier(block) {
  const root = track(readyRoot(exactReconstruction({ graybox: block })));
  writeArtifact(root, "graybox.png");
  writeJson(root, "reference-evidence.json", planarReference());
  return attempt(() => checkReconstruction(root, { stage: "graybox" }));
}

function bothCarriers(block) {
  return {
    reference: throughReferenceCarrier(block),
    reconstruction: throughReconstructionCarrier(block),
  };
}

test("F3: one graybox contract - both carriers reach the same verdict on the same block", () => {
  // A single shared definition, not two that happen to agree today.
  assert.equal(referenceCore.validateGraybox, reconstructionContract.validateGraybox);
  assert.equal(reconstructionCore.validateGraybox, reconstructionContract.validateGraybox);
  assert.deepEqual(
    referenceCore.GRAYBOX_APPROVAL_STATUSES,
    ["pending", "approved", "rejected"],
  );

  // 1. The object form of runtimeMode: the layer-completeness check has to be reachable from
  //    reference-evidence.json, not only from reconstruction.json.
  const incomplete = bothCarriers(grayboxBlock({
    runtimeMode: rootAttributeMode({ disables: ["emissive", "optical"] }),
  }));
  assert.deepEqual(incomplete.reference, incomplete.reconstruction);
  assert.equal(incomplete.reference.ok, true);
  assert.equal(incomplete.reference.verdict.reason, "graybox-mode-incomplete");
  assert.match(incomplete.reference.verdict.blockers.join("\n"), /texture/);

  // 2. The bare string form stays contract-valid on both carriers, so a document does not become
  //    invalid by moving between them - but it names no disabled layers, so neither carrier can
  //    check it, and an unverifiable declaration blocks rather than passing. This assertion
  //    previously read `ready`, which let a declaration stand in for the check.
  const stringMode = bothCarriers(grayboxBlock({ runtimeMode: "?graybox=1" }));
  assert.deepEqual(stringMode.reference, stringMode.reconstruction);
  assert.equal(stringMode.reference.ok, true);
  assert.equal(stringMode.reference.verdict.status, "blocked");
  assert.equal(stringMode.reference.verdict.reason, "graybox-mode-unverifiable");

  // 3. One shared approval enum: a rejected approval is a blocked stage on both carriers, with the
  //    same reason string, and neither validator throws over it.
  const rejected = bothCarriers(grayboxBlock({
    approval: { status: "rejected", evidence: "The board register structure was wrong." },
  }));
  assert.deepEqual(rejected.reference, rejected.reconstruction);
  assert.equal(rejected.reference.ok, true);
  assert.equal(rejected.reference.verdict.reason, "graybox-approval-rejected");

  // 4. A status outside that enum is a loud contract failure on both carriers, with one message.
  const invalidStatus = bothCarriers(grayboxBlock({
    approval: { status: "declined", evidence: "Neither carrier gets its own vocabulary." },
  }));
  assert.deepEqual(invalidStatus.reference, invalidStatus.reconstruction);
  assert.equal(invalidStatus.reference.ok, false);
  assert.match(invalidStatus.reference.message, /approval\.status/);

  // 5. An approved block over an open region is refused identically on both carriers.
  const approvedOverOpen = bothCarriers(grayboxBlock({
    comparison: {
      mode: "qualitative",
      regions: [
        { id: "board", finding: "Board unit reads roughly 40% oversized.", status: "open" },
        { id: "register", finding: "Register label sits above the readout.", status: "matches" },
      ],
    },
  }));
  assert.deepEqual(approvedOverOpen.reference, approvedOverOpen.reconstruction);
  assert.equal(approvedOverOpen.reference.ok, false);
  assert.match(approvedOverOpen.reference.message, /cannot be approved while board remain open/);
});

// --- F4 ----------------------------------------------------------------------------------------

test("F4: an unreadable source declaration blocks with its own reason and measures nothing", () => {
  const root = track(readyRoot());
  const geometry = (document) => {
    if (typeof document === "string") writeArtifact(root, "reference-evidence.json", document);
    else writeJson(root, "reference-evidence.json", document);
    return checkReconstruction(root, { stage: "geometry" });
  };

  const cases = [
    {
      label: "availability null",
      document: { source: { ...resolvedSource(), availability: null } },
      reason: "reference-source-availability-invalid",
      blocker: /source\.availability null/,
    },
    {
      label: "availability unavailable",
      document: { source: { ...resolvedSource(), availability: "unavailable" } },
      reason: "reference-source-availability-invalid",
      blocker: /source\.availability "unavailable"/,
    },
    {
      label: "availability Pending",
      document: { source: { ...resolvedSource(), availability: "Pending" } },
      reason: "reference-source-availability-invalid",
      blocker: /source\.availability "Pending"/,
    },
    {
      label: "source as array",
      document: { source: [] },
      reason: "reference-source-malformed",
      blocker: /records source as an array/,
    },
    {
      label: "unparseable file",
      document: "{ this is not json",
      reason: "reference-source-unparseable",
      blocker: /cannot be parsed/,
    },
    {
      label: "empty file",
      document: "",
      reason: "reference-source-unparseable",
      blocker: /cannot be parsed/,
    },
  ];

  for (const scenario of cases) {
    const result = geometry(scenario.document);
    assert.equal(result.status, "blocked", scenario.label);
    assert.equal(result.reason, scenario.reason, scenario.label);
    assert.match(result.blockers.join("\n"), scenario.blocker, scenario.label);
    // A missing measurement is a status. It is never replaced by a default or a placeholder.
    assert.equal(result.measurements, null, scenario.label);
    assert.equal(result.stages.geometry.reason, scenario.reason, scenario.label);
  }

  // Three distinct failure modes keep three distinct reasons; they are not collapsed into one.
  assert.equal(new Set(cases.map((scenario) => scenario.reason)).size, 3);

  // Absent field and absent document are the legacy default, not a failure: documents written
  // before the pending state existed keep their behaviour.
  const absentField = geometry({ source: resolvedSource() });
  assert.equal(absentField.status, "ready");
  assert.equal(absentField.reason, null);
  assert.equal(absentField.source.availability, "resolved");
  assert.ok(absentField.measurements.count > 0);

  fs.rmSync(path.join(root, "reference-evidence.json"));
  const absentDocument = checkReconstruction(root, { stage: "geometry" });
  assert.equal(absentDocument.status, "ready");
  assert.equal(absentDocument.source.availability, "resolved");
  assert.ok(absentDocument.measurements.count > 0);
});

// --- F5 ----------------------------------------------------------------------------------------

test("F5: a new v2 reference with no composition block does not validate", () => {
  const reference = planarReference();
  delete reference.composition;
  assert.equal(reference.schema, referenceCore.SCHEMA_V2);
  assert.throws(
    () => validateReferenceEvidence(reference),
    /reference evidence: reference is missing composition/,
  );

  const root = tempRoot("f5-missing-composition");
  writeJson(root, "reference-evidence.json", reference);
  // The aggregate gate does not quietly report ready on a document it could not validate.
  assert.throws(() => checkReferenceEvidence(root), /missing composition/);
  const result = runCli(["reference", "check", "--root", root, "--change-root", "."], root);
  assert.notEqual(result.status, 0);
  assert.equal(result.output.ok, false);
  assert.match(result.output.error.message, /missing composition/);

  // v1 is the legacy carrier and predates the per-region checklist, so it stays valid without one.
  const legacy = {
    ...reference,
    schema: referenceCore.SCHEMA_V1,
  };
  delete legacy.intent;
  assert.doesNotThrow(() => validateReferenceEvidence(legacy));

  const schema = JSON.parse(fs.readFileSync(
    path.join(repoRoot, "skill", "references", "reference-evidence.schema.json"),
    "utf8",
  ));
  const v2Branch = schema.allOf.find(
    (entry) => entry.if?.properties?.schema?.const === referenceCore.SCHEMA_V2,
  );
  assert.ok(v2Branch.then.required.includes("composition"));
  assert.equal(schema.required.includes("composition"), false);
});

// --- F6 ----------------------------------------------------------------------------------------

test("F6: uniform false leaves no structurally divergent region unnamed", () => {
  // `board-b` departs from the modal 1x3 structure, records no breaksFrom, and is named by no
  // other region. One named exception elsewhere in the block does not excuse it.
  const unnamedDivergence = {
    uniform: false,
    regions: [
      { id: "row-a", rows: 1, columns: 3, breaksFrom: [] },
      { id: "row-b", rows: 1, columns: 3, breaksFrom: [] },
      { id: "board-b", rows: 2, columns: 1, breaksFrom: [] },
      { id: "masthead", rows: 2, columns: 2, breaksFrom: ["row-a"] },
    ],
  };
  assert.throws(() => validateComposition(unnamedDivergence), /composition contradiction/);
  assert.throws(() => validateComposition(unnamedDivergence), /board-b/);
  assert.throws(() => validateComposition(unnamedDivergence), /modal 1x3 structure/);
  assert.throws(
    () => validateReferenceEvidence(planarReference({ composition: unnamedDivergence })),
    /composition contradiction/,
  );

  // The shapes that were valid before this round stay valid: a divergent region that records what
  // it breaks from, and a divergent region that another region names.
  assert.deepEqual(
    validateComposition({
      uniform: false,
      regions: [
        { id: "register-1", rows: 2, columns: 1, breaksFrom: ["register-2", "register-3"] },
        { id: "register-2", rows: 1, columns: 3, breaksFrom: [] },
        { id: "register-3", rows: 1, columns: 3, breaksFrom: [] },
      ],
    }),
    ["register-1", "register-2", "register-3"],
  );
  assert.deepEqual(
    validateComposition({
      uniform: false,
      regions: [
        { id: "board", rows: 2, columns: 1, breaksFrom: ["register"] },
        { id: "register", rows: 1, columns: 3, breaksFrom: [] },
      ],
    }),
    ["board", "register"],
  );
});

// --- F7 ----------------------------------------------------------------------------------------

test("F7: an undeclared comparison region id is refused through the graybox stage on both carriers", () => {
  const foreign = grayboxBlock({
    comparison: {
      mode: "qualitative",
      regions: comparisonRegions(["board", "register", "nonsense-region"]),
    },
  });
  const undeclared = /names an undeclared composition region id nonsense-region/;

  // The stage itself refuses on both carriers, with the same message - not only
  // `validateReferenceEvidence`, which only ever sees the reference carrier.
  const viaReference = throughReferenceCarrier(foreign);
  const viaReconstruction = throughReconstructionCarrier(foreign);
  assert.equal(viaReference.ok, false);
  assert.equal(viaReconstruction.ok, false);
  assert.equal(viaReference.message, viaReconstruction.message);
  assert.match(viaReference.message, undeclared);

  // The inverse binding holds on both carriers too: a comparison that skips a declared region is
  // refused rather than treated as complete.
  const partial = grayboxBlock({
    comparison: { mode: "qualitative", regions: comparisonRegions(["board"]) },
  });
  const partialReference = throughReferenceCarrier(partial);
  const partialReconstruction = throughReconstructionCarrier(partial);
  assert.equal(partialReference.ok, false);
  assert.equal(partialReference.message, partialReconstruction.message);
  assert.match(partialReference.message, /must address every composition region id: missing register/);

  // And the aggregate never launders an unvalidatable block into ready. On the reconstruction
  // carrier it surfaces as a blocked graybox stage; on the reference carrier the document itself is
  // contract-invalid and the gate refuses loudly rather than returning a status at all.
  const reconstructionRoot = track(readyRoot(exactReconstruction({ graybox: foreign })));
  writeArtifact(reconstructionRoot, "graybox.png");
  writeJson(reconstructionRoot, "reference-evidence.json", planarReference());
  const aggregate = checkReferenceEvidence(reconstructionRoot);
  assert.notEqual(aggregate.status, "ready");
  assert.equal(aggregate.reason, "graybox-invalid");
  assert.match(aggregate.blockers.join("\n"), undeclared);
  assert.equal(aggregate.stages.graybox.status, "blocked");

  const referenceRoot = tempRoot("f7-reference-carrier");
  writeArtifact(referenceRoot, "graybox.png");
  writeArtifact(referenceRoot, "reference.png");
  writeJson(referenceRoot, "reference-evidence.json", planarReference({ graybox: foreign }));
  assert.throws(() => checkReferenceEvidence(referenceRoot), undeclared);
});

// --- F8 ----------------------------------------------------------------------------------------

function reconciliationSection(lines) {
  return [
    "# Change Design",
    "",
    "## Product Design Output",
    "",
    "The planar HUD clock treatment.",
    "",
    "## Spec Reconciliation",
    "",
    ...lines,
    "",
  ].join("\n");
}

function reconciliationRoot(design, { capture = true } = {}) {
  const root = tempRoot("f8-reconciliation");
  writeJson(root, "reference-evidence.json", planarReference());
  if (capture) writeArtifact(root, "graybox.png");
  if (design !== null) writeArtifact(root, "design.md", design);
  return root;
}

test("F8: the spec reconciliation section is owed by every change that has a reference", () => {
  // A change with a reference and no section at all. Silence is not "nothing changed".
  const missingSection = reconciliationRoot(
    "# Change Design\n\n## Product Design Output\n\nThe planar HUD clock treatment.\n",
  );
  const missing = checkSpecReconciliation(missingSection);
  assert.equal(missing.status, "blocked");
  assert.equal(missing.reason, "reconciliation-section-missing");
  assert.equal(missing.applicable, true);
  assert.deepEqual(missing.referenceSignals, ["reference-evidence.json"]);
  assert.equal(missing.specDrift, null);

  const cliMissing = runCli(
    ["reconciliation", "check", "--root", missingSection, "--change-root", "."],
    missingSection,
  );
  assert.equal(cliMissing.status, 2, cliMissing.stderr || cliMissing.stdout);
  assert.equal(cliMissing.output.reason, "reconciliation-section-missing");

  // An empty table is the valid way to record that no value moved.
  const emptyTable = reconciliationRoot(reconciliationSection([
    `Graybox: \`graybox.png\`, captured ${CAPTURED_AT}`,
    `Reconciled: ${RECONCILED_AT}`,
    "",
    "| Value | Specified | Implemented | Cause |",
    "| --- | --- | --- | --- |",
  ]));
  const empty = checkSpecReconciliation(emptyTable);
  assert.equal(empty.status, "ready");
  assert.equal(empty.reason, null);
  assert.deepEqual(empty.blockers, []);
  assert.equal(empty.specDrift.changedValues, 0);
  assert.deepEqual(empty.specDrift.rows, []);
  assert.equal(empty.specDrift.graybox.exists, true);

  // Prose in place of the table is a declaration, not a result.
  const prose = reconciliationRoot(reconciliationSection([
    `Graybox: \`graybox.png\`, captured ${CAPTURED_AT}`,
    `Reconciled: ${RECONCILED_AT}`,
    "",
    "Nothing changed between the spec and the implementation.",
  ]));
  assert.equal(checkSpecReconciliation(prose).reason, "reconciliation-table-missing");

  // A cited capture that is not on disk cannot be what the spec was written against.
  const citedButAbsent = reconciliationRoot(reconciliationSection([
    `Graybox: \`never-captured.png\`, captured ${CAPTURED_AT}`,
    `Reconciled: ${RECONCILED_AT}`,
    "",
    "| Value | Specified | Implemented | Cause |",
    "| --- | --- | --- | --- |",
    "| board unit | clamp(6px, 1.35vw, 18px) | clamp(7px, 2.62vw, 36px) "
    + "| render showed the board roughly 40% oversized |",
  ]));
  const absentCapture = checkSpecReconciliation(citedButAbsent);
  assert.equal(absentCapture.status, "blocked");
  assert.equal(absentCapture.reason, "reconciliation-capture-missing");
  assert.match(absentCapture.blockers.join("\n"), /never-captured\.png/);
  assert.equal(absentCapture.specDrift.graybox.exists, false);
  // The rows that did parse are still reported, so the drift record never overstates or hides.
  assert.equal(absentCapture.specDrift.changedValues, 1);
  assert.equal(absentCapture.specDrift.rows[0].causeVerdict, "observation");
});

// --- F10 ---------------------------------------------------------------------------------------

function scaffoldedChange(script, args, changeId) {
  const projectRoot = tempRoot("f10-project");
  fs.mkdirSync(path.join(projectRoot, "openspec", "changes"), { recursive: true });
  for (const foundation of ["DESIGN.md", "MOTION.md"]) {
    fs.copyFileSync(path.join(repoRoot, foundation), path.join(projectRoot, foundation));
  }
  const result = childProcess.spawnSync(
    process.execPath,
    [script, "--project-root", projectRoot, "--change-id", changeId, ...args],
    { encoding: "utf8", windowsHide: true },
  );
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return path.join(projectRoot, "openspec", "changes", changeId);
}

test("F10: a scaffolded change is not born blocked but its placeholders can never pass", () => {
  const scaffolds = [
    scaffoldedChange(
      synthesisInit,
      ["--problem", "Design an operations console for support leads handling urgent escalations"],
      "scaffolded-synthesis",
    ),
    scaffoldedChange(cloneInit, ["--url", "https://example.com"], "scaffolded-clone"),
  ];

  for (const changeRoot of scaffolds) {
    const design = fs.readFileSync(path.join(changeRoot, "design.md"), "utf8");
    const tasks = fs.readFileSync(path.join(changeRoot, "tasks.md"), "utf8");
    assert.match(design, /^## Spec Reconciliation$/m, changeRoot);
    assert.match(design, /\| Value \| Specified \| Implemented \| Cause \|/, changeRoot);
    assert.match(tasks, /Spec Reconciliation/, changeRoot);

    // A freshly scaffolded change has no reference carrier yet, so the section is not owed and the
    // stub reports ready with warnings rather than blocking a change that has done nothing wrong.
    const fresh = checkSpecReconciliation(changeRoot);
    assert.equal(fresh.status, "ready", changeRoot);
    assert.equal(fresh.applicable, false, changeRoot);
    assert.deepEqual(fresh.blockers, [], changeRoot);
    assert.ok(fresh.warnings.length > 0, changeRoot);

    // The moment a reference lands the same untouched stub blocks: the placeholders do not parse,
    // so a scaffolded value can never be mistaken for a filled-in one.
    writeJson(changeRoot, "reference-evidence.json", planarReference());
    const owed = checkSpecReconciliation(changeRoot);
    assert.equal(owed.status, "blocked", changeRoot);
    assert.ok(owed.reasons.includes("reconciliation-timestamp-invalid"), changeRoot);
    assert.ok(owed.reasons.includes("reconciliation-capture-missing"), changeRoot);

    // Filling it in honestly is what clears the gate.
    writeArtifact(changeRoot, "graybox.png");
    const filled = design.replace(
      /Graybox: `graybox\.png`, captured <iso8601>\r?\nReconciled: <iso8601>/,
      `Graybox: \`graybox.png\`, captured ${CAPTURED_AT}\nReconciled: ${RECONCILED_AT}`,
    );
    assert.notEqual(filled, design, `${changeRoot}: expected the scaffolded placeholder lines`);
    writeArtifact(changeRoot, "design.md", filled);
    const reconciled = checkSpecReconciliation(changeRoot);
    assert.equal(reconciled.status, "ready", `${changeRoot}: ${reconciled.blockers.join("; ")}`);
    assert.equal(reconciled.specDrift.changedValues, 0, changeRoot);
  }
});

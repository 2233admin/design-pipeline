"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const { evaluateBenchmark } = require("../skill/scripts/benchmark-core.cjs");
const { canonicalJson, sha256 } = require("../skill/scripts/contract-utils.cjs");

const CANDIDATE = "acme-model-1@design-pipeline";
const BASELINE = "acme-model-1@naked";
const DIMENSION = "visual-taste";
const SCENARIO = "quality-dashboard";
const COMPARISON = `${DIMENSION}/c1`;
const TARGET = "1".repeat(64);
const SNAPSHOT = `sha256:${"2".repeat(64)}`;
const POLICY = "3".repeat(64);
const NONCE = crypto.randomBytes(32).toString("hex");

function seal(body) {
  return { ...body, receiptHash: sha256(canonicalJson(body)) };
}

function digestOf(document) {
  return `sha256:${sha256(canonicalJson(document))}`;
}

function workspace(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "judgment-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, "staging"));
  fs.mkdirSync(path.join(root, "anchors"));
  return root;
}

function writeJson(root, relative, value) {
  fs.writeFileSync(path.join(root, relative), canonicalJson(value));
  return relative;
}

function writeBytes(root, relative, content) {
  fs.writeFileSync(path.join(root, relative), content);
  return sha256(Buffer.from(content));
}

function anchors() {
  return Object.fromEntries([0, 1, 2, 3, 4, 5].map((level) => [String(level), `level ${level} guidance`]));
}

// A digest-bound rubric and a digest-bound, attributed human reference corpus on disk. Both are
// recomputed by the projector, so placeholder digests cannot pass.
function foundations(root) {
  const rubric = { schema: "design-pipeline.judgment-rubric.v1", id: "anchored-visual-rubric", dimensions: [{ id: DIMENSION, anchors: anchors() }] };
  const rubricPath = writeJson(root, "anchors/rubric.json", rubric);
  const referenceSha = writeBytes(root, "anchors/human-1.png", "human reference surface");
  const referenceSet = {
    schema: "design-pipeline.human-reference-set.v1",
    id: "human-reference-set-1",
    carrier: "desktop-web-dashboard",
    viewingScale: { width: 1440, height: 900 },
    entries: [{ id: "human-1", path: "anchors/human-1.png", sha256: referenceSha, source: "https://example.com/case-study", attribution: "Studio Example, 2025" }],
  };
  const referenceSetPath = writeJson(root, "anchors/reference-set.json", referenceSet);
  return {
    rubricPath,
    rubricDigest: digestOf(rubric),
    referenceSetPath,
    referenceSetDigest: digestOf(referenceSet),
  };
}

function policy(root, overrides = {}) {
  const base = foundations(root);
  return {
    rubricId: "anchored-visual-rubric",
    judgeId: "vlm-judge-1",
    judgedDimensions: [DIMENSION],
    bothOrders: true,
    humanSpotCheckFraction: 1,
    minHumanAgreement: 0.7,
    referenceSetId: "human-reference-set-1",
    ...base,
    binding: { targetIdentityDigest: TARGET, snapshotDigest: SNAPSHOT, policyDigest: POLICY },
    ...overrides,
  };
}

// Neutral staging: basenames are `<label>-<slot>`, so no path says which arm produced it.
function evidenceSets(root) {
  return Object.fromEntries(["A", "B"].map((label) => [label, [{
    id: "hero",
    kind: "screenshot",
    viewport: { width: 1440, height: 900 },
    path: `staging/${label}-hero.png`,
    sha256: writeBytes(root, `staging/${label}-hero.png`, `${label} rendered hero`),
  }]]));
}

function commitment(labels, nonce) {
  return sha256(canonicalJson({ labels, nonce }));
}

function plan(root, resolved, committed, overrides = {}) {
  return seal({
    schema: "design-pipeline.judgment-plan.v1",
    benchmarkId: "baseline-1",
    scenarioId: SCENARIO,
    rubricId: resolved.rubricId,
    rubricDigest: resolved.rubricDigest,
    referenceSetId: resolved.referenceSetId,
    referenceSetDigest: resolved.referenceSetDigest,
    judgedDimensions: [DIMENSION],
    targetIdentityDigest: TARGET,
    snapshotDigest: SNAPSHOT,
    policyDigest: POLICY,
    unblindingCommitment: committed,
    armDeliveryReceiptHashes: { A: "a".repeat(64), B: "b".repeat(64) },
    armEvidenceReceiptHashes: { A: "c".repeat(64), B: "d".repeat(64) },
    taskBrief: { prompt: "Design an operations dashboard.", evaluatorExpectations: ["real data states"] },
    evidence: evidenceSets(root),
    pairs: [
      { pairId: "c1-order1", comparisonId: "c1", dimension: DIMENSION, order: 1, left: "A", right: "B" },
      { pairId: "c1-order2", comparisonId: "c1", dimension: DIMENSION, order: 2, left: "B", right: "A" },
    ],
    ...overrides,
  });
}

function unblinding(planHash, labels = { A: CANDIDATE, B: BASELINE }, nonce = NONCE) {
  return seal({
    schema: "design-pipeline.judgment-unblinding.v1",
    planHash,
    nonce,
    labels,
  });
}

function receipt(planHash, resolved, verdicts, spotCheck) {
  return seal({
    schema: "design-pipeline.judgment-receipt.v1",
    planHash,
    scenarioId: SCENARIO,
    judgeId: resolved.judgeId,
    rubricDigest: resolved.rubricDigest,
    referenceSetDigest: resolved.referenceSetDigest,
    verdicts,
    humanSpotCheck: { reviewer: "reviewer-1", reviewedAt: "2026-09-17T00:00:00Z", verdicts: spotCheck },
  });
}

// A wins both orders: order 1 picks left (A), order 2 picks right (A).
const A_WINS = [{ pairId: "c1-order1", choice: "left" }, { pairId: "c1-order2", choice: "right" }];
// The orders disagree: each picks whatever sits on the left, so position decided it.
const POSITION_FLIP = [{ pairId: "c1-order1", choice: "left" }, { pairId: "c1-order2", choice: "left" }];

function scenarioRow(overrides = {}) {
  return {
    id: SCENARIO,
    operation: "generate",
    dimension: "visual-quality",
    required: true,
    threshold: 0.6,
    evidenceType: "judgment-receipt",
    prompt: "Design an operations dashboard.",
    privateExpectations: ["real data states"],
    ...overrides,
  };
}

function manifest(resolved) {
  return {
    schema: "design-pipeline.benchmark-manifest.v3",
    id: "baseline-1",
    benchmarkPurpose: "design-quality",
    candidateSystem: CANDIDATE,
    systems: [CANDIDATE, BASELINE],
    systemChannels: { [CANDIDATE]: "stable", [BASELINE]: "stable" },
    fairness: {
      samePrompts: true, sameEnvironmentClass: true, evaluatorBlind: true,
      expectedAnswersHidden: true, freshContext: true, representativeDelivery: true,
    },
    requiredDimensions: ["visual-quality"],
    scenarios: [scenarioRow()],
    judgmentPolicy: resolved,
  };
}

function inputs(t, options = {}) {
  const root = workspace(t);
  const resolved = policy(root, options.policy);
  const labels = options.labels || { A: CANDIDATE, B: BASELINE };
  const planned = plan(root, resolved, commitment(labels, NONCE), options.plan);
  writeJson(root, "plan.json", planned);
  writeJson(root, "unblinding.json", unblinding(options.planHashOverride || planned.receiptHash, labels));
  writeJson(root, "receipt.json", receipt(planned.receiptHash, resolved, options.verdicts || A_WINS, options.spotCheck || [{ comparison: COMPARISON, choice: "A" }]));
  return {
    root,
    manifest: manifest(resolved),
    measurements: {
      schema: "design-pipeline.benchmark-measurements.v3",
      benchmarkId: "baseline-1",
      measurements: options.rawMeasurements || {},
      fidelity: {},
      judgments: options.judgments === null ? {} : {
        [SCENARIO]: { planPath: "plan.json", unblindingPath: "unblinding.json", receiptPath: "receipt.json" },
      },
    },
  };
}

test("a verified judgment projects complementary arm scores and passes the candidate", (t) => {
  const { root, manifest: input, measurements } = inputs(t);
  const result = evaluateBenchmark(input, measurements, { projectRoot: root });
  assert.equal(result.status, "passed");
  assert.equal(result.aggregate, 1);
  assert.deepEqual(result.failedRequired, []);
  const scores = Object.fromEntries(result.scenarios.map((row) => [row.system, row.score]));
  assert.equal(scores[CANDIDATE] + scores[BASELINE], 1);
  assert.equal(scores[CANDIDATE], 1);
  const projected = result.judgments[SCENARIO];
  assert.equal(projected.status, "measured");
  assert.equal(projected.calibration.method, "raw-agreement");
  assert.equal(projected.calibration.agreement, 1);
  assert.equal(projected.tally.orderDisagreements, 0);
});

test("a hand-written score cannot bypass judgment for a visual-quality scenario", (t) => {
  const { root, manifest: input, measurements } = inputs(t, {
    rawMeasurements: { [CANDIDATE]: { [SCENARIO]: { score: 0.9, evidence: ["trust-me.json"] } } },
  });
  assert.throws(() => evaluateBenchmark(input, measurements, { projectRoot: root }), /cannot take a raw score/);
});

test("orders that disagree count as one tie, not one win each", (t) => {
  const { root, manifest: input, measurements } = inputs(t, {
    verdicts: POSITION_FLIP,
    spotCheck: [{ comparison: COMPARISON, choice: "tie" }],
  });
  const result = evaluateBenchmark(input, measurements, { projectRoot: root });
  const projected = result.judgments[SCENARIO];
  assert.equal(projected.tally.ties, 1);
  assert.equal(projected.tally.orderDisagreements, 1);
  assert.deepEqual(projected.tally.wins, { [CANDIDATE]: 0, [BASELINE]: 0 });
  const scores = Object.fromEntries(result.scenarios.map((row) => [row.system, row.score]));
  assert.equal(scores[CANDIDATE], 0.5);
  // A tie is not lift, so the candidate does not clear its 0.6 threshold.
  assert.equal(result.status, "failed");
});

test("a spot check that disagrees with the judge blocks the scenario", (t) => {
  const { root, manifest: input, measurements } = inputs(t, { spotCheck: [{ comparison: COMPARISON, choice: "B" }] });
  const result = evaluateBenchmark(input, measurements, { projectRoot: root });
  assert.equal(result.status, "blocked");
  assert.equal(result.judgments[SCENARIO].status, "blocked");
  assert.match(result.judgments[SCENARIO].calibration.reasons[0], /human agreement 0 < 0.7/);
  assert.deepEqual(result.failedRequired, []);
});

test("a missing judgment leaves the scenario unknown and blocks the run", (t) => {
  const { root, manifest: input, measurements } = inputs(t, { judgments: null });
  const result = evaluateBenchmark(input, measurements, { projectRoot: root });
  assert.equal(result.status, "blocked");
  assert.deepEqual(result.unknownRequired, [`${CANDIDATE}/${SCENARIO}`]);
});

test("a spot check sampling one presentation order instead of the comparison is refused", (t) => {
  const { root, manifest: input, measurements } = inputs(t, { spotCheck: [{ pairId: "c1-order1", choice: "A" }] });
  assert.throws(() => evaluateBenchmark(input, measurements, { projectRoot: root }), /must sample a comparison, not one presentation order/);
});

test("a self-reported agreement figure is refused", (t) => {
  const { root, manifest: input, measurements } = inputs(t);
  const stored = JSON.parse(fs.readFileSync(path.join(root, "receipt.json"), "utf8"));
  const { receiptHash, ...body } = stored;
  body.humanSpotCheck = { ...body.humanSpotCheck, humanAgreement: 1 };
  writeJson(root, "receipt.json", seal(body));
  assert.throws(() => evaluateBenchmark(input, measurements, { projectRoot: root }), /must not self-report an agreement figure/);
});

test("an unblinded verdict is refused as broken blindness", (t) => {
  const { root, manifest: input, measurements } = inputs(t);
  const stored = JSON.parse(fs.readFileSync(path.join(root, "receipt.json"), "utf8"));
  const { receiptHash, ...body } = stored;
  body.verdicts = [{ pairId: "c1-order1", choice: "left", winner: CANDIDATE }, { pairId: "c1-order2", choice: "right" }];
  writeJson(root, "receipt.json", seal(body));
  assert.throws(() => evaluateBenchmark(input, measurements, { projectRoot: root }), /blindness is broken/);
});

test("a plan embedding the unblinding map is refused because its hash leaks the mapping", (t) => {
  const { root, manifest: input, measurements } = inputs(t, { plan: { unblinding: { A: CANDIDATE, B: BASELINE } } });
  assert.throws(() => evaluateBenchmark(input, measurements, { projectRoot: root }), /must not embed the unblinding map/);
});

test("an unblinding map naming an arm outside the manifest is refused", (t) => {
  const { root, manifest: input, measurements } = inputs(t, { labels: { A: CANDIDATE, B: "invented-opponent@naked" } });
  assert.throws(() => evaluateBenchmark(input, measurements, { projectRoot: root }), /is not the manifest's systems/);
});

test("an unblinding map bound to another plan is refused", (t) => {
  const { root, manifest: input, measurements } = inputs(t, { planHashOverride: "e".repeat(64) });
  assert.throws(() => evaluateBenchmark(input, measurements, { projectRoot: root }), /not bound to this plan/);
});

test("a placeholder rubric digest is refused because the rubric is recomputed", (t) => {
  const { root, manifest: input, measurements } = inputs(t, { policy: { rubricDigest: `sha256:${"a".repeat(64)}` } });
  assert.throws(() => evaluateBenchmark(input, measurements, { projectRoot: root }), /digest .* does not match the declared/);
});

test("asymmetric evidence is refused even when both sides are screenshots", (t) => {
  const { root, manifest: input, measurements } = inputs(t);
  const stored = JSON.parse(fs.readFileSync(path.join(root, "plan.json"), "utf8"));
  const { receiptHash, ...body } = stored;
  const extraSha = writeBytes(root, "staging/A-detail.png", "extra candidate render");
  body.evidence.A = [...body.evidence.A, { id: "detail", kind: "screenshot", viewport: { width: 1440, height: 900 }, path: "staging/A-detail.png", sha256: extraSha }];
  const resealed = seal(body);
  writeJson(root, "plan.json", resealed);
  writeJson(root, "unblinding.json", unblinding(resealed.receiptHash));
  assert.throws(() => evaluateBenchmark(input, measurements, { projectRoot: root }), /same evidence slots/);
});

test("an arm-revealing staging path is refused", (t) => {
  const { root, manifest: input, measurements } = inputs(t);
  const stored = JSON.parse(fs.readFileSync(path.join(root, "plan.json"), "utf8"));
  const { receiptHash, ...body } = stored;
  const sha = writeBytes(root, "staging/candidate-hero.png", "candidate rendered hero");
  body.evidence.A = [{ ...body.evidence.A[0], path: "staging/candidate-hero.png", sha256: sha }];
  const resealed = seal(body);
  writeJson(root, "plan.json", resealed);
  writeJson(root, "unblinding.json", unblinding(resealed.receiptHash));
  assert.throws(() => evaluateBenchmark(input, measurements, { projectRoot: root }), /neutral basename/);
});

test("a judgment plan bound to another target snapshot is stale", (t) => {
  const { root, manifest: input, measurements } = inputs(t, { plan: { snapshotDigest: `sha256:${"9".repeat(64)}` } });
  assert.throws(() => evaluateBenchmark(input, measurements, { projectRoot: root }), /stale for snapshotDigest/);
});

test("both arms sharing one delivery receipt is refused as a single execution", (t) => {
  const { root, manifest: input, measurements } = inputs(t, { plan: { armDeliveryReceiptHashes: { A: "a".repeat(64), B: "a".repeat(64) } } });
  assert.throws(() => evaluateBenchmark(input, measurements, { projectRoot: root }), /not distinct executions/);
});

test("a comparison judged in only one order is refused", (t) => {
  const { root, manifest: input, measurements } = inputs(t, {
    plan: { pairs: [{ pairId: "c1-order1", comparisonId: "c1", dimension: DIMENSION, order: 1, left: "A", right: "B" }] },
    verdicts: [{ pairId: "c1-order1", choice: "left" }],
  });
  assert.throws(() => evaluateBenchmark(input, measurements, { projectRoot: root }), /must be judged exactly twice/);
});

test("a second order that does not swap sides is refused", (t) => {
  const { root, manifest: input, measurements } = inputs(t, {
    plan: {
      pairs: [
        { pairId: "c1-order1", comparisonId: "c1", dimension: DIMENSION, order: 1, left: "A", right: "B" },
        { pairId: "c1-order2", comparisonId: "c1", dimension: DIMENSION, order: 2, left: "A", right: "B" },
      ],
    },
  });
  assert.throws(() => evaluateBenchmark(input, measurements, { projectRoot: root }), /does not swap sides between orders/);
});

test("a tampered judgment receipt is refused", (t) => {
  const { root, manifest: input, measurements } = inputs(t);
  const stored = JSON.parse(fs.readFileSync(path.join(root, "receipt.json"), "utf8"));
  writeJson(root, "receipt.json", { ...stored, verdicts: POSITION_FLIP });
  assert.throws(() => evaluateBenchmark(input, measurements, { projectRoot: root }), /receiptHash does not match its body/);
});

test("a rubric missing an anchor level is refused", (t) => {
  const { root, manifest: input, measurements } = inputs(t);
  const rubric = { schema: "design-pipeline.judgment-rubric.v1", id: "anchored-visual-rubric", dimensions: [{ id: DIMENSION, anchors: { 0: "a", 1: "b", 2: "c", 3: "d", 4: "e" } }] };
  writeJson(root, "anchors/rubric.json", rubric);
  input.judgmentPolicy = { ...input.judgmentPolicy, rubricDigest: digestOf(rubric) };
  const stored = JSON.parse(fs.readFileSync(path.join(root, "plan.json"), "utf8"));
  const { receiptHash, ...body } = stored;
  body.rubricDigest = digestOf(rubric);
  const resealed = seal(body);
  writeJson(root, "plan.json", resealed);
  writeJson(root, "unblinding.json", unblinding(resealed.receiptHash));
  const receiptStored = JSON.parse(fs.readFileSync(path.join(root, "receipt.json"), "utf8"));
  const { receiptHash: _ignored, ...receiptBody } = receiptStored;
  writeJson(root, "receipt.json", seal({ ...receiptBody, planHash: resealed.receiptHash, rubricDigest: digestOf(rubric) }));
  assert.throws(() => evaluateBenchmark(input, measurements, { projectRoot: root }), /anchors\[5\]/);
});

test("an unattributed human reference entry is refused", (t) => {
  const { root, manifest: input, measurements } = inputs(t);
  const set = JSON.parse(fs.readFileSync(path.join(root, "anchors/reference-set.json"), "utf8"));
  delete set.entries[0].attribution;
  writeJson(root, "anchors/reference-set.json", set);
  input.judgmentPolicy = { ...input.judgmentPolicy, referenceSetDigest: digestOf(set) };
  const stored = JSON.parse(fs.readFileSync(path.join(root, "plan.json"), "utf8"));
  const { receiptHash, ...body } = stored;
  body.referenceSetDigest = digestOf(set);
  const resealed = seal(body);
  writeJson(root, "plan.json", resealed);
  writeJson(root, "unblinding.json", unblinding(resealed.receiptHash));
  const receiptStored = JSON.parse(fs.readFileSync(path.join(root, "receipt.json"), "utf8"));
  const { receiptHash: _ignored, ...receiptBody } = receiptStored;
  writeJson(root, "receipt.json", seal({ ...receiptBody, planHash: resealed.receiptHash, referenceSetDigest: digestOf(set) }));
  assert.throws(() => evaluateBenchmark(input, measurements, { projectRoot: root }), /attribution is required/);
});

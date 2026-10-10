"use strict";

// Layer C projection. The properties this module exists to protect, each of which was a real hole
// in an earlier draft:
//
// 1. Blindness is cryptographic, not declared. The judge receives a public plan that contains no
//    arm identity, and the label-to-arm mapping lives in a separate sealed receipt with a salt.
//    Sealing the mapping inside the plan would leak it: with only two possible mappings, anyone
//    holding the plan hash and the two arm ids could enumerate both canonical bodies and compare
//    hashes. The mapping receipt binds to the public plan hash, so it cannot be swapped either.
// 2. Verdicts name a side, never an arm. An unblinded verdict is a rejected receipt.
// 3. The judge has material to judge with: each blinded label carries a hash-verified rendered
//    evidence set, both labels present the same kinds of evidence, and one shared task brief
//    describes the work - never a per-arm brief.
// 4. Coverage is checked: every comparison answered in both orders with the sides swapped.
// 5. One comparison is one sample. Orders that disagree are a tie, not a win each.
// 6. The rubric and the human reference set are loaded and their digests recomputed. A declared
//    digest that matches nothing on disk is what makes "anchored" and "frozen" decoration.
// 7. Human agreement is recomputed from the recorded sample, never self-reported.
// 8. The arms judged are exactly the manifest's systems, so a plan cannot score the candidate
//    against an invented opponent.

const fs = require("node:fs");
const { canonicalJson, fail, readJson, resolveInside, sha256 } = require("./contract-utils.cjs");

const BARE_HASH = /^[a-f0-9]{64}$/;
const PREFIXED_DIGEST = /^sha256:[a-f0-9]{64}$/;
const LABELS = ["A", "B"];
const SIDES = ["left", "right"];
const CHOICES = [...SIDES, "tie"];
const PLAN_SCHEMA = "design-pipeline.judgment-plan.v1";
const UNBLINDING_SCHEMA = "design-pipeline.judgment-unblinding.v1";
const RECEIPT_SCHEMA = "design-pipeline.judgment-receipt.v1";
const RUBRIC_SCHEMA = "design-pipeline.judgment-rubric.v1";
const REFERENCE_SET_SCHEMA = "design-pipeline.human-reference-set.v1";
const EVIDENCE_KINDS = ["screenshot", "viewport-set", "motion"];
const ANCHOR_LEVELS = [0, 1, 2, 3, 4, 5];

function invalid(message, code = "JUDGMENT_PLAN_INVALID") {
  fail("judgment", message, { code });
}

function assertHash(value, label) {
  if (typeof value !== "string" || !BARE_HASH.test(value)) invalid(`${label} must be a bare 64-character sha256 hash`, "JUDGMENT_DIGEST_INVALID");
}

function assertDigest(value, label) {
  if (typeof value !== "string" || !PREFIXED_DIGEST.test(value)) invalid(`${label} must be a sha256:-prefixed digest`, "JUDGMENT_DIGEST_INVALID");
}

function nonEmptyString(value, label) {
  if (typeof value !== "string" || !value.trim()) invalid(`${label} is required`);
}

function sealed(value, label) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) invalid(`${label} must be an object`, "JUDGMENT_RECEIPT_INVALID");
  const { receiptHash, ...body } = value;
  assertHash(receiptHash, `${label}.receiptHash`);
  if (sha256(canonicalJson(body)) !== receiptHash) invalid(`${label}.receiptHash does not match its body`, "JUDGMENT_RECEIPT_TAMPERED");
  return receiptHash;
}

function seal(body) {
  return { ...body, receiptHash: sha256(canonicalJson(body)) };
}

function contained(projectRoot, raw, label) {
  const file = resolveInside(projectRoot, raw, label, { scope: "judgment" });
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) invalid(`${label} references a file that does not exist`, "JUDGMENT_FILE_MISSING");
  return file;
}

// A loaded document's digest is recomputed from its own canonical bytes, so a policy digest is a
// claim about content rather than a label anyone can type.
function loadDigested(projectRoot, raw, label, schema, declared) {
  const file = contained(projectRoot, raw, label);
  const document = readJson(file, label);
  if (document?.schema !== schema) invalid(`${label} must declare ${schema}`, "JUDGMENT_DOCUMENT_INVALID");
  const digest = `sha256:${sha256(canonicalJson(document))}`;
  if (digest !== declared) invalid(`${label} digest ${digest} does not match the declared ${declared}`, "JUDGMENT_DIGEST_STALE");
  return document;
}

function validateRubric(rubric, judgedDimensions) {
  if (!Array.isArray(rubric.dimensions) || !rubric.dimensions.length) invalid("rubric.dimensions must not be empty", "JUDGMENT_RUBRIC_INVALID");
  const covered = new Set();
  for (const [index, dimension] of rubric.dimensions.entries()) {
    const label = `rubric.dimensions[${index}]`;
    nonEmptyString(dimension?.id, `${label}.id`);
    covered.add(dimension.id);
    if (dimension.anchors === null || typeof dimension.anchors !== "object" || Array.isArray(dimension.anchors)) invalid(`${label}.anchors must map each level to written guidance`, "JUDGMENT_RUBRIC_INVALID");
    for (const level of ANCHOR_LEVELS) {
      // An unanchored level is where a judge starts inventing its own scale.
      nonEmptyString(dimension.anchors[String(level)], `${label}.anchors[${level}]`);
    }
  }
  const missing = judgedDimensions.filter((dimension) => !covered.has(dimension));
  if (missing.length) invalid(`rubric has no anchors for ${missing.join(", ")}`, "JUDGMENT_RUBRIC_INCOMPLETE");
}

function validateReferenceSet(projectRoot, set) {
  nonEmptyString(set.id, "reference set.id");
  nonEmptyString(set.carrier, "reference set.carrier");
  if (set.viewingScale === null || typeof set.viewingScale !== "object" || Array.isArray(set.viewingScale)) invalid("reference set.viewingScale is required", "JUDGMENT_REFERENCE_SET_INVALID");
  for (const key of ["width", "height"]) {
    if (!Number.isInteger(set.viewingScale[key]) || set.viewingScale[key] <= 0) invalid(`reference set.viewingScale.${key} must be a positive integer`, "JUDGMENT_REFERENCE_SET_INVALID");
  }
  if (!Array.isArray(set.entries) || !set.entries.length) invalid("reference set.entries must not be empty", "JUDGMENT_REFERENCE_SET_INVALID");
  for (const [index, entry] of set.entries.entries()) {
    const label = `reference set.entries[${index}]`;
    nonEmptyString(entry?.id, `${label}.id`);
    // Provenance matters: an anchor corpus of unattributed images is not human reference work.
    nonEmptyString(entry.source, `${label}.source`);
    nonEmptyString(entry.attribution, `${label}.attribution`);
    assertHash(entry.sha256, `${label}.sha256`);
    const file = contained(projectRoot, entry.path, `${label}.path`);
    if (sha256(fs.readFileSync(file)) !== entry.sha256) invalid(`${label} bytes do not match its declared sha256`, "JUDGMENT_REFERENCE_SET_STALE");
  }
}

// Evidence is verified against bytes on disk before the judge is asked to look at it, and its
// staging path must be neutral: a path like `candidate/hero.png` leaks the arm as loudly as a
// label would.
function verifyEvidenceSet(projectRoot, set, blinded, label) {
  if (!Array.isArray(set) || !set.length) invalid(`${label} must list at least one rendered artifact`, "JUDGMENT_EVIDENCE_MISSING");
  const slots = new Map();
  for (const [index, item] of set.entries()) {
    const itemLabel = `${label}[${index}]`;
    nonEmptyString(item?.id, `${itemLabel}.id`);
    if (slots.has(item.id)) invalid(`${itemLabel}.id is duplicated`);
    if (!EVIDENCE_KINDS.includes(item.kind)) invalid(`${itemLabel}.kind must be one of ${EVIDENCE_KINDS.join(", ")}`, "JUDGMENT_EVIDENCE_INVALID");
    assertHash(item.sha256, `${itemLabel}.sha256`);
    const shape = { kind: item.kind };
    if (item.kind === "motion") {
      if (!Number.isInteger(item.durationMs) || item.durationMs <= 0) invalid(`${itemLabel}.durationMs must be a positive integer`, "JUDGMENT_EVIDENCE_INVALID");
      if (!Number.isInteger(item.frames) || item.frames <= 0) invalid(`${itemLabel}.frames must be a positive integer`, "JUDGMENT_EVIDENCE_INVALID");
      shape.durationMs = item.durationMs;
      shape.frames = item.frames;
    } else {
      if (item.viewport === null || typeof item.viewport !== "object" || Array.isArray(item.viewport)) invalid(`${itemLabel}.viewport is required`, "JUDGMENT_EVIDENCE_INVALID");
      for (const key of ["width", "height"]) {
        if (!Number.isInteger(item.viewport[key]) || item.viewport[key] <= 0) invalid(`${itemLabel}.viewport.${key} must be a positive integer`, "JUDGMENT_EVIDENCE_INVALID");
      }
      shape.viewport = { width: item.viewport.width, height: item.viewport.height };
    }
    // Neutral staging: the only permitted basename is `<label>-<slot>`, so the path carries the
    // blinded label and nothing about which arm produced it.
    const expected = `${blinded}-${item.id}`;
    const basename = String(item.path).split("/").pop().replace(/\.[^.]+$/, "");
    if (basename !== expected) invalid(`${itemLabel}.path must be staged under the neutral basename ${expected}`, "JUDGMENT_EVIDENCE_NOT_NEUTRAL");
    const file = contained(projectRoot, item.path, `${itemLabel}.path`);
    if (sha256(fs.readFileSync(file)) !== item.sha256) invalid(`${itemLabel} bytes do not match its declared sha256`, "JUDGMENT_EVIDENCE_STALE");
    slots.set(item.id, shape);
  }
  return slots;
}

// Both sides must present the same slots with the same shape. Comparing one screenshot against
// ten is not a fair comparison even when both are "screenshots".
function assertEvidenceSymmetry(sets) {
  const [a, b] = LABELS.map((label) => sets[label]);
  const keysA = [...a.keys()].sort();
  const keysB = [...b.keys()].sort();
  if (keysA.join(",") !== keysB.join(",")) invalid(`both blinded labels must present the same evidence slots; A has ${keysA.join(", ") || "none"} and B has ${keysB.join(", ") || "none"}`, "JUDGMENT_EVIDENCE_ASYMMETRIC");
  for (const key of keysA) {
    if (canonicalJson(a.get(key)) !== canonicalJson(b.get(key))) invalid(`evidence slot ${key} differs in shape between the two labels`, "JUDGMENT_EVIDENCE_ASYMMETRIC");
  }
}

// Judgment carries the same target binding the rest of the pipeline's receipts carry, so a
// screenshot pair cannot be replayed against a different target, snapshot, or policy.
function validatePlanLineage(plan, binding) {
  assertHash(plan.targetIdentityDigest, "judgment plan.targetIdentityDigest");
  // Committed before judging, opened after. Without this the mapping could be chosen to fit the
  // verdicts.
  assertHash(plan.unblindingCommitment, "judgment plan.unblindingCommitment");
  assertHash(plan.policyDigest, "judgment plan.policyDigest");
  // One shared target snapshot: both arms answer the same brief against the same target state.
  // Per-arm snapshots would mean the two arms were not comparable in the first place.
  assertDigest(plan.snapshotDigest, "judgment plan.snapshotDigest");
  // Distinct executions are proven by distinct delivery and evidence receipts, not by pretending
  // the arms ran against different targets.
  for (const key of ["armDeliveryReceiptHashes", "armEvidenceReceiptHashes"]) {
    const map = plan[key];
    if (map === null || typeof map !== "object" || Array.isArray(map)) invalid(`judgment plan.${key} must be keyed by blinded label`, "JUDGMENT_LINEAGE_INVALID");
    if (Object.keys(map).sort().join(",") !== LABELS.join(",")) invalid(`judgment plan.${key} must be keyed by exactly ${LABELS.join(" and ")}`, "JUDGMENT_LINEAGE_INVALID");
    for (const label of LABELS) assertHash(map[label], `judgment plan.${key}.${label}`);
    if (map.A === map.B) invalid(`judgment plan.${key} maps both labels to the same receipt, so the two arms are not distinct executions`, "JUDGMENT_LINEAGE_INVALID");
  }
  // The binding is mandatory and complete: an optional or partial comparison would let arbitrary
  // plan lineage through.
  if (binding === null || typeof binding !== "object" || Array.isArray(binding)) invalid("judgmentPolicy.binding is required", "JUDGMENT_LINEAGE_INVALID");
  for (const key of ["targetIdentityDigest", "snapshotDigest", "policyDigest"]) {
    if (binding[key] !== plan[key]) invalid(`judgment plan is stale for ${key}`, "JUDGMENT_LINEAGE_STALE");
  }
}

function validateTaskBrief(plan) {
  const brief = plan.taskBrief;
  if (brief === null || typeof brief !== "object" || Array.isArray(brief)) invalid("judgment plan.taskBrief is required so the judge knows what was asked");
  nonEmptyString(brief.prompt, "judgment plan.taskBrief.prompt");
  if (!Array.isArray(brief.evaluatorExpectations) || !brief.evaluatorExpectations.length) invalid("judgment plan.taskBrief.evaluatorExpectations must not be empty");
  if (brief.evaluatorExpectations.some((entry) => typeof entry !== "string" || !entry.trim())) invalid("judgment plan.taskBrief.evaluatorExpectations must be non-empty strings");
  for (const label of LABELS) {
    if (Object.hasOwn(brief, label)) invalid(`judgment plan.taskBrief must not carry per-label text for ${label}`, "JUDGMENT_BLINDNESS_BROKEN");
  }
}

// The public plan. It is the judge's copy verbatim: no arm identity, no mapping, nothing that
// could be enumerated back into one.
function validatePublicPlan(projectRoot, plan, policy) {
  const planHash = sealed(plan, "judgment plan");
  if (plan.schema !== PLAN_SCHEMA) invalid(`judgment plan must declare ${PLAN_SCHEMA}`);
  if (Object.hasOwn(plan, "unblinding")) invalid("judgment plan must not embed the unblinding map; two candidate mappings can be enumerated against its hash", "JUDGMENT_BLINDNESS_BROKEN");
  nonEmptyString(plan.scenarioId, "judgment plan.scenarioId");
  nonEmptyString(plan.benchmarkId, "judgment plan.benchmarkId");
  assertDigest(plan.rubricDigest, "judgment plan.rubricDigest");
  assertDigest(plan.referenceSetDigest, "judgment plan.referenceSetDigest");
  if (!Array.isArray(plan.judgedDimensions) || !plan.judgedDimensions.length) invalid("judgment plan.judgedDimensions must not be empty");
  // Equality, not a subset: a plan that quietly drops a policy dimension would still produce a
  // full visual-quality score while never judging part of the rubric.
  if ([...plan.judgedDimensions].sort().join(",") !== [...policy.judgedDimensions].sort().join(",")) {
    invalid(`judgment plan judges ${plan.judgedDimensions.join(", ")}, but the policy requires exactly ${policy.judgedDimensions.join(", ")}`, "JUDGMENT_DIMENSION_COVERAGE");
  }
  if (plan.rubricDigest !== policy.rubricDigest) invalid("judgment plan rubric digest does not match the policy", "JUDGMENT_RUBRIC_STALE");
  if (plan.referenceSetDigest !== policy.referenceSetDigest) invalid("judgment plan reference-set digest does not match the policy", "JUDGMENT_REFERENCE_SET_STALE");
  validateTaskBrief(plan);

  const evidence = plan.evidence;
  if (evidence === null || typeof evidence !== "object" || Array.isArray(evidence)) invalid("judgment plan.evidence must carry a set per blinded label", "JUDGMENT_EVIDENCE_MISSING");
  if (Object.keys(evidence).sort().join(",") !== LABELS.join(",")) invalid(`judgment plan.evidence must be keyed by exactly ${LABELS.join(" and ")}`, "JUDGMENT_EVIDENCE_INVALID");
  const sets = Object.fromEntries(LABELS.map((label) => [label, verifyEvidenceSet(projectRoot, evidence[label], label, `judgment plan.evidence.${label}`)]));
  assertEvidenceSymmetry(sets);
  validatePlanLineage(plan, policy.binding);

  if (!Array.isArray(plan.pairs) || !plan.pairs.length) invalid("judgment plan.pairs must not be empty");
  const seen = new Set();
  const comparisons = new Map();
  for (const [index, pair] of plan.pairs.entries()) {
    const label = `judgment plan.pairs[${index}]`;
    nonEmptyString(pair?.pairId, `${label}.pairId`);
    if (seen.has(pair.pairId)) invalid(`${label}.pairId is duplicated`);
    seen.add(pair.pairId);
    nonEmptyString(pair.comparisonId, `${label}.comparisonId`);
    if (!plan.judgedDimensions.includes(pair.dimension)) invalid(`${label}.dimension is outside the plan's judged dimensions`);
    if (![1, 2].includes(pair.order)) invalid(`${label}.order must be 1 or 2`);
    if (!LABELS.includes(pair.left) || !LABELS.includes(pair.right) || pair.left === pair.right) invalid(`${label} must place both blinded labels on opposite sides`);
    const key = `${pair.dimension}/${pair.comparisonId}`;
    comparisons.set(key, [...(comparisons.get(key) || []), pair]);
  }
  for (const [key, group] of comparisons) {
    if (group.length !== 2) invalid(`comparison ${key} must be judged exactly twice, once per order`, "JUDGMENT_ORDERS_INCOMPLETE");
    const [first, second] = [...group].sort((a, b) => a.order - b.order);
    if (first.order === second.order) invalid(`comparison ${key} is not planned in both orders`, "JUDGMENT_ORDERS_INCOMPLETE");
    if (first.left !== second.right || first.right !== second.left) invalid(`comparison ${key} does not swap sides between orders`, "JUDGMENT_ORDERS_NOT_SWAPPED");
  }

  // Every judged dimension needs at least one comparison, otherwise it is judged in name only.
  for (const dimension of plan.judgedDimensions) {
    if (!plan.pairs.some((pair) => pair.dimension === dimension)) invalid(`judged dimension ${dimension} has no planned comparison`, "JUDGMENT_DIMENSION_COVERAGE");
  }
  loadDigested(projectRoot, policy.rubricPath, "rubric", RUBRIC_SCHEMA, policy.rubricDigest);
  return { plan, planHash, comparisons };
}

// The private mapping, revealed after judging. Salt alone would only stop enumeration, not
// post-hoc remapping: after seeing left/right verdicts a caller could mint whichever mapping makes
// the candidate win, since both bind to the same plan. So the plan commits in advance to
// `sha256(canonicalJson({labels, nonce}))` - a plan-independent opening body, which avoids a hash
// cycle - and the reveal must reproduce that commitment exactly.
function unblindingCommitment(labels, nonce) {
  return sha256(canonicalJson({ labels, nonce }));
}

function validateUnblinding(mapping, plan, planHash, systems, candidateSystem) {
  sealed(mapping, "judgment unblinding");
  if (mapping.schema !== UNBLINDING_SCHEMA) invalid(`judgment unblinding must declare ${UNBLINDING_SCHEMA}`, "JUDGMENT_UNBLINDING_INVALID");
  if (mapping.planHash !== planHash) invalid("judgment unblinding is not bound to this plan", "JUDGMENT_UNBLINDING_MISMATCH");
  assertHash(mapping.nonce, "judgment unblinding.nonce");
  const labels = mapping.labels;
  if (labels === null || typeof labels !== "object" || Array.isArray(labels)) invalid("judgment unblinding.labels must map blinded labels to arms", "JUDGMENT_UNBLINDING_INVALID");
  if (Object.keys(labels).sort().join(",") !== LABELS.join(",")) invalid(`judgment unblinding.labels must be keyed by exactly ${LABELS.join(" and ")}`, "JUDGMENT_UNBLINDING_INVALID");
  const arms = LABELS.map((label) => labels[label]);
  if (arms.some((arm) => typeof arm !== "string" || !arm)) invalid("judgment unblinding.labels must name an arm per label", "JUDGMENT_UNBLINDING_INVALID");
  if (arms[0] === arms[1]) invalid("judgment unblinding.labels must map the two labels to different arms", "JUDGMENT_UNBLINDING_INVALID");
  if (unblindingCommitment(labels, mapping.nonce) !== plan.unblindingCommitment) {
    invalid("judgment unblinding does not open the plan's commitment; the mapping was changed after the plan was published", "JUDGMENT_UNBLINDING_UNCOMMITTED");
  }
  // The arms judged must be exactly the manifest's systems: no invented opponent, no missing one.
  if ([...arms].sort().join(",") !== [...systems].sort().join(",")) {
    invalid(`judgment unblinding judges ${arms.join(" and ")}, which is not the manifest's systems ${systems.join(" and ")}`, "JUDGMENT_SYSTEMS_MISMATCH");
  }
  if (!arms.includes(candidateSystem)) invalid("judgment unblinding does not include the candidate system", "JUDGMENT_CANDIDATE_UNMAPPED");
  return labels;
}

function validateReceipt(receipt, plan, planHash, policy) {
  sealed(receipt, "judgment receipt");
  if (receipt.schema !== RECEIPT_SCHEMA) invalid(`judgment receipt must declare ${RECEIPT_SCHEMA}`, "JUDGMENT_RECEIPT_INVALID");
  if (receipt.planHash !== planHash) invalid("judgment receipt does not chain to the plan it answers", "JUDGMENT_PLAN_MISMATCH");
  if (receipt.scenarioId !== plan.scenarioId) invalid("judgment receipt scenario does not match the plan", "JUDGMENT_PLAN_MISMATCH");
  if (receipt.rubricDigest !== policy.rubricDigest) invalid("judgment receipt rubric digest does not match the policy", "JUDGMENT_RUBRIC_STALE");
  if (receipt.referenceSetDigest !== policy.referenceSetDigest) invalid("judgment receipt reference-set digest does not match the policy", "JUDGMENT_REFERENCE_SET_STALE");
  if (receipt.judgeId !== policy.judgeId) invalid("judgment receipt judge does not match the policy", "JUDGMENT_JUDGE_MISMATCH");
  if (!Array.isArray(receipt.verdicts)) invalid("judgment receipt.verdicts must be an array", "JUDGMENT_RECEIPT_INVALID");

  const planned = new Map(plan.pairs.map((pair) => [pair.pairId, pair]));
  const answered = new Map();
  for (const [index, verdict] of receipt.verdicts.entries()) {
    const label = `judgment receipt.verdicts[${index}]`;
    if (!planned.has(verdict?.pairId)) invalid(`${label}.pairId is not in the plan`, "JUDGMENT_PAIR_UNPLANNED");
    if (answered.has(verdict.pairId)) invalid(`${label}.pairId is answered twice`, "JUDGMENT_RECEIPT_INVALID");
    if (!CHOICES.includes(verdict.choice)) invalid(`${label}.choice must be left, right, or tie`, "JUDGMENT_VERDICT_INVALID");
    for (const leak of ["winner", "system", "arm"]) {
      if (Object.hasOwn(verdict, leak)) invalid(`${label} must not name an arm; blindness is broken by an unblinded verdict`, "JUDGMENT_BLINDNESS_BROKEN");
    }
    answered.set(verdict.pairId, verdict);
  }
  const missing = [...planned.keys()].filter((pairId) => !answered.has(pairId));
  if (missing.length) invalid(`judgment receipt omits planned pairs: ${missing.join(", ")}`, "JUDGMENT_COVERAGE_PARTIAL");
  return answered;
}

// One comparison is one sample. Both orders must agree on the same blinded label for a win; if
// they disagree, position flipped the answer and the comparison is a tie. This fold is computed
// once and reused by both the tally and the human spot check, so the two can never drift.
function foldComparisons(comparisons, answered) {
  const folded = new Map();
  for (const [key, group] of comparisons) {
    const chosen = [...group].sort((a, b) => a.order - b.order).map((pair) => {
      const { choice } = answered.get(pair.pairId);
      return choice === "tie" ? "tie" : pair[choice];
    });
    const [first, second] = chosen;
    const decided = first === second && first !== "tie";
    folded.set(key, {
      label: decided ? first : "tie",
      orderDisagreement: !decided && first !== "tie" && second !== "tie",
    });
  }
  return folded;
}

function tally(labels, folded) {
  const wins = Object.fromEntries(Object.values(labels).map((arm) => [arm, 0]));
  let ties = 0;
  const perComparison = [];
  for (const [key, outcome] of folded) {
    if (outcome.label === "tie") ties += 1;
    else wins[labels[outcome.label]] += 1;
    perComparison.push({ comparison: key, outcome: outcome.label === "tie" ? "tie" : labels[outcome.label], orderDisagreement: outcome.orderDisagreement });
  }
  const total = folded.size;
  return {
    total,
    ties,
    orderDisagreements: perComparison.filter((entry) => entry.orderDisagreement).length,
    wins,
    comparisons: perComparison,
    scores: Object.fromEntries(Object.entries(wins).map(([arm, count]) => [arm, (count + 0.5 * ties) / total])),
  };
}

// The reviewer samples comparisons, not presentations. Sampling both orders of one comparison
// would satisfy coverage with half the material and would measure order-level agreement against a
// model outcome that is defined at comparison level.
function measureAgreement(receipt, folded, policy) {
  const sample = receipt.humanSpotCheck;
  if (sample === null || typeof sample !== "object" || Array.isArray(sample)) invalid("judgment receipt.humanSpotCheck is required", "JUDGMENT_SPOT_CHECK_MISSING");
  if (Object.hasOwn(sample, "humanAgreement")) invalid("humanSpotCheck must not self-report an agreement figure; it is recomputed from the sampled verdicts", "JUDGMENT_AGREEMENT_SELF_REPORTED");
  nonEmptyString(sample.reviewer, "humanSpotCheck.reviewer");
  nonEmptyString(sample.reviewedAt, "humanSpotCheck.reviewedAt");
  if (!Array.isArray(sample.verdicts) || !sample.verdicts.length) invalid("humanSpotCheck.verdicts must not be empty", "JUDGMENT_SPOT_CHECK_INVALID");

  const seen = new Set();
  let agreed = 0;
  for (const [index, entry] of sample.verdicts.entries()) {
    const label = `humanSpotCheck.verdicts[${index}]`;
    // The order check comes first, so sampling a presentation order reports the real problem
    // rather than a missing field.
    if (Object.hasOwn(entry || {}, "pairId")) invalid(`${label} must sample a comparison, not one presentation order`, "JUDGMENT_SPOT_CHECK_INVALID");
    nonEmptyString(entry?.comparison, `${label}.comparison`);
    if (!folded.has(entry.comparison)) invalid(`${label}.comparison was not judged`, "JUDGMENT_SPOT_CHECK_INVALID");
    if (seen.has(entry.comparison)) invalid(`${label}.comparison is sampled twice`, "JUDGMENT_SPOT_CHECK_INVALID");
    seen.add(entry.comparison);
    // The reviewer answers in the same blinded vocabulary the fold produces.
    if (![...LABELS, "tie"].includes(entry.choice)) invalid(`${label}.choice must be ${LABELS.join(", ")}, or tie`, "JUDGMENT_SPOT_CHECK_INVALID");
    if (entry.choice === folded.get(entry.comparison).label) agreed += 1;
  }

  const required = Math.ceil(policy.humanSpotCheckFraction * folded.size);
  const agreement = agreed / seen.size;
  const reasons = [];
  if (seen.size < required) reasons.push(`human spot check covered ${seen.size} of a required ${required} comparisons`);
  if (agreement < policy.minHumanAgreement) reasons.push(`human agreement ${agreement} < ${policy.minHumanAgreement}`);
  return { method: "raw-agreement", sampled: seen.size, required, agreed, agreement, reviewer: sample.reviewer, reviewedAt: sample.reviewedAt, reasons };
}

function projectJudgment(input = {}) {
  const { projectRoot, planPath, unblindingPath, receiptPath, policy, scenario, benchmarkId, systems, candidateSystem } = input;
  if (typeof projectRoot !== "string" || !projectRoot) fail("judgment", "projectRoot is required");
  if (policy === null || typeof policy !== "object") fail("judgment", "judgmentPolicy is required");
  if (!Array.isArray(systems) || systems.length !== 2) fail("judgment", "systems must name exactly the two arms");

  const documents = {};
  for (const [key, raw, label] of [["plan", planPath, "judgment plan"], ["unblinding", unblindingPath, "judgment unblinding"], ["receipt", receiptPath, "judgment receipt"]]) {
    documents[key] = readJson(contained(projectRoot, raw, `${label} path`), label);
  }

  const { plan, planHash, comparisons } = validatePublicPlan(projectRoot, documents.plan, policy);
  if (plan.benchmarkId !== benchmarkId) invalid("judgment plan is bound to another benchmark", "JUDGMENT_BENCHMARK_MISMATCH");
  // Structural `samePrompts`: the judged brief must be the manifest scenario's own prompt and its
  // evaluator expectations, not a rewritten version of them.
  if (scenario === null || typeof scenario !== "object") fail("judgment", "the manifest scenario is required to bind the plan");
  if (plan.scenarioId !== scenario.id) invalid("judgment plan scenario does not match the manifest scenario", "JUDGMENT_SCENARIO_MISMATCH");
  if (plan.taskBrief.prompt !== scenario.prompt) invalid("judgment plan prompt does not match the manifest scenario prompt", "JUDGMENT_PROMPT_MISMATCH");
  const expected = scenario.privateExpectations || scenario.expectedComponents || [];
  if (canonicalJson([...plan.taskBrief.evaluatorExpectations].sort()) !== canonicalJson([...expected].sort())) {
    invalid("judgment plan evaluator expectations do not match the manifest scenario", "JUDGMENT_EXPECTATIONS_MISMATCH");
  }
  const referenceSet = loadDigested(projectRoot, policy.referenceSetPath, "reference set", REFERENCE_SET_SCHEMA, policy.referenceSetDigest);
  validateReferenceSet(projectRoot, referenceSet);
  validateRubric(loadDigested(projectRoot, policy.rubricPath, "rubric", RUBRIC_SCHEMA, policy.rubricDigest), plan.judgedDimensions);
  const labels = validateUnblinding(documents.unblinding, plan, planHash, systems, candidateSystem);
  const answered = validateReceipt(documents.receipt, plan, planHash, policy);
  const folded = foldComparisons(comparisons, answered);
  const calibration = measureAgreement(documents.receipt, folded, policy);
  const counted = tally(labels, folded);

  // Calibration failure is a blocked measurement, never a passed one. A blocked scenario emits no
  // measurement, which the benchmark gate already reports as unknown and escalates to blocked.
  const status = calibration.reasons.length ? "blocked" : "measured";
  return {
    scenarioId: plan.scenarioId,
    status,
    planHash,
    calibration,
    tally: counted,
    measurements: status === "measured"
      ? Object.fromEntries(Object.entries(counted.scores).map(([arm, score]) => [arm, { score, evidence: [receiptPath, planPath] }]))
      : {},
  };
}

module.exports = { projectJudgment, seal };

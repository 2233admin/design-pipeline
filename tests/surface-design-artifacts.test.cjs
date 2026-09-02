"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const crypto = require("node:crypto");
const { canonicalJson, sha256 } = require("../skill/scripts/contract-utils.cjs");
const {
  PRECEDENCE,
  approveAdaptationPlan: approveAdaptationPlanCore,
  canCreateTasks,
  createAdaptationPlan,
  createSelectionReceipt,
  reviewAdaptationPlan,
  validatePlanShape,
  validateSelectionReceipt,
} = require("../skill/scripts/surface-design-artifacts-core.cjs");
const { buildComponentFitMatrix, createDirectionLock } = require("../skill/scripts/component-fit-core.cjs");
const { normalizeSnapshot } = require("../skill/scripts/design-system-catalog-core.cjs");
const componentCatalog = normalizeSnapshot(JSON.parse(fs.readFileSync(path.resolve(__dirname, "../skill/references/component-source-catalog.json"), "utf8")));
const regionCatalog = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../skill/references/region-template-catalog.json"), "utf8"));
const { pngBytes } = require("./helpers/reference-fixtures.cjs");
const directPreviewRoot = fs.mkdtempSync(path.join(require("node:os").tmpdir(), "surface-artifacts-preview-"));

function directionLock(previewArtifactSha256 = "b".repeat(64)) {
  return createDirectionLock({
    directionId: "signal",
    selectionReceiptHash: "a".repeat(64),
    previewArtifactSha256,
    constraints: { era: "futurist", density: "dense" },
    visualKeywords: ["smoothui"],
  });
}

function directionPreview() {
  const hashBytes = (value) => crypto.createHash("sha256").update(value).digest("hex");
  const write = (relative, value) => {
    const file = path.join(directPreviewRoot, relative);
    fs.writeFileSync(file, value);
    return { path: relative, sha256: hashBytes(value) };
  };
  const artifact = {
    schema: "design-pipeline.direction-preview.v1",
    changeId: path.basename(directPreviewRoot),
    applicability: { status: "required", reason: "visual-redesign" },
    comparison: {
      brief: write("brief.md", "# Direct selection\n"),
      index: write("index.html", '<main data-direction-preview><section data-direction-id="quiet"></section><section data-direction-id="signal"></section></main>'),
      viewport: { width: 1440, height: 900 },
      contentFixtureSha256: "c".repeat(64),
      stateCoverage: ["default", "error"],
    },
    directions: [
      { id: "quiet", name: "Quiet", thesis: "Quiet thesis", signature: "Quiet signature", axes: { luminance: "light", typeFamily: "serif", color: "monochrome", layout: "editorial", density: "airy", era: "classic", material: "paper" }, screenshot: write("quiet.png", pngBytes({ width: 1440, height: 900 })) },
      { id: "signal", name: "Signal", thesis: "Signal thesis", signature: "Signal signature", axes: { luminance: "dark", typeFamily: "sans", color: "duotone", layout: "grid", density: "dense", era: "futurist", material: "glass" }, screenshot: write("signal.png", pngBytes({ width: 1440, height: 900 })) },
    ],
    decision: { status: "selected", selectedDirectionId: "signal", rationale: "Signal is selected." },
  };
  const bytes = Buffer.from(JSON.stringify(artifact));
  const artifactFile = path.join(directPreviewRoot, "direction-preview.json");
  fs.writeFileSync(artifactFile, bytes);
  const artifactSha256 = hashBytes(bytes);
  return {
    changeRoot: directPreviewRoot,
    artifactSha256,
    contentHash: hashBytes(canonicalJson(artifact)),
    directionLockSnapshot: directionLock(artifactSha256),
    artifact,
  };
}

function adoptInput(overrides = {}) {
  const preview = directionPreview();
  return {
    projectId: "p1",
    surfaceId: "web-admin",
    surface: { projectId: "p1", surfaceId: "web-admin", platform: "web", framework: "react", profileVersion: "1" },
    referenceHash: "a".repeat(64),
    candidate: { id: "project-data-table-web-react", version: "1.0.0", platform: "web", framework: "react" },
    catalog: regionCatalog,
    selectionMode: "adopt",
    directionLockSnapshot: preview.directionLockSnapshot,
    directionPreview: preview,
    hardGateResults: { license: "pass", provenance: "pass", security: "pass", accessibility: "pass" },
    sourceAndLicenseEvidence: [
      { kind: "license", value: "project-owned", source: "catalog-entry", contentHash: "a".repeat(64), authorization: "project-owned authorization record" },
      { kind: "provenance", value: "project-fixture", source: "task-3-fixture", contentHash: "a".repeat(64), attribution: "design-pipeline task-3 fixture" },
    ],
    acceptanceCriteria: ["keyboard navigation works"],
    ...overrides,
  };
}
function approveAdaptationPlan(plan, approval = {}) {
  return approveAdaptationPlanCore(plan, { planContentHash: plan.contentHash, ...approval });
}

function adaptationContext(receipt, overrides = {}) {
  const matrix = buildComponentFitMatrix({
    framework: "react",
    platform: "web",
    capabilities: ["button"],
    directionLock: receipt.directionLockSnapshot,
    catalog: componentCatalog,
  });
  return {
    surface: { projectId: receipt.projectId, surfaceId: receipt.surfaceId, platform: "web", framework: "react", profileVersion: "1" },
    componentFitMatrix: matrix,
    componentFitBinding: { region: receipt.region, matrixHash: matrix.matrixHash },
    ...overrides,
  };
}

test("creates an immutable, hash-bound SelectionReceipt and gates task creation", () => {
  const receipt = createSelectionReceipt(adoptInput());
  assert.equal(receipt.projectId, "p1");
  assert.equal(receipt.surfaceId, "web-admin");
  assert.equal(receipt.selectionMode, "adopt");
  assert.equal(receipt.candidateTemplateVersion, "1.0.0");
  assert.match(receipt.contentHash, /^[a-f0-9]{64}$/);
  const plan = createAdaptationPlan(receipt, adaptationContext(receipt, { preservedStructure: ["filter row"] }));
  assert.equal(plan.status, "draft");
  assert.equal(canCreateTasks(plan).allowed, false);
  const approved = approveAdaptationPlan(plan, { reviewer: "user", rationale: "approved" });
  assert.equal(approved.status, "approved");
  assert.equal(canCreateTasks(approved).allowed, true);
});
test("requires a complete direction-preview proof and rejects hash-only locks", () => {
  assert.throws(() => createSelectionReceipt(adoptInput({
    directionPreview: { status: "selected", artifactSha256: "b".repeat(64), contentHash: "c".repeat(64) },
  })), /direction preview artifact/i);
  const proof = directionPreview();
  assert.throws(() => createSelectionReceipt(adoptInput({
    directionPreview: { ...proof, contentHash: "c".repeat(64) },
  })), /content hash/i);
  assert.throws(() => createSelectionReceipt(adoptInput({
    directionPreview: { ...proof, directionLockSnapshot: { ...proof.directionLockSnapshot, directionId: "quiet" } },
  })), /lock snapshot|direction lock/i);
});

test("reference mode is allowed without adoption authorization", () => {
  const receipt = createSelectionReceipt(adoptInput({
    selectionMode: "reference",
    sourceAndLicenseEvidence: undefined,
    hardGateResults: { license: "blocked", provenance: "missing", accessibility: "fail" },
  }));
  assert.equal(receipt.selectionMode, "reference");
  assert.deepEqual(receipt.sourceAndLicenseEvidence, []);
  assert.doesNotThrow(() => validateSelectionReceipt(receipt));
  assert.throws(() => createSelectionReceipt(adoptInput({
    selectionMode: "reference",
    sourceAndLicenseEvidence: [
      { kind: "license", value: "project-owned", source: "catalog-entry" },
      { kind: "provenance", value: "project-fixture", source: "task-3-fixture" },
    ],
  })), /contentHash/i);
  assert.doesNotThrow(() => validateSelectionReceipt(receipt, { candidate: { id: receipt.region, version: receipt.candidateTemplateVersion, contentHash: "c".repeat(64) } }));
});

test("adopt rejects missing evidence and blocked hard gates", () => {
  assert.throws(() => createSelectionReceipt(adoptInput({ hardGateResults: { license: "blocked", provenance: "pass", accessibility: "pass" } })), /license.*hard gate|adopt/i);
  assert.throws(() => createSelectionReceipt(adoptInput({ hardGateResults: { license: "pass", provenance: "pass", accessibility: "pass" }, sourceAndLicenseEvidence: [] })), /evidence/i);
  assert.throws(() => createSelectionReceipt(adoptInput({ hardGateResults: { license: "pass", provenance: "pass", security: "blocked", accessibility: "pass" } })), /security/i);
  assert.throws(() => createSelectionReceipt(adoptInput({ sourceAndLicenseEvidence: ["license:pass", "provenance:pass"] })), /structured|license|provenance/i);
  assert.throws(() => createSelectionReceipt(adoptInput({ sourceAndLicenseEvidence: [{ kind: "license", value: "MIT", source: "catalog" }] })), /contentHash|separate|provenance/i);
});

test("receipt mutations fail content-hash and context validation", () => {
  const receipt = createSelectionReceipt(adoptInput({ catalogVersion: "1" }));
  assert.throws(() => validateSelectionReceipt({ ...receipt, candidateTemplateVersion: "2.0.0" }), /hash|content/i);
  assert.throws(() => validateSelectionReceipt(receipt, { catalogVersion: "2" }), /catalog version|drift/i);
  assert.throws(() => validateSelectionReceipt(receipt, { directionLockHash: "c".repeat(64) }), /direction lock/i);
  assert.throws(() => validateSelectionReceipt(receipt, { candidate: { id: receipt.region, version: "2.0.0" } }), /candidate version|drift/i);
  assert.throws(() => validateSelectionReceipt(receipt, { technicalConstraints: ["different constraint"] }), /technical constraints/i);
});

test("plans preserve precedence and revisions return to review", () => {
  const receipt = createSelectionReceipt(adoptInput());
  const plan = createAdaptationPlan(receipt, adaptationContext(receipt, { preservedStructure: ["filter row"] }));
  assert.deepEqual(plan.precedence, PRECEDENCE);
  assert.ok(plan.platformAdaptations.length > 0);
  assert.ok(plan.forbiddenCopying.length > 0);
  const submitted = reviewAdaptationPlan(plan, { reviewer: "user", rationale: "please review" });
  assert.equal(submitted.status, "awaiting_review");
  const revised = reviewAdaptationPlan(submitted, {
    reviewer: "user",
    rationale: "preserve the filter row",
    revision: { expectedVisualDifferences: ["project-native table density"] },
  });
  assert.equal(revised.status, "awaiting_review");
  assert.equal(revised.revision, 2);
  assert.notEqual(revised.contentHash, submitted.contentHash);
  assert.equal(canCreateTasks(revised).allowed, false);
  const approved = approveAdaptationPlan(revised, { reviewer: "user", rationale: "approved after revision" });
  assert.equal(canCreateTasks(approved).allowed, true);
});

test("persisted adaptation plans retain receipt and component-fit evidence", () => {
  const receipt = createSelectionReceipt(adoptInput());
  const plan = createAdaptationPlan(receipt, adaptationContext(receipt));
  const approved = approveAdaptationPlan(plan, { reviewer: "user", rationale: "approved" });
  assert.ok(approved.selectionReceipt);
  assert.ok(approved.componentFitMatrix);
  const forgedReceipt = { ...approved, selectionReceipt: { ...approved.selectionReceipt, receiptId: "forged-receipt" } };
  delete forgedReceipt.contentHash;
  forgedReceipt.contentHash = sha256(canonicalJson(forgedReceipt));
  const gate = canCreateTasks(forgedReceipt);
  assert.equal(gate.allowed, false);
  assert.match(gate.reasons.join(" "), /content hash|selectionReceipt binding|receiptId|stale/i);
});

test("rejected plans cannot create tasks", () => {
  const receipt = createSelectionReceipt(adoptInput());
  const plan = createAdaptationPlan(receipt, adaptationContext(receipt));
  const rejected = reviewAdaptationPlan(plan, { reviewer: "user", decision: "reject", rationale: "not compatible" });
  assert.equal(rejected.status, "rejected");
  assert.equal(canCreateTasks(rejected).allowed, false);
});

test("plan hash binds the receipt and approval records must be valid", () => {
  const receipt = createSelectionReceipt(adoptInput());
  const plan = createAdaptationPlan(receipt, adaptationContext(receipt));
  const approved = approveAdaptationPlan(plan, { reviewer: "user", rationale: "approved" });
  const tampered = { ...approved, receiptHash: "c".repeat(64) };
  assert.equal(canCreateTasks(tampered).allowed, false);
  const invalidApproval = { ...approved, approval: {} };
  const { contentHash: ignored, ...body } = invalidApproval;
  invalidApproval.contentHash = sha256(canonicalJson(body));
  assert.equal(canCreateTasks(invalidApproval).allowed, false);
});
test("malformed persisted plans stay ineligible even with a recomputed hash", () => {
  const receipt = createSelectionReceipt(adoptInput());
  const plan = createAdaptationPlan(receipt, adaptationContext(receipt));
  const approved = approveAdaptationPlan(plan, { reviewer: "user", rationale: "approved" });
  const { contentHash: ignored, ...body } = approved;
  body.acceptanceChecks = [];
  const malformed = { ...body, contentHash: sha256(canonicalJson(body)) };
  assert.throws(() => validatePlanShape(malformed), /acceptanceChecks|non-empty|string array/i);
  assert.equal(canCreateTasks(malformed).allowed, false);
  assert.throws(() => approveAdaptationPlan(malformed, { reviewer: "user", rationale: "should reject" }), /acceptanceChecks|non-empty|string array/i);
});

test("mandatory adaptation policy cannot be removed or replaced", () => {
  const receipt = createSelectionReceipt(adoptInput());
  assert.throws(() => createAdaptationPlan(receipt, adaptationContext(receipt, { platformAdaptations: [] })), /platformAdaptations|non-empty/i);
  assert.throws(() => createAdaptationPlan(receipt, adaptationContext(receipt, { forbiddenCopying: [] })), /forbiddenCopying|non-empty/i);
  assert.throws(() => createAdaptationPlan(receipt, adaptationContext(receipt, { forbiddenCopying: ["copy anything"] })), /no-copying|forbiddenCopying/i);
  const plan = createAdaptationPlan(receipt, adaptationContext(receipt, { forbiddenCopying: ["do-not-copy-source-or-protected-content", "Do not copy source code; retain attribution"] }));
  assert.deepEqual(plan.forbiddenCopying, ["do-not-copy-source-or-protected-content", "Do not copy source code; retain attribution"]);
  const base = createAdaptationPlan(receipt, adaptationContext(receipt));
  assert.throws(() => reviewAdaptationPlan(base, { reviewer: "user", revision: { platformAdaptations: ["never"] } }), /mandatory|platform/i);
  assert.throws(() => reviewAdaptationPlan(base, { reviewer: "user", revision: { forbiddenCopying: ["never copy logs"] } }), /mandatory|copy/i);
});

test("nested candidate versions and Surface profile snapshots are bound", () => {
  const surface = { projectId: "p1", surfaceId: "web-admin", platform: "web", framework: "react", profileVersion: "1" };
  const receipt = createSelectionReceipt(adoptInput({
    candidate: { id: "project-data-table-web-react", version: "1.0.0", platform: "web", framework: "react", componentCandidateVersions: ["table@1"] },
    surface,
  }));
  assert.throws(() => validateSelectionReceipt(receipt, { candidate: { id: receipt.region, version: "1.0.0", componentCandidateVersions: ["table@2"] } }), /component candidate versions/i);
  assert.doesNotThrow(() => validateSelectionReceipt(receipt, { surface }));
  assert.throws(() => validateSelectionReceipt(receipt, { surface: { ...surface, framework: "vue" } }), /Surface profile|binding/i);
  assert.throws(() => validateSelectionReceipt(receipt, { surface: { ...surface, platform: "mobile", framework: "react-native" } }), /Surface profile|binding|platform/i);
});

test("explicitly missing security and terminal plans fail closed", () => {
  assert.throws(() => createSelectionReceipt(adoptInput({ hardGateResults: { license: "pass", provenance: "pass", security: "missing", accessibility: "pass" } })), /security/i);
  assert.throws(() => createSelectionReceipt(adoptInput({ hardGateResults: { license: "pass", provenance: "pass", accessibility: "pass" } })), /security/i);
  const receipt = createSelectionReceipt(adoptInput());
  const plan = createAdaptationPlan(receipt, adaptationContext(receipt));
  const approved = approveAdaptationPlan(plan, { reviewer: "user", rationale: "approved" });
  assert.throws(() => reviewAdaptationPlan(approved, { reviewer: "user", rationale: "reopen" }), /approved/i);
  const rejected = reviewAdaptationPlan(plan, { reviewer: "user", decision: "reject", rationale: "no" });
  assert.throws(() => reviewAdaptationPlan(rejected, { reviewer: "user", rationale: "reopen" }), /rejected/i);
});

test("rejects falsy selection modes, fabricated evidence, and context drift", () => {
  for (const selectionMode of [null, "", "unknown"]) {
    assert.throws(() => createSelectionReceipt(adoptInput({ selectionMode })), /selectionMode/i);
  }
  assert.throws(() => createSelectionReceipt(adoptInput({
    sourceAndLicenseEvidence: [
      { kind: "license", value: "anything", source: "anything", contentHash: "a".repeat(64), authorization: "anything" },
      { kind: "provenance", value: "anything", source: "anything", contentHash: "a".repeat(64), attribution: "anything" },
    ],
  })), /allowlisted|license|provenance/i);
  const receipt = createSelectionReceipt(adoptInput());
  assert.throws(() => validateSelectionReceipt(receipt, { selectionMode: "reference" }), /selection mode|drift/i);
  assert.throws(() => validateSelectionReceipt(receipt, { selectionMode: null }), /selectionMode/i);
  assert.throws(() => validateSelectionReceipt(receipt, { candidateTemplateVersion: "" }), /candidateTemplateVersion|non-empty/i);
  assert.throws(() => validateSelectionReceipt(receipt, { candidate: { id: receipt.region, version: "" } }), /candidate.version|non-empty/i);
  assert.throws(() => validateSelectionReceipt(receipt, { candidate: { id: receipt.region, version: receipt.candidateTemplateVersion, componentCandidateVersions: undefined } }), /componentCandidateVersions|non-empty/i);
  assert.throws(() => validateSelectionReceipt(receipt, { componentCandidateVersions: [] }), /componentCandidateVersions|at least/i);
  assert.throws(() => validateSelectionReceipt(receipt, { referenceHash: "c".repeat(64) }), /reference hash/i);
  assert.throws(() => validateSelectionReceipt({ ...receipt, sourceAndLicenseEvidence: receipt.sourceAndLicenseEvidence.map((entry) => ({ ...entry, contentHash: "c".repeat(64) })) }), /contentHash|hash/i);
});
test("rejects spoofed or unlisted candidates and reserved first-wave receipts", () => {
  assert.throws(() => createSelectionReceipt(adoptInput({
    candidate: { id: "project-data-table-web-react", version: "1.0.0", platform: "mobile", framework: "react-native" },
  })), /catalog|platform|framework/i);
  assert.throws(() => createSelectionReceipt(adoptInput({
    candidate: { id: "not-in-catalog", version: "1.0.0", platform: "web", framework: "react" },
  })), /catalog|member/i);
  assert.throws(() => createSelectionReceipt(adoptInput({
    surface: { projectId: "p1", surfaceId: "game", platform: "game", framework: "custom", profileVersion: "1", firstWave: false },
  })), /game|first.wave|reserved/i);
});
test("rejects component-fit matrices from a different Surface", () => {
  const receipt = createSelectionReceipt(adoptInput());
  const mobileMatrix = buildComponentFitMatrix({
    framework: "react-native",
    platform: "mobile",
    capabilities: ["button"],
    directionLock: receipt.directionLockSnapshot,
    catalog: componentCatalog,
  });
  assert.throws(() => createAdaptationPlan(receipt, {
    ...adaptationContext(receipt),
    componentFitMatrix: mobileMatrix,
    componentFitBinding: { region: receipt.region, matrixHash: mobileMatrix.matrixHash },
  }), /platform\/framework|Surface/i);
});

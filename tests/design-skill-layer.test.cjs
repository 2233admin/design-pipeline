"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");
const { checkComponentFirstGate } = require("../skill/scripts/component-first-core.cjs");
const { migrateV1ToV2, policyDigest, targetDigest } = require("../skill/scripts/component-first-v2-core.cjs");
const { createComponentFirstFixture, sha256 } = require("./fixtures/component-first-fixture.cjs");
const { pngBytes } = require("./helpers/reference-fixtures.cjs");
const { canonicalJson } = require("../skill/scripts/contract-utils.cjs");
const { enforceEffects, manifests, promotePrototype, routeDesignSkill, runDesignSkill, selectPrototype } = require("../skill/scripts/design-skill-core.cjs");
function prototypeBinding() {
  const target = { id: "prototype-preview", root: ".", kind: "prototype", entrypoints: [], routes: [], snapshotDigest: `sha256:${"1".repeat(64)}` };
  const policy = { id: "component-first-default", version: 1 };
  return { target, policy, targetIdentityDigest: targetDigest(target), snapshotDigest: target.snapshotDigest, policyDigest: policyDigest(policy) };
}
function writePreviewFixture(t) {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), "design-skill-preview-"));
  const root = path.join(parent, "compare-settings");
  fs.mkdirSync(root);
  t.after(() => fs.rmSync(parent, { recursive: true, force: true }));
  const hashBytes = (value) => crypto.createHash("sha256").update(value).digest("hex");
  const write = (relative, value) => {
    const file = path.join(root, relative);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, value);
    return { path: relative, sha256: hashBytes(value) };
  };
  const brief = write("brief.md", "# Settings redesign\n");
  const html = Buffer.from('<main data-direction-preview><section data-direction-id="quiet"></section><section data-direction-id="signal"></section><section data-direction-id="editorial"></section></main>');
  const index = write("direction-previews/index.html", html);
  const screenshot = (id) => write(`direction-previews/${id}.png`, Buffer.concat([pngBytes({ width: 1440, height: 900 }), Buffer.from(id)]));
  const directions = [
    { id: "quiet", name: "Quiet Grid", thesis: "Quiet visual thesis", signature: "Settings remain calm", axes: { luminance: "light", typeFamily: "serif", color: "monochrome", layout: "editorial", density: "airy", era: "classic", material: "paper" }, screenshot: screenshot("quiet") },
    { id: "signal", name: "Signal Console", thesis: "Signal visual thesis", signature: "Errors become visible", axes: { luminance: "dark", typeFamily: "sans", color: "duotone", layout: "grid", density: "dense", era: "futurist", material: "glass" }, screenshot: screenshot("signal") },
    { id: "editorial", name: "Field Notes", thesis: "Editorial visual thesis", signature: "Settings read like notes", axes: { luminance: "light", typeFamily: "monospace", color: "multicolor", layout: "asymmetric", density: "balanced", era: "industrial", material: "flat" }, screenshot: screenshot("editorial") },
  ];
  fs.writeFileSync(path.join(root, "direction-preview.json"), JSON.stringify({
    schema: "design-pipeline.direction-preview.v1",
    changeId: "compare-settings",
    applicability: { status: "required", reason: "visual-redesign" },
    comparison: { brief, index, viewport: { width: 1440, height: 900 }, contentFixtureSha256: hashBytes("settings-real-copy-v1"), stateCoverage: ["default", "validation-error"] },
    directions,
    decision: { status: "pending", selectedDirectionId: null, rationale: null },
  }, null, 2));
  return root;
}

test("design skill manifests route and enforce effects", () => {
  assert.equal(routeDesignSkill("make three prototype directions").skill, "design.prototype");
  assert.equal(routeDesignSkill("audit the design").skill, "design.audit");
  assert.equal(routeDesignSkill("unclear brief").status, "clarification");
  assert.throws(() => enforceEffects(manifests()["design.prototype"], ["target-write"]), /target-write|granted/i);
});

test("public CLI exposes design-skill routing and manifest lookup", () => {
  const cli = path.resolve(__dirname, "../skill/scripts/designer-pipeline.cjs");
  const routed = spawnSync(process.execPath, [cli, "design-skill", "route", "--root", ".", "--query", "audit this interface", "--json"], { cwd: path.resolve(__dirname, ".."), encoding: "utf8" });
  assert.equal(routed.status, 0);
  assert.equal(JSON.parse(routed.stdout).skill, "design.audit");
  const manifest = spawnSync(process.execPath, [cli, "design-skill", "manifest", "--root", ".", "--skill", "design.prototype", "--json"], { cwd: path.resolve(__dirname, ".."), encoding: "utf8" });
  assert.equal(manifest.status, 0);
  assert.equal(JSON.parse(manifest.stdout).manifest.outputSchema, "prototype-set.v1");
});

test("prototype CLI requires target snapshot binding before selection", (t) => {
  const previewRoot = writePreviewFixture(t);
  const projectRoot = path.dirname(previewRoot);
  fs.writeFileSync(path.join(projectRoot, "input.json"), JSON.stringify({ changeRoot: path.basename(previewRoot) }));
  const cli = path.resolve(__dirname, "../skill/scripts/designer-pipeline.cjs");
  const result = spawnSync(process.execPath, [cli, "design-skill", "run", "--root", projectRoot, "--skill", "design.prototype", "--artifact", "input.json", "--json"], { cwd: path.resolve(__dirname, ".."), encoding: "utf8" });
  assert.equal(result.status, 2, result.stderr || result.stdout);
  assert.equal(JSON.parse(result.stdout).status, "blocked");
  assert.equal(JSON.parse(result.stdout).result.reason, "prototype-target-binding-required");
});
test("prototype route requires a verified direction preview", (t) => {
  assert.throws(
    () => runDesignSkill("design.prototype", { directions: [{ id: "a" }, { id: "b" }, { id: "c" }] }),
    /prototype changeRoot/,
  );
  const root = writePreviewFixture(t);
  const binding = prototypeBinding();
  const result = runDesignSkill("design.prototype", { changeRoot: root, ...binding }, { projectRoot: path.dirname(root) }).result;
  assert.equal(result.schema, "prototype-set.v1");
  assert.equal(result.status, "awaiting-selection");
  assert.equal(result.preview.status, "ready");
  assert.ok(result.directions.every((direction) => direction.isolated));
});

test("prototype route stays blocked when preview evidence is missing", (t) => {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), "design-skill-blocked-"));
  const root = path.join(parent, "missing-preview");
  fs.mkdirSync(root);
  t.after(() => fs.rmSync(parent, { recursive: true, force: true }));
  const result = runDesignSkill("design.prototype", { changeRoot: root }, { projectRoot: parent }).result;
  assert.equal(result.status, "blocked");
  assert.equal(result.reason, "direction-preview-required");
  assert.equal(result.preview.artifactSha256, null);
});
test("prototype route blocks malformed preview artifacts", (t) => {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), "design-skill-malformed-"));
  const root = path.join(parent, "malformed-preview");
  fs.mkdirSync(root);
  fs.writeFileSync(path.join(root, "direction-preview.json"), "{not-json");
  t.after(() => fs.rmSync(parent, { recursive: true, force: true }));
  const result = runDesignSkill("design.prototype", { changeRoot: root }, { projectRoot: parent }).result;
  assert.equal(result.status, "blocked");
  assert.equal(result.reason, "direction-preview-required");
  assert.ok(result.blockers.length > 0);
});

test("prototype route does not turn a waived preview into an empty selection", (t) => {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), "design-skill-waived-"));
  const root = path.join(parent, "narrow-fix");
  fs.mkdirSync(root);
  t.after(() => fs.rmSync(parent, { recursive: true, force: true }));
  fs.writeFileSync(path.join(root, "direction-preview.json"), JSON.stringify({
    schema: "design-pipeline.direction-preview.v1",
    changeId: "narrow-fix",
    applicability: { status: "waived", reason: "narrow-change" },
    comparison: null,
    directions: [],
    decision: { status: "waived", selectedDirectionId: null, rationale: "The existing surface already owns the direction." },
  }));
  const result = runDesignSkill("design.prototype", { changeRoot: root }, { projectRoot: parent }).result;
  assert.equal(result.status, "blocked");
  assert.equal(result.reason, "direction-preview-waived");
  assert.deepEqual(result.directions, []);
});

test("selection is hash-bound and promotion returns a target-write handoff", (t) => {
  const fixture = createComponentFirstFixture(t);
  const v1 = checkComponentFirstGate(fixture.input, { projectRoot: fixture.projectRoot });
  const v2 = migrateV1ToV2(v1, { snapshotDigest: `sha256:${sha256("skill-layer")}` });
  const previewRoot = writePreviewFixture(t);
  const prototypeSet = runDesignSkill("design.prototype", { changeRoot: previewRoot, target: { ...v2.target }, policy: { ...v1.policy } }, { projectRoot: path.dirname(previewRoot) }).result;
  const selection = selectPrototype(prototypeSet, { selectedPrototypeId: "signal", targetIdentityDigest: v2.target.targetIdentityDigest, snapshotDigest: v2.target.snapshotDigest, policyDigest: v2.policy.digest, approvedBy: "reviewer" }, { projectRoot: path.dirname(previewRoot) });
  const handoff = promotePrototype(v2, selection, { selectionReceiptHash: selection.receiptHash, sourceKind: "prototype", targetKind: "production", approvedBy: "reviewer", options: { projectRoot: path.dirname(previewRoot) } });
  assert.equal(handoff.schema, "design-promotion-handoff.v1");
  assert.equal(handoff.targetWrite, "blocked-until-explicit-executor");
  assert.equal(handoff.promotionReceipt.componentConformanceStatus, "passed");
  assert.throws(
    () => selectPrototype({ ...prototypeSet, directions: prototypeSet.directions.map((direction) => direction.id === "signal" ? { ...direction, signature: "tampered" } : direction) }, { selectedPrototypeId: "signal" }, { projectRoot: path.dirname(previewRoot) }),
    /prototype set hash is stale/,
  );
  assert.throws(
    () => selectPrototype({ ...prototypeSet, prototypeSetHash: "not-a-sha256" }, { selectedPrototypeId: "signal" }, { projectRoot: path.dirname(previewRoot) }),
    /prototype set hash is invalid/,
  );
  const forged = {
    ...prototypeSet,
    directions: prototypeSet.directions.map((direction) => direction.id === "signal" ? { ...direction, signature: "forged" } : direction),
  };
  delete forged.prototypeSetHash;
  forged.prototypeSetHash = sha256(canonicalJson(forged));
  assert.throws(
    () => selectPrototype(forged, { selectedPrototypeId: "signal", targetIdentityDigest: v2.target.targetIdentityDigest, snapshotDigest: v2.target.snapshotDigest, policyDigest: v2.policy.digest, approvedBy: "reviewer" }, { projectRoot: path.dirname(previewRoot) }),
    /directions do not match the verified direction preview/,
  );
  assert.throws(() => selectPrototype({ ...prototypeSet, schema: "wrong" }, { selectedPrototypeId: "signal" }), /schema/);
  assert.throws(() => selectPrototype({ ...prototypeSet, status: "blocked" }, { selectedPrototypeId: "signal" }), /status/);
  assert.throws(() => selectPrototype({ ...prototypeSet, directions: {} }, { selectedPrototypeId: "signal" }), /directions/);

});

test("library selection is deterministic and applicability is explicit", () => {
  const result = runDesignSkill("design.pick-library", { packageVersion: "1.2.0", candidates: [{ id: "z", version: "1.0.0", versionRange: "^1.0.0", status: "ready", sourceDigest: "z" }, { id: "a", version: "1.0.0", versionRange: "^1.0.0", status: "ready", sourceDigest: "a" }, { id: "x", version: "1.0.0", versionRange: "^2.0.0", status: "ready", sourceDigest: "x" }] }).result;
  assert.equal(result.status, "selected");
  assert.equal(result.applicability.status, "applicable");
  assert.equal(result.selected.id, "a");
});

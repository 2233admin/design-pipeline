"use strict";

const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const path = require("node:path");
const test = require("node:test");
const { checkComponentFirstGate } = require("../skill/scripts/component-first-core.cjs");
const { migrateV1ToV2 } = require("../skill/scripts/component-first-v2-core.cjs");
const { createComponentFirstFixture, sha256 } = require("./fixtures/component-first-fixture.cjs");
const { enforceEffects, manifests, promotePrototype, routeDesignSkill, runDesignSkill, selectPrototype } = require("../skill/scripts/design-skill-core.cjs");

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

test("prototype route creates isolated directions and waits for selection", () => {
  const result = runDesignSkill("design.prototype", { directions: [{ id: "a" }, { id: "b" }, { id: "c" }] }).result;
  assert.equal(result.schema, "prototype-set.v1");
  assert.equal(result.status, "awaiting-selection");
  assert.ok(result.directions.every((direction) => direction.isolated));
});

test("selection is hash-bound and promotion returns a target-write handoff", (t) => {
  const fixture = createComponentFirstFixture(t);
  const v1 = checkComponentFirstGate(fixture.input, { projectRoot: fixture.projectRoot });
  const v2 = migrateV1ToV2(v1, { snapshotDigest: `sha256:${sha256("skill-layer")}` });
  const prototypeSet = runDesignSkill("design.prototype", { target: { kind: "prototype", root: ".", id: "admin-web", entrypoints: [], routes: [] }, policy: v2.policy, directions: [{ id: "a" }, { id: "b" }, { id: "c" }] }).result;
  const selection = selectPrototype(prototypeSet, { selectedPrototypeId: "b", targetIdentityDigest: v2.target.targetIdentityDigest, snapshotDigest: v2.target.snapshotDigest, policyDigest: v2.policy.digest, approvedBy: "reviewer" });
  const handoff = promotePrototype(v2, selection, { selectionReceiptHash: selection.receiptHash, sourceKind: "prototype", targetKind: "production", approvedBy: "reviewer" });
  assert.equal(handoff.schema, "design-promotion-handoff.v1");
  assert.equal(handoff.targetWrite, "blocked-until-explicit-executor");
  assert.equal(handoff.promotionReceipt.componentConformanceStatus, "passed");
});

test("library selection is deterministic and applicability is explicit", () => {
  const result = runDesignSkill("design.pick-library", { packageVersion: "1.2.0", candidates: [{ id: "z", version: "1.0.0", versionRange: "^1.0.0", status: "ready", sourceDigest: "z" }, { id: "a", version: "1.0.0", versionRange: "^1.0.0", status: "ready", sourceDigest: "a" }, { id: "x", version: "1.0.0", versionRange: "^2.0.0", status: "ready", sourceDigest: "x" }] }).result;
  assert.equal(result.status, "selected");
  assert.equal(result.applicability.status, "applicable");
  assert.equal(result.selected.id, "a");
});

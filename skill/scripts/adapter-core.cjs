"use strict";

const {
  assertEnum,
  assertKeys,
  assertObject,
  assertString,
  assertStringArray,
  fail,
} = require("./contract-utils.cjs");

const SUPPORT = ["native", "generic-workflow", "companion", "reference-only", "unsupported", "out-of-scope"];
const AVAILABILITY = ["available", "unavailable", "blocked", "unknown"];
const FAMILIES = ["semantic-ui", "vector-data", "canvas-editor-2d", "scene-renderer-2d", "game-engine-2d", "scene-renderer-3d", "game-engine-3d", "geospatial-3d", "gpu-shader", "narrative-game-ui", "design-tool"];

function validateRegistry(registry, graphicsCatalog = null) {
  assertKeys(registry, ["schema", "version", "adapters"], ["schema", "version", "adapters"], "registry", "adapter registry");
  if (registry.schema !== "design-pipeline.adapter-registry.v1") fail("adapter registry", "unsupported schema");
  assertString(registry.version, "version", "adapter registry");
  if (!Array.isArray(registry.adapters)) fail("adapter registry", "adapters must be an array");
  const ids = new Set();
  for (const adapter of registry.adapters) {
    const required = ["id", "family", "support", "kind", "hostPolicy", "versionRange", "provenance", "license", "security", "evidenceTypes", "degradation", "benchmarkAdmission"];
    assertKeys(adapter, required, [...required, "install"], `adapter ${adapter.id || "<unknown>"}`, "adapter registry");
    assertString(adapter.id, "adapter.id", "adapter registry");
    if (ids.has(adapter.id)) fail("adapter registry", `duplicate adapter ${adapter.id}`);
    ids.add(adapter.id);
    assertEnum(adapter.family, FAMILIES, `${adapter.id}.family`, "adapter registry");
    assertEnum(adapter.support, SUPPORT, `${adapter.id}.support`, "adapter registry");
    assertString(adapter.kind, `${adapter.id}.kind`, "adapter registry");
    assertString(adapter.hostPolicy, `${adapter.id}.hostPolicy`, "adapter registry");
    assertString(adapter.versionRange, `${adapter.id}.versionRange`, "adapter registry");
    assertObject(adapter.provenance, `${adapter.id}.provenance`, "adapter registry");
    assertString(adapter.provenance.kind, `${adapter.id}.provenance.kind`, "adapter registry");
    assertString(adapter.provenance.url, `${adapter.id}.provenance.url`, "adapter registry");
    assertObject(adapter.license, `${adapter.id}.license`, "adapter registry");
    assertEnum(adapter.license.state, ["verified", "unverified", "platform", "project", "service"], `${adapter.id}.license.state`, "adapter registry");
    assertObject(adapter.security, `${adapter.id}.security`, "adapter registry");
    if (typeof adapter.security.credentials !== "boolean") fail("adapter registry", `${adapter.id}.security.credentials must be boolean`);
    assertStringArray(adapter.evidenceTypes, `${adapter.id}.evidenceTypes`, "adapter registry", { min: 1, unique: true });
    assertString(adapter.degradation, `${adapter.id}.degradation`, "adapter registry");
    assertEnum(adapter.benchmarkAdmission, ["required", "optional", "blocked"], `${adapter.id}.benchmarkAdmission`, "adapter registry");
    if (adapter.license.state === "unverified" && ["native", "companion"].includes(adapter.support)) fail("adapter registry", `${adapter.id} cannot claim ${adapter.support} with an unverified license`);
    if (adapter.install && !(adapter.support === "companion" && adapter.license.state === "verified")) fail("adapter registry", `${adapter.id} install is allowed only for verified companions`);
    if (adapter.benchmarkAdmission === "blocked" && ["native", "companion"].includes(adapter.support)) fail("adapter registry", `${adapter.id} blocked admission contradicts ${adapter.support} support`);
  }
  if (graphicsCatalog) {
    assertKeys(graphicsCatalog, ["schema", "updatedAt", "principles", "families", "routes"], ["schema", "updatedAt", "principles", "families", "routes"], "graphics catalog", "adapter registry");
    const routeIds = new Set();
    for (const route of graphicsCatalog.routes) {
      assertKeys(route, ["family", "adapterIds"], ["family", "adapterIds"], "graphics route", "adapter registry");
      assertStringArray(route.adapterIds, `${route.family}.adapterIds`, "adapter registry", { unique: true });
      for (const id of route.adapterIds) {
        if (!ids.has(id)) fail("adapter registry", `graphics route references unknown adapter ${id}`);
        const adapter = registry.adapters.find((item) => item.id === id);
        if (adapter.family !== route.family) fail("adapter registry", `${id} route family contradicts registry`);
        if (routeIds.has(id)) fail("adapter registry", `graphics route duplicates ${id}`);
        routeIds.add(id);
      }
    }
    const graphicsIds = registry.adapters.filter((item) => item.family !== "design-tool").map((item) => item.id);
    const missing = graphicsIds.filter((id) => !routeIds.has(id));
    if (missing.length) fail("adapter registry", `graphics routes omit: ${missing.join(", ")}`);
  }
  return { status: "valid", adapters: registry.adapters.length, support: Object.fromEntries(SUPPORT.map((value) => [value, registry.adapters.filter((item) => item.support === value).length])) };
}

function validateDesignToolReceipt(receipt) {
  const keys = ["schema", "id", "provider", "operation", "status", "source", "mappings", "editable", "evidence"];
  assertKeys(receipt, keys, keys, "receipt", "design tool receipt");
  if (receipt.schema !== "design-pipeline.design-tool-receipt.v1") fail("design tool receipt", "unsupported schema");
  assertString(receipt.id, "id", "design tool receipt");
  assertKeys(receipt.provider, ["id", "version", "availability"], ["id", "version", "availability"], "provider", "design tool receipt");
  assertString(receipt.provider.id, "provider.id", "design tool receipt");
  assertString(receipt.provider.version, "provider.version", "design tool receipt");
  assertEnum(receipt.provider.availability, AVAILABILITY, "provider.availability", "design tool receipt");
  assertEnum(receipt.operation, ["import", "export", "round-trip"], "operation", "design tool receipt");
  assertEnum(receipt.status, ["valid", "invalid", "unknown"], "status", "design tool receipt");
  assertKeys(receipt.source, ["artifact", "sha256"], ["artifact", "sha256"], "source", "design tool receipt");
  assertString(receipt.source.artifact, "source.artifact", "design tool receipt");
  if (!/^[a-f0-9]{64}$/.test(receipt.source.sha256 || "")) fail("design tool receipt", "source.sha256 must be SHA-256");
  assertKeys(receipt.mappings, ["elements", "components", "tokens", "sourceLocations"], ["elements", "components", "tokens", "sourceLocations"], "mappings", "design tool receipt");
  for (const key of ["elements", "components", "tokens", "sourceLocations"]) assertStringArray(receipt.mappings[key], `mappings.${key}`, "design tool receipt");
  if (typeof receipt.editable !== "boolean") fail("design tool receipt", "editable must be boolean");
  assertStringArray(receipt.evidence, "evidence", "design tool receipt");
  if (receipt.provider.availability !== "available" && receipt.status === "valid") fail("design tool receipt", "an unavailable provider cannot produce a valid receipt");
  if (receipt.status === "valid" && (!receipt.editable || !receipt.evidence.length || !receipt.mappings.elements.length)) fail("design tool receipt", "valid handoff requires editable element mappings and evidence");
  return { status: receipt.status, provider: receipt.provider.id, availability: receipt.provider.availability, operation: receipt.operation };
}

function evaluateIntake(intake) {
  const required = ["schema", "adapterId", "source", "license", "maintenance", "security", "adoption", "decision"];
  assertKeys(intake, required, [...required, "score"], "intake", "adapter intake");
  if (intake.schema !== "design-pipeline.adapter-intake.v1") fail("adapter intake", "unsupported schema");
  assertString(intake.adapterId, "adapterId", "adapter intake");
  assertKeys(intake.source, ["url", "revision", "sha256"], ["url", "revision", "sha256"], "source", "adapter intake");
  assertString(intake.source.url, "source.url", "adapter intake");
  assertString(intake.source.revision, "source.revision", "adapter intake");
  if (!/^(?:[a-f0-9]{40,64}|v?\d+\.\d+\.\d+(?:[-+][A-Za-z0-9.-]+)?)$/.test(intake.source.revision)) fail("adapter intake", "source.revision must be an immutable commit or version");
  if (!/^[a-f0-9]{64}$/.test(intake.source.sha256 || "")) fail("adapter intake", "source.sha256 must be SHA-256");
  assertKeys(intake.license, ["state", "id", "evidence"], ["state", "id", "evidence"], "license", "adapter intake");
  assertEnum(intake.license.state, ["verified", "unsafe", "unknown"], "license.state", "adapter intake");
  assertStringArray(intake.license.evidence, "license.evidence", "adapter intake");
  assertKeys(intake.maintenance, ["status", "evidence"], ["status", "evidence"], "maintenance", "adapter intake");
  assertEnum(intake.maintenance.status, ["active", "inactive", "unknown"], "maintenance.status", "adapter intake");
  assertStringArray(intake.maintenance.evidence, "maintenance.evidence", "adapter intake");
  assertKeys(intake.security, ["permissions", "network", "executableRemotePrompts", "evidence"], ["permissions", "network", "executableRemotePrompts", "evidence"], "security", "adapter intake");
  assertStringArray(intake.security.permissions, "security.permissions", "adapter intake");
  assertEnum(intake.security.network, ["none", "declared", "unbounded", "unknown"], "security.network", "adapter intake");
  if (typeof intake.security.executableRemotePrompts !== "boolean") fail("adapter intake", "security.executableRemotePrompts must be boolean");
  assertStringArray(intake.security.evidence, "security.evidence", "adapter intake");
  assertKeys(intake.adoption, ["mode", "updatePolicy", "removalPolicy"], ["mode", "updatePolicy", "removalPolicy"], "adoption", "adapter intake");
  assertEnum(intake.adoption.mode, ["principle", "template", "code"], "adoption.mode", "adapter intake");
  assertString(intake.adoption.updatePolicy, "adoption.updatePolicy", "adapter intake");
  assertString(intake.adoption.removalPolicy, "adoption.removalPolicy", "adapter intake");
  assertKeys(intake.decision, ["requestedSupport"], ["requestedSupport"], "decision", "adapter intake");
  assertEnum(intake.decision.requestedSupport, SUPPORT, "decision.requestedSupport", "adapter intake");
  if (intake.score != null) {
    assertKeys(intake.score, ["value", "source", "revision", "timestamp"], ["value", "source", "revision", "timestamp"], "score", "adapter intake");
    if (typeof intake.score.value !== "number" || !Number.isFinite(intake.score.value)) fail("adapter intake", "score.value must be finite");
    for (const key of ["source", "revision", "timestamp"]) assertString(intake.score[key], `score.${key}`, "adapter intake");
  }
  const blockers = [];
  if (intake.license.state !== "verified") blockers.push(`license:${intake.license.state}`);
  if (!intake.license.evidence.length) blockers.push("license:evidence-missing");
  if (intake.security.executableRemotePrompts) blockers.push("security:remote-prompts");
  if (["unbounded", "unknown"].includes(intake.security.network)) blockers.push(`security:network-${intake.security.network}`);
  if (intake.security.permissions.some((permission) => ["admin", "shell-unrestricted", "filesystem-unrestricted"].includes(permission))) blockers.push("security:excessive-permissions");
  if (!intake.security.evidence.length) blockers.push("security:evidence-missing");
  if (["native", "companion"].includes(intake.decision.requestedSupport) && intake.maintenance.status !== "active") blockers.push(`maintenance:${intake.maintenance.status}`);
  return { status: blockers.length ? "blocked" : "admissible", adapterId: intake.adapterId, requestedSupport: intake.decision.requestedSupport, blockers };
}

function validateStyleSignals(catalog) {
  assertKeys(catalog, ["schema", "version", "signals"], ["schema", "version", "signals"], "catalog", "style signals");
  if (catalog.schema !== "design-pipeline.visual-style-signals.v1") fail("style signals", "unsupported schema");
  assertString(catalog.version, "version", "style signals");
  if (!Array.isArray(catalog.signals) || !catalog.signals.length) fail("style signals", "signals must be a non-empty array");
  const ids = new Set();
  for (const signal of catalog.signals) {
    assertKeys(signal, ["id", "name", "facets", "decisionLinks", "provenance"], ["id", "name", "facets", "decisionLinks", "provenance"], "signal", "style signals");
    assertString(signal.id, "signal.id", "style signals");
    if (ids.has(signal.id)) fail("style signals", `duplicate signal ${signal.id}`);
    ids.add(signal.id);
    assertString(signal.name, `${signal.id}.name`, "style signals");
    assertKeys(signal.facets, ["defining", "supporting", "variable", "avoid"], ["defining", "supporting", "variable", "avoid"], `${signal.id}.facets`, "style signals");
    for (const key of ["defining", "supporting", "variable", "avoid"]) assertStringArray(signal.facets[key], `${signal.id}.facets.${key}`, "style signals", { min: 1, unique: true });
    assertKeys(signal.decisionLinks, ["design", "motion"], ["design", "motion"], `${signal.id}.decisionLinks`, "style signals");
    assertStringArray(signal.decisionLinks.design, `${signal.id}.decisionLinks.design`, "style signals", { min: 1 });
    assertStringArray(signal.decisionLinks.motion, `${signal.id}.decisionLinks.motion`, "style signals", { min: 1 });
    assertString(signal.provenance, `${signal.id}.provenance`, "style signals");
  }
  return { status: "valid", signals: catalog.signals.length };
}

module.exports = { AVAILABILITY, FAMILIES, SUPPORT, evaluateIntake, validateDesignToolReceipt, validateRegistry, validateStyleSignals };

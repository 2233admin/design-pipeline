"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { validateRegistry } = require("./adapter-core.cjs");
const { resolveFrontendStack } = require("./frontend-stack-core.cjs");
const {
  assertEnum,
  assertKeys,
  assertObject,
  assertString,
  assertStringArray,
  canonicalJson,
  fail,
  pathInside,
  sha256,
  sortValue,
} = require("./contract-utils.cjs");

const REQUEST_SCHEMA = "design-pipeline.toolchain-request.v1";
const PLAN_SCHEMA = "design-pipeline.toolchain-plan.v1";
const PROBE_SCHEMA = "design-pipeline.toolchain-probe-result.v1";
const RECEIPT_SCHEMA = "design-pipeline.toolchain-receipt.v1";
const FRONTEND_REQUEST_SCHEMA = "design-pipeline.frontend-stack-request.v1";
const RUNNABLE_SUPPORT = new Set(["native", "generic-workflow", "companion"]);

function invalid(message) { fail("toolchain", message); }

function validateRequest(request) {
  assertKeys(
    request,
    ["schema", "framework", "brief"],
    ["schema", "framework", "brief", "existing", "requested", "capabilities", "graphics"],
    "request",
    "toolchain",
  );
  if (request.schema !== REQUEST_SCHEMA) invalid("unsupported request schema");
  assertString(request.framework, "framework", "toolchain");
  assertString(request.brief, "brief", "toolchain");
  if (request.existing !== undefined) assertObject(request.existing, "existing", "toolchain");
  if (request.requested !== undefined) assertObject(request.requested, "requested", "toolchain");
  if (request.capabilities !== undefined) assertStringArray(request.capabilities, "capabilities", "toolchain", { unique: true });
  if (request.graphics !== undefined) {
    assertKeys(request.graphics, [], ["family", "adapter"], "graphics", "toolchain");
    if (request.graphics.family === undefined && request.graphics.adapter === undefined) invalid("graphics requires family or adapter");
    if (request.graphics.family !== undefined) assertString(request.graphics.family, "graphics.family", "toolchain");
    if (request.graphics.adapter !== undefined) assertString(request.graphics.adapter, "graphics.adapter", "toolchain");
  }
  return request;
}

function frontendRequest(request) {
  return {
    schema: FRONTEND_REQUEST_SCHEMA,
    framework: request.framework,
    brief: request.brief,
    ...(request.existing ? { existing: request.existing } : {}),
    ...(request.requested ? { requested: request.requested } : {}),
    ...(request.capabilities ? { capabilities: request.capabilities } : {}),
  };
}

function requestedGraphics(request) {
  if (request.graphics) return request.graphics;
  const existing = request.existing?.graphics;
  if (typeof existing === "string") return { adapter: existing };
  if (existing && typeof existing === "object" && !Array.isArray(existing)) return existing;
  return null;
}

function selectGraphics(request, registry, catalog, blockers) {
  const wanted = requestedGraphics(request);
  if (!wanted) return null;
  let adapter = wanted.adapter
    ? registry.adapters.find((item) => item.id === wanted.adapter)
    : null;
  if (wanted.adapter && !adapter) invalid(`unknown graphics adapter ${wanted.adapter}`);
  if (!adapter) {
    const route = catalog.routes.find((item) => item.family === wanted.family);
    if (!route) invalid(`unknown graphics family ${wanted.family}`);
    const candidates = route.adapterIds.map((id) => registry.adapters.find((item) => item.id === id));
    adapter = request.framework.toLowerCase() === "reflex"
      ? candidates.find((item) => item.id === "reflex-xy")
      : candidates.find((item) => RUNNABLE_SUPPORT.has(item.support));
    if (!adapter) invalid(`graphics family ${wanted.family} has no runnable adapter`);
  }
  if (wanted.family && adapter.family !== wanted.family) invalid(`${adapter.id} does not belong to ${wanted.family}`);
  if (!RUNNABLE_SUPPORT.has(adapter.support)) blockers.push(`${adapter.id} is ${adapter.support} and has no trusted execution route`);
  if (!adapter.lifecycle) blockers.push(`${adapter.id} has no probe/plan/invoke/verify lifecycle`);
  if (adapter.id === "reflex-xy" && !["reflex", "agnostic"].includes(request.framework.toLowerCase())) {
    blockers.push("reflex-xy requires framework reflex or agnostic");
  }
  return adapter;
}

function frontendStages(route) {
  const lifecycle = route.lifecycle;
  return {
    tool: {
      id: route.id,
      source: "frontend-stack",
      mode: route.mode,
      status: route.status,
    },
    probe: lifecycle?.probe ? {
      toolId: route.id,
      status: "pending",
      ...lifecycle.probe,
    } : {
      toolId: route.id,
      kind: "catalog",
      status: route.status === "ready" ? "available" : "review",
      command: null,
    },
    invocation: lifecycle?.invoke ? {
      toolId: route.id,
      ...lifecycle.invoke,
    } : {
      toolId: route.id,
      kind: "agent-route",
      owner: "agent",
      target: route.id,
      command: null,
    },
    verification: lifecycle?.verify ? {
      toolId: route.id,
      ...lifecycle.verify,
    } : {
      toolId: route.id,
      receiptSchema: RECEIPT_SCHEMA,
      evidenceTypes: route.capabilities,
    },
  };
}

function graphicsStages(adapter) {
  if (!adapter) return null;
  const lifecycle = adapter.lifecycle;
  return {
    tool: {
      id: adapter.id,
      source: "graphics-runtime",
      mode: adapter.kind,
      status: adapter.support,
    },
    probe: lifecycle
      ? { toolId: adapter.id, status: "pending", ...lifecycle.probe }
      : { toolId: adapter.id, kind: "manual", status: "missing", command: null },
    invocation: lifecycle
      ? { toolId: adapter.id, ...lifecycle.invoke }
      : { toolId: adapter.id, kind: "manual", owner: "target-project", command: null },
    verification: lifecycle
      ? { toolId: adapter.id, ...lifecycle.verify }
      : { toolId: adapter.id, receiptSchema: RECEIPT_SCHEMA, evidenceTypes: adapter.evidenceTypes },
  };
}

function resolveToolchain(request, sources) {
  validateRequest(request);
  const { frontendRegistry, skillCatalog, adapterRegistry, graphicsCatalog } = sources;
  validateRegistry(adapterRegistry, graphicsCatalog);
  const frontend = resolveFrontendStack(frontendRequest(request), frontendRegistry, skillCatalog);
  const blockers = [...frontend.blockers];
  const graphicsAdapter = selectGraphics(request, adapterRegistry, graphicsCatalog, blockers);
  const stages = frontend.toolRoutes.map(frontendStages);
  const graphics = graphicsStages(graphicsAdapter);
  if (graphics) stages.push(graphics);
  const plan = {
    schema: PLAN_SCHEMA,
    status: blockers.length ? "blocked" : "ready",
    framework: frontend.framework,
    brief: request.brief,
    styling: frontend.selected.styling,
    uiLibrary: frontend.selected.uiLibrary,
    graphics: graphicsAdapter
      ? {
          id: graphicsAdapter.id,
          family: graphicsAdapter.family,
          support: graphicsAdapter.support,
          versionRange: graphicsAdapter.versionRange,
          guide: graphicsAdapter.lifecycle?.plan.guide || null,
        }
      : null,
    tools: stages.map((item) => item.tool),
    probes: stages.map((item) => item.probe),
    invocations: stages.map((item) => item.invocation),
    verification: stages.map((item) => item.verification),
    recommendedSkills: frontend.recommendedSkills,
    blockers,
    reviews: frontend.reviews,
    evidence: frontend.evidence,
    sourceHashes: {
      frontendRegistry: sha256(canonicalJson(frontendRegistry)),
      adapterRegistry: sha256(canonicalJson(adapterRegistry)),
      graphicsCatalog: sha256(canonicalJson(graphicsCatalog)),
    },
  };
  return sortValue(plan);
}

function boundedProbeEnv() {
  const keys = ["PATH", "Path", "PATHEXT", "SYSTEMROOT", "SystemRoot", "WINDIR", "VIRTUAL_ENV", "PYTHONHOME", "PYTHONPATH"];
  return Object.fromEntries(keys.filter((key) => process.env[key] !== undefined).map((key) => [key, process.env[key]]));
}

function probeMessage(child) {
  const raw = String(child.status === 0 ? child.stdout : child.stderr || child.stdout || `probe exited ${child.status}`).trim();
  if (child.status === 0) return raw;
  return raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).at(-1) || `probe exited ${child.status}`;
}

function probeToolchain(plan, options = {}) {
  const projectRoot = fs.realpathSync(path.resolve(options.projectRoot || process.cwd()));
  if (plan.status === "blocked") {
    return sortValue({
      schema: PROBE_SCHEMA,
      status: "blocked",
      planSha256: sha256(canonicalJson(plan)),
      results: [],
      blockers: [...plan.blockers],
    });
  }
  const runner = options.runner || spawnSync;
  const results = plan.probes.map((probe) => {
    if (probe.kind === "catalog") return { toolId: probe.toolId, status: probe.status, version: null, message: "catalog route resolved" };
    if (!Array.isArray(probe.command) || !probe.command.length) return { toolId: probe.toolId, status: "unavailable", version: null, message: "no trusted probe command" };
    const child = runner(probe.command[0], probe.command.slice(1), {
      cwd: projectRoot,
      encoding: "utf8",
      env: boundedProbeEnv(),
      windowsHide: true,
      timeout: probe.timeoutMs,
      maxBuffer: 1024 * 1024,
    });
    if (child.error) return { toolId: probe.toolId, status: "unavailable", version: null, message: child.error.message };
    const message = probeMessage(child);
    return { toolId: probe.toolId, status: child.status === 0 ? "available" : "unavailable", version: child.status === 0 ? message || null : null, message: message || "probe completed" };
  });
  const blockers = results.filter((item) => item.status === "unavailable").map((item) => `${item.toolId}: ${item.message}`);
  return sortValue({
    schema: PROBE_SCHEMA,
    status: blockers.length ? "blocked" : "ready",
    planSha256: sha256(canonicalJson(plan)),
    results,
    blockers,
  });
}

function validateToolchainReceipt(receipt, options = {}) {
  const keys = ["schema", "id", "planSha256", "status", "tool", "invocation", "startedAt", "completedAt", "artifacts", "evidenceReceipts", "notes"];
  assertKeys(receipt, keys, keys, "receipt", "toolchain receipt");
  if (receipt.schema !== RECEIPT_SCHEMA) fail("toolchain receipt", "unsupported schema");
  assertString(receipt.id, "id", "toolchain receipt");
  if (!/^[a-f0-9]{64}$/.test(receipt.planSha256 || "")) fail("toolchain receipt", "planSha256 must be SHA-256");
  assertEnum(receipt.status, ["complete", "partial", "blocked"], "status", "toolchain receipt");
  assertKeys(receipt.tool, ["id", "version"], ["id", "version"], "tool", "toolchain receipt");
  assertString(receipt.tool.id, "tool.id", "toolchain receipt");
  assertString(receipt.tool.version, "tool.version", "toolchain receipt");
  assertKeys(receipt.invocation, ["kind", "command", "exitCode"], ["kind", "command", "exitCode"], "invocation", "toolchain receipt");
  assertString(receipt.invocation.kind, "invocation.kind", "toolchain receipt");
  assertStringArray(receipt.invocation.command, "invocation.command", "toolchain receipt", { min: 1 });
  if (!Number.isInteger(receipt.invocation.exitCode)) fail("toolchain receipt", "invocation.exitCode must be an integer");
  for (const key of ["startedAt", "completedAt"]) if (!Number.isFinite(Date.parse(receipt[key]))) fail("toolchain receipt", `${key} must be a date-time`);
  if (Date.parse(receipt.completedAt) < Date.parse(receipt.startedAt)) fail("toolchain receipt", "completedAt precedes startedAt");
  if (!Array.isArray(receipt.artifacts)) fail("toolchain receipt", "artifacts must be an array");
  assertStringArray(receipt.evidenceReceipts, "evidenceReceipts", "toolchain receipt");
  assertStringArray(receipt.notes, "notes", "toolchain receipt");
  const evidenceRoot = options.evidenceRoot ? fs.realpathSync(path.resolve(options.evidenceRoot)) : null;
  for (const artifact of receipt.artifacts) {
    assertKeys(artifact, ["type", "path", "sha256"], ["type", "path", "sha256"], "artifact", "toolchain receipt");
    assertString(artifact.type, "artifact.type", "toolchain receipt");
    assertString(artifact.path, "artifact.path", "toolchain receipt");
    if (path.isAbsolute(artifact.path) || !/^[a-f0-9]{64}$/.test(artifact.sha256 || "")) fail("toolchain receipt", "artifact path/hash is invalid");
    if (evidenceRoot && options.requireFiles) {
      const target = path.resolve(evidenceRoot, artifact.path);
      if (!pathInside(evidenceRoot, target) || !fs.existsSync(target)) fail("toolchain receipt", `artifact is missing or escapes evidence root: ${artifact.path}`);
      const real = fs.realpathSync(target);
      if (!pathInside(evidenceRoot, real) || fs.lstatSync(target).isSymbolicLink() || !fs.statSync(real).isFile()) fail("toolchain receipt", `artifact is not a contained file: ${artifact.path}`);
      const actual = crypto.createHash("sha256").update(fs.readFileSync(real)).digest("hex");
      if (actual !== artifact.sha256) fail("toolchain receipt", `artifact hash mismatch: ${artifact.path}`);
    }
  }
  if (options.plan && receipt.planSha256 !== sha256(canonicalJson(options.plan))) fail("toolchain receipt", "planSha256 does not match the plan");
  if (receipt.status === "complete" && (receipt.invocation.exitCode !== 0 || (!receipt.artifacts.length && !receipt.evidenceReceipts.length))) {
    fail("toolchain receipt", "complete receipt requires a successful invocation and evidence");
  }
  return { status: receipt.status, tool: receipt.tool.id, artifacts: receipt.artifacts.length, evidenceReceipts: receipt.evidenceReceipts.length };
}

module.exports = {
  PLAN_SCHEMA,
  PROBE_SCHEMA,
  RECEIPT_SCHEMA,
  REQUEST_SCHEMA,
  probeToolchain,
  resolveToolchain,
  validateRequest,
  validateToolchainReceipt,
};

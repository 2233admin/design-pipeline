"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { validateRegistry } = require("./adapter-core.cjs");
const { resolveFrontendStack } = require("./frontend-stack-core.cjs");
const { bindJobPlan, classifyDeliverableForm, DELIVERABLE_FORMS, validateJobPlan } = require("./job-route-core.cjs");
const {
  assertEnum,
  assertKeys,
  assertObject,
  assertString,
  assertStringArray,
  canonicalJson,
  fail,
  nonEmpty,
  pathInside,
  resolveInside,
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

// One convention for request paths relative to --root: `\` becomes `/`, then the path is
// POSIX-normalised without trailing `/`. Drive letters (any `:`), absolute paths and `..`
// segments (checked before normalising, so `a/../b` is rejected too) are refused.
function containedRelativePath(raw, label, { allowRoot }) {
  assertString(raw, label, "toolchain");
  const slashed = raw.replace(/\\/g, "/");
  const reject = (reason) => invalid(`${label} must be a contained relative path: ${reason}`);
  if (slashed.includes(":")) reject("drive letters and ':' are not allowed");
  if (path.posix.isAbsolute(slashed)) reject("absolute paths are not allowed");
  if (slashed.split("/").includes("..")) reject("'..' segments are not allowed");
  const normalized = path.posix.normalize(slashed).replace(/\/+$/, "") || ".";
  if (normalized === "." && !allowRoot) reject("it must name a file, not the root");
  return normalized;
}

function validateRequest(request) {
  if (!request || typeof request !== "object") invalid("request must be an object");
  if (request.schema !== REQUEST_SCHEMA) invalid("unsupported request schema");
  const missing = ["jobId", "jobPlanSha256", "jobPlanPath", "deliverableForm"].filter((field) => !request[field]);
  if (missing.length) invalid(`missing Stage 0 binding: ${missing.join(", ")}`);
  assertKeys(
    request,
    ["schema", "framework", "brief", "jobId", "jobPlanSha256", "jobPlanPath", "deliverableForm"],
    ["schema", "framework", "brief", "existing", "requested", "capabilities", "graphics", "context", "jobId", "jobPlanSha256", "jobPlanPath", "deliverableForm", "targetRoot"],
    "request",
    "toolchain",
  );
  assertString(request.framework, "framework", "toolchain");
  assertString(request.brief, "brief", "toolchain");
  assertString(request.jobId, "jobId", "toolchain");
  assertString(request.jobPlanPath, "jobPlanPath", "toolchain");
  assertString(request.deliverableForm, "deliverableForm", "toolchain");
  if (!DELIVERABLE_FORMS.includes(request.deliverableForm)) invalid("deliverableForm is invalid");
  if (!/^[a-f0-9]{64}$/.test(request.jobPlanSha256)) invalid("jobPlanSha256 must be SHA-256");
  if (request.existing !== undefined) assertObject(request.existing, "existing", "toolchain");
  if (request.requested !== undefined) assertObject(request.requested, "requested", "toolchain");
  if (request.capabilities !== undefined) assertStringArray(request.capabilities, "capabilities", "toolchain", { unique: true });
  if (request.context !== undefined) assertObject(request.context, "context", "toolchain");
  if (request.graphics !== undefined) {
    assertKeys(request.graphics, [], ["family", "adapter"], "graphics", "toolchain");
    if (request.graphics.family === undefined && request.graphics.adapter === undefined) invalid("graphics requires family or adapter");
    if (request.graphics.family !== undefined) assertString(request.graphics.family, "graphics.family", "toolchain");
    if (request.graphics.adapter !== undefined) assertString(request.graphics.adapter, "graphics.adapter", "toolchain");
  }
  if (request.targetRoot === undefined) return request;
  return { ...request, targetRoot: containedRelativePath(request.targetRoot, "targetRoot", { allowRoot: true }) };
}

function buildToolchainRequest(jobPlan, choices, jobPlanPath) {
  validateJobPlan(jobPlan);
  assertObject(choices, "choices", "toolchain");
  const relativePath = containedRelativePath(jobPlanPath, "jobPlanPath", { allowRoot: false });
  const binding = {
    schema: REQUEST_SCHEMA,
    brief: jobPlan.query,
    jobId: jobPlan.jobId,
    jobPlanSha256: jobPlan.planSha256,
    jobPlanPath: relativePath,
    deliverableForm: jobPlan.deliverableForm,
  };
  for (const [field, value] of Object.entries(binding)) {
    if (Object.hasOwn(choices, field) && choices[field] !== value) invalid(`${field} conflict: choices do not match the job plan`);
  }
  const request = validateRequest({ ...binding, ...choices });
  bindJobPlan(request, jobPlan);
  return sortValue(request);
}

function frontendRequest(request) {
  return {
    schema: FRONTEND_REQUEST_SCHEMA,
    framework: request.framework,
    brief: request.brief,
    ...(request.existing ? { existing: request.existing } : {}),
    ...(request.requested ? { requested: request.requested } : {}),
    ...(request.capabilities ? { capabilities: request.capabilities } : {}),
    ...(request.context !== undefined ? { context: request.context } : {}),
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
  const governedReview = route.status !== "ready";
  return {
    tool: {
      id: route.id,
      source: "frontend-stack",
      mode: route.mode,
      status: route.status,
    },
    probe: governedReview ? {
      toolId: route.id,
      kind: "governed-review",
      status: "review",
      command: null,
    } : lifecycle?.probe ? {
      toolId: route.id,
      status: "pending",
      ...lifecycle.probe,
    } : {
      toolId: route.id,
      kind: "catalog",
      status: route.status === "ready" ? "available" : "review",
      command: null,
    },
    invocation: governedReview ? {
      toolId: route.id,
      kind: "governed-review",
      owner: "agent",
      target: route.id,
      status: "review",
      command: null,
    } : lifecycle?.invoke ? {
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

function resolveToolchain(input, sources, options = {}) {
  const request = validateRequest(input);
  const jobPlan = bindJobPlan(request, options.jobPlan);
  const classifiedForm = classifyDeliverableForm(request.brief);
  if (classifiedForm !== request.deliverableForm) invalid(`deliverable-form conflict: brief classified as ${classifiedForm}, request declares ${request.deliverableForm}`);

  const { frontendRegistry, skillCatalog, adapterRegistry, graphicsCatalog } = sources;
  validateRegistry(adapterRegistry, graphicsCatalog);
  const frontend = resolveFrontendStack(frontendRequest(request), frontendRegistry, skillCatalog);
  const blockers = [...frontend.blockers];
  const wanted = requestedGraphics(request);
  const missingGraphics = jobPlan.primaryKnowledge.id === "graphics-runtime" && ![wanted?.family, wanted?.adapter].some(nonEmpty);
  if (missingGraphics) {
    blockers.push("graphics-runtime requires an explicit graphics family or adapter in graphics or existing.graphics");
  }
  const graphicsAdapter = missingGraphics ? null : selectGraphics(request, adapterRegistry, graphicsCatalog, blockers);
  const stages = frontend.toolRoutes.map(frontendStages);
  const graphics = graphicsStages(graphicsAdapter);
  if (graphics) stages.push(graphics);
  const plan = {
    schema: PLAN_SCHEMA,
    status: blockers.length ? "blocked" : "ready",
    deliverableForm: request.deliverableForm,
    targetRoot: request.targetRoot ?? ".",
    framework: frontend.framework,
    brief: request.brief,
    styling: frontend.selected.styling,
    uiLibrary: frontend.selected.uiLibrary,
    primaryRouteId: frontend.primaryRoute?.id || null,
    routingContext: frontend.routingContext || null,
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
    jobId: jobPlan.jobId,
    jobPlanSha256: jobPlan.planSha256,
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

// The only source of the directory where target-project commands run: --root plus the plan's
// targetRoot. It must exist, be a directory, and keep its real path inside root (junctions
// included). Callers cannot supply a directory, so a probe can neither run elsewhere nor report a
// directory it did not use.
function targetDirectory(root, targetRoot) {
  const realRoot = fs.realpathSync(path.resolve(root));
  const real = fs.realpathSync(resolveInside(realRoot, targetRoot, "targetRoot", { scope: "toolchain", mustExist: true }));
  resolveInside(realRoot, real, "targetRoot", { scope: "toolchain" });
  if (!fs.statSync(real).isDirectory()) invalid(`targetRoot must be a directory: ${targetRoot}`);
  return real;
}

// A failed command probe names the directory it actually ran in, relative to --root, so a probe
// of the wrong package (for example a forgotten targetRoot) explains itself.
function unavailable(probe, where, message) {
  return { toolId: probe.toolId, status: "unavailable", version: null, message: `${message} (probed in ${where})` };
}

function probeToolchain(plan, options) {
  assertKeys(options, ["root"], ["root", "runner"], "probe options", "toolchain");
  const root = fs.realpathSync(path.resolve(options.root));
  const cwd = targetDirectory(root, plan.targetRoot);
  const where = path.relative(root, cwd).split(path.sep).join("/") || ".";
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
    if (probe.kind === "governed-review") return { toolId: probe.toolId, status: "review", version: null, message: "review route was not probed" };
    if (!Array.isArray(probe.command) || !probe.command.length) return { toolId: probe.toolId, status: "unavailable", version: null, message: "no trusted probe command" };
    const child = runner(probe.command[0], probe.command.slice(1), {
      cwd,
      encoding: "utf8",
      env: boundedProbeEnv(),
      windowsHide: true,
      timeout: probe.timeoutMs,
      maxBuffer: 1024 * 1024,
    });
    if (child.error) return unavailable(probe, where, child.error.message);
    const message = probeMessage(child);
    if (child.status !== 0) return unavailable(probe, where, message);
    return { toolId: probe.toolId, status: "available", version: message || null, message: message || "probe completed" };
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
  buildToolchainRequest,
  probeToolchain,
  resolveToolchain,
  targetDirectory,
  validateRequest,
  validateToolchainReceipt,
};

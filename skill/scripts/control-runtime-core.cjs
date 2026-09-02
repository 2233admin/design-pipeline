"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { advanceChange, inspectConsistency, validateState } = require("./pipeline-state-core.cjs");
const { canonicalJson, fail, readJson, resolveInside, sha256 } = require("./contract-utils.cjs");
const { validateArtifactMetadata } = require("./artifact-core.cjs");
const { validatePlan } = require("./plan-core.cjs");
const { detectStaleArtifacts } = require("./invalidation-core.cjs");

const COMPLETE_PHASE_STATUSES = new Set(["ready", "complete"]);
const PACKAGE_SCHEMA = "design-pipeline.package.v1";

function normalized(value) { return String(value).replaceAll("\\", "/"); }
function stateFiles(changeRoot) { return { stateFile: path.join(changeRoot, "state.json"), eventsFile: path.join(changeRoot, "events.jsonl") }; }
function readState(changeRoot) {
  const files = stateFiles(changeRoot);
  const state = readJson(files.stateFile, "pipeline state");
  validateState(state);
  if (!fs.existsSync(files.eventsFile)) fail("control runtime", `events are missing: ${files.eventsFile}`, { code: "EVENTS_MISSING" });
  const consistency = inspectConsistency(state, fs.readFileSync(files.eventsFile, "utf8"));
  if (consistency.status !== "consistent") fail("control runtime", `state and events are ${consistency.status}`, { code: "REPAIR_REQUIRED" });
  return { ...files, state, consistency };
}

function readPlan(planFile) {
  const plan = readJson(planFile, "design plan");
  validatePlan(plan, { requireRunnable: true });
  return plan;
}

function inventoryFromValue(value) {
  if (Array.isArray(value)) return value;
  if (value && Array.isArray(value.artifacts)) return value.artifacts;
  if (value && value.artifacts && typeof value.artifacts === "object") return Object.values(value.artifacts);
  if (value && typeof value === "object") {
    const entries = Object.values(value);
    if (entries.every((entry) => entry && typeof entry === "object" && !Array.isArray(entry) && entry.path)) return entries;
  }
  return [];
}

function loadArtifacts(changeRoot, state) {
  const candidates = [
    state.extensions?.control?.artifacts,
    path.join(changeRoot, "artifact-manifest.json"),
    path.join(changeRoot, "artifacts.json"),
  ];
  for (const candidate of candidates) {
    if (!candidate) continue;
    if (typeof candidate === "string") {
      const manifestFile = resolveInside(changeRoot, candidate, "artifact manifest", { scope: "control runtime", mustExist: false });
      if (!fs.existsSync(manifestFile)) continue;
      return inventoryFromValue(readJson(manifestFile, "artifact manifest"));
    }
    if (Array.isArray(candidate) || (candidate && typeof candidate === "object")) return inventoryFromValue(candidate);
  }
  return [];
}

function phaseRecords(plan, control = {}) {
  const records = control.phases && typeof control.phases === "object" ? control.phases : {};
  return Object.fromEntries(plan.phases.map((phase) => [phase.id, {
    status: records[phase.id]?.status || "not_started",
    blockers: records[phase.id]?.blockers || [],
    nextActions: records[phase.id]?.nextActions || [],
    artifacts: records[phase.id]?.artifacts || [],
  }]));
}

function artifactByPath(artifacts) { return new Map(artifacts.map((artifact) => [normalized(artifact.path), artifact])); }

function dependencyBlockers(metadata, artifactIndex, changeRoot, seen = new Set()) {
  const artifactPath = normalized(metadata.path);
  if (seen.has(artifactPath)) return [{ code: "DEPENDENCY_CYCLE", artifact: metadata.path, message: `artifact dependency cycle includes ${metadata.path}` }];
  const nextSeen = new Set(seen).add(artifactPath);
  return metadata.dependencies.flatMap((dependencyPath) => {
    const dependency = artifactIndex.get(normalized(dependencyPath));
    if (!dependency) return [{ code: "DEPENDENCY_MISSING", artifact: metadata.path, dependency: dependencyPath, message: `${metadata.path} depends on missing artifact ${dependencyPath}` }];
    const result = validateArtifactMetadata(dependency, { changeRoot, requireFile: true });
    if (result.status !== "ready") return [{ code: result.code || "DEPENDENCY_NOT_READY", artifact: metadata.path, dependency: dependencyPath, message: result.reason || `${dependencyPath} is ${result.status}` }];
    return dependencyBlockers(dependency, artifactIndex, changeRoot, nextSeen);
  });
}

function pathKey(file) {
  const resolved = path.resolve(file);
  let cursor = resolved;
  const suffix = [];
  while (!fs.existsSync(cursor) && path.dirname(cursor) !== cursor) {
    suffix.unshift(path.basename(cursor));
    cursor = path.dirname(cursor);
  }
  let canonical = resolved;
  if (fs.existsSync(cursor)) {
    try { canonical = path.join(fs.realpathSync.native(cursor), ...suffix); } catch {}
  }
  return process.platform === "win32" ? canonical.toLowerCase() : canonical;
}

function outputPathBlocker(changeRoot, outputFile) {
  if (!outputFile) return null;
  const root = path.resolve(changeRoot);
  const target = path.resolve(outputFile);
  const relative = path.relative(root, target);
  if (relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    return { code: "OUTPUT_OUTSIDE_CHANGE_ROOT", path: normalized(relative), message: "package output must stay inside the change root" };
  }
  let current = root;
  for (const segment of relative ? relative.split(path.sep) : []) {
    current = path.join(current, segment);
    try {
      if (fs.lstatSync(current).isSymbolicLink()) return { code: "OUTPUT_PATH_SYMLINK", path: normalized(path.relative(root, current)), message: "package output cannot traverse a symbolic link" };
    } catch (error) {
      if (error.code === "ENOENT") break;
      throw error;
    }
  }
  return null;
}

function outputIdentityCollision(outputFile, reservedPaths) {
  if (!outputFile) return null;
  let targetStat;
  try { targetStat = fs.statSync(outputFile); } catch (error) { if (error.code === "ENOENT") return null; throw error; }
  if (!targetStat.isFile()) return null;
  for (const reserved of reservedPaths) {
    let reservedStat;
    try { reservedStat = fs.statSync(reserved); } catch (error) { if (error.code === "ENOENT") continue; throw error; }
    if (reservedStat.isFile() && targetStat.dev === reservedStat.dev && targetStat.ino === reservedStat.ino) {
      return { code: "OUTPUT_COLLISION", path: normalized(path.relative(path.dirname(reserved), outputFile)), message: "package output aliases a control or required artifact" };
    }
  }
  return null;
}

function outputCollision(changeRoot, outputFile, reserved) {
  if (!outputFile) return null;
  const target = path.resolve(outputFile);
  return reserved.has(pathKey(target)) ? { code: "OUTPUT_COLLISION", path: normalized(path.relative(changeRoot, target)), message: "package output would overwrite a control or required artifact" } : null;
}

function phaseBlockers(phase, records, artifactIndex, control, changeRoot) {

  const blockers = [];
  for (const dependency of phase.depends_on) {
    if (!COMPLETE_PHASE_STATUSES.has(records[dependency]?.status)) blockers.push({ code: "DEPENDENCY_NOT_READY", phase: dependency, message: `${phase.id} depends on ${dependency}` });
  }
  for (const output of phase.outputs) {
    const artifact = artifactIndex.get(normalized(output));
    if (!artifact) blockers.push({ code: "ARTIFACT_MISSING", path: output, message: `required artifact ${output} is missing` });
    else {
      const result = validateArtifactMetadata(artifact, { changeRoot, requireFile: true });
      if (result.status !== "ready") blockers.push({ code: result.code || "ARTIFACT_NOT_READY", path: output, message: result.reason || `${output} is ${result.status}` });
      else blockers.push(...dependencyBlockers(artifact, artifactIndex, changeRoot));
    }
  }
  for (const gate of phase.gates) if (control.gates?.[gate] !== "passed") blockers.push({ code: "GATE_NOT_VERIFIED", gate, message: `${gate} gate is not passed` });
  return blockers;
}

function persistControl(change, control, input) {
  return advanceChange(change.stateFile, change.eventsFile, {
    expectedSha256: sha256(fs.readFileSync(change.stateFile)),
    timestamp: input.timestamp,
    phase: change.state.phase,
    type: input.type || "control-state",
    summary: input.summary,
    blockers: control.blockers || [],
    nextActions: control.nextActions || [],
    control,
  });
}

function runTo(planFile, changeRoot, targetPhase, options = {}) {
  const plan = readPlan(planFile);
  const change = readState(changeRoot);
  const target = targetPhase || plan.phases.at(-1).id;
  const targetIndex = plan.phases.findIndex((phase) => phase.id === target);
  if (targetIndex < 0) fail("control runtime", `unknown target phase ${target}`, { code: "UNKNOWN_PHASE" });
  const control = change.state.extensions.control || {};
  if (control.planId && control.planId !== plan.plan_id) fail("control runtime", "state is bound to a different plan", { code: "PLAN_MISMATCH" });
  const artifacts = loadArtifacts(changeRoot, change.state);
  const stale = artifacts.length
    ? detectStaleArtifacts(plan, artifacts, { changeRoot, requireFile: true })
    : { status: "ready", artifacts, propagated: [] };
  const stalePhaseIds = new Set((stale.propagated || []).flatMap((item) => item.invalidatedPhases || [item.phase]));
  const records = phaseRecords(plan, control);
  for (const phaseId of stalePhaseIds) {
    if (records[phaseId]) records[phaseId] = { ...records[phaseId], status: "stale" };
  }
  const freshIndex = artifactByPath(stale.artifacts);
  let selected = null;
  let blocked = [];
  for (let index = 0; index <= targetIndex; index += 1) {
    const phase = plan.phases[index];
    if (COMPLETE_PHASE_STATUSES.has(records[phase.id].status)) continue;
    const blockers = phaseBlockers(phase, records, freshIndex, control, changeRoot);
    if (blockers.length) {
      const phaseStatus = blockers.some((item) => item.code === "ARTIFACT_HASH_DRIFT" || item.code === "ARTIFACT_MARKED_STALE" || item.code === "DEPENDENCY_NOT_READY" && /stale/i.test(item.message))
        ? "stale"
        : blockers.some((item) => item.code === "ARTIFACT_INCONCLUSIVE" || item.code === "DEPENDENCY_INCONCLUSIVE") ? "inconclusive" : "blocked";
      records[phase.id] = { ...records[phase.id], status: phaseStatus, blockers, nextActions: blockers.map((item) => item.message) };
      selected = phase.id;
      blocked = blockers;
      break;
    }
    records[phase.id] = { ...records[phase.id], status: "ready", blockers: [], nextActions: [] };
    selected = phase.id;
  }
  const targetRecord = records[target];
  const status = blocked.length ? "blocked" : targetRecord.status;
  const controlStatus = blocked.length ? records[selected].status : status;
  const nextActions = blocked.length ? blocked.map((item) => item.message) : [];
  const outcome = controlStatus === "blocked" ? "blocked" : controlStatus === "inconclusive" ? null : target === plan.phases.at(-1).id ? "complete" : null;
  const nextControl = {
    phaseStatus: controlStatus,
    outcome,
    currentPhase: selected || control.currentPhase || plan.phases[0].id,
    planId: plan.plan_id,
    inputHash: plan.input_hash,
    phases: records,
    blockers: nextActions,
    nextActions,
    staleCauses: Object.fromEntries((stale.propagated || []).flatMap((item) => item.invalidated.map((artifact) => [artifact, item.cause]))),
    artifacts: Object.fromEntries(freshIndex),
    gates: control.gates || {},
  };
  const persisted = persistControl(change, nextControl, {
    timestamp: options.timestamp || new Date().toISOString(),
    summary: blocked.length ? `Control blocked at ${selected}` : `Control advanced through ${selected || target}`,
    type: blocked.length ? "control-blocked" : "control-advance",
  });
  return { status, target, phase: selected || target, outcome, blockers: nextActions, stale: stale.status, state: persisted.state, event: persisted.event, stateSha256: persisted.stateSha256 };
}

function resume(changeRoot, options = {}) {
  const state = readState(changeRoot);
  const planFile = options.planFile || path.join(changeRoot, "plan.json");
  const plan = readPlan(planFile);
  const control = state.state.extensions.control || {};
  const records = phaseRecords(plan, control);
  const phase = plan.phases.find((candidate) => !COMPLETE_PHASE_STATUSES.has(records[candidate.id].status))?.id || plan.phases.at(-1).id;
  return runTo(planFile, changeRoot, phase, options);
}

function explainBlock(changeRoot) {
  const change = readState(changeRoot);
  const control = change.state.extensions.control || {};
  const phase = control.currentPhase || null;
  const phaseBlockers = phase && control.phases?.[phase]?.blockers;
  const blockers = Array.isArray(phaseBlockers) && phaseBlockers.length
    ? phaseBlockers
    : control.blockers || Object.values(control.phases || {}).flatMap((record) => record.blockers || []);
  const status = ["stale", "inconclusive"].includes(control.phaseStatus) ? control.phaseStatus : blockers.length ? "blocked" : control.phaseStatus || "not_started";
  return { status, phase, outcome: control.outcome ?? null, blockers, nextActions: control.nextActions || [] };
}

function packageChange(changeRoot, outputFile, options = {}) {
  const change = readState(changeRoot);
  const planFile = options.planFile || path.join(changeRoot, "plan.json");
  const plan = readPlan(planFile);
  const artifacts = loadArtifacts(changeRoot, change.state);
  const index = artifactByPath(artifacts);
  const required = [...new Set(plan.phases.flatMap((phase) => phase.outputs).filter((output) => !output.startsWith("package/")))];
  const reservedPaths = [...required, "state.json", "events.jsonl", "plan.json", planFile, "artifact-manifest.json", "artifacts.json"]
    .map((file) => path.resolve(changeRoot, file));
  const pathBlocker = outputPathBlocker(changeRoot, outputFile);
  if (pathBlocker) return { status: "blocked", blockers: [pathBlocker], included: [] };
  const identityCollision = outputIdentityCollision(outputFile, reservedPaths);
  if (identityCollision) return { status: "blocked", blockers: [identityCollision], included: [] };
  const collision = outputCollision(changeRoot, outputFile, new Set(reservedPaths.map(pathKey)));
  if (collision) return { status: "blocked", blockers: [collision], included: [] };
  const failures = [];
  const included = [];
  for (const artifactPath of required) {
    const metadata = index.get(normalized(artifactPath));
    if (!metadata) { failures.push({ code: "ARTIFACT_MISSING", path: artifactPath, message: `required artifact ${artifactPath} is missing` }); continue; }
    const result = validateArtifactMetadata(metadata, { changeRoot, requireFile: true });
    if (result.status !== "ready") failures.push({ code: result.code || "ARTIFACT_NOT_READY", path: artifactPath, message: result.reason || `${artifactPath} is ${result.status}` });
    else {
      failures.push(...dependencyBlockers(metadata, index, changeRoot));
      included.push({ path: metadata.path, artifact_hash: metadata.artifact_hash, producer: metadata.producer });
    }
  }
  if (failures.length) return { status: "blocked", blockers: failures, included: [] };
  const output = {
    schema: PACKAGE_SCHEMA,
    schema_version: 1,
    plan_id: plan.plan_id,
    input_hash: plan.input_hash,
    artifacts: included,
    status: "complete",
  };
  if (outputFile) {
    const target = path.resolve(outputFile);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, canonicalJson(output));
  }
  return output;
}

module.exports = { PACKAGE_SCHEMA, explainBlock, loadArtifacts, packageChange, readPlan, readState, resume, runTo };

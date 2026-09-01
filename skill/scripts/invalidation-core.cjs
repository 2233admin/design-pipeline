"use strict";

const path = require("node:path");
const { assertObject, assertString, fail } = require("./contract-utils.cjs");
const { validateArtifactMetadata } = require("./artifact-core.cjs");
const { validatePlan } = require("./plan-core.cjs");

function normalized(value) { return String(value).replaceAll("\\", "/"); }

function phaseMap(plan) {
  validatePlan(plan);
  return new Map(plan.phases.map((phase) => [phase.id, phase]));
}

function buildReverseDependencies(plan) {
  const phases = phaseMap(plan);
  const reverse = new Map([...phases.keys()].map((id) => [id, new Set()]));
  for (const phase of phases.values()) for (const dependency of phase.depends_on) reverse.get(dependency).add(phase.id);
  return Object.fromEntries([...reverse.entries()].map(([id, values]) => [id, [...values]]));
}

function downstreamPhases(plan, phaseId) {
  const reverse = buildReverseDependencies(plan);
  if (!Object.hasOwn(reverse, phaseId)) fail("invalidation", `unknown phase ${phaseId}`, { code: "UNKNOWN_PHASE" });
  const result = [];
  const queue = [phaseId];
  const seen = new Set([phaseId]);
  while (queue.length) {
    const current = queue.shift();
    for (const next of reverse[current]) {
      if (seen.has(next)) continue;
      seen.add(next);
      result.push(next);
      queue.push(next);
    }
  }
  return result;
}

function phaseForArtifact(plan, artifactPath) {
  const target = normalized(artifactPath);
  return plan.phases.find((phase) => phase.outputs.some((output) => normalized(output) === target))?.id || null;
}

function artifactMap(artifacts) {
  if (Array.isArray(artifacts)) return new Map(artifacts.map((artifact) => [normalized(artifact.path), artifact]));
  assertObject(artifacts, "artifacts", "invalidation");
  return new Map(Object.values(artifacts).map((artifact) => [normalized(artifact.path), artifact]));
}

function invalidateDownstream(plan, artifacts, changed, options = {}) {
  const phases = phaseMap(plan);
  const byPath = artifactMap(artifacts);
  const phaseId = phases.has(changed) ? changed : phaseForArtifact(plan, changed);
  if (!phaseId) fail("invalidation", `cannot map change to a phase or output: ${changed}`, { code: "CHANGE_NOT_IN_PLAN" });
  const declaredDependents = Array.isArray(phases.get(phaseId).invalidates)
    ? phases.get(phaseId).invalidates
    : downstreamPhases(plan, phaseId);
  const affected = [phaseId, ...declaredDependents];
  const cause = options.cause || `upstream change in ${phaseId}`;
  const invalidated = [];
  for (const affectedPhase of affected) {
    const phase = phases.get(affectedPhase);
    for (const output of phase.outputs) {
      const key = normalized(output);
      const artifact = byPath.get(key);
      if (!artifact) continue;
      if (artifact.status === "stale" && artifact.stale_cause === cause) continue;
      byPath.set(key, { ...artifact, status: "stale", stale_cause: cause });
      invalidated.push(key);
    }
  }
  const result = Array.isArray(artifacts)
    ? [...byPath.values()]
    : Object.fromEntries([...byPath.entries()].map(([key, value]) => [key, value]));
  return { status: "stale", changed: normalized(changed), phase: phaseId, invalidatedPhases: affected, invalidated, cause, artifacts: result };
}


function detectStaleArtifacts(plan, artifacts, options = {}) {
  const byPath = artifactMap(artifacts);
  const validations = [];
  const stalePaths = [];
  for (const artifact of byPath.values()) {
    const result = validateArtifactMetadata(artifact, { changeRoot: options.changeRoot, requireFile: options.requireFile !== false });
    validations.push(result);
    if (result.status === "stale") stalePaths.push(artifact.path);
  }
  let current = Array.isArray(artifacts) ? [...byPath.values()] : Object.fromEntries([...byPath.entries()].map(([key, value]) => [key, value]));
  const propagated = [];
  for (const artifactPath of stalePaths) {
    const validation = validations.find((result) => result.path === artifactPath);
    const cause = artifactMap(current).get(normalized(artifactPath))?.stale_cause
      || (validation?.code === "ARTIFACT_HASH_DRIFT" ? `hash drift in ${artifactPath}` : validation?.reason)
      || `stale artifact ${artifactPath}`;
    const phase = phaseForArtifact(plan, artifactPath);
    if (!phase) {
      propagated.push({ status: "stale", changed: normalized(artifactPath), phase: null, invalidatedPhases: [], invalidated: [normalized(artifactPath)], cause, artifacts: current });
      continue;
    }
    const result = invalidateDownstream(plan, current, artifactPath, { cause });
    current = result.artifacts;
    propagated.push(result);
  }
  return { status: stalePaths.length ? "stale" : "ready", validations, drifted: validations.filter((result) => result.code === "ARTIFACT_HASH_DRIFT").map((result) => result.path), stale: stalePaths, propagated, artifacts: current };
}

module.exports = {
  buildReverseDependencies,
  detectStaleArtifacts,
  downstreamPhases,
  invalidateDownstream,
  phaseForArtifact,
};

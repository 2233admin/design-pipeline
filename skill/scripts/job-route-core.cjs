"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { canonicalJson, fail, isObject, sha256, sortValue } = require("./contract-utils.cjs");

const SCHEMA = "design-pipeline.job-registry.v1";
const ROUTE_SCHEMA = "design-pipeline.job-route.v1";
const ACTIVATIONS = new Set(["explicit", "scored", "default"]);
const ADMISSIONS = new Set(["ready", "review", "reference-only", "inert"]);
const KERNEL_STEPS = Object.freeze([
  { command: "foundation", action: "check" },
  { command: "toolchain", action: "resolve" },
]);
const defaultRegistry = path.resolve(__dirname, "../references/job-registry.json");

function invalid(message) {
  fail("job-route", message);
}

function loadJobRegistry(file = defaultRegistry) {
  let registry;
  try { registry = JSON.parse(fs.readFileSync(file, "utf8")); } catch (error) {
    invalid(`cannot read job registry: ${error.message}`);
  }
  return validateJobRegistry(registry);
}

function validateJobRegistry(registry) {
  if (!isObject(registry) || registry.schema !== SCHEMA || registry.version !== "1") {
    invalid("unsupported job registry schema");
  }
  if (!Array.isArray(registry.jobs) || !registry.jobs.length) invalid("job registry has no jobs");
  const ids = new Set();
  let defaults = 0;
  for (const [index, job] of registry.jobs.entries()) {
    if (!isObject(job) || typeof job.id !== "string" || !job.id.trim()) invalid(`jobs[${index}].id is invalid`);
    if (ids.has(job.id)) invalid(`duplicate job ${job.id}`);
    ids.add(job.id);
    if (!ACTIVATIONS.has(job.activation)) invalid(`jobs[${index}].activation is invalid`);
    if (job.activation === "default") defaults += 1;
    if (!Number.isInteger(job.priority) || job.priority < 0) invalid(`jobs[${index}].priority is invalid`);
    if (!Array.isArray(job.keywords) || job.keywords.some((keyword) => typeof keyword !== "string" || !keyword.trim())) {
      invalid(`jobs[${index}].keywords is invalid`);
    }
    validateKnowledge(job.primaryKnowledge, `jobs[${index}].primaryKnowledge`);
    if (!Array.isArray(job.secondaries)) invalid(`jobs[${index}].secondaries is invalid`);
    for (const [secondaryIndex, secondary] of job.secondaries.entries()) {
      validateKnowledge(secondary, `jobs[${index}].secondaries[${secondaryIndex}]`);
    }
    if (!Array.isArray(job.kernel) || !job.kernel.length || job.kernel.some((item) => item !== "foundation" && item !== "toolchain")) {
      invalid(`jobs[${index}].kernel is invalid`);
    }
  }
  if (defaults !== 1) invalid("job registry must contain exactly one default job");
  return registry;
}

function validateKnowledge(value, label) {
  if (!isObject(value) || typeof value.id !== "string" || !value.id.trim()) invalid(`${label}.id is invalid`);
  if (typeof value.command !== "string" || !value.command.trim()) invalid(`${label}.command is invalid`);
  if (typeof value.action !== "string" || !value.action.trim()) invalid(`${label}.action is invalid`);
  if (!ADMISSIONS.has(value.admission)) invalid(`${label}.admission is invalid`);
}

function fold(text) {
  return String(text).toLocaleLowerCase("en-US");
}

function scoreJob(job, text) {
  const matchedKeywords = job.keywords.filter((keyword) => text.includes(fold(keyword)));
  return { job, score: matchedKeywords.length, matchedKeywords, priority: job.priority };
}

function compareHits(left, right) {
  return right.score - left.score || right.priority - left.priority || left.job.id.localeCompare(right.job.id);
}

function kernelNext(job) {
  const seen = new Set();
  const steps = [];
  for (const item of KERNEL_STEPS) {
    const key = `${item.command}:${item.action}`;
    seen.add(key);
    steps.push({ ...item, required: true, role: "kernel" });
  }
  const primary = { command: job.primaryKnowledge.command, action: job.primaryKnowledge.action, required: true, role: "primary" };
  const primaryKey = `${primary.command}:${primary.action}`;
  if (!seen.has(primaryKey)) steps.push(primary);
  for (const secondary of job.secondaries) {
    const key = `${secondary.command}:${secondary.action}`;
    if (seen.has(key) || key === primaryKey) continue;
    seen.add(key);
    steps.push({ command: secondary.command, action: secondary.action, required: false, role: "secondary" });
  }
  return steps;
}

function readyResult(query, hit, registrySha, confidence) {
  const job = hit.job;
  return sortValue({
    schema: ROUTE_SCHEMA,
    status: "ready",
    query,
    job: job.id,
    confidence,
    primaryKnowledge: job.primaryKnowledge,
    secondaries: job.secondaries,
    kernel: job.kernel,
    next: kernelNext(job),
    ambiguous: false,
    candidates: [{ id: job.id, score: hit.score, matchedKeywords: hit.matchedKeywords, priority: hit.priority }],
    instruction: "Open only the primary knowledge door. Kernel steps always run. Do not search every catalog.",
    registrySha256: registrySha,
  });
}

function clarifyResult(query, hits, registrySha) {
  return sortValue({
    schema: ROUTE_SCHEMA,
    status: "needs-clarification",
    query,
    job: null,
    confidence: hits[0]?.score ? "low" : "none",
    primaryKnowledge: null,
    secondaries: [],
    kernel: ["foundation", "toolchain"],
    next: [],
    ambiguous: true,
    candidates: hits.map((hit) => ({ id: hit.job.id, score: hit.score, matchedKeywords: hit.matchedKeywords, priority: hit.priority })),
    instruction: "Ask one question that distinguishes the top jobs. Do not search every catalog.",
    registrySha256: registrySha,
  });
}

function pickWinner(hits) {
  if (!hits.length) return { kind: "none" };
  const [top, second] = hits;
  if (second && top.score === second.score && top.priority === second.priority) return { kind: "tie", hits };
  return { kind: "win", hit: top };
}

function routeJob(options = {}) {
  const query = options.query;
  if (typeof query !== "string" || !query.trim()) invalid("query is required");
  const registry = options.registry ? validateJobRegistry(options.registry) : loadJobRegistry(options.registryFile);
  const registrySha = sha256(canonicalJson(registry));
  const text = fold(query);
  const jobs = registry.jobs;
  const explicitHits = jobs.filter((job) => job.activation === "explicit").map((job) => scoreJob(job, text)).filter((hit) => hit.score > 0).sort(compareHits);
  const scoredHits = jobs.filter((job) => job.activation === "scored").map((job) => scoreJob(job, text)).filter((hit) => hit.score > 0).sort(compareHits);
  const defaultJob = jobs.find((job) => job.activation === "default");

  const explicit = pickWinner(explicitHits);
  if (explicit.kind === "tie") return clarifyResult(query, explicitHits.slice(0, 4), registrySha);
  if (explicit.kind === "win") return readyResult(query, explicit.hit, registrySha, explicit.hit.score >= 3 ? "high" : "medium");

  const scored = pickWinner(scoredHits);
  if (scored.kind === "tie") return clarifyResult(query, scoredHits.slice(0, 4), registrySha);
  if (scored.kind === "win") return readyResult(query, scored.hit, registrySha, scored.hit.score >= 3 ? "high" : "medium");

  return readyResult(query, { job: defaultJob, score: 0, matchedKeywords: [], priority: defaultJob.priority }, registrySha, "low");
}

module.exports = { KERNEL_STEPS, ROUTE_SCHEMA, SCHEMA, loadJobRegistry, routeJob, validateJobRegistry };

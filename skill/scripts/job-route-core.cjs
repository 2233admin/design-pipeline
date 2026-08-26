"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { canonicalJson, fail, isObject, sha256, sortValue } = require("./contract-utils.cjs");

const SCHEMA = "design-pipeline.job-registry.v1";
const ROUTE_SCHEMA = "design-pipeline.job-route.v1";
const PLAN_SCHEMA = "design-pipeline.job-plan.v1";
const SHA256 = /^[a-f0-9]{64}$/;
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

function planBody(route) {
  if (!isObject(route) || route.schema !== ROUTE_SCHEMA) invalid("unsupported job route schema");
  if (route.status !== "ready") invalid("only a ready route can be written as a job plan");
  if (typeof route.job !== "string" || !route.job.trim()) invalid("ready route has no job");
  if (!isObject(route.primaryKnowledge) || !ADMISSIONS.has(route.primaryKnowledge.admission)) {
    invalid("ready route has no frozen admission");
  }
  return sortValue({
    schema: PLAN_SCHEMA,
    query: route.query,
    jobId: route.job,
    registrySha256: route.registrySha256,
    routeSha256: sha256(canonicalJson(route)),
    primaryKnowledge: route.primaryKnowledge,
    secondaries: route.secondaries,
    admission: route.primaryKnowledge.admission,
    kernel: route.kernel,
    next: route.next,
  });
}

function buildJobPlan(route) {
  const body = planBody(route);
  return sortValue({ ...body, planSha256: sha256(canonicalJson(body)) });
}

function validateJobPlan(plan) {
  if (!isObject(plan) || plan.schema !== PLAN_SCHEMA) invalid("unsupported job plan schema");
  if (typeof plan.query !== "string" || !plan.query.trim()) invalid("job plan query is invalid");
  if (typeof plan.jobId !== "string" || !plan.jobId.trim()) invalid("job plan jobId is invalid");
  for (const field of ["registrySha256", "routeSha256", "planSha256"]) {
    if (!SHA256.test(plan[field] || "")) invalid(`job plan ${field} is invalid`);
  }
  if (!isObject(plan.primaryKnowledge)) invalid("job plan primaryKnowledge is invalid");
  if (!ADMISSIONS.has(plan.admission)) invalid("job plan admission is invalid");
  if (plan.admission !== plan.primaryKnowledge.admission) invalid("job plan admission does not match primary knowledge");
  if (!Array.isArray(plan.secondaries) || !Array.isArray(plan.kernel) || !Array.isArray(plan.next)) {
    invalid("job plan steps are invalid");
  }
  const { planSha256, ...body } = plan;
  if (planSha256 !== sha256(canonicalJson(sortValue(body)))) invalid("job plan hash does not match contents");
  return plan;
}

function bindJobPlan(request = {}, plan) {
  const hasBind = Boolean(request.jobPlanSha256 || request.jobId || request.jobPlanPath);
  if (!hasBind) return null;
  if (!request.jobPlanSha256) invalid("jobPlanSha256 is required when binding a job plan");
  if (!plan) invalid("job plan is required when jobPlanSha256 is set");
  const valid = validateJobPlan(plan);
  if (request.jobPlanSha256 !== valid.planSha256) invalid("jobPlanSha256 does not match the job plan");
  if (request.jobId && request.jobId !== valid.jobId) invalid("jobId does not match the job plan");
  return valid;
}

module.exports = {
  KERNEL_STEPS,
  PLAN_SCHEMA,
  ROUTE_SCHEMA,
  SCHEMA,
  bindJobPlan,
  buildJobPlan,
  loadJobRegistry,
  routeJob,
  validateJobPlan,
  validateJobRegistry,
};

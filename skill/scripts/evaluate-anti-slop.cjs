#!/usr/bin/env node
"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const SEVERITIES = new Set(["hard", "contextual", "preference"]);
const SURFACES = new Set([
  "marketing",
  "product-ui",
  "portfolio",
  "documentation",
  "website-reference",
  "component-library",
  "other",
]);
const INTAKE_STATES = new Set([
  "accepted",
  "accepted-optional",
  "rejected-duplicate",
  "watchlist",
]);
const OUTCOMES = new Set([
  "pass",
  "fail",
  "not-applicable",
  "not-verified",
  "accepted-context",
]);
const LEVELS = {
  hard: "blocker",
  contextual: "warning",
  preference: "information",
};
const EXCEPTION_POLICIES = {
  hard: "none",
  contextual: "documented-context",
  preference: "preference-only",
};

function fail(message) {
  throw new Error(message);
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function assertObjectShape(value, label, required, allowed = required) {
  if (!isObject(value)) fail(`${label} must contain a JSON object`);
  for (const field of required) {
    if (!Object.hasOwn(value, field)) fail(`${label} is missing ${field}`);
  }
  const unsupported = Object.keys(value).filter((field) => !allowed.includes(field));
  if (unsupported.length) {
    fail(`${label} has unsupported properties: ${unsupported.join(", ")}`);
  }
}

function takeValue(argv, index, option) {
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) fail(`${option} requires a value`);
  return value;
}

function parseArgs(argv) {
  const options = {
    root: process.cwd(),
    rubric: path.join(__dirname, "..", "references", "anti-slop-rubric.json"),
    output: ".design-pipeline/reviews/anti-slop-review.json",
    json: false,
  };
  const fields = new Map([
    ["--root", "root"],
    ["--rubric", "rubric"],
    ["--evidence", "evidence"],
    ["--output", "output"],
  ]);
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }
    if (arg === "--json") {
      options.json = true;
      continue;
    }
    const direct = fields.get(arg);
    const withValue = [...fields.keys()].find((flag) => arg.startsWith(`${flag}=`));
    if (!direct && !withValue) fail(`unknown option: ${arg}`);
    const flag = direct ? arg : withValue;
    const property = fields.get(flag);
    options[property] = direct ? takeValue(argv, index, flag) : arg.slice(flag.length + 1);
    if (direct) index += 1;
  }
  if (!options.evidence && !options.help) fail("--evidence is required");
  options.root = path.resolve(options.root);
  options.rubric = path.resolve(options.rubric);
  if (options.evidence) options.evidence = path.resolve(options.evidence);
  return options;
}

function usage() {
  return "Usage: node evaluate-anti-slop.cjs --evidence <json> [--rubric <json>] [--output <path>] [--root <path>] [--json]";
}

function readJson(file, label) {
  let value;
  try {
    value = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    fail(`invalid ${label} JSON at ${file}: ${error.message}`);
  }
  if (!isObject(value)) fail(`${label} must contain a JSON object`);
  return value;
}

function validId(value) {
  return typeof value === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

function validStringArray(value) {
  return Array.isArray(value) && value.length > 0 &&
    value.every((item) => typeof item === "string" && item.trim());
}

function validateHttpUrl(value, label) {
  let url;
  try {
    url = new URL(value);
  } catch {
    fail(`${label} must be a URL`);
  }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
    fail(`${label} must be a credential-free HTTP(S) URL`);
  }
}

function validDateTime(value) {
  return typeof value === "string" && !Number.isNaN(new Date(value).getTime());
}

function validDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value);
}

function validateRubricPolicy(rubric) {
  const policy = rubric.policy;
  assertObjectShape(
    policy,
    "rubric policy",
    ["blockingSeverities", "contextRule", "preferenceRule"],
  );
  if (
    !/^\d+\.\d+\.\d+$/.test(rubric.version || "") ||
    !validDate(rubric.updatedAt) ||
    !isObject(policy) ||
    !Array.isArray(policy.blockingSeverities) ||
    policy.blockingSeverities.length !== 1 ||
    policy.blockingSeverities[0] !== "hard" ||
    typeof policy.contextRule !== "string" ||
    !policy.contextRule.trim() ||
    typeof policy.preferenceRule !== "string" ||
    !policy.preferenceRule.trim()
  ) {
    fail("rubric policy is invalid");
  }
}

function validateSources(sources) {
  if (!Array.isArray(sources) || sources.length === 0) fail("rubric sources are required");
  const ids = new Set();
  for (const source of sources) {
    assertObjectShape(
      source,
      `rubric source ${source?.id || "<unknown>"}`,
      ["id", "url", "observedAt", "contentHash", "intakeState", "usage"],
      [
        "id",
        "url",
        "observedAt",
        "lastModified",
        "contentHash",
        "intakeState",
        "usage",
      ],
    );
    if (!isObject(source) || !validId(source.id)) fail("rubric source id is invalid");
    if (ids.has(source.id)) fail(`duplicate rubric source: ${source.id}`);
    ids.add(source.id);
    validateHttpUrl(source.url, `rubric source ${source.id} url`);
    if (!/^[a-f0-9]{64}$/.test(source.contentHash || "")) {
      fail(`rubric source ${source.id} contentHash is invalid`);
    }
    if (!validDateTime(source.observedAt)) {
      fail(`rubric source ${source.id} observedAt is invalid`);
    }
    if (source.lastModified !== undefined && !validDateTime(source.lastModified)) {
      fail(`rubric source ${source.id} lastModified is invalid`);
    }
    if (!INTAKE_STATES.has(source.intakeState)) {
      fail(`rubric source ${source.id} intakeState is invalid`);
    }
    if (typeof source.usage !== "string" || !source.usage.trim()) {
      fail(`rubric source ${source.id} usage is required`);
    }
  }
  return ids;
}

function validateRuleIdentity(rule, ids) {
  if (!isObject(rule) || !validId(rule.id)) fail("rubric rule id is invalid");
  if (ids.has(rule.id)) fail(`duplicate rubric rule: ${rule.id}`);
  ids.add(rule.id);
}

function validateRuleLists(rule, sourceIds) {
  if (!SEVERITIES.has(rule.severity)) fail(`rule ${rule.id} severity is invalid`);
  if (!validStringArray(rule.appliesTo)) fail(`rule ${rule.id} appliesTo is invalid`);
  if (!rule.appliesTo.every((surface) => surface === "all" || SURFACES.has(surface))) {
    fail(`rule ${rule.id} appliesTo contains an unknown surface`);
  }
  if (!validStringArray(rule.evidenceRequired)) {
    fail(`rule ${rule.id} evidenceRequired is invalid`);
  }
  if (!validStringArray(rule.sourceIds)) fail(`rule ${rule.id} sourceIds is invalid`);
  for (const sourceId of rule.sourceIds) {
    if (!sourceIds.has(sourceId)) fail(`rule ${rule.id} has unknown source ${sourceId}`);
  }
}

function validateRuleText(rule) {
  for (const field of ["title", "principle"]) {
    if (typeof rule[field] !== "string" || !rule[field].trim()) {
      fail(`rule ${rule.id} ${field} is required`);
    }
  }
  if (!validId(rule.category)) fail(`rule ${rule.id} category is invalid`);
}

function validateRuleExceptionPolicy(rule) {
  const expectedPolicy = EXCEPTION_POLICIES[rule.severity];
  if (rule.exceptionPolicy !== expectedPolicy) {
    fail(`rule ${rule.id} exceptionPolicy must be ${expectedPolicy}`);
  }
}

function validateRule(rule, sourceIds, ids) {
  assertObjectShape(
    rule,
    `rubric rule ${rule?.id || "<unknown>"}`,
    [
      "id",
      "title",
      "category",
      "severity",
      "appliesTo",
      "principle",
      "evidenceRequired",
      "exceptionPolicy",
      "sourceIds",
    ],
  );
  validateRuleIdentity(rule, ids);
  validateRuleLists(rule, sourceIds);
  validateRuleText(rule);
  validateRuleExceptionPolicy(rule);
}

function validateRubric(rubric) {
  assertObjectShape(
    rubric,
    "rubric",
    ["schema", "version", "updatedAt", "policy", "sources", "rules"],
  );
  if (
    rubric.schema !== "design-pipeline.anti-slop-rubric.v1" ||
    !Array.isArray(rubric.rules)
  ) {
    fail("rubric has an invalid structure");
  }
  validateRubricPolicy(rubric);
  const sourceIds = validateSources(rubric.sources);
  const ids = new Set();
  for (const rule of rubric.rules) validateRule(rule, sourceIds, ids);
  return new Map(rubric.rules.map((rule) => [rule.id, rule]));
}

function validateTarget(target) {
  assertObjectShape(
    target,
    "evidence target",
    ["id", "surface"],
    ["id", "surface", "url"],
  );
  if (!isObject(target) || !validId(target.id)) fail("evidence target id is invalid");
  if (!SURFACES.has(target.surface)) {
    fail("evidence target surface is invalid");
  }
  if (target.url !== undefined) validateHttpUrl(target.url, "evidence target url");
}

function validateObservation(observation, rulesById, ids) {
  assertObjectShape(
    observation,
    `evidence observation ${observation?.ruleId || "<unknown>"}`,
    ["ruleId", "outcome", "evidence"],
    ["ruleId", "outcome", "evidence", "rationale"],
  );
  if (!isObject(observation) || !validId(observation.ruleId)) {
    fail("evidence observation ruleId is invalid");
  }
  if (ids.has(observation.ruleId)) {
    fail(`duplicate evidence observation: ${observation.ruleId}`);
  }
  ids.add(observation.ruleId);
  const rule = rulesById.get(observation.ruleId);
  if (!rule) fail(`unknown evidence rule: ${observation.ruleId}`);
  if (!OUTCOMES.has(observation.outcome)) {
    fail(`observation ${observation.ruleId} outcome is invalid`);
  }
  if (!validStringArray(observation.evidence)) {
    fail(`observation ${observation.ruleId} evidence is required`);
  }
  if (
    ["accepted-context", "not-applicable"].includes(observation.outcome) &&
    (typeof observation.rationale !== "string" || !observation.rationale.trim())
  ) {
    fail(`observation ${observation.ruleId} requires a rationale`);
  }
  if (rule.severity === "hard" && observation.outcome === "accepted-context") {
    fail(`hard rule ${rule.id} cannot use accepted-context`);
  }
}

function validateEvidence(evidence, rulesById) {
  assertObjectShape(evidence, "evidence", ["schema", "target", "observations"]);
  if (
    evidence.schema !== "design-pipeline.anti-slop-evidence.v1" ||
    !Array.isArray(evidence.observations)
  ) {
    fail("evidence has an invalid structure");
  }
  validateTarget(evidence.target);
  const ids = new Set();
  for (const observation of evidence.observations) {
    validateObservation(observation, rulesById, ids);
  }
  return new Map(evidence.observations.map((item) => [item.ruleId, item]));
}

function outputPath(options) {
  const candidate = path.isAbsolute(options.output)
    ? path.resolve(options.output)
    : path.resolve(options.root, options.output);
  const relative = path.relative(options.root, candidate);
  if (relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    fail("--output must stay inside --root");
  }
  let existingParent = path.dirname(candidate);
  const missingParts = [];
  while (!fs.existsSync(existingParent)) {
    const parent = path.dirname(existingParent);
    if (parent === existingParent) fail("--output must stay inside --root");
    missingParts.unshift(path.basename(existingParent));
    existingParent = parent;
  }
  const realParent = fs.realpathSync(existingParent);
  const realRelative = path.relative(options.root, realParent);
  if (
    realRelative === ".." ||
    realRelative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(realRelative)
  ) {
    fail("--output must stay inside --root");
  }
  if (fs.existsSync(candidate) && fs.lstatSync(candidate).isSymbolicLink()) {
    fail("--output must stay inside --root");
  }
  return path.join(realParent, ...missingParts, path.basename(candidate));
}

function atomicWriteJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = `${file}.tmp-${process.pid}-${crypto.randomBytes(4).toString("hex")}`;
  fs.writeFileSync(temp, `${JSON.stringify(value, null, 2)}\n`, {
    encoding: "utf8",
    flag: "wx",
  });
  fs.renameSync(temp, file);
}

function relativeOrExternal(root, file, externalLabel) {
  const relative = path.relative(root, file);
  if (relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    return externalLabel;
  }
  return relative.split(path.sep).join("/") || ".";
}

function appliesTo(rule, surface) {
  return rule.appliesTo.includes("all") || rule.appliesTo.includes(surface);
}

function makeFinding(rule, observation) {
  const outcome = observation?.outcome || "missing";
  const messages = {
    missing: "The applicable rule has no evidence observation.",
    fail: "The supplied evidence reports a failed rule.",
    "not-verified": "The required evidence was not verified.",
  };
  return {
    ruleId: rule.id,
    title: rule.title,
    category: rule.category,
    severity: rule.severity,
    level: LEVELS[rule.severity],
    outcome,
    message: messages[outcome],
    evidence: observation?.evidence || [],
    rationale: observation?.rationale || null,
  };
}

function acceptedContext(rule, observation) {
  return {
    ruleId: rule.id,
    title: rule.title,
    category: rule.category,
    severity: rule.severity,
    evidence: observation.evidence,
    rationale: observation.rationale,
  };
}

function summarize(rules, observations) {
  const findings = [];
  const acceptedContexts = [];
  const counts = {
    applicableRules: rules.length,
    reviewedRules: 0,
    passed: 0,
    notApplicable: 0,
    acceptedContexts: 0,
    blockers: 0,
    warnings: 0,
    information: 0,
  };

  for (const rule of rules) {
    const observation = observations.get(rule.id);
    if (!observation) {
      findings.push(makeFinding(rule, null));
      continue;
    }
    counts.reviewedRules += 1;
    if (observation.outcome === "pass") {
      counts.passed += 1;
      continue;
    }
    if (observation.outcome === "not-applicable") {
      counts.notApplicable += 1;
      continue;
    }
    if (observation.outcome === "accepted-context") {
      acceptedContexts.push(acceptedContext(rule, observation));
      counts.acceptedContexts += 1;
      continue;
    }
    findings.push(makeFinding(rule, observation));
  }

  for (const finding of findings) {
    if (finding.level === "blocker") counts.blockers += 1;
    else if (finding.level === "warning") counts.warnings += 1;
    else counts.information += 1;
  }
  return { findings, acceptedContexts, counts };
}

function generatedAt() {
  const value = process.env.DESIGN_PIPELINE_NOW || new Date().toISOString();
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) fail("DESIGN_PIPELINE_NOW must be a date-time");
  return date.toISOString();
}

function evaluate(options) {
  if (!fs.existsSync(options.root) || !fs.statSync(options.root).isDirectory()) {
    fail(`root does not exist: ${options.root}`);
  }
  if (!fs.existsSync(options.rubric)) fail(`rubric does not exist: ${options.rubric}`);
  if (!fs.existsSync(options.evidence)) fail(`evidence does not exist: ${options.evidence}`);
  options.root = fs.realpathSync(options.root);

  const rubric = readJson(options.rubric, "rubric");
  const rulesById = validateRubric(rubric);
  const evidence = readJson(options.evidence, "evidence");
  const observations = validateEvidence(evidence, rulesById);
  const applicableRules = rubric.rules.filter((rule) =>
    appliesTo(rule, evidence.target.surface),
  );
  const { findings, acceptedContexts, counts } = summarize(
    applicableRules,
    observations,
  );
  const status = counts.blockers > 0
    ? "blocked"
    : counts.warnings > 0
      ? "needs-review"
      : "pass";
  const report = {
    schema: "design-pipeline.anti-slop-review.v1",
    generatedAt: generatedAt(),
    status,
    target: evidence.target,
    rubric: {
      version: rubric.version,
      path: relativeOrExternal(options.root, options.rubric, "<EXTERNAL_RUBRIC>"),
      sources: rubric.sources.map((source) => ({
        id: source.id,
        url: source.url,
        contentHash: source.contentHash,
        intakeState: source.intakeState,
      })),
    },
    summary: counts,
    findings,
    acceptedContexts,
  };
  const destination = outputPath(options);
  atomicWriteJson(destination, report);
  return {
    report,
    output: relativeOrExternal(options.root, destination, "<EXTERNAL_OUTPUT>"),
    remotePublished: false,
  };
}

try {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) console.log(usage());
  else {
    const result = evaluate(options);
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else {
      console.log(`Anti-slop review: ${result.report.status}`);
      console.log(
        `blockers=${result.report.summary.blockers} warnings=${result.report.summary.warnings} information=${result.report.summary.information} accepted-context=${result.report.summary.acceptedContexts}`,
      );
      console.log(`Report: ${result.output}`);
      console.log("Remote publication: not performed.");
    }
  }
} catch (error) {
  console.error(
    `evaluate-anti-slop: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exitCode = 1;
}

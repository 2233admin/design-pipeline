#!/usr/bin/env node
"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { recordObservation } = require("./record-feedback.cjs");

const STATUSES = ["CURRENT", "STALE", "CHANGED", "UNTRACKED", "UNKNOWN"];
const SOURCE_KINDS = new Set(["github", "documentation", "installed-skill"]);

function fail(message) {
  throw new Error(message);
}

function takeValue(argv, index, option) {
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) fail(`${option} requires a value`);
  return value;
}

function parseArgs(argv) {
  const options = {
    root: process.cwd(),
    registry: path.join(__dirname, "..", "references", "companion-capabilities.json"),
    output: ".design-pipeline/audits/capability-audit.json",
    recordFeedback: false,
    json: false,
  };
  const fields = new Map([
    ["--root", "root"],
    ["--registry", "registry"],
    ["--source-evidence", "sourceEvidence"],
    ["--installed-evidence", "installedEvidence"],
    ["--output", "output"],
    ["--feedback-root", "feedbackRoot"],
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
    if (arg === "--record-feedback") {
      options.recordFeedback = true;
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
  options.root = path.resolve(options.root);
  options.registry = path.resolve(options.registry);
  options.feedbackRoot = path.resolve(options.feedbackRoot || options.root);
  return options;
}

function usage() {
  return "Usage: node audit-capabilities.cjs [--source-evidence <json>] [--installed-evidence <check-deps.json>] [--record-feedback] [--output <path>] [--root <path>] [--json]";
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
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

function parseDate(value, label) {
  const date = new Date(value);
  if (typeof value !== "string" || Number.isNaN(date.getTime())) fail(`${label} must be a date-time`);
  return date;
}

function validateSourceUrl(value, profileId) {
  let url;
  try {
    url = new URL(value);
  } catch {
    fail(`profile ${profileId} sourceMeta.url is invalid`);
  }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
    fail(`profile ${profileId} sourceMeta.url must be a credential-free HTTP(S) URL`);
  }
}

function validateReviewedMarkers(markers, profileId) {
  if (markers === undefined) return;
  const valid =
    Array.isArray(markers) &&
    markers.every((item) => typeof item === "string" && item);
  if (!valid) fail(`profile ${profileId} sourceMeta.reviewedMarkers must be a string array`);
}

function validateReviewedBaseline(meta, profileId) {
  const baselines = [
    meta.reviewedRevision,
    meta.reviewedVersion,
    meta.reviewedContentHash,
    meta.reviewedMarkers,
  ];
  if (!baselines.some((value) => value !== undefined)) {
    fail(`profile ${profileId} sourceMeta needs a reviewed baseline`);
  }
  if (
    meta.reviewedContentHash !== undefined &&
    !/^[a-f0-9]{64}$/.test(meta.reviewedContentHash)
  ) {
    fail(`profile ${profileId} reviewedContentHash is invalid`);
  }
}

function validateSourceMeta(meta, profileId) {
  if (!isObject(meta)) fail(`profile ${profileId} sourceMeta must be an object`);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(meta.id || "")) {
    fail(`profile ${profileId} sourceMeta.id is invalid`);
  }
  if (!SOURCE_KINDS.has(meta.kind)) fail(`profile ${profileId} sourceMeta.kind is invalid`);
  validateSourceUrl(meta.url, profileId);
  parseDate(meta.reviewedAt, `profile ${profileId} sourceMeta.reviewedAt`);
  if (!Number.isInteger(meta.freshnessDays) || meta.freshnessDays < 1) {
    fail(`profile ${profileId} sourceMeta.freshnessDays must be a positive integer`);
  }
  validateReviewedMarkers(meta.reviewedMarkers, profileId);
  validateReviewedBaseline(meta, profileId);
  return meta;
}

function validateRegistry(registry) {
  if (typeof registry.schema !== "string" || !Array.isArray(registry.profiles)) {
    fail("companion capability registry has an invalid structure");
  }
  const ids = new Set();
  for (const profile of registry.profiles) {
    if (!isObject(profile) || typeof profile.id !== "string" || !profile.id) {
      fail("capability profile is invalid");
    }
    if (ids.has(profile.id)) fail(`duplicate capability profile id: ${profile.id}`);
    ids.add(profile.id);
    if (profile.sourceMeta !== undefined) validateSourceMeta(profile.sourceMeta, profile.id);
  }
  return registry;
}

function validateSourceEvidence(evidence) {
  if (
    evidence.schema !== "design-pipeline.source-evidence.v1" ||
    !Array.isArray(evidence.sources)
  ) {
    fail("source evidence has an invalid structure");
  }
  parseDate(evidence.generatedAt, "source evidence generatedAt");
  const byId = new Map();
  for (const item of evidence.sources) {
    if (!isObject(item) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.sourceId || "")) {
      fail("source evidence contains an invalid sourceId");
    }
    if (byId.has(item.sourceId)) fail(`duplicate source evidence: ${item.sourceId}`);
    parseDate(item.observedAt, `source ${item.sourceId} observedAt`);
    if (item.contentHash !== undefined && !/^[a-f0-9]{64}$/.test(item.contentHash)) {
      fail(`source ${item.sourceId} contentHash is invalid`);
    }
    if (item.markers !== undefined && (!Array.isArray(item.markers) || !item.markers.every((marker) => typeof marker === "string" && marker))) {
      fail(`source ${item.sourceId} markers must be a string array`);
    }
    byId.set(item.sourceId, item);
  }
  return byId;
}

function installedStatusById(installed) {
  if (!installed) return new Map();
  if (!Array.isArray(installed.capabilityProfiles)) {
    fail("installed evidence must be check-deps JSON with capabilityProfiles");
  }
  return new Map(
    installed.capabilityProfiles.map((profile) => [profile.id, profile.status || null]),
  );
}

function sameStringArray(left, right) {
  if (!Array.isArray(left) || !Array.isArray(right)) return false;
  return JSON.stringify([...new Set(left)].sort()) === JSON.stringify([...new Set(right)].sort());
}

function compareProfile(profile, observed, generatedAt, installedStatus) {
  if (!profile.sourceMeta) {
    return {
      profileId: profile.id,
      status: "UNTRACKED",
      sourceId: null,
      installedStatus,
      reasons: ["No structured source metadata is declared."],
      observed: null,
    };
  }
  const meta = profile.sourceMeta;
  if (!observed) {
    return {
      profileId: profile.id,
      status: "UNKNOWN",
      sourceId: meta.id,
      installedStatus,
      reasons: ["The host did not provide current source evidence."],
      observed: null,
    };
  }

  const changes = [];
  const pairs = [
    ["revision", "reviewedRevision"],
    ["version", "reviewedVersion"],
    ["contentHash", "reviewedContentHash"],
  ];
  for (const [observedKey, reviewedKey] of pairs) {
    if (meta[reviewedKey] !== undefined && observed[observedKey] !== meta[reviewedKey]) {
      changes.push(`${observedKey} differs from the reviewed baseline`);
    }
  }
  if (
    meta.reviewedMarkers !== undefined &&
    !sameStringArray(observed.markers, meta.reviewedMarkers)
  ) {
    changes.push("capability markers differ from the reviewed baseline");
  }
  if (changes.length) {
    return {
      profileId: profile.id,
      status: "CHANGED",
      sourceId: meta.id,
      installedStatus,
      reasons: changes,
      observed,
    };
  }

  const ageMs = generatedAt.getTime() - parseDate(observed.observedAt, `${meta.id} observedAt`).getTime();
  if (ageMs < 0) fail(`source ${meta.id} observedAt is after generatedAt`);
  const ageDays = ageMs / 86_400_000;
  if (ageDays > meta.freshnessDays) {
    return {
      profileId: profile.id,
      status: "STALE",
      sourceId: meta.id,
      installedStatus,
      reasons: [`Evidence age ${Math.floor(ageDays)}d exceeds ${meta.freshnessDays}d policy.`],
      observed,
    };
  }
  return {
    profileId: profile.id,
    status: "CURRENT",
    sourceId: meta.id,
    installedStatus,
    reasons: ["Observed source evidence matches the reviewed baseline and freshness policy."],
    observed,
  };
}

function outputPath(options) {
  const candidate = path.isAbsolute(options.output)
    ? path.resolve(options.output)
    : path.resolve(options.root, options.output);
  const relative = path.relative(options.root, candidate);
  if (relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    fail("--output must stay inside --root");
  }
  return candidate;
}

function atomicWriteJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = `${file}.tmp-${process.pid}-${crypto.randomBytes(4).toString("hex")}`;
  fs.writeFileSync(temp, `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
  fs.renameSync(temp, file);
}

function snapshotTime(options, sourceEvidence) {
  if (process.env.DESIGN_PIPELINE_NOW) {
    return parseDate(process.env.DESIGN_PIPELINE_NOW, "DESIGN_PIPELINE_NOW");
  }
  if (sourceEvidence) return parseDate(sourceEvidence.generatedAt, "source evidence generatedAt");
  return new Date();
}

function relativeOrExternal(root, file) {
  const relative = path.relative(root, file);
  if (relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    return "<EXTERNAL_REGISTRY>";
  }
  return relative.split(path.sep).join("/") || ".";
}

function recordFindings(options, profiles) {
  if (!options.recordFeedback) return [];
  const recorded = [];
  for (const profile of profiles.filter((item) => ["STALE", "CHANGED"].includes(item.status))) {
    const result = recordObservation({
      root: options.root,
      feedbackRoot: options.feedbackRoot,
      kind: "companion-gap",
      source: "self-check",
      severity: profile.status === "CHANGED" ? "high" : "medium",
      skill: profile.profileId,
      route: "issue",
      title: `${profile.profileId} upstream source is ${profile.status.toLowerCase()}`,
      summary: `Capability audit reported ${profile.status} for source ${profile.sourceId}.`,
      evidence: profile.reasons,
    });
    recorded.push({
      profileId: profile.profileId,
      observationId: result.observation.id,
      draftPath: result.draftPath,
    });
  }
  return recorded;
}

function audit(options) {
  if (!fs.existsSync(options.registry)) fail(`registry does not exist: ${options.registry}`);
  if (!fs.existsSync(options.root) || !fs.statSync(options.root).isDirectory()) {
    fail(`root does not exist: ${options.root}`);
  }
  const registry = validateRegistry(readJson(options.registry, "registry"));
  const sourceEvidence = options.sourceEvidence
    ? readJson(path.resolve(options.sourceEvidence), "source evidence")
    : null;
  const sourceById = sourceEvidence ? validateSourceEvidence(sourceEvidence) : new Map();
  const installed = options.installedEvidence
    ? readJson(path.resolve(options.installedEvidence), "installed evidence")
    : null;
  const installedById = installedStatusById(installed);
  const generatedAt = snapshotTime(options, sourceEvidence);
  const profiles = registry.profiles
    .map((profile) =>
      compareProfile(
        profile,
        profile.sourceMeta ? sourceById.get(profile.sourceMeta.id) : null,
        generatedAt,
        installedById.get(profile.id) || null,
      ),
    )
    .sort((left, right) => left.profileId.localeCompare(right.profileId));
  const summary = Object.fromEntries(STATUSES.map((status) => [status, 0]));
  for (const profile of profiles) summary[profile.status] += 1;
  const snapshot = {
    schema: "design-pipeline.capability-audit.v1",
    generatedAt: generatedAt.toISOString(),
    registry: {
      schema: registry.schema,
      path: relativeOrExternal(options.root, options.registry),
    },
    profiles,
    summary,
  };
  atomicWriteJson(outputPath(options), snapshot);
  return {
    snapshot,
    output: relativeOrExternal(options.root, outputPath(options)),
    feedback: recordFindings(options, profiles),
    remotePublished: false,
  };
}

try {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) console.log(usage());
  else {
    const result = audit(options);
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else {
      console.log(`Capability audit: ${result.output}`);
      console.log(STATUSES.map((status) => `${status}=${result.snapshot.summary[status]}`).join(" "));
      console.log("Remote publication: not performed.");
    }
  }
} catch (error) {
  console.error(`audit-capabilities: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}

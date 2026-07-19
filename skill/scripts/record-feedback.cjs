#!/usr/bin/env node

const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const VALID_KINDS = new Set([
  "pipeline-bug",
  "companion-gap",
  "capability-gap",
  "quality-gap",
  "documentation-gap",
  "feature-request",
]);
const VALID_SEVERITIES = new Set(["low", "medium", "high", "critical"]);
const VALID_SOURCES = new Set(["self-check", "qa", "runtime", "user", "maintainer"]);
const VALID_ROUTES = new Set(["auto", "issue", "pr"]);

function usage() {
  return [
    "Usage:",
    "  node record-feedback.cjs --kind <kind> --source <source> --title <title> --summary <summary> [options]",
    "",
    "Options:",
    "  --root <path>           Target repository root. Defaults to cwd.",
    "  --feedback-root <path>  Root that owns .design-pipeline/feedback. Defaults to --root.",
    "  --kind <kind>           pipeline-bug | companion-gap | capability-gap | quality-gap | documentation-gap | feature-request.",
    "  --source <source>       self-check | qa | runtime | user | maintainer.",
    "  --severity <level>      low | medium | high | critical. Defaults to medium.",
    "  --skill <name>          Related companion skill.",
    "  --route <route>         auto | issue | pr. Auto defaults to issue.",
    "  --evidence <text>       Repeatable evidence item.",
    "  --changed-file <path>   Repeatable changed file for a PR draft.",
    "  --validation <text>     Repeatable validation evidence for a PR draft.",
    "  --json                  Print a machine-readable result.",
    "  --dry-run               Validate and render without writing files.",
  ].join("\n");
}

function parseArgs(argv) {
  const options = {
    root: process.cwd(),
    feedbackRoot: undefined,
    severity: "medium",
    route: "auto",
    evidence: [],
    changedFiles: [],
    validation: [],
    json: false,
    dryRun: false,
  };
  const scalar = new Map([
    ["--root", "root"],
    ["--feedback-root", "feedbackRoot"],
    ["--kind", "kind"],
    ["--source", "source"],
    ["--severity", "severity"],
    ["--skill", "skill"],
    ["--title", "title"],
    ["--summary", "summary"],
    ["--route", "route"],
  ]);
  const repeatable = new Map([
    ["--evidence", "evidence"],
    ["--changed-file", "changedFiles"],
    ["--validation", "validation"],
  ]);

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--json") {
      options.json = true;
      continue;
    }
    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }
    const key = scalar.get(arg) || repeatable.get(arg);
    if (!key) throw new Error(`Unknown option: ${arg}`);
    const value = argv[index + 1];
    if (value === undefined || value.startsWith("--")) {
      throw new Error(`${arg} requires a value.`);
    }
    index += 1;
    if (repeatable.has(arg)) options[key].push(value);
    else options[key] = value;
  }

  options.root = path.resolve(options.root);
  options.feedbackRoot = path.resolve(options.feedbackRoot || options.root);
  return options;
}

function requireText(value, option) {
  const text = String(value || "").trim();
  if (!text) throw new Error(`${option} is required.`);
  return text;
}

function normalizeList(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === "string" && value) return [value];
  return [];
}

function validateOptions(options) {
  options.kind = requireText(options.kind, "--kind");
  options.source = requireText(options.source, "--source");
  options.title = requireText(options.title, "--title");
  options.summary = requireText(options.summary, "--summary");
  options.severity = requireText(options.severity, "--severity");
  options.route = requireText(options.route, "--route");

  if (!VALID_KINDS.has(options.kind)) {
    throw new Error(`Invalid --kind: ${options.kind}`);
  }
  if (!VALID_SOURCES.has(options.source)) {
    throw new Error(`Invalid --source: ${options.source}`);
  }
  if (!VALID_SEVERITIES.has(options.severity)) {
    throw new Error(`Invalid --severity: ${options.severity}`);
  }
  if (!VALID_ROUTES.has(options.route)) {
    throw new Error(`Invalid --route: ${options.route}`);
  }

  const route = options.route === "auto" ? "issue" : options.route;
  if (route === "pr" && (!options.changedFiles.length || !options.validation.length)) {
    throw new Error(
      "A PR draft requires at least one --changed-file and --validation item.",
    );
  }
  return route;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function replaceLiteral(text, value, replacement) {
  if (!value) return text;
  const normalized = path.resolve(value);
  const variants = new Set([
    normalized,
    normalized.replaceAll("\\", "/"),
    normalized.replaceAll("/", "\\"),
  ]);
  let result = text;
  for (const variant of variants) {
    if (variant.length < 3) continue;
    result = result.replace(new RegExp(escapeRegExp(variant), "gi"), replacement);
  }
  return result;
}

function redactText(value, options) {
  let text = String(value || "")
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/g, "");

  const replacements = [
    { value: options.root, label: "<PROJECT_ROOT>" },
    { value: options.feedbackRoot, label: "<FEEDBACK_ROOT>" },
    { value: os.homedir(), label: "<HOME>" },
  ]
    .filter(({ value }) => Boolean(value))
    .sort((left, right) => path.resolve(right.value).length - path.resolve(left.value).length);
  for (const replacement of replacements) {
    text = replaceLiteral(text, replacement.value, replacement.label);
  }
  text = text.replace(
    /([a-z][a-z0-9+.-]*:\/\/)([^/\s:@]+):([^/\s@]+)@/gi,
    "$1[REDACTED]@",
  );
  text = text.replace(
    /\b(?:gh[pousr]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/g,
    "[REDACTED]",
  );
  text = text.replace(
    /(authorization\s*:\s*(?:bearer|token)\s+)[^\s,;]+/gi,
    "$1[REDACTED]",
  );
  text = text.replace(
    /((?:api[_-]?key|access[_-]?token|secret|password)\s*[:=]\s*)[^\s,;]+/gi,
    "$1[REDACTED]",
  );
  return text.trim();
}

function unique(items) {
  return [...new Set(items.filter(Boolean))];
}

function nowIso() {
  const configured = process.env.DESIGN_PIPELINE_NOW;
  const value = configured ? new Date(configured) : new Date();
  if (Number.isNaN(value.getTime())) {
    throw new Error("DESIGN_PIPELINE_NOW must be a valid date-time.");
  }
  return value.toISOString();
}

function normalizeFingerprintPart(value) {
  return String(value || "")
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function createFingerprint(options) {
  return crypto
    .createHash("sha256")
    .update(
      [
        normalizeFingerprintPart(options.kind),
        normalizeFingerprintPart(options.skill),
        normalizeFingerprintPart(options.title),
      ].join("\n"),
    )
    .digest("hex");
}

function atomicWrite(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temporary = `${filePath}.tmp-${process.pid}-${crypto.randomBytes(4).toString("hex")}`;
  fs.writeFileSync(temporary, content, { encoding: "utf8", mode: 0o600, flag: "wx" });
  fs.renameSync(temporary, filePath);
}

function atomicWriteJson(filePath, value) {
  atomicWrite(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function readJson(filePath, label) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    throw new Error(`Invalid ${label} JSON at ${filePath}: ${error.message}`);
  }
}

function renderList(items, emptyText) {
  return items.length ? items.map((item) => `- ${item}`).join("\n") : `- ${emptyText}`;
}

function renderIssueDraft(observation) {
  return [
    `# ${observation.title}`,
    "",
    `> Design Pipeline observation \`${observation.id}\`. Remote publication: not performed.`,
    "",
    "## Summary",
    "",
    observation.summary,
    "",
    "## Classification",
    "",
    `- Kind: \`${observation.kind}\``,
    `- Severity: \`${observation.severity}\``,
    `- Source: \`${observation.source}\``,
    `- Related skill: \`${observation.skill || "none"}\``,
    `- Occurrences: ${observation.occurrences}`,
    "",
    "## Evidence",
    "",
    renderList(observation.evidence, "No additional evidence recorded."),
    "",
    "## Expected maintainer action",
    "",
    "- Reproduce or validate the capability gap.",
    "- Confirm the upstream source and privacy boundary.",
    "- Link an OpenSpec change if implementation is accepted.",
    "- Preserve a regression test and update the capability registry when applicable.",
    "",
    "## Publish gate",
    "",
    "Review this draft and obtain explicit authority before creating or updating a remote Issue.",
    "",
  ].join("\n");
}

function renderPrDraft(observation) {
  return [
    `# ${observation.title}`,
    "",
    `> Design Pipeline observation \`${observation.id}\`. Remote publication: not performed.`,
    "",
    "## Summary",
    "",
    observation.summary,
    "",
    "## Changed files",
    "",
    renderList(observation.changedFiles, "No changed files recorded."),
    "",
    "## Validation",
    "",
    renderList(observation.validation, "No validation recorded."),
    "",
    "## Evidence",
    "",
    renderList(observation.evidence, "No additional evidence recorded."),
    "",
    "## Publish gate",
    "",
    "Review the diff, tests, target remote, and redacted evidence, then obtain explicit authority before creating or updating a remote PR.",
    "",
  ].join("\n");
}

function newIndex(timestamp) {
  return {
    schema: "design-pipeline-feedback-index.v1",
    updatedAt: timestamp,
    observations: [],
  };
}

function isValidIndexEntry(item) {
  if (!item || typeof item !== "object") return false;
  if (typeof item.id !== "string") return false;
  if (typeof item.lastSeenAt !== "string") return false;
  return Number.isInteger(item.occurrences) && item.occurrences >= 1;
}

function isValidIndex(index) {
  if (!index || index.schema !== "design-pipeline-feedback-index.v1") return false;
  if (!Array.isArray(index.observations)) return false;
  return index.observations.every(isValidIndexEntry);
}

function loadIndex(feedbackDir, timestamp) {
  const indexPath = path.join(feedbackDir, "index.json");
  if (!fs.existsSync(indexPath)) return { path: indexPath, value: newIndex(timestamp) };

  const index = readJson(indexPath, "feedback index");
  if (!isValidIndex(index)) {
    throw new Error(`Invalid feedback index structure at ${indexPath}.`);
  }
  return { path: indexPath, value: index };
}

function updateIndex(indexState, observation, timestamp) {
  const index = indexState.value;
  const entry = {
    id: observation.id,
    status: observation.status,
    kind: observation.kind,
    severity: observation.severity,
    title: observation.title,
    route: observation.route,
    occurrences: observation.occurrences,
    lastSeenAt: observation.lastSeenAt,
    draftPath: observation.draftPath,
  };
  const existing = index.observations.findIndex((item) => item.id === observation.id);
  if (existing >= 0) index.observations[existing] = entry;
  else index.observations.push(entry);
  index.updatedAt = timestamp;
  index.observations.sort((left, right) => right.lastSeenAt.localeCompare(left.lastSeenAt));
  atomicWriteJson(indexState.path, index);
}

function isValidObservation(observation, expectedId) {
  if (!observation || observation.schema !== "design-pipeline-feedback.v1") return false;
  if (observation.id !== expectedId) return false;
  if (!Number.isInteger(observation.occurrences) || observation.occurrences < 1) return false;
  return Array.isArray(observation.evidence);
}

function readExistingObservation(observationPath, expectedId) {
  if (!fs.existsSync(observationPath)) return null;
  const observation = readJson(observationPath, "feedback observation");
  if (!isValidObservation(observation, expectedId)) {
    throw new Error(`Invalid feedback observation structure at ${observationPath}.`);
  }
  return observation;
}

function recordObservation(rawOptions) {
  const options = {
    evidence: [],
    changedFiles: [],
    validation: [],
    severity: "medium",
    route: "auto",
    dryRun: false,
    ...rawOptions,
  };
  options.evidence = normalizeList(options.evidence);
  options.changedFiles = normalizeList(options.changedFiles);
  options.validation = normalizeList(options.validation);
  options.root = path.resolve(options.root || process.cwd());
  options.feedbackRoot = path.resolve(options.feedbackRoot || options.root);
  const route = validateOptions(options);
  const timestamp = nowIso();
  const sanitized = {
    ...options,
    title: redactText(options.title, options),
    summary: redactText(options.summary, options),
    skill: redactText(options.skill, options),
    evidence: unique(options.evidence.map((item) => redactText(item, options))),
    changedFiles: unique(options.changedFiles.map((item) => redactText(item, options))),
    validation: unique(options.validation.map((item) => redactText(item, options))),
  };
  const fingerprint = createFingerprint(sanitized);
  const id = `dpf-${fingerprint.slice(0, 16)}`;
  const feedbackDir = path.join(options.feedbackRoot, ".design-pipeline", "feedback");
  const observationPath = path.join(feedbackDir, "observations", `${id}.json`);
  const draftName = `${id}-${route}.md`;
  const draftPath = path.join(feedbackDir, "drafts", draftName);
  const relativeDraftPath = path
    .relative(options.feedbackRoot, draftPath)
    .split(path.sep)
    .join("/");

  const existing = readExistingObservation(observationPath, id);
  const indexState = options.dryRun
    ? { path: "", value: newIndex(timestamp) }
    : loadIndex(feedbackDir, timestamp);
  const observation = {
    schema: "design-pipeline-feedback.v1",
    id,
    fingerprint,
    status: existing?.status || "open",
    kind: sanitized.kind,
    severity: sanitized.severity,
    source: sanitized.source,
    title: sanitized.title,
    summary: sanitized.summary,
    ...(sanitized.skill ? { skill: sanitized.skill } : {}),
    route,
    firstSeenAt: existing?.firstSeenAt || timestamp,
    lastSeenAt: timestamp,
    occurrences: (existing?.occurrences || 0) + 1,
    evidence: unique([...(existing?.evidence || []), ...sanitized.evidence]).slice(0, 50),
    ...(sanitized.changedFiles.length || existing?.changedFiles?.length
      ? {
          changedFiles: unique([
            ...(existing?.changedFiles || []),
            ...sanitized.changedFiles,
          ]).slice(0, 100),
        }
      : {}),
    ...(sanitized.validation.length || existing?.validation?.length
      ? {
          validation: unique([
            ...(existing?.validation || []),
            ...sanitized.validation,
          ]).slice(0, 50),
        }
      : {}),
    privacy: {
      redacted: true,
      remotePublished: false,
    },
    draftPath: relativeDraftPath,
  };
  const draft =
    route === "pr" ? renderPrDraft(observation) : renderIssueDraft(observation);

  if (!options.dryRun) {
    atomicWriteJson(observationPath, observation);
    atomicWrite(draftPath, draft);
    updateIndex(indexState, observation, timestamp);
  }

  return {
    created: !existing,
    dryRun: options.dryRun,
    observation,
    observationPath: path.relative(options.feedbackRoot, observationPath).split(path.sep).join("/"),
    draftPath: relativeDraftPath,
  };
}

function main() {
  try {
    const options = parseArgs(process.argv.slice(2));
    if (options.help) {
      console.log(usage());
      return;
    }
    const result = recordObservation(options);
    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(
        `${result.created ? "Recorded" : "Updated"} ${result.observation.id}: ${result.draftPath}`,
      );
      console.log("Remote publication: not performed.");
    }
  } catch (error) {
    console.error(`record-feedback: ${error.message}`);
    process.exitCode = 1;
  }
}

if (require.main === module) main();

module.exports = {
  createFingerprint,
  normalizeList,
  parseArgs,
  recordObservation,
  redactText,
  validateOptions,
};

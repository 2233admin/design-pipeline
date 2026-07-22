"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const {
  advanceChange,
  clearStaleLock,
  createInitialState,
  inspectConsistency,
  migrateFile,
  repairChange,
  repairLegacyEvents,
  validateState,
  writeNewChange,
} = require("./pipeline-state-core.cjs");
const { checkScene } = require("./scene-runtime-core.cjs");
const { validateReceipt } = require("./evidence-core.cjs");
const { checkComponentMatrix, evaluateMotion } = require("./motion-evidence-core.cjs");
const { auditPatterns, searchPatterns, validateDesignCodeMap, validateTokens, validateUiIr } = require("./interoperability-core.cjs");
const { evaluateBenchmark } = require("./benchmark-core.cjs");
const { recordObservation } = require("./record-feedback.cjs");
const { evaluateIntake, validateDesignToolReceipt, validateRegistry, validateStyleSignals } = require("./adapter-core.cjs");
const { checkDesignFoundation } = require("./design-synthesis-core.cjs");
const { checkMotionFoundation } = require("./motion-foundation-core.cjs");
const { fail, jsonResult, pathInside, readJson, resolveInside, sha256 } = require("./contract-utils.cjs");

const referencesRoot = path.resolve(__dirname, "../references");
const BOOLEAN_OPTIONS = new Set(["--json", "--help", "-h", "--write", "--require-files", "--dry-run", "--unlock", "--legacy-events", "--replace", "--record-feedback"]);
const REPEATABLE_OPTIONS = new Set(["--blocker", "--changed-file", "--evidence", "--file", "--next-action", "--validation"]);
const KNOWN_OPTIONS = new Set([
  ...BOOLEAN_OPTIONS,
  ...REPEATABLE_OPTIONS,
  "--action", "--adapter-path", "--artifact", "--base", "--catalog", "--category", "--change-id", "--change-root",
  "--design-file", "--design-foundation", "--evidence-root", "--expected-sha256", "--failpoint", "--feedback-root", "--graphics-catalog",
  "--height", "--installed-evidence", "--kind", "--manifest", "--markdown", "--matrix", "--measurements", "--minimum-age-ms",
  "--motion-file", "--motion-foundation", "--observation", "--output", "--output-root", "--phase", "--platform", "--playwright-module", "--project-root",
  "--query", "--receipt", "--registry", "--repository", "--request", "--root", "--route", "--severity", "--sidecar", "--skill",
  "--source", "--source-evidence", "--status", "--summary", "--timeout-ms", "--timestamp", "--title", "--type", "--url", "--width",
]);

function parseArgs(argv) {
  const positionals = [];
  const options = new Map();
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("-")) { positionals.push(token); continue; }
    const equals = token.indexOf("=");
    const name = equals >= 0 ? token.slice(0, equals) : token;
    if (!KNOWN_OPTIONS.has(name)) fail("cli", `unknown option ${name}`, { code: "UNKNOWN_OPTION" });
    let value = equals >= 0 ? token.slice(equals + 1) : true;
    if (equals < 0 && !BOOLEAN_OPTIONS.has(name)) {
      value = argv[index + 1];
      if (value === undefined || value.startsWith("--")) fail("cli", `${name} requires a value`, { code: "OPTION_VALUE_REQUIRED" });
      index += 1;
    }
    const list = options.get(name) || [];
    if (list.length && !REPEATABLE_OPTIONS.has(name)) fail("cli", `${name} may be provided only once`, { code: "DUPLICATE_OPTION" });
    list.push(value);
    options.set(name, list);
  }
  return { positionals, options, argv };
}

function option(parsed, name, fallback = null) {
  const values = parsed.options.get(name);
  return values?.at(-1) ?? fallback;
}

function optionList(parsed, name) {
  return parsed.options.get(name) || [];
}

function requireOption(parsed, name) {
  const value = option(parsed, name);
  if (typeof value !== "string" || !value.trim()) fail("cli", `${name} is required`, { code: "OPTION_REQUIRED" });
  return value;
}

function timestamp(parsed) {
  const raw = option(parsed, "--timestamp") || process.env.DESIGN_PIPELINE_NOW || new Date().toISOString();
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) fail("cli", "--timestamp must be a valid date-time");
  return date.toISOString();
}

function rootFrom(parsed) {
  const root = path.resolve(option(parsed, "--root", process.cwd()));
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) fail("cli", `root does not exist: ${root}`, { code: "ROOT_NOT_FOUND" });
  return fs.realpathSync(root);
}

function contained(root, raw, label, mustExist = true) {
  const target = resolveInside(root, raw, label, { scope: "cli", mustExist });
  if (mustExist) {
    const real = fs.realpathSync(target);
    resolveInside(root, real, label, { scope: "cli" });
    return real;
  }
  return target;
}

function changeRootFrom(parsed, root, options = {}) {
  const raw = option(parsed, "--change-root");
  if (!raw) {
    if (options.changeId) return contained(root, path.join("openspec", "changes", options.changeId), "--change-root", false);
    fail("cli", "--change-root is required", { code: "OPTION_REQUIRED" });
  }
  return contained(root, raw, "--change-root", options.mustExist !== false);
}

function artifact(parsed, root, flag, fallback, mustExist = true) {
  const raw = option(parsed, flag, fallback);
  if (!raw) fail("cli", `${flag} is required`, { code: "OPTION_REQUIRED" });
  return contained(root, raw, flag, mustExist);
}

function builtIn(name) {
  return path.join(referencesRoot, name);
}

function publicHelp() {
  return [
    "Designer Pipeline CLI",
    "",
    "Commands:",
    "  doctor | status",
    "  change init|resume|advance|migrate|repair",
    "  foundation check | scene check",
    "  feedback record|prepare|reconcile",
    "  evidence check|capture",
    "  verify motion|components",
    "  patterns search|audit | tokens check | ui-ir check | design-code-map check",
    "  benchmark evaluate",
    "  adapter audit|intake|receipt-check | style-signals check",
    "",
    "All project paths are contained by --root. Exit 0 means success, 1 invalid/error, 2 blocked or verification failure.",
  ].join("\n");
}

function runKernel(script, args, cwd) {
  const child = spawnSync(process.execPath, [path.join(__dirname, script), ...args], {
    cwd,
    encoding: "utf8",
    env: { ...process.env, DESIGN_PIPELINE_CLI: "1" },
    windowsHide: true,
    timeout: 60000,
    maxBuffer: 4 * 1024 * 1024,
  });
  if (child.error) fail("cli", `kernel ${script} failed: ${child.error.message}`, { code: "KERNEL_FAILED" });
  if (child.status === 1) fail("cli", (child.stderr || child.stdout || `kernel ${script} failed`).trim(), { code: "KERNEL_FAILED" });
  let value = null;
  const output = (child.stdout || "").trim();
  if (output) {
    try { value = JSON.parse(output); } catch { value = { output }; }
  }
  return { value, exitCode: child.status === 2 ? 2 : 0 };
}

function legacyArgs(parsed, skipPositionals) {
  const result = [];
  let positionalsSeen = 0;
  for (let index = 0; index < parsed.argv.length; index += 1) {
    const token = parsed.argv[index];
    if (!token.startsWith("-")) {
      positionalsSeen += 1;
      if (positionalsSeen <= skipPositionals) continue;
    }
    if (token === "--json") continue;
    result.push(token);
  }
  result.push("--json");
  return result;
}

function statusCommand(parsed, root) {
  const changeRoot = changeRootFrom(parsed, root);
  const stateFile = path.join(changeRoot, "state.json");
  const eventsFile = path.join(changeRoot, "events.jsonl");
  const state = readJson(stateFile, "pipeline state");
  validateState(state);
  let consistency = null;
  if (state.schema === "design-pipeline.state.v2") {
    if (!fs.existsSync(eventsFile)) fail("cli", `events are missing: ${eventsFile}`, { code: "EVENTS_MISSING" });
    consistency = inspectConsistency(state, fs.readFileSync(eventsFile, "utf8"));
  }
  return { status: state.status, phase: state.phase || state.stage, stateSchema: state.schema, migrationRequired: state.schema !== "design-pipeline.state.v2", stateSha256: sha256(fs.readFileSync(stateFile)), consistency: consistency?.status || null, changeRoot };
}

function changeCommand(parsed, root, action) {
  if (action === "resume") return { result: statusCommand(parsed, root), exitCode: 0 };
  if (action === "init") {
    const changeId = requireOption(parsed, "--change-id");
    const changeRoot = changeRootFrom(parsed, root, { changeId, mustExist: false });
    const state = createInitialState({ changeId, timestamp: timestamp(parsed), phase: option(parsed, "--phase", "repo-read"), status: option(parsed, "--status", "initialized"), nextActions: optionList(parsed, "--next-action") });
    const result = writeNewChange(path.join(changeRoot, "state.json"), path.join(changeRoot, "events.jsonl"), state);
    return { result: { status: "initialized", changeRoot, ...result }, exitCode: 0 };
  }
  const changeRoot = changeRootFrom(parsed, root);
  const stateFile = path.join(changeRoot, "state.json");
  const eventsFile = path.join(changeRoot, "events.jsonl");
  if (action === "migrate") {
    const write = option(parsed, "--write") === true;
    const result = migrateFile(stateFile, { write, expectedSha256: option(parsed, "--expected-sha256") });
    return { result: { status: write ? "migrated" : "preview", changeRoot, sourceSha256: result.sourceSha256, stateSha256: write ? sha256(fs.readFileSync(stateFile)) : null, state: result.state }, exitCode: 0 };
  }
  const mutation = {
    expectedSha256: requireOption(parsed, "--expected-sha256"),
    timestamp: timestamp(parsed),
    summary: option(parsed, "--summary"),
    status: option(parsed, "--status"),
    phase: option(parsed, "--phase"),
    type: option(parsed, "--type"),
    files: optionList(parsed, "--file"),
    evidence: optionList(parsed, "--evidence"),
    blockers: optionList(parsed, "--blocker"),
    nextActions: optionList(parsed, "--next-action"),
    failpoint: option(parsed, "--failpoint"),
  };
  const foundationInputs = [["design", "--design-foundation"], ["motion", "--motion-foundation"]];
  for (const [kind, flag] of foundationInputs) {
    const raw = option(parsed, flag);
    if (!raw) continue;
    const file = contained(root, raw, flag);
    mutation.foundations ||= {};
    mutation.foundations[kind] = {
      path: path.relative(root, file).split(path.sep).join("/"),
      status: "ready",
      sha256: sha256(fs.readFileSync(file)),
      validator: `designer-pipeline foundation check --kind ${kind}`,
    };
  }
  if (action === "advance") {
    if (!mutation.summary) fail("cli", "--summary is required", { code: "OPTION_REQUIRED" });
    return { result: { status: "advanced", changeRoot, ...advanceChange(stateFile, eventsFile, mutation) }, exitCode: 0 };
  }
  if (action === "repair") {
    if (option(parsed, "--unlock") === true) {
      return { result: clearStaleLock(stateFile, { expectedSha256: mutation.expectedSha256, minimumAgeMs: Number(option(parsed, "--minimum-age-ms", 300000)) }), exitCode: 0 };
    }
    const result = option(parsed, "--legacy-events") === true
      ? repairLegacyEvents(stateFile, eventsFile, mutation)
      : repairChange(stateFile, eventsFile, mutation);
    return { result: { status: "repaired", changeRoot, ...result }, exitCode: 0 };
  }
  fail("cli", `unknown change action ${String(action)}`, { code: "UNKNOWN_COMMAND" });
}

function foundationCommand(parsed, root) {
  const projectRoot = contained(root, option(parsed, "--project-root", root), "--project-root");
  const kind = option(parsed, "--kind", "all");
  if (!["design", "motion", "all"].includes(kind)) fail("cli", "--kind must be design, motion, or all");
  const result = {};
  if (["design", "all"].includes(kind)) result.design = checkDesignFoundation({ projectRoot, designFile: option(parsed, "--design-file", "DESIGN.md") });
  if (["motion", "all"].includes(kind)) result.motion = checkMotionFoundation({ projectRoot, motionFile: option(parsed, "--motion-file", "MOTION.md") });
  const blocked = Object.values(result).some((item) => item.status !== "ready");
  return { result: { status: blocked ? "blocked" : "ready", foundations: result }, exitCode: blocked ? 2 : 0 };
}

function sceneCommand(parsed, root) {
  const changeRoot = changeRootFrom(parsed, root);
  const result = checkScene(changeRoot, { markdown: option(parsed, "--markdown"), sidecar: option(parsed, "--sidecar") });
  return { result, exitCode: result.status === "ready" ? 0 : 2 };
}

function benchmarkFeedback(root, result) {
  const failing = [...result.failedRequired, ...result.unknownRequired];
  if (!failing.length) return null;
  return recordObservation({
    root,
    feedbackRoot: root,
    kind: "quality-gap",
    source: "qa",
    severity: result.status === "blocked" ? "high" : "medium",
    route: "issue",
    title: `Benchmark ${result.benchmarkId} required scenarios did not pass`,
    summary: `Required benchmark scenarios are ${result.status}; the pipeline must preserve this failure instead of averaging it away.`,
    evidence: failing.map((id) => `${id}: ${result.unknownRequired.includes(id) ? "unknown" : "failed"}`),
  });
}

function evidenceCommand(parsed, root, action) {
  if (action === "check") {
    const file = artifact(parsed, root, "--receipt");
    const evidenceRoot = contained(root, option(parsed, "--evidence-root", path.dirname(file)), "--evidence-root");
    const receipt = validateReceipt(readJson(file, "evidence receipt"), { evidenceRoot, requireFiles: option(parsed, "--require-files") === true });
    return { result: { status: receipt.status, receipt }, exitCode: ["blocked", "unknown"].includes(receipt.status) ? 2 : 0 };
  }
  if (action === "capture") {
    const projectRoot = contained(root, option(parsed, "--project-root", root), "--project-root");
    const adapterRaw = requireOption(parsed, "--adapter-path");
    const adapterCandidate = path.isAbsolute(adapterRaw) ? adapterRaw : path.resolve(projectRoot, adapterRaw);
    const adapterPath = fs.realpathSync(adapterCandidate);
    const builtInAdapters = fs.realpathSync(path.resolve(__dirname, "../adapters"));
    const adapterTrusted = pathInside(projectRoot, adapterPath) || pathInside(builtInAdapters, adapterPath);
    if (!adapterTrusted) fail("cli", "--adapter-path must stay inside the project or built-in adapter directory");
    const outputRoot = contained(projectRoot, requireOption(parsed, "--output-root"), "--output-root", false);
    const args = ["--project-root", projectRoot, "--adapter-path", adapterPath, "--output-root", outputRoot, "--url", requireOption(parsed, "--url")];
    for (const flag of ["--width", "--height", "--timeout-ms", "--playwright-module"]) {
      const value = option(parsed, flag);
      if (!value) continue;
      args.push(flag, flag === "--playwright-module" ? contained(projectRoot, value, flag) : value);
    }
    const kernel = runKernel("capture-web-evidence.cjs", args, projectRoot);
    return { result: { status: kernel.exitCode === 2 ? "blocked" : "captured", receipt: kernel.value }, exitCode: kernel.exitCode };
  }
  fail("cli", `unknown evidence action ${String(action)}`, { code: "UNKNOWN_COMMAND" });
}

function verifyCommand(parsed, root, action) {
  if (action === "motion") {
    const file = artifact(parsed, root, "--receipt");
    const result = evaluateMotion(readJson(file, "motion evidence"));
    return { result, exitCode: result.status === "passed" ? 0 : 2 };
  }
  if (action === "components") {
    const file = artifact(parsed, root, "--matrix");
    const evidenceRoot = contained(root, option(parsed, "--evidence-root", path.dirname(file)), "--evidence-root");
    const result = checkComponentMatrix(readJson(file, "component states"), { evidenceRoot, requireFiles: option(parsed, "--require-files") === true });
    return { result, exitCode: result.status === "passed" ? 0 : 2 };
  }
  fail("cli", `unknown verify action ${String(action)}`, { code: "UNKNOWN_COMMAND" });
}

function patternCommand(parsed, root, action) {
  const catalogFile = option(parsed, "--catalog") ? artifact(parsed, root, "--catalog") : builtIn("ui-pattern-catalog.json");
  const catalog = readJson(catalogFile, "pattern catalog");
  if (action === "search") return { result: { status: "valid", results: searchPatterns(catalog, { query: option(parsed, "--query"), category: option(parsed, "--category"), platform: option(parsed, "--platform") }) }, exitCode: 0 };
  if (action === "audit") return { result: auditPatterns(catalog), exitCode: 0 };
  fail("cli", `unknown patterns action ${String(action)}`, { code: "UNKNOWN_COMMAND" });
}

function adapterCommand(parsed, root, action) {
  if (action === "audit") {
    const registryFile = option(parsed, "--registry") ? artifact(parsed, root, "--registry") : builtIn("adapter-registry.json");
    const catalogFile = option(parsed, "--graphics-catalog") ? artifact(parsed, root, "--graphics-catalog") : builtIn("graphics-runtime-catalog.json");
    return { result: validateRegistry(readJson(registryFile, "adapter registry"), readJson(catalogFile, "graphics catalog")), exitCode: 0 };
  }
  if (action === "receipt-check") {
    const result = validateDesignToolReceipt(readJson(artifact(parsed, root, "--receipt"), "design tool receipt"));
    return { result, exitCode: result.status === "valid" ? 0 : 2 };
  }
  if (action === "intake") {
    const result = evaluateIntake(readJson(artifact(parsed, root, "--artifact"), "adapter intake"));
    return { result, exitCode: result.status === "admissible" ? 0 : 2 };
  }
  fail("cli", `unknown adapter action ${String(action)}`, { code: "UNKNOWN_COMMAND" });
}

function dispatch(argv) {
  const parsed = parseArgs(argv);
  if (option(parsed, "--help") === true || option(parsed, "-h") === true || !parsed.positionals.length || parsed.positionals[0] === "help") {
    return { result: { status: "help", help: publicHelp() }, exitCode: 0, json: option(parsed, "--json") === true };
  }
  const [command, action] = parsed.positionals;
  const root = rootFrom(parsed);
  if (command === "doctor") {
    const required = ["pipeline-phases.json", "pipeline-state.schema.json", "scene-runtime.schema.json", "evidence-receipt.schema.json", "adapter-registry.json"];
    const missing = required.filter((name) => !fs.existsSync(builtIn(name)));
    const registry = missing.length ? null : validateRegistry(readJson(builtIn("adapter-registry.json"), "adapter registry"), readJson(builtIn("graphics-runtime-catalog.json"), "graphics catalog"));
    return { result: { status: missing.length ? "blocked" : "ready", node: process.versions.node, root, missing, registry }, exitCode: missing.length ? 2 : 0, json: option(parsed, "--json") === true };
  }
  let outcome;
  if (command === "status") outcome = { result: statusCommand(parsed, root), exitCode: 0 };
  else if (command === "change") outcome = changeCommand(parsed, root, action);
  else if (command === "foundation" && action === "check") outcome = foundationCommand(parsed, root);
  else if (command === "scene" && action === "check") outcome = sceneCommand(parsed, root);
  else if (command === "evidence") outcome = evidenceCommand(parsed, root, action);
  else if (command === "verify") outcome = verifyCommand(parsed, root, action);
  else if (command === "patterns") outcome = patternCommand(parsed, root, action);
  else if (command === "tokens" && action === "check") outcome = { result: validateTokens(readJson(artifact(parsed, root, "--artifact"), "design tokens")), exitCode: 0 };
  else if (command === "ui-ir" && action === "check") {
    const catalogFile = option(parsed, "--catalog") ? artifact(parsed, root, "--catalog") : builtIn("ui-pattern-catalog.json");
    outcome = { result: validateUiIr(readJson(artifact(parsed, root, "--artifact"), "ui ir"), readJson(catalogFile, "pattern catalog")), exitCode: 0 };
  } else if (command === "design-code-map" && action === "check") outcome = { result: validateDesignCodeMap(readJson(artifact(parsed, root, "--artifact"), "design code map")), exitCode: 0 };
  else if (command === "benchmark" && action === "evaluate") {
    const result = evaluateBenchmark(readJson(artifact(parsed, root, "--manifest"), "benchmark manifest"), readJson(artifact(parsed, root, "--measurements"), "benchmark measurements"));
    const feedback = option(parsed, "--record-feedback") === true ? benchmarkFeedback(root, result) : null;
    outcome = { result: { ...result, ...(feedback ? { feedback } : {}) }, exitCode: result.status === "passed" ? 0 : 2 };
  } else if (command === "adapter") outcome = adapterCommand(parsed, root, action);
  else if (command === "style-signals" && action === "check") {
    const file = option(parsed, "--artifact") ? artifact(parsed, root, "--artifact") : builtIn("visual-style-signals.json");
    outcome = { result: validateStyleSignals(readJson(file, "style signals")), exitCode: 0 };
  } else if (command === "feedback" && ["record", "prepare", "reconcile"].includes(action)) {
    const scripts = { record: "record-feedback.cjs", prepare: "prepare-publication.cjs", reconcile: "reconcile-publication.cjs" };
    const kernel = runKernel(scripts[action], legacyArgs(parsed, 2), root);
    outcome = { result: { status: kernel.exitCode === 2 ? "blocked" : "complete", kernel: kernel.value }, exitCode: kernel.exitCode };
  } else if (command === "source" && action === "audit") {
    const kernel = runKernel("audit-capabilities.cjs", legacyArgs(parsed, 2), root);
    outcome = { result: { status: kernel.exitCode === 2 ? "blocked" : "complete", kernel: kernel.value }, exitCode: kernel.exitCode };
  } else if (command === "source" && action === "add") {
    fail("cli", "source add is intentionally deferred; record an attributed source-evidence artifact instead", { code: "COMMAND_DEFERRED" });
  } else fail("cli", `unknown command: ${[command, action].filter(Boolean).join(" ")}`, { code: "UNKNOWN_COMMAND" });
  return { ...outcome, json: option(parsed, "--json") === true };
}

function execute(argv) {
  try {
    const outcome = dispatch(argv);
    return { output: jsonResult(true, outcome.result), exitCode: outcome.exitCode, json: outcome.json };
  } catch (error) {
    return { output: jsonResult(false, {}, error), exitCode: error?.code === "BLOCKED" ? 2 : 1, json: argv.includes("--json") };
  }
}

module.exports = { dispatch, execute, parseArgs, publicHelp };

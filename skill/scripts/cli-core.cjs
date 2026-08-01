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
const { checkReferenceEvidence } = require("./reference-evidence-core.cjs");
const { checkReconstruction } = require("./reconstruction-core.cjs");
const { checkSpecReconciliation } = require("./check-spec-reconciliation.cjs");
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
  "--source", "--source-evidence", "--stage", "--status", "--summary", "--timeout-ms", "--timestamp", "--title", "--type", "--url", "--width",
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

// Optional artifact flags fall back to the packaged reference rather than failing closed.
function optionalArtifact(parsed, root, flag, builtInName) {
  return option(parsed, flag) ? artifact(parsed, root, flag) : builtIn(builtInName);
}

function inspectDoctor(skillRoot = path.resolve(__dirname, ".."), nodeVersion = process.versions.node) {
  const manifestFile = path.join(skillRoot, "references", "package-resources.json");
  const missing = [];
  let manifestError = null;
  let required = [];
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestFile, "utf8"));
    if (
      manifest?.schema !== "design-pipeline.package-resources.v1" ||
      !Array.isArray(manifest.required)
    ) {
      throw new Error("unsupported structure");
    }
    required = manifest.required;
    for (const resource of required) {
      if (
        typeof resource !== "string" ||
        !resource ||
        path.isAbsolute(resource) ||
        resource.split(/[\\/]/).includes("..")
      ) {
        throw new Error(`unsafe resource entry: ${resource}`);
      }
    }
  } catch (error) {
    manifestError = error.message;
    missing.push("references/package-resources.json");
  }
  if (!manifestError) {
    missing.push(...required.filter((resource) => !fs.existsSync(path.join(skillRoot, resource))));
  }
  const nodeSupported = Number.parseInt(nodeVersion.split(".")[0], 10) >= 22;
  const registry =
    missing.length || !fs.existsSync(path.join(skillRoot, "references", "graphics-runtime-catalog.json"))
      ? null
      : validateRegistry(
          readJson(path.join(skillRoot, "references", "adapter-registry.json"), "adapter registry"),
          readJson(
            path.join(skillRoot, "references", "graphics-runtime-catalog.json"),
            "graphics catalog",
          ),
        );
  return {
    status: missing.length || !nodeSupported ? "blocked" : "ready",
    node: nodeVersion,
    nodeSupported,
    packageRoot: skillRoot,
    missing,
    ...(manifestError ? { manifestError } : {}),
    registry,
  };
}

function publicHelp() {
  return [
    "Designer Pipeline CLI",
    "",
    "Commands:",
    "  doctor | status",
    "  change init|resume|advance|migrate|repair",
    "  foundation check | reference check | reconstruction check | scene check",
    "  reconciliation check",
    "  feedback record|prepare|reconcile",
    "  evidence check|capture",
    "  verify motion|components",
    "  patterns search|audit | tokens check | ui-ir check | design-code-map check",
    "  benchmark evaluate",
    "  adapter audit|intake|receipt-check | style-signals check",
    "",
    "All project paths are contained by --root. Exit 0 means success, 1 invalid/error, 2 blocked, 3 measured fidelity mismatch.",
  ].join("\n");
}

// The documented kernel contract: 0 success, 1 invalid/error, 2 blocked, 3 measured fidelity
// mismatch. `runKernel` propagates that status faithfully; it never normalises an unrecognised
// status to success, because a status this wrapper does not understand is not evidence of success.
const KERNEL_EXIT_CODES = [0, 2, 3];
const KERNEL_STATUS_LABELS = { 2: "blocked", 3: "fidelity-limited" };

function kernelStatusLabel(exitCode, successLabel) {
  return KERNEL_STATUS_LABELS[exitCode] ?? successLabel;
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
  // A killed child reports `signal` and a null status. `error` is not always set for it (a timeout
  // kill in particular), so the signal is checked on its own rather than trusted to `error`.
  if (child.signal) fail("cli", `kernel ${script} was terminated by signal ${child.signal}`, { code: "KERNEL_SIGNALED" });
  if (typeof child.status !== "number") fail("cli", `kernel ${script} produced no exit status`, { code: "KERNEL_STATUS_MISSING" });
  if (child.status === 1) fail("cli", (child.stderr || child.stdout || `kernel ${script} failed`).trim(), { code: "KERNEL_FAILED" });
  if (!KERNEL_EXIT_CODES.includes(child.status)) {
    fail("cli", `kernel ${script} exited with unsupported status ${child.status}`, { code: "KERNEL_STATUS_UNSUPPORTED" });
  }
  let value = null;
  const output = (child.stdout || "").trim();
  if (output) {
    try { value = JSON.parse(output); } catch { value = { output }; }
  }
  return { value, exitCode: child.status };
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

// The reconciliation gate is executable so it can be run, not claimed. It reads change `design.md`
// and reports blocked when a change that has a reference carries no reconciliation section.
function reconciliationCommand(parsed, root) {
  const changeRoot = changeRootFrom(parsed, root);
  const result = checkSpecReconciliation(changeRoot, {
    designFile: option(parsed, "--design-file", "design.md"),
    artifact: option(parsed, "--artifact"),
  });
  return { result, exitCode: result.status === "ready" ? 0 : 2 };
}

// The reconciliation stage mirrors the graybox fold in `reference-evidence-core.cjs`: the stage is
// summarised into `stages`, its blockers trail the aggregate's own, and a blocked stage keeps the
// aggregate from ever reporting `ready`. A gate an agent has to remember to run separately is not a
// gate, so `reference check` carries it.
function reconciliationStage(changeRoot, options) {
  try {
    const result = checkSpecReconciliation(changeRoot, options);
    return {
      status: result.status,
      reason: result.reason,
      reasons: result.reasons,
      blockers: result.blockers,
    };
  } catch (error) {
    // A reconciliation that cannot be evaluated is blocked, never ready.
    return {
      status: "blocked",
      reason: "reconciliation-unverifiable",
      reasons: ["reconciliation-unverifiable"],
      blockers: [error.message],
    };
  }
}

function foldReconciliation(result, changeRoot, parsed) {
  const stage = reconciliationStage(changeRoot, {
    designFile: option(parsed, "--design-file", "design.md"),
    artifact: option(parsed, "--artifact"),
  });
  const blocked = stage.status !== "ready";
  return {
    ...result,
    status: blocked ? "blocked" : result.status,
    reason: result.reason ?? (blocked ? stage.reason : null),
    blockers: [...(result.blockers || []), ...(blocked ? stage.blockers : [])],
    stages: {
      ...(result.stages || {}),
      reconciliation: { status: stage.status, reason: stage.reason, reasons: stage.reasons },
    },
  };
}

function spatialCommand(parsed, root, command) {
  const changeRoot = changeRootFrom(parsed, root);
  let result;
  if (command === "scene") {
    result = checkScene(changeRoot, {
      markdown: option(parsed, "--markdown"),
      sidecar: option(parsed, "--sidecar"),
    });
  } else if (command === "reference") {
    result = foldReconciliation(
      checkReferenceEvidence(changeRoot, { artifact: option(parsed, "--artifact") }),
      changeRoot,
      parsed,
    );
  } else {
    result = checkReconstruction(changeRoot, {
      artifact: option(parsed, "--artifact"),
      stage: option(parsed, "--stage", "geometry"),
    });
  }
  const exitCode = result.status === "ready"
    ? 0
    : result.status === "fidelity-limited"
      ? 3
      : 2;
  return { result, exitCode };
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
    return { result: { status: kernelStatusLabel(kernel.exitCode, "captured"), receipt: kernel.value }, exitCode: kernel.exitCode };
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
  const catalogFile = optionalArtifact(parsed, root, "--catalog", "ui-pattern-catalog.json");
  const catalog = readJson(catalogFile, "pattern catalog");
  if (action === "search") return { result: { status: "valid", results: searchPatterns(catalog, { query: option(parsed, "--query"), category: option(parsed, "--category"), platform: option(parsed, "--platform") }) }, exitCode: 0 };
  if (action === "audit") return { result: auditPatterns(catalog), exitCode: 0 };
  fail("cli", `unknown patterns action ${String(action)}`, { code: "UNKNOWN_COMMAND" });
}

function adapterCommand(parsed, root, action) {
  if (action === "audit") {
    const registryFile = optionalArtifact(parsed, root, "--registry", "adapter-registry.json");
    const catalogFile = optionalArtifact(parsed, root, "--graphics-catalog", "graphics-runtime-catalog.json");
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

function doctorCommand({ root }) {
  const result = { ...inspectDoctor(), root };
  return { result, exitCode: result.status === "ready" ? 0 : 2 };
}

function tokensCheckCommand({ file }) {
  return { result: validateTokens(readJson(file("--artifact"), "design tokens")), exitCode: 0 };
}

function uiIrCheckCommand({ file }) {
  const catalogFile = file("--catalog");
  return { result: validateUiIr(readJson(file("--artifact"), "ui ir"), readJson(catalogFile, "pattern catalog")), exitCode: 0 };
}

function designCodeMapCheckCommand({ file }) {
  return { result: validateDesignCodeMap(readJson(file("--artifact"), "design code map")), exitCode: 0 };
}

function benchmarkEvaluateCommand({ parsed, root, file }) {
  const result = evaluateBenchmark(readJson(file("--manifest"), "benchmark manifest"), readJson(file("--measurements"), "benchmark measurements"));
  const feedback = option(parsed, "--record-feedback") === true ? benchmarkFeedback(root, result) : null;
  return { result: { ...result, ...(feedback ? { feedback } : {}) }, exitCode: result.status === "passed" ? 0 : 2 };
}

function styleSignalsCheckCommand({ file }) {
  return { result: validateStyleSignals(readJson(file("--artifact"), "style signals")), exitCode: 0 };
}

// `feedback` and `source audit` still delegate to the standalone kernels; the wrapper shape is the
// same for every one of them, so the registry stores the script name rather than repeating it.
function kernelEntry(script) {
  return {
    run: ({ parsed, root }) => {
      const kernel = runKernel(script, legacyArgs(parsed, 2), root);
      return { result: { status: kernelStatusLabel(kernel.exitCode, "complete"), kernel: kernel.value }, exitCode: kernel.exitCode };
    },
  };
}

function sourceAddCommand() {
  fail("cli", "source add is intentionally deferred; record an attributed source-evidence artifact instead", { code: "COMMAND_DEFERRED" });
}

// Command registry. A top-level entry either carries `run` (the command owns its own subcommand
// routing and accepts any action) or `actions` (an exact `command action` path; anything else is an
// unknown command). Leaf entries declare their artifact options as data:
//   required - must be supplied; resolved through `artifact` and contained by --root
//   optional - flag to the packaged reference used when the flag is absent
// Options resolved by `changeRootFrom`/`contained` stay inside their handler because their
// containment rules, not plain presence, decide the failure.
const COMMANDS = {
  doctor: { run: doctorCommand },
  status: { run: ({ parsed, root }) => ({ result: statusCommand(parsed, root), exitCode: 0 }) },
  change: { run: ({ parsed, root, action }) => changeCommand(parsed, root, action) },
  evidence: { run: ({ parsed, root, action }) => evidenceCommand(parsed, root, action) },
  verify: { run: ({ parsed, root, action }) => verifyCommand(parsed, root, action) },
  patterns: { run: ({ parsed, root, action }) => patternCommand(parsed, root, action) },
  adapter: { run: ({ parsed, root, action }) => adapterCommand(parsed, root, action) },
  foundation: { actions: { check: { run: ({ parsed, root }) => foundationCommand(parsed, root) } } },
  reconciliation: { actions: { check: { run: ({ parsed, root }) => reconciliationCommand(parsed, root) } } },
  reference: { actions: { check: { run: ({ parsed, root, command }) => spatialCommand(parsed, root, command) } } },
  reconstruction: { actions: { check: { run: ({ parsed, root, command }) => spatialCommand(parsed, root, command) } } },
  scene: { actions: { check: { run: ({ parsed, root, command }) => spatialCommand(parsed, root, command) } } },
  tokens: { actions: { check: { required: ["--artifact"], run: tokensCheckCommand } } },
  "ui-ir": {
    actions: {
      check: {
        required: ["--artifact"],
        optional: { "--catalog": "ui-pattern-catalog.json" },
        run: uiIrCheckCommand,
      },
    },
  },
  "design-code-map": { actions: { check: { required: ["--artifact"], run: designCodeMapCheckCommand } } },
  benchmark: {
    actions: {
      evaluate: {
        required: ["--manifest", "--measurements"],
        run: benchmarkEvaluateCommand,
      },
    },
  },
  "style-signals": {
    actions: {
      check: {
        optional: { "--artifact": "visual-style-signals.json" },
        run: styleSignalsCheckCommand,
      },
    },
  },
  feedback: {
    actions: {
      record: kernelEntry("record-feedback.cjs"),
      prepare: kernelEntry("prepare-publication.cjs"),
      reconcile: kernelEntry("reconcile-publication.cjs"),
    },
  },
  source: { actions: { audit: kernelEntry("audit-capabilities.cjs"), add: { run: sourceAddCommand } } },
};

function resolveCommand(command, action) {
  if (!Object.hasOwn(COMMANDS, command)) return null;
  const entry = COMMANDS[command];
  if (entry.run) return entry;
  return action && Object.hasOwn(entry.actions, action) ? entry.actions[action] : null;
}

// Resolution stays lazy so each handler still fails in the order it reads its options.
function fileResolver(parsed, root, entry) {
  const required = entry.required || [];
  const optional = entry.optional || {};
  return (flag) => {
    if (required.includes(flag)) return artifact(parsed, root, flag);
    if (Object.hasOwn(optional, flag)) return optionalArtifact(parsed, root, flag, optional[flag]);
    return fail("cli", `${flag} is required`, { code: "OPTION_REQUIRED" });
  };
}

function dispatch(argv) {
  const parsed = parseArgs(argv);
  const json = option(parsed, "--json") === true;
  if (option(parsed, "--help") === true || option(parsed, "-h") === true || !parsed.positionals.length || parsed.positionals[0] === "help") {
    return { result: { status: "help", help: publicHelp() }, exitCode: 0, json };
  }
  const [command, action] = parsed.positionals;
  const root = rootFrom(parsed);
  const entry = resolveCommand(command, action);
  if (!entry) fail("cli", `unknown command: ${[command, action].filter(Boolean).join(" ")}`, { code: "UNKNOWN_COMMAND" });
  const outcome = entry.run({ parsed, root, command, action, file: fileResolver(parsed, root, entry) });
  return { ...outcome, json };
}

function execute(argv) {
  try {
    const outcome = dispatch(argv);
    return { output: jsonResult(true, outcome.result), exitCode: outcome.exitCode, json: outcome.json };
  } catch (error) {
    return { output: jsonResult(false, {}, error), exitCode: error?.code === "BLOCKED" ? 2 : 1, json: argv.includes("--json") };
  }
}

module.exports = { dispatch, execute, inspectDoctor, parseArgs, publicHelp };

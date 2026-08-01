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
const { validateReceipt } = require("./evidence-core.cjs");
const { checkComponentMatrix, evaluateMotion } = require("./motion-evidence-core.cjs");
const { auditPatterns, searchPatterns, validateDesignCodeMap, validateTokens, validateUiIr } = require("./interoperability-core.cjs");
const { createDeveloperBrief, evaluateBenchmark } = require("./benchmark-core.cjs");
const { recordObservation } = require("./record-feedback.cjs");
const { evaluateIntake, validateDesignToolReceipt, validateRegistry, validateStyleSignals } = require("./adapter-core.cjs");
const { checkDesignFoundation } = require("./design-synthesis-core.cjs");
const { checkMotionFoundation } = require("./motion-foundation-core.cjs");
const {
  normalizeDesignSystemSnapshot,
  searchDesignSystemCatalog,
} = require("./design-system-catalog-core.cjs");
const {
  decideDesignSystem,
  projectDesignSystemTokens,
} = require("./design-system-decision-core.cjs");
const {
  acquireDesignSystemProvider,
  atomicWriteProviderJson,
  loadProfiles,
} = require("./design-system-provider-core.cjs");
const { fail, jsonResult, pathInside, readJson, resolveInside, sha256 } = require("./contract-utils.cjs");

const referencesRoot = path.resolve(__dirname, "../references");
const BOOLEAN_OPTIONS = new Set(["--json", "--help", "-h", "--write", "--require-files", "--dry-run", "--unlock", "--legacy-events", "--replace", "--record-feedback", "--allow-canary"]);
const REPEATABLE_OPTIONS = new Set(["--blocker", "--changed-file", "--evidence", "--file", "--next-action", "--validation"]);
const KNOWN_OPTIONS = new Set([
  ...BOOLEAN_OPTIONS,
  ...REPEATABLE_OPTIONS,
  "--action", "--adapter-path", "--api-version", "--artifact", "--base", "--catalog", "--category", "--change-id", "--change-root",
  "--design-file", "--design-foundation", "--evidence-root", "--expected-sha256", "--failpoint", "--feedback-root", "--graphics-catalog",
  "--height", "--installed-evidence", "--kind", "--limit", "--manifest", "--markdown", "--matrix", "--measurements", "--minimum-age-ms",
  "--motion-file", "--motion-foundation", "--observation", "--output", "--output-root", "--phase", "--platform", "--playwright-module", "--project-root",
  "--provider", "--provider-cli-path", "--query", "--receipt", "--registry", "--repository", "--request", "--root", "--route", "--severity", "--sidecar", "--skill",
  "--snapshot", "--source", "--source-evidence", "--stage", "--status", "--summary", "--timeout-ms", "--timestamp", "--title", "--type", "--url", "--width",
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
    "  feedback record|prepare|reconcile",
    "  evidence check|capture",
    "  verify motion|components",
    "  patterns search|audit | tokens check | ui-ir check | design-code-map check",
    "  design-system profiles|normalize|acquire|search|project-tokens|decide",
    "  benchmark brief|evaluate",
    "  adapter audit|intake|receipt-check | style-signals check",
    "",
    "All project paths are contained by --root. Exit 0 means success, 1 invalid/error, 2 blocked, 3 measured fidelity mismatch.",
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

function spatialCommand(parsed, root, command) {
  const changeRoot = changeRootFrom(parsed, root);
  let result;
  if (command === "scene") {
    result = checkScene(changeRoot, {
      markdown: option(parsed, "--markdown"),
      sidecar: option(parsed, "--sidecar"),
    });
  } else if (command === "reference") {
    result = checkReferenceEvidence(changeRoot, {
      artifact: option(parsed, "--artifact"),
    });
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

function numberOption(parsed, name, options = {}) {
  const raw = option(parsed, name);
  if (raw === null) return null;
  if (!/^\d+$/.test(String(raw))) fail("cli", `${name} must be a positive integer`, { code: "OPTION_VALUE_INVALID" });
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < (options.min || 1) || (options.max && value > options.max)) {
    fail("cli", `${name} is outside the supported range`, { code: "OPTION_VALUE_INVALID" });
  }
  return value;
}

function bundledDesignSystemCatalog() {
  return normalizeDesignSystemSnapshot(readJson(builtIn("astryx-design-system-snapshot.json"), "bundled Astryx snapshot"));
}

function designSystemCatalog(parsed, root) {
  if (option(parsed, "--catalog")) return readJson(artifact(parsed, root, "--catalog"), "design system catalog");
  if (option(parsed, "--snapshot")) return normalizeDesignSystemSnapshot(readJson(artifact(parsed, root, "--snapshot"), "design system snapshot"));
  return bundledDesignSystemCatalog();
}

function writeResult(parsed, root, value) {
  if (option(parsed, "--write") !== true) return null;
  const output = requireOption(parsed, "--output");
  return atomicWriteProviderJson(root, output, value);
}

function designSystemCommand(parsed, root, action) {
  if (action === "profiles") {
    const profiles = loadProfiles();
    return { result: { status: "valid", ...profiles }, exitCode: 0 };
  }
  if (action === "normalize") {
    const catalog = designSystemCatalog(parsed, root);
    const output = writeResult(parsed, root, catalog);
    return { result: { status: "valid", catalog, ...(output ? { output } : {}) }, exitCode: 0 };
  }
  if (action === "search") {
    const catalog = designSystemCatalog(parsed, root);
    const results = searchDesignSystemCatalog(catalog, {
      ...(option(parsed, "--query") ? { query: option(parsed, "--query") } : {}),
      ...(option(parsed, "--kind") ? { kind: option(parsed, "--kind") } : {}),
      ...(option(parsed, "--category") ? { category: option(parsed, "--category") } : {}),
      ...(option(parsed, "--status") ? { status: option(parsed, "--status") } : {}),
      ...(option(parsed, "--limit") ? { limit: numberOption(parsed, "--limit", { max: 1000 }) } : {}),
    });
    return { result: { status: "valid", namespace: catalog.namespace, results }, exitCode: 0 };
  }
  if (action === "acquire") {
    const outputRoot = artifact(parsed, root, "--output-root", null, false);
    const output = path.join(path.relative(root, outputRoot), "provider.json");
    const result = acquireDesignSystemProvider({
      root,
      adapterPath: option(parsed, "--adapter-path") || undefined,
      providerCliPath: option(parsed, "--provider-cli-path") || undefined,
      providerId: option(parsed, "--provider", "astryx"),
      apiVersion: option(parsed, "--api-version") || undefined,
      timeoutMs: numberOption(parsed, "--timeout-ms", { min: 100, max: 60000 }) || undefined,
      allowCanary: option(parsed, "--allow-canary") === true,
      output,
    });
    return { result: { ...result, output: path.resolve(root, output) }, exitCode: result.status === "complete" ? 0 : 2 };
  }
  if (action === "project-tokens") {
    const projection = projectDesignSystemTokens(designSystemCatalog(parsed, root));
    const output = writeResult(parsed, root, projection);
    return { result: { status: projection.status, projection, ...(output ? { output } : {}) }, exitCode: projection.status === "blocked" ? 2 : 0 };
  }
  if (action === "decide") {
    const request = readJson(artifact(parsed, root, "--artifact"), "design system decision request");
    if (!request.catalog) request.catalog = designSystemCatalog(parsed, root);
    if (option(parsed, "--allow-canary") === true) request.allowCanary = true;
    const decision = decideDesignSystem(request);
    const output = writeResult(parsed, root, decision);
    return { result: { status: decision.status, decision, ...(output ? { output } : {}) }, exitCode: decision.status === "blocked" ? 2 : 0 };
  }
  fail("cli", `unknown design-system action ${String(action)}`, { code: "UNKNOWN_COMMAND" });
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
    const result = { ...inspectDoctor(), root };
    return {
      result,
      exitCode: result.status === "ready" ? 0 : 2,
      json: option(parsed, "--json") === true,
    };
  }
  let outcome;
  if (command === "status") outcome = { result: statusCommand(parsed, root), exitCode: 0 };
  else if (command === "change") outcome = changeCommand(parsed, root, action);
  else if (command === "foundation" && action === "check") outcome = foundationCommand(parsed, root);
  else if (["reference", "reconstruction", "scene"].includes(command) && action === "check") {
    outcome = spatialCommand(parsed, root, command);
  }
  else if (command === "evidence") outcome = evidenceCommand(parsed, root, action);
  else if (command === "verify") outcome = verifyCommand(parsed, root, action);
  else if (command === "patterns") outcome = patternCommand(parsed, root, action);
  else if (command === "design-system") outcome = designSystemCommand(parsed, root, action);
  else if (command === "tokens" && action === "check") outcome = { result: validateTokens(readJson(artifact(parsed, root, "--artifact"), "design tokens")), exitCode: 0 };
  else if (command === "ui-ir" && action === "check") {
    const catalogFile = option(parsed, "--catalog") ? artifact(parsed, root, "--catalog") : builtIn("ui-pattern-catalog.json");
    outcome = { result: validateUiIr(readJson(artifact(parsed, root, "--artifact"), "ui ir"), readJson(catalogFile, "pattern catalog")), exitCode: 0 };
  } else if (command === "design-code-map" && action === "check") outcome = { result: validateDesignCodeMap(readJson(artifact(parsed, root, "--artifact"), "design code map")), exitCode: 0 };
  else if (command === "benchmark" && action === "brief") {
    outcome = { result: { status: "valid", brief: createDeveloperBrief(readJson(artifact(parsed, root, "--manifest"), "benchmark manifest")) }, exitCode: 0 };
  } else if (command === "benchmark" && action === "evaluate") {
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

module.exports = { dispatch, execute, inspectDoctor, parseArgs, publicHelp };

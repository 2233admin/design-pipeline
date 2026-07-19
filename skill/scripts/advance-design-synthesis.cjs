#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const {
  BUDGET_THRESHOLDS,
  appendEvent,
  fail,
  isNonEmptyString,
  mergeUnique,
  normalizeTrackerUrl,
  nowIso,
  readJson,
  relativePath,
  resolveExistingFileInside,
  sha256Text,
  slash,
  updateHandoff,
  validateDesignFoundationText,
  validateManifest,
  writeJson,
} = require("./design-synthesis-core.cjs");

const EVENTS = new Set([
  "grill-completed",
  "scope-assessed",
  "wayfinder-linked",
  "design-generated",
  "continue",
]);
const SYNTHESIS_ACTION_PATTERNS = [
  /^\/grill-with-docs\b/,
  /^\/wayfinder\b/,
  /^哦，天哪/,
  /^Synthesize\b/i,
  /^Validate\b/i,
  /^Continue\b/i,
  /^Implement from\b/i,
];

function takeValue(argv, index, option) {
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) fail(`${option} requires a value`);
  return value;
}

function parseArgs(argv) {
  const options = {};
  const fields = new Map([
    ["--change-root", "changeRoot"],
    ["--event", "event"],
    ["--evidence", "evidence"],
    ["--map-url", "mapUrl"],
    ["--design-file", "designFile"],
    ["--surface-count", "surfaceCount"],
    ["--workflow-count", "workflowCount"],
    ["--integration-count", "integrationCount"],
    ["--unknown-count", "unknownCount"],
    ["--decision-count", "decisionCount"],
  ]);
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") {
      options.help = true;
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
  return options;
}

function printHelp() {
  console.log(
    "Usage: node advance-design-synthesis.cjs --change-root <path> --event grill-completed|scope-assessed|wayfinder-linked|design-generated|continue [event options]",
  );
}

function loadRun(options) {
  if (!isNonEmptyString(options.changeRoot)) fail("--change-root is required");
  const requestedRoot = path.resolve(options.changeRoot);
  if (!fs.existsSync(requestedRoot) || !fs.statSync(requestedRoot).isDirectory()) {
    fail(`change root does not exist: ${requestedRoot}`);
  }
  const changeRoot = fs.realpathSync(requestedRoot);
  const manifestPath = path.join(changeRoot, "design-synthesis.json");
  const statePath = path.join(changeRoot, "state.json");
  const handoffPath = path.join(changeRoot, "handoff.md");
  const eventsPath = path.join(changeRoot, "events.jsonl");
  for (const required of [manifestPath, statePath, handoffPath]) {
    if (!fs.existsSync(required)) fail(`required synthesis artifact is missing: ${path.basename(required)}`);
  }
  const manifest = validateManifest(readJson(manifestPath, "design-synthesis.json"));
  const state = readJson(statePath, "state.json");
  if (state.changeId !== manifest.changeId) fail("state and synthesis change ids must match");
  const projectRoot = fs.realpathSync(path.resolve(changeRoot, manifest.projectRoot));
  if (relativePath(projectRoot, changeRoot) !== manifest.artifactRoot) {
    fail("design-synthesis artifactRoot does not match the change root");
  }
  if (!EVENTS.has(options.event)) fail("--event is invalid or missing");
  return {
    changeRoot,
    eventsPath,
    handoffPath,
    manifest,
    manifestPath,
    projectRoot,
    state,
    statePath,
  };
}

function requireStage(manifest, stage, event) {
  const allowed = Array.isArray(stage) ? stage : [stage];
  if (!allowed.includes(manifest.stage)) {
    fail(`${event} is not valid while synthesis stage is ${manifest.stage}`);
  }
}

function parseCount(value, option) {
  if (value === undefined) fail(`${option} is required`);
  if (!/^\d+$/.test(value)) fail(`${option} must be a non-negative integer`);
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) fail(`${option} is too large`);
  return parsed;
}

function nextState(state, manifest, phase, status, actions, now) {
  const retained = (Array.isArray(state.nextActions) ? state.nextActions : []).filter(
    (action) => !SYNTHESIS_ACTION_PATTERNS.some((pattern) => pattern.test(action)),
  );
  return {
    ...state,
    status,
    phase,
    updatedAt: now,
    blockers: Array.isArray(state.blockers) ? state.blockers : [],
    nextActions: mergeUnique(retained, actions),
    designFoundation: {
      path: manifest.output.path,
      status: manifest.output.status === "validated" ? "ready" : "synthesis-required",
      sha256: manifest.output.sha256,
    },
    designSynthesis: {
      manifest: `${manifest.artifactRoot}/design-synthesis.json`,
      status: manifest.status,
      stage: manifest.stage,
      output: manifest.output.path,
    },
  };
}

function handoffSection(manifest) {
  const map = manifest.wayfinder.mapUrl ? `\n- Wayfinder map: ${manifest.wayfinder.mapUrl}` : "";
  const score = manifest.scope.score === null
    ? "pending"
    : `${manifest.scope.score}/${manifest.scope.threshold} (${manifest.scope.status})`;
  return `<!-- DESIGN-PIPELINE:DESIGN-SYNTHESIS:START -->
## Requirements-Driven DESIGN.md Synthesis

- Manifest: \`${manifest.artifactRoot}/design-synthesis.json\`
- Status: ${manifest.status}
- Stage: ${manifest.stage}
- Product design output: \`${manifest.output.path}\`
- Change design: \`${manifest.artifactRoot}/design.md\`
- Input mode: ${manifest.inputs.mode}
- Scope: ${score}${map}
- Next: ${manifest.interaction.nextCommand}

Template and reference inputs are attributed evidence only. Product requirements and recorded
decisions determine the synthesized design.
<!-- DESIGN-PIPELINE:DESIGN-SYNTHESIS:END -->`;
}

function commit(run, manifest, state, event) {
  updateHandoff(run.handoffPath, handoffSection(manifest));
  writeJson(run.manifestPath, manifest);
  writeJson(run.statePath, state);
  appendEvent(run.eventsPath, event);
}

function recordGrill(run, options, now) {
  requireStage(run.manifest, "grill-with-docs", options.event);
  const evidence = resolveExistingFileInside(run.changeRoot, options.evidence, "--evidence");
  const manifest = structuredClone(run.manifest);
  manifest.status = "in-progress";
  manifest.stage = "scope-assessment";
  manifest.updatedAt = now;
  manifest.evidence.push({
    type: "grill",
    path: `${manifest.artifactRoot}/${evidence.relative}`,
    recordedAt: now,
  });
  manifest.interaction = {
    mode: "human-in-loop",
    nextCommand: "Assess the declared surfaces, workflows, integrations, unknowns, and decisions.",
    message: "Grill evidence is recorded. Measure the effort before choosing direct synthesis or Wayfinder.",
  };
  const state = nextState(
    run.state,
    manifest,
    "stage-1-brief",
    "in-progress",
    [manifest.interaction.nextCommand],
    now,
  );
  commit(run, manifest, state, {
    ts: now,
    phase: state.phase,
    type: "interaction-completed",
    summary: "Recorded grill-with-docs evidence.",
    files: [evidence.relative],
    evidence: [`${manifest.artifactRoot}/${evidence.relative}`],
    nextActions: state.nextActions,
  });
  console.log("Grill evidence recorded. Assess scope next.");
}

function scopeCounts(options) {
  return {
    surfaces: parseCount(options.surfaceCount, "--surface-count"),
    workflows: parseCount(options.workflowCount, "--workflow-count"),
    integrations: parseCount(options.integrationCount, "--integration-count"),
    unknowns: parseCount(options.unknownCount, "--unknown-count"),
    decisions: parseCount(options.decisionCount, "--decision-count"),
  };
}

function scopeScore(counts) {
  return (
    counts.surfaces * 2 +
    counts.workflows * 3 +
    counts.integrations * 3 +
    counts.unknowns +
    counts.decisions
  );
}

function assessScope(run, options, now) {
  requireStage(run.manifest, "scope-assessment", options.event);
  if (!run.manifest.evidence.some((item) => item.type === "grill")) {
    fail("scope assessment requires recorded grill evidence");
  }
  const counts = scopeCounts(options);
  const score = scopeScore(counts);
  const threshold = BUDGET_THRESHOLDS[run.manifest.scope.budget];
  const oversized = score > threshold;
  const manifest = structuredClone(run.manifest);
  manifest.scope = {
    ...manifest.scope,
    counts,
    score,
    status: oversized ? "oversized" : "fit",
    surprise: oversized,
  };
  manifest.updatedAt = now;
  manifest.wayfinder = {
    required: oversized,
    status: oversized ? "required" : "not-required",
    mapUrl: null,
  };
  manifest.status = oversized ? "awaiting-wayfinder" : "ready-for-synthesis";
  manifest.stage = oversized ? "wayfinder" : "design-synthesis";
  manifest.interaction = oversized
    ? {
        mode: "human-in-loop",
        nextCommand: "/wayfinder 为此制作一张地图",
        message: "哦，天哪，这比我预期的要大得多。",
      }
    : {
        mode: "human-in-loop",
        nextCommand: "Synthesize 2-3 product-specific directions, select one, and write DESIGN.md.",
        message: "The declared scope fits the selected budget; proceed to evidence-backed synthesis.",
      };
  const actions = oversized
    ? [manifest.interaction.message, manifest.interaction.nextCommand]
    : [manifest.interaction.nextCommand];
  const state = nextState(
    run.state,
    manifest,
    "stage-2-directions",
    oversized ? "needs-review" : "in-progress",
    actions,
    now,
  );
  commit(run, manifest, state, {
    ts: now,
    phase: state.phase,
    type: oversized ? "scope-surprise" : "decision",
    summary: oversized
      ? `Scope score ${score} exceeds ${manifest.scope.budget} budget ${threshold}; Wayfinder required.`
      : `Scope score ${score} fits ${manifest.scope.budget} budget ${threshold}; direct synthesis selected.`,
    files: [`${manifest.artifactRoot}/design-synthesis.json`],
    evidence: [],
    nextActions: actions,
  });
  if (oversized) {
    console.log(manifest.interaction.message);
    console.log(manifest.interaction.nextCommand);
  } else {
    console.log(`Scope fits (${score}/${threshold}). Continue to design synthesis.`);
  }
}

function linkWayfinder(run, options, now) {
  requireStage(run.manifest, "wayfinder", options.event);
  const mapUrl = normalizeTrackerUrl(options.mapUrl);
  const manifest = structuredClone(run.manifest);
  manifest.status = "ready-for-synthesis";
  manifest.stage = "design-synthesis";
  manifest.updatedAt = now;
  manifest.wayfinder = {
    required: true,
    status: "linked",
    mapUrl,
  };
  manifest.interaction = {
    mode: "human-in-loop",
    nextCommand: "Use the linked decision map to synthesize directions and write DESIGN.md.",
    message: "The oversized effort now has a real shared decision map.",
  };
  const state = nextState(
    run.state,
    manifest,
    "stage-2-directions",
    "in-progress",
    [manifest.interaction.nextCommand],
    now,
  );
  commit(run, manifest, state, {
    ts: now,
    phase: state.phase,
    type: "wayfinder-linked",
    summary: "Linked the real Wayfinder decision map and resumed design synthesis.",
    files: [`${manifest.artifactRoot}/design-synthesis.json`],
    evidence: [mapUrl],
    nextActions: [manifest.interaction.nextCommand],
  });
  console.log("Wayfinder map linked. Continue to design synthesis.");
}

function recordDesign(run, options, now) {
  requireStage(run.manifest, "design-synthesis", options.event);
  if (!isNonEmptyString(options.designFile)) fail("--design-file is required");
  const expected = slash(path.normalize(run.manifest.output.path));
  const requested = slash(path.normalize(options.designFile));
  if (requested !== expected) {
    fail(`--design-file must match the declared output path: ${run.manifest.output.path}`);
  }
  const design = resolveExistingFileInside(run.projectRoot, options.designFile, "--design-file");
  const text = fs.readFileSync(design.absolute, "utf8");
  validateDesignFoundationText(text, { activeChangeId: run.manifest.changeId });
  const manifest = structuredClone(run.manifest);
  manifest.status = "needs-review";
  manifest.stage = "design-validation";
  manifest.updatedAt = now;
  manifest.output = {
    path: design.relative,
    status: "validated",
    sha256: sha256Text(text),
    validatedAt: now,
  };
  manifest.evidence.push({
    type: "design-validation",
    path: design.relative,
    recordedAt: now,
  });
  manifest.interaction = {
    mode: "human-in-loop",
    nextCommand: "Continue into implementation from DESIGN.md, change design.md, and tasks.md.",
    message: "DESIGN.md passed structure and provenance validation.",
  };
  const state = nextState(
    run.state,
    manifest,
    "stage-3-design-spec",
    "needs-review",
    [manifest.interaction.nextCommand],
    now,
  );
  commit(run, manifest, state, {
    ts: now,
    phase: state.phase,
    type: "design-validated",
    summary: "Validated the project DESIGN.md structure and source-decision provenance.",
    files: [design.relative],
    evidence: [design.relative],
    nextActions: [manifest.interaction.nextCommand],
  });
  console.log("DESIGN.md validated. Continue into implementation.");
}

function continueImplementation(run, options, now) {
  requireStage(run.manifest, "design-validation", options.event);
  if (run.manifest.output.status !== "validated" || !run.manifest.output.sha256) {
    fail("cannot continue until DESIGN.md is validated");
  }
  const design = resolveExistingFileInside(
    run.projectRoot,
    run.manifest.output.path,
    "validated DESIGN.md",
  );
  const currentHash = sha256Text(fs.readFileSync(design.absolute, "utf8"));
  if (currentHash !== run.manifest.output.sha256) {
    fail("validated DESIGN.md changed; run design-generated again before continuing");
  }
  const manifest = structuredClone(run.manifest);
  manifest.status = "ready-to-implement";
  manifest.stage = "implementation";
  manifest.updatedAt = now;
  manifest.interaction = {
    mode: "human-in-loop",
    nextCommand: "Implement from DESIGN.md, change design.md, and tasks.md; then run normal design-pipeline QA.",
    message: "All synthesis gates passed. Continue without another interaction pause.",
  };
  const state = nextState(
    run.state,
    manifest,
    "stage-5-implementation",
    "in-progress",
    [manifest.interaction.nextCommand],
    now,
  );
  commit(run, manifest, state, {
    ts: now,
    phase: state.phase,
    type: "implementation-resumed",
    summary: "Completed design synthesis and resumed the normal implementation pipeline.",
    files: [manifest.output.path, `${manifest.artifactRoot}/design.md`, `${manifest.artifactRoot}/tasks.md`],
    evidence: [manifest.output.path],
    nextActions: [manifest.interaction.nextCommand],
  });
  console.log("Design synthesis complete. Happily continuing into implementation.");
}

function advance(run, options) {
  const now = nowIso();
  if (options.event === "grill-completed") return recordGrill(run, options, now);
  if (options.event === "scope-assessed") return assessScope(run, options, now);
  if (options.event === "wayfinder-linked") return linkWayfinder(run, options, now);
  if (options.event === "design-generated") return recordDesign(run, options, now);
  return continueImplementation(run, options, now);
}

try {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) printHelp();
  else advance(loadRun(options), options);
} catch (error) {
  console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}

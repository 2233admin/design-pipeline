#!/usr/bin/env node
"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const {
  BUDGET_THRESHOLDS,
  appendEvent,
  fail,
  findArtifactRoot,
  mergeUnique,
  normalizeHttpUrl,
  normalizeTemplateLocator,
  nowIso,
  readJson,
  relativePath,
  resolveOutputPath,
  resolveProjectRoot,
  stableId,
  updateHandoff,
  validateChangeId,
  validateManifest,
  validateProblem,
  writeIfMissing,
  writeJson,
} = require("./design-synthesis-core.cjs");

function takeValue(argv, index, option) {
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) fail(`${option} requires a value`);
  return value;
}

function parseArgs(argv) {
  const options = {
    projectRoot: process.cwd(),
    references: [],
    templates: [],
    framework: "auto-detect",
    budget: "session",
    output: "DESIGN.md",
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }
    const named = [
      ["--project-root", "projectRoot"],
      ["--change-id", "changeId"],
      ["--problem", "problem"],
      ["--framework", "framework"],
      ["--budget", "budget"],
      ["--output", "output"],
    ].find(([flag]) => arg === flag || arg.startsWith(`${flag}=`));
    if (named) {
      const [flag, property] = named;
      options[property] = arg === flag ? takeValue(argv, index, flag) : arg.slice(flag.length + 1);
      if (arg === flag) index += 1;
      continue;
    }
    if (arg === "--reference-url" || arg.startsWith("--reference-url=")) {
      const value = arg === "--reference-url"
        ? takeValue(argv, index, arg)
        : arg.slice("--reference-url=".length);
      options.references.push(value);
      if (arg === "--reference-url") index += 1;
      continue;
    }
    if (arg === "--template" || arg.startsWith("--template=")) {
      const value = arg === "--template"
        ? takeValue(argv, index, arg)
        : arg.slice("--template=".length);
      options.templates.push(value);
      if (arg === "--template") index += 1;
      continue;
    }
    fail(`unknown option: ${arg}`);
  }
  return options;
}

function printHelp() {
  console.log(
    "Usage: node init-design-synthesis.cjs --change-id <id> --problem <text> [--reference-url <url> ...] [--template <locator> ...] [--framework <name>] [--budget small|session|program] [--output DESIGN.md] [--project-root <path>]",
  );
}

function normalizeInputs(options) {
  const changeId = validateChangeId(options.changeId);
  const problem = validateProblem(options.problem);
  const projectRoot = resolveProjectRoot(options.projectRoot);
  if (!Object.hasOwn(BUDGET_THRESHOLDS, options.budget)) {
    fail("--budget must be small, session, or program");
  }
  if (typeof options.framework !== "string" || !options.framework.trim() || options.framework.length > 80) {
    fail("--framework must be a non-empty string of at most 80 characters");
  }
  const output = resolveOutputPath(projectRoot, options.output);
  const normalizedReferences = options.references.map((value) => normalizeHttpUrl(value, "reference URL"));
  if (new Set(normalizedReferences).size !== normalizedReferences.length) {
    fail("duplicate normalized reference URL");
  }
  const normalizedTemplates = options.templates.map(normalizeTemplateLocator);
  if (new Set(normalizedTemplates).size !== normalizedTemplates.length) {
    fail("duplicate normalized template locator");
  }
  const usedReferenceIds = new Set();
  const references = normalizedReferences.map((url) => ({
    id: stableId(new URL(url).hostname + new URL(url).pathname, "reference", usedReferenceIds),
    url,
    role: "reference-site",
  }));
  const usedTemplateIds = new Set();
  const templates = normalizedTemplates.map((locator) => ({
    id: stableId(locator, "template", usedTemplateIds),
    locator,
    role: "template",
  }));
  const mode = references.length && templates.length
    ? "hybrid"
    : references.length
      ? "reference-site"
      : templates.length
        ? "template-evidence"
        : "requirements-only";
  return {
    budget: options.budget,
    changeId,
    framework: options.framework.trim(),
    mode,
    output,
    problem,
    projectRoot,
    references,
    templates,
  };
}

function planningFiles(input) {
  const referenceLines = input.references.length
    ? input.references.map((item) => `- ${item.id}: ${item.url}`).join("\n")
    : "- None provided.";
  const templateLines = input.templates.length
    ? input.templates.map((item) => `- ${item.id}: ${item.locator} (inspiration only)`).join("\n")
    : "- None provided.";
  return {
    "proposal.md": `# Proposal: ${input.changeId}\n\n## Why\n\nThe project needs a requirements-driven reusable DESIGN.md before implementation.\n\n## Problem\n\n${input.problem}\n\n## Safety\n\nReference sites and templates are attributed evidence, not product authority or copy targets.`,
    "brief.md": `# Brief: ${input.changeId}\n\n## Problem\n\n${input.problem}\n\n## Framework\n\n${input.framework}\n\n## Reference Sites\n\n${referenceLines}\n\n## Template Evidence\n\n${templateLines}\n\n## Acceptance\n\n- Resolve material product ambiguity through grill-with-docs.\n- Assess scope before synthesis.\n- Generate a project-specific ${input.output.relative} with explicit source decisions.\n- Continue through implementation and normal design-pipeline QA.`,
    "directions.md": "# Directions\n\nProduce 2-3 distinct, product-specific directions after grill and evidence review. Record fit, risk, adopted evidence, rejected evidence, and the selected direction.",
    "design.md": "# Change Design\n\n## Requirements Map\n\nMap product requirements and workflows to design consequences.\n\n## Evidence Adoption Matrix\n\nRecord source, observed property, adopt/reject decision, product-specific reason, and target component/token.\n\n## Product Design Output\n\nLink the project DESIGN.md and explain how it maps into the target framework and component system.",
    "motion.md": "# Motion\n\nRecord motion only when the product needs it. Include purpose, trigger, timing, easing, interruption, performance, and reduced-motion behavior.",
    "tasks.md": "# Tasks\n\n- [ ] Complete grill-with-docs and save decision evidence.\n- [ ] Assess scope against the selected budget.\n- [ ] Link a real Wayfinder map when scope is oversized.\n- [ ] Produce and select product-specific design directions.\n- [ ] Write and validate the project DESIGN.md.\n- [ ] Map tokens and components into the existing framework.\n- [ ] Implement and run normal design-pipeline QA.",
    "qa.md": "# QA\n\nRecord DESIGN.md validation, source provenance, visual/UX/accessibility/motion/responsive/engineering gates, component-library checks, and final evidence.",
  };
}

function buildManifest(input, artifactRoot, now) {
  const finalChangeRoot = path.join(artifactRoot, input.changeId);
  const command = `/grill-with-docs ${input.problem}`;
  return {
    schema: "design-pipeline.design-synthesis.v1",
    changeId: input.changeId,
    status: "awaiting-input",
    stage: "grill-with-docs",
    initializedAt: now,
    updatedAt: now,
    artifactRoot: relativePath(input.projectRoot, finalChangeRoot),
    projectRoot: relativePath(finalChangeRoot, input.projectRoot),
    problem: input.problem,
    inputs: {
      mode: input.mode,
      framework: input.framework,
      references: input.references,
      templates: input.templates,
    },
    interaction: {
      mode: "human-in-loop",
      nextCommand: command,
      message: "Challenge the request against product and repository documentation before synthesis.",
    },
    scope: {
      budget: input.budget,
      threshold: BUDGET_THRESHOLDS[input.budget],
      status: "pending",
      score: null,
      surprise: false,
      counts: {
        surfaces: null,
        workflows: null,
        integrations: null,
        unknowns: null,
        decisions: null,
      },
    },
    wayfinder: {
      required: null,
      status: "not-evaluated",
      mapUrl: null,
    },
    output: {
      path: input.output.relative,
      status: "missing",
      sha256: null,
      validatedAt: null,
    },
    evidence: [],
  };
}

function requestMatches(manifest, input) {
  return (
    manifest.changeId === input.changeId &&
    manifest.problem === input.problem &&
    manifest.inputs.framework === input.framework &&
    manifest.scope.budget === input.budget &&
    manifest.output.path === input.output.relative &&
    JSON.stringify(manifest.inputs.references) === JSON.stringify(input.references) &&
    JSON.stringify(manifest.inputs.templates) === JSON.stringify(input.templates)
  );
}

function readExistingState(file, changeId) {
  if (!fs.existsSync(file)) return null;
  const state = readJson(file, "state.json");
  if (state.changeId && state.changeId !== changeId) fail("existing state changeId does not match");
  if (state.status === "complete" || state.status === "archived") {
    fail(`existing change ${changeId} is ${state.status} and cannot be extended`);
  }
  return state;
}

function mergeState(existing, manifest, now) {
  const manifestPath = `${manifest.artifactRoot}/design-synthesis.json`;
  const base = existing || {
    schema: "design-pipeline.state.v1",
    changeId: manifest.changeId,
    status: "in-progress",
    phase: "stage-1-brief",
    updatedAt: now,
    artifactRoot: manifest.artifactRoot,
    projectRoot: ".",
    surfaces: [],
    capabilities: { missing: [], fallbacks: [] },
    openSpec: {
      detected: manifest.artifactRoot.startsWith("openspec/") || manifest.artifactRoot.startsWith(".openspec/"),
      changeId: manifest.changeId,
      paths: [manifest.artifactRoot],
    },
    gbrain: { detected: false, syncPlanned: false, paths: [] },
    motion: {
      required: false,
      motionSpec: `${manifest.artifactRoot}/motion.md`,
      implementationLibrary: "unknown",
      reducedMotion: "pending",
    },
    qa: { status: "not-run", evidenceRoot: `${manifest.artifactRoot}/qa.md`, scores: {} },
    decisions: [],
    blockers: [],
    nextActions: [],
  };
  return {
    ...base,
    status: base.status === "planned" ? "in-progress" : base.status,
    phase: "stage-1-brief",
    updatedAt: now,
    surfaces: mergeUnique(base.surfaces, [manifest.output.path]),
    decisions: mergeUnique(base.decisions, [
      "Treat reference sites and DESIGN.md templates as attributed evidence, not product authority",
    ]),
    nextActions: mergeUnique(base.nextActions, [manifest.interaction.nextCommand]),
    designFoundation: {
      path: manifest.output.path,
      status: manifest.output.status === "validated" ? "ready" : "synthesis-required",
      sha256: manifest.output.sha256,
    },
    designSynthesis: {
      manifest: manifestPath,
      status: manifest.status,
      stage: manifest.stage,
      output: manifest.output.path,
    },
  };
}

function handoffSection(manifest) {
  return `<!-- DESIGN-PIPELINE:DESIGN-SYNTHESIS:START -->
## Requirements-Driven DESIGN.md Synthesis

- Manifest: \`${manifest.artifactRoot}/design-synthesis.json\`
- Status: ${manifest.status}
- Stage: ${manifest.stage}
- Product design output: \`${manifest.output.path}\`
- Change design: \`${manifest.artifactRoot}/design.md\`
- Input mode: ${manifest.inputs.mode}
- Scope budget: ${manifest.scope.budget} (${manifest.scope.threshold})
- Next: ${manifest.interaction.nextCommand}

Template and reference inputs are evidence only. Generate a product-specific DESIGN.md from the
problem, repository constraints, grill decisions, and recorded source decisions.
<!-- DESIGN-PIPELINE:DESIGN-SYNTHESIS:END -->`;
}

function populate(changeRoot, input, artifactRoot) {
  const now = nowIso();
  const files = planningFiles(input);
  for (const [relative, content] of Object.entries(files)) {
    writeIfMissing(path.join(changeRoot, relative), content);
  }
  const manifest = buildManifest(input, artifactRoot, now);
  const statePath = path.join(changeRoot, "state.json");
  const existingState = readExistingState(statePath, input.changeId);
  writeJson(path.join(changeRoot, "design-synthesis.json"), manifest);
  writeJson(statePath, mergeState(existingState, manifest, now));
  appendEvent(path.join(changeRoot, "events.jsonl"), {
    ts: now,
    phase: "stage-1-brief",
    type: "interaction-required",
    summary: "Initialized requirements-driven DESIGN.md synthesis and requested grill-with-docs.",
    files: [`${manifest.artifactRoot}/design-synthesis.json`],
    evidence: [],
    nextActions: [manifest.interaction.nextCommand],
  });
  updateHandoff(path.join(changeRoot, "handoff.md"), handoffSection(manifest));
  return manifest;
}

function initialize(input) {
  const artifactRoot = findArtifactRoot(input.projectRoot);
  const changeRoot = path.join(artifactRoot, input.changeId);
  const manifestPath = path.join(changeRoot, "design-synthesis.json");
  if (fs.existsSync(manifestPath)) {
    const manifest = validateManifest(readJson(manifestPath, "design-synthesis.json"));
    if (!requestMatches(manifest, input)) {
      fail(`change ${input.changeId} is already initialized with a different synthesis request`);
    }
    console.log(`Design-synthesis change ${input.changeId} is already initialized; resume from state.json.`);
    console.log(manifest.interaction.nextCommand);
    return;
  }

  if (fs.existsSync(changeRoot)) {
    const manifest = populate(changeRoot, input, artifactRoot);
    console.log(`Initialized design-synthesis change ${input.changeId} at ${changeRoot}`);
    console.log(manifest.interaction.nextCommand);
    return;
  }

  fs.mkdirSync(artifactRoot, { recursive: true });
  const stagingRoot = path.join(
    artifactRoot,
    `.${input.changeId}.tmp-${process.pid}-${crypto.randomBytes(4).toString("hex")}`,
  );
  try {
    fs.mkdirSync(stagingRoot);
    const manifest = populate(stagingRoot, input, artifactRoot);
    fs.renameSync(stagingRoot, changeRoot);
    console.log(`Initialized design-synthesis change ${input.changeId} at ${changeRoot}`);
    console.log(manifest.interaction.nextCommand);
  } catch (error) {
    fs.rmSync(stagingRoot, { recursive: true, force: true });
    throw error;
  }
}

try {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) printHelp();
  else initialize(normalizeInputs(options));
} catch (error) {
  console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}

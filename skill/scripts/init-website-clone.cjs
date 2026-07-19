#!/usr/bin/env node

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const CHANGE_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MANIFEST_STATUSES = [
  "planned",
  "in-progress",
  "blocked",
  "fidelity-limited",
  "needs-review",
  "complete",
];
const TARGET_PHASES = [
  "preflight",
  "reconnaissance",
  "foundation",
  "component-spec-and-build",
  "assembly",
  "visual-and-interaction-qa",
  "complete",
];
const OPEN_SPEC_ROOTS = [
  ["openspec", "changes"],
  [".openspec", "changes"],
  ["spec", "changes"],
  ["docs", "design"],
  ["design", "changes"],
];

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
    projectRoot: process.cwd(),
    primaryUrls: [],
    referenceUrls: [],
    fidelity: "exact",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }
    if (arg === "--project-root") {
      options.projectRoot = takeValue(argv, index, arg);
      index += 1;
      continue;
    }
    if (arg.startsWith("--project-root=")) {
      options.projectRoot = arg.slice("--project-root=".length);
      continue;
    }
    if (arg === "--change-id") {
      options.changeId = takeValue(argv, index, arg);
      index += 1;
      continue;
    }
    if (arg.startsWith("--change-id=")) {
      options.changeId = arg.slice("--change-id=".length);
      continue;
    }
    if (arg === "--url") {
      options.primaryUrls.push(takeValue(argv, index, arg));
      index += 1;
      continue;
    }
    if (arg.startsWith("--url=")) {
      options.primaryUrls.push(arg.slice("--url=".length));
      continue;
    }
    if (arg === "--reference-url") {
      options.referenceUrls.push(takeValue(argv, index, arg));
      index += 1;
      continue;
    }
    if (arg.startsWith("--reference-url=")) {
      options.referenceUrls.push(arg.slice("--reference-url=".length));
      continue;
    }
    if (arg === "--fidelity") {
      options.fidelity = takeValue(argv, index, arg);
      index += 1;
      continue;
    }
    if (arg.startsWith("--fidelity=")) {
      options.fidelity = arg.slice("--fidelity=".length);
      continue;
    }
    fail(`unknown option: ${arg}`);
  }

  return options;
}

function printHelp() {
  console.log(
    "Usage: node init-website-clone.cjs --change-id <id> --url <url> [--reference-url <url> ...] [--fidelity exact|adaptive] [--project-root <path>]",
  );
}

function normalizeUrl(raw) {
  let url;
  try {
    url = new URL(raw);
  } catch {
    fail(`invalid URL: ${raw}`);
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    fail(`unsupported URL protocol: ${url.protocol}`);
  }
  if (url.username || url.password) {
    fail("URLs containing credentials are not allowed");
  }

  url.hash = "";
  return url.toString();
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
}

function targetIdBase(urlText) {
  const url = new URL(urlText);
  const pathPart = url.pathname === "/" ? "" : url.pathname;
  return slugify(`${url.hostname}${pathPart}`) || "target";
}

function targetIdFor(urlText, collidingBases, usedIds) {
  const base = targetIdBase(urlText);
  let id = base;
  if (collidingBases.has(base) || usedIds.has(id)) {
    const suffix = crypto.createHash("sha256").update(urlText).digest("hex").slice(0, 8);
    id = `${id.slice(0, 63)}-${suffix}`;
  }
  const suffixedId = id;
  let counter = 1;
  while (usedIds.has(id)) {
    id = `${suffixedId.slice(0, 63)}-${counter}`;
    counter += 1;
  }
  usedIds.add(id);
  return id;
}

function validateChangeId(changeId) {
  if (!changeId) fail("--change-id is required");
  if (!CHANGE_ID_PATTERN.test(changeId) || changeId.length > 80) {
    fail("change id must be lowercase hyphen-case and at most 80 characters");
  }
}

function validateFidelity(fidelity) {
  if (fidelity !== "exact" && fidelity !== "adaptive") {
    fail("--fidelity must be exact or adaptive");
  }
}

function resolveExistingProjectRoot(rawProjectRoot) {
  const projectRoot = path.resolve(rawProjectRoot);
  if (!fs.existsSync(projectRoot) || !fs.statSync(projectRoot).isDirectory()) {
    fail(`project root does not exist: ${projectRoot}`);
  }
  return projectRoot;
}

function normalizeTargets(primaryUrls = [], referenceUrls = []) {
  return [
    ...primaryUrls.map((url) => ({ url: normalizeUrl(url), role: "primary" })),
    ...referenceUrls.map((url) => ({ url: normalizeUrl(url), role: "reference" })),
  ];
}

function rejectDuplicateTargets(targets) {
  const seen = new Set();
  for (const target of targets) {
    if (seen.has(target.url)) fail(`duplicate normalized URL: ${target.url}`);
    seen.add(target.url);
  }
}

function findCollidingBases(targets) {
  const baseCounts = new Map();
  for (const target of targets) {
    const base = targetIdBase(target.url);
    baseCounts.set(base, (baseCounts.get(base) || 0) + 1);
  }
  return new Set(
    [...baseCounts.entries()].filter(([, count]) => count > 1).map(([base]) => base),
  );
}

function buildTargets(normalizedTargets) {
  const collidingBases = findCollidingBases(normalizedTargets);
  const usedIds = new Set();
  return normalizedTargets.map(({ url, role }) => {
    const id = targetIdFor(url, collidingBases, usedIds);
    return {
      id,
      url,
      role,
      status: "planned",
      phase: "preflight",
      artifactRoot: `targets/${id}`,
    };
  });
}

function validateOptions(options) {
  if (options.help) return null;
  validateChangeId(options.changeId);
  const primaryUrls = options.primaryUrls ?? [];
  const referenceUrls = options.referenceUrls ?? [];
  if (primaryUrls.length === 0) fail("at least one primary --url is required");
  validateFidelity(options.fidelity);

  const projectRoot = resolveExistingProjectRoot(options.projectRoot);
  const normalizedTargets = normalizeTargets(primaryUrls, referenceUrls);
  rejectDuplicateTargets(normalizedTargets);
  const targets = buildTargets(normalizedTargets);
  return { changeId: options.changeId, projectRoot, targets, fidelity: options.fidelity };
}

function findArtifactRoot(projectRoot) {
  for (const parts of OPEN_SPEC_ROOTS) {
    const candidate = path.join(projectRoot, ...parts);
    if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
      return candidate;
    }
  }
  return path.join(projectRoot, "design", "changes");
}

function writeFile(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content.endsWith("\n") ? content : `${content}\n`, "utf8");
}

function writeJson(file, value) {
  writeFile(file, JSON.stringify(value, null, 2));
}

function writeIfMissing(file, content) {
  if (!fs.existsSync(file)) writeFile(file, content);
}

function relativeFromProject(projectRoot, artifactRoot, changeId) {
  return path.relative(projectRoot, path.join(artifactRoot, changeId)).replaceAll("\\", "/");
}

function planningFiles(changeId, targets) {
  const targetList = targets
    .map((target) => `- ${target.id} (${target.role}): ${target.url}`)
    .join("\n");
  return {
    "proposal.md": `# Proposal: ${changeId}\n\n## Why\n\nReconstruct the authorized target website surfaces through the design-pipeline website-cloning module.\n\n## Targets\n\n${targetList}\n\n## Non-Goals\n\n- Do not reproduce protected backend behavior, authentication, or private data by default.\n- Do not replace the target project's established framework without an explicit requirement.`,
    "brief.md": `# Brief: ${changeId}\n\n## Goal\n\nCreate a high-fidelity, maintainable reconstruction of the target website surfaces.\n\n## Targets\n\n${targetList}\n\n## Constraints\n\n- Confirm ownership, authorization, licensing, and applicable terms.\n- Capture real content and assets only when their use is permitted.\n- Preserve accessibility, responsive behavior, and reduced-motion support.`,
    "directions.md": "# Directions\n\nDocument fidelity and adaptation directions after reconnaissance. Select one direction before implementation.",
    "design.md": "# Design\n\nRecord topology, tokens, component contracts, target-project mappings, responsive behavior, accessibility, and implementation decisions here.",
    "motion.md": "# Motion\n\nRecord target motion only when it is observable and purposeful. Include triggers, states, timing, easing, interruption behavior, performance budget, and reduced-motion fallback.",
    "tasks.md": "# Tasks\n\n- [ ] Verify authorization and execution capabilities.\n- [ ] Capture reconnaissance and interaction evidence for every target.\n- [ ] Establish target-project foundation and assets.\n- [ ] Write one complete spec before each bounded builder slice.\n- [ ] Assemble and run the target project's build checks.\n- [ ] Run visual, interaction, accessibility, motion, responsive, and headless QA.",
    "qa.md": "# QA\n\nRecord self-check, static checks, desktop/mobile evidence, interaction checks, accessibility, motion, responsive behavior, engineering fit, headless state, scorecard, and final verdict.",
  };
}

function targetResearchFiles(target) {
  const heading = `${target.id} — ${target.url}`;
  return {
    "research/behaviors.md": `# Behaviors: ${heading}\n\nRecord scroll, click, hover, time-driven, responsive, loading, empty, and error states. Identify the interaction model before implementation.`,
    "research/page-topology.md": `# Page Topology: ${heading}\n\nMap every section in visual order, including fixed/sticky layers, dependencies, and interaction model.`,
    "research/design-tokens.md": `# Design Tokens: ${heading}\n\nRecord exact colors, typography, spacing, radii, elevation, breakpoints, and target-project token mappings.`,
    "research/component-inventory.md": `# Component Inventory: ${heading}\n\nList components, variants, states, responsive behavior, interactions, motion, content, and assets.`,
  };
}

function buildState(changeId, artifactRoot, targets, now) {
  return {
    schema: "design-pipeline.state.v1",
    changeId,
    status: "planned",
    phase: "stage-0-repo-read",
    updatedAt: now,
    artifactRoot,
    projectRoot: ".",
    surfaces: targets.map((target) => target.id),
    capabilities: { missing: [], fallbacks: [] },
    openSpec: {
      detected: artifactRoot.startsWith("openspec/") || artifactRoot.startsWith(".openspec/"),
      changeId,
      paths: [artifactRoot],
    },
    gbrain: { detected: false, syncPlanned: false, paths: [] },
    motion: {
      required: false,
      motionSpec: `${artifactRoot}/motion.md`,
      implementationLibrary: "unknown",
      reducedMotion: "pending",
    },
    qa: { status: "not-run", evidenceRoot: `${artifactRoot}/qa.md`, scores: {} },
    decisions: ["Use isolated evidence and research artifacts for every normalized target URL"],
    blockers: [],
    nextActions: [
      "Verify authorization and browser capabilities for every target",
      `Capture reconnaissance evidence for ${targets[0].id}`,
    ],
  };
}

function buildHandoff(changeId, artifactRoot, targets, now) {
  return `# Handoff\n\n## Current State\n\n- Change id: \`${changeId}\`\n- Status: planned\n- Phase: stage 0 repo read\n- Last updated: ${now}\n\n## Goal\n\nReconstruct the authorized target website surfaces with auditable extraction and design-pipeline quality gates.\n\n## Targets\n\n${targets.map((target) => `- \`${target.id}\`: ${target.url}`).join("\n")}\n\n## Artifacts\n\n- Root: \`${artifactRoot}\`\n- Manifest: \`${artifactRoot}/website-cloning.json\`\n- State: \`${artifactRoot}/state.json\`\n- Events: \`${artifactRoot}/events.jsonl\`\n\n## Decisions\n\n- Keep each target's research, evidence, and assets isolated.\n- Determine interaction models before implementation.\n\n## Blockers\n\nNone recorded.\n\n## Next Actions\n\n1. Verify authorization and browser capabilities for every target.\n2. Capture reconnaissance evidence for \`${targets[0].id}\`.\n`;
}

function mergeUnique(existing, additions) {
  return [...new Set([...(Array.isArray(existing) ? existing : []), ...additions])];
}

function readExistingState(statePath, changeId) {
  if (!fs.existsSync(statePath)) return null;
  let state;
  try {
    state = JSON.parse(fs.readFileSync(statePath, "utf8"));
  } catch {
    fail(`existing state is invalid JSON: ${statePath}`);
  }
  if (state.changeId && state.changeId !== changeId) {
    fail(`existing state changeId does not match ${changeId}`);
  }
  return state;
}

function mergeState(existingState, changeId, relativeRoot, targets, now) {
  if (!existingState) return buildState(changeId, relativeRoot, targets, now);
  const nextActions = [
    "Verify authorization and browser capabilities for every target",
    `Capture reconnaissance evidence for ${targets[0].id}`,
  ];
  return {
    ...existingState,
    updatedAt: now,
    surfaces: mergeUnique(existingState.surfaces, targets.map((target) => target.id)),
    decisions: mergeUnique(existingState.decisions, [
      "Use isolated evidence and research artifacts for every normalized target URL",
    ]),
    nextActions: mergeUnique(existingState.nextActions, nextActions),
  };
}

function appendEvent(eventsPath, event) {
  const line = JSON.stringify(event);
  if (!fs.existsSync(eventsPath)) {
    writeFile(eventsPath, line);
    return;
  }
  const existing = fs.readFileSync(eventsPath, "utf8");
  const separator = existing.length > 0 && !existing.endsWith("\n") ? "\n" : "";
  fs.appendFileSync(eventsPath, `${separator}${line}\n`, "utf8");
}

function mergeHandoff(handoffPath, changeId, artifactRoot, targets, now) {
  if (!fs.existsSync(handoffPath)) {
    writeFile(handoffPath, buildHandoff(changeId, artifactRoot, targets, now));
    return;
  }
  const marker = "<!-- design-pipeline:website-cloning -->";
  const existing = fs.readFileSync(handoffPath, "utf8");
  if (existing.includes(marker)) return;
  const section = `${marker}\n\n## Website Cloning\n\n- Manifest: \`${artifactRoot}/website-cloning.json\`\n- Targets: ${targets.map((target) => `\`${target.id}\` (${target.role})`).join(", ")}\n- Next: verify authorization and Browser/Builder/Evidence port capabilities, then capture \`${targets[0].id}\`.\n- Added: ${now}\n`;
  writeFile(handoffPath, `${existing.trimEnd()}\n\n${section}`);
}

function populateChange(changeRoot, projectRoot, artifactRoot, changeId, targets, fidelityMode) {
  const now = new Date().toISOString();
  const relativeRoot = relativeFromProject(projectRoot, artifactRoot, changeId);
  const statePath = path.join(changeRoot, "state.json");
  const existingState = readExistingState(statePath, changeId);
  if (existingState?.status === "complete") {
    fail(`existing change ${changeId} is complete and cannot be extended`);
  }

  for (const [relative, content] of Object.entries(planningFiles(changeId, targets))) {
    writeIfMissing(path.join(changeRoot, relative), content);
  }

  const manifest = {
    schema: "design-pipeline.website-cloning.v1",
    changeId,
    status: "planned",
    initializedAt: now,
    artifactRoot: relativeRoot,
    targets,
    fidelity: {
      mode: fidelityMode,
      comparisonPolicy:
        "Compare each primary target against its own normalized capture; reference targets supply constraints and are not assumed to be direct pixel baselines.",
      viewports: [
        { width: 1440, height: 900 },
        { width: 768, height: 1024 },
        { width: 390, height: 844 },
      ],
      gates:
        fidelityMode === "exact"
          ? {
              textCoverage: 1,
              assetCoverage: 1,
              interactionCoverage: 1,
              maxPixelDifferenceRatio: 0.001,
              maxLayoutDeltaPx: 1,
            }
          : {
              textCoverage: 1,
              assetCoverage: 1,
              interactionCoverage: 1,
              maxPixelDifferenceRatio: null,
              maxLayoutDeltaPx: null,
            },
    },
    referenceMappings: [],
    ports: {
      browser: {
        status: "unresolved",
        adapter: null,
        availableCapabilities: [],
        lastProbe: null,
        requiredCapabilities: [
          "navigate",
          "report-final-url-status",
          "set-viewport",
          "set-device-scale",
          "screenshot",
          "evaluate",
          "scroll",
          "click",
          "hover",
          "focus",
          "type",
          "resize",
          "wait-for-fonts",
          "wait-for-page-ready",
          "record-environment",
          "record-provenance",
        ],
      },
      builder: {
        status: "unresolved",
        adapter: null,
        availableCapabilities: [],
        lastProbe: null,
        requiredCapabilities: [
          "read-spec",
          "read-evidence",
          "write-files",
          "run-project-checks",
        ],
      },
      evidence: {
        status: "unresolved",
        adapter: null,
        availableCapabilities: [],
        lastProbe: null,
        requiredCapabilities: [
          "render-reference",
          "render-implementation",
          ...(fidelityMode === "exact" ? ["pixel-diff", "layout-diff"] : []),
          "content-diff",
          "responsive-diff",
          "state-diff",
          "interaction-replay",
          "mapped-interaction-replay",
          "record-evidence-provenance",
        ],
      },
    },
    verification: {
      status: "not-run",
      evaluatedAt: null,
      reportPath: null,
      reasons: [],
    },
    protocol: [
      "preflight",
      "reconnaissance",
      "foundation",
      "component-spec-and-build",
      "assembly",
      "visual-and-interaction-qa",
    ],
  };
  writeJson(path.join(changeRoot, "website-cloning.json"), manifest);
  writeJson(statePath, mergeState(existingState, changeId, relativeRoot, targets, now));
  appendEvent(path.join(changeRoot, "events.jsonl"), {
      ts: now,
      phase: existingState?.phase || "stage-0-repo-read",
      type: "artifact-created",
      summary: `Initialized website-cloning run for ${targets.length} target(s).`,
      files: [`${relativeRoot}/website-cloning.json`],
      evidence: [],
      nextActions: ["Verify authorization and browser capabilities for every target"],
    });
  mergeHandoff(path.join(changeRoot, "handoff.md"), changeId, relativeRoot, targets, now);

  for (const target of targets) {
    const targetRoot = path.join(changeRoot, "targets", target.id);
    for (const [relative, content] of Object.entries(targetResearchFiles(target))) {
      writeIfMissing(path.join(targetRoot, relative), content);
    }
    const assetManifestPath = path.join(targetRoot, "assets", "manifest.json");
    if (!fs.existsSync(assetManifestPath)) {
      writeJson(assetManifestPath, {
        schema: "design-pipeline.website-cloning.assets.v1",
        targetId: target.id,
        assets: [],
      });
    }
    fs.mkdirSync(path.join(targetRoot, "research", "components"), { recursive: true });
    fs.mkdirSync(path.join(targetRoot, "evidence", "screenshots"), { recursive: true });
    fs.mkdirSync(path.join(targetRoot, "evidence", "visual-diff"), { recursive: true });
    fs.mkdirSync(path.join(targetRoot, "evidence", "interactions"), { recursive: true });
  }
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.length > 0;
}

function isObject(value) {
  return value !== null && typeof value === "object";
}

function isStringArray(value, allowEmpty = true) {
  return (
    Array.isArray(value) &&
    (allowEmpty || value.length > 0) &&
    value.every((item) => isNonEmptyString(item))
  );
}

function validProbe(probe) {
  if (probe === null) return true;
  if (!isObject(probe)) return false;
  return [
    isNonEmptyString(probe.at),
    typeof probe.ok === "boolean",
    typeof probe.message === "string",
  ].every(Boolean);
}

function validReadyPort(port) {
  if (port.status !== "ready") return true;
  return [isNonEmptyString(port.adapter), port.lastProbe?.ok === true].every(Boolean);
}

function validPort(port) {
  if (!isObject(port)) return false;
  if (!["unresolved", "ready", "blocked", "degraded"].includes(port.status)) return false;
  if (port.adapter !== null && !isNonEmptyString(port.adapter)) return false;
  if (!isStringArray(port.requiredCapabilities, false)) return false;
  if (!isStringArray(port.availableCapabilities)) return false;
  return validProbe(port.lastProbe) && validReadyPort(port);
}

function validTarget(target) {
  return (
    target &&
    typeof target === "object" &&
    CHANGE_ID_PATTERN.test(target.id) &&
    isNonEmptyString(target.url) &&
    ["primary", "reference"].includes(target.role) &&
    MANIFEST_STATUSES.includes(target.status) &&
    TARGET_PHASES.includes(target.phase) &&
    target.artifactRoot === `targets/${target.id}`
  );
}

function validFidelity(fidelity, fidelityMode) {
  if (!isObject(fidelity)) return false;
  if (!Array.isArray(fidelity.viewports)) return false;
  if (!isObject(fidelity.gates)) return false;
  return [
    fidelity.mode === fidelityMode,
    isNonEmptyString(fidelity.comparisonPolicy),
    fidelity.viewports.length > 0,
    fidelity.viewports.every(validViewport),
    validCoverageGates(fidelity.gates),
    validOptionalRatio(fidelity.gates.maxPixelDifferenceRatio),
    validOptionalNonnegative(fidelity.gates.maxLayoutDeltaPx),
  ].every(Boolean);
}

function validViewport(viewport) {
  return [
    Number.isInteger(viewport?.width),
    viewport?.width > 0,
    Number.isInteger(viewport?.height),
    viewport?.height > 0,
  ].every(Boolean);
}

function validCoverageGates(gates) {
  return ["textCoverage", "assetCoverage", "interactionCoverage"].every((name) =>
    validRatio(gates[name]),
  );
}

function validRatio(value) {
  return [typeof value === "number", value >= 0, value <= 1].every(Boolean);
}

function validOptionalRatio(value) {
  return value === null || validRatio(value);
}

function validOptionalNonnegative(value) {
  return value === null || [typeof value === "number", value >= 0].every(Boolean);
}

function validVerification(verification) {
  return (
    verification &&
    typeof verification === "object" &&
    ["not-run", "passed", "failed", "blocked"].includes(verification.status) &&
    (verification.evaluatedAt === null || isNonEmptyString(verification.evaluatedAt)) &&
    (verification.reportPath === null || isNonEmptyString(verification.reportPath)) &&
    isStringArray(verification.reasons)
  );
}

function validManifestHeader(manifest, changeId, artifactRoot, fidelityMode) {
  if (!isObject(manifest)) return false;
  return [
    manifest.schema === "design-pipeline.website-cloning.v1",
    manifest.changeId === changeId,
    manifest.artifactRoot === artifactRoot,
    isNonEmptyString(manifest.initializedAt),
    MANIFEST_STATUSES.includes(manifest.status),
    validFidelity(manifest.fidelity, fidelityMode),
    Array.isArray(manifest.referenceMappings),
    validVerification(manifest.verification),
    isStringArray(manifest.protocol, false),
  ].every(Boolean);
}

function validManifestPorts(ports) {
  return ["browser", "builder", "evidence"].every((name) => validPort(ports?.[name]));
}

function validManifestTargets(manifestTargets, targets) {
  if (!Array.isArray(manifestTargets)) return false;
  if (manifestTargets.length !== targets.length) return false;
  const ids = new Set(manifestTargets.map((target) => target?.id));
  if (ids.size !== manifestTargets.length) return false;
  if (!manifestTargets.every(validTarget)) return false;

  const actualBySource = new Map(
    manifestTargets.map((target) => [`${target.role}\u0000${target.url}`, target]),
  );
  return targets.every((expected) => {
    const actual = actualBySource.get(`${expected.role}\u0000${expected.url}`);
    return actual?.id === expected.id && actual.artifactRoot === expected.artifactRoot;
  });
}

function validCompletedManifest(manifest) {
  if (manifest.status !== "complete") return true;
  return [
    ["browser", "builder", "evidence"].every(
      (name) => manifest.ports[name].status === "ready",
    ),
    manifest.targets.every(
      (target) => target.status === "complete" && target.phase === "complete",
    ),
    manifest.verification.status === "passed",
    isNonEmptyString(manifest.verification.reportPath),
  ].every(Boolean);
}

function manifestContractMatches(manifest, changeId, artifactRoot, targets, fidelityMode) {
  if (!validManifestHeader(manifest, changeId, artifactRoot, fidelityMode)) return false;
  if (!validManifestPorts(manifest.ports)) return false;
  if (!validManifestTargets(manifest.targets, targets)) return false;
  return validCompletedManifest(manifest);
}

function existingRunMatches(manifestPath, changeId, artifactRoot, targets, fidelityMode) {
  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  } catch {
    fail(`existing website-cloning manifest is invalid: ${manifestPath}`);
  }

  return manifestContractMatches(manifest, changeId, artifactRoot, targets, fidelityMode);
}

function initialize(validated) {
  const { changeId, projectRoot, targets, fidelity } = validated;
  const artifactRoot = findArtifactRoot(projectRoot);
  const changeRoot = path.join(artifactRoot, changeId);
  const manifestPath = path.join(changeRoot, "website-cloning.json");
  const relativeRoot = relativeFromProject(projectRoot, artifactRoot, changeId);

  if (fs.existsSync(manifestPath)) {
    if (!existingRunMatches(manifestPath, changeId, relativeRoot, targets, fidelity)) {
      fail(`change ${changeId} is already initialized with a different target set`);
    }
    console.log(`Website-cloning change ${changeId} is already initialized; resume from state.json.`);
    return;
  }

  if (fs.existsSync(changeRoot)) {
    populateChange(changeRoot, projectRoot, artifactRoot, changeId, targets, fidelity);
  } else {
    fs.mkdirSync(artifactRoot, { recursive: true });
    const stagingRoot = path.join(
      artifactRoot,
      `.${changeId}.tmp-${process.pid}-${crypto.randomBytes(4).toString("hex")}`,
    );
    try {
      fs.mkdirSync(stagingRoot, { recursive: false });
      populateChange(stagingRoot, projectRoot, artifactRoot, changeId, targets, fidelity);
      fs.renameSync(stagingRoot, changeRoot);
    } catch (error) {
      fs.rmSync(stagingRoot, { recursive: true, force: true });
      throw error;
    }
  }

  console.log(`Initialized website-cloning change ${changeId} at ${changeRoot}`);
  console.log(`Targets: ${targets.map((target) => target.id).join(", ")}`);
}

try {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
  } else {
    initialize(validateOptions(options));
  }
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Error: ${message}`);
  process.exitCode = 1;
}

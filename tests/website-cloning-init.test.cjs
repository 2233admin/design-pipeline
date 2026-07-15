const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const repoRoot = path.resolve(__dirname, "..");
const initializer = path.join(repoRoot, "skill", "scripts", "init-website-clone.cjs");
const evaluator = path.join(repoRoot, "skill", "scripts", "evaluate-website-clone.cjs");

function makeProject() {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "design-pipeline-clone-"));
  fs.mkdirSync(path.join(projectRoot, "openspec", "changes"), { recursive: true });
  return projectRoot;
}

function run(projectRoot, ...args) {
  return spawnSync(
    process.execPath,
    [initializer, "--project-root", projectRoot, ...args],
    { encoding: "utf8" },
  );
}

function evaluate(changeRoot, evidencePath) {
  const args = [evaluator, "--change-root", changeRoot];
  if (evidencePath) args.push("--evidence", evidencePath);
  return spawnSync(process.execPath, args, { encoding: "utf8" });
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

test("initializes a resumable website-cloning change from one URL", () => {
  const projectRoot = makeProject();
  const result = run(
    projectRoot,
    "--change-id",
    "clone-example",
    "--url",
    "https://Example.com/#hero",
  );

  assert.equal(result.status, 0, result.stderr);

  const changeRoot = path.join(projectRoot, "openspec", "changes", "clone-example");
  const manifest = readJson(path.join(changeRoot, "website-cloning.json"));
  const state = readJson(path.join(changeRoot, "state.json"));
  const schema = readJson(
    path.join(repoRoot, "skill", "references", "website-cloning-manifest.schema.json"),
  );

  assert.equal(manifest.schema, "design-pipeline.website-cloning.v1");
  assert.equal(manifest.changeId, "clone-example");
  assert.equal(manifest.targets.length, 1);
  assert.deepEqual(manifest.targets[0], {
    id: "example-com",
    url: "https://example.com/",
    role: "primary",
    status: "planned",
    phase: "preflight",
    artifactRoot: "targets/example-com",
  });
  assert.equal(manifest.fidelity.mode, "exact");
  assert.equal(manifest.fidelity.gates.textCoverage, 1);
  assert.equal(manifest.fidelity.gates.assetCoverage, 1);
  assert.equal(manifest.fidelity.gates.interactionCoverage, 1);
  assert.equal(manifest.ports.browser.status, "unresolved");
  assert.equal(manifest.ports.builder.status, "unresolved");
  assert.equal(manifest.ports.evidence.status, "unresolved");
  for (const property of schema.required) {
    assert.ok(Object.hasOwn(manifest, property), `manifest misses schema property ${property}`);
  }
  for (const port of Object.values(manifest.ports)) {
    for (const property of schema.$defs.port.required) {
      assert.ok(Object.hasOwn(port, property), `port misses schema property ${property}`);
    }
  }
  assert.equal(state.schema, "design-pipeline.state.v1");
  assert.equal(state.changeId, "clone-example");
  assert.equal(state.status, "planned");
  assert.equal(typeof state.motion.required, "boolean");
  assert.deepEqual(state.nextActions, [
    "Verify authorization and browser capabilities for every target",
    "Capture reconnaissance evidence for example-com",
  ]);

  for (const relative of [
    "proposal.md",
    "brief.md",
    "directions.md",
    "design.md",
    "motion.md",
    "tasks.md",
    "qa.md",
    "events.jsonl",
    "handoff.md",
    "targets/example-com/research/behaviors.md",
    "targets/example-com/research/page-topology.md",
    "targets/example-com/research/design-tokens.md",
    "targets/example-com/research/component-inventory.md",
    "targets/example-com/assets/manifest.json",
  ]) {
    assert.ok(fs.existsSync(path.join(changeRoot, relative)), `missing ${relative}`);
  }

  for (const relative of [
    "targets/example-com/research/components",
    "targets/example-com/evidence/screenshots",
    "targets/example-com/evidence/visual-diff",
    "targets/example-com/evidence/interactions",
  ]) {
    assert.ok(fs.statSync(path.join(changeRoot, relative)).isDirectory());
  }
});

test("isolates primary and reference targets with stable ids", () => {
  const projectRoot = makeProject();
  const result = run(
    projectRoot,
    "--change-id",
    "compare-sites",
    "--url",
    "https://example.com/pricing",
    "--reference-url=https://docs.example.org/guide/",
  );

  assert.equal(result.status, 0, result.stderr);
  const changeRoot = path.join(projectRoot, "openspec", "changes", "compare-sites");
  const manifest = readJson(path.join(changeRoot, "website-cloning.json"));

  assert.deepEqual(
    manifest.targets.map(({ id, url, role }) => ({ id, url, role })),
    [
      {
        id: "example-com-pricing",
        url: "https://example.com/pricing",
        role: "primary",
      },
      {
        id: "docs-example-org-guide",
        url: "https://docs.example.org/guide/",
        role: "reference",
      },
    ],
  );
  for (const target of manifest.targets) {
    assert.ok(fs.existsSync(path.join(changeRoot, target.artifactRoot, "research")));
  }
});

test("rejects invalid input atomically", () => {
  for (const args of [
    ["--change-id", "../escape", "--url", "https://example.com"],
    ["--change-id", "bad-url", "--url", "file:///etc/passwd"],
    ["--change-id", "missing-url"],
    ["--change-id", "reference-only", "--reference-url", "https://example.com"],
  ]) {
    const projectRoot = makeProject();
    const result = run(projectRoot, ...args);
    assert.notEqual(result.status, 0);
    assert.equal(fs.readdirSync(path.join(projectRoot, "openspec", "changes")).length, 0);
  }
});

test("rejects duplicate normalized URLs without partial output", () => {
  const projectRoot = makeProject();
  const result = run(
    projectRoot,
    "--change-id",
    "duplicates",
    "--url",
    "https://example.com/#one",
    "--reference-url",
    "https://EXAMPLE.com/#two",
  );

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /duplicate/i);
  assert.equal(fs.readdirSync(path.join(projectRoot, "openspec", "changes")).length, 0);
});

test("rerunning the same command resumes without rewriting state history", () => {
  const projectRoot = makeProject();
  const args = [
    "--change-id",
    "resume-example",
    "--url",
    "https://example.com",
  ];

  const first = run(projectRoot, ...args);
  assert.equal(first.status, 0, first.stderr);

  const changeRoot = path.join(projectRoot, "openspec", "changes", "resume-example");
  const manifestPath = path.join(changeRoot, "website-cloning.json");
  const statePath = path.join(changeRoot, "state.json");
  const eventsPath = path.join(changeRoot, "events.jsonl");
  const before = {
    manifest: fs.readFileSync(manifestPath, "utf8"),
    state: fs.readFileSync(statePath, "utf8"),
    events: fs.readFileSync(eventsPath, "utf8"),
  };

  const second = run(projectRoot, ...args);
  assert.equal(second.status, 0, second.stderr);
  assert.match(second.stdout, /already initialized/i);
  assert.equal(fs.readFileSync(manifestPath, "utf8"), before.manifest);
  assert.equal(fs.readFileSync(statePath, "utf8"), before.state);
  assert.equal(fs.readFileSync(eventsPath, "utf8"), before.events);
});

test("augments an existing OpenSpec change without discarding headless history", () => {
  const projectRoot = makeProject();
  const changeRoot = path.join(projectRoot, "openspec", "changes", "existing-change");
  fs.mkdirSync(changeRoot, { recursive: true });
  const originalState = {
    schema: "design-pipeline.state.v1",
    changeId: "existing-change",
    status: "in-progress",
    phase: "stage-3-design-spec",
    updatedAt: "2026-01-01T00:00:00.000Z",
    artifactRoot: "openspec/changes/existing-change",
    projectRoot: ".",
    surfaces: ["existing-surface"],
    capabilities: { missing: [], fallbacks: [] },
    openSpec: {
      detected: true,
      changeId: "existing-change",
      paths: ["openspec/changes/existing-change"],
    },
    gbrain: { detected: false, syncPlanned: false, paths: [] },
    motion: {
      required: false,
      motionSpec: "motion.md",
      implementationLibrary: "none",
      reducedMotion: "not-applicable",
    },
    qa: { status: "not-run", evidenceRoot: "qa.md", scores: {} },
    decisions: ["keep-this-decision"],
    blockers: [],
    nextActions: ["keep-this-action"],
  };
  fs.writeFileSync(
    path.join(changeRoot, "state.json"),
    `${JSON.stringify(originalState, null, 2)}\n`,
  );
  const originalEvent =
    '{"ts":"2026-01-01T00:00:00.000Z","phase":"stage-3-design-spec","type":"decision","summary":"keep this event","files":[],"evidence":[],"nextActions":[]}\n';
  fs.writeFileSync(path.join(changeRoot, "events.jsonl"), originalEvent);
  fs.writeFileSync(path.join(changeRoot, "handoff.md"), "# Existing Handoff\n\nKeep this note.\n");
  const preservedResearch = path.join(
    changeRoot,
    "targets",
    "example-com",
    "research",
    "behaviors.md",
  );
  const preservedAssets = path.join(
    changeRoot,
    "targets",
    "example-com",
    "assets",
    "manifest.json",
  );
  fs.mkdirSync(path.dirname(preservedResearch), { recursive: true });
  fs.mkdirSync(path.dirname(preservedAssets), { recursive: true });
  fs.writeFileSync(preservedResearch, "preserve this research\n");
  fs.writeFileSync(preservedAssets, '{"assets":["keep-me"]}\n');

  const result = run(
    projectRoot,
    "--change-id",
    "existing-change",
    "--url",
    "https://example.com",
  );

  assert.equal(result.status, 0, result.stderr);
  const state = readJson(path.join(changeRoot, "state.json"));
  assert.equal(state.status, "in-progress");
  assert.ok(state.surfaces.includes("existing-surface"));
  assert.ok(state.surfaces.includes("example-com"));
  assert.ok(state.decisions.includes("keep-this-decision"));
  assert.ok(state.nextActions.includes("keep-this-action"));
  assert.ok(
    state.nextActions.includes("Verify authorization and browser capabilities for every target"),
  );

  const events = fs.readFileSync(path.join(changeRoot, "events.jsonl"), "utf8");
  assert.ok(events.startsWith(originalEvent));
  assert.equal(events.trim().split(/\r?\n/).length, 2);

  const handoff = fs.readFileSync(path.join(changeRoot, "handoff.md"), "utf8");
  assert.match(handoff, /Keep this note/);
  assert.match(handoff, /Website Cloning/);
  assert.equal(fs.readFileSync(preservedResearch, "utf8"), "preserve this research\n");
  assert.deepEqual(readJson(preservedAssets).assets, ["keep-me"]);
});

test("does not treat an unrelated root changes directory as an OpenSpec surface", () => {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "design-pipeline-clone-"));
  fs.mkdirSync(path.join(projectRoot, "changes"), { recursive: true });

  const result = run(
    projectRoot,
    "--change-id",
    "safe-root",
    "--url",
    "https://example.com",
  );

  assert.equal(result.status, 0, result.stderr);
  assert.ok(fs.existsSync(path.join(projectRoot, "design", "changes", "safe-root")));
  assert.equal(fs.readdirSync(path.join(projectRoot, "changes")).length, 0);
});

test("uses an established docs design surface", () => {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "design-pipeline-clone-"));
  fs.mkdirSync(path.join(projectRoot, "docs", "design"), { recursive: true });

  const result = run(
    projectRoot,
    "--change-id",
    "docs-design",
    "--url",
    "https://example.com",
  );

  assert.equal(result.status, 0, result.stderr);
  assert.ok(fs.existsSync(path.join(projectRoot, "docs", "design", "docs-design")));
});

test("assigns collision-safe target ids independently of URL order", () => {
  const firstRoot = makeProject();
  const secondRoot = makeProject();
  const urls = ["https://example.com/a-b", "https://example.com/a/b"];

  const first = run(
    firstRoot,
    "--change-id",
    "stable-targets",
    "--url",
    urls[0],
    "--url",
    urls[1],
  );
  const second = run(
    secondRoot,
    "--change-id",
    "stable-targets",
    "--url",
    urls[1],
    "--url",
    urls[0],
  );

  assert.equal(first.status, 0, first.stderr);
  assert.equal(second.status, 0, second.stderr);
  const firstTargets = readJson(
    path.join(firstRoot, "openspec", "changes", "stable-targets", "website-cloning.json"),
  ).targets;
  const secondTargets = readJson(
    path.join(secondRoot, "openspec", "changes", "stable-targets", "website-cloning.json"),
  ).targets;
  const byUrl = (targets) =>
    Object.fromEntries(targets.map((target) => [target.url, target.id]));
  assert.deepEqual(byUrl(firstTargets), byUrl(secondTargets));
  assert.notEqual(firstTargets[0].id, firstTargets[1].id);

  const resumed = run(
    firstRoot,
    "--change-id",
    "stable-targets",
    "--url",
    urls[1],
    "--url",
    urls[0],
  );
  assert.equal(resumed.status, 0, resumed.stderr);
  assert.match(resumed.stdout, /already initialized/i);
});

function markPortsReady(manifest) {
  for (const port of Object.values(manifest.ports)) {
    port.status = "ready";
    port.adapter = "test-adapter";
    port.availableCapabilities = [...port.requiredCapabilities];
    port.lastProbe = {
      at: "2026-07-15T00:00:00.000Z",
      ok: true,
      message: "ready",
    };
  }
}

function passingEvidence(targetId, overrides = {}) {
  return {
    schema: "design-pipeline.website-cloning.verification.v1",
    targets: [
      {
        targetId,
        textCoverage: 1,
        assetCoverage: 1,
        interactionCoverage: 1,
        viewports: [
          { width: 1440, height: 900, pixelDifferenceRatio: 0, maxLayoutDeltaPx: 0, unresolvedDifferences: [] },
          { width: 768, height: 1024, pixelDifferenceRatio: 0, maxLayoutDeltaPx: 0, unresolvedDifferences: [] },
          { width: 390, height: 844, pixelDifferenceRatio: 0, maxLayoutDeltaPx: 0, unresolvedDifferences: [] },
        ],
        unresolvedDifferences: [],
        ...overrides,
      },
    ],
    mappings: [],
  };
}

test("blocks completion when a required port is unresolved", () => {
  const projectRoot = makeProject();
  assert.equal(
    run(projectRoot, "--change-id", "blocked-run", "--url", "https://example.com").status,
    0,
  );
  const changeRoot = path.join(projectRoot, "openspec", "changes", "blocked-run");
  const evidencePath = path.join(changeRoot, "verification-input.json");
  fs.writeFileSync(
    evidencePath,
    `${JSON.stringify(passingEvidence("example-com"), null, 2)}\n`,
  );

  const result = evaluate(changeRoot, evidencePath);

  assert.equal(result.status, 2, result.stderr);
  const manifest = readJson(path.join(changeRoot, "website-cloning.json"));
  const state = readJson(path.join(changeRoot, "state.json"));
  assert.equal(manifest.status, "blocked");
  assert.equal(manifest.verification.status, "blocked");
  assert.equal(state.status, "blocked");
  assert.match(manifest.verification.reasons.join("\n"), /port/i);
});

test("marks an exact run complete only when ports and evidence pass", () => {
  const projectRoot = makeProject();
  assert.equal(
    run(projectRoot, "--change-id", "passing-run", "--url", "https://example.com").status,
    0,
  );
  const changeRoot = path.join(projectRoot, "openspec", "changes", "passing-run");
  const manifestPath = path.join(changeRoot, "website-cloning.json");
  const manifest = readJson(manifestPath);
  markPortsReady(manifest);
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  const evidencePath = path.join(changeRoot, "verification-input.json");
  fs.writeFileSync(
    evidencePath,
    `${JSON.stringify(passingEvidence("example-com"), null, 2)}\n`,
  );

  const result = evaluate(changeRoot, evidencePath);

  assert.equal(result.status, 0, result.stderr);
  const evaluated = readJson(manifestPath);
  const state = readJson(path.join(changeRoot, "state.json"));
  assert.equal(evaluated.status, "complete");
  assert.equal(evaluated.targets[0].status, "complete");
  assert.equal(evaluated.targets[0].phase, "complete");
  assert.equal(evaluated.verification.status, "passed");
  assert.equal(state.status, "needs-review");
  assert.equal(state.qa.websiteCloning.verdict, "complete");
});

test("marks a measurable exact mismatch as fidelity-limited", () => {
  const projectRoot = makeProject();
  assert.equal(
    run(projectRoot, "--change-id", "limited-run", "--url", "https://example.com").status,
    0,
  );
  const changeRoot = path.join(projectRoot, "openspec", "changes", "limited-run");
  const manifestPath = path.join(changeRoot, "website-cloning.json");
  const manifest = readJson(manifestPath);
  markPortsReady(manifest);
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  const evidencePath = path.join(changeRoot, "verification-input.json");
  fs.writeFileSync(
    evidencePath,
    `${JSON.stringify(
      passingEvidence("example-com", {
        viewports: [
          { width: 1440, height: 900, pixelDifferenceRatio: 0.02, maxLayoutDeltaPx: 0, unresolvedDifferences: [] },
          { width: 768, height: 1024, pixelDifferenceRatio: 0, maxLayoutDeltaPx: 0, unresolvedDifferences: [] },
          { width: 390, height: 844, pixelDifferenceRatio: 0, maxLayoutDeltaPx: 0, unresolvedDifferences: [] },
        ],
        unresolvedDifferences: ["hero artwork differs"],
      }),
      null,
      2,
    )}\n`,
  );

  const result = evaluate(changeRoot, evidencePath);

  assert.equal(result.status, 3, result.stderr);
  const evaluated = readJson(manifestPath);
  assert.equal(evaluated.status, "fidelity-limited");
  assert.equal(evaluated.verification.status, "failed");
  assert.match(evaluated.verification.reasons.join("\n"), /pixel|artwork/i);
});

test("adaptive mode can pass without exact-only pixel and layout capabilities", () => {
  const projectRoot = makeProject();
  const initialized = run(
    projectRoot,
    "--change-id",
    "adaptive-run",
    "--url",
    "https://example.com",
    "--fidelity",
    "adaptive",
  );
  assert.equal(initialized.status, 0, initialized.stderr);
  const changeRoot = path.join(projectRoot, "openspec", "changes", "adaptive-run");
  const manifestPath = path.join(changeRoot, "website-cloning.json");
  const manifest = readJson(manifestPath);
  markPortsReady(manifest);
  assert.equal(manifest.fidelity.gates.maxPixelDifferenceRatio, null);
  assert.ok(!manifest.ports.evidence.requiredCapabilities.includes("pixel-diff"));
  assert.ok(!manifest.ports.evidence.requiredCapabilities.includes("layout-diff"));
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  const evidence = passingEvidence("example-com");
  for (const viewport of evidence.targets[0].viewports) {
    delete viewport.pixelDifferenceRatio;
    delete viewport.maxLayoutDeltaPx;
  }
  const evidencePath = path.join(changeRoot, "verification-input.json");
  fs.writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);

  const result = evaluate(changeRoot, evidencePath);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(readJson(manifestPath).status, "complete");
});

test("requires an explicit, replayed mapping for every reference target", () => {
  const projectRoot = makeProject();
  const initialized = run(
    projectRoot,
    "--change-id",
    "mapped-run",
    "--url",
    "https://example.com",
    "--reference-url",
    "https://linear.app",
    "--fidelity",
    "adaptive",
  );
  assert.equal(initialized.status, 0, initialized.stderr);
  const changeRoot = path.join(projectRoot, "openspec", "changes", "mapped-run");
  const manifestPath = path.join(changeRoot, "website-cloning.json");
  const manifest = readJson(manifestPath);
  markPortsReady(manifest);
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  const evidence = passingEvidence("example-com");
  for (const viewport of evidence.targets[0].viewports) {
    delete viewport.pixelDifferenceRatio;
    delete viewport.maxLayoutDeltaPx;
  }
  const evidencePath = path.join(changeRoot, "verification-input.json");
  fs.writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);

  const missingMapping = evaluate(changeRoot, evidencePath);
  assert.equal(missingMapping.status, 2, missingMapping.stderr);
  assert.match(
    readJson(manifestPath).verification.reasons.join("\n"),
    /reference mapping/i,
  );

  const mappedManifest = readJson(manifestPath);
  mappedManifest.status = "planned";
  mappedManifest.referenceMappings = [
    {
      id: "linear-nav",
      kind: "replacement",
      designRecord: "design.md#linear-nav",
      sourceTargetId: "linear-app",
      destinationTargetId: "example-com",
      sourceRegion: "primary navigation",
      destinationRegion: "site navigation",
      adoptedProperties: ["open-close interaction"],
      rejectedProperties: ["brand and copy"],
      requiredStates: ["closed", "open", "keyboard-focus"],
    },
  ];
  fs.appendFileSync(
    path.join(changeRoot, "design.md"),
    "\n## Reference Mapping: linear-nav\n\nReplace the destination navigation interaction only.\n",
  );
  fs.writeFileSync(manifestPath, `${JSON.stringify(mappedManifest, null, 2)}\n`);
  evidence.mappings = [
    {
      mappingId: "linear-nav",
      interactionCoverage: 1,
      replayPassed: true,
      verifiedAdoptedProperties: ["open-close interaction"],
      verifiedRejectedProperties: ["brand and copy"],
      states: [
        { name: "closed", replayPassed: true, evidencePaths: ["targets/example-com/evidence/interactions/linear-nav.json"], unresolvedDifferences: [] },
        { name: "open", replayPassed: true, evidencePaths: ["targets/example-com/evidence/interactions/linear-nav.json"], unresolvedDifferences: [] },
        { name: "keyboard-focus", replayPassed: true, evidencePaths: ["targets/example-com/evidence/interactions/linear-nav.json"], unresolvedDifferences: [] },
      ],
      unresolvedDifferences: [],
    },
  ];
  fs.writeFileSync(
    path.join(changeRoot, "targets", "example-com", "evidence", "interactions", "linear-nav.json"),
    '{"captured":true}\n',
  );
  fs.writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);

  const exactWithReplacement = readJson(manifestPath);
  exactWithReplacement.fidelity.mode = "exact";
  fs.writeFileSync(manifestPath, `${JSON.stringify(exactWithReplacement, null, 2)}\n`);
  const wrongMode = evaluate(changeRoot, evidencePath);
  assert.equal(wrongMode.status, 2, wrongMode.stderr);
  assert.match(
    readJson(manifestPath).verification.reasons.join("\n"),
    /replacement reference mapping requires adaptive/i,
  );

  const adaptiveManifest = readJson(manifestPath);
  adaptiveManifest.status = "planned";
  adaptiveManifest.fidelity.mode = "adaptive";
  adaptiveManifest.referenceMappings[0].destinationTargetId = "linear-app";
  fs.writeFileSync(manifestPath, `${JSON.stringify(adaptiveManifest, null, 2)}\n`);
  const invalidDirection = evaluate(changeRoot, evidencePath);
  assert.equal(invalidDirection.status, 2, invalidDirection.stderr);
  assert.match(
    readJson(manifestPath).verification.reasons.join("\n"),
    /destination target must be primary/i,
  );

  const validManifest = readJson(manifestPath);
  validManifest.status = "planned";
  validManifest.referenceMappings[0].destinationTargetId = "example-com";
  fs.writeFileSync(manifestPath, `${JSON.stringify(validManifest, null, 2)}\n`);

  const passed = evaluate(changeRoot, evidencePath);
  assert.equal(passed.status, 0, passed.stderr);
  assert.equal(readJson(manifestPath).status, "complete");
});

test("rejects evidence outside the change and requires headless state", () => {
  const projectRoot = makeProject();
  assert.equal(
    run(projectRoot, "--change-id", "portable-run", "--url", "https://example.com").status,
    0,
  );
  const changeRoot = path.join(projectRoot, "openspec", "changes", "portable-run");
  const manifestPath = path.join(changeRoot, "website-cloning.json");
  const manifest = readJson(manifestPath);
  markPortsReady(manifest);
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  const outsideEvidence = path.join(projectRoot, "outside-verification.json");
  fs.writeFileSync(
    outsideEvidence,
    `${JSON.stringify(passingEvidence("example-com"), null, 2)}\n`,
  );
  const before = fs.readFileSync(manifestPath, "utf8");

  const outside = evaluate(changeRoot, outsideEvidence);
  assert.equal(outside.status, 1);
  assert.match(outside.stderr, /inside the change root/i);
  assert.equal(fs.readFileSync(manifestPath, "utf8"), before);

  const insideEvidence = path.join(changeRoot, "verification-input.json");
  fs.copyFileSync(outsideEvidence, insideEvidence);
  const statePath = path.join(changeRoot, "state.json");
  const wrongState = readJson(statePath);
  wrongState.changeId = "wrong-change";
  fs.writeFileSync(statePath, `${JSON.stringify(wrongState, null, 2)}\n`);
  const mismatchedState = evaluate(changeRoot, insideEvidence);
  assert.equal(mismatchedState.status, 1);
  assert.match(mismatchedState.stderr, /ids must match/i);
  assert.equal(fs.readFileSync(manifestPath, "utf8"), before);

  fs.rmSync(statePath);
  const missingState = evaluate(changeRoot, insideEvidence);
  assert.equal(missingState.status, 1);
  assert.match(missingState.stderr, /state\.json/i);
  assert.equal(fs.readFileSync(manifestPath, "utf8"), before);
});

test("keeps JSONL valid and replaces the current handoff evaluation", () => {
  const projectRoot = makeProject();
  assert.equal(
    run(projectRoot, "--change-id", "repeat-gate", "--url", "https://example.com").status,
    0,
  );
  const changeRoot = path.join(projectRoot, "openspec", "changes", "repeat-gate");
  const manifestPath = path.join(changeRoot, "website-cloning.json");
  const manifest = readJson(manifestPath);
  markPortsReady(manifest);
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  const evidencePath = path.join(changeRoot, "verification-input.json");
  fs.writeFileSync(
    evidencePath,
    `${JSON.stringify(passingEvidence("example-com"), null, 2)}\n`,
  );
  const eventsPath = path.join(changeRoot, "events.jsonl");
  fs.writeFileSync(eventsPath, fs.readFileSync(eventsPath, "utf8").trimEnd());

  assert.equal(evaluate(changeRoot, evidencePath).status, 0);
  assert.equal(evaluate(changeRoot, evidencePath).status, 0);

  const lines = fs.readFileSync(eventsPath, "utf8").trim().split(/\r?\n/);
  for (const line of lines) assert.doesNotThrow(() => JSON.parse(line));
  const handoff = fs.readFileSync(path.join(changeRoot, "handoff.md"), "utf8");
  assert.equal(
    handoff.match(/DESIGN-PIPELINE:WEBSITE-CLONING-EVALUATION:START/g)?.length,
    1,
  );
});

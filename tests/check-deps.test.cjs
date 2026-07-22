const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const repoRoot = path.resolve(__dirname, "..");
const checkScript = path.join(repoRoot, "skill/scripts/check-deps.cjs");

function makeRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "design-pipeline-check-deps-"));
}

function installPipeline(root) {
  fs.cpSync(path.join(repoRoot, "skill"), path.join(root, "design-pipeline"), {
    recursive: true,
  });
}

function installSkill(root, name, body) {
  const target = path.join(root, name);
  fs.mkdirSync(target, { recursive: true });
  fs.writeFileSync(path.join(target, "SKILL.md"), body);
}

function runCheckRaw(skillRoots, options = {}) {
  return spawnSync(
    process.execPath,
    [options.script || checkScript, "--json", ...(options.args || [])],
    {
    cwd: options.cwd || repoRoot,
    encoding: "utf8",
    env: {
      ...process.env,
      DESIGN_PIPELINE_SKILL_ROOTS: skillRoots.join(path.delimiter),
      CODEX_SKILLS_DIR: "",
      ...(options.env || {}),
    },
    },
  );
}

function runCheck(skillRoots, options = {}) {
  const result = runCheckRaw(skillRoots, options);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return JSON.parse(result.stdout);
}

test("reports INFO when the optional Anime.js skill is absent", () => {
  const root = makeRoot();
  try {
    installPipeline(root);
    const report = runCheck([root]);
    const profile = report.capabilityProfiles.find((item) => item.skill === "animejs");

    assert.equal(report.result, "OK");
    assert.equal(profile.status, "INFO");
    assert.equal(profile.installed, false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("reports WARN without failing when an installed Anime.js skill is stale", () => {
  const root = makeRoot();
  try {
    installPipeline(root);
    installSkill(
      root,
      "animejs",
      "# Anime.js v4\ncreateLayout splitText onScroll createDraggable createScope WAAPI jitter\n",
    );

    const report = runCheck([root]);
    const profile = report.capabilityProfiles.find((item) => item.skill === "animejs");

    assert.equal(report.result, "OK");
    assert.equal(profile.status, "WARN");
    assert.deepEqual(profile.missingMarkers, [
      "adapters",
      "3d-stagger",
      "deterministic-stagger",
    ]);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("reports OK for an Anime.js v4.5-capable companion", () => {
  const root = makeRoot();
  try {
    installPipeline(root);
    installSkill(
      root,
      "animejs",
      [
        "# Anime.js v4",
        "createLayout splitText onScroll createDraggable createScope WAAPI",
        "registerAdapter animejs/adapters/three Three.js adapter",
        "3D layouts grid: [columns, rows, depth] axis accepts 'z'",
        "deterministic jitter and seed",
      ].join("\n"),
    );

    const report = runCheck([root]);
    const profile = report.capabilityProfiles.find((item) => item.skill === "animejs");

    assert.equal(profile.status, "OK");
    assert.deepEqual(profile.missingMarkers, []);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("reports INFO when the optional PixiJS skill suite is absent", () => {
  const root = makeRoot();
  try {
    installPipeline(root);
    const report = runCheck([root]);
    const profile = report.capabilityProfiles.find(
      (item) => item.id === "pixijs-v8-production-rendering",
    );

    assert.equal(report.result, "OK");
    assert.equal(profile.status, "INFO");
    assert.equal(profile.installed, false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("reports WARN when only the PixiJS router is installed", () => {
  const root = makeRoot();
  try {
    installPipeline(root);
    installSkill(
      root,
      "pixijs",
      "PixiJS v8 router with WebGL WebGPU Canvas and https://pixijs.download/release/docs/llms.txt fallback.\n",
    );

    const report = runCheck([root]);
    const profile = report.capabilityProfiles.find(
      (item) => item.id === "pixijs-v8-production-rendering",
    );

    assert.equal(report.result, "OK");
    assert.equal(profile.status, "WARN");
    assert.deepEqual(profile.missingMarkers, [
      "pixijs-application:missing",
      "pixijs-accessibility:missing",
      "pixijs-performance:missing",
      "pixijs-ticker:missing",
      "pixijs-environments:missing",
    ]);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("reports OK for a production-ready PixiJS v8 companion suite", () => {
  const root = makeRoot();
  try {
    installPipeline(root);
    installSkill(
      root,
      "pixijs",
      "PixiJS v8 router with WebGL WebGPU Canvas and https://pixijs.download/release/docs/llms.txt fallback.\n",
    );
    installSkill(
      root,
      "pixijs-application",
      "new Application() then async app.init(); resizeTo autoDensity resolution app.destroy releaseGlobalResources\n",
    );
    installSkill(
      root,
      "pixijs-accessibility",
      "AccessibilitySystem accessibleTitle tabIndex keyboard navigation shadow DOM overlay\n",
    );
    installSkill(
      root,
      "pixijs-performance",
      "profile FPS draw calls GPU memory culling batching GCSystem object pooling cacheAsTexture\n",
    );
    installSkill(
      root,
      "pixijs-ticker",
      "Ticker deltaTime maxFPS UPDATE_PRIORITY stop remove cleanup\n",
    );
    installSkill(
      root,
      "pixijs-environments",
      "Web Workers OffscreenCanvas Node SSR strict-CSP DOMAdapter WebWorkerAdapter\n",
    );

    const report = runCheck([root]);
    const profile = report.capabilityProfiles.find(
      (item) => item.id === "pixijs-v8-production-rendering",
    );

    assert.equal(profile.status, "OK");
    assert.deepEqual(profile.missingMarkers, []);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("searches multiple explicit skill roots", () => {
  const pipelineRoot = makeRoot();
  const companionRoot = makeRoot();
  try {
    installPipeline(pipelineRoot);
    installSkill(
      companionRoot,
      "animejs",
      [
        "# Anime.js v4",
        "createLayout splitText onScroll createDraggable createScope WAAPI",
        "registerAdapter animejs/adapters/three",
        "3D layouts",
        "jitter seed",
      ].join("\n"),
    );

    const report = runCheck([pipelineRoot, companionRoot]);
    const profile = report.capabilityProfiles.find((item) => item.skill === "animejs");

    assert.deepEqual(report.skillRoots, [pipelineRoot, companionRoot]);
    assert.equal(profile.status, "OK");
    assert.equal(path.dirname(path.dirname(profile.skillPath)), companionRoot);
  } finally {
    fs.rmSync(pipelineRoot, { recursive: true, force: true });
    fs.rmSync(companionRoot, { recursive: true, force: true });
  }
});

test("evaluates non-Anime companion suites from the capability registry", () => {
  const root = makeRoot();
  try {
    installPipeline(root);
    installSkill(root, "gstack-learn", "learnings.jsonl and gstack-learnings-log");
    installSkill(root, "gstack-spec", "File a GitHub issue from an executable spec.");
    installSkill(root, "gstack-review", "Review the code and report findings.");
    installSkill(root, "gstack-ship", "Create a PR and update the pull request.");

    const report = runCheck([root]);
    const profile = report.capabilityProfiles.find(
      (item) => item.id === "gstack-feedback-flow",
    );

    assert.equal(profile.status, "OK");
    assert.deepEqual(profile.missingMarkers, []);
    assert.deepEqual(profile.installedSkills.sort(), [
      "gstack-learn",
      "gstack-review",
      "gstack-ship",
      "gstack-spec",
    ]);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("records stale capability feedback only when explicitly requested", () => {
  const skillRoot = makeRoot();
  const consumerRoot = makeRoot();
  try {
    installPipeline(skillRoot);
    installSkill(
      skillRoot,
      "animejs",
      "# Anime.js v4\ncreateLayout splitText onScroll createDraggable createScope WAAPI\n",
    );

    const report = runCheck([skillRoot], {
      cwd: consumerRoot,
      args: ["--record-feedback", "--feedback-root", consumerRoot],
      env: { DESIGN_PIPELINE_NOW: "2026-07-19T00:00:00.000Z" },
    });
    const observationsDir = path.join(
      consumerRoot,
      ".design-pipeline",
      "feedback",
      "observations",
    );
    const observations = fs.readdirSync(observationsDir);

    assert.equal(report.feedback.recorded.length, 1);
    assert.equal(observations.length, 1);
    const observation = JSON.parse(
      fs.readFileSync(path.join(observationsDir, observations[0]), "utf8"),
    );
    assert.equal(observation.kind, "companion-gap");
    assert.equal(observation.skill, "animejs");
    assert.match(observation.title, /Anime\.js v4\.5 orchestration/);
    assert.equal(observation.occurrences, 1);
  } finally {
    fs.rmSync(skillRoot, { recursive: true, force: true });
    fs.rmSync(consumerRoot, { recursive: true, force: true });
  }
});

test("fails clearly when a registry requirement contains an invalid regex", () => {
  const root = makeRoot();
  try {
    installPipeline(root);
    const installedPipeline = path.join(root, "design-pipeline");
    const registryPath = path.join(
      installedPipeline,
      "references",
      "companion-capabilities.json",
    );
    const registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
    registry.profiles[0].requirements[0].patterns = [{ source: "[" }];
    fs.writeFileSync(registryPath, `${JSON.stringify(registry, null, 2)}\n`);

    const result = runCheckRaw([root], {
      script: path.join(installedPipeline, "scripts", "check-deps.cjs"),
    });

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Invalid regex in capability profile animejs-v4-5/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("fails closed when the capability registry contains null", () => {
  const root = makeRoot();
  try {
    installPipeline(root);
    const installedPipeline = path.join(root, "design-pipeline");
    const registryPath = path.join(
      installedPipeline,
      "references",
      "companion-capabilities.json",
    );
    fs.writeFileSync(registryPath, "null\n");

    const result = runCheckRaw([root], {
      script: path.join(installedPipeline, "scripts", "check-deps.cjs"),
    });

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Invalid companion capability registry structure/);
    assert.doesNotMatch(result.stderr, /TypeError/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("fails closed when a capability requirement contains null", () => {
  const root = makeRoot();
  try {
    installPipeline(root);
    const installedPipeline = path.join(root, "design-pipeline");
    const registryPath = path.join(
      installedPipeline,
      "references",
      "companion-capabilities.json",
    );
    const registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
    registry.profiles[0].requirements = [null];
    fs.writeFileSync(registryPath, `${JSON.stringify(registry, null, 2)}\n`);

    const result = runCheckRaw([root], {
      script: path.join(installedPipeline, "scripts", "check-deps.cjs"),
    });

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Invalid requirement <unknown>/);
    assert.doesNotMatch(result.stderr, /TypeError/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

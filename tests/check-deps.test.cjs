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

test("installed self-check discovers standard defaults and keeps explicit roots exclusive", async (t) => {
  const workspace = makeRoot();
  const home = path.join(workspace, "home");
  const project = path.join(workspace, "project");
  const codexHome = path.join(workspace, "custom-codex");
  const fixtureRoot = path.join(workspace, "fixture-skills");
  const badRoot = path.join(workspace, "missing-skills");
  const legacyRoot = path.join(home, ".codex", "skills");
  const globalRoot = path.join(home, ".agents", "skills");
  const projectRoot = path.join(project, ".agents", "skills");
  const claudeUserRoot = path.join(home, ".claude", "skills");
  const projectClaudeRoot = path.join(project, ".claude", "skills");
  // The running copy's directory, then the standard roots, then the legacy Codex root; each once.
  const defaultRoots = (runningRoot, legacy) => [...new Set([runningRoot, claudeUserRoot, globalRoot, projectRoot, projectClaudeRoot, legacy])];
  const isolatedEnv = { HOME: home, USERPROFILE: home, CODEX_HOME: "" };
  const missingResource = "design-pipeline/scripts/designer-pipeline.cjs";

  function assertComplete(result) {
    assert.equal(result.status, 0, result.stderr || result.stdout);
    const report = JSON.parse(result.stdout);
    const core = report.groups.find((item) => item.name === "Core pipeline");
    const companions = report.groups.find((item) => item.name === "Matt Pocock development");
    assert.equal(report.result, "OK");
    assert.equal(core.status, "OK");
    assert.deepEqual(core.missing, []);
    assert.deepEqual(core.missingResources, []);
    assert.ok(core.installedResources.includes(missingResource));
    assert.ok(companions.installed.includes("tdd"));
    assert.equal(companions.missing.includes("tdd"), false);
    return report;
  }

  function assertExplicitFailure(result) {
    assert.equal(result.status, 1, result.stderr || result.stdout);
    const report = JSON.parse(result.stdout);
    const core = report.groups.find((item) => item.name === "Core pipeline");
    const companions = report.groups.find((item) => item.name === "Matt Pocock development");
    assert.deepEqual(report.skillRoots, [badRoot]);
    assert.equal(report.result, "FAIL");
    assert.equal(core.status, "FAIL");
    assert.ok(core.missing.includes("design-pipeline"));
    assert.ok(core.missingResources.includes(missingResource));
    assert.equal(companions.installed.includes("tdd"), false);
  }

  try {
    fs.mkdirSync(home, { recursive: true });
    fs.mkdirSync(project, { recursive: true });
    installPipeline(fixtureRoot);
    installSkill(fixtureRoot, "tdd", "# TDD\nInstalled companion fixture.\n");

    for (const scenario of [
      { name: "global .agents", root: globalRoot },
      { name: "user .claude", root: claudeUserRoot },
      { name: "project .claude", root: projectClaudeRoot },
      { name: "project .agents", root: projectRoot },
      { name: "legacy .codex", root: legacyRoot },
      { name: "relative CODEX_HOME", root: path.join(codexHome, "skills"), codexHome: path.relative(project, codexHome) },
    ]) {
      await t.test(scenario.name, () => {
        fs.mkdirSync(path.dirname(scenario.root), { recursive: true });
        fs.renameSync(fixtureRoot, scenario.root);
        const options = {
          cwd: project,
          script: path.join(scenario.root, "design-pipeline", "scripts", "check-deps.cjs"),
          env: { ...isolatedEnv, CODEX_HOME: scenario.codexHome || "" },
        };
        try {
          const report = assertComplete(runCheckRaw([], options));
          assert.deepEqual(report.skillRoots, defaultRoots(scenario.root, scenario.codexHome ? path.join(codexHome, "skills") : legacyRoot));
          assert.equal(report.skillRoot, report.skillRoots[0]);
          assert.equal(report.projectRoot, project);

          for (const variable of ["DESIGN_PIPELINE_SKILL_ROOTS", "CODEX_SKILLS_DIR"]) {
            assertExplicitFailure(runCheckRaw([], {
              ...options,
              env: { ...options.env, [variable]: badRoot },
            }));
          }

          const explicit = assertComplete(runCheckRaw([], {
            ...options,
            env: {
              ...options.env,
              DESIGN_PIPELINE_SKILL_ROOTS: scenario.root,
              CODEX_SKILLS_DIR: badRoot,
            },
          }));
          assert.deepEqual(explicit.skillRoots, [scenario.root]);
          assertExplicitFailure(runCheckRaw([], {
            ...options,
            env: {
              ...options.env,
              DESIGN_PIPELINE_SKILL_ROOTS: badRoot,
              CODEX_SKILLS_DIR: scenario.root,
            },
          }));

          const resourcePath = path.join(scenario.root, missingResource);
          const heldResource = path.join(workspace, "held-designer-pipeline.cjs");
          fs.renameSync(resourcePath, heldResource);
          try {
            const result = runCheckRaw([], options);
            assert.equal(result.status, 1, result.stderr || result.stdout);
            const incomplete = JSON.parse(result.stdout);
            const core = incomplete.groups.find((item) => item.name === "Core pipeline");
            assert.equal(incomplete.result, "FAIL");
            assert.equal(core.status, "FAIL");
            assert.deepEqual(core.installed, ["design-pipeline"]);
            assert.deepEqual(core.missingResources, [missingResource]);
          } finally {
            fs.renameSync(heldResource, resourcePath);
          }
        } finally {
          fs.renameSync(scenario.root, fixtureRoot);
        }
      });
    }

    await t.test("a Claude Code plugin copy named by version is the core skill", () => {
      const pluginCopy = path.join(home, ".claude", "plugins", "cache", "design-pipeline", "design-pipeline", "0.12.0");
      fs.mkdirSync(path.dirname(pluginCopy), { recursive: true });
      fs.renameSync(path.join(fixtureRoot, "design-pipeline"), pluginCopy);
      try {
        const options = {
          cwd: project,
          script: path.join(pluginCopy, "scripts", "check-deps.cjs"),
          env: isolatedEnv,
        };
        const result = runCheckRaw([], options);
        assert.equal(result.status, 0, result.stderr || result.stdout);
        const report = JSON.parse(result.stdout);
        assert.deepEqual(report.skillRoots, defaultRoots(null, legacyRoot).filter(Boolean));
        const core = report.groups.find((item) => item.name === "Core pipeline");
        assert.equal(report.result, "OK");
        assert.deepEqual(core.installed, ["design-pipeline"]);
        assert.deepEqual(core.missingResources, []);
        assert.ok(core.installedResources.includes(missingResource));

        // The same copy missing a file still fails, and explicit roots do not borrow the running copy.
        const held = path.join(workspace, "held-plugin-cli.cjs");
        fs.renameSync(path.join(pluginCopy, "scripts", "designer-pipeline.cjs"), held);
        try {
          const incomplete = runCheckRaw([], options);
          assert.equal(incomplete.status, 1);
          assert.deepEqual(JSON.parse(incomplete.stdout).groups.find((item) => item.name === "Core pipeline").missingResources, [missingResource]);
        } finally {
          fs.renameSync(held, path.join(pluginCopy, "scripts", "designer-pipeline.cjs"));
        }
        assertExplicitFailure(runCheckRaw([], { ...options, env: { ...isolatedEnv, DESIGN_PIPELINE_SKILL_ROOTS: badRoot } }));
      } finally {
        fs.renameSync(pluginCopy, path.join(fixtureRoot, "design-pipeline"));
      }
    });

    await t.test("resolved default roots are de-duplicated in first-seen order", () => {
      fs.renameSync(fixtureRoot, globalRoot);
      try {
        const report = assertComplete(runCheckRaw([], {
          cwd: home,
          script: path.join(globalRoot, "design-pipeline", "scripts", "check-deps.cjs"),
          env: { ...isolatedEnv, CODEX_HOME: `${home}${path.sep}.agents${path.sep}..${path.sep}.agents` },
        }));
        assert.deepEqual(report.skillRoots, [globalRoot, claudeUserRoot]);
        assert.equal(report.skillRoot, globalRoot);
        assert.equal(report.projectRoot, home);
      } finally {
        fs.renameSync(globalRoot, fixtureRoot);
      }
    });
  } finally {
    fs.rmSync(workspace, { recursive: true, force: true });
  }
});

test("recognizes official Matt install names without local aliases", () => {
  const root = makeRoot();
  try {
    installPipeline(root);
    for (const name of ["codebase-design", "grill-with-docs", "implement", "tdd", "code-review"]) {
      installSkill(root, name, `---\nname: ${name}\ndescription: Installed skill fixture.\n---\n`);
    }
    const group = runCheck([root]).groups.find((item) => item.name === "Matt Pocock development");
    assert.equal(group.level, "optional");
    assert.equal(group.status, "OK");
    assert.deepEqual(group.missing, []);
    assert.ok(group.installed.includes("tdd"));
    assert.ok(group.installed.includes("code-review"));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

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

test("a clean packaged pipeline never reports bundled emil-design-eng as a missing companion", () => {
  const root = makeRoot();
  try {
    installPipeline(root);
    const report = runCheck([root]);
    const core = report.groups.find((item) => item.name === "Core pipeline");

    assert.equal(core.status, "OK");
    for (const group of report.groups) {
      assert.equal((group.missing || []).includes("emil-design-eng"), false, group.name);
    }
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("fails when an installed core pipeline resource is missing", () => {
  const root = makeRoot();
  try {
    installPipeline(root);
    const installedPipeline = path.join(root, "design-pipeline");
    fs.rmSync(path.join(installedPipeline, "scripts", "designer-pipeline.cjs"));

    const result = runCheckRaw([root], {
      script: path.join(installedPipeline, "scripts", "check-deps.cjs"),
    });
    const report = JSON.parse(result.stdout);
    const core = report.groups.find((item) => item.name === "Core pipeline");

    assert.notEqual(result.status, 0);
    assert.equal(report.result, "FAIL");
    assert.equal(core.status, "FAIL");
    assert.ok(
      core.missingResources.includes("design-pipeline/scripts/designer-pipeline.cjs"),
    );
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
    const secondarySetting = runCheck([], {
      env: {
        DESIGN_PIPELINE_SKILL_ROOTS: "",
        CODEX_SKILLS_DIR: [pipelineRoot, companionRoot].join(path.delimiter),
      },
    });
    assert.deepEqual(secondarySetting.skillRoots, [pipelineRoot, companionRoot]);
    assert.equal(secondarySetting.result, "OK");
    assert.equal(secondarySetting.groups.find((item) => item.name === "Core pipeline").status, "OK");
    const secondaryProfile = secondarySetting.capabilityProfiles.find((item) => item.skill === "animejs");
    assert.equal(secondaryProfile.status, "OK");
    assert.equal(path.dirname(path.dirname(secondaryProfile.skillPath)), companionRoot);
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

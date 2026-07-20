"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");
const {
  validateMotionFoundationModel,
} = require("../skill/scripts/motion-foundation-core.cjs");

const repoRoot = path.resolve(__dirname, "..");
const checkScript = path.join(
  repoRoot,
  "skill",
  "scripts",
  "check-motion-foundation.cjs",
);
const registryPath = path.join(
  repoRoot,
  "skill",
  "references",
  "motion-primitives.json",
);
const roots = new Set();

test.after(() => {
  for (const root of roots) fs.rmSync(root, { recursive: true, force: true });
});

function tempProject() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "design-pipeline-motion-"));
  roots.add(root);
  return root;
}

function runCheck(projectRoot) {
  return spawnSync(
    process.execPath,
    [checkScript, "--project-root", projectRoot, "--json"],
    {
      cwd: projectRoot,
      encoding: "utf8",
    },
  );
}

function writeMotion(projectRoot, content) {
  fs.writeFileSync(path.join(projectRoot, "MOTION.md"), content, "utf8");
}

const staticFoundation = `---
schema: design-pipeline.motion-foundation.v0.1
name: Quiet operational motion
posture: static
primitiveRegistry: design-pipeline.motion-primitives.v1
---

# Motion Foundation

## Motion Thesis

The interface remains still unless state clarity requires a discrete change.

## Motion Principles

- Preserve reading and input.

## Motion Vocabulary

No moving primitive is selected for the static posture.

## Procedural Motion

Disabled. Equations remain declarative data if introduced later.

## Runtime Policy

CSS state changes only.

## Reduced Motion

Fallback: all states render directly without interpolation.

## Source Decisions

- Adopted: explicit static posture and stable-state feedback.
- Rejected: decorative loops and motion-only meaning.
`;

const proceduralFoundation = `---
schema: design-pipeline.motion-foundation.v0.1
name: 参数化路径语言
posture: procedural
primitiveRegistry: design-pipeline.motion-primitives.v1
---

# 动效基础

## 动效主张

运动用于解释系统状态，不遮挡信息。

## 动效原则

- 所有循环都必须可中断。

## 动效词汇

- primitive: procedural.lissajous

## 程序化动效

- generator: procedural.lissajous
- equation: x = amplitudeX * sin(frequencyX * t + phaseX)
- seed: 42

## 运行时策略

SVG 为主，Canvas 为降级路径。

## 减弱动效

替代: 展示静态曲线路径，不沿路径移动粒子。

## 来源决策

- 采用: 参数化曲线和确定性采样。
- 拒绝: 外部仓库的 JavaScript、DOM 和渲染循环。
`;

test("missing MOTION.md requests synthesis with exit code 2", () => {
  const projectRoot = tempProject();
  const result = runCheck(projectRoot);

  assert.equal(result.status, 2, result.stderr || result.stdout);
  const report = JSON.parse(result.stdout);
  assert.equal(report.status, "synthesis-required");
  assert.equal(report.motionFile, "MOTION.md");
});

test("free-text MOTION.md is invalid", () => {
  const projectRoot = tempProject();
  writeMotion(projectRoot, "# Some animation notes\n\nMake it feel smooth.\n");
  const result = runCheck(projectRoot);

  assert.equal(result.status, 1, result.stderr || result.stdout);
  const report = JSON.parse(result.stdout);
  assert.equal(report.status, "invalid");
  assert.match(report.error, /frontmatter/i);
});

test("valid static foundation is ready", () => {
  const projectRoot = tempProject();
  writeMotion(projectRoot, staticFoundation);
  const result = runCheck(projectRoot);

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const report = JSON.parse(result.stdout);
  assert.equal(report.status, "ready");
  assert.equal(report.posture, "static");
  assert.equal(report.language, "en");
  assert.equal(report.foundation.schema, "design-pipeline.motion-foundation.v0.1");
  assert.equal(report.foundation.proceduralMotion.policy, "disabled");
  assert.deepEqual(report.foundation.principles, ["Preserve reading and input."]);
  assert.equal(report.foundation.sourceDecisions[0].codeCopied, false);
  assert.match(report.sha256, /^[a-f0-9]{64}$/);
});

test("valid Chinese procedural foundation is ready", () => {
  const projectRoot = tempProject();
  writeMotion(projectRoot, proceduralFoundation);
  const result = runCheck(projectRoot);

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const report = JSON.parse(result.stdout);
  assert.equal(report.status, "ready");
  assert.equal(report.posture, "procedural");
  assert.equal(report.language, "zh");
  assert.equal(report.foundation.proceduralMotion.policy, "declarative-only");
  assert.deepEqual(report.foundation.primitives, ["procedural.lissajous"]);
  assert.match(report.foundation.reducedMotion.substitute, /静态曲线路径/);
});

test("executable procedural content is rejected", () => {
  const projectRoot = tempProject();
  writeMotion(
    projectRoot,
    proceduralFoundation.replace(
      "x = amplitudeX * sin(frequencyX * t + phaseX)",
      "t => Math.sin(t)",
    ),
  );
  const result = runCheck(projectRoot);

  assert.equal(result.status, 1, result.stderr || result.stdout);
  const report = JSON.parse(result.stdout);
  assert.equal(report.status, "invalid");
  assert.match(report.error, /declarative/i);
});

for (const executable of [
  "```javascript\nconst runtime = require('motion-runtime');\n```",
  "```\nconst duration = 300;\n```",
  "```css\n.target { animation: pulse 300ms; }\n```",
  "const runtime = require('motion-runtime');",
  "value => value",
  "eval('motion')",
  "import('motion-runtime')",
]) {
  test(`executable content outside the procedural section is rejected: ${executable.split("\n")[0]}`, () => {
    const projectRoot = tempProject();
    writeMotion(
      projectRoot,
      staticFoundation.replace("CSS state changes only.", executable),
    );
    const result = runCheck(projectRoot);

    assert.equal(result.status, 1, result.stderr || result.stdout);
    assert.match(JSON.parse(result.stdout).error, /declarative/i);
  });
}

test("normalized model rejects extra fields and invalid procedural generators", () => {
  const projectRoot = tempProject();
  writeMotion(projectRoot, proceduralFoundation);
  const result = runCheck(projectRoot);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const foundation = JSON.parse(result.stdout).foundation;

  assert.throws(
    () => validateMotionFoundationModel({ ...foundation, unsupported: true }),
    /unsupported fields/i,
  );

  for (const generator of [
    { id: "not-procedural", parameters: {}, reducedMotion: "static" },
    { id: "procedural.test", parameters: null, reducedMotion: "static" },
    { id: "procedural.test", parameters: {}, reducedMotion: "" },
  ]) {
    assert.throws(
      () =>
        validateMotionFoundationModel({
          ...foundation,
          proceduralMotion: {
            ...foundation.proceduralMotion,
            generators: [generator],
          },
        }),
      /generator.*schema/i,
    );
  }
});

test("required motion sections must contain authored decisions", () => {
  const projectRoot = tempProject();
  writeMotion(
    projectRoot,
    staticFoundation.replace(
      "The interface remains still unless state clarity requires a discrete change.",
      "",
    ),
  );
  const result = runCheck(projectRoot);

  assert.equal(result.status, 1, result.stderr || result.stdout);
  assert.match(JSON.parse(result.stdout).error, /motion thesis.*must not be empty/i);
});

test("static posture cannot select a moving primitive", () => {
  const projectRoot = tempProject();
  writeMotion(
    projectRoot,
    staticFoundation.replace(
      "No moving primitive is selected for the static posture.",
      "primitive: transform.orbit",
    ),
  );
  const result = runCheck(projectRoot);

  assert.equal(result.status, 1, result.stderr || result.stdout);
  assert.match(JSON.parse(result.stdout).error, /static.*must not select/i);
});

test("unknown primitive ids are rejected", () => {
  const projectRoot = tempProject();
  writeMotion(
    projectRoot,
    proceduralFoundation.replace(
      "primitive: procedural.lissajous",
      "primitive: procedural.not-registered",
    ),
  );
  const result = runCheck(projectRoot);

  assert.equal(result.status, 1, result.stderr || result.stdout);
  const report = JSON.parse(result.stdout);
  assert.equal(report.status, "invalid");
  assert.match(report.error, /unknown primitive/i);
});

test("a primitive mention outside the vocabulary does not satisfy the contract", () => {
  const projectRoot = tempProject();
  writeMotion(
    projectRoot,
    proceduralFoundation
      .replace("- primitive: procedural.lissajous", "No primitive selected.")
      .replace(
        "- 拒绝: 外部仓库的 JavaScript、DOM 和渲染循环。",
        "- 拒绝: 外部仓库的 JavaScript、DOM 和渲染循环；primitive: procedural.lissajous。",
      ),
  );
  const result = runCheck(projectRoot);

  assert.equal(result.status, 1, result.stderr || result.stdout);
  const report = JSON.parse(result.stdout);
  assert.equal(report.status, "invalid");
  assert.match(report.error, /must select/i);
});

test("required headings cannot mix English and Chinese", () => {
  const projectRoot = tempProject();
  writeMotion(
    projectRoot,
    staticFoundation.replace("## Runtime Policy", "## 运行时策略"),
  );
  const result = runCheck(projectRoot);

  assert.equal(result.status, 1, result.stderr || result.stdout);
  const report = JSON.parse(result.stdout);
  assert.equal(report.status, "invalid");
  assert.match(report.error, /consistently English or Chinese/i);
});

test("primitive registry parses with unique ids and clean-room provenance", () => {
  const registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
  assert.equal(registry.schema, "design-pipeline.motion-primitives.v1");
  assert.equal(registry.implementationPolicy.codeCopied, false);
  assert.ok(registry.primitives.length >= 7);

  const ids = registry.primitives.map((primitive) => primitive.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const primitive of registry.primitives) {
    assert.match(primitive.id, /^[a-z0-9]+(?:[.-][a-z0-9]+)+$/);
    assert.equal(primitive.provenance.codeCopied, false);
    assert.ok(primitive.reducedMotion.length > 0);
  }
});

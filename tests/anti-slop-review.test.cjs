const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const repoRoot = path.resolve(__dirname, "..");
const evaluator = path.join(repoRoot, "skill", "scripts", "evaluate-anti-slop.cjs");
const rubric = path.join(repoRoot, "skill", "references", "anti-slop-rubric.json");
const fixtureRoot = path.join(__dirname, "fixtures", "anti-slop");
const roots = new Set();

function makeRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "design-pipeline-anti-slop-"));
  roots.add(root);
  return root;
}

test.after(() => {
  for (const root of roots) fs.rmSync(root, { recursive: true, force: true });
});

function runReview(root, evidence, ...args) {
  return spawnSync(
    process.execPath,
    [
      evaluator,
      "--root",
      root,
      "--rubric",
      rubric,
      "--evidence",
      evidence,
      "--json",
      ...args,
    ],
    {
      cwd: root,
      encoding: "utf8",
      env: {
        ...process.env,
        DESIGN_PIPELINE_NOW: "2026-07-19T10:15:00.000Z",
      },
    },
  );
}

function runReviewWithRubric(root, rubricPath, evidencePath, ...args) {
  return spawnSync(
    process.execPath,
    [
      evaluator,
      "--root",
      root,
      "--rubric",
      rubricPath,
      "--evidence",
      evidencePath,
      "--json",
      ...args,
    ],
    {
      cwd: root,
      encoding: "utf8",
      env: {
        ...process.env,
        DESIGN_PIPELINE_NOW: "2026-07-19T10:15:00.000Z",
      },
    },
  );
}

function parseReview(result) {
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return JSON.parse(result.stdout);
}

test("rubric separates hard, contextual, and preference rules", () => {
  const parsed = JSON.parse(fs.readFileSync(rubric, "utf8"));
  assert.equal(parsed.schema, "design-pipeline.anti-slop-rubric.v1");
  assert.ok(parsed.sources.some((source) => source.id === "pols-anti-slop-law"));
  assert.match(parsed.sources[0].contentHash, /^[a-f0-9]{64}$/);
  assert.deepEqual(
    [...new Set(parsed.rules.map((rule) => rule.severity))].sort(),
    ["contextual", "hard", "preference"],
  );
  assert.equal(new Set(parsed.rules.map((rule) => rule.id)).size, parsed.rules.length);
});

test("Arknights trial blocks verification gaps, not intentional signal-dark style", () => {
  const root = makeRoot();
  const output = parseReview(
    runReview(root, path.join(fixtureRoot, "arknights.json")),
  );
  const report = output.report;
  const blockerIds = report.findings
    .filter((finding) => finding.level === "blocker")
    .map((finding) => finding.ruleId);

  assert.equal(report.status, "blocked");
  assert.deepEqual(blockerIds.sort(), [
    "controls-are-real-and-operable",
    "reduced-motion-path",
    "responsive-content-integrity",
  ]);
  assert.ok(
    report.acceptedContexts.some(
      (finding) => finding.ruleId === "fashion-tell-advisory",
    ),
  );
  assert.ok(
    report.acceptedContexts.some(
      (finding) => finding.ruleId === "decorative-effects-serve-purpose",
    ),
  );
  assert.ok(fs.existsSync(path.join(root, output.output)));
});

test("Endfield trial preserves ink-light art direction and blocks unverified hard evidence", () => {
  const root = makeRoot();
  const output = parseReview(
    runReview(root, path.join(fixtureRoot, "endfield.json")),
  );
  const report = output.report;
  const blockerIds = report.findings
    .filter((finding) => finding.level === "blocker")
    .map((finding) => finding.ruleId);

  assert.equal(report.status, "blocked");
  assert.deepEqual(blockerIds.sort(), [
    "controls-are-real-and-operable",
    "reduced-motion-path",
    "responsive-content-integrity",
  ]);
  assert.ok(
    report.acceptedContexts.some(
      (finding) => finding.ruleId === "fashion-tell-advisory",
    ),
  );
  assert.ok(
    report.acceptedContexts.some(
      (finding) => finding.ruleId === "product-grounded-signature",
    ),
  );
});

test("a fully evidenced target can pass with documented contextual decisions", () => {
  const root = makeRoot();
  const rubricData = JSON.parse(fs.readFileSync(rubric, "utf8"));
  const observations = rubricData.rules.map((rule) => ({
    ruleId: rule.id,
    outcome:
      rule.severity === "hard" ? "pass" : "accepted-context",
    evidence: [`Reviewed ${rule.id} against the implemented target.`],
    rationale:
      rule.severity === "hard"
        ? undefined
        : "The choice is deliberate, cohesive, and grounded in the product brief.",
  }));
  const evidencePath = path.join(root, "complete.json");
  fs.writeFileSync(
    evidencePath,
    `${JSON.stringify(
      {
        schema: "design-pipeline.anti-slop-evidence.v1",
        target: { id: "complete-target", surface: "marketing" },
        observations,
      },
      null,
      2,
    )}\n`,
  );

  const report = parseReview(runReview(root, evidencePath)).report;
  assert.equal(report.status, "pass");
  assert.equal(report.summary.blockers, 0);
  assert.equal(report.summary.warnings, 0);
  assert.ok(report.summary.acceptedContexts > 0);
});

test("missing hard evidence and attempts to waive hard rules fail closed", () => {
  const root = makeRoot();
  const evidencePath = path.join(root, "invalid.json");
  fs.writeFileSync(
    evidencePath,
    `${JSON.stringify({
      schema: "design-pipeline.anti-slop-evidence.v1",
      target: { id: "invalid-target", surface: "marketing" },
      observations: [
        {
          ruleId: "content-available-without-motion",
          outcome: "accepted-context",
          evidence: ["The reveal animation is part of the visual style."],
          rationale: "Keep the animation.",
        },
      ],
    })}\n`,
  );

  const result = runReview(root, evidencePath);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /hard rule content-available-without-motion cannot use accepted-context/);
});

test("rejects malformed rubric rule fields without evaluating evidence", () => {
  const root = makeRoot();
  const evidencePath = path.join(fixtureRoot, "arknights.json");
  const source = JSON.parse(fs.readFileSync(rubric, "utf8"));
  const cases = [
    {
      mutate(rule) {
        rule.title = "";
      },
      message: /rule content-available-without-motion title is required/,
    },
    {
      mutate(rule) {
        rule.sourceIds = ["missing-source"];
      },
      message: /rule content-available-without-motion has unknown source missing-source/,
    },
    {
      mutate(rule) {
        rule.exceptionPolicy = "documented-context";
      },
      message: /rule content-available-without-motion exceptionPolicy must be none/,
    },
  ];

  for (const [index, current] of cases.entries()) {
    const changed = structuredClone(source);
    current.mutate(changed.rules[0]);
    const rubricPath = path.join(root, `invalid-rubric-${index}.json`);
    fs.writeFileSync(rubricPath, `${JSON.stringify(changed, null, 2)}\n`);
    const result = spawnSync(
      process.execPath,
      [
        evaluator,
        "--root",
        root,
        "--rubric",
        rubricPath,
        "--evidence",
        evidencePath,
        "--json",
      ],
      { cwd: root, encoding: "utf8" },
    );
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, current.message);
  }
});

test("rejects rubric policy, source metadata, and target surfaces outside the schema", () => {
  const root = makeRoot();
  const evidence = JSON.parse(
    fs.readFileSync(path.join(fixtureRoot, "arknights.json"), "utf8"),
  );
  const rubricData = JSON.parse(fs.readFileSync(rubric, "utf8"));
  const cases = [
    {
      rubric: structuredClone(rubricData),
      evidence: structuredClone(evidence),
      mutate(current) {
        current.rubric.policy.blockingSeverities = ["contextual"];
      },
      message: /rubric policy is invalid/,
    },
    {
      rubric: structuredClone(rubricData),
      evidence: structuredClone(evidence),
      mutate(current) {
        current.rubric.sources[0].observedAt = null;
      },
      message: /observedAt is invalid/,
    },
    {
      rubric: structuredClone(rubricData),
      evidence: structuredClone(evidence),
      mutate(current) {
        current.evidence.target.surface = "unknown-surface";
      },
      message: /evidence target surface is invalid/,
    },
  ];

  for (const [index, current] of cases.entries()) {
    current.mutate(current);
    const rubricPath = path.join(root, `schema-rubric-${index}.json`);
    const evidencePath = path.join(root, `schema-evidence-${index}.json`);
    fs.writeFileSync(rubricPath, `${JSON.stringify(current.rubric, null, 2)}\n`);
    fs.writeFileSync(evidencePath, `${JSON.stringify(current.evidence, null, 2)}\n`);
    const result = spawnSync(
      process.execPath,
      [
        evaluator,
        "--root",
        root,
        "--rubric",
        rubricPath,
        "--evidence",
        evidencePath,
        "--json",
      ],
      { cwd: root, encoding: "utf8" },
    );
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, current.message);
  }
});

test("rejects malformed evidence and output paths outside the project root", () => {
  const root = makeRoot();
  const evidencePath = path.join(root, "malformed.json");
  fs.writeFileSync(evidencePath, "null\n");

  const malformed = runReview(root, evidencePath);
  assert.notEqual(malformed.status, 0);
  assert.match(malformed.stderr, /evidence must contain a JSON object/);

  const unsafe = runReview(
    root,
    path.join(fixtureRoot, "arknights.json"),
    "--output",
    path.join(root, "..", "escape.json"),
  );
  assert.notEqual(unsafe.status, 0);
  assert.match(unsafe.stderr, /--output must stay inside --root/);
});

test("rejects output paths whose existing parent resolves outside the project root", () => {
  const root = makeRoot();
  const outside = makeRoot();
  const linkedOutput = path.join(root, "linked-output");
  fs.symlinkSync(
    outside,
    linkedOutput,
    process.platform === "win32" ? "junction" : "dir",
  );

  const result = runReview(
    root,
    path.join(fixtureRoot, "arknights.json"),
    "--output",
    "linked-output/report.json",
  );

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /--output must stay inside --root/);
  assert.equal(fs.existsSync(path.join(outside, "report.json")), false);
});

test("rejects unknown rubric and evidence properties declared invalid by the schemas", () => {
  const root = makeRoot();
  const rubricData = JSON.parse(fs.readFileSync(rubric, "utf8"));
  const evidenceData = JSON.parse(
    fs.readFileSync(path.join(fixtureRoot, "arknights.json"), "utf8"),
  );
  const cases = [
    {
      mutate(current) {
        current.rubric.unsupported = true;
      },
      message: /rubric has unsupported properties: unsupported/i,
    },
    {
      mutate(current) {
        current.rubric.policy.extraPolicy = true;
      },
      message: /rubric policy has unsupported properties: extraPolicy/i,
    },
    {
      mutate(current) {
        current.rubric.sources[0].unsupported = true;
      },
      message: /rubric source .* unsupported properties: unsupported/i,
    },
    {
      mutate(current) {
        current.rubric.rules[0].unsupported = true;
      },
      message: /rubric rule .* unsupported properties: unsupported/i,
    },
    {
      mutate(current) {
        current.evidence.unsupported = true;
      },
      message: /evidence has unsupported properties: unsupported/i,
    },
    {
      mutate(current) {
        current.evidence.target.unsupported = true;
      },
      message: /evidence target has unsupported properties: unsupported/i,
    },
    {
      mutate(current) {
        current.evidence.observations[0].extraObservation = true;
      },
      message: /evidence observation .* unsupported properties: extraObservation/i,
    },
  ];

  for (const [index, current] of cases.entries()) {
    const values = {
      rubric: structuredClone(rubricData),
      evidence: structuredClone(evidenceData),
    };
    current.mutate(values);
    const rubricPath = path.join(root, `strict-rubric-${index}.json`);
    const evidencePath = path.join(root, `strict-evidence-${index}.json`);
    fs.writeFileSync(rubricPath, `${JSON.stringify(values.rubric, null, 2)}\n`);
    fs.writeFileSync(evidencePath, `${JSON.stringify(values.evidence, null, 2)}\n`);

    const result = runReviewWithRubric(root, rubricPath, evidencePath);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, current.message);
  }
});

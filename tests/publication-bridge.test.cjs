const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const repoRoot = path.resolve(__dirname, "..");
const recordScript = path.join(repoRoot, "skill", "scripts", "record-feedback.cjs");
const prepareScript = path.join(repoRoot, "skill", "scripts", "prepare-publication.cjs");
const reconcileScript = path.join(repoRoot, "skill", "scripts", "reconcile-publication.cjs");
const roots = new Set();
const fixedEnv = {
  ...process.env,
  DESIGN_PIPELINE_NOW: "2026-07-19T00:00:00.000Z",
};

function makeRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "design-pipeline-publication-"));
  roots.add(root);
  return root;
}

test.after(() => {
  for (const root of roots) fs.rmSync(root, { recursive: true, force: true });
});

function run(script, root, args) {
  return spawnSync(process.execPath, [script, "--root", root, "--json", ...args], {
    cwd: root,
    encoding: "utf8",
    env: fixedEnv,
  });
}

function record(root, route = "issue") {
  const args = [
    "--kind",
    "feature-request",
    "--source",
    "maintainer",
    "--title",
    "Add a stable contribution bridge",
    "--summary",
    "A reviewed local finding needs an authorized host publication contract.",
    "--route",
    route === "pull_request" ? "pr" : "issue",
    "--evidence",
    "OpenSpec change accepted",
  ];
  if (route === "pull_request") {
    args.push(
      "--changed-file",
      "skill/scripts/prepare-publication.cjs",
      "--validation",
      "node --test passed",
    );
  }
  const result = run(recordScript, root, args);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return JSON.parse(result.stdout);
}

function prepare(root, observation, ...extra) {
  return run(prepareScript, root, [
    "--observation",
    observation.observation.id,
    "--repository",
    "2233admin/design-pipeline",
    ...extra,
  ]);
}

function writeReceipt(root, request, overrides = {}) {
  const receipt = {
    schema: "design-pipeline.publication-receipt.v1",
    idempotencyKey: request.idempotencyKey,
    action: request.action,
    repository: request.repository,
    remote: {
      url:
        request.action === "issue"
          ? "https://github.com/2233admin/design-pipeline/issues/42"
          : "https://github.com/2233admin/design-pipeline/pull/42",
      number: 42,
      state: "open",
      createdAt: "2026-07-19T00:00:00.000Z",
    },
    ...overrides,
  };
  const file = path.join(root, "receipt.json");
  fs.writeFileSync(file, `${JSON.stringify(receipt, null, 2)}\n`);
  return { file: "receipt.json", receipt };
}

test("prepares an idempotent Issue request without publishing", () => {
  const root = makeRoot();
  const observation = record(root);

  const first = prepare(root, observation);
  const second = prepare(root, observation);

  assert.equal(first.status, 0, first.stderr || first.stdout);
  assert.equal(second.status, 0, second.stderr || second.stdout);
  const one = JSON.parse(first.stdout);
  const two = JSON.parse(second.stdout);
  assert.equal(one.request.action, "issue");
  assert.equal(one.request.authority.state, "required");
  assert.equal(one.remotePublished, false);
  assert.equal(one.request.idempotencyKey, two.request.idempotencyKey);
  assert.equal(two.created, false);
  assert.ok(fs.existsSync(path.join(root, one.path)));
});

test("requires base, changed files, and validation for a pull request", () => {
  const root = makeRoot();
  const issueObservation = record(root);
  const missingEvidence = prepare(
    root,
    issueObservation,
    "--action",
    "pull_request",
    "--base",
    "main",
  );
  assert.notEqual(missingEvidence.status, 0);

  const prRoot = makeRoot();
  const prObservation = record(prRoot, "pull_request");
  const missingBase = prepare(prRoot, prObservation, "--action", "pull_request");
  assert.notEqual(missingBase.status, 0);
  const prepared = prepare(
    prRoot,
    prObservation,
    "--action",
    "pull_request",
    "--base",
    "main",
  );
  assert.equal(prepared.status, 0, prepared.stderr || prepared.stdout);
  const request = JSON.parse(prepared.stdout).request;
  assert.equal(request.action, "pull_request");
  assert.equal(request.baseBranch, "main");
  assert.deepEqual(request.changedFiles, ["skill/scripts/prepare-publication.cjs"]);
});

test("rejects mismatched receipts without mutating feedback state", () => {
  const root = makeRoot();
  const observation = record(root);
  const prepared = JSON.parse(prepare(root, observation).stdout);
  const { file } = writeReceipt(root, prepared.request, {
    idempotencyKey: "0".repeat(64),
  });
  const observationPath = path.join(
    root,
    ".design-pipeline",
    "feedback",
    "observations",
    `${observation.observation.id}.json`,
  );
  const indexPath = path.join(root, ".design-pipeline", "feedback", "index.json");
  const beforeObservation = fs.readFileSync(observationPath, "utf8");
  const beforeIndex = fs.readFileSync(indexPath, "utf8");

  const result = run(reconcileScript, root, [
    "--request",
    prepared.path,
    "--receipt",
    file,
  ]);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /idempotency key does not match/i);
  assert.equal(fs.readFileSync(observationPath, "utf8"), beforeObservation);
  assert.equal(fs.readFileSync(indexPath, "utf8"), beforeIndex);
});

test("rejects a receipt URL that does not match repository, action, and number", () => {
  for (const remote of [
    {
      url: "https://evil.example/2233admin/design-pipeline/issues/42",
      number: 42,
      state: "open",
      createdAt: "2026-07-19T00:00:00.000Z",
    },
    {
      url: "https://github.com/other/repository/issues/42",
      number: 42,
      state: "open",
      createdAt: "2026-07-19T00:00:00.000Z",
    },
    {
      url: "https://github.com/2233admin/design-pipeline/pull/42",
      number: 42,
      state: "open",
      createdAt: "2026-07-19T00:00:00.000Z",
    },
    {
      url: "https://github.com/2233admin/design-pipeline/issues/99",
      number: 42,
      state: "open",
      createdAt: "2026-07-19T00:00:00.000Z",
    },
  ]) {
    const root = makeRoot();
    const observation = record(root);
    const prepared = JSON.parse(prepare(root, observation).stdout);
    const { file } = writeReceipt(root, prepared.request, { remote });

    const result = run(reconcileScript, root, [
      "--request",
      prepared.path,
      "--receipt",
      file,
    ]);

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /URL does not match/i);
  }
});

test("reconciles a host receipt locally and remains idempotent", () => {
  const root = makeRoot();
  const observationResult = record(root);
  const prepared = JSON.parse(prepare(root, observationResult).stdout);
  const { file } = writeReceipt(root, prepared.request);

  const first = run(reconcileScript, root, [
    "--request",
    prepared.path,
    "--receipt",
    file,
  ]);
  const second = run(reconcileScript, root, [
    "--request",
    prepared.path,
    "--receipt",
    file,
  ]);

  assert.equal(first.status, 0, first.stderr || first.stdout);
  assert.equal(second.status, 0, second.stderr || second.stdout);
  assert.equal(JSON.parse(first.stdout).reconciled, true);
  assert.equal(JSON.parse(second.stdout).reconciled, false);
  const observationPath = path.join(
    root,
    ".design-pipeline",
    "feedback",
    "observations",
    `${observationResult.observation.id}.json`,
  );
  const observation = JSON.parse(fs.readFileSync(observationPath, "utf8"));
  const index = JSON.parse(
    fs.readFileSync(path.join(root, ".design-pipeline", "feedback", "index.json"), "utf8"),
  );
  const indexEntry = index.observations.find((item) => item.id === observation.id);
  assert.equal(observation.privacy.remotePublished, true);
  assert.equal(observation.publication.url, prepared.request.action === "issue"
    ? "https://github.com/2233admin/design-pipeline/issues/42"
    : "https://github.com/2233admin/design-pipeline/pull/42");
  assert.equal(indexEntry.remoteUrl, observation.publication.url);
});

test("does not erase a reconciled publication when the finding recurs", () => {
  const root = makeRoot();
  const observationResult = record(root);
  const prepared = JSON.parse(prepare(root, observationResult).stdout);
  const { file } = writeReceipt(root, prepared.request);
  assert.equal(
    run(reconcileScript, root, ["--request", prepared.path, "--receipt", file]).status,
    0,
  );

  const repeated = record(root);

  const observation = JSON.parse(
    fs.readFileSync(
      path.join(
        root,
        ".design-pipeline",
        "feedback",
        "observations",
        `${observationResult.observation.id}.json`,
      ),
      "utf8",
    ),
  );
  assert.equal(repeated.observation.id, observation.id);
  assert.equal(observation.occurrences, 2);
  assert.equal(observation.privacy.remotePublished, true);
  assert.equal(observation.publication.url, "https://github.com/2233admin/design-pipeline/issues/42");
  const draft = fs.readFileSync(path.join(root, observation.draftPath), "utf8");
  assert.doesNotMatch(draft, /Remote publication: not performed/i);
  assert.match(draft, /https:\/\/github\.com\/2233admin\/design-pipeline\/issues\/42/);
});

test("fails closed for a conflicting second receipt", () => {
  const root = makeRoot();
  const observationResult = record(root);
  const prepared = JSON.parse(prepare(root, observationResult).stdout);
  const { file } = writeReceipt(root, prepared.request);
  assert.equal(
    run(reconcileScript, root, ["--request", prepared.path, "--receipt", file]).status,
    0,
  );
  writeReceipt(root, prepared.request, {
    remote: {
      url: "https://github.com/2233admin/design-pipeline/issues/99",
      number: 99,
      state: "open",
      createdAt: "2026-07-19T00:00:00.000Z",
    },
  });

  const conflict = run(reconcileScript, root, [
    "--request",
    prepared.path,
    "--receipt",
    file,
  ]);

  assert.notEqual(conflict.status, 0);
  assert.match(conflict.stderr, /different publication receipt/i);
});

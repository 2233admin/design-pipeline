"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const repoRoot = path.resolve(__dirname, "..");
const cli = path.join(repoRoot, "skill/scripts/designer-pipeline.cjs");
const packageResources = JSON.parse(fs.readFileSync(path.join(repoRoot, "skill/references/package-resources.json"), "utf8"));
const bundledRegistry = JSON.parse(fs.readFileSync(path.join(repoRoot, "skill/references/job-registry.json"), "utf8"));
const { canonicalJson, sha256 } = require("../skill/scripts/contract-utils.cjs");
const {
  KERNEL_STEPS,
  PLAN_SCHEMA,
  ROUTE_SCHEMA,
  buildJobPlan,
  loadJobRegistry,
  routeJob,
  validateJobPlan,
  validateJobRegistry,
} = require("../skill/scripts/job-route-core.cjs");

function run(args, cwd = repoRoot) {
  const child = spawnSync(process.execPath, [cli, ...args, "--json"], {
    cwd,
    encoding: "utf8",
    windowsHide: true,
  });
  let output;
  try { output = JSON.parse(child.stdout); } catch { output = { stdout: child.stdout, stderr: child.stderr }; }
  return { ...child, output };
}

function knowledge(id, command, action, admission) {
  return { id, command, action, admission };
}

function job(overrides) {
  return {
    id: "product-design",
    activation: "default",
    priority: 0,
    keywords: ["design"],
    primaryKnowledge: knowledge("prism", "prism", "route", "inert"),
    secondaries: [],
    kernel: ["foundation", "toolchain"],
    ...overrides,
  };
}

function registry(jobs) {
  return { schema: "design-pipeline.job-registry.v1", version: "1", jobs };
}

test("packages the job registry, schemas, and dispatcher core", () => {
  assert.equal(loadJobRegistry().jobs.length, bundledRegistry.jobs.length);
  assert.equal(bundledRegistry.jobs.filter((entry) => entry.activation === "default").length, 1);
  for (const resource of [
    "scripts/job-route-core.cjs",
    "references/job-registry.json",
    "references/job-registry.schema.json",
    "references/job-route.schema.json",
    "references/job-plan.schema.json",
  ]) assert.ok(packageResources.required.includes(resource), resource);
});

test("invalid registries fail closed", () => {
  assert.throws(() => validateJobRegistry({ schema: "nope", version: "1", jobs: [job()] }), /unsupported job registry schema/);
  assert.throws(() => validateJobRegistry(registry([])), /job registry has no jobs/);
  assert.throws(() => validateJobRegistry(registry([job({ id: "a" }), job({ id: "a", activation: "explicit" })])), /duplicate job a/);
  assert.throws(() => validateJobRegistry(registry([job({ activation: "explicit" })])), /exactly one default job/);
  assert.throws(
    () => validateJobRegistry(registry([job(), job({ id: "other", activation: "default" })])),
    /exactly one default job/,
  );
  const missing = fs.mkdtempSync(path.join(os.tmpdir(), "design-pipeline-job-route-"));
  try {
    const file = path.join(missing, "broken.json");
    fs.writeFileSync(file, "{");
    assert.throws(() => loadJobRegistry(file), /cannot read job registry/);
  } finally {
    fs.rmSync(missing, { recursive: true, force: true });
  }
});

test("clone briefs dispatch to website-clone as the only primary", () => {
  const result = routeJob({ query: "clone this live landing page 1:1" });
  assert.equal(result.schema, ROUTE_SCHEMA);
  assert.equal(result.status, "ready");
  assert.equal(result.job, "website-clone");
  assert.equal(result.ambiguous, false);
  assert.equal(result.primaryKnowledge.id, "website-cloning");
  assert.deepEqual(result.secondaries, []);
  assert.ok(result.next.some((step) => step.command === "foundation" && step.role === "kernel"));
  assert.ok(result.next.some((step) => step.command === "toolchain" && step.role === "kernel"));
  assert.equal(result.next.filter((step) => step.role === "primary").length, 0);
  assert.deepEqual(KERNEL_STEPS.map((step) => step.command), ["foundation", "toolchain"]);

  const chinese = routeJob({ query: "复刻这个网站" });
  assert.equal(chinese.job, "website-clone");
  assert.equal(chinese.status, "ready");
});

test("explicit jobs beat scored jobs, and default catches unmatched briefs", () => {
  const explicit = routeJob({ query: "clone this gsap landing page" });
  assert.equal(explicit.job, "website-clone");

  const scored = routeJob({ query: "gsap scrolltrigger playbook" });
  assert.equal(scored.status, "ready");
  assert.equal(scored.job, "technique");
  assert.equal(scored.primaryKnowledge.admission, "inert");
  assert.equal(scored.secondaries[0].id, "prism");

  const fallback = routeJob({ query: "make a quiet operations dashboard" });
  assert.equal(fallback.job, "product-design");
  assert.equal(fallback.confidence, "low");
  assert.equal(fallback.primaryKnowledge.id, "prism");
});

test("equal explicit score and priority needs clarification instead of a silent primary", () => {
  const result = routeJob({ query: "clone this holosticker" });
  assert.equal(result.status, "needs-clarification");
  assert.equal(result.job, null);
  assert.equal(result.ambiguous, true);
  assert.equal(result.primaryKnowledge, null);
  assert.deepEqual(result.next, []);
  assert.ok(result.candidates.some((candidate) => candidate.id === "website-clone"));
  assert.ok(result.candidates.some((candidate) => candidate.id === "holosticker"));
});

test("selecting a catalog does not make it executable-ready", () => {
  const result = routeJob({ query: "ingest designmd.directory skills" });
  assert.equal(result.job, "designmd-ingest");
  assert.equal(result.primaryKnowledge.admission, "reference-only");
  assert.ok(result.next.some((step) => step.command === "designmd" && step.role === "primary" && step.required === true));
  assert.ok(result.next.some((step) => step.command === "prism" && step.role === "secondary" && step.required === false));

  const examples = routeJob({ query: "use dimabraven designmd-cli examples" });
  assert.equal(examples.job, "designmd-ingest");

  const motion = routeJob({ query: "make a tiktok caption animation" });
  assert.equal(motion.job, "motion-graphics");
  assert.equal(motion.primaryKnowledge.id, "iart");
  assert.equal(motion.primaryKnowledge.action, "route");
  assert.equal(motion.primaryKnowledge.admission, "inert");
});

test("a new job is a registry entry, not dispatcher source", () => {
  const extended = registry([
    ...bundledRegistry.jobs,
    job({
      id: "voice-over",
      activation: "explicit",
      priority: 90,
      keywords: ["voiceover", "配音"],
      primaryKnowledge: knowledge("hyperframes", "foundation", "check", "review"),
    }),
  ]);
  const result = routeJob({ query: "add a voiceover reel", registry: extended });
  assert.equal(result.status, "ready");
  assert.equal(result.job, "voice-over");
  assert.equal(result.primaryKnowledge.id, "hyperframes");
  assert.equal(result.primaryKnowledge.admission, "review");
});

test("public CLI routes ready briefs, clarifies ties, and rejects an extra action", () => {
  const ready = run(["route", "--root", repoRoot, "--query", "clone this landing page"]);
  assert.equal(ready.status, 0, ready.stderr || ready.stdout);
  assert.equal(ready.output.ok, true);
  assert.equal(ready.output.status, "ready");
  assert.equal(ready.output.job, "website-clone");

  const clarify = run(["route", "--root", repoRoot, "--query", "clone this holosticker"]);
  assert.equal(clarify.status, 2, clarify.stderr || clarify.stdout);
  assert.equal(clarify.output.ok, true);
  assert.equal(clarify.output.status, "needs-clarification");
  assert.equal(clarify.output.job, null);

  const invalid = run(["route", "search", "--root", repoRoot, "--query", "clone this landing page"]);
  assert.equal(invalid.status, 1);
  assert.equal(invalid.output.ok, false);
  assert.equal(invalid.output.error.code, "UNKNOWN_ARGUMENT");
});

test("CLI routes a newly registered job without changing dispatcher code", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "design-pipeline-job-route-cli-"));
  try {
    const file = path.join(root, "job-registry.json");
    fs.writeFileSync(file, `${JSON.stringify(registry([
      ...bundledRegistry.jobs,
      job({
        id: "voice-over",
        activation: "explicit",
        priority: 90,
        keywords: ["voiceover", "配音"],
        primaryKnowledge: knowledge("hyperframes", "foundation", "check", "review"),
      }),
    ]), null, 2)}\n`);
    const result = run(["route", "--root", root, "--registry", "job-registry.json", "--query", "配音"]);
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.equal(result.output.job, "voice-over");
    assert.equal(result.output.primaryKnowledge.id, "hyperframes");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("a ready route writes a stable job plan and freezes admission", () => {
  const route = routeJob({ query: "gsap scrolltrigger playbook" });
  const plan = buildJobPlan(route);
  assert.equal(plan.schema, PLAN_SCHEMA);
  assert.equal(plan.jobId, "technique");
  assert.equal(plan.admission, "inert");
  assert.equal(plan.admission, plan.primaryKnowledge.admission);
  const { planSha256, ...body } = plan;
  assert.equal(planSha256, sha256(canonicalJson(body)));
  assert.equal(buildJobPlan(route).planSha256, planSha256);
  assert.deepEqual(validateJobPlan(plan), plan);
});

test("clarification and blocked routes cannot be written as a job plan", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "design-pipeline-job-plan-"));
  try {
    const output = path.join(root, "job-plan.json");
    const clarify = run(["route", "--root", root, "--query", "clone this holosticker", "--write", "--output", "job-plan.json"]);
    assert.equal(clarify.status, 1);
    assert.equal(clarify.output.ok, false);
    assert.match(clarify.output.error.message, /only a ready route/);
    assert.equal(fs.existsSync(output), false);

    const ready = run(["route", "--root", root, "--query", "clone this landing page", "--write", "--output", "job-plan.json"]);
    assert.equal(ready.status, 0, ready.stderr || ready.stdout);
    assert.equal(ready.output.planSha256.length, 64);
    const written = JSON.parse(fs.readFileSync(output, "utf8"));
    assert.equal(written.schema, PLAN_SCHEMA);
    assert.equal(written.jobId, "website-clone");
    assert.equal(written.planSha256, ready.output.planSha256);
    assert.equal(written.admission, written.primaryKnowledge.admission);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

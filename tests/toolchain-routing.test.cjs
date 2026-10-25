"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { canonicalJson, sha256 } = require("../skill/scripts/contract-utils.cjs");
const { buildToolchainRequest, probeToolchain, resolveToolchain, validateToolchainReceipt } = require("../skill/scripts/toolchain-core.cjs");
const { buildJobPlan, routeJob } = require("../skill/scripts/job-route-core.cjs");

const references = path.resolve(__dirname, "../skill/references");
const read = (name) => JSON.parse(fs.readFileSync(path.join(references, name), "utf8"));
const sources = {
  frontendRegistry: read("frontend-stack-registry.json"),
  skillCatalog: read("mengto-skills-catalog.json"),
  adapterRegistry: read("adapter-registry.json"),
  graphicsCatalog: read("graphics-runtime-catalog.json"),
};

function request(overrides = {}) {
  const brief = overrides.brief || "Build a Reflex analytics page with an interactive XY chart";
  const jobPlan = buildJobPlan(routeJob({ query: brief }));
  return {
    jobId: jobPlan.jobId,
    jobPlanSha256: jobPlan.planSha256,
    jobPlanPath: "job-plan.json",
    deliverableForm: jobPlan.deliverableForm,
    schema: "design-pipeline.toolchain-request.v1",
    framework: "reflex",
    brief: "Build a Reflex analytics page with an interactive XY chart",
    requested: { styling: "tailwindcss", uiLibrary: "none" },
    graphics: { family: "vector-data" },
    ...overrides,
  };
}

test("Reflex and XY resolve into one executable toolchain plan", () => {
  const plan = resolveToolchain(request({
    context: {
      schema: "design-pipeline.adaptation-policy-input.v1",
      task: [{ id: "questions", dimension: "question-sequencing", value: "one-at-a-time" }],
      constraints: [{ id: "accessibility" }],
      gates: [],
    },
  }), sources, { jobPlan: buildJobPlan(routeJob({ query: request().brief })) });
  assert.equal(plan.status, "ready");
  assert.equal(plan.framework, "reflex");
  assert.equal(plan.styling.id, "tailwindcss");
  assert.equal(plan.graphics.id, "reflex-xy");
  assert.equal(plan.graphics.guide, "references/xy-charting.md");
  assert.equal(plan.primaryRouteId, "design-pipeline/core");
  assert.equal(plan.routingContext.rules[0].dimension, "question-sequencing");
  assert.ok(plan.tools.some(({ id }) => id === "reflex-xy"));
  assert.equal(plan.tools[0].id, plan.primaryRouteId);
  assert.deepEqual(plan.probes.find(({ toolId }) => toolId === "reflex-xy").command.slice(0, 2), ["python", "-c"]);
  assert.deepEqual(plan.invocations.find(({ toolId }) => toolId === "reflex-xy").command, ["reflex", "run"]);
  assert.ok(plan.verification.find(({ toolId }) => toolId === "reflex-xy").evidenceTypes.includes("static-export"));
});

test("toolchain resolution fails closed for incompatible or catalog-only graphics routes", () => {
  const incompatible = resolveToolchain(request({ framework: "react", graphics: { adapter: "reflex-xy" } }), sources, { jobPlan: buildJobPlan(routeJob({ query: request().brief })) });
  assert.equal(incompatible.status, "blocked");
  assert.ok(incompatible.blockers.includes("reflex-xy requires framework reflex or agnostic"));

  const referenceOnly = resolveToolchain(request({ graphics: { adapter: "apache-echarts" } }), sources, { jobPlan: buildJobPlan(routeJob({ query: request().brief })) });
  assert.equal(referenceOnly.status, "blocked");
  assert.ok(referenceOnly.blockers.some((item) => item.includes("reference-only")));
  assert.ok(referenceOnly.blockers.some((item) => item.includes("lifecycle")));
});

test("trusted probes report actual availability without mutating the target project", () => {
  const plan = resolveToolchain(request(), sources, { jobPlan: buildJobPlan(routeJob({ query: request().brief })) });
  const calls = [];
  const result = probeToolchain(plan, {
    root: path.resolve(__dirname, ".."),
    runner(command, args, options) {
      calls.push({ command, args, cwd: options.cwd });
      return { status: 0, stdout: "xy=0.0.6;reflex=0.8.0\n", stderr: "" };
    },
  });
  assert.equal(result.status, "ready");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].command, "python");
  assert.equal(calls[0].cwd, fs.realpathSync(path.resolve(__dirname, "..")));
  assert.equal(result.results.find(({ toolId }) => toolId === "reflex-xy").version, "xy=0.0.6;reflex=0.8.0");
});

test("toolchain resolve binds a matching job plan without copying the job id", () => {
  const jobPlan = buildJobPlan(routeJob({ query: "clone this landing page" }));
  const plan = resolveToolchain(request({
    framework: "react",
    brief: "clone this landing page",
    requested: { styling: "none", uiLibrary: "none" },
    graphics: undefined,
    jobId: jobPlan.jobId,
    jobPlanSha256: jobPlan.planSha256,
    jobPlanPath: "job-plan.json",
  }), sources, { jobPlan });
  assert.equal(plan.status, "ready");
  assert.equal(plan.jobId, "website-clone");
  assert.equal(plan.jobPlanSha256, jobPlan.planSha256);
  assert.notEqual(plan.primaryRouteId, plan.jobId);
});

test("graphics jobs require a selected runtime, including an existing project runtime", () => {
  const brief = "Build an interactive Three.js scene with a custom GLSL shader";
  const jobPlan = buildJobPlan(routeJob({ query: brief }));
  assert.equal(jobPlan.primaryKnowledge.id, "graphics-runtime");
  const input = request({ brief, framework: "agnostic", graphics: undefined, requested: { styling: "none", uiLibrary: "none" } });
  for (const choice of [{}, { existing: { graphics: {} } }, { existing: { graphics: "" } }]) {
    const missing = resolveToolchain({ ...input, ...choice }, sources, { jobPlan });
    assert.equal(missing.status, "blocked");
    assert.equal(missing.graphics, null);
    assert.ok(missing.blockers.some((item) => /graphics.*(?:family|adapter)/.test(item)));
    let invoked = false;
    assert.equal(probeToolchain(missing, { root: path.resolve(__dirname, ".."), runner() { invoked = true; } }).status, "blocked");
    assert.equal(invoked, false);
  }
  for (const choice of [{ graphics: { adapter: "threejs" } }, { existing: { graphics: "threejs" } }, { existing: { graphics: { adapter: "threejs" } } }]) {
    const resolved = resolveToolchain({ ...input, ...choice }, sources, { jobPlan });
    assert.equal(resolved.status, "ready");
    assert.equal(resolved.graphics.id, "threejs");
  }
  assert.throws(() => resolveToolchain({ ...input, existing: { graphics: "unknown-runtime" } }, sources, { jobPlan }), /unknown graphics adapter/);
});

test("request preparation preserves the real job plan and rejects conflicting or unsafe inputs", () => {
  const jobPlan = buildJobPlan(routeJob({ query: "Build an interactive Three.js scene with a custom GLSL shader" }));
  const choices = { framework: "agnostic", graphics: { adapter: "threejs" }, requested: { styling: "none", uiLibrary: "none" } };
  assert.equal(typeof buildToolchainRequest, "function", "typed request preparation must be available");
  const prepared = buildToolchainRequest(jobPlan, choices, "state/job-plan.json");
  assert.deepEqual(prepared, {
    schema: "design-pipeline.toolchain-request.v1",
    brief: jobPlan.query,
    jobId: jobPlan.jobId,
    jobPlanSha256: jobPlan.planSha256,
    jobPlanPath: "state/job-plan.json",
    deliverableForm: jobPlan.deliverableForm,
    ...choices,
  });
  assert.equal(resolveToolchain(prepared, sources, { jobPlan }).graphics.id, "threejs");
  assert.deepEqual(buildToolchainRequest(jobPlan, prepared, "state/job-plan.json"), prepared);
  assert.throws(() => buildToolchainRequest(jobPlan, {}, "job-plan.json"), /framework/);
  for (const conflict of [
    { schema: "unsupported" },
    { brief: "Another interactive Three.js scene" },
    { jobId: "website-clone" },
    { jobPlanSha256: "0".repeat(64) },
    { jobPlanPath: "other.json" },
    { deliverableForm: "product-launch-video" },
  ]) assert.throws(() => buildToolchainRequest(jobPlan, { ...choices, ...conflict }, "state/job-plan.json"), /conflict/);
  assert.throws(() => buildToolchainRequest({ ...jobPlan, query: `${jobPlan.query} changed` }, choices, "job-plan.json"), /hash does not match/);
  assert.throws(() => buildToolchainRequest(jobPlan, { ...choices, unused: true }, "job-plan.json"), /unsupported properties/);
  assert.throws(() => buildToolchainRequest(jobPlan, { ...choices, graphics: { adapter: "threejs", unused: true } }, "job-plan.json"), /unsupported properties/);
  for (const [unsafe, message] of [
    ["../job-plan.json", /contained relative path: '\.\.' segments/],
    ["a/../../job-plan.json", /contained relative path: '\.\.' segments/],
    ["a/../job-plan.json", /contained relative path: '\.\.' segments/],
    ["..\\job-plan.json", /contained relative path: '\.\.' segments/],
    ["/tmp/job-plan.json", /contained relative path: absolute paths/],
    ["C:\\temp\\job-plan.json", /contained relative path: drive letters/],
    ["C:job-plan.json", /contained relative path: drive letters/],
    [".", /contained relative path: it must name a file/],
  ]) {
    assert.throws(() => buildToolchainRequest(jobPlan, choices, unsafe), message, unsafe);
  }
  assert.equal(buildToolchainRequest(jobPlan, choices, "state\\job-plan.json").jobPlanPath, "state/job-plan.json");
});

test("targetRoot names the target package directory, is canonical, and is bound by the plan hash", () => {
  const jobPlan = buildJobPlan(routeJob({ query: request().brief }));
  const hash = (value) => sha256(canonicalJson(value));
  const omitted = resolveToolchain(request(), sources, { jobPlan });
  assert.equal(omitted.targetRoot, ".", "an omitted targetRoot resolves to the --root directory");
  assert.equal(hash(resolveToolchain(request({ targetRoot: "." }), sources, { jobPlan })), hash(omitted));
  const nested = resolveToolchain(request({ targetRoot: "app" }), sources, { jobPlan });
  assert.equal(nested.targetRoot, "app");
  assert.notEqual(hash(nested), hash(omitted), "changing targetRoot changes the plan hash");
  assert.notEqual(hash(resolveToolchain(request({ targetRoot: "apps/web" }), sources, { jobPlan })), hash(nested));
  for (const spelling of ["app/", "./app", "app\\", "./app/", "app/./"]) {
    assert.equal(canonicalJson(resolveToolchain(request({ targetRoot: spelling }), sources, { jobPlan })), canonicalJson(nested), spelling);
  }
  for (const spelling of ["./", ".\\"]) assert.equal(resolveToolchain(request({ targetRoot: spelling }), sources, { jobPlan }).targetRoot, ".", spelling);
  assert.equal(resolveToolchain(request({ targetRoot: "apps\\web\\" }), sources, { jobPlan }).targetRoot, "apps/web");

  const graphicsPlan = buildJobPlan(routeJob({ query: "Build an interactive Three.js scene with a custom GLSL shader" }));
  const choices = { framework: "agnostic", graphics: { adapter: "threejs" }, requested: { styling: "none", uiLibrary: "none" } };
  const withoutTarget = buildToolchainRequest(graphicsPlan, choices, "job-plan.json");
  assert.equal(Object.hasOwn(withoutTarget, "targetRoot"), false, "an omitted targetRoot keeps the request bytes unchanged");
  const prepared = buildToolchainRequest(graphicsPlan, { ...choices, targetRoot: "app" }, "job-plan.json");
  assert.deepEqual(prepared, { ...withoutTarget, targetRoot: "app" });
  for (const spelling of ["app/", "./app", "app\\"]) {
    assert.equal(canonicalJson(buildToolchainRequest(graphicsPlan, { ...choices, targetRoot: spelling }, "job-plan.json")), canonicalJson(prepared), spelling);
  }

  for (const [unsafe, message] of [
    ["../outside", /targetRoot must be a contained relative path: '\.\.' segments are not allowed/],
    ["app/../..", /targetRoot must be a contained relative path: '\.\.' segments are not allowed/],
    ["app/../other", /targetRoot must be a contained relative path: '\.\.' segments are not allowed/],
    ["/srv/app", /targetRoot must be a contained relative path: absolute paths are not allowed/],
    ["\\\\server\\share", /targetRoot must be a contained relative path: absolute paths are not allowed/],
    ["C:/x", /targetRoot must be a contained relative path: drive letters and ':' are not allowed/],
    ["C:\\x", /targetRoot must be a contained relative path: drive letters and ':' are not allowed/],
    ["app:web", /targetRoot must be a contained relative path: drive letters and ':' are not allowed/],
    ["", /targetRoot must be a non-empty string/],
    ["  ", /targetRoot must be a non-empty string/],
    [7, /targetRoot must be a non-empty string/],
  ]) {
    assert.throws(() => resolveToolchain(request({ targetRoot: unsafe }), sources, { jobPlan }), message, `resolve ${unsafe}`);
    assert.throws(() => buildToolchainRequest(graphicsPlan, { ...choices, targetRoot: unsafe }, "job-plan.json"), message, `request ${unsafe}`);
  }
});

test("toolchain resolve rejects missing and partial Stage 0 binding", () => {
  const bound = request();
  const jobPlan = buildJobPlan(routeJob({ query: bound.brief }));
  const { jobId, jobPlanSha256, jobPlanPath, deliverableForm, ...unbound } = bound;
  for (const fields of [{}, { jobId }, { jobPlanSha256 }, { jobPlanPath }, { jobId, jobPlanSha256, jobPlanPath }]) {
    assert.throws(() => resolveToolchain({ ...unbound, ...fields }, sources, { jobPlan }), /missing Stage 0 binding/);
  }
  assert.throws(() => resolveToolchain(bound, sources), /job plan is required/);
});

test("toolchain resolve rejects a drifted job plan", () => {
  const jobPlan = buildJobPlan(routeJob({ query: "clone this landing page" }));
  assert.throws(
    () => resolveToolchain(request({ jobPlanSha256: "a".repeat(64) }), sources, { jobPlan }),
    /does not match the job plan/,
  );
  assert.throws(
    () => resolveToolchain(request({ jobPlanSha256: jobPlan.planSha256, jobId: "technique" }), sources, { jobPlan }),
    /jobId does not match/,
  );
  assert.throws(
    () => resolveToolchain(request({ jobPlanSha256: jobPlan.planSha256 }), sources, { jobPlan: { ...jobPlan, schema: "nope" } }),
    /unsupported job plan schema/,
  );
});

test("probes run only in --root plus the plan's targetRoot and name that directory", () => {
  const temp = fs.realpathSync(os.tmpdir());
  const root = fs.realpathSync(fs.mkdtempSync(path.join(temp, "toolchain-target-root-")));
  const outside = fs.realpathSync(fs.mkdtempSync(path.join(temp, "toolchain-target-outside-")));
  const jobPlan = buildJobPlan(routeJob({ query: request().brief }));
  const plan = (targetRoot) => resolveToolchain(request(targetRoot === undefined ? {} : { targetRoot }), sources, { jobPlan });
  const cwds = [];
  const runner = (command, args, options) => {
    cwds.push(options.cwd);
    return { status: 1, stdout: "", stderr: "Traceback (most recent call last):\ninternal frame\nPackageNotFoundError: xy\n" };
  };
  try {
    fs.mkdirSync(path.join(root, "app"));
    fs.writeFileSync(path.join(root, "file.txt"), "");
    fs.symlinkSync(outside, path.join(root, "escape"), "junction");
    const result = probeToolchain(plan(), { root, runner });
    assert.equal(result.status, "blocked");
    assert.equal(result.results.find(({ toolId }) => toolId === "reflex-xy").message, "PackageNotFoundError: xy (probed in .)");
    assert.deepEqual(result.blockers, ["reflex-xy: PackageNotFoundError: xy (probed in .)"]);
    const nested = probeToolchain(plan("app"), { root, runner });
    assert.deepEqual(nested.blockers, ["reflex-xy: PackageNotFoundError: xy (probed in app)"]);
    assert.deepEqual(cwds, [root, path.join(root, "app")]);
    const missing = probeToolchain(plan(), { root, runner: () => ({ error: new Error("spawn python ENOENT") }) });
    assert.deepEqual(missing.blockers, ["reflex-xy: spawn python ENOENT (probed in .)"]);
    assert.throws(() => probeToolchain(plan(), { root, projectRoot: root, runner }), /probe options has unsupported properties: projectRoot/);
    assert.throws(() => probeToolchain(plan(), { runner }), /probe options is missing root/);
    assert.throws(() => probeToolchain(plan("missing"), { root, runner }), /targetRoot does not exist/);
    assert.throws(() => probeToolchain(plan("file.txt"), { root, runner }), /targetRoot must be a directory: file\.txt/);
    assert.throws(() => probeToolchain(plan("escape"), { root, runner }), /targetRoot resolves outside/);
    assert.equal(cwds.length, 2);
  } finally {
    for (const directory of [root, outside]) {
      const relative = path.relative(temp, directory);
      assert.ok(relative && !relative.startsWith("..") && !path.isAbsolute(relative));
      fs.rmSync(directory, { recursive: true, force: true });
    }
  }
});

test("Vite DevTools routes its project-local probe and evidence contract", () => {
  const plan = resolveToolchain(request({
    framework: "react",
    brief: "Use Vite DevTools to inspect the plugin graph",
    requested: { styling: "none", uiLibrary: "none" },
    graphics: undefined,
  }), sources, { jobPlan: buildJobPlan(routeJob({ query: request({ brief: "Use Vite DevTools to inspect the plugin graph" }).brief })) });
  const probe = plan.probes.find(({ toolId }) => toolId === "vitejs/devtools");
  const invocation = plan.invocations.find(({ toolId }) => toolId === "vitejs/devtools");
  const verification = plan.verification.find(({ toolId }) => toolId === "vitejs/devtools");
  assert.equal(probe.status, "review");
  assert.equal(probe.command, null);
  assert.equal(invocation.owner, "agent");
  assert.equal(invocation.status, "review");
  assert.equal(invocation.command, null);
  assert.ok(verification.evidenceTypes.includes("mounted-integrations"));
});

test("tool invocation receipts bind the plan, command, artifacts, and hashes", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "toolchain-receipt-"));
  const plan = resolveToolchain(request(), sources, { jobPlan: buildJobPlan(routeJob({ query: request().brief })) });
  const artifact = path.join(root, "chart.svg");
  fs.writeFileSync(artifact, "<svg></svg>");
  const receipt = {
    schema: "design-pipeline.toolchain-receipt.v1",
    id: "reflex-xy-smoke",
    planSha256: sha256(canonicalJson(plan)),
    status: "complete",
    tool: { id: "reflex-xy", version: "0.0.6" },
    invocation: { kind: "project-runtime", command: ["reflex", "run"], exitCode: 0 },
    startedAt: "2026-08-13T00:00:00.000Z",
    completedAt: "2026-08-13T00:00:01.000Z",
    artifacts: [{ type: "static-export", path: "chart.svg", sha256: crypto.createHash("sha256").update(fs.readFileSync(artifact)).digest("hex") }],
    evidenceReceipts: [],
    notes: [],
  };
  assert.deepEqual(validateToolchainReceipt(receipt, { evidenceRoot: root, requireFiles: true, plan }), {
    status: "complete",
    tool: "reflex-xy",
    artifacts: 1,
    evidenceReceipts: 0,
  });
  receipt.artifacts[0].sha256 = "0".repeat(64);
  assert.throws(() => validateToolchainReceipt(receipt, { evidenceRoot: root, requireFiles: true, plan }), /hash mismatch/);
});

test("product video binding rejects rewritten page briefs in either language", () => {
  for (const query of ["Create an HTML product launch video", "制作 HTML 产品发布宣传视频"]) {
    const jobPlan = buildJobPlan(routeJob({ query }));
    const input = request({ brief: query, framework: "agnostic", graphics: undefined });
    const plan = resolveToolchain(input, sources, { jobPlan });
    assert.equal(plan.jobId, "motion-graphics");
    assert.equal(plan.jobPlanSha256, jobPlan.planSha256);
    assert.equal(plan.deliverableForm, "product-launch-video");
    assert.ok(plan.tools.some(({ id }) => id === "heygen-com/hyperframes"));
    for (const brief of ["Build a scrollytelling page", "制作滚动叙事页面", "Build an interactive page", "制作交互页面"]) {
      assert.throws(() => resolveToolchain({ ...input, brief }, sources, { jobPlan }), /deliverable-form conflict/);
      const rewritten = buildJobPlan(routeJob({ query: brief }));
      assert.throws(() => resolveToolchain({ ...input, brief, deliverableForm: rewritten.deliverableForm }, sources, { jobPlan }), /deliverable-form conflict/);
    }
  }
});

test("both native Three.js routes probe only the pinned target runtime without invoking its server", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "toolchain-three-"));
  const local = path.join(root, "node_modules/three");
  fs.mkdirSync(local, { recursive: true });
  const installed = { name: "three", version: "0.180.0", main: "index.cjs" };
  const pkg = { dependencies: { three: "0.180.0" }, scripts: { dev: "node -e \"throw new Error('probe must not start the server')\"" } };
  const write = (name, value) => fs.writeFileSync(path.join(root, name), JSON.stringify(value));
  const brief = "Build an interactive Three.js scene with a custom GLSL shader";
  const jobPlan = buildJobPlan(routeJob({ query: brief }));
  try {
    for (const adapter of ["threejs", "threejs-fixed-camera"]) {
      const plan = resolveToolchain(request({
        brief, framework: "agnostic", requested: { styling: "none", uiLibrary: "none" },
        graphics: { adapter },
      }), sources, { jobPlan });
      assert.equal(plan.status, "ready");
      assert.equal(plan.graphics.guide, "references/graphics-runtime-routing.md#threejs-project-lifecycle");
      assert.deepEqual(plan.invocations.find(({ toolId }) => toolId === adapter).command, ["npm", "run", "dev"]);
      assert.deepEqual(plan.verification.find(({ toolId }) => toolId === adapter).evidenceTypes, ["scene", "screenshot", "performance"]);
      write("package.json", pkg);
      write("node_modules/three/package.json", installed);
      fs.writeFileSync(path.join(local, "index.cjs"), "module.exports = {};\n");
      const before = fs.readFileSync(path.join(root, "package.json"), "utf8");
      const result = probeToolchain(plan, { root });
      assert.equal(result.status, "ready");
      assert.equal(result.results.find(({ toolId }) => toolId === adapter).version, "three=0.180.0");
      assert.equal(fs.readFileSync(path.join(root, "package.json"), "utf8"), before);
      for (const [target, cause] of [
        [{ ...pkg, dependencies: {} }, /exact Three.js version/],
        [{ ...pkg, dependencies: { three: "^0.180.0" } }, /exact Three.js version/],
        [{ ...pkg, dependencies: { three: "0.179.0" } }, /version mismatch/],
        [{ ...pkg, scripts: {} }, /scripts.dev/],
        [{ ...pkg, scripts: { dev: "  " } }, /scripts.dev/],
      ]) {
        write("package.json", target);
        const failed = probeToolchain(plan, { root });
        assert.equal(failed.status, "blocked");
        assert.match(failed.blockers[0], cause);
        assert.equal(fs.readFileSync(path.join(root, "package.json"), "utf8"), JSON.stringify(target));
      }
      write("package.json", { devDependencies: pkg.dependencies, scripts: pkg.scripts });
      assert.equal(probeToolchain(plan, { root }).status, "ready");
      fs.writeFileSync(path.join(local, "index.cjs"), "throw new Error('local package import failed');\n");
      assert.match(probeToolchain(plan, { root }).blockers[0], /local package import failed/);
      fs.unlinkSync(path.join(local, "package.json"));
      assert.equal(probeToolchain(plan, { root }).status, "blocked");
    }
  } finally {
    const relative = path.relative(fs.realpathSync(os.tmpdir()), fs.realpathSync(root));
    assert.ok(relative && !relative.startsWith("..") && !path.isAbsolute(relative));
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("React with SVG/D3 resolves ready and probes only the pinned target d3 without invoking its server", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "toolchain-d3-"));
  const local = path.join(root, "node_modules/d3");
  fs.mkdirSync(path.join(local, "src"), { recursive: true });
  const installed = { name: "d3", version: "7.9.0", type: "module", main: "src/index.js", exports: { umd: "./dist/d3.min.js", default: "./src/index.js" } };
  const pkg = { type: "module", dependencies: { d3: "7.9.0" }, scripts: { dev: "node -e \"throw new Error('probe must not start the server')\"" } };
  const write = (name, value) => fs.writeFileSync(path.join(root, name), JSON.stringify(value));
  const entry = (source) => fs.writeFileSync(path.join(local, "src/index.js"), source);
  const brief = "Build a React analytics dashboard with D3 SVG charts";
  const jobPlan = buildJobPlan(routeJob({ query: brief }));
  try {
    const plan = resolveToolchain(request({
      brief, framework: "react", requested: { styling: "none", uiLibrary: "none" },
      graphics: { adapter: "svg-d3" },
    }), sources, { jobPlan });
    assert.equal(plan.status, "ready");
    assert.deepEqual(plan.blockers, []);
    assert.equal(plan.graphics.id, "svg-d3");
    assert.equal(plan.graphics.guide, "references/graphics-runtime-routing.md#svg-d3-project-lifecycle");
    assert.deepEqual(plan.probes.find(({ toolId }) => toolId === "svg-d3").command.slice(0, 2), ["node", "-e"]);
    assert.deepEqual(plan.invocations.find(({ toolId }) => toolId === "svg-d3").command, ["npm", "run", "dev"]);
    assert.deepEqual(plan.verification.find(({ toolId }) => toolId === "svg-d3").evidenceTypes, ["dom", "screenshot", "accessibility"]);

    const missing = probeToolchain(plan, { root });
    assert.equal(missing.status, "blocked");
    assert.match(missing.blockers[0], /^svg-d3: Cannot read the target project package\.json/);

    write("package.json", pkg);
    const withoutPackage = probeToolchain(plan, { root });
    assert.equal(withoutPackage.status, "blocked");
    assert.match(withoutPackage.blockers[0], /^svg-d3: Cannot resolve the d3 package of the target project at node_modules\/d3/);

    write("node_modules/d3/package.json", installed);
    entry("export function select() {}\n");
    const before = fs.readFileSync(path.join(root, "package.json"), "utf8");
    const result = probeToolchain(plan, { root });
    assert.deepEqual(result.blockers, []);
    assert.equal(result.status, "ready");
    assert.equal(result.results.find(({ toolId }) => toolId === "svg-d3").version, "d3=7.9.0");
    assert.equal(fs.readFileSync(path.join(root, "package.json"), "utf8"), before);
    for (const [target, cause] of [
      [{ ...pkg, dependencies: {} }, /exact d3 version/],
      [{ ...pkg, dependencies: { d3: "^7.9.0" } }, /exact d3 version/],
      [{ ...pkg, dependencies: { d3: "7.8.5" } }, /d3 version mismatch: declared 7\.8\.5, installed 7\.9\.0/],
      [{ ...pkg, scripts: {} }, /scripts\.dev/],
      [{ ...pkg, scripts: { dev: "  " } }, /scripts\.dev/],
    ]) {
      write("package.json", target);
      const failed = probeToolchain(plan, { root });
      assert.equal(failed.status, "blocked");
      assert.match(failed.blockers[0], cause);
      assert.equal(fs.readFileSync(path.join(root, "package.json"), "utf8"), JSON.stringify(target));
    }
    write("package.json", { devDependencies: pkg.dependencies, scripts: pkg.scripts });
    assert.equal(probeToolchain(plan, { root }).status, "ready");
    entry("export const scaleLinear = () => {};\n");
    assert.match(probeToolchain(plan, { root }).blockers[0], /does not export select/);
    entry("throw new Error('local package import failed');\n");
    assert.match(probeToolchain(plan, { root }).blockers[0], /local package import failed/);
    write("node_modules/d3/package.json", { ...installed, name: "not-d3" });
    assert.equal(probeToolchain(plan, { root }).status, "blocked");
  } finally {
    const relative = path.relative(fs.realpathSync(os.tmpdir()), fs.realpathSync(root));
    assert.ok(relative && !relative.startsWith("..") && !path.isAbsolute(relative));
    fs.rmSync(root, { recursive: true, force: true });
  }
});

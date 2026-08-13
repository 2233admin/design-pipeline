"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { canonicalJson, sha256 } = require("../skill/scripts/contract-utils.cjs");
const { probeToolchain, resolveToolchain, validateToolchainReceipt } = require("../skill/scripts/toolchain-core.cjs");

const references = path.resolve(__dirname, "../skill/references");
const read = (name) => JSON.parse(fs.readFileSync(path.join(references, name), "utf8"));
const sources = {
  frontendRegistry: read("frontend-stack-registry.json"),
  skillCatalog: read("mengto-skills-catalog.json"),
  adapterRegistry: read("adapter-registry.json"),
  graphicsCatalog: read("graphics-runtime-catalog.json"),
};

function request(overrides = {}) {
  return {
    schema: "design-pipeline.toolchain-request.v1",
    framework: "reflex",
    brief: "Build a Reflex analytics page with an interactive XY chart",
    requested: { styling: "tailwindcss", uiLibrary: "none" },
    graphics: { family: "vector-data" },
    ...overrides,
  };
}

test("Reflex and XY resolve into one executable toolchain plan", () => {
  const plan = resolveToolchain(request(), sources);
  assert.equal(plan.status, "ready");
  assert.equal(plan.framework, "reflex");
  assert.equal(plan.styling.id, "tailwindcss");
  assert.equal(plan.graphics.id, "reflex-xy");
  assert.equal(plan.graphics.guide, "references/xy-charting.md");
  assert.ok(plan.tools.some(({ id }) => id === "reflex-xy"));
  assert.deepEqual(plan.probes.find(({ toolId }) => toolId === "reflex-xy").command.slice(0, 2), ["python", "-c"]);
  assert.deepEqual(plan.invocations.find(({ toolId }) => toolId === "reflex-xy").command, ["reflex", "run"]);
  assert.ok(plan.verification.find(({ toolId }) => toolId === "reflex-xy").evidenceTypes.includes("static-export"));
});

test("toolchain resolution fails closed for incompatible or catalog-only graphics routes", () => {
  const incompatible = resolveToolchain(request({ framework: "react", graphics: { adapter: "reflex-xy" } }), sources);
  assert.equal(incompatible.status, "blocked");
  assert.ok(incompatible.blockers.includes("reflex-xy requires framework reflex or agnostic"));

  const referenceOnly = resolveToolchain(request({ graphics: { adapter: "apache-echarts" } }), sources);
  assert.equal(referenceOnly.status, "blocked");
  assert.ok(referenceOnly.blockers.some((item) => item.includes("reference-only")));
  assert.ok(referenceOnly.blockers.some((item) => item.includes("lifecycle")));
});

test("trusted probes report actual availability without mutating the target project", () => {
  const plan = resolveToolchain(request(), sources);
  const calls = [];
  const result = probeToolchain(plan, {
    projectRoot: path.resolve(__dirname, ".."),
    runner(command, args, options) {
      calls.push({ command, args, cwd: options.cwd });
      return { status: 0, stdout: "xy=0.0.6;reflex=0.8.0\n", stderr: "" };
    },
  });
  assert.equal(result.status, "ready");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].command, "python");
  assert.equal(result.results.find(({ toolId }) => toolId === "reflex-xy").version, "xy=0.0.6;reflex=0.8.0");
});

test("failed probes block with one actionable root-cause line", () => {
  const plan = resolveToolchain(request(), sources);
  const result = probeToolchain(plan, {
    projectRoot: path.resolve(__dirname, ".."),
    runner() {
      return { status: 1, stdout: "", stderr: "Traceback (most recent call last):\ninternal frame\nPackageNotFoundError: xy\n" };
    },
  });
  assert.equal(result.status, "blocked");
  assert.equal(result.results.find(({ toolId }) => toolId === "reflex-xy").message, "PackageNotFoundError: xy");
  assert.deepEqual(result.blockers, ["reflex-xy: PackageNotFoundError: xy"]);
});

test("tool invocation receipts bind the plan, command, artifacts, and hashes", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "toolchain-receipt-"));
  const plan = resolveToolchain(request(), sources);
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

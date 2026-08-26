"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");
const { canonicalJson, sha256 } = require("../skill/scripts/contract-utils.cjs");

const repoRoot = path.resolve(__dirname, "..");
const cli = path.join(repoRoot, "skill/scripts/designer-pipeline.cjs");
const skill = fs.readFileSync(path.join(repoRoot, "skill/SKILL.md"), "utf8");

function run(args, cwd = repoRoot) {
  const child = spawnSync(process.execPath, [cli, ...args, "--json"], { cwd, encoding: "utf8", windowsHide: true });
  let output;
  try { output = JSON.parse(child.stdout); } catch { output = { stdout: child.stdout, stderr: child.stderr }; }
  return { ...child, output };
}

function writeJson(file, value) {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function git(root, ...args) {
  const result = spawnSync("git", args, { cwd: root, encoding: "utf8", windowsHide: true });
  assert.equal(result.status, 0, result.stderr || result.stdout);
}

test("SKILL front-door commands are present in the public CLI contract", () => {
  assert.match(skill, /Use the public CLI for the complete lifecycle/);
  const help = run(["help"]).output.help;
  for (const [command, action] of [
    ["mengto", "search"],
    ["prism", "route"],
    ["prism", "search"],
    ["holosticker", "inspect"],
    ["designmd", "verify"],
    ["component", "resolve"],
    ["toolchain", "resolve"],
    ["execution", "route"],
  ]) {
    assert.match(skill, new RegExp(`(?:designer-pipeline\\s+)?${command}\\s+${action}`), `${command} ${action} is missing from SKILL.md`);
    assert.match(help, new RegExp(`\\b${command}[^\\n]*\\b${action}\\b`), `${command} ${action} is missing from public help`);
  }
});

test("SKILL front doors hand off to local CLI routes without MCP or external services", () => {
  const prism = run(["prism", "route", "--root", repoRoot, "--query", "检查这个界面的可访问性和对比度"]);
  assert.equal(prism.status, 0, prism.stderr || prism.stdout);
  assert.equal(prism.output.ok, true);
  assert.equal(prism.output.route, "ui-craft");

  const mengto = run(["mengto", "search", "--root", repoRoot, "--query", "progressive blur", "--limit", "1"]);
  assert.equal(mengto.status, 0, mengto.stderr || mengto.stdout);
  assert.equal(mengto.output.ok, true);
  assert.equal(fs.existsSync(mengto.output.results[0].skillPath), true);

  const holosticker = run(["holosticker", "inspect", "--root", repoRoot, "--capability", "die-cut-mask"]);
  assert.equal(holosticker.status, 0, holosticker.stderr || holosticker.stdout);
  assert.equal(holosticker.output.ok, true);
  assert.equal(holosticker.output.integration.adapter, "threejs");
});

test("SKILL toolchain handoff reaches execution route and rejects a tossed owner", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "skill-cli-handoff-"));
  try {
    git(root, "init", "-b", "main");
    git(root, "config", "user.email", "pipeline@example.test");
    git(root, "config", "user.name", "Design Pipeline Test");
    fs.writeFileSync(path.join(root, "README.md"), "# fixture\n");
    git(root, "add", ".");
    git(root, "commit", "-m", "fixture");

    writeJson(path.join(root, "toolchain-request.json"), {
      schema: "design-pipeline.toolchain-request.v1",
      framework: "react",
      brief: "Build a React settings page",
      requested: { styling: "none", uiLibrary: "none" },
    });
    const toolchain = run(["toolchain", "resolve", "--root", root, "--artifact", "toolchain-request.json", "--write", "--output", "toolchain-plan.json"]);
    assert.equal(toolchain.status, 0, toolchain.stderr || toolchain.stdout);
    assert.equal(toolchain.output.plan.primaryRouteId, "design-pipeline/core");

    const plan = JSON.parse(fs.readFileSync(path.join(root, "toolchain-plan.json"), "utf8"));
    const planHash = sha256(canonicalJson(plan));
    writeJson(path.join(root, "execution-request.json"), {
      schema: "design-pipeline.execution-request.v1",
      id: "skill-handoff",
      toolchainPlanSha256: planHash,
      preferredMode: "auto",
      isolation: "optional",
      routeId: plan.primaryRouteId,
      slices: [{ id: "ui", owner: plan.primaryRouteId, scope: ["README.md"] }],
    });
    const routed = run(["execution", "route", "--root", root, "--artifact", "execution-request.json", "--plan", "toolchain-plan.json", "--write", "--output", "execution-plan.json"]);
    assert.equal(routed.status, 0, routed.stderr || routed.stdout);
    assert.equal(routed.output.plan.routeId, plan.primaryRouteId);

    writeJson(path.join(root, "bad-execution-request.json"), {
      ...JSON.parse(fs.readFileSync(path.join(root, "execution-request.json"), "utf8")),
      routeId: "tossed-owner",
      slices: [{ id: "ui", owner: "tossed-owner", scope: ["README.md"] }],
    });
    const rejected = run(["execution", "route", "--root", root, "--artifact", "bad-execution-request.json", "--plan", "toolchain-plan.json"]);
    assert.equal(rejected.status, 1);
    assert.equal(rejected.output.ok, false);
    assert.match(rejected.output.error.message, /primary route/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

#!/usr/bin/env node
"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const zlib = require("node:zlib");
const { spawnSync } = require("node:child_process");

const repoRoot = path.resolve(__dirname, "..");
let failed = false;
function report(ok, label) { console.log(`${ok ? "OK" : "FAIL"} ${label}`); if (!ok) failed = true; return ok; }
function run(command, args, options = {}) {
  const child = spawnSync(command, args, { cwd: repoRoot, encoding: "utf8", windowsHide: true, maxBuffer: 16 * 1024 * 1024, ...options });
  if (options.echo !== false) { process.stdout.write(child.stdout || ""); process.stderr.write(child.stderr || ""); }
  return child;
}
function readJson(file) { return JSON.parse(fs.readFileSync(file, "utf8")); }
function hash(file) { return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex"); }
function statusBytes() {
  const child = spawnSync("git", ["status", "--porcelain=v2", "-z", "--untracked-files=all"], { cwd: repoRoot, encoding: "buffer", windowsHide: true });
  if (child.status !== 0) throw new Error(`git status failed: ${String(child.stderr)}`);
  return child.stdout;
}

function tarEntries(tgz) {
  const tar = zlib.gunzipSync(fs.readFileSync(tgz));
  const entries = [];
  for (let offset = 0; offset + 512 <= tar.length;) {
    const header = tar.subarray(offset, offset + 512);
    if (header.every((byte) => byte === 0)) break;
    const text = (start, length) => header.subarray(start, start + length).toString("utf8").replace(/\0.*$/, "");
    const name = text(0, 100);
    const prefix = text(345, 155);
    const size = Number.parseInt(text(124, 12).trim() || "0", 8);
    const type = String.fromCharCode(header[156] || 48);
    const fullName = prefix ? `${prefix}/${name}` : name;
    const dataStart = offset + 512;
    entries.push({ name: fullName, type, data: tar.subarray(dataStart, dataStart + size) });
    offset = dataStart + Math.ceil(size / 512) * 512;
  }
  return entries;
}

function extractTar(tgz, outputRoot) {
  const root = path.resolve(outputRoot);
  fs.mkdirSync(root, { recursive: true });
  for (const entry of tarEntries(tgz)) {
    const target = path.resolve(root, entry.name);
    const relative = path.relative(root, target);
    if (path.isAbsolute(relative) || relative === ".." || relative.startsWith(`..${path.sep}`)) throw new Error(`unsafe archive path ${entry.name}`);
    if (entry.type === "5") fs.mkdirSync(target, { recursive: true });
    else if (entry.type === "0" || entry.type === "\0") { fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, entry.data); }
    else throw new Error(`unsupported archive type ${entry.type} for ${entry.name}`);
  }
}

const statusBefore = statusBytes();
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "design-pipeline-hermetic-qa-"));
const isolatedHome = path.join(tempRoot, "home");
fs.mkdirSync(isolatedHome, { recursive: true });
const hermeticEnv = {
  ...process.env,
  HOME: isolatedHome,
  USERPROFILE: isolatedHome,
  CODEX_HOME: path.join(isolatedHome, ".codex"),
  CODEX_SKILLS_DIR: path.join(isolatedHome, ".codex", "skills"),
  HTTP_PROXY: "http://127.0.0.1:9",
  HTTPS_PROXY: "http://127.0.0.1:9",
  NO_PROXY: "",
  DESIGN_PIPELINE_NOW: "2026-07-23T00:00:00.000Z",
};

try {
  const requiredRepoFiles = ["README.md", "CHANGELOG.md", "LICENSE", "DESIGN.md", "MOTION.md", "THIRD_PARTY_NOTICES.md", "skill/SKILL.md", "scripts/package.cjs", "scripts/install-local.cjs", "scripts/test-manifest.json", "scripts/package-resources.json", "openspec/specs/design-pipeline/spec.md"];
  for (const file of requiredRepoFiles) report(fs.existsSync(path.join(repoRoot, file)), file);

  const skillText = fs.readFileSync(path.join(repoRoot, "skill/SKILL.md"), "utf8");
  const frontmatter = skillText.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  report(Boolean(frontmatter && /^name:\s*design-pipeline\s*$/m.test(frontmatter[1]) && /^description:\s*\S+/m.test(frontmatter[1])), "skill frontmatter");

  const testManifest = readJson(path.join(repoRoot, "scripts/test-manifest.json"));
  report(testManifest.schema === "design-pipeline.test-manifest.v1" && Array.isArray(testManifest.tests), "test manifest schema");
  const discoveredTests = fs.readdirSync(path.join(repoRoot, "tests")).filter((name) => name.endsWith(".test.cjs")).sort();
  const declaredTests = [...testManifest.tests].sort();
  report(JSON.stringify(discoveredTests) === JSON.stringify(declaredTests), "test manifest covers every tests/*.test.cjs");

  const resources = readJson(path.join(repoRoot, "scripts/package-resources.json"));
  report(resources.schema === "design-pipeline.package-resources.v1" && resources.packageRoot === "skill" && Array.isArray(resources.required) && Array.isArray(resources.generated), "package resource manifest schema");
  const packageRoot = path.join(repoRoot, resources.packageRoot);
  for (const file of resources.required) report(!path.isAbsolute(file) && !file.split(/[\\/]/).includes("..") && fs.existsSync(path.join(packageRoot, file)), `package resource ${file}`);
  for (const file of fs.readdirSync(path.join(packageRoot, "references")).filter((name) => name.endsWith(".json"))) {
    try { readJson(path.join(packageRoot, "references", file)); report(true, `JSON references/${file}`); }
    catch (error) { report(false, `JSON references/${file}: ${error.message}`); }
  }
  const packagedFiles = [];
  const visit = (directory) => { for (const entry of fs.readdirSync(directory, { withFileTypes: true })) { const file = path.join(directory, entry.name); if (fs.lstatSync(file).isSymbolicLink()) report(false, `package symlink ${path.relative(packageRoot, file)}`); else if (entry.isDirectory()) visit(file); else packagedFiles.push(file); } };
  visit(packageRoot);
  report(packagedFiles.length >= resources.required.length, `package tree discovered ${packagedFiles.length} files`);

  const syntaxFiles = [
    ...fs.readdirSync(path.join(repoRoot, "skill/scripts")).filter((name) => name.endsWith(".cjs")).map((name) => path.join(repoRoot, "skill/scripts", name)),
    ...fs.readdirSync(path.join(repoRoot, "skill/adapters")).filter((name) => name.endsWith(".cjs")).map((name) => path.join(repoRoot, "skill/adapters", name)),
    ...fs.readdirSync(path.join(repoRoot, "scripts")).filter((name) => name.endsWith(".cjs")).map((name) => path.join(repoRoot, "scripts", name)),
  ];
  for (const file of syntaxFiles) {
    const child = run(process.execPath, ["--check", file], { echo: false, env: hermeticEnv });
    report(child.status === 0, `syntax ${path.relative(repoRoot, file)}`);
  }

  const cli = path.join(repoRoot, "skill/scripts/designer-pipeline.cjs");
  for (const args of [
    ["doctor", "--root", repoRoot, "--json"],
    ["foundation", "check", "--root", repoRoot, "--project-root", repoRoot, "--json"],
    ["status", "--root", repoRoot, "--change-root", "openspec/changes/complete-executable-pipeline-p0-p3", "--json"],
    ["adapter", "audit", "--root", repoRoot, "--json"],
    ["style-signals", "check", "--root", repoRoot, "--json"],
  ]) {
    const child = run(process.execPath, [cli, ...args], { echo: false, env: hermeticEnv });
    let envelope = null; try { envelope = JSON.parse(child.stdout); } catch {}
    report(child.status === 0 && envelope?.ok === true && envelope?.schema === "design-pipeline.cli-result.v1", `CLI ${args.slice(0, 2).join(" ")}`);
  }

  const testFiles = testManifest.tests.map((name) => path.join(repoRoot, "tests", name));
  const tests = run(process.execPath, ["--test", ...testFiles], { env: hermeticEnv });
  report(tests.status === 0, `repository tests (${testManifest.tests.length} files)`);

  const packageScript = path.join(repoRoot, "scripts/package.cjs");
  const outputA = path.join(tempRoot, "package-a");
  const outputB = path.join(tempRoot, "package-b");
  const packageEnv = { ...hermeticEnv, PACKAGE_VERSION: "0.7.0-qa", SOURCE_DATE_EPOCH: "1784764800" };
  const packA = run(process.execPath, [packageScript, "--output-root", outputA], { env: packageEnv });
  const packB = run(process.execPath, [packageScript, "--output-root", outputB], { env: packageEnv });
  report(packA.status === 0 && packB.status === 0, "package to declared temporary roots");
  const artifacts = ["design-pipeline-skill.tgz", "design-pipeline-skill.zip", "checksums.txt"];
  for (const artifact of artifacts) report(fs.existsSync(path.join(outputA, artifact)) && hash(path.join(outputA, artifact)) === hash(path.join(outputB, artifact)), `reproducible ${artifact}`);
  const archiveNames = new Set(tarEntries(path.join(outputA, "design-pipeline-skill.tgz")).map((entry) => entry.name));
  for (const resource of resources.required) report(archiveNames.has(`design-pipeline/${resource.replaceAll("\\", "/")}`), `archive contains ${resource}`);
  for (const resource of resources.generated) report(archiveNames.has(`design-pipeline/${resource.replaceAll("\\", "/")}`), `archive contains generated ${resource}`);

  const hashesBeforeFailure = Object.fromEntries(artifacts.map((name) => [name, hash(path.join(outputA, name))]));
  const invalidPack = run(process.execPath, [packageScript, "--output-root", outputA], { echo: false, env: { ...packageEnv, SOURCE_DATE_EPOCH: "invalid" } });
  report(invalidPack.status !== 0 && artifacts.every((name) => hash(path.join(outputA, name)) === hashesBeforeFailure[name]), "invalid package input preserves existing artifacts");

  const extracted = path.join(tempRoot, "extracted");
  extractTar(path.join(outputA, "design-pipeline-skill.tgz"), extracted);
  const skillsRoot = path.join(isolatedHome, ".codex", "skills");
  const installed = path.join(skillsRoot, "design-pipeline");
  const installScript = path.join(extracted, "design-pipeline/scripts/install-local.cjs");
  const installArgs = [installScript, "--root", skillsRoot, "--target", installed, "--source", path.join(extracted, "design-pipeline")];
  report(run(process.execPath, installArgs, { echo: false, env: hermeticEnv }).status === 0, "isolated install from packaged archive");
  report(run(process.execPath, installArgs, { echo: false, env: hermeticEnv }).status !== 0, "install replacement requires --replace");
  report(run(process.execPath, [...installArgs, "--replace"], { echo: false, env: hermeticEnv }).status === 0, "explicit contained install replacement");
  report(run(process.execPath, [path.join(installed, "scripts/check-deps.cjs"), "--json"], { echo: false, env: hermeticEnv }).status === 0, "installed dependency self-check");

  const installedCliTests = run(process.execPath, ["--test", path.join(repoRoot, "tests/designer-pipeline-cli.test.cjs")], { env: { ...hermeticEnv, DESIGN_PIPELINE_CLI_PATH: path.join(installed, "scripts/designer-pipeline.cjs") } });
  report(installedCliTests.status === 0, "installed-package public CLI smoke");
} catch (error) {
  console.error(`FAIL QA exception: ${error.stack || error.message}`);
  failed = true;
} finally {
  const statusAfter = statusBytes();
  report(statusBefore.equals(statusAfter), "QA leaves repository status byte-identical");
  fs.rmSync(tempRoot, { recursive: true, force: true });
}

process.exitCode = failed ? 1 : 0;

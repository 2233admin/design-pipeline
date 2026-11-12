"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");
const { execFileSync, spawnSync } = require("node:child_process");
const { test } = require("node:test");
const { syncKatanaConsole, safeRelativePath, LICENSE, SNAPSHOT_NAME } = require("../skill/scripts/sync-katana-console.cjs");
const { normalizeSnapshot, searchCatalog } = require("../skill/scripts/design-system-catalog-core.cjs");
const { routeComponents } = require("../skill/scripts/component-route-core.cjs");
const { projectDesignSystemTokens } = require("../skill/scripts/design-system-decision-core.cjs");

const repoRoot = path.resolve(__dirname, "..");
const references = path.join(repoRoot, "skill", "references");
const importer = path.join(repoRoot, "skill", "scripts", "sync-katana-console.cjs");
function digest(bytes) { return crypto.createHash("sha256").update(bytes).digest("hex"); }
function json(file) { return JSON.parse(fs.readFileSync(file, "utf8")); }
function git(root, args, options = {}) {
  return execFileSync("git", ["-C", root, ...args], { encoding: "utf8", windowsHide: true, env: { ...process.env, GIT_AUTHOR_NAME: "KATANA test", GIT_AUTHOR_EMAIL: "katana@example.invalid", GIT_COMMITTER_NAME: "KATANA test", GIT_COMMITTER_EMAIL: "katana@example.invalid" }, ...options });
}
function write(root, relative, bytes) {
  const file = path.join(root, relative);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, bytes);
}
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "katana-console-import-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const sourceRoot = path.join(root, "source");
  const outputRoot = path.join(root, "references");
  fs.mkdirSync(sourceRoot);
  git(sourceRoot, ["init", "--quiet"]);
  git(sourceRoot, ["config", "core.autocrlf", "false"]);
  const sourcePath = "design/katana-console/";
  write(sourceRoot, `${sourcePath}project/components/DataGrid/README.md`, "# DataGrid\n\n表格 reference — original bytes\r\n");
  write(sourceRoot, `${sourcePath}project/components/DataGrid/preview.html`, "<div>Fixture preview only</div>\n");
  write(sourceRoot, `${sourcePath}project/components/Cover/preview.html`, "<div>No README for this reference</div>");
  write(sourceRoot, `${sourcePath}project/tools.md`, "## 16. Component progress\n\n| Tool | Card | Current | Next |\n|---|---|---|---|\n| Grid | DataGrid | IMPLEMENTED | Verification pending |\n");
  write(sourceRoot, `${sourcePath}project/tokens.json`, JSON.stringify({ color: { tokens: [{ name: "signal", value: { paper: "#111111", console: "#eeeeee" } }, { name: "alias", value: { paper: "{signal}", console: "{signal}" } }] }, spacing: { tokens: [{ name: "space-1", value: "4px" }] }, type: { families: { sans: "system-ui, sans-serif" } } }));
  write(sourceRoot, `${sourcePath}research/原字节.xlsx`, Buffer.from([0, 255, 10, 13, 128, 65]));
  write(sourceRoot, "application-secrets.txt", "Outside the allowed source subtree");
  git(sourceRoot, ["add", "."]);
  git(sourceRoot, ["commit", "--quiet", "-m", "pinned fixture"]);
  const ref = git(sourceRoot, ["rev-parse", "HEAD"]).trim();
  return { root, sourceRoot, outputRoot, ref, sourcePath };
}

test("bundled files retain committed bytes, source identity and internal permission", () => {
  const manifest = json(path.join(references, "katana-console", "manifest.json"));
  assert.match(manifest.sourceCommit, /^[a-f0-9]{40}$/);
  assert.equal(manifest.source.commit, manifest.sourceCommit);
  assert.equal(manifest.source.readMethod, "git-object-only");
  assert.equal(manifest.license, LICENSE);
  assert.match(manifest.licenseNotice, /not an MIT\/GPL/);
  assert.equal(manifest.fileCount, manifest.files.length);
  assert.equal(manifest.componentCount, 105);
  assert.equal(new Set(manifest.files.map((entry) => entry.path)).size, manifest.files.length);
  let totalBytes = 0;
  for (const entry of manifest.files) {
    assert.equal(entry.sourcePath, `${manifest.source.path}/${entry.path}`);
    safeRelativePath(entry.path);
    const bytes = fs.readFileSync(path.join(references, "katana-console", "source", entry.path));
    assert.equal(bytes.length, entry.size, entry.path);
    assert.equal(digest(bytes), entry.sha256, entry.path);
    totalBytes += bytes.length;
  }
  assert.equal(totalBytes, manifest.totalBytes);
  assert.equal(manifest.components.filter((entry) => entry.readmePath).length, 104);
  const cover = manifest.components.find((entry) => entry.name === "Cover");
  assert.equal(cover.readmePath, null);
  assert.equal(cover.sourceMaturity, "preview-only");
  assert.equal(cover.documentationMissing, true);
  assert.ok(manifest.externalLinks.some((link) => /font/i.test(link.url)));
});

test("existing snapshot search, routes and token projection keep the source limitations", () => {
  const snapshot = json(path.join(references, SNAPSHOT_NAME));
  const catalog = normalizeSnapshot(snapshot);
  const dom = searchCatalog(catalog, { query: "DOMLadder", kind: "component" })[0];
  const tape = searchCatalog(catalog, { query: "SmartTape", kind: "component" })[0];
  assert.equal(dom.sourceMaturity, "implemented-reported");
  assert.equal(tape.sourceMaturity, "specification-with-preview");
  for (const entry of snapshot.components) {
    assert.equal(entry.status, "unknown");
    assert.equal(entry.verificationStatus, "not-independently-verified");
    assert.equal(entry.routing.mode, "reference-adaptation");
    assert.equal(entry.routing.evidenceStatus, "user-provided");
    assert.equal(entry.provenance.sourceCommit, snapshot.provenance.sourceCommit);
  }
  const route = routeComponents({ catalog, brief: "data table", platform: "web" });
  assert.equal(route.status, "review");
  assert.ok(route.routes.length);
  assert.ok(route.routes.every((entry) => entry.status === "review"));
  const projection = projectDesignSystemTokens(catalog);
  assert.equal(projection.status, "ready");
  const tokens = snapshot.docs.find((entry) => entry.id === "tokens").theme;
  assert.deepEqual(tokens.modeMapping, { light: "paper", dark: "console" });
  assert.deepEqual(tokens.tokens["color.link-a"].value, tokens.tokens["color.signal-orange"].value);
  assert.deepEqual(tokens.tokens["color.bg-000"].value, ["#dcd8ce", "#0b0b09"]);
});

test("the existing default source catalog discovers KATANA without granting adoption", () => {
  const snapshot = json(path.join(references, "component-source-catalog.json"));
  const entry = snapshot.components.find((item) => item.id === "katana-console/system");
  assert.ok(entry);
  assert.equal(entry.path, SNAPSHOT_NAME);
  assert.equal(entry.provenance.license, LICENSE);
  assert.equal(entry.routing.mode, "reference-adaptation");
  const route = routeComponents({ catalog: normalizeSnapshot(snapshot), brief: "KATANA Console", capabilities: ["katana-console"], platform: "web" });
  assert.equal(route.status, "review");
  assert.match(route.routes[0].selected.id, /katana-console\/system$/);
});

test("pinned Git objects exclude newer commits, dirty files and unrelated application data", (t) => {
  const fixtureData = fixture(t);
  const { sourceRoot, outputRoot, ref, sourcePath } = fixtureData;
  const readme = `${sourcePath}project/components/DataGrid/README.md`;
  const original = git(sourceRoot, ["show", `${ref}:${readme}`], { encoding: null });
  write(sourceRoot, readme, "# DataGrid\n\nNew committed revision\n");
  git(sourceRoot, ["add", readme]);
  git(sourceRoot, ["commit", "--quiet", "-m", "new source revision"]);
  const newerRef = git(sourceRoot, ["rev-parse", "HEAD"]).trim();
  write(sourceRoot, readme, "Uncommitted content must never be copied");
  write(sourceRoot, `${sourcePath}untracked.md`, "Untracked content must never be copied");
  write(outputRoot, "unrelated.md", "Keep this file");
  write(outputRoot, "katana-console/local-host-adapter.css", "Keep sibling adapter");
  const cli = spawnSync(process.execPath, [importer, "--source-root", sourceRoot, "--ref", ref, "--output-root", outputRoot], { encoding: "utf8", windowsHide: true });
  assert.equal(cli.status, 0, cli.stderr);
  assert.deepEqual(fs.readFileSync(path.join(outputRoot, "katana-console/source/project/components/DataGrid/README.md")), original);
  const manifest = json(path.join(outputRoot, "katana-console/manifest.json"));
  assert.equal(manifest.sourceCommit, ref);
  assert.ok(!manifest.files.some((entry) => /untracked|secrets/.test(entry.path)));
  const binary = manifest.files.find((entry) => entry.path.endsWith(".xlsx"));
  assert.deepEqual(fs.readFileSync(path.join(outputRoot, "katana-console/source", binary.path)), Buffer.from([0, 255, 10, 13, 128, 65]));
  write(outputRoot, "katana-console/source/obsolete.md", "Remove on explicit replacement");
  syncKatanaConsole({ sourceRoot, ref: newerRef, outputRoot });
  assert.equal(json(path.join(outputRoot, "katana-console/manifest.json")).sourceCommit, newerRef);
  assert.match(fs.readFileSync(path.join(outputRoot, "katana-console/source/project/components/DataGrid/README.md"), "utf8"), /New committed revision/);
  assert.ok(!fs.existsSync(path.join(outputRoot, "katana-console/source/obsolete.md")));
  assert.equal(fs.readFileSync(path.join(outputRoot, "unrelated.md"), "utf8"), "Keep this file");
  assert.equal(fs.readFileSync(path.join(outputRoot, "katana-console/local-host-adapter.css"), "utf8"), "Keep sibling adapter");
  const before = fs.readFileSync(path.join(outputRoot, SNAPSHOT_NAME));
  syncKatanaConsole({ sourceRoot, ref: newerRef, outputRoot });
  assert.deepEqual(fs.readFileSync(path.join(outputRoot, SNAPSHOT_NAME)), before, "identical fixed refs are deterministic");
});

test("moving refs, unsafe paths and symlink Git entries are refused before replacing output", (t) => {
  const { sourceRoot, outputRoot, ref } = fixture(t);
  syncKatanaConsole({ sourceRoot, ref, outputRoot });
  const before = fs.readFileSync(path.join(outputRoot, SNAPSHOT_NAME));
  assert.throws(() => syncKatanaConsole({ sourceRoot, ref: "HEAD", outputRoot }), /full 40-character Git commit/);
  for (const unsafe of ["../outside", "a/../../outside", "/absolute", "C:/outside", "a\\outside", "a/.git/config", "a/NUL.txt", "a./file", "a/\0b"]) assert.throws(() => safeRelativePath(unsafe), /unsafe source path/);
  assert.equal(safeRelativePath("research/原稿.md"), "research/原稿.md");
  const blob = git(sourceRoot, ["hash-object", "-w", "--stdin"], { input: "../../outside" }).trim();
  git(sourceRoot, ["update-index", "--add", "--cacheinfo", `120000,${blob},design/katana-console/project/components/Evil/README.md`]);
  git(sourceRoot, ["commit", "--quiet", "-m", "unsafe symlink entry"]);
  const unsafeRef = git(sourceRoot, ["rev-parse", "HEAD"]).trim();
  assert.throws(() => syncKatanaConsole({ sourceRoot, ref: unsafeRef, outputRoot }), /symlink, submodule/);
  assert.deepEqual(fs.readFileSync(path.join(outputRoot, SNAPSHOT_NAME)), before);
});

test("destination junctions cannot redirect an import into an unrelated directory", (t) => {
  const { root, sourceRoot, outputRoot, ref } = fixture(t);
  const elsewhere = path.join(root, "elsewhere");
  fs.mkdirSync(elsewhere);
  write(elsewhere, "sentinel.md", "Do not overwrite or remove");
  fs.mkdirSync(path.join(outputRoot, "katana-console"), { recursive: true });
  fs.symlinkSync(elsewhere, path.join(outputRoot, "katana-console/source"), process.platform === "win32" ? "junction" : "dir");
  assert.throws(() => syncKatanaConsole({ sourceRoot, ref, outputRoot }), /symlink destination/);
  assert.equal(fs.readFileSync(path.join(elsewhere, "sentinel.md"), "utf8"), "Do not overwrite or remove");
});

test("dangling metadata links cannot create files outside the declared reference resources", (t) => {
  for (const metadata of ["katana-console/manifest.json", SNAPSHOT_NAME]) {
    const { root, sourceRoot, outputRoot, ref } = fixture(t);
    const outsideFile = path.join(root, "outside-created.json");
    const destination = path.join(outputRoot, metadata);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.symlinkSync(outsideFile, destination, "file");
    assert.equal(fs.existsSync(destination), false, "the regression requires a dangling link");
    assert.equal(fs.lstatSync(destination).isSymbolicLink(), true);
    assert.throws(() => syncKatanaConsole({ sourceRoot, ref, outputRoot }), /symlink destination/);
    assert.equal(fs.existsSync(outsideFile), false, metadata);
    assert.equal(fs.existsSync(path.join(outputRoot, "katana-console/source")), false, "refuse before replacing source");
  }
});

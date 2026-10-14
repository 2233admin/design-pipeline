"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");
const { canonicalTree } = require("../scripts/git-tree-snapshot.cjs");
const { REVIEWED, skillMetadata } = require("../scripts/import-ui-craft-sources.cjs");
const { storedPath } = require("../skill/scripts/upstream-path.cjs");
const { restoreUpstreamNames, storedTree, upstreamFilesIn } = require("./helpers/upstream-names.cjs");

const repoRoot = path.resolve(__dirname, "..");
const skillRoot = path.join(repoRoot, "skill");
const vendorRoot = path.join(skillRoot, "vendor");
const GUIDES = ["references/ui-craft-sources.md", "references/react-doctor.md"];
const GUIDE_ANCHORS = ["emil-design-eng", "make-interfaces-feel-better", "fixing-accessibility", "12-principles-of-animation", "shadcn", "playwright-cli", "react-doctor"];
const BOUNDARY = { mode: "built-in-reference-adaptation", installsUpstreamDependencies: false, executesUpstreamCommands: false, fetchesRemotePrompts: false, changesProjectRuntime: false };
const LICENSE_NAME = /^(?:licen[cs]e|copying)(?:\.[^/]*)?$/i;

// The reviewed scoped inventories, written out so a manifest cannot silently widen or narrow a scope.
const skillFiles = (skill, files) => files.map(file => `skills/${skill}/${file}`);
const EXPECTED_FILES = {
  "emil-design-eng": ["LICENSE", ...skillFiles("emil-design-eng", ["SKILL.md"])],
  "make-interfaces-feel-better": ["LICENSE", "README.md", ...skillFiles("make-interfaces-feel-better", ["SKILL.md", "agents/openai.yaml", "animations.md", "icons.md", "performance.md", "surfaces.md", "typography.md"])],
  "fixing-accessibility": ["LICENSE", ...skillFiles("fixing-accessibility", ["SKILL.md"])],
  "12-principles-of-animation": ["README.md", ...skillFiles("12-principles-of-animation", ["SKILL.md"])],
  shadcn: ["LICENSE.md", ...skillFiles("shadcn", [
    "SKILL.md", "agents/openai.yml", "assets/shadcn-small.png", "assets/shadcn.png", "assets/showcase/color-pair.tsx",
    "assets/showcase/preview-states.css", "assets/showcase/state-matrix.tsx", "cli.md", "customization.md",
    "design-system-page.md", "design-system.md", "evals/evals.json", "mcp.md", "registry.md", "rules/base-vs-radix.md",
    "rules/chat.md", "rules/composition.md", "rules/forms.md", "rules/icons.md", "rules/styling.md", "scripts/showcase-coverage.mjs",
  ])],
  "playwright-cli": ["LICENSE", "README.md", ...skillFiles("playwright-cli", [
    "SKILL.md", "references/element-attributes.md", "references/playwright-tests.md", "references/pr-attachments.md",
    "references/request-mocking.md", "references/running-code.md", "references/session-management.md",
    "references/storage-state.md", "references/test-generation.md", "references/tracing.md", "references/video-recording.md",
  ])],
};

function run(command, args, cwd, env = {}) {
  const result = spawnSync(command, args, { cwd, encoding: "utf8", windowsHide: true, env: { ...process.env, ...env }, maxBuffer: 64 * 1024 * 1024 });
  assert.equal(result.error, undefined, result.error?.message);
  return result;
}

const sha256 = content => crypto.createHash("sha256").update(content).digest("hex");
const gitBlobId = content => crypto.createHash("sha1").update(`blob ${content.length}\0`).update(content).digest("hex");

function verifySnapshot(name, root) {
  const reviewed = REVIEWED[name];
  const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8"));
  const upstream = path.join(root, "upstream");
  const expected = [...EXPECTED_FILES[name]].sort();
  const entry = `skills/${reviewed.skill}/SKILL.md`;
  assert.deepEqual(fs.readdirSync(root).sort(), ["manifest.json", "upstream"]);
  assert.equal(manifest.schema, "design-pipeline.ui-craft-source.v1");
  assert.equal(manifest.name, name);
  assert.equal(manifest.source.repository, reviewed.repository);
  assert.equal(manifest.source.revision, reviewed.revision);
  assert.equal(manifest.source.gitTree, reviewed.gitTree);
  assert.match(manifest.source.committedAt, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:Z|[+-]\d{2}:\d{2})$/);
  assert.equal(manifest.source.license, reviewed.license.spdx);
  assert.equal(manifest.source.reviewedAt, "2026-10-13");
  assert.deepEqual(manifest.source.scope, [`skills/${reviewed.skill}/**`, ...reviewed.rootFiles]);
  assert.match(manifest.source.contentHashScope, /^selected skill and root metadata: .*gitTree is the upstream repository root, not this scoped snapshot$/);

  const files = upstreamFilesIn(upstream);
  assert.deepEqual(files, expected);
  assert.deepEqual(manifest.snapshot.objects.map(object => object.path).sort(), expected);
  assert.equal(manifest.snapshot.root, "upstream");
  let bytes = 0;
  for (const object of manifest.snapshot.objects) {
    const content = fs.readFileSync(path.join(upstream, storedPath(object.path)));
    bytes += content.length;
    assert.equal(object.mode, "100644", object.path);
    assert.equal(object.size, content.length, object.path);
    assert.equal(object.oid, gitBlobId(content), object.path);
    assert.equal(object.sha256, sha256(content), object.path);
  }
  assert.equal(manifest.snapshot.fileCount, files.length);
  assert.equal(manifest.snapshot.fileCount, reviewed.fileCount);
  assert.equal(manifest.snapshot.byteCount, bytes);
  assert.equal(manifest.snapshot.byteCount, reviewed.byteCount);
  assert.equal(manifest.snapshot.treeSha256, reviewed.treeSha256);
  assert.equal(canonicalTree(upstream, files), reviewed.treeSha256);
  assert.deepEqual(manifest.snapshot.executableFiles, []);

  const entryText = fs.readFileSync(path.join(upstream, storedPath(entry)), "utf8");
  const metadata = skillMetadata(entryText);
  assert.equal(metadata.name, reviewed.skill);
  assert.ok(metadata.description.length > 20, name);
  assert.deepEqual(manifest.skills, [{ name: reviewed.skill, path: `upstream/${entry}`, description: metadata.description }]);

  const license = reviewed.license;
  if (license.kind === "frontmatter") {
    assert.equal(metadata.license, "MIT");
    assert.ok(entryText.includes(`\n${license.evidence}\n`));
    assert.deepEqual(files.filter(file => LICENSE_NAME.test(path.posix.basename(file))), []);
    assert.deepEqual(manifest.licenses, [{ path: `upstream/${entry}`, license: "MIT", evidence: "license: MIT", note: license.note }]);
    assert.match(manifest.licenses[0].note, /no LICENSE file .*no copyright line/);
  } else {
    const text = fs.readFileSync(path.join(upstream, license.file), "utf8");
    assert.ok(text.split(/\r?\n/).some(line => line.trim() === license.copyright), `${name} copyright line`);
    if (license.kind === "mit-file") {
      assert.ok(text.startsWith("MIT License") && text.includes("Permission is hereby granted, free of charge"), name);
      assert.deepEqual(manifest.licenses, [{ path: `upstream/${license.file}`, license: "MIT", copyright: license.copyright }]);
    } else {
      assert.match(text, /^\s*Apache License\r?\n\s*Version 2\.0, January 2004\r?\n/);
      assert.equal(license.copyright, "Copyright (c) Microsoft Corporation.");
      assert.deepEqual(manifest.licenses, [{ path: "upstream/LICENSE", license: "Apache-2.0", copyright: license.copyright, notice: "No NOTICE file exists at the reviewed revision." }]);
      assert.deepEqual(files.filter(file => /^notice(?:\.|$)/i.test(path.posix.basename(file))), []);
    }
  }
  assert.deepEqual(manifest.boundary, BOUNDARY);
  return manifest;
}

test("the six reviewed UI craft sources are exactly the contracted bundles; React Doctor is not vendored", () => {
  assert.deepEqual(Object.keys(REVIEWED), ["emil-design-eng", "make-interfaces-feel-better", "fixing-accessibility", "12-principles-of-animation", "shadcn", "playwright-cli"]);
  assert.deepEqual(Object.keys(EXPECTED_FILES), Object.keys(REVIEWED));
  assert.equal(fs.existsSync(path.join(vendorRoot, "react-doctor")), false);
});

for (const name of Object.keys(REVIEWED)) {
  test(`${name} preserves its reviewed scoped blobs, license evidence and inert boundary`, () => {
    verifySnapshot(name, path.join(vendorRoot, name));
  });

  test(`${name} integrity check rejects changed, missing, added and rehashed bytes`, t => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), `design-pipeline-ui-craft-${name}-`));
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    fs.cpSync(path.join(vendorRoot, name), root, { recursive: true });
    verifySnapshot(name, root);
    const entry = path.join(root, "upstream/skills", REVIEWED[name].skill, "UPSTREAM-SKILL.md");
    const original = fs.readFileSync(entry);
    fs.writeFileSync(entry, Buffer.concat([original, Buffer.from("\nunreviewed\n")]));
    assert.throws(() => verifySnapshot(name, root), assert.AssertionError);

    // Rehash the manifest to the corrupted bytes: the reviewed scoped tree hash still rejects it.
    const manifestFile = path.join(root, "manifest.json");
    const pristine = fs.readFileSync(manifestFile);
    const rehashed = JSON.parse(pristine);
    const changed = fs.readFileSync(entry);
    const object = rehashed.snapshot.objects.find(item => item.path === `skills/${REVIEWED[name].skill}/SKILL.md`);
    rehashed.snapshot.byteCount += changed.length - object.size;
    Object.assign(object, { size: changed.length, oid: gitBlobId(changed), sha256: sha256(changed) });
    rehashed.snapshot.treeSha256 = storedTree(path.join(root, "upstream"));
    fs.writeFileSync(manifestFile, `${JSON.stringify(rehashed, null, 2)}\n`);
    assert.throws(() => verifySnapshot(name, root), assert.AssertionError);
    fs.writeFileSync(manifestFile, pristine);
    fs.writeFileSync(entry, original);
    verifySnapshot(name, root);

    const removed = path.join(root, "upstream", REVIEWED[name].rootFiles[0]);
    const removedBytes = fs.readFileSync(removed);
    fs.rmSync(removed);
    assert.throws(() => verifySnapshot(name, root), assert.AssertionError);
    fs.writeFileSync(removed, removedBytes);
    fs.writeFileSync(path.join(root, "upstream/skills", REVIEWED[name].skill, "unreviewed.md"), "unreviewed\n");
    assert.throws(() => verifySnapshot(name, root), assert.AssertionError);
  });
}

test("package resources list exactly every vendored UI craft file, its manifest and both guides", () => {
  const resources = JSON.parse(fs.readFileSync(path.join(skillRoot, "references/package-resources.json"), "utf8"));
  for (const guide of GUIDES) assert.equal(resources.required.filter(file => file === guide).length, 1, guide);
  assert.deepEqual(resources.required.filter(file => file.startsWith("vendor/react-doctor/")), []);
  for (const name of Object.keys(REVIEWED)) {
    const listed = resources.required.filter(file => file.startsWith(`vendor/${name}/`));
    assert.equal(new Set(listed).size, listed.length, name);
    const expected = [`vendor/${name}/manifest.json`, ...EXPECTED_FILES[name].map(file => `vendor/${name}/upstream/${storedPath(file)}`)].sort();
    assert.deepEqual([...listed].sort(), expected);
  }
});

function rejectionFixture(t, name) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), `design-pipeline-ui-craft-import-${name}-`));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, "scripts"));
  fs.mkdirSync(path.join(root, "skill/scripts"), { recursive: true });
  fs.copyFileSync(path.join(repoRoot, "skill/scripts/upstream-path.cjs"), path.join(root, "skill/scripts/upstream-path.cjs"));
  for (const file of ["import-ui-craft-sources.cjs", "git-tree-snapshot.cjs"]) fs.copyFileSync(path.join(repoRoot, "scripts", file), path.join(root, "scripts", file));
  const destination = path.join(root, "skill/vendor", name);
  fs.mkdirSync(destination, { recursive: true });
  fs.writeFileSync(path.join(destination, "manifest.json"), "previous snapshot\n");
  fs.writeFileSync(path.join(destination, "preserved.txt"), "previous bytes\n");
  const before = storedTree(destination);
  const source = path.join(root, "source");
  fs.cpSync(path.join(vendorRoot, name, "upstream"), source, { recursive: true });
  restoreUpstreamNames(source);
  // An out-of-scope sibling proves the include filter keeps it out of the inventory.
  fs.mkdirSync(path.join(source, "apps"));
  fs.writeFileSync(path.join(source, "apps/out-of-scope.txt"), "outside the reviewed scope\n");
  const git = args => { const result = run("git", args, source); assert.equal(result.status, 0, result.stderr); };
  git(["init", "--quiet"]);
  git(["config", "core.autocrlf", "false"]);
  const commit = () => {
    git(["add", "--force", "--all", "."]);
    git(["-c", "user.name=UI Craft Test", "-c", "user.email=ui-craft-test@example.invalid", "commit", "--quiet", "--allow-empty", "-m", "fixture"]);
  };
  commit();
  const rejects = (pattern, args = ["--name", name, "--source", source, "--reviewed-at", "2026-10-13"]) => {
    const result = run(process.execPath, [path.join(root, "scripts/import-ui-craft-sources.cjs"), ...args], root);
    assert.equal(result.status, 1, result.stdout);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, /^FAIL /);
    assert.match(result.stderr, pattern);
    assert.equal(storedTree(destination), before);
    assert.deepEqual(fs.readdirSync(path.dirname(destination)), [name]);
  };
  return { source, commit, rejects };
}

test("UI craft import rejects unknown, invalid, unreviewed, dirty and mismatched input without replacing prior output", t => {
  const name = "shadcn";
  const { source, commit, rejects } = rejectionFixture(t, name);
  rejects(/unknown option: --force/, ["--name", name, "--source", source, "--reviewed-at", "2026-10-13", "--force"]);
  rejects(/--name must be one of/, ["--name", "react-doctor", "--source", source, "--reviewed-at", "2026-10-13"]);
  rejects(/valid YYYY-MM-DD/, ["--name", name, "--source", source, "--reviewed-at", "2026-02-30"]);
  rejects(/source revision must be the reviewed 993eb2c3151997ce08a49635c10fd8c8ef3713c7/);
  const entry = path.join(source, "skills/shadcn/SKILL.md");
  const entryBytes = fs.readFileSync(entry);
  fs.appendFileSync(entry, "dirty\n");
  rejects(/tracked working-tree changes/);
  fs.writeFileSync(entry, entryBytes);
  const license = path.join(source, "LICENSE.md");
  const licenseBytes = fs.readFileSync(license);
  fs.writeFileSync(license, "MIT License\n\nCopyright (c) 2023 someone else\n");
  commit();
  rejects(/LICENSE\.md does not match reviewed shadcn MIT attribution/);
  fs.writeFileSync(license, licenseBytes);
  fs.writeFileSync(entry, entryBytes.toString("utf8").replace(/^name: shadcn$/m, "name: shadcn-fork"));
  commit();
  rejects(/frontmatter name does not match reviewed shadcn entry/);
  fs.rmSync(entry);
  rejects(/missing skills\/shadcn\/SKILL\.md/);
});

test("UI craft import verifies frontmatter-only MIT evidence and the absent Apache NOTICE", t => {
  const principles = rejectionFixture(t, "12-principles-of-animation");
  principles.rejects(/source revision must be the reviewed/);
  fs.writeFileSync(path.join(principles.source, "skills/12-principles-of-animation/LICENSE"), "MIT License\n");
  principles.commit();
  principles.rejects(/expects no license file, but the source tracks skills\/12-principles-of-animation\/LICENSE/);
  fs.rmSync(path.join(principles.source, "skills/12-principles-of-animation/LICENSE"));
  const entry = path.join(principles.source, "skills/12-principles-of-animation/SKILL.md");
  fs.writeFileSync(entry, fs.readFileSync(entry, "utf8").replace(/^license: MIT$/m, "license: Apache-2.0"));
  principles.commit();
  principles.rejects(/does not declare the reviewed 12-principles-of-animation license: license: MIT/);

  const playwright = rejectionFixture(t, "playwright-cli");
  playwright.rejects(/source revision must be the reviewed/);
  fs.writeFileSync(path.join(playwright.source, "NOTICE"), "notice\n");
  playwright.commit();
  playwright.rejects(/expects no NOTICE file, but the source tracks NOTICE/);
  fs.rmSync(path.join(playwright.source, "NOTICE"));
  const license = path.join(playwright.source, "LICENSE");
  fs.writeFileSync(license, fs.readFileSync(license, "utf8").replace("Version 2.0, January 2004", "Version 1.1"));
  playwright.commit();
  playwright.rejects(/LICENSE does not match reviewed playwright-cli Apache-2\.0 license/);
});

let packaged = null;
test.after(() => { if (packaged) fs.rmSync(packaged.root, { recursive: true, force: true }); });

// Builds the release archive once, lists it and extracts the six bundles plus both guides.
function packageArchive() {
  if (packaged) return packaged;
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "design-pipeline-ui-craft-package-"));
  packaged = { root, entries: new Set() };
  const built = run(process.execPath, [path.join(repoRoot, "scripts/package.cjs"), "--output-root", root], repoRoot, {
    PACKAGE_VERSION: "0.0.0-dev", RELEASE_MODE: "0", GITHUB_REF_NAME: "", SOURCE_DATE_EPOCH: "1791504000",
  });
  assert.equal(built.status, 0, built.stderr || built.stdout);
  const archive = path.join(root, "design-pipeline-skill.tgz");
  const listed = run("tar", ["-tzf", archive], root);
  assert.equal(listed.status, 0, listed.stderr);
  packaged.entries = new Set(listed.stdout.split(/\r?\n/).filter(Boolean));
  const members = [...Object.keys(REVIEWED).map(name => `design-pipeline/vendor/${name}/`), ...GUIDES.map(guide => `design-pipeline/${guide}`)];
  const extracted = run("tar", ["-xzf", archive, "-C", root, ...members], root);
  assert.equal(extracted.status, 0, extracted.stderr);
  return packaged;
}

test("release archive carries every UI craft source blob and no React Doctor bundle", () => {
  const { root, entries } = packageArchive();
  assert.deepEqual([...entries].filter(entry => entry.startsWith("design-pipeline/vendor/react-doctor")), []);
  for (const name of Object.keys(REVIEWED)) {
    const installed = path.join(root, "design-pipeline/vendor", name);
    const manifest = verifySnapshot(name, installed);
    assert.deepEqual(fs.readFileSync(path.join(installed, "manifest.json")), fs.readFileSync(path.join(vendorRoot, name, "manifest.json")));
    for (const object of manifest.snapshot.objects) {
      assert.deepEqual(fs.readFileSync(path.join(installed, "upstream", storedPath(object.path))), fs.readFileSync(path.join(vendorRoot, name, "upstream", storedPath(object.path))), object.path);
    }
  }
});

test("UI craft guides and vendor index resolve every local reference inside the packaged skill", () => {
  const { root, entries } = packageArchive();
  const packageRoot = path.join(root, "design-pipeline");
  const packagedFiles = [...entries].filter(entry => !entry.endsWith("/")).map(entry => entry.slice("design-pipeline/".length));
  const resolves = (relative, label) => {
    assert.ok(relative && !path.posix.isAbsolute(relative) && !relative.split("/").includes(".."), `${label} escapes the package`);
    if (relative.includes("*")) {
      // A backticked glob names a set of packaged files; it must match at least one.
      const pattern = new RegExp(`^${relative.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*\*\/?/g, "\u0000").replace(/\*/g, "[^/]*").replace(/\u0000/g, ".*")}$`);
      assert.ok(packagedFiles.some(file => pattern.test(file)), `${label} matches no packaged file`);
    } else if (relative.endsWith("/")) {
      assert.ok(entries.has(`design-pipeline/${relative}`), `${label} is not a packaged directory`);
    } else {
      assert.ok(packagedFiles.includes(relative), `${label} is not a packaged file`);
    }
  };
  for (const guide of GUIDES) {
    const text = fs.readFileSync(path.join(packageRoot, guide), "utf8");
    const links = [...text.matchAll(/\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)].map(match => match[1])
      .filter(target => !/^[a-z][a-z\d+.-]*:/i.test(target) && !target.startsWith("#"));
    for (const target of links) {
      const relative = path.posix.normalize(path.posix.join(path.posix.dirname(guide), decodeURIComponent(target.split("#")[0])));
      resolves(relative, `${guide} link ${target}`);
    }
    const codePaths = [...text.matchAll(/`((?:vendor|references)\/[^`\s]+)`/g)].map(match => match[1]);
    for (const reference of codePaths) resolves(reference.split("#")[0], `${guide} path ${reference}`);
  }

  const guide = fs.readFileSync(path.join(packageRoot, GUIDES[0]), "utf8");
  for (const anchor of GUIDE_ANCHORS) assert.ok(guide.split(/\r?\n/).includes(`### ${anchor}`), `ui-craft-sources.md heading ${anchor}`);
  const index = fs.readFileSync(path.join(vendorRoot, "README.md"), "utf8");
  for (const name of Object.keys(REVIEWED)) {
    const row = index.split(/\r?\n/).find(line => line.startsWith(`| \`${name}/\` |`));
    assert.ok(row, `vendor README row ${name}`);
    assert.ok(row.includes(`](../references/ui-craft-sources.md#${name})`), `vendor README link ${name}`);
    assert.match(row, /\| `manifest\.json`, scoped snapshot hash \|$/);
  }
});

"use strict";

// GNU tar reads a drive letter as a remote host; --force-local keeps Windows paths local.
const tarLocal = process.platform === "win32" ? ["--force-local"] : [];

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");
const { canonicalTree, frontmatter } = require("../scripts/git-tree-snapshot.cjs");
const { gitTreeId } = require("../skill/scripts/mengto-skills-core.cjs");
const { REVIEWED } = require("../scripts/import-film-sources.cjs");
const { storedPath } = require("../skill/scripts/upstream-path.cjs");
const { restoreUpstreamNames, storedTree, upstreamFilesIn } = require("./helpers/upstream-names.cjs");
const { DATE, TIME, lockedSource } = require("./helpers/locked-source.cjs");

const repoRoot = path.resolve(__dirname, "..");
const vendorRoot = path.join(repoRoot, "skill/vendor");

function filesIn(root, relative = "") {
  return fs.readdirSync(path.join(root, relative), { withFileTypes: true }).flatMap(entry => {
    const file = relative ? `${relative}/${entry.name}` : entry.name;
    assert.equal(fs.lstatSync(path.join(root, file)).isSymbolicLink(), false, file);
    return entry.isDirectory() ? filesIn(root, file) : [file];
  }).sort();
}

function run(command, args, cwd, options = {}) {
  const result = spawnSync(command, args, { cwd, encoding: "utf8", windowsHide: true, maxBuffer: 8 * 1024 * 1024, ...options });
  assert.equal(result.error, undefined, result.error?.message);
  return result;
}

function verifySnapshot(name, root) {
  const reviewed = REVIEWED[name];
  const locked = lockedSource(name);
  const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8"));
  const upstream = path.join(root, "upstream");
  assert.equal(manifest.source.repository, reviewed.repository);
  assert.equal(manifest.source.repository, locked.repo);
  assert.equal(manifest.source.revision, locked.revision);
  assert.match(manifest.source.committedAt, TIME);
  assert.match(manifest.source.reviewedAt, DATE);
  assert.equal(manifest.source.license, "MIT");
  assert.deepEqual(manifest.source.scope, ["**"]);
  assert.deepEqual(manifest.excluded, []);
  const files = upstreamFilesIn(upstream);
  assert.ok(files.includes(reviewed.entry), `${name} lacks ${reviewed.entry}`);
  assert.deepEqual(manifest.snapshot.objects.map(object => object.path).sort(), files);
  let bytes = 0;
  for (const object of manifest.snapshot.objects) {
    assert.ok(["100644", "100755"].includes(object.mode), object.path);
    const content = fs.readFileSync(path.join(upstream, storedPath(object.path)));
    bytes += content.length;
    assert.equal(content.length, object.size, object.path);
    assert.equal(crypto.createHash("sha1").update(`blob ${content.length}\0`).update(content).digest("hex"), object.oid, object.path);
    assert.equal(crypto.createHash("sha256").update(content).digest("hex"), object.sha256, object.path);
  }
  assert.equal(manifest.snapshot.fileCount, files.length);
  assert.equal(manifest.snapshot.byteCount, bytes);
  // The whole tree is vendored, so the objects rebuild the upstream root tree.
  assert.equal(gitTreeId(manifest.snapshot.objects), manifest.source.gitTree);
  assert.equal(manifest.snapshot.treeSha256, locked.treeSha256);
  assert.equal(canonicalTree(upstream, files), locked.treeSha256);
  assert.deepEqual(manifest.snapshot.executableFiles, manifest.snapshot.objects.filter(object => object.mode === "100755").map(object => object.path).sort());
  assert.deepEqual(manifest.licenses, [{ path: "upstream/LICENSE", license: "MIT", copyright: reviewed.copyright }, ...(reviewed.notices || [])]);
  assert.ok(fs.readFileSync(path.join(upstream, "LICENSE"), "utf8").includes(reviewed.copyright));
  for (const notice of reviewed.notices || []) assert.ok(fs.readFileSync(path.join(root, notice.path), "utf8").includes(notice.copyright), notice.path);
  if (reviewed.kind === "skill") {
    assert.equal(frontmatter(path.join(upstream, storedPath(reviewed.entry))).name, reviewed.skillName);
    assert.equal(manifest.skills[0].path, `upstream/${reviewed.entry}`);
    assert.equal(manifest.templates, undefined);
  } else {
    assert.equal(reviewed.kind, "template");
    assert.deepEqual(manifest.templates.map(({ name, path: entry }) => [name, entry]), [[reviewed.templateName, `upstream/${reviewed.entry}`]]);
    assert.ok(manifest.templates[0].description.trim());
    assert.equal(manifest.skills, undefined);
  }
  for (const field of ["installsUpstreamDependencies", "activatesUpstreamPlugin", "runsUpstreamPipeline", "changesProjectRuntime"]) assert.equal(manifest.boundary[field], false);
  assert.ok(manifest.boundary.externalMedia);
  assert.match(manifest.boundary.platform, /Windows.*WSL.*unverified/);
  return manifest;
}

for (const name of Object.keys(REVIEWED)) {
  test(`${name} preserves its complete reviewed Git tree, original bytes and MIT notice`, () => {
    const manifest = verifySnapshot(name, path.join(vendorRoot, name));
    const resources = JSON.parse(fs.readFileSync(path.join(repoRoot, "skill/references/package-resources.json"), "utf8"));
    const prefix = `vendor/${name}/upstream/`;
    assert.ok(resources.required.includes(`vendor/${name}/manifest.json`));
    assert.deepEqual(resources.required.filter(file => file.startsWith(prefix)).map(file => file.slice(prefix.length)).sort(), manifest.snapshot.objects.map(object => storedPath(object.path)).sort());
  });

  test(`${name} import reproduces the locked blobs offline from any clean checkout and rejects unsafe input without replacing them`, () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "design-pipeline-film-import-"));
    try {
      const scripts = path.join(root, "scripts");
      fs.mkdirSync(scripts);
      for (const file of ["import-film-sources.cjs", "git-tree-snapshot.cjs"]) fs.copyFileSync(path.join(repoRoot, "scripts", file), path.join(scripts, file));
      fs.mkdirSync(path.join(root, "skill/scripts"), { recursive: true });
      fs.copyFileSync(path.join(repoRoot, "skill/scripts/upstream-path.cjs"), path.join(root, "skill/scripts/upstream-path.cjs"));
      const source = path.join(root, "source");
      fs.cpSync(path.join(vendorRoot, name, "upstream"), source, { recursive: true });
      restoreUpstreamNames(source);
      const git = (args, options = {}) => {
        const result = run("git", args, source, options);
        assert.equal(result.status, 0, result.stderr);
        return result.stdout.trim();
      };
      git(["init", "--quiet"]);
      git(["config", "core.autocrlf", "false"]);
      git(["config", "core.filemode", "false"]);
      git(["add", "--force", "."]);
      const original = JSON.parse(fs.readFileSync(path.join(vendorRoot, name, "manifest.json"), "utf8"));
      if (original.snapshot.executableFiles.length) git(["update-index", "--chmod=+x", "--", ...original.snapshot.executableFiles]);
      assert.equal(git(["write-tree"]), original.source.gitTree);
      // A local commit of the same tree: the importer takes the checkout's revision and the content
      // hash still equals the lock's, which is what ties the bytes to the locked upstream.
      git(["-c", "user.name=Film Test", "-c", "user.email=film-test@example.invalid", "commit", "--quiet", "-m", "fixture"]);
      const revision = git(["rev-parse", "HEAD"]);
      const importer = path.join(scripts, "import-film-sources.cjs");
      const invoke = extra => run(process.execPath, [importer, "--name", name, "--source", source, "--reviewed-at", "2026-10-09", ...extra], root);
      const imported = invoke([]);
      assert.equal(imported.status, 0, imported.stderr || imported.stdout);
      const destination = path.join(root, "skill/vendor", name);
      const reimported = JSON.parse(fs.readFileSync(path.join(destination, "manifest.json"), "utf8"));
      assert.equal(reimported.source.revision, revision);
      assert.equal(reimported.snapshot.treeSha256, lockedSource(name).treeSha256);
      assert.deepEqual(reimported.snapshot.objects, original.snapshot.objects);
      const before = storedTree(destination);
      const rejects = (pattern, extra = []) => {
        const result = invoke(extra);
        assert.equal(result.status, 1, result.stdout);
        assert.match(result.stderr, pattern);
        assert.equal(storedTree(destination), before);
        assert.deepEqual(fs.readdirSync(path.dirname(destination)), [name]);
      };
      fs.appendFileSync(path.join(source, "README.md"), "modified bytes\n");
      rejects(/tracked working-tree changes/);
      fs.copyFileSync(path.join(vendorRoot, name, "upstream/README.md"), path.join(source, "README.md"));
      rejects(/valid YYYY-MM-DD/, ["--reviewed-at", "2026-02-30"]);
      rejects(/unknown option/, ["--force"]);
      const missing = path.join(source, REVIEWED[name].entry);
      fs.rmSync(missing);
      rejects(/tracked working-tree changes/);
    } finally { fs.rmSync(root, { recursive: true, force: true }); }
  });

  test(`${name} locked snapshot check detects changed, missing, added and rehashed source data`, () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "design-pipeline-film-tamper-"));
    try {
      fs.cpSync(path.join(vendorRoot, name), root, { recursive: true });
      verifySnapshot(name, root);
      const file = path.join(root, "upstream/README.md");
      const original = fs.readFileSync(file);
      const corrupted = Buffer.from(original);
      corrupted[0] ^= 1;
      fs.writeFileSync(file, corrupted);
      assert.throws(() => verifySnapshot(name, root), /README\.md/);
      const manifestPath = path.join(root, "manifest.json");
      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
      const object = manifest.snapshot.objects.find(item => item.path === "README.md");
      object.oid = crypto.createHash("sha1").update(`blob ${corrupted.length}\0`).update(corrupted).digest("hex");
      object.sha256 = crypto.createHash("sha256").update(corrupted).digest("hex");
      manifest.snapshot.treeSha256 = storedTree(path.join(root, "upstream"));
      fs.writeFileSync(manifestPath, JSON.stringify(manifest));
      assert.throws(() => verifySnapshot(name, root), /Expected values to be strictly (?:deep-)?equal|lacks README\.md/);
      fs.copyFileSync(path.join(vendorRoot, name, "manifest.json"), manifestPath);
      fs.rmSync(file);
      assert.throws(() => verifySnapshot(name, root), /Expected values to be strictly (?:deep-)?equal|lacks README\.md/);
      fs.writeFileSync(file, original);
      fs.writeFileSync(path.join(root, "upstream/unreviewed.txt"), "unreviewed\n");
      assert.throws(() => verifySnapshot(name, root), /Expected values to be strictly (?:deep-)?equal|lacks README\.md/);
    } finally { fs.rmSync(root, { recursive: true, force: true }); }
  });
}

test("isolated release archive carries every film source blob without ambient source installations", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "design-pipeline-film-package-"));
  try {
    const packaged = run(process.execPath, [path.join(repoRoot, "scripts/package.cjs"), "--output-root", root], repoRoot, {
      env: { ...process.env, PACKAGE_VERSION: "0.0.0-dev", RELEASE_MODE: "0", GITHUB_REF_NAME: "", SOURCE_DATE_EPOCH: "1791504000" },
    });
    assert.equal(packaged.status, 0, packaged.stderr || packaged.stdout);
    const extracted = run("tar", [...tarLocal, "-xzf", "design-pipeline-skill.tgz", ...Object.keys(REVIEWED).map(name => `design-pipeline/vendor/${name}/`)], root);
    assert.equal(extracted.status, 0, extracted.stderr);
    for (const name of Object.keys(REVIEWED)) {
      const installed = path.join(root, "design-pipeline/vendor", name);
      const manifest = verifySnapshot(name, installed);
      for (const object of manifest.snapshot.objects) assert.deepEqual(fs.readFileSync(path.join(installed, "upstream", storedPath(object.path))), fs.readFileSync(path.join(vendorRoot, name, "upstream", storedPath(object.path))), object.path);
    }
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

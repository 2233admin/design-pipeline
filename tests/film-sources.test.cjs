"use strict";

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

const repoRoot = path.resolve(__dirname, "..");
const vendorRoot = path.join(repoRoot, "skill/vendor");
const commitBodies = {
  cinetic: "tree 6bf9bcdfbc1af302f3d9233f7438bc0d38d4dfc1\nparent 70cc039209c6c363189cef65485d7300168a7f73\nauthor Leonxlnx <lexn.lin8@gmail.com> 1791150558 +0200\ncommitter Leon Lin <lexn.lin8@gmail.com> 1791156699 +0200\n\nAdd the cinetic mark and lockup\n\nThe logo from the 1.0 announcement film: a ring-shaped c whose upper end\nbreaks into two film frames (red and teal), with an azure caret in its\nopening. docs/brand/ holds the mark and lockups as SVG and PNG for light\nand dark grounds, favicon sizes, an avatar and an X header, with a short\nREADME on the drawing, colours and use. The README header shows the\nlockup, switching with the colour scheme.\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>\n",
  "product-film-skill": "tree ca1b16a4091528f90059b1ed2c0bb1afb8b5769f\nparent 238f80607670070e04a30cfbc573fe1f94851756\nauthor Rieranthony <rieraanthony13@gmail.com> 1790420328 +0200\ncommitter Rieranthony <rieraanthony13@gmail.com> 1790420328 +0200\n\nAsk what goes in the film instead of assuming a mascot (1.1.0)\n\nThe skill now interviews the user after a quick discovery pass: the brief\n(placement, length, music, features), then the ingredients (brand element,\nwords, transitions, extras), with options named after the product's real\nfeatures. A new ingredients reference says how to make each one good, used\nonly when chosen. Film-specific defaults are gone: a mascot appears only if\nthe product has one and the user picks it.\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>\n",
};

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
  const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8"));
  const upstream = path.join(root, "upstream");
  assert.equal(manifest.source.repository, reviewed.repository);
  assert.equal(manifest.source.revision, reviewed.revision);
  assert.equal(manifest.source.gitTree, reviewed.gitTree);
  assert.equal(manifest.source.license, "MIT");
  assert.deepEqual(manifest.source.scope, ["**"]);
  assert.deepEqual(manifest.excluded, []);
  const files = filesIn(upstream);
  assert.equal(files.length, reviewed.fileCount);
  assert.deepEqual(manifest.snapshot.objects.map(object => object.path).sort(), files);
  let bytes = 0;
  for (const object of manifest.snapshot.objects) {
    assert.ok(["100644", "100755"].includes(object.mode), object.path);
    const content = fs.readFileSync(path.join(upstream, object.path));
    bytes += content.length;
    assert.equal(content.length, object.size, object.path);
    assert.equal(crypto.createHash("sha1").update(`blob ${content.length}\0`).update(content).digest("hex"), object.oid, object.path);
    assert.equal(crypto.createHash("sha256").update(content).digest("hex"), object.sha256, object.path);
  }
  assert.equal(bytes, reviewed.byteCount);
  assert.equal(manifest.snapshot.fileCount, files.length);
  assert.equal(manifest.snapshot.byteCount, bytes);
  assert.equal(gitTreeId(manifest.snapshot.objects), reviewed.gitTree);
  assert.equal(manifest.snapshot.treeSha256, reviewed.treeSha256);
  assert.equal(canonicalTree(upstream, files), reviewed.treeSha256);
  assert.deepEqual(manifest.snapshot.executableFiles, manifest.snapshot.objects.filter(object => object.mode === "100755").map(object => object.path).sort());
  assert.deepEqual(manifest.licenses, [{ path: "upstream/LICENSE", license: "MIT", copyright: reviewed.copyright }]);
  assert.ok(fs.readFileSync(path.join(upstream, "LICENSE"), "utf8").includes(reviewed.copyright));
  assert.equal(frontmatter(path.join(upstream, reviewed.entry)).name, reviewed.skillName);
  assert.equal(manifest.skills[0].path, `upstream/${reviewed.entry}`);
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
    assert.deepEqual(resources.required.filter(file => file.startsWith(prefix)).map(file => file.slice(prefix.length)).sort(), manifest.snapshot.objects.map(object => object.path).sort());
  });

  test(`${name} import reproduces reviewed blobs offline and rejects unsafe refresh without replacing them`, () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "design-pipeline-film-import-"));
    try {
      const scripts = path.join(root, "scripts");
      fs.mkdirSync(scripts);
      for (const file of ["import-film-sources.cjs", "git-tree-snapshot.cjs"]) fs.copyFileSync(path.join(repoRoot, "scripts", file), path.join(scripts, file));
      const source = path.join(root, "source");
      fs.cpSync(path.join(vendorRoot, name, "upstream"), source, { recursive: true });
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
      assert.equal(git(["write-tree"]), REVIEWED[name].gitTree);
      // Restore the original shallow commit object; this exercises a successful locked import without network access.
      assert.equal(git(["hash-object", "-t", "commit", "-w", "--stdin"], { input: commitBodies[name] }), REVIEWED[name].revision);
      fs.writeFileSync(path.join(source, ".git/shallow"), `${REVIEWED[name].revision}\n`);
      git(["update-ref", "HEAD", REVIEWED[name].revision]);
      const importer = path.join(scripts, "import-film-sources.cjs");
      const invoke = extra => run(process.execPath, [importer, "--name", name, "--source", source, "--reviewed-at", "2026-10-09", ...extra], root);
      const imported = invoke([]);
      assert.equal(imported.status, 0, imported.stderr || imported.stdout);
      const destination = path.join(root, "skill/vendor", name);
      verifySnapshot(name, destination);
      const before = canonicalTree(destination, filesIn(destination));
      const rejects = (pattern, extra = []) => {
        const result = invoke(extra);
        assert.equal(result.status, 1, result.stdout);
        assert.match(result.stderr, pattern);
        assert.equal(canonicalTree(destination, filesIn(destination)), before);
        assert.deepEqual(fs.readdirSync(path.dirname(destination)), [name]);
      };
      fs.appendFileSync(path.join(source, "README.md"), "modified bytes\n");
      rejects(/tracked working-tree changes/);
      fs.copyFileSync(path.join(vendorRoot, name, "upstream/README.md"), path.join(source, "README.md"));
      rejects(/valid YYYY-MM-DD/, ["--reviewed-at", "2026-02-30"]);
      rejects(/unknown option/, ["--force"]);
      git(["-c", "user.name=Film Test", "-c", "user.email=film-test@example.invalid", "commit", "--allow-empty", "--quiet", "-m", "unreviewed"]);
      rejects(/source revision must be the reviewed/);
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
      manifest.snapshot.treeSha256 = canonicalTree(path.join(root, "upstream"), filesIn(path.join(root, "upstream")));
      fs.writeFileSync(manifestPath, JSON.stringify(manifest));
      assert.throws(() => verifySnapshot(name, root), /Expected values to be strictly equal/);
      fs.copyFileSync(path.join(vendorRoot, name, "manifest.json"), manifestPath);
      fs.rmSync(file);
      assert.throws(() => verifySnapshot(name, root), /Expected values to be strictly equal/);
      fs.writeFileSync(file, original);
      fs.writeFileSync(path.join(root, "upstream/unreviewed.txt"), "unreviewed\n");
      assert.throws(() => verifySnapshot(name, root), /Expected values to be strictly equal/);
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
    const extracted = run("tar", ["-xzf", path.join(root, "design-pipeline-skill.tgz"), "-C", root, ...Object.keys(REVIEWED).map(name => `design-pipeline/vendor/${name}/`)], root);
    assert.equal(extracted.status, 0, extracted.stderr);
    for (const name of Object.keys(REVIEWED)) {
      const installed = path.join(root, "design-pipeline/vendor", name);
      const manifest = verifySnapshot(name, installed);
      for (const object of manifest.snapshot.objects) assert.deepEqual(fs.readFileSync(path.join(installed, "upstream", object.path)), fs.readFileSync(path.join(vendorRoot, name, "upstream", object.path)), object.path);
    }
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

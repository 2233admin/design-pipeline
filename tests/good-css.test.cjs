"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { pathToFileURL } = require("node:url");
const test = require("node:test");
const { canonicalTree } = require("../scripts/git-tree-snapshot.cjs");
const { gitTreeId } = require("../skill/scripts/mengto-skills-core.cjs");

const repoRoot = path.resolve(__dirname, "..");
const vendorRoot = path.join(repoRoot, "skill/vendor/good-css");
const sourceRoot = path.join(vendorRoot, "upstream");
const manifest = JSON.parse(fs.readFileSync(path.join(vendorRoot, "manifest.json"), "utf8"));
const slugify = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const read = (file) => fs.readFileSync(path.join(sourceRoot, file), "utf8");

function filesIn(root, relative = "") {
  return fs.readdirSync(path.join(root, relative), { withFileTypes: true }).flatMap((entry) => {
    const file = relative ? `${relative}/${entry.name}` : entry.name;
    assert.equal(fs.lstatSync(path.join(root, file)).isSymbolicLink(), false, file);
    return entry.isDirectory() ? filesIn(root, file) : [file];
  }).sort();
}

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, encoding: "utf8", windowsHide: true });
  assert.equal(result.error, undefined, result.error?.message);
  return result;
}

test("good-css preserves the complete reviewed Git blobs, tree and licenses", () => {
  assert.equal(manifest.schema, "design-pipeline.good-css-source.v1");
  assert.equal(manifest.source.repository, "https://github.com/vojtaholik/good-css");
  assert.equal(manifest.source.revision, "6d16d2fd27f4892e2aea4b5c5c2b016f45be7eef");
  assert.equal(manifest.source.gitTree, "a14bae52fb7bd2374faefaf6c62f575aeff8dad5");
  assert.equal(manifest.source.license, "MIT");
  assert.deepEqual(manifest.source.scope, ["**"]);
  const files = filesIn(sourceRoot);
  assert.equal(files.length, 133);
  assert.equal(manifest.snapshot.fileCount, files.length);
  assert.deepEqual(manifest.snapshot.objects.map((object) => object.path).sort(), files);
  assert.equal(new Set(manifest.snapshot.objects.map((object) => object.path)).size, files.length);
  let bytes = 0;
  for (const object of manifest.snapshot.objects) {
    assert.equal(object.mode, "100644", object.path);
    const content = fs.readFileSync(path.join(sourceRoot, object.path));
    bytes += content.length;
    assert.equal(object.size, content.length, object.path);
    assert.equal(object.oid, crypto.createHash("sha1").update(`blob ${content.length}\0`).update(content).digest("hex"), object.path);
  }
  assert.equal(bytes, 881927);
  assert.equal(manifest.snapshot.byteCount, bytes);
  assert.equal(gitTreeId(manifest.snapshot.objects), manifest.source.gitTree);
  assert.equal(manifest.snapshot.treeSha256, "fe50d90bf5b9bcbd30d9696886f8f1c67fb3d3cfadc4a4a564f321adc7929a08");
  assert.equal(canonicalTree(sourceRoot, files), manifest.snapshot.treeSha256);
  assert.deepEqual(manifest.snapshot.executableFiles, []);
  assert.deepEqual(manifest.licenses.map((license) => license.license), ["MIT", "OFL-1.1", "OFL-1.1"]);
  for (const license of manifest.licenses) assert.ok(fs.readFileSync(path.join(vendorRoot, license.path), "utf8").includes(license.copyright), license.path);
  for (const fontLicense of ["Inter-OFL.txt", "GeistMono-OFL.txt"]) assert.match(read(`harness/public/fonts/${fontLicense}`), /SIL OPEN FONT LICENSE Version 1\.1/);

  const resources = JSON.parse(fs.readFileSync(path.join(repoRoot, "skill/references/package-resources.json"), "utf8"));
  assert.ok(resources.required.includes("vendor/good-css/manifest.json"));
  const prefix = "vendor/good-css/upstream/";
  assert.deepEqual(resources.required.filter((file) => file.startsWith(prefix)).map((file) => file.slice(prefix.length)).sort(), files);
  assert.equal(manifest.boundary.installsUpstreamDependencies, false);
  assert.equal(manifest.boundary.executesDeployment, false);
});

test("all 47 good-css practices retain their generated rules, CSS and local specimens", async () => {
  const source = read("PRACTICES.md");
  const headings = [...source.matchAll(/^(##|###) (.+)$/gm)];
  let category;
  const practices = [];
  for (let index = 0; index < headings.length; index += 1) {
    const heading = headings[index];
    if (heading[1] === "##") category = slugify(heading[2]);
    else practices.push({ slug: slugify(heading[2]), title: heading[2], category, body: source.slice(heading.index + heading[0].length, headings[index + 1]?.index || source.length) });
  }
  assert.equal(practices.length, 47);
  assert.deepEqual(manifest.practices.map(({ slug, title, category: section }) => ({ slug, title, category: section })), practices.map(({ slug, title, category: section }) => ({ slug, title, category: section })));
  const references = filesIn(path.join(sourceRoot, "skills/good-css/references"));
  assert.equal(references.length, 8);
  assert.deepEqual(references, [...new Set(practices.map((practice) => `${practice.category}.md`))].sort());
  const fileOf = new Map(practices.map((practice) => [practice.slug, practice.category]));
  const locate = (text, file) => text.replace(/\[([^\]]+)\]\(#([a-z0-9-]+)\)/g, (_, title, slug) => fileOf.get(slug) === file ? `"${title}"` : `"${title}" (\`${fileOf.get(slug)}.md\`)`);
  const normalize = (text) => text.trim().replace(/\s+/g, " ");
  const cssBlocks = (text) => [...text.matchAll(/```css\r?\n([\s\S]*?)```/g)].map((match) => match[1]);
  const { check } = await import(pathToFileURL(path.join(sourceRoot, "scripts/check-css.mjs")).href);
  let checked = 0;
  for (const practice of practices) {
    const reference = read(`skills/good-css/references/${practice.category}.md`);
    const start = reference.indexOf(`## ${practice.title}\n`);
    assert.ok(start >= 0, practice.slug);
    const next = reference.indexOf("\n## ", start + 1);
    const body = reference.slice(start, next < 0 ? reference.length : next);
    assert.deepEqual(cssBlocks(body), cssBlocks(practice.body), practice.slug);
    const rules = practice.body.match(/Rules:\s*([\s\S]*?)(?=\nSupport:|\n- (?:Borrowed from|Docs|Background|Source):|$)/)?.[1];
    assert.ok(rules, `missing source rules: ${practice.slug}`);
    assert.ok(normalize(body).includes(normalize(locate(rules, practice.category))), `reference dropped rules: ${practice.slug}`);
    const support = practice.body.match(/^Support: .+$/m)?.[0];
    if (support) assert.ok(body.includes(support), `reference dropped support: ${practice.slug}`);
    for (const css of cssBlocks(practice.body)) { assert.deepEqual(check(css), [], practice.slug); checked += 1; }
    assert.ok(fs.existsSync(path.join(sourceRoot, `harness/demos/${practice.slug}.html`)), practice.slug);
  }
  assert.ok(checked >= 47);
  assert.deepEqual(filesIn(path.join(sourceRoot, "harness/demos")).filter((file) => file.endsWith(".html")), practices.map((practice) => `${practice.slug}.html`).sort());
});

test("good-css import rejects dirty, unreviewed and incomplete sources without replacing the snapshot", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "design-pipeline-good-css-import-"));
  try {
    const scripts = path.join(root, "scripts");
    fs.mkdirSync(scripts);
    for (const file of ["import-good-css.cjs", "git-tree-snapshot.cjs"]) fs.copyFileSync(path.join(repoRoot, "scripts", file), path.join(scripts, file));
    const destination = path.join(root, "skill/vendor/good-css");
    fs.mkdirSync(destination, { recursive: true });
    fs.writeFileSync(path.join(destination, "manifest.json"), "previous snapshot\n");
    const source = path.join(root, "source");
    fs.mkdirSync(path.join(source, "skills/good-css"), { recursive: true });
    fs.writeFileSync(path.join(source, "LICENSE"), read("LICENSE"));
    fs.writeFileSync(path.join(source, "PRACTICES.md"), "# fixture\n");
    fs.writeFileSync(path.join(source, "skills/good-css/SKILL.md"), "# fixture\n");
    const git = (args) => { const result = run("git", args, source); assert.equal(result.status, 0, result.stderr); };
    git(["init", "--quiet"]);
    git(["add", "."]);
    const commit = () => git(["-c", "user.name=Good CSS Test", "-c", "user.email=good-css-test@example.invalid", "commit", "--quiet", "-m", "fixture"]);
    commit();
    const rejects = (pattern, extra = []) => {
      const result = run(process.execPath, [path.join(scripts, "import-good-css.cjs"), "--source", source, "--reviewed-at", "2026-10-08", ...extra], root);
      assert.equal(result.status, 1, result.stdout);
      assert.match(result.stderr, pattern);
      assert.equal(fs.readFileSync(path.join(destination, "manifest.json"), "utf8"), "previous snapshot\n");
      assert.deepEqual(fs.readdirSync(path.dirname(destination)), ["good-css"]);
    };
    rejects(/source revision must be the reviewed/);
    fs.appendFileSync(path.join(source, "PRACTICES.md"), "dirty\n");
    rejects(/tracked working-tree changes/);
    fs.writeFileSync(path.join(source, "PRACTICES.md"), "# fixture\n");
    fs.writeFileSync(path.join(source, "LICENSE"), "wrong license\n");
    git(["add", "."]); commit();
    rejects(/LICENSE does not match reviewed/);
    fs.rmSync(path.join(source, "LICENSE"));
    rejects(/missing LICENSE/);
    rejects(/valid YYYY-MM-DD/, ["--reviewed-at", "2026-02-30"]);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("good-css is a reachable built-in guide with every practice covered", () => {
  const guide = fs.readFileSync(path.join(repoRoot, "skill/references/good-css.md"), "utf8");
  const surface = require("./helpers/skill-surface.cjs").readSkillSurface();
  assert.match(surface, /references\/good-css\.md/);
  for (const practice of manifest.practices) assert.ok(guide.includes(practice.slug), `missing practice coverage: ${practice.slug}`);
  assert.match(guide, /CSS-in-JS|CSS in JS/i);
  assert.match(guide, /deterministic/i);
  assert.match(guide, /Visual\s+Acceptance/);
  assert.match(guide, /Component\s+Conformance/);
});

test("good-css study builds every local specimen and preserves output on rejection", () => {
  const builder = require("../skill/tools/good-css/build-study.cjs");
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "design-pipeline-good-css-study-"));
  try {
    const output = path.join(root, "study");
    assert.equal(builder.buildStudy({ output }).specimens, 47);
    assert.ok(fs.existsSync(path.join(output, "index.html")));
    assert.deepEqual(filesIn(path.join(output, "specimens")).filter((file) => file.endsWith(".html")), [...manifest.practices.map((practice) => `${practice.slug}.html`), "css-destination.html"].sort());
    for (const practice of manifest.practices) {
      const html = fs.readFileSync(path.join(output, "specimens", `${practice.slug}.html`), "utf8");
      assert.match(html, /<!doctype html>/i, practice.slug);
      assert.doesNotMatch(html, /<(?:script|link|img|iframe)\b[^>]*(?:src|href)=["'](?:https?:)?\/\//i, practice.slug);
      const styles = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map((match) => match[1]).join("\n");
      for (const match of styles.matchAll(/url\(["']?([^"')]+)["']?\)/g)) {
        const url = match[1];
        if (url.startsWith("data:") || url.startsWith("#")) continue;
        assert.doesNotMatch(url, /^(?:https?:)?\/\//, practice.slug);
        assert.ok(fs.existsSync(path.resolve(output, "specimens", url)), `${practice.slug} missing local resource: ${url}`);
      }
    }
    const navigation = fs.readFileSync(path.join(output, "specimens/cross-document-view-transitions.html"), "utf8");
    assert.match(navigation, /href="(?:cross-document-view-transitions\.html)?\?page=b"/);
    assert.match(navigation, /URLSearchParams\(location\.search\)/);
    const before = canonicalTree(output, filesIn(output));
    assert.throws(() => builder.buildStudy({ output }), /exist/i);
    assert.equal(canonicalTree(output, filesIn(output)), before);
    const aliasSource = path.join(root, "alias-source");
    fs.cpSync(sourceRoot, aliasSource, { recursive: true });
    const nestedOutput = path.join(aliasSource, "study");
    const sourceBefore = canonicalTree(aliasSource, filesIn(aliasSource));
    assert.throws(() => builder.buildStudy({ output: nestedOutput, sourceRoot: fs.realpathSync.native(aliasSource) }), /outside the preserved source/);
    assert.equal(fs.existsSync(nestedOutput), false);
    assert.equal(canonicalTree(aliasSource, filesIn(aliasSource)), sourceBefore);
    const missing = path.join(root, "missing-source-output");
    assert.throws(() => builder.buildStudy({ output: missing, sourceRoot: path.join(root, "absent") }));
    assert.equal(fs.existsSync(missing), false);
    const incompleteSource = path.join(root, "incomplete-source");
    fs.cpSync(sourceRoot, incompleteSource, { recursive: true });
    fs.rmSync(path.join(incompleteSource, "harness/demos/the-reset.html"));
    assert.throws(() => builder.buildStudy({ output: missing, sourceRoot: incompleteSource }), /the-reset\.html/);
    assert.equal(fs.existsSync(missing), false);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

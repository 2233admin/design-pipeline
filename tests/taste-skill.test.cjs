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
const { storedPath } = require("../skill/scripts/upstream-path.cjs");
const { restoreUpstreamNames, storedTree, upstreamFilesIn } = require("./helpers/upstream-names.cjs");

const repoRoot = path.resolve(__dirname, "..");
const vendorRoot = path.join(repoRoot, "skill/vendor/taste-skill");
const sourceRoot = path.join(vendorRoot, "upstream");
const manifest = JSON.parse(fs.readFileSync(path.join(vendorRoot, "manifest.json"), "utf8"));
const reviewedSkills = [
  ["taste-skill", "design-taste-frontend"],
];
const skillRoot = "skills/taste-skill";
const tools = ["draw.mjs", "inspect.mjs", "lint.mjs", "assets.mjs", "scenes.mjs"];
const routes = ["New site", "Redesign", "App screens", "Critique"];
const departed = ["minimalist-ui", "industrial-brutalist-ui", "high-end-visual-design", "gpt-taste", "design-taste-frontend-v1", "stitch-design-taste", "redesign-existing-projects", "image-to-code", "imagegen-frontend-web", "imagegen-frontend-mobile", "brandkit", "full-output-enforcement"];
const read = (file) => fs.readFileSync(path.join(sourceRoot, file), "utf8");

function run(command, args, cwd, env = {}) {
  const result = spawnSync(command, args, {
    cwd, encoding: "utf8", windowsHide: true,
    env: { ...process.env, ...env },
    maxBuffer: 8 * 1024 * 1024,
  });
  assert.equal(result.error, undefined, result.error?.message);
  return result;
}

test("taste-skill preserves the complete reviewed Git blobs, tree and license", () => {
  assert.equal(manifest.schema, "design-pipeline.taste-skill-source.v1");
  assert.equal(manifest.source.repository, "https://github.com/Leonxlnx/taste-skill");
  assert.equal(manifest.source.revision, "12af471f627f866411b4bd785b19646d3672784c");
  assert.equal(manifest.source.gitTree, "db698c9093437ee7daea871f70b48d06a838038e");
  assert.equal(manifest.source.license, "MIT");
  assert.deepEqual(manifest.source.scope, ["**"]);
  assert.equal(manifest.snapshot.root, "upstream");
  const files = upstreamFilesIn(sourceRoot);
  assert.equal(files.length, 72);
  assert.equal(manifest.snapshot.fileCount, files.length);
  assert.deepEqual(manifest.snapshot.objects.map((object) => object.path).sort(), files);
  assert.equal(new Set(manifest.snapshot.objects.map((object) => object.path)).size, files.length);
  let bytes = 0;
  for (const object of manifest.snapshot.objects) {
    assert.equal(object.mode, object.path === "install.sh" ? "100755" : "100644", object.path);
    const content = fs.readFileSync(path.join(sourceRoot, storedPath(object.path)));
    bytes += content.length;
    assert.equal(object.size, content.length, object.path);
    assert.equal(object.oid, crypto.createHash("sha1").update(`blob ${content.length}\0`).update(content).digest("hex"), object.path);
  }
  assert.equal(bytes, 3093372);
  assert.equal(manifest.snapshot.byteCount, bytes);
  assert.equal(gitTreeId(manifest.snapshot.objects), manifest.source.gitTree);
  assert.equal(manifest.snapshot.treeSha256, "e12cc2e63faba012ac716039de7cdd26da29cf1b2b48e065eca81aec910fc91e");
  assert.equal(canonicalTree(sourceRoot, files), manifest.snapshot.treeSha256);
  assert.deepEqual(manifest.snapshot.executableFiles, ["install.sh"]);
  assert.deepEqual(manifest.licenses, [{ path: "upstream/LICENSE", license: "MIT", copyright: "Copyright (c) 2026 Leonxlnx" }]);
  assert.match(read("LICENSE"), /^MIT License/);
  assert.ok(read("LICENSE").includes(manifest.licenses[0].copyright));

  const resources = JSON.parse(fs.readFileSync(path.join(repoRoot, "skill/references/package-resources.json"), "utf8"));
  assert.ok(resources.required.includes("references/taste-skill.md"));
  assert.ok(resources.required.includes("vendor/taste-skill/manifest.json"));
  const prefix = "vendor/taste-skill/upstream/";
  assert.deepEqual(resources.required.filter((file) => file.startsWith(prefix)).map((file) => file.slice(prefix.length)).sort(), files.map(storedPath).sort());
  assert.equal(manifest.boundary.mode, "built-in-reference-adaptation");
  for (const boundary of ["installsUpstreamDependencies", "executesDeployment", "executesUpstreamScripts", "changesProjectRuntime"]) {
    assert.equal(manifest.boundary[boundary], false, boundary);
  }
});

test("the one taste-skill entry, its references, library and optional tools remain local", () => {
  assert.deepEqual(manifest.skills.map(({ directory, name }) => [directory, name]), reviewedSkills);
  assert.deepEqual(upstreamFilesIn(path.join(sourceRoot, "skills")).filter((file) => file.endsWith("/SKILL.md")), ["taste-skill/SKILL.md"]);
  for (const skill of manifest.skills) {
    assert.equal(skill.path, `upstream/skills/${skill.directory}/SKILL.md`);
    const metadata = frontmatter(path.join(vendorRoot, storedPath(skill.path)));
    assert.equal(metadata.name, skill.name);
    assert.equal(metadata.description, ">-");
    assert.match(skill.description, /^tasteskill v2, the anti-slop frontend skill\. Art direction for websites,[\s\S]* with their own run and rules\.$/);
    assert.ok(read(`${skillRoot}/SKILL.md`.replace("SKILL.md", "UPSTREAM-SKILL.md")).replace(/\s+/g, " ").includes(skill.description));
  }
  const supporting = [
    ...["app-screens", "colour", "copy", "critique", "imagery", "layout", "motion", "research", "scenes", "tells", "type"].map((name) => `${skillRoot}/references/${name}.md`),
    ...["app", "directions", "heroes", "motions", "palettes", "photos", "sections", "sites", "type"].map((name) => `${skillRoot}/library/${name}.json`),
    ...tools.map((file) => `${skillRoot}/scripts/${file}`),
    `${skillRoot}/assets/base.css`,
    `${skillRoot}/assets/scenes/stage.js`,
  ];
  for (const file of supporting) {
    assert.ok(manifest.snapshot.objects.some((object) => object.path === file), file);
    assert.ok(read(file).trim(), file);
  }
  for (const file of ["skills/taste-skill-v1/SKILL.md", "skills/output-skill/SKILL.md", "research/laziness/README.md", "skill.sh"]) {
    assert.equal(manifest.snapshot.objects.some((object) => object.path === file), false, file);
  }
});

test("taste-skill import rejects unreviewed, dirty, incomplete and invalid-date sources without replacing the snapshot", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "design-pipeline-taste-import-"));
  try {
    const scripts = path.join(root, "scripts");
    fs.mkdirSync(scripts);
    fs.mkdirSync(path.join(root, "skill/scripts"), { recursive: true });
    fs.copyFileSync(path.join(repoRoot, "skill/scripts/upstream-path.cjs"), path.join(root, "skill/scripts/upstream-path.cjs"));
    for (const file of ["import-taste-skill.cjs", "git-tree-snapshot.cjs"]) fs.copyFileSync(path.join(repoRoot, "scripts", file), path.join(scripts, file));
    const destination = path.join(root, "skill/vendor/taste-skill");
    fs.mkdirSync(path.join(destination, "upstream"), { recursive: true });
    fs.writeFileSync(path.join(destination, "manifest.json"), "previous snapshot\n");
    fs.writeFileSync(path.join(destination, "upstream/preserved.txt"), "previous bytes\n");
    const before = storedTree(destination);
    const source = path.join(root, "source");
    fs.cpSync(sourceRoot, source, { recursive: true });
    restoreUpstreamNames(source);
    const git = (args) => { const result = run("git", args, source); assert.equal(result.status, 0, result.stderr); };
    git(["init", "--quiet"]);
    git(["config", "core.autocrlf", "false"]);
    // Stored copies are not executable; the index carries the reviewed mode instead.
    git(["config", "core.fileMode", "false"]);
    git(["add", "--force", "."]);
    for (const file of manifest.snapshot.executableFiles) git(["update-index", "--chmod=+x", file]);
    const commit = () => git(["-c", "user.name=Taste Test", "-c", "user.email=taste-test@example.invalid", "commit", "--quiet", "-m", "fixture"]);
    commit();
    assert.equal(run("git", ["rev-parse", "HEAD^{tree}"], source).stdout.trim(), manifest.source.gitTree);
    const rejects = (pattern, extra = []) => {
      const result = run(process.execPath, [path.join(scripts, "import-taste-skill.cjs"), "--source", source, "--reviewed-at", "2026-10-08", ...extra], root);
      assert.equal(result.status, 1, result.stdout);
      assert.match(result.stderr, pattern);
      assert.equal(storedTree(destination), before);
      assert.deepEqual(fs.readdirSync(path.dirname(destination)), ["taste-skill"]);
    };
    rejects(/source revision must be the reviewed/);
    fs.appendFileSync(path.join(source, "README.md"), "dirty\n");
    rejects(/tracked working-tree changes/);
    fs.writeFileSync(path.join(source, "README.md"), read("README.md"));
    fs.writeFileSync(path.join(source, "LICENSE"), "wrong license\n");
    git(["add", "."]); commit();
    rejects(/LICENSE does not match reviewed/);
    fs.rmSync(path.join(source, "skills/taste-skill/scripts/inspect.mjs"));
    rejects(/missing skills\/taste-skill\/scripts\/inspect\.mjs/);
    fs.rmSync(path.join(source, "skills/taste-skill/SKILL.md"));
    rejects(/missing skills\/taste-skill\/SKILL\.md/);
    rejects(/valid YYYY-MM-DD/, ["--reviewed-at", "2026-02-30"]);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("taste-skill guide routes new site, redesign, app screens and critique and keeps tools advisory", () => {
  const guidePath = path.join(repoRoot, "skill/references/taste-skill.md");
  const guide = fs.readFileSync(guidePath, "utf8");
  const surface = require("./helpers/skill-surface.cjs").readSkillSurface();
  assert.match(surface, /references\/taste-skill\.md/);
  const localLinks = [...guide.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)].map((match) => match[1]).filter((target) => !/^[a-z][a-z\d+.-]*:/i.test(target) && !target.startsWith("#"));
  for (const target of localLinks) {
    const file = path.resolve(path.dirname(guidePath), decodeURIComponent(target.split("#")[0]));
    const relative = path.relative(path.join(repoRoot, "skill"), file);
    assert.ok(relative && !path.isAbsolute(relative) && relative !== ".." && !relative.startsWith(`..${path.sep}`), target);
    assert.ok(fs.statSync(file).isFile(), target);
  }
  const vendorLink = (file) => `../vendor/taste-skill/upstream/${skillRoot}/${file}`;
  assert.ok(localLinks.includes(vendorLink("UPSTREAM-SKILL.md")));
  for (const file of ["references/app-screens.md", "references/critique.md", "references/tells.md", ...tools.map((tool) => `scripts/${tool}`)]) {
    assert.ok(localLinks.includes(vendorLink(file)), file);
  }
  const headings = [...guide.matchAll(/^### ([^\r\n]+)$/gm)];
  assert.deepEqual(headings.map((heading) => heading[1]), routes);
  for (const [index, heading] of headings.entries()) {
    const section = guide.slice(heading.index, headings[index + 1]?.index || guide.indexOf("\n## ", heading.index));
    assert.match(section, /\*\*Trigger:\*\*/, heading[1]);
    assert.match(section, /\*\*Output and stage checks:\*\*/, heading[1]);
    assert.match(section, /Stage [0-6]/, heading[1]);
  }
  assert.match(guide, /12af471f627f866411b4bd785b19646d3672784c/);
  assert.doesNotMatch(guide, /thirteen|experimental/i);
  assert.match(guide, /taste[\s\S]*advisory/i);
  assert.match(guide, /never fail a design-pipeline stage, gate or delivery/);
  assert.match(guide, /Component\s+Conformance/);
  assert.match(guide, /Visual\s+Acceptance/);
  const leftSection = guide.slice(guide.indexOf("## Methods that left this bundle"), guide.indexOf("## Verification and availability"));
  for (const name of departed) {
    assert.ok(leftSection.includes(`\`${name}\``), name);
    assert.doesNotMatch(guide, new RegExp(`\\(#${name}\\)`), name);
  }
  assert.doesNotMatch(guide.replace(leftSection, ""), /taste-skill-classics|imagegen-skills/);
  for (const reference of ["capability-routing.md", "companion-skills.md", "feature-routes.md", "pipeline-reference.md", "stages.md", "qa-checklist.md", "workflow-web.md"]) {
    const text = fs.readFileSync(path.join(repoRoot, "skill/references", reference), "utf8");
    assert.doesNotMatch(text, /thirteen|Taste suite|taste-skill\.md#(?:design-taste-frontend|image-to-code|imagegen|brandkit|stitch|full-output|redesign-existing|gpt-taste|minimalist|industrial|high-end)/i, reference);
  }
});

test("a relocated full pipeline needs no ambient Taste skills and fails its core check when a bundled skill is missing", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "design-pipeline-taste-install-"));
  try {
    const skillRoot = path.join(root, "isolated-skills");
    const installed = path.join(skillRoot, "design-pipeline");
    fs.mkdirSync(skillRoot);
    fs.cpSync(path.join(repoRoot, "skill"), installed, { recursive: true });
    const home = path.join(root, "home");
    fs.mkdirSync(home);
    const env = {
      DESIGN_PIPELINE_SKILL_ROOTS: skillRoot,
      CODEX_SKILLS_DIR: "",
      CODEX_HOME: path.join(home, ".codex"),
      HOME: home,
      USERPROFILE: home,
    };
    const check = () => run(process.execPath, [path.join(installed, "scripts/check-deps.cjs"), "--json"], root, env);
    const result = check();
    assert.equal(result.status, 0, result.stderr || result.stdout);
    const report = JSON.parse(result.stdout);
    assert.equal(report.result, "OK");
    assert.deepEqual(report.skillRoots, [skillRoot]);
    assert.deepEqual(fs.readdirSync(skillRoot), ["design-pipeline"]);
    const profile = report.capabilityProfiles.find((item) => item.id === "visual-direction-review");
    assert.equal(profile.status, "OK");
    assert.deepEqual(profile.installedSkills, ["design-pipeline"]);
    assert.equal(profile.checkedSkillPaths["design-pipeline"], path.join(installed, "SKILL.md"));
    assert.deepEqual(profile.missingMarkers, []);
    for (const [directory, name] of reviewedSkills) {
      const entry = path.join(installed, "vendor/taste-skill/upstream/skills", directory, "UPSTREAM-SKILL.md");
      assert.equal(frontmatter(entry).name, name);
      assert.equal(fs.readFileSync(entry).equals(fs.readFileSync(path.join(sourceRoot, "skills", directory, "UPSTREAM-SKILL.md"))), true, name);
    }
    const requested = report.groups.flatMap((group) => group.missing);
    for (const [, name] of reviewedSkills) assert.equal(requested.includes(name), false, name);
    fs.rmSync(path.join(installed, "vendor/taste-skill/upstream/skills/taste-skill/scripts/inspect.mjs"));
    const broken = check();
    assert.equal(broken.status, 1, broken.stderr || broken.stdout);
    const brokenReport = JSON.parse(broken.stdout);
    assert.equal(brokenReport.result, "FAIL");
    const core = brokenReport.groups.find((group) => group.name === "Core pipeline");
    assert.equal(core.status, "FAIL");
    assert.ok(core.missingResources.includes("design-pipeline/vendor/taste-skill/upstream/skills/taste-skill/scripts/inspect.mjs"));
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("the existing source-check test fails for changed, missing or added Taste blobs in an owned copy", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "design-pipeline-taste-source-check-"));
  try {
    const copyFile = (relative) => {
      const output = path.join(root, relative);
      fs.mkdirSync(path.dirname(output), { recursive: true });
      fs.copyFileSync(path.join(repoRoot, relative), output);
    };
    for (const relative of [
      "tests/taste-skill.test.cjs",
      "scripts/git-tree-snapshot.cjs",
      "skill/scripts/mengto-skills-core.cjs",
      "skill/scripts/upstream-path.cjs",
      "skill/scripts/vendor-cache.cjs",
      "tests/helpers/upstream-names.cjs",
      "skill/references/package-resources.json",
    ]) copyFile(relative);
    fs.cpSync(vendorRoot, path.join(root, "skill/vendor/taste-skill"), { recursive: true });
    // A separate source-check run must not inherit Node's recursive test-runner context.
    const check = () => run(process.execPath, ["--test", "--test-reporter", "tap", "--test-name-pattern", "^taste-skill preserves the complete reviewed", path.join(root, "tests/taste-skill.test.cjs")], root, { NODE_TEST_CONTEXT: undefined });
    const baseline = check();
    assert.equal(baseline.status, 0, baseline.stderr || baseline.stdout);
    assert.match(baseline.stdout, /^# pass 1$/m);
    const rejects = (pattern) => {
      const result = check();
      assert.equal(result.status, 1, result.stderr || result.stdout);
      assert.match(result.stdout, /not ok.*taste-skill preserves the complete reviewed/);
      assert.match(result.stdout, pattern);
    };
    const copiedSource = path.join(root, "skill/vendor/taste-skill/upstream");
    const changed = path.join(copiedSource, "README.md");
    const original = fs.readFileSync(changed);
    const corrupted = Buffer.from(original);
    corrupted[0] ^= 1;
    fs.writeFileSync(changed, corrupted);
    rejects(/README\.md/);
    fs.writeFileSync(changed, original);
    const missing = path.join(copiedSource, "skills/taste-skill/UPSTREAM-SKILL.md");
    const missingBytes = fs.readFileSync(missing);
    fs.rmSync(missing);
    rejects(/71 !== 72/);
    fs.writeFileSync(missing, missingBytes);
    fs.writeFileSync(path.join(copiedSource, "unreviewed.txt"), "added blob\n");
    rejects(/73 !== 72/);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

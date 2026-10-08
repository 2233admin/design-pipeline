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

const repoRoot = path.resolve(__dirname, "..");
const vendorRoot = path.join(repoRoot, "skill/vendor/taste-skill");
const sourceRoot = path.join(vendorRoot, "upstream");
const manifest = JSON.parse(fs.readFileSync(path.join(vendorRoot, "manifest.json"), "utf8"));
const reviewedSkills = [
  ["brandkit", "brandkit"],
  ["brutalist-skill", "industrial-brutalist-ui"],
  ["gpt-tasteskill", "gpt-taste"],
  ["image-to-code-skill", "image-to-code"],
  ["imagegen-frontend-mobile", "imagegen-frontend-mobile"],
  ["imagegen-frontend-web", "imagegen-frontend-web"],
  ["minimalist-skill", "minimalist-ui"],
  ["output-skill", "full-output-enforcement"],
  ["redesign-skill", "redesign-existing-projects"],
  ["soft-skill", "high-end-visual-design"],
  ["stitch-skill", "stitch-design-taste"],
  ["taste-skill-v1", "design-taste-frontend-v1"],
  ["taste-skill", "design-taste-frontend"],
];
const read = (file) => fs.readFileSync(path.join(sourceRoot, file), "utf8");

function filesIn(root, relative = "") {
  return fs.readdirSync(path.join(root, relative), { withFileTypes: true }).flatMap((entry) => {
    const file = relative ? `${relative}/${entry.name}` : entry.name;
    assert.equal(fs.lstatSync(path.join(root, file)).isSymbolicLink(), false, file);
    return entry.isDirectory() ? filesIn(root, file) : [file];
  }).sort();
}

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
  assert.equal(manifest.source.revision, "b482f7a970abb98c4108d4a9f761e458c64cefc8");
  assert.equal(manifest.source.gitTree, "2589404b7fd08979aafbeb8074d4bc416fe428a3");
  assert.equal(manifest.source.license, "MIT");
  assert.deepEqual(manifest.source.scope, ["**"]);
  assert.equal(manifest.snapshot.root, "upstream");
  const files = filesIn(sourceRoot);
  assert.equal(files.length, 62);
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
  assert.equal(bytes, 4824721);
  assert.equal(manifest.snapshot.byteCount, bytes);
  assert.equal(gitTreeId(manifest.snapshot.objects), manifest.source.gitTree);
  assert.equal(manifest.snapshot.treeSha256, "5c05edf236140ec2152a02c95f079911ce4636dd1b15089ad9292be9d0b5a40a");
  assert.equal(canonicalTree(sourceRoot, files), manifest.snapshot.treeSha256);
  assert.deepEqual(manifest.snapshot.executableFiles, []);
  assert.deepEqual(manifest.licenses, [{ path: "upstream/LICENSE", license: "MIT", copyright: "Copyright (c) 2026 Leonxlnx" }]);
  assert.match(read("LICENSE"), /^MIT License/);
  assert.ok(read("LICENSE").includes(manifest.licenses[0].copyright));

  const resources = JSON.parse(fs.readFileSync(path.join(repoRoot, "skill/references/package-resources.json"), "utf8"));
  assert.ok(resources.required.includes("references/taste-skill.md"));
  assert.ok(resources.required.includes("vendor/taste-skill/manifest.json"));
  const prefix = "vendor/taste-skill/upstream/";
  assert.deepEqual(resources.required.filter((file) => file.startsWith(prefix)).map((file) => file.slice(prefix.length)).sort(), files);
  assert.equal(manifest.boundary.mode, "built-in-reference-adaptation");
  for (const boundary of ["installsUpstreamDependencies", "executesDeployment", "executesUpstreamScripts", "changesProjectRuntime"]) {
    assert.equal(manifest.boundary[boundary], false, boundary);
  }
});

test("all thirteen taste-skill frontmatters and supporting Stitch and research files remain local", () => {
  assert.deepEqual(manifest.skills.map(({ directory, name }) => [directory, name]).sort(), [...reviewedSkills].sort());
  assert.equal(new Set(manifest.skills.map((skill) => skill.name)).size, 13);
  assert.deepEqual(filesIn(path.join(sourceRoot, "skills")).filter((file) => file.endsWith("/SKILL.md")), reviewedSkills.map(([directory]) => `${directory}/SKILL.md`).sort());
  for (const skill of manifest.skills) {
    assert.equal(skill.path, `upstream/skills/${skill.directory}/SKILL.md`);
    const metadata = frontmatter(path.join(vendorRoot, skill.path));
    assert.equal(metadata.name, skill.name);
    assert.equal(metadata.description, skill.description);
    assert.ok(metadata.description.trim(), skill.name);
  }
  const supporting = [
    "skills/stitch-skill/DESIGN.md",
    "skills/llms.txt",
    "research/README.md",
    "research/laziness/README.md",
    "research/laziness/root-causes/cognitive-shortcuts.md",
    "research/laziness/root-causes/output-limits.md",
    "research/laziness/root-causes/rlhf-and-compute.md",
    "research/laziness/root-causes/training-data-bias.md",
    "research/laziness/findings/empirical-results.md",
    "research/laziness/findings/references.md",
    "research/laziness/remediation/architectural-patterns.md",
    "research/laziness/remediation/parameter-tuning.md",
    "research/laziness/remediation/prompt-engineering.md",
    "research/laziness/remediation/reference-prompts.md",
  ];
  for (const file of supporting) {
    assert.ok(manifest.snapshot.objects.some((object) => object.path === file), file);
    assert.ok(read(file).trim(), file);
  }
});

test("taste-skill import rejects unreviewed, dirty, incomplete and invalid-date sources without replacing the snapshot", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "design-pipeline-taste-import-"));
  try {
    const scripts = path.join(root, "scripts");
    fs.mkdirSync(scripts);
    for (const file of ["import-taste-skill.cjs", "git-tree-snapshot.cjs"]) fs.copyFileSync(path.join(repoRoot, "scripts", file), path.join(scripts, file));
    const destination = path.join(root, "skill/vendor/taste-skill");
    fs.mkdirSync(path.join(destination, "upstream"), { recursive: true });
    fs.writeFileSync(path.join(destination, "manifest.json"), "previous snapshot\n");
    fs.writeFileSync(path.join(destination, "upstream/preserved.txt"), "previous bytes\n");
    const before = canonicalTree(destination, filesIn(destination));
    const source = path.join(root, "source");
    fs.cpSync(sourceRoot, source, { recursive: true });
    const git = (args) => { const result = run("git", args, source); assert.equal(result.status, 0, result.stderr); };
    git(["init", "--quiet"]);
    git(["config", "core.autocrlf", "false"]);
    git(["add", "--force", "."]);
    const commit = () => git(["-c", "user.name=Taste Test", "-c", "user.email=taste-test@example.invalid", "commit", "--quiet", "-m", "fixture"]);
    commit();
    assert.equal(run("git", ["rev-parse", "HEAD^{tree}"], source).stdout.trim(), manifest.source.gitTree);
    const rejects = (pattern, extra = []) => {
      const result = run(process.execPath, [path.join(scripts, "import-taste-skill.cjs"), "--source", source, "--reviewed-at", "2026-10-08", ...extra], root);
      assert.equal(result.status, 1, result.stdout);
      assert.match(result.stderr, pattern);
      assert.equal(canonicalTree(destination, filesIn(destination)), before);
      assert.deepEqual(fs.readdirSync(path.dirname(destination)), ["taste-skill"]);
    };
    rejects(/source revision must be the reviewed/);
    fs.appendFileSync(path.join(source, "README.md"), "dirty\n");
    rejects(/tracked working-tree changes/);
    fs.writeFileSync(path.join(source, "README.md"), read("README.md"));
    fs.writeFileSync(path.join(source, "LICENSE"), "wrong license\n");
    git(["add", "."]); commit();
    rejects(/LICENSE does not match reviewed/);
    fs.rmSync(path.join(source, "skills/taste-skill-v1/SKILL.md"));
    rejects(/missing skills\/taste-skill-v1\/SKILL\.md/);
    rejects(/valid YYYY-MM-DD/, ["--reviewed-at", "2026-02-30"]);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("taste-skill guide reaches all thirteen local sources and states adaptation and acceptance boundaries", () => {
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
  const headings = [...guide.matchAll(/^### ([^\r\n]+)$/gm)];
  assert.deepEqual(headings.map((heading) => heading[1]).sort(), reviewedSkills.map(([, name]) => name).sort());
  for (const [directory, name] of reviewedSkills) {
    const index = headings.findIndex((heading) => heading[1] === name);
    const section = guide.slice(headings[index].index, headings[index + 1]?.index || guide.length);
    const sourceLink = `../vendor/taste-skill/upstream/skills/${directory}/SKILL.md`;
    assert.ok(localLinks.includes(sourceLink), directory);
    assert.ok(section.includes(sourceLink), name);
    assert.match(section, /\*\*Trigger:\*\*/);
    assert.match(section, /\*\*Output and stage checks:\*\*/);
    assert.match(section, /Stage [0-6]/);
  }
  assert.match(guide, /v2[\s\S]*experimental/i);
  assert.match(guide, /Component\s+Conformance/);
  assert.match(guide, /Visual\s+Acceptance/);
  assert.match(guide, /image[- ]only|images only/i);
  assert.match(guide, /provider/i);
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
      const entry = path.join(installed, "vendor/taste-skill/upstream/skills", directory, "SKILL.md");
      assert.equal(frontmatter(entry).name, name);
      assert.equal(fs.readFileSync(entry).equals(fs.readFileSync(path.join(sourceRoot, "skills", directory, "SKILL.md"))), true, name);
    }
    const requested = report.groups.flatMap((group) => group.missing);
    for (const [, name] of reviewedSkills) assert.equal(requested.includes(name), false, name);
    fs.rmSync(path.join(installed, "vendor/taste-skill/upstream/skills/taste-skill-v1/SKILL.md"));
    const broken = check();
    assert.equal(broken.status, 1, broken.stderr || broken.stdout);
    const brokenReport = JSON.parse(broken.stdout);
    assert.equal(brokenReport.result, "FAIL");
    const core = brokenReport.groups.find((group) => group.name === "Core pipeline");
    assert.equal(core.status, "FAIL");
    assert.ok(core.missingResources.includes("design-pipeline/vendor/taste-skill/upstream/skills/taste-skill-v1/SKILL.md"));
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
    const missing = path.join(copiedSource, "skills/taste-skill/SKILL.md");
    const missingBytes = fs.readFileSync(missing);
    fs.rmSync(missing);
    rejects(/61 !== 62/);
    fs.writeFileSync(missing, missingBytes);
    fs.writeFileSync(path.join(copiedSource, "unreviewed.txt"), "added blob\n");
    rejects(/63 !== 62/);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

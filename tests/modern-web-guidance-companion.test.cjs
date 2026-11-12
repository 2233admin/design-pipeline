"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const repoRoot = path.resolve(__dirname, "..");
const checkScript = path.join(repoRoot, "skill/scripts/check-deps.cjs");
const GROUP = "Web platform guidance";
const PROFILE = "modern-web-guidance-skill";
const INSTALL = "npx -y modern-web-guidance@latest install";

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function registry() {
  return JSON.parse(read("skill/references/companion-capabilities.json"));
}

function runCheck(root) {
  const result = spawnSync(process.execPath, [checkScript, "--json"], {
    cwd: repoRoot,
    encoding: "utf8",
    env: { ...process.env, DESIGN_PIPELINE_SKILL_ROOTS: root, CODEX_SKILLS_DIR: "" },
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return JSON.parse(result.stdout);
}

const SKILL_BODY = [
  "---",
  "name: modern-web-guidance",
  "---",
  "npx -y modern-web-guidance@latest search \"<query>\" --skill-version 1",
  "npx -y modern-web-guidance@latest retrieve \"<id>\"",
  "## Interpreting Browser Support & Fallbacks",
  "",
].join("\n");

test("the registry holds one optional group and one profile that agree with the lock", () => {
  const data = registry();
  const group = data.groups.find((item) => item.name === GROUP);
  assert.ok(group, "missing group");
  assert.equal(group.level, "optional");
  assert.deepEqual(group.skills, ["modern-web-guidance"]);
  assert.equal(group.install.length, 1);
  assert.ok(group.install[0].includes(INSTALL), group.install[0]);
  assert.ok(group.install[0].includes(`DISABLE_TELEMETRY=1 ${INSTALL}`), group.install[0]);
  assert.match(group.fallback, /good-css\.md/);
  assert.match(group.fallback, /qa\.md/);

  const profile = data.profiles.find((item) => item.id === PROFILE);
  assert.ok(profile, "missing profile");
  assert.equal(profile.skill, "modern-web-guidance");
  assert.equal(profile.level, "optional");
  assert.deepEqual(
    profile.requirements.map((item) => item.id),
    profile.sourceMeta.reviewedMarkers,
  );
  assert.match(profile.sourceMeta.useBoundary, /companion/);
  assert.match(profile.fallback, /modern-web-guidance\.md#when-it-is-not-installed/);

  const lock = JSON.parse(read("sources.lock.json"));
  const entry = lock.sources.find((item) => item.id === "modern-web-guidance");
  assert.ok(entry, "missing lock entry");
  // The guide is adapted from the upstream skill, so the lock follows its revision and content hash.
  assert.equal(entry.kind, "adapted-reference");
  assert.deepEqual(entry.documents, ["skill/references/modern-web-guidance.md"]);
  assert.equal(entry.repo, "https://github.com/GoogleChrome/modern-web-guidance");
  assert.deepEqual(entry.profiles, [profile.sourceMeta.id]);
  assert.equal(profile.sourceMeta.reviewedRevision, entry.revision);

  // The component source catalog holds the one canonical record the profile points at.
  const catalog = JSON.parse(read("skill/references/component-source-catalog.json"));
  const records = catalog.docs.filter((item) => item.recordType === "source" && item.sourceId === profile.sourceId);
  assert.equal(records.length, 1);
  assert.equal(records[0].license.id, "Apache-2.0");
  assert.equal(records[0].localPaths.guide, "references/modern-web-guidance.md");
  assert.equal(records[0].provenance.revision, entry.revision);
  assert.ok(read("THIRD_PARTY_NOTICES.md").includes(entry.revision), "THIRD_PARTY_NOTICES.md names the locked revision");
});

test("the guide records the reviewed package, skill version and a content hash with its scope", () => {
  const guide = read("skill/references/modern-web-guidance.md");
  const meta = Object.fromEntries(
    [...guide.match(/^---\r?\n([\s\S]*?)\r?\n---/)[1].matchAll(/^  ([A-Za-z]+):\s*(.+)$/gm)].map(([, key, value]) => [key, value]),
  );
  const lock = JSON.parse(read("sources.lock.json"));
  const entry = lock.sources.find((item) => item.id === "modern-web-guidance");
  assert.equal(meta.reviewedRevision, entry.revision);
  assert.match(meta.reviewedContentHash, /^[0-9a-f]{64}$/);
  assert.equal(meta.contentHashScope, "ordered UTF-8 sourceFiles with path-and-newline separators");
  assert.equal(meta.sourceFiles, "skills/modern-web-guidance/SKILL.md, LICENSE");
  assert.match(meta.reviewedPackage, /^modern-web-guidance@\d+\.\d+\.\d+$/);
  assert.match(meta.reviewedSkillVersion, /^\d{4}_\d{2}_\d{2}-[0-9a-f]{8}$/);
  assert.equal(meta.license, "Apache-2.0");
  // The skill version the guide teaches to pass is the one that was reviewed.
  assert.ok(guide.includes(meta.reviewedSkillVersion), "the body names the reviewed skill version");
  assert.ok(guide.includes(meta.reviewedPackage), "the body names the reviewed package");
});

test("every modern-web-guidance command the pipeline writes runs with telemetry off", () => {
  const files = [
    "skill/SKILL.md",
    "skill/references/modern-web-guidance.md",
    "skill/references/companion-capabilities.json",
    "skill/references/companion-skills.md",
    "skill/references/capability-routing.md",
    "skill/references/stages.md",
    "skill/references/pipeline-reference.md",
    "skill/references/anti-slop-review.md",
    "skill/references/template-bank.md",
    "docs/install.md",
    "docs/features.md",
  ];
  // The allowlist pattern `npx -y modern-web-guidance@latest *` is a permission rule, not a command.
  const command = /(DISABLE_TELEMETRY=1 )?npx(?:\.cmd)? (?:-y )?modern-web-guidance@latest(?! \*)/g;
  let seen = 0;
  for (const file of files) {
    for (const match of read(file).matchAll(command)) {
      seen += 1;
      assert.ok(match[1], `${file}: "${match[0]}" lacks DISABLE_TELEMETRY=1`);
    }
  }
  assert.ok(seen >= 8, `expected the guide and the install hint to carry commands, saw ${seen}`);
});

test("self-check reports the companion as absent, current and stale without failing", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "design-pipeline-mwg-"));
  try {
    fs.cpSync(path.join(repoRoot, "skill"), path.join(root, "design-pipeline"), { recursive: true });
    const skillDir = path.join(root, "modern-web-guidance");

    const absent = runCheck(root);
    const absentGroup = absent.groups.find((item) => item.name === GROUP);
    const absentProfile = absent.capabilityProfiles.find((item) => item.id === PROFILE);
    assert.equal(absent.result, "OK");
    assert.equal(absentGroup.status, "WARN");
    assert.deepEqual(absentGroup.missing, ["modern-web-guidance"]);
    assert.ok(absentGroup.install[0].includes(INSTALL));
    assert.match(absentGroup.fallback, /good-css\.md/);
    assert.equal(absentProfile.status, "INFO");
    assert.equal(absentProfile.installed, false);

    fs.mkdirSync(skillDir, { recursive: true });
    fs.writeFileSync(path.join(skillDir, "SKILL.md"), SKILL_BODY);
    const current = runCheck(root);
    assert.equal(current.groups.find((item) => item.name === GROUP).status, "OK");
    const currentProfile = current.capabilityProfiles.find((item) => item.id === PROFILE);
    assert.equal(currentProfile.status, "OK");
    assert.deepEqual(currentProfile.missingMarkers, []);

    fs.writeFileSync(path.join(skillDir, "SKILL.md"), SKILL_BODY.replace("retrieve", "fetch"));
    const stale = runCheck(root);
    const staleProfile = stale.capabilityProfiles.find((item) => item.id === PROFILE);
    assert.equal(stale.result, "OK");
    assert.equal(staleProfile.status, "WARN");
    assert.deepEqual(staleProfile.missingMarkers, ["retrieve-command"]);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("no upstream guide, script or search data is part of the package", () => {
  assert.equal(fs.existsSync(path.join(repoRoot, "skill", "vendor", "modern-web-guidance")), false);
  const resources = JSON.parse(read("skill/references/package-resources.json"));
  assert.equal(resources.required.some((file) => /vendor\/modern-web-guidance/.test(file)), false);
  assert.ok(resources.required.includes("references/modern-web-guidance.md"));
  const lock = JSON.parse(read("sources.lock.json"));
  assert.equal(lock.sources.some((entry) => entry.bundle === "modern-web-guidance"), false);
});

test("the guide teaches the loop, the install forms and the limits the spec requires", () => {
  const guide = read("skill/references/modern-web-guidance.md");
  for (const text of [
    "npx modern-web-guidance@latest install",
    INSTALL,
    "modern-web-guidance@latest search",
    "modern-web-guidance@latest retrieve",
    "`qa.md`",
    "DESIGN.md",
    "Visual Acceptance",
    "set-allow-origin-trials",
    "set-allow-volatile-features",
    "DISABLE_TELEMETRY=1",
    "legacy-scan",
    "## When it is not installed",
  ]) {
    assert.ok(guide.includes(text), `guide lacks ${text}`);
  }
  assert.match(guide, /no product, route, component or framework|Leave out frameworks/);
  // The body links the repository; only the frontmatter pins a revision, and the lock follows it.
  const body = guide.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "");
  assert.doesNotMatch(body, /github\.com\/[^\s)]+\/(blob|tree|commit)\/[0-9a-f]{7,40}/);
  const lock = JSON.parse(read("sources.lock.json"));
  const entry = lock.sources.find((item) => item.id === "modern-web-guidance");
  assert.ok(guide.includes(`/tree/${entry.revision}`), "frontmatter url pins the locked revision");
});

test("the guide says when to consult it, that the project wins and how a review cites it", () => {
  const guide = read("skill/references/modern-web-guidance.md");
  // Three cases: a concrete platform pattern, a review that needs a sourced rule, and the one that does not.
  assert.match(guide, /## Consult it on demand/);
  assert.match(guide, /produces or reviews one concrete platform pattern in a web interface/);
  assert.match(guide, /review has to state a platform rule/);
  assert.match(guide, /only follows what the repository already does/);
  assert.match(guide, /backend, CI, scripts, tooling, copy edits/);
  // The project's own rules win, with the reduced-motion example.
  assert.match(guide, /\*\*The project wins\.\*\*/);
  assert.match(guide, /`prefers-reduced-motion`/);
  assert.match(guide, /`AGENTS\.md`/);
  // Reviews cite a guide id and one line of conclusion and copy nothing.
  assert.match(guide, /persistent-toast-notifications: /);
  assert.match(guide, /Never copy the guide's wording/);
  assert.match(guide, /retrieve/);
  // No private product name in the shipped package.
  assert.doesNotMatch(guide, /KatanaConsole/i);
  for (const file of ["skill/references/anti-slop-review.md", "skill/references/template-bank.md"]) {
    assert.match(read(file), /persistent-toast-notifications: /, file);
    assert.match(read(file), /modern-web-guidance\.md/, file);
  }
});

test("routing documents send the choice of a newer platform feature to the guide", () => {
  for (const file of [
    "skill/SKILL.md",
    "skill/references/capability-routing.md",
    "skill/references/companion-skills.md",
    "skill/references/stages.md",
    "skill/references/pipeline-reference.md",
  ]) {
    assert.match(read(file), /modern-web-guidance/, file);
  }
  assert.match(read("skill/references/capability-routing.md"), /\(modern-web-guidance\.md\)/);
  assert.match(read("docs/install.md"), /modern-web-guidance@latest install/);
});

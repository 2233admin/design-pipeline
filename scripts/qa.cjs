#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const os = require("node:os");

const repoRoot = path.resolve(__dirname, "..");
const requiredFiles = [
  "README.md",
  "LICENSE",
  "skill/SKILL.md",
  "skill/scripts/check-deps.cjs",
  "skill/references/open-source-readiness.md",
  "skill/references/agent-interface.md",
  "skill/references/motion-spec.md",
  "skill/references/qa-checklist.md",
  "skill/references/website-cloning.md",
  "skill/references/website-clone-component-spec.md",
  "skill/references/website-cloning-manifest.schema.json",
  "skill/scripts/init-website-clone.cjs",
  "skill/scripts/evaluate-website-clone.cjs",
  "THIRD_PARTY_NOTICES.md",
  "openspec/project.md",
  "openspec/specs/design-pipeline/spec.md",
  "openspec/changes/bootstrap-design-pipeline/proposal.md",
  "openspec/changes/bootstrap-design-pipeline/design.md",
  "openspec/changes/bootstrap-design-pipeline/tasks.md",
  "openspec/changes/bootstrap-design-pipeline/specs/design-pipeline/spec.md",
];

let failed = false;

for (const file of requiredFiles) {
  const ok = fs.existsSync(path.join(repoRoot, file));
  console.log(`${ok ? "OK" : "FAIL"} ${file}`);
  if (!ok) failed = true;
}

const skillMd = fs.readFileSync(path.join(repoRoot, "skill/SKILL.md"), "utf8");
const frontmatter = skillMd.match(/^---\r?\n([\s\S]*?)\r?\n---/);
if (!frontmatter) {
  console.log("FAIL skill/SKILL.md frontmatter");
  failed = true;
} else {
  const hasName = /^name:\s*design-pipeline\s*$/m.test(frontmatter[1]);
  const hasDescription = /^description:\s*\S+/m.test(frontmatter[1]);
  console.log(`${hasName ? "OK" : "FAIL"} skill/SKILL.md frontmatter name`);
  console.log(`${hasDescription ? "OK" : "FAIL"} skill/SKILL.md frontmatter description`);
  if (!hasName || !hasDescription) failed = true;
}

const referenceSources = [
  "skill/SKILL.md",
  "skill/references/companion-skills.md",
  "skill/references/curation-policy.md",
  "skill/references/development-compatibility.md",
  "skill/references/open-source-readiness.md",
  "skill/references/qa-checklist.md",
  "skill/references/self-check.md",
  "skill/references/website-cloning.md",
  "README.md",
  "CONTRIBUTING.md",
];

for (const sourceFile of referenceSources) {
  const fullPath = path.join(repoRoot, sourceFile);
  if (!fs.existsSync(fullPath)) continue;
  const text = fs.readFileSync(fullPath, "utf8");
  const matches = text.matchAll(/(?:`)?((?:references|scripts)\/[A-Za-z0-9._/-]+)(?:`)?/g);
  for (const match of matches) {
    const rel = match[1];
    const base = sourceFile.startsWith("skill/") ? path.join(repoRoot, "skill") : repoRoot;
    const candidate = path.join(base, rel);
    const skillCandidate = path.join(repoRoot, "skill", rel);
    const ok = fs.existsSync(candidate) || fs.existsSync(skillCandidate);
    console.log(`${ok ? "OK" : "FAIL"} reference ${sourceFile} -> ${rel}`);
    if (!ok) failed = true;
  }
}

const check = spawnSync(process.execPath, [path.join(repoRoot, "skill/scripts/check-deps.cjs"), "--json"], {
  cwd: repoRoot,
  encoding: "utf8",
  env: (() => {
    const skillRoot = fs.mkdtempSync(path.join(os.tmpdir(), "design-pipeline-qa-"));
    fs.cpSync(path.join(repoRoot, "skill"), path.join(skillRoot, "design-pipeline"), {
      recursive: true,
    });
    process.on("exit", () => fs.rmSync(skillRoot, { recursive: true, force: true }));
    return { ...process.env, CODEX_SKILLS_DIR: skillRoot };
  })(),
});

if (check.status !== 0) {
  console.log("FAIL self-check exited non-zero");
  process.stdout.write(check.stdout);
  process.stderr.write(check.stderr);
  failed = true;
} else {
  const parsed = JSON.parse(check.stdout);
  console.log(`OK self-check result=${parsed.result}`);
  if (parsed.result !== "OK") failed = true;
}

try {
  const schema = JSON.parse(
    fs.readFileSync(
      path.join(repoRoot, "skill/references/website-cloning-manifest.schema.json"),
      "utf8",
    ),
  );
  const ok = schema.$schema === "https://json-schema.org/draft/2020-12/schema";
  console.log(`${ok ? "OK" : "FAIL"} website-cloning manifest schema`);
  if (!ok) failed = true;
} catch (error) {
  console.log(`FAIL website-cloning manifest schema: ${error.message}`);
  failed = true;
}

const tests = spawnSync(process.execPath, ["--test", "tests/website-cloning-init.test.cjs"], {
  cwd: repoRoot,
  encoding: "utf8",
});
process.stdout.write(tests.stdout);
process.stderr.write(tests.stderr);
if (tests.status !== 0) {
  console.log("FAIL website-cloning initializer tests");
  failed = true;
} else {
  console.log("OK website-cloning initializer tests");
}

process.exitCode = failed ? 1 : 0;

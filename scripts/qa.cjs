#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

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

const check = spawnSync(process.execPath, [path.join(repoRoot, "skill/scripts/check-deps.cjs"), "--json"], {
  cwd: repoRoot,
  encoding: "utf8",
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

process.exitCode = failed ? 1 : 0;

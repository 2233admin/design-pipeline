#!/usr/bin/env node

/**
 * Package design-pipeline skill for GitHub Releases / offline install.
 * Output: dist/design-pipeline-skill.tgz  (and .zip when PowerShell is available)
 */

const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { spawnSync } = require("node:child_process");

const repoRoot = path.resolve(__dirname, "..");
const skillDir = path.join(repoRoot, "skill");
const distDir = path.join(repoRoot, "dist");
const version =
  process.env.PACKAGE_VERSION ||
  process.env.GITHUB_REF_NAME?.replace(/^v/, "") ||
  "0.0.0-dev";

function fail(msg) {
  console.error(`FAIL ${msg}`);
  process.exit(1);
}

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, {
    encoding: "utf8",
    shell: false,
    ...opts,
  });
  if (r.status !== 0) {
    fail(`${cmd} ${args.join(" ")}\n${r.stdout || ""}\n${r.stderr || ""}`);
  }
  return r;
}

if (!fs.existsSync(path.join(skillDir, "SKILL.md"))) {
  fail("skill/SKILL.md missing");
}

fs.rmSync(distDir, { recursive: true, force: true });
fs.mkdirSync(distDir, { recursive: true });

const staging = fs.mkdtempSync(path.join(os.tmpdir(), "design-pipeline-pkg-"));
const stagedSkill = path.join(staging, "design-pipeline");
fs.cpSync(skillDir, stagedSkill, { recursive: true });

const meta = {
  name: "design-pipeline",
  version,
  packagedAt: new Date().toISOString(),
  source: "https://github.com/2233admin/design-pipeline",
  install: [
    "mkdir -p ~/.codex/skills/design-pipeline",
    "tar -xzf design-pipeline-skill.tgz -C ~/.codex/skills",
    "node ~/.codex/skills/design-pipeline/scripts/check-deps.cjs",
  ],
};
fs.writeFileSync(path.join(stagedSkill, "PACKAGE.json"), JSON.stringify(meta, null, 2) + "\n");

const tgz = path.join(distDir, "design-pipeline-skill.tgz");
const tar = spawnSync("tar", ["-czf", tgz, "-C", staging, "design-pipeline"], {
  encoding: "utf8",
});
if (tar.status !== 0) {
  fail(`tar failed: ${tar.stderr || tar.stdout || "not found"}`);
}

const zip = path.join(distDir, "design-pipeline-skill.zip");
let zipOk = false;
if (process.platform === "win32") {
  const ps = spawnSync(
    "powershell",
    [
      "-NoProfile",
      "-Command",
      `Compress-Archive -Path '${stagedSkill}' -DestinationPath '${zip}' -Force`,
    ],
    { encoding: "utf8" },
  );
  zipOk = ps.status === 0 && fs.existsSync(zip);
} else {
  const zipCmd = spawnSync("zip", ["-r", zip, "design-pipeline"], {
    cwd: staging,
    encoding: "utf8",
  });
  zipOk = zipCmd.status === 0 && fs.existsSync(zip);
}

const tgzStat = fs.statSync(tgz);
console.log(`OK ${path.relative(repoRoot, tgz)} (${tgzStat.size} bytes) v${version}`);
if (zipOk) {
  console.log(`OK ${path.relative(repoRoot, zip)} (${fs.statSync(zip).size} bytes)`);
} else {
  console.log("WARN zip package skipped (optional)");
}

fs.writeFileSync(
  path.join(distDir, "checksums.txt"),
  [
    `${require("node:crypto").createHash("sha256").update(fs.readFileSync(tgz)).digest("hex")}  design-pipeline-skill.tgz`,
    zipOk
      ? `${require("node:crypto").createHash("sha256").update(fs.readFileSync(zip)).digest("hex")}  design-pipeline-skill.zip`
      : null,
  ]
    .filter(Boolean)
    .join("\n") + "\n",
);
console.log("OK dist/checksums.txt");

fs.rmSync(staging, { recursive: true, force: true });

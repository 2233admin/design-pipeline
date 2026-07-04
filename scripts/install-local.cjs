#!/usr/bin/env node

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..");
const source = path.join(repoRoot, "skill");
const skillsRoot =
  process.env.CODEX_SKILLS_DIR ||
  path.join(process.env.CODEX_HOME || path.join(os.homedir(), ".codex"), "skills");
const target = path.join(skillsRoot, "design-pipeline");

fs.rmSync(target, { recursive: true, force: true });
fs.mkdirSync(target, { recursive: true });
fs.cpSync(source, target, { recursive: true });

console.log(`Installed design-pipeline to ${target}`);

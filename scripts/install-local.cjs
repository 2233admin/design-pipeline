#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

function fail(message) { throw new Error(message); }
function inside(root, target) {
  const relative = path.relative(root, target);
  return relative === "" || (!path.isAbsolute(relative) && relative !== ".." && !relative.startsWith(`..${path.sep}`));
}

function parseArgs(argv) {
  const options = { replace: false };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--replace") { options.replace = true; continue; }
    if (token === "--help" || token === "-h") { options.help = true; continue; }
    if (["--root", "--target", "--source"].includes(token)) {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) fail(`${token} requires a value`);
      options[token.slice(2)] = value;
      index += 1;
      continue;
    }
    fail(`unknown option: ${token}`);
  }
  return options;
}

function nearestExisting(target) {
  let current = target;
  while (!fs.existsSync(current)) {
    const parent = path.dirname(current);
    if (parent === current) fail(`no existing parent for ${target}`);
    current = parent;
  }
  return current;
}

function assertNoLinkPath(root, target) {
  const relative = path.relative(root, target);
  let current = root;
  for (const part of relative.split(path.sep).filter(Boolean)) {
    current = path.join(current, part);
    if (!fs.existsSync(current)) break;
    if (fs.lstatSync(current).isSymbolicLink()) fail(`install path contains a symlink or junction: ${current}`);
  }
}

function assertNoLinksRecursive(root) {
  const pending = [root];
  while (pending.length) {
    const current = pending.pop();
    if (fs.lstatSync(current).isSymbolicLink()) fail(`source contains a symlink or junction: ${current}`);
    if (!fs.statSync(current).isDirectory()) continue;
    for (const entry of fs.readdirSync(current)) pending.push(path.join(current, entry));
  }
}

function removeTree(target) {
  if (fs.existsSync(target)) fs.rmSync(target, { recursive: true, force: true });
}

function install(options) {
  const repoRoot = path.resolve(__dirname, "..");
  const packagedRoot = path.join(repoRoot, "SKILL.md");
  const defaultSource = fs.existsSync(packagedRoot) ? repoRoot : path.join(repoRoot, "skill");
  const source = path.resolve(options.source || defaultSource);
  const defaultRoot = process.env.CODEX_SKILLS_DIR || path.join(process.env.CODEX_HOME || path.join(os.homedir(), ".codex"), "skills");
  const root = path.resolve(options.root || defaultRoot);
  const target = path.resolve(options.target || path.join(root, "design-pipeline"));
  if (!fs.existsSync(source) || !fs.statSync(source).isDirectory()) fail(`source does not exist: ${source}`);
  if (fs.lstatSync(source).isSymbolicLink()) fail(`source cannot be a symlink or junction: ${source}`);
  const realSource = fs.realpathSync(source);
  assertNoLinksRecursive(realSource);
  fs.mkdirSync(root, { recursive: true });
  if (fs.lstatSync(root).isSymbolicLink()) fail(`install root cannot be a symlink or junction: ${root}`);
  const realRoot = fs.realpathSync(root);
  const existingParent = fs.realpathSync(nearestExisting(path.dirname(target)));
  if (!inside(realRoot, existingParent) || !inside(root, target) || target === root) fail("--target must stay below --root");
  if (inside(realSource, target)) fail("--target cannot be the source or a descendant of it");
  assertNoLinkPath(root, nearestExisting(target));
  const temporary = `${target}.tmp-${process.pid}`;
  const backup = `${target}.backup-${process.pid}`;
  const lock = `${target}.install.lock`;
  let lockFd;
  let lockCreated = false;
  try {
    lockFd = fs.openSync(lock, "wx");
    lockCreated = true;
    fs.writeFileSync(lockFd, `${JSON.stringify({ pid: process.pid })}\n`);
    fs.fsyncSync(lockFd);
    if (fs.existsSync(temporary) || fs.existsSync(backup)) fail(`stale install transaction exists for: ${target}`);
    const targetExisted = fs.existsSync(target);
    if (targetExisted) {
      if (!options.replace) fail(`target exists; pass --replace to replace it: ${target}`);
      if (fs.lstatSync(target).isSymbolicLink()) fail(`refusing to replace a symlink or junction: ${target}`);
      const realTarget = fs.realpathSync(target);
      if (!inside(realRoot, realTarget) || realTarget === realRoot) fail("existing target resolves outside --root");
      if (inside(realTarget, realSource)) fail("source cannot be inside the target being replaced");
    }

    fs.cpSync(realSource, temporary, { recursive: true, errorOnExist: true });
    if (!fs.existsSync(path.join(temporary, "SKILL.md"))) fail("installed copy is missing SKILL.md");
    if (!targetExisted) {
      fs.renameSync(temporary, target);
      return { root: realRoot, source: realSource, target, replaced: false };
    }

    let backedUp = false;
    let installed = false;
    try {
      fs.renameSync(target, backup);
      backedUp = true;
      fs.renameSync(temporary, target);
      installed = true;
      removeTree(backup);
      backedUp = false;
    } catch (error) {
      if (installed) removeTree(target);
      if (backedUp && fs.existsSync(backup)) fs.renameSync(backup, target);
      throw error;
    }
    return { root: realRoot, source: realSource, target, replaced: true };
  } finally {
    if (lockFd !== undefined) fs.closeSync(lockFd);
    removeTree(temporary);
    if (lockCreated && fs.existsSync(lock)) fs.rmSync(lock, { force: true });
  }
}

try {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) console.log("Usage: node scripts/install-local.cjs [--root <skills-root>] [--target <path>] [--source <skill-dir>] [--replace]");
  else console.log(JSON.stringify({ schema: "design-pipeline.install-result.v1", status: "installed", ...install(options) }));
} catch (error) {
  console.error(`FAIL ${error.message}`);
  process.exitCode = 1;
}

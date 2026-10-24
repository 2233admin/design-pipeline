#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
// Packaged, this installer sits beside the skill's own scripts; in the repository the skill is skill/.
const provenance = require([
  path.join(__dirname, "install-provenance.cjs"),
  path.join(__dirname, "..", "skill", "scripts", "install-provenance.cjs"),
].find((file) => fs.existsSync(file)));

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

// A copy of uncommitted work installs, and its own doctor then reports it blocked; every other
// blocked result, and any digest mismatch, fails the install.
function validateStagedPackage(target) {
  const cli = path.join(target, "scripts", "designer-pipeline.cjs");
  const result = spawnSync(process.execPath, [cli, "doctor", "--root", target, "--json"], {
    cwd: target,
    encoding: "utf8",
    windowsHide: true,
  });
  if (result.status === 0) return;
  let report = null;
  try { report = JSON.parse(result.stdout); } catch { report = null; }
  const onlyDirty = result.status === 2 && report?.missing?.length === 0 && report.nodeSupported === true &&
    report.provenance?.dirty === true && report.provenance.digestMatch === true;
  if (!onlyDirty) fail(`staged package doctor failed: ${(result.stderr || result.stdout || "unknown error").trim()}`);
}

function readVersion(origin) {
  const file = origin?.top ? path.join(origin.top, "VERSION") : null;
  return file && fs.existsSync(file) ? fs.readFileSync(file, "utf8").trim() || null : null;
}

// PACKAGE.json is the package record. A Release package carries one with provenance: its digest must
// match the staged copy. Otherwise the record is written here, keeping an older package's fields.
function recordProvenance(source, staged) {
  const digest = provenance.treeDigest(staged);
  const carried = provenance.readRecord(source);
  if (carried.status === "invalid") fail(`source ${provenance.FILE} is unreadable: ${carried.error}`);
  if (carried.status === "recorded") {
    const problems = provenance.provenanceFields(carried.record);
    if (problems.length) fail(`source ${provenance.FILE} provenance is malformed: ${problems.join("; ")}`);
    if (carried.record.treeDigest !== digest) fail(`source files do not match ${provenance.FILE}: recorded ${carried.record.treeDigest}, found ${digest}`);
    return carried.record;
  }
  const origin = provenance.gitSource(source);
  const record = {
    ...(carried.record || {}),
    ...provenance.provenanceRecord({
      version: carried.record?.version ?? readVersion(origin),
      commit: origin?.commit ?? null,
      dirty: origin?.dirty ?? null,
      treeDigest: digest,
    }),
  };
  fs.writeFileSync(path.join(staged, provenance.FILE), `${JSON.stringify(record, null, 2)}\n`);
  return record;
}

function install(options) {
  const repoRoot = path.resolve(__dirname, "..");
  const packagedRoot = path.join(repoRoot, "SKILL.md");
  const defaultSource = fs.existsSync(packagedRoot) ? repoRoot : path.join(repoRoot, "skill");
  const source = path.resolve(options.source || defaultSource);
  // ~/.agents/skills is the user-level skills directory Codex and the other agents that follow the
  // Agent Skills layout scan. Claude Code installs through its plugin marketplace instead.
  const root = path.resolve(options.root || path.join(os.homedir(), ".agents", "skills"));
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
    const recorded = recordProvenance(realSource, temporary);
    const summary = { version: recorded.version ?? null, commit: recorded.commit, dirty: recorded.dirty, treeDigest: recorded.treeDigest };
    validateStagedPackage(temporary);
    if (!targetExisted) {
      fs.renameSync(temporary, target);
      return { root: realRoot, source: realSource, target, replaced: false, provenance: summary };
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
    return { root: realRoot, source: realSource, target, replaced: true, provenance: summary };
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

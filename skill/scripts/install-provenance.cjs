"use strict";

// Where an installed copy came from (#76). PACKAGE.json at the skill root records the source commit,
// whether the source had uncommitted changes, and a digest of the installed tree; `doctor` recomputes
// the digest so a copy edited after install, or a copy of uncommitted work, is visible. The digest
// rules are openspec/changes/add-install-provenance/design.md, version "v1".

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const SCHEMA = "design-pipeline.install-provenance.v1";
const FILE = "PACKAGE.json";
const DIGEST_RULES = "v1";
// `.design-pipeline/` is the CLI's project state, written under --root (default: cwd) when the CLI
// runs from inside the skill root. Nothing else the skill runs writes into its own root.
const RUNTIME_DIRECTORY = ".design-pipeline";

// `relative` uses `/` separators.
function excluded(relative) {
  return relative === FILE || relative.startsWith(`${RUNTIME_DIRECTORY}/`);
}

const sha256 = (data) => crypto.createHash("sha256").update(data).digest("hex");

// files: [{ path, sha256 }] with `/` paths. Sorted by the bytes of the UTF-8 path, not UTF-16 units.
function digestOf(files) {
  const sorted = files
    .filter((file) => !excluded(file.path))
    .map((file) => ({ ...file, key: Buffer.from(file.path, "utf8") }))
    .sort((left, right) => Buffer.compare(left.key, right.key));
  const hash = crypto.createHash("sha256");
  for (const file of sorted) hash.update(Buffer.concat([file.key, Buffer.from(`\0${file.sha256}\n`, "utf8")]));
  return `sha256:${hash.digest("hex")}`;
}

// Regular files only; symbolic links and junctions inside the root are neither followed nor hashed.
function treeDigest(root) {
  const files = [];
  const pending = [""];
  while (pending.length) {
    const relative = pending.pop();
    for (const entry of fs.readdirSync(path.join(root, relative), { withFileTypes: true })) {
      const child = relative ? `${relative}/${entry.name}` : entry.name;
      if (entry.isDirectory()) pending.push(child);
      else if (entry.isFile() && !excluded(child)) files.push({ path: child, sha256: sha256(fs.readFileSync(path.join(root, child))) });
    }
  }
  return digestOf(files);
}

function git(cwd, args) {
  const result = spawnSync("git", args, { cwd, encoding: "utf8", windowsHide: true });
  return result.error || result.status !== 0 ? null : result.stdout;
}

// The commit a skill directory is checked out at, or null when it is not a tracked skill in a Git
// work tree (an extracted package that happens to sit inside some other repository is not).
// `dirty` covers `pathspecs`, relative to the directory.
function gitSource(directory, pathspecs = ["."]) {
  if (git(directory, ["ls-files", "--error-unmatch", "--", "SKILL.md"]) === null) return null;
  const commit = git(directory, ["rev-parse", "HEAD"])?.trim();
  const status = git(directory, ["status", "--porcelain", "--", ...pathspecs]);
  const top = git(directory, ["rev-parse", "--show-toplevel"])?.trim();
  return {
    commit: /^[0-9a-f]{40}$/.test(commit || "") ? commit : null,
    dirty: status === null ? null : status.trim() !== "",
    branch: git(directory, ["rev-parse", "--abbrev-ref", "HEAD"])?.trim() || null,
    top: top ? path.resolve(top) : null,
  };
}

function readRecord(root) {
  const file = path.join(root, FILE);
  if (!fs.existsSync(file)) return { status: "absent", record: null };
  try {
    const record = JSON.parse(fs.readFileSync(file, "utf8"));
    if (!record || typeof record !== "object" || Array.isArray(record)) throw new Error(`${FILE} is not an object`);
    return { status: record.schema === SCHEMA ? "recorded" : "absent", record };
  } catch (error) {
    return { status: "invalid", record: null, error: error.message };
  }
}

function provenanceFields(record) {
  const problems = [];
  if (record.digestRules !== DIGEST_RULES) problems.push(`digestRules must be "${DIGEST_RULES}"`);
  if (!/^sha256:[0-9a-f]{64}$/.test(String(record.treeDigest))) problems.push("treeDigest must be sha256:<64 hex>");
  if (record.commit !== null && !/^[0-9a-f]{40}$/.test(String(record.commit))) problems.push("commit must be 40 hex characters or null");
  if (![true, false, null].includes(record.dirty)) problems.push("dirty must be true, false or null");
  return problems;
}

// What `doctor` shows. `blocking` is the reason the copy cannot be trusted, or null.
function inspectProvenance(root) {
  const { status, record, error } = readRecord(root);
  if (status === "absent") return { status, blocking: null };
  if (status === "invalid") return { status, blocking: `${FILE} is unreadable: ${error}` };
  const problems = provenanceFields(record);
  if (problems.length) return { status: "invalid", blocking: `${FILE} provenance is malformed: ${problems.join("; ")}` };
  const actual = treeDigest(root);
  const digestMatch = actual === record.treeDigest;
  return {
    status,
    version: record.version ?? null,
    commit: record.commit,
    dirty: record.dirty,
    treeDigest: record.treeDigest,
    actualDigest: actual,
    digestMatch,
    blocking: !digestMatch
      ? "files changed after install (digest mismatch)"
      : record.dirty === true
        ? "installed from a source with uncommitted changes"
        : null,
  };
}

function provenanceRecord({ version = null, commit = null, dirty = null, treeDigest: digest }) {
  return { schema: SCHEMA, version, commit, dirty, treeDigest: digest, digestRules: DIGEST_RULES };
}

module.exports = { DIGEST_RULES, FILE, SCHEMA, digestOf, excluded, gitSource, inspectProvenance, provenanceFields, provenanceRecord, readRecord, sha256, treeDigest };

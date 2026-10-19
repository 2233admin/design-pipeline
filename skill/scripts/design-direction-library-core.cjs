"use strict";

// Integrity check for the design direction library: reference text and HTML specimens ship in the
// package (`snapshot`), binaries are downloaded on demand (`fetched`, skill/scripts/vendor-cache.cjs).
// Verification reports the shipped part and the fetched part separately and never executes anything
// from either; the vendored scripts are inert reference material.

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { storedPath, upstreamFiles } = require("./upstream-path.cjs");
const { gitTreeId } = require("./mengto-skills-core.cjs");
const { partialBundles, upstreamRoot } = require("./vendor-cache.cjs");

const schema = "design-pipeline.direction-library-source.v1";
const verificationSchema = "design-pipeline.direction-library-verification.v1";

const sha256 = (content) => crypto.createHash("sha256").update(content).digest("hex");
const gitBlobId = (content) => crypto.createHash("sha1").update(`blob ${content.length}\0`).update(content).digest("hex");

function walk(root, relative = "") {
  return fs.readdirSync(path.join(root, relative), { withFileTypes: true }).flatMap((entry) => {
    const file = relative ? `${relative}/${entry.name}` : entry.name;
    if (entry.isSymbolicLink()) return [`${file}\0symlink`];
    return entry.isDirectory() ? walk(root, file) : [file];
  }).sort();
}

// Canonical tree hash: "<upstream path>\0<sha256>\n" per file, sorted by path.
function treeHash(root, files) {
  const lines = [...files].sort().map((file) => `${file}\0${sha256(fs.readFileSync(path.join(root, ...storedPath(file).split("/"))))}\n`);
  return sha256(lines.join(""));
}

// Verifies one tree (shipped or fetched) against its manifest section; returns the issue list.
function verifyTree(root, tree, label) {
  const issues = [];
  const stat = fs.lstatSync(root);
  if (stat.isSymbolicLink() || !stat.isDirectory()) return [`${label}: root is not a real directory`];
  const walked = walk(root);
  const symlinks = walked.filter((file) => file.endsWith("\0symlink"));
  for (const link of symlinks) issues.push(`${label}: symbolic link ${link.split("\0")[0]}`);
  const { files, stray } = upstreamFiles(walked.filter((file) => !file.endsWith("\0symlink")));
  for (const file of stray) issues.push(`${label}: ${file} must be stored as UPSTREAM-SKILL.md`);
  files.sort();
  const recorded = tree.objects.map((object) => object.path).sort();
  if (JSON.stringify(files) !== JSON.stringify(recorded)) {
    for (const file of files) if (!recorded.includes(file)) issues.push(`${label}: unlisted file ${file}`);
    for (const file of recorded) if (!files.includes(file)) issues.push(`${label}: missing file ${file}`);
  }
  let bytes = 0;
  for (const object of tree.objects) {
    const file = path.join(root, ...storedPath(object.path).split("/"));
    if (!fs.existsSync(file)) continue;
    const content = fs.readFileSync(file);
    bytes += content.length;
    if (content.length !== object.size) issues.push(`${label}: size mismatch ${object.path}`);
    else if (gitBlobId(content) !== object.oid) issues.push(`${label}: blob id mismatch ${object.path}`);
    else if (sha256(content) !== object.sha256) issues.push(`${label}: sha256 mismatch ${object.path}`);
  }
  if (files.length !== tree.fileCount) issues.push(`${label}: file count ${files.length} != ${tree.fileCount}`);
  if (bytes !== tree.byteCount) issues.push(`${label}: byte count ${bytes} != ${tree.byteCount}`);
  if (!issues.length && treeHash(root, files) !== tree.treeSha256) issues.push(`${label}: tree hash does not match the manifest`);
  return issues;
}

function load(manifestFile) {
  const manifest = JSON.parse(fs.readFileSync(manifestFile, "utf8"));
  if (manifest?.schema !== schema) throw new Error("design direction library: unsupported manifest schema");
  if (!/^[a-f0-9]{40}$/.test(manifest.source?.revision || "") || !/^[a-f0-9]{40}$/.test(manifest.source?.gitTree || "")) {
    throw new Error("design direction library: source revision or Git tree is invalid");
  }
  return manifest;
}

// The packaged manifest of the library under a skill root's vendor folder, or null.
function findManifest(skillRoot = path.resolve(__dirname, "..")) {
  return partialBundles(path.join(skillRoot, "vendor"))[0]?.manifestFile || null;
}

// status: "ready" (shipped and fetched verified), "missing" (shipped verified, binaries not
// downloaded yet; `fetch` names the command), "blocked" (anything else, with `issues`).
function verifyDirectionLibrary(manifestFile = findManifest(), options = {}) {
  if (!manifestFile) return { schema: verificationSchema, status: "blocked", issues: ["design direction library manifest not found"] };
  const manifest = load(manifestFile);
  const issues = [];
  const shippedRoot = path.join(path.dirname(path.resolve(manifestFile)), manifest.snapshot.root);
  const shipped = { root: shippedRoot, fileCount: manifest.snapshot.fileCount, byteCount: manifest.snapshot.byteCount };
  if (!fs.existsSync(shippedRoot)) issues.push("shipped: root is missing");
  else issues.push(...verifyTree(shippedRoot, manifest.snapshot, "shipped"));
  const all = [...manifest.snapshot.objects, ...manifest.fetched.objects];
  if (gitTreeId(all) !== manifest.source.gitTree) issues.push("shipped and fetched objects do not rebuild source.gitTree");
  const where = upstreamRoot(manifestFile, manifest, options);
  const fetched = { root: where.root, fileCount: manifest.fetched.fileCount, byteCount: manifest.fetched.byteCount, status: "ready" };
  if (!fs.existsSync(where.root)) {
    fetched.status = "missing";
  } else {
    const fetchedIssues = verifyTree(where.root, manifest.fetched, "fetched");
    if (fetchedIssues.length) fetched.status = "blocked";
    issues.push(...fetchedIssues);
  }
  const base = { schema: verificationSchema, revision: manifest.source.revision, gitTree: manifest.source.gitTree, shipped, fetched, issues };
  if (issues.length) return { ...base, status: "blocked" };
  if (fetched.status === "missing") return { ...base, status: "missing", fetch: where.fetch, issues: [`binaries not downloaded yet; run ${where.fetch}`] };
  return { ...base, status: "ready" };
}

module.exports = { findManifest, verifyDirectionLibrary, verifyTree };

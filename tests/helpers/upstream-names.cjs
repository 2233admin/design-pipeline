"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { canonicalTree } = require("../../scripts/git-tree-snapshot.cjs");
const { STORED_NAME, upstreamFiles } = require("../../skill/scripts/upstream-path.cjs");

function walk(root, relative = "") {
  return fs.readdirSync(path.join(root, relative), { withFileTypes: true }).flatMap((entry) => {
    const file = relative ? `${relative}/${entry.name}` : entry.name;
    if (fs.lstatSync(path.join(root, file)).isSymbolicLink()) throw new Error(`${file} is a symbolic link`);
    return entry.isDirectory() ? walk(root, file) : [file];
  }).sort();
}

// Stored snapshot directory -> sorted upstream paths; a stored SKILL.md is a failure.
function upstreamFilesIn(root) {
  const { files, stray } = upstreamFiles(walk(root));
  if (stray.length) throw new Error(`stored SKILL.md escaped the rename: ${stray.join(", ")}`);
  return files.sort();
}

// canonicalTree of a stored snapshot directory (canonicalTree takes upstream paths).
function storedTree(root) {
  return canonicalTree(root, upstreamFilesIn(root));
}

// A copied vendor tree simulates an upstream checkout: put the upstream names back.
function restoreUpstreamNames(root) {
  for (const file of walk(root)) {
    if (path.basename(file) === STORED_NAME) fs.renameSync(path.join(root, file), path.join(root, path.dirname(file), "SKILL.md"));
  }
}

module.exports = { restoreUpstreamNames, storedTree, upstreamFilesIn };

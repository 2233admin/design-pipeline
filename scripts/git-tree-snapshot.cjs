"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

function fail(message) {
  throw new Error(message);
}

function git(source, args) {
  const child = spawnSync("git", ["-C", source, ...args], {
    encoding: "utf8",
    windowsHide: true,
    maxBuffer: 8 * 1024 * 1024,
  });
  if (child.status !== 0) fail((child.stderr || child.stdout || `git ${args.join(" ")} failed`).trim());
  return child.stdout.trim();
}

function gitBuffer(source, args, input = null) {
  const child = spawnSync("git", ["-C", source, ...args], {
    input,
    windowsHide: true,
    maxBuffer: 256 * 1024 * 1024,
  });
  if (child.status !== 0) {
    fail((child.stderr?.toString("utf8") || child.stdout?.toString("utf8") || `git ${args.join(" ")} failed`).trim());
  }
  return child.stdout;
}

function readHeadEntries(source) {
  return git(source, ["ls-tree", "-rz", "-l", "HEAD"])
    .split("\0")
    .filter(Boolean)
    .map((entry) => {
      const match = entry.match(/^(\d{6}) blob ([a-f0-9]{40,64})\s+(\d+)\t([\s\S]+)$/);
      if (!match) fail(`unsupported Git tree entry: ${entry}`);
      return { mode: match[1], oid: match[2], size: Number.parseInt(match[3], 10), path: match[4] };
    })
    .sort((left, right) => left.path.localeCompare(right.path));
}

function readBlobs(source, entries) {
  if (!entries.length) return new Map();
  const output = gitBuffer(source, ["cat-file", "--batch"], Buffer.from(`${entries.map((entry) => entry.oid).join("\n")}\n`));
  const blobs = new Map();
  let offset = 0;
  for (const entry of entries) {
    const headerEnd = output.indexOf(0x0a, offset);
    if (headerEnd < 0) fail(`missing Git blob header: ${entry.path}`);
    const header = output.subarray(offset, headerEnd).toString("utf8").match(/^([a-f0-9]{40,64}) blob (\d+)$/);
    if (!header || header[1] !== entry.oid || Number.parseInt(header[2], 10) !== entry.size) {
      fail(`unexpected Git blob header: ${entry.path}`);
    }
    const start = headerEnd + 1;
    const end = start + entry.size;
    if (end >= output.length || output[end] !== 0x0a) fail(`truncated Git blob: ${entry.path}`);
    blobs.set(entry.path, Buffer.from(output.subarray(start, end)));
    offset = end + 1;
  }
  if (offset !== output.length) fail("unexpected trailing Git blob data");
  return blobs;
}

function copyTrackedFiles(target, entries, blobs) {
  for (const entry of entries) {
    const relative = entry.path;
    if (path.isAbsolute(relative) || relative.split(/[\\/]/).includes("..")) fail(`unsafe tracked path: ${relative}`);
    if (!new Set(["100644", "100755"]).has(entry.mode)) fail(`unsupported tracked mode: ${entry.mode} ${relative}`);
    const targetFile = path.join(target, relative);
    fs.mkdirSync(path.dirname(targetFile), { recursive: true });
    fs.writeFileSync(targetFile, blobs.get(relative));
  }
}

function canonicalTree(root, files) {
  const normalized = [...files].map((relative) => relative.split(/[\\/]/).join("/")).sort();
  const entries = normalized.map((relative) => {
    const hash = crypto.createHash("sha256").update(fs.readFileSync(path.join(root, ...relative.split("/")))).digest("hex");
    return `${relative}\0${hash}\n`;
  });
  return crypto.createHash("sha256").update(entries.join(""), "utf8").digest("hex");
}

function inspectCheckout(source) {
  if (!fs.existsSync(path.join(source, ".git"))) fail(`not a git checkout: ${source}`);
  const dirty = git(source, ["status", "--porcelain", "--untracked-files=no"]);
  if (dirty) fail(`source has tracked working-tree changes: ${source}`);
  const indexEntries = readHeadEntries(source);
  if (!indexEntries.length) fail(`source has no tracked files: ${source}`);
  return {
    source: path.resolve(source),
    revision: git(source, ["rev-parse", "HEAD"]),
    gitTree: git(source, ["rev-parse", "HEAD^{tree}"]),
    committedAt: git(source, ["log", "-1", "--format=%cI"]),
    indexEntries,
    blobs: readBlobs(source, indexEntries),
  };
}

function unquote(value) {
  const trimmed = value.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    try { return JSON.parse(trimmed); } catch { fail(`invalid quoted frontmatter value: ${trimmed}`); }
  }
  if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
    return trimmed.slice(1, -1).replaceAll("''", "'");
  }
  return trimmed;
}

function frontmatter(file) {
  const text = fs.readFileSync(file, "utf8");
  const block = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!block) fail(`missing frontmatter: ${file}`);
  const name = block[1].match(/^name:\s*(.+)$/m);
  const description = block[1].match(/^description:\s*(.+)$/m);
  if (!name || !description) fail(`missing name or description: ${file}`);
  return { name: unquote(name[1]), description: unquote(description[1]) };
}

function yamlName(file) {
  const text = fs.readFileSync(file, "utf8");
  const block = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!block) return path.basename(file, path.extname(file));
  const name = block[1].match(/^name:\s*(.+)$/m);
  const style = block[1].match(/^style:\s*(.+)$/m);
  return {
    name: name ? unquote(name[1]) : path.basename(file, path.extname(file)),
    style: style ? unquote(style[1]) : "",
  };
}

module.exports = {
  canonicalTree,
  copyTrackedFiles,
  fail,
  frontmatter,
  inspectCheckout,
  yamlName,
};

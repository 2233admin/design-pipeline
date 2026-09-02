#!/usr/bin/env node
"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..");
const manifests = [
  "skill/references/holosticker/manifest.json",
  "skill/references/iart-motion-skills/manifest.json",
  "skill/references/mengto-skills/manifest.json",
];

function fail(message) {
  throw new Error(message);
}

function parseArgs(argv) {
  const options = { all: false };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--all") options.all = true;
    else if (token === "--help" || token === "-h") options.help = true;
    else fail(`unknown option: ${token}`);
  }
  return options;
}

function gitBlobId(content) {
  return crypto
    .createHash("sha1")
    .update(`blob ${content.length}\0`, "utf8")
    .update(content)
    .digest("hex");
}

function gitObjectId(type, content) {
  return crypto
    .createHash("sha1")
    .update(`${type} ${content.length}\0`, "utf8")
    .update(content)
    .digest("hex");
}

function gitTreeId(objects) {
  const root = { children: new Map() };
  for (const object of objects) {
    const parts = object.path.split("/");
    let node = root;
    for (const part of parts.slice(0, -1)) {
      if (!node.children.has(part)) node.children.set(part, { children: new Map() });
      node = node.children.get(part);
    }
    node.children.set(parts.at(-1), object);
  }

  function hashTree(node) {
    const entries = [...node.children.entries()]
      .map(([name, child]) => ({ name, child, tree: Boolean(child.children) }))
      .sort((left, right) => Buffer.compare(
        Buffer.from(`${left.name}${left.tree ? "/" : ""}`),
        Buffer.from(`${right.name}${right.tree ? "/" : ""}`),
      ));
    const content = Buffer.concat(entries.map(({ name, child, tree }) => {
      const oid = tree ? hashTree(child) : child.oid;
      const mode = tree ? "40000" : child.mode;
      return Buffer.concat([Buffer.from(`${mode} ${name}\0`), Buffer.from(oid, "hex")]);
    }));
    return gitObjectId("tree", content);
  }

  return hashTree(root);
}

function collectFiles(root, relative = "") {
  return fs.readdirSync(path.join(root, relative), { withFileTypes: true }).flatMap((entry) => {
    const child = path.join(relative, entry.name);
    const absolute = path.join(root, child);
    if (entry.isSymbolicLink()) fail(`snapshot contains a symbolic link: ${child}`);
    if (entry.isDirectory()) return collectFiles(root, child);
    if (!entry.isFile()) fail(`snapshot contains an unsupported entry: ${child}`);
    return [child.split(path.sep).join("/")];
  });
}

function refreshManifest(relativeManifest) {
  const manifestFile = path.join(repoRoot, relativeManifest);
  const manifest = JSON.parse(fs.readFileSync(manifestFile, "utf8"));
  const sourceRoot = path.join(path.dirname(manifestFile), manifest.snapshot.root);
  const files = collectFiles(sourceRoot).sort((left, right) =>
    manifest.schema === "design-pipeline.holosticker-source.v1"
      ? left.localeCompare(right, "en")
      : left < right ? -1 : left > right ? 1 : 0,
  );
  const previousObjects = new Map((manifest.snapshot.objects || []).map((object) => [object.path, object]));
  const records = files.map((relative) => {
    const content = fs.readFileSync(path.join(sourceRoot, ...relative.split("/")));
    return {
      path: relative,
      mode: previousObjects.get(relative)?.mode || "100644",
      oid: gitBlobId(content),
      size: content.length,
      content,
    };
  });
  const treeEntries = records.map(({ path: file, content }) => {
    const hash = crypto.createHash("sha256").update(content).digest("hex");
    return `${file}\0${hash}\n`;
  });
  const objects = records.map(({ content, ...object }) => object);
  manifest.snapshot.fileCount = files.length;
  manifest.snapshot.byteCount = records.reduce((sum, record) => sum + record.size, 0);
  manifest.snapshot.treeSha256 = crypto.createHash("sha256").update(treeEntries.join(""), "utf8").digest("hex");
  if (Array.isArray(manifest.snapshot.objects)) {
    manifest.snapshot.objects = objects;
    if (manifest.source && typeof manifest.source.gitTree === "string") {
      manifest.source.gitTree = gitTreeId(objects);
    }
  }
  fs.writeFileSync(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`);
  return {
    manifest: relativeManifest,
    files: manifest.snapshot.fileCount,
    bytes: manifest.snapshot.byteCount,
    treeSha256: manifest.snapshot.treeSha256,
    ...(manifest.source?.gitTree ? { gitTree: manifest.source.gitTree } : {}),
  };
}

try {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log("Usage: node scripts/refresh-companion-snapshots.cjs --all");
  } else if (!options.all) {
    fail("--all is required; the command refreshes every vendored companion manifest atomically by file");
  } else {
    for (const manifest of manifests) console.log(JSON.stringify(refreshManifest(manifest)));
  }
} catch (error) {
  console.error(`FAIL ${error.message}`);
  process.exitCode = 1;
}

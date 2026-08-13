#!/usr/bin/env node
"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const repoRoot = path.resolve(__dirname, "..");
const destination = path.join(repoRoot, "skill", "references", "mengto-skills");
const repository = "https://github.com/MengTo/skills";
const explicitOnly = new Set([
  "article-prompts-to-skills",
  "browser-video-recording",
  "elevenlabs-tts",
  "performance-profiling",
  "publish-project-to-github",
  "ship-web-games",
  "write-like-meng-on-x",
  "x-bookmark-quote-posts",
]);

function fail(message) {
  throw new Error(message);
}

function parseArgs(argv) {
  let source = null;
  let reviewedAt = null;
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--source") {
      source = argv[index + 1];
      if (!source || source.startsWith("--")) fail("--source requires a value");
      index += 1;
    } else if (token === "--reviewed-at") {
      reviewedAt = argv[index + 1];
      if (!/^\d{4}-\d{2}-\d{2}$/.test(reviewedAt || "")) fail("--reviewed-at requires YYYY-MM-DD");
      index += 1;
    } else if (token === "--help" || token === "-h") {
      return { help: true };
    } else {
      fail(`unknown option: ${token}`);
    }
  }
  if (!source) fail("--source is required");
  if (!reviewedAt) fail("--reviewed-at is required");
  return { source: path.resolve(source), reviewedAt, help: false };
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
  if (child.status !== 0) fail((child.stderr?.toString("utf8") || child.stdout?.toString("utf8") || `git ${args.join(" ")} failed`).trim());
  return child.stdout;
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

function stages(category, name) {
  if (/publish|ship/.test(name)) {
    return category === "game-development" ? ["design", "implementation", "qa", "publication"] : ["publication"];
  }
  if (category === "web-design") return ["directions", "implementation", "qa"];
  if (category === "ui") return ["brief", "directions", "qa"];
  if (category === "media") return ["directions", "implementation"];
  if (category === "game-development") return ["design", "implementation", "qa"];
  if (/capture|video-to|reference|brand-world|html-to/.test(name)) return ["reference", "directions"];
  if (/audit|verify|optimize|profiling/.test(name)) return ["qa"];
  if (/skill/.test(name)) return ["feedback"];
  return ["implementation"];
}

function canonicalTree(root, files) {
  const entries = files.map((relative) => {
    const content = fs.readFileSync(path.join(root, relative));
    const hash = crypto.createHash("sha256").update(content).digest("hex");
    return `${relative.split(path.sep).join("/")}\0${hash}\n`;
  });
  return crypto.createHash("sha256").update(entries.join(""), "utf8").digest("hex");
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

function importSnapshot(source, reviewedAt) {
  if (!fs.existsSync(path.join(source, "agent-skills")) || !fs.existsSync(path.join(source, "LICENSE"))) {
    fail("source is not a MengTo/skills checkout");
  }
  const dirty = git(source, ["status", "--porcelain", "--untracked-files=no"]);
  if (dirty) fail("source has tracked working-tree changes; import a clean revision");

  const revision = git(source, ["rev-parse", "HEAD"]);
  const gitTree = git(source, ["rev-parse", "HEAD^{tree}"]);
  const committedAt = git(source, ["log", "-1", "--format=%cI"]);
  const indexEntries = readHeadEntries(source);
  const tracked = indexEntries.map((entry) => entry.path).sort();
  if (!tracked.length) fail("source has no tracked files");

  const stage = fs.mkdtempSync(path.join(path.dirname(destination), ".mengto-skills-stage-"));
  const backup = `${destination}.backup-${process.pid}`;
  let movedOld = false;
  let manifest;
  try {
    const upstream = path.join(stage, "upstream");
    fs.mkdirSync(upstream, { recursive: true });
    copyTrackedFiles(upstream, indexEntries, readBlobs(source, indexEntries));

    const skillFiles = tracked.filter((relative) => /^agent-skills\/[^/]+\/[^/]+\/SKILL\.md$/.test(relative));
    const skills = skillFiles.map((relative) => {
      const [, category, directory] = relative.match(/^agent-skills\/([^/]+)\/([^/]+)\/SKILL\.md$/);
      const metadata = frontmatter(path.join(upstream, relative));
      if (metadata.name !== directory) fail(`frontmatter name does not match directory: ${relative}`);
      return {
        id: `${category}/${metadata.name}`,
        name: metadata.name,
        category,
        description: metadata.description,
        path: `upstream/${relative}`,
        activation: explicitOnly.has(metadata.name) ? "explicit" : "automatic",
        stages: stages(category, metadata.name),
      };
    }).sort((left, right) => left.id.localeCompare(right.id));

    const categoryCounts = Object.fromEntries(
      [...new Set(skills.map(({ category }) => category))]
        .sort()
        .map((category) => [category, skills.filter((skill) => skill.category === category).length]),
    );
    const byteCount = tracked.reduce((sum, relative) => sum + fs.statSync(path.join(upstream, relative)).size, 0);
    manifest = {
      schema: "design-pipeline.mengto-skills-source.v1",
      source: { repository, revision, gitTree, committedAt, license: "MIT", reviewedAt, scope: ["**"] },
      snapshot: {
        root: "upstream",
        fileCount: tracked.length,
        byteCount,
        treeSha256: canonicalTree(upstream, tracked),
        executableFiles: indexEntries.filter((entry) => entry.mode === "100755").map((entry) => entry.path).sort(),
        objects: indexEntries.map((entry) => ({ path: entry.path, mode: entry.mode, oid: entry.oid, size: entry.size })),
      },
      categories: categoryCounts,
      skills,
    };
    fs.writeFileSync(path.join(stage, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);

    if (fs.existsSync(destination)) {
      fs.renameSync(destination, backup);
      movedOld = true;
    }
    fs.renameSync(stage, destination);
    if (movedOld) fs.rmSync(backup, { recursive: true, force: true });
  } catch (error) {
    if (!fs.existsSync(destination) && movedOld && fs.existsSync(backup)) fs.renameSync(backup, destination);
    if (fs.existsSync(stage)) fs.rmSync(stage, { recursive: true, force: true });
    throw error;
  }
  return manifest;
}

const options = parseArgs(process.argv.slice(2));
if (options.help) {
  process.stdout.write("Usage: node scripts/import-mengto-skills.cjs --source <clean-checkout> --reviewed-at YYYY-MM-DD\n");
} else {
  const manifest = importSnapshot(options.source, options.reviewedAt);
  process.stdout.write(`${JSON.stringify({
    status: "imported",
    revision: manifest.source.revision,
    files: manifest.snapshot.fileCount,
    skills: manifest.skills.length,
    treeSha256: manifest.snapshot.treeSha256,
  })}\n`);
}

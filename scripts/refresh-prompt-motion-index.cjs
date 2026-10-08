#!/usr/bin/env node
"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const SOURCE_URL = "https://www.prompt-motion.com/";
const INDEX_PATH = path.resolve(__dirname, "../skill/references/prompt-motion/source-index.json");
const MAX_BYTES = 4 * 1024 * 1024;

function fail(message) { throw new Error(message); }

function validDate(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
    && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}

function parseArgs(argv) {
  if (argv.length === 1 && ["--help", "-h"].includes(argv[0])) return { help: true };
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!["--input", "--reviewed-at", "--output"].includes(token)) fail(`unknown option: ${token}`);
    if (Object.hasOwn(options, token)) fail(`duplicate option: ${token}`);
    const value = argv[++index];
    if (!value || value.startsWith("--")) fail(`${token} requires a value`);
    options[token] = value;
  }
  if (!options["--input"] || !options["--output"]) fail("--input and --output are required");
  if (!validDate(options["--reviewed-at"])) fail("--reviewed-at requires a valid YYYY-MM-DD");
  return { input: path.resolve(options["--input"]), reviewedAt: options["--reviewed-at"], output: path.resolve(options["--output"]) };
}

function cardEntry(card) {
  if (!card || typeof card !== "object" || Array.isArray(card)
    || typeof card.slug !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(card.slug)
    || typeof card.title !== "string" || !card.title.trim()
    || typeof card.handle !== "string" || !/^[A-Za-z0-9_]+$/.test(card.handle)
    || !validDate(card.date) || typeof card.promptShared !== "boolean"
    || !Array.isArray(card.tags) || !card.tags.length
    || card.tags.some(tag => !["prompt", "skill"].includes(tag))
    || new Set(card.tags).size !== card.tags.length) fail("malformed homepage card metadata");
  return {
    id: card.slug, title: card.title.trim(), author: `@${card.handle}`, publishedAt: card.date,
    types: [...card.tags].sort(), promptShared: card.promptShared, url: `${SOURCE_URL}${card.slug}`,
  };
}

function buildIndex(htmlBytes, reviewedAt) {
  if (!validDate(reviewedAt)) fail("reviewedAt requires a valid YYYY-MM-DD");
  const bytes = Buffer.isBuffer(htmlBytes) ? htmlBytes : Buffer.from(htmlBytes, "utf8");
  if (bytes.length > MAX_BYTES) fail("homepage snapshot exceeds 4 MiB");
  const html = bytes.toString("utf8");
  const chunks = [];
  for (const match of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) {
    const script = match[1].trim();
    if (!script.includes("self.__next_f.push")) continue;
    const push = /^self\.__next_f\.push\(([\s\S]*)\);?$/.exec(script);
    if (!push) fail("malformed Flight script; only a JSON push payload is supported");
    let payload;
    try { payload = JSON.parse(push[1]); } catch { fail("malformed Flight JSON payload"); }
    if (!Array.isArray(payload) || !Number.isInteger(payload[0])) fail("malformed Flight push payload");
    if (payload[0] === 1) {
      if (payload.length !== 2 || typeof payload[1] !== "string") fail("malformed Flight text payload");
      chunks.push(payload[1]);
    }
  }
  if (!chunks.length) fail("homepage snapshot has no Flight text payload");
  const cardSets = [];
  // shortcut: accepts JSON Flight records from the current homepage; review this parser when its transport changes.
  for (const line of chunks.join("").split("\n")) {
    const record = /^[0-9a-f]+:([\[{][\s\S]*)$/i.exec(line);
    if (!record) continue;
    let value;
    try { value = JSON.parse(record[1]); } catch { fail("malformed Flight JSON record"); }
    const pending = [value];
    while (pending.length) {
      const current = pending.pop();
      if (!current || typeof current !== "object") continue;
      if (Object.hasOwn(current, "cards")) cardSets.push(current.cards);
      for (const child of Object.values(current)) if (child && typeof child === "object") pending.push(child);
    }
  }
  if (cardSets.length !== 1 || !Array.isArray(cardSets[0]) || !cardSets[0].length) fail("homepage snapshot requires exactly one nonempty cards array");
  const entries = cardSets[0].map(cardEntry);
  if (new Set(entries.map(entry => entry.id)).size !== entries.length) fail("duplicate homepage card id");
  entries.sort((left, right) => left.id < right.id ? -1 : left.id > right.id ? 1 : 0);
  return {
    source: { url: SOURCE_URL, reviewedAt, pageSha256: crypto.createHash("sha256").update(bytes).digest("hex") },
    entries,
  };
}

function validateIndex(index) {
  if (!index || index.source?.url !== SOURCE_URL || !validDate(index.source.reviewedAt)
    || !/^[a-f0-9]{64}$/.test(index.source.pageSha256 || "") || !Array.isArray(index.entries)) fail("malformed discovery index");
  const ids = new Set();
  const entries = [];
  for (const entry of index.entries) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) fail("malformed discovery index entry");
    const expected = cardEntry({ slug: entry.id, title: entry.title, handle: typeof entry.author === "string" ? entry.author.slice(1) : null,
      date: entry.publishedAt, tags: entry.types, promptShared: entry.promptShared });
    if (entry.author !== expected.author || entry.url !== expected.url
      || Object.keys(entry).sort().join(",") !== Object.keys(expected).sort().join(",") || ids.has(entry.id)) fail("malformed or duplicate discovery index entry");
    ids.add(entry.id);
    entries.push(expected);
  }
  entries.sort((left, right) => left.id < right.id ? -1 : left.id > right.id ? 1 : 0);
  return { source: index.source, entries };
}

function diffIndex(previous, next) {
  const oldIndex = validateIndex(previous);
  const newIndex = validateIndex(next);
  const oldEntries = new Map(oldIndex.entries.map(entry => [entry.id, entry]));
  const newEntries = new Map(newIndex.entries.map(entry => [entry.id, entry]));
  return {
    added: newIndex.entries.filter(entry => !oldEntries.has(entry.id)),
    changed: newIndex.entries.filter(entry => oldEntries.has(entry.id) && JSON.stringify(entry) !== JSON.stringify(oldEntries.get(entry.id)))
      .map(entry => ({ before: oldEntries.get(entry.id), after: entry })),
    removed: oldIndex.entries.filter(entry => !newEntries.has(entry.id)),
  };
}

function refresh({ input, reviewedAt, output }, previous = JSON.parse(fs.readFileSync(INDEX_PATH, "utf8"))) {
  const inputPath = path.resolve(input);
  const outputPath = path.resolve(output);
  if (inputPath === outputPath || outputPath === INDEX_PATH) fail("output must be a new candidate path");
  const inputStat = fs.lstatSync(inputPath);
  if (!inputStat.isFile()) fail("input must be a regular local HTML file");
  if (inputStat.size > MAX_BYTES) fail("homepage snapshot exceeds 4 MiB");
  const index = buildIndex(fs.readFileSync(inputPath), reviewedAt);
  const candidate = { index, diff: diffIndex(previous, index) };
  const temporaryPath = `${outputPath}.tmp-${crypto.randomBytes(8).toString("hex")}`;
  let created = false;
  try {
    const descriptor = fs.openSync(temporaryPath, "wx");
    created = true;
    try { fs.writeFileSync(descriptor, `${JSON.stringify(candidate, null, 2)}\n`); }
    finally { fs.closeSync(descriptor); }
    fs.copyFileSync(temporaryPath, outputPath, fs.constants.COPYFILE_EXCL);
  } finally { if (created) fs.unlinkSync(temporaryPath); }
  return candidate;
}

if (require.main === module) {
  try {
    const options = parseArgs(process.argv.slice(2));
    if (options.help) process.stdout.write("Usage: node scripts/refresh-prompt-motion-index.cjs --input <local-homepage.html> --reviewed-at YYYY-MM-DD --output <unused-candidate.json>\n");
    else {
      const candidate = refresh(options);
      process.stdout.write(`${JSON.stringify({ output: options.output, entries: candidate.index.entries.length,
        added: candidate.diff.added.length, changed: candidate.diff.changed.length, removed: candidate.diff.removed.length })}\n`);
    }
  } catch (error) { process.stderr.write(`FAIL ${error.message}\n`); process.exitCode = 1; }
}

module.exports = { buildIndex, diffIndex, parseArgs, refresh };

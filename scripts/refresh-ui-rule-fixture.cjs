#!/usr/bin/env node
"use strict";

// Regenerates tests/fixtures/ui-rule-coverage/upstream-rules.json: the rule lines of each upstream
// rule source that skill/references/ui-rule-coverage.json maps, read from a clean checkout at the
// revision sources.lock.json records. Maintenance code only; nothing under skill/ runs it.
//
//   node scripts/refresh-ui-rule-fixture.cjs --source <source id>=<clean checkout> [--source ...]
//
// The fixture is the pinned list tests/ui-rule-coverage.test.cjs holds the map against, so a rule
// upstream added, reworded or removed fails there until its row is mapped. The content hash is the
// one `npm run sources:update` writes into the source's record document, computed by the same code.

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { git, readLock } = require("./sources-lock.cjs");
const { adaptedHash } = require("./sources-update.cjs");

const repoRoot = path.resolve(__dirname, "..");
const COVERAGE = "skill/references/ui-rule-coverage.json";
const FIXTURE = "tests/fixtures/ui-rule-coverage/upstream-rules.json";
const FIXTURE_SCHEMA = "design-pipeline.ui-rule-fixture.v1";

function fail(message) {
  throw new Error(message);
}

// "### 1. correctness and duplication (critical)" -> "correctness-and-duplication".
function sectionSlug(heading) {
  return heading.replace(/^#+\s*/, "").replace(/^\d+\.\s*/, "").replace(/\s*\([^)]*\)\s*$/, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// Top-level list items between the `from` heading and the `to` heading (or the end of the file),
// numbered inside the nearest heading above them: "<key>/<section>/<nn>".
function extractBullets(text, spec) {
  const lines = text.split(/\r?\n/);
  const start = lines.indexOf(spec.from);
  if (start < 0) fail(`${spec.path} has no "${spec.from}" heading`);
  const end = spec.to ? lines.indexOf(spec.to, start + 1) : lines.length;
  if (end < 0) fail(`${spec.path} has no "${spec.to}" heading after "${spec.from}"`);
  const rules = [];
  let section = sectionSlug(spec.from);
  let fenced = false;
  let count = 0;
  for (let index = start; index < end; index += 1) {
    const line = lines[index];
    if (/^```/.test(line)) fenced = !fenced;
    if (fenced) continue;
    if (/^#{2,6}\s/.test(line)) {
      section = sectionSlug(line);
      count = 0;
    } else if (/^- \S/.test(line)) {
      count += 1;
      rules.push({ id: `${spec.key}/${section}/${String(count).padStart(2, "0")}`, line: index + 1, text: line.slice(2).trim() });
    }
  }
  if (!rules.length) fail(`${spec.path} has no rule lines between "${spec.from}" and ${spec.to ? `"${spec.to}"` : "the end"}`);
  return rules;
}

// Hand-picked lines of a file that is not mapped exhaustively: each must still be there verbatim.
function extractSelected(text, spec, rows) {
  const lines = text.split(/\r?\n/);
  return rows.map((row) => {
    const index = lines.indexOf(`- ${row.rule}`);
    if (index < 0) fail(`${spec.path} no longer has the selected rule ${row.id}: ${row.rule.slice(0, 80)}`);
    return { id: row.id, line: index + 1, text: row.rule };
  });
}

function parseArgs(argv) {
  const sources = new Map();
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] !== "--source") fail(`unknown option: ${argv[index]}`);
    const value = argv[index + 1] || "";
    const at = value.indexOf("=");
    if (at < 1 || at === value.length - 1) fail("--source takes <source id>=<clean checkout>");
    sources.set(value.slice(0, at), path.resolve(value.slice(at + 1)));
    index += 1;
  }
  if (!sources.size) fail("pass at least one --source <source id>=<clean checkout>");
  return sources;
}

function refresh(root, checkouts) {
  const coverage = JSON.parse(fs.readFileSync(path.join(root, COVERAGE), "utf8"));
  const lock = readLock(root);
  const fixtureFile = path.join(root, FIXTURE);
  const fixture = fs.existsSync(fixtureFile) ? JSON.parse(fs.readFileSync(fixtureFile, "utf8")) : { schema: FIXTURE_SCHEMA, sources: [] };
  const report = [];
  for (const [id, dir] of checkouts) {
    const source = coverage.sources.find((item) => item.id === id);
    if (!source) fail(`${COVERAGE} has no source ${id}`);
    const locked = lock.sources.find((entry) => entry.id === id);
    if (!locked || locked.kind !== "adapted-reference") fail(`sources.lock.json has no adapted-reference ${id}`);
    const head = git(dir, ["rev-parse", "HEAD"]);
    if (head !== locked.revision) fail(`${dir} is at ${head.slice(0, 12)}; sources.lock.json records ${locked.revision.slice(0, 12)} for ${id}`);
    if (git(dir, ["status", "--porcelain", "--untracked-files=no"])) fail(`${dir} has tracked working-tree changes`);
    const record = fs.readFileSync(path.join(root, locked.documents[0]), "utf8");
    const files = [];
    const rules = [];
    for (const spec of source.files) {
      const bytes = git(dir, ["cat-file", "blob", `${head}:${spec.path}`], { buffer: true, allowFailure: true });
      if (bytes === null) fail(`${id} no longer provides ${spec.path}`);
      const text = bytes.toString("utf8");
      files.push({ key: spec.key, path: spec.path, sha256: crypto.createHash("sha256").update(bytes).digest("hex") });
      if (spec.extract === "bullets") rules.push(...extractBullets(text, spec));
      else if (spec.extract === "selected") rules.push(...extractSelected(text, spec, source.rules.filter((row) => row.id.startsWith(`${spec.key}/`))));
      else fail(`${id} ${spec.path}: extract must be "bullets" or "selected"`);
    }
    const entry = { id, repo: source.repo, revision: head, license: source.license, contentHash: adaptedHash(dir, head, record), files, rules };
    const at = fixture.sources.findIndex((item) => item.id === id);
    if (at < 0) fixture.sources.push(entry);
    else fixture.sources[at] = entry;
    report.push({ id, revision: head, contentHash: entry.contentHash, rules: rules.length });
  }
  fixture.schema = FIXTURE_SCHEMA;
  fixture.note = "Generated by scripts/refresh-ui-rule-fixture.cjs from each source at the named revision; the rule lines are quoted from the upstream files under their MIT licenses (THIRD_PARTY_NOTICES.md). Do not edit by hand.";
  fixture.sources.sort((left, right) => left.id.localeCompare(right.id, "en"));
  fs.mkdirSync(path.dirname(fixtureFile), { recursive: true });
  fs.writeFileSync(fixtureFile, `${JSON.stringify({ schema: fixture.schema, note: fixture.note, sources: fixture.sources }, null, 2)}\n`);
  return report;
}

if (require.main === module) {
  try {
    process.stdout.write(`${JSON.stringify(refresh(repoRoot, parseArgs(process.argv.slice(2))), null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`FAIL ${error.message}\n`);
    process.exit(1);
  }
}

module.exports = { COVERAGE, FIXTURE, FIXTURE_SCHEMA, extractBullets, extractSelected, refresh, sectionSlug };

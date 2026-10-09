"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");
const { buildIndex, diffIndex, parseArgs, refresh } = require("../scripts/refresh-prompt-motion-index.cjs");

const repoRoot = path.resolve(__dirname, "..");
const bundledPath = path.join(repoRoot, "skill/references/prompt-motion/source-index.json");
const scriptPath = path.join(repoRoot, "scripts/refresh-prompt-motion-index.cjs");
const reviewedAt = "2026-10-09";
// Card metadata and the surrounding Flight tree are trimmed from the reviewed homepage; media is never indexed.
const cards = [
  { slug: "twoclipping-5cba86", title: "Shape morphing through UI states", date: "2026-09-24", tags: ["prompt"], promptShared: true, handle: "twoclipping", width: 1440, height: 1440 },
  { slug: "anthonyriera-9b1b2a", title: "Reddit marketing tool launch video", date: "2026-09-26", tags: ["skill"], promptShared: true, handle: "anthonyriera", video: "https://media.prompt-motion.com/example.mp4" },
];

function snapshot(records = cards, split = true) {
  const flight = `1:I[24458,[],"HTTPAccessFallbackBoundary"]\n9:${JSON.stringify(["$", "main", null, { children: [["$", "$L13", null, { cards: records }]] }])}\n`;
  const chunks = split ? [flight.slice(0, Math.floor(flight.length / 2)), flight.slice(Math.floor(flight.length / 2))] : [flight];
  return `<html><script>self.__next_f.push([0]);</script>${chunks.map(chunk => `<script>self.__next_f.push(${JSON.stringify([1, chunk])})</script>`).join("")}</html>`;
}

function temporary(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "prompt-motion-index-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  return directory;
}

test("parses the trimmed real Flight tree across chunks and strips remote media and render claims", () => {
  const html = snapshot([{ ...cards[0], title: `  ${cards[0].title}  ` }, cards[1]]);
  const index = buildIndex(Buffer.from(html), reviewedAt);
  assert.deepEqual(index.source, { url: "https://www.prompt-motion.com/", reviewedAt,
    pageSha256: crypto.createHash("sha256").update(html).digest("hex") });
  assert.deepEqual(index.entries, [
    { id: "anthonyriera-9b1b2a", title: "Reddit marketing tool launch video", author: "@anthonyriera", publishedAt: "2026-09-26", types: ["skill"], promptShared: true, url: "https://www.prompt-motion.com/anthonyriera-9b1b2a" },
    { id: "twoclipping-5cba86", title: "Shape morphing through UI states", author: "@twoclipping", publishedAt: "2026-09-24", types: ["prompt"], promptShared: true, url: "https://www.prompt-motion.com/twoclipping-5cba86" },
  ]);
  assert.doesNotMatch(JSON.stringify(index), /media\.prompt-motion|"video":|"rendered":|"reviewedPrompt":/);
});

test("rejects missing, malformed, empty, duplicate and unsupported source records without evaluating scripts", () => {
  globalThis.promptMotionIndexExecuted = false;
  const invalid = [
    "<html></html>",
    "<script>self.__next_f.push([1,notJson])</script>",
    "<script>self.__next_f.push((globalThis.promptMotionIndexExecuted=true,[1,\"x\"]))</script>",
    "<script>self.__next_f.push([1,99])</script>",
    "<script>self.__next_f.push([1,\"9:[broken\\n\"])</script>",
    snapshot([]), snapshot([cards[0], cards[0]]),
    snapshot([{ ...cards[0], date: "2026-02-30" }]),
    snapshot([{ ...cards[0], slug: "../outside" }]),
    snapshot([{ ...cards[0], title: "  " }]),
    snapshot([{ ...cards[0], handle: "@wrong" }]),
    snapshot([{ ...cards[0], tags: ["movie"] }]),
    snapshot([{ ...cards[0], tags: ["prompt", "prompt"] }]),
    snapshot([{ ...cards[0], promptShared: undefined }]),
    `<script>self.__next_f.push(${JSON.stringify([1, `9:${JSON.stringify({ cards, nested: { cards } })}\n`])})</script>`,
  ];
  for (const html of invalid) assert.throws(() => buildIndex(html, reviewedAt));
  assert.equal(globalThis.promptMotionIndexExecuted, false);
  delete globalThis.promptMotionIndexExecuted;
  assert.throws(() => buildIndex(snapshot(), "2026-02-30"), /valid YYYY-MM-DD/);
  assert.throws(() => buildIndex(Buffer.alloc(4 * 1024 * 1024 + 1), reviewedAt), /4 MiB/);
});

test("diffs meaningful metadata only and keeps added, changed and removed source entries reviewable", () => {
  const before = buildIndex(snapshot(), reviewedAt);
  const changed = { ...cards[0], title: "Updated UI states" };
  const added = { ...cards[1], slug: "new-case-123abc", handle: "NewAuthor", date: "2026-10-08", tags: ["skill", "prompt"] };
  const next = buildIndex(snapshot([changed, added], false), "2026-10-10");
  const diff = diffIndex(before, next);
  assert.deepEqual(diff.added.map(entry => entry.id), ["new-case-123abc"]);
  assert.deepEqual(diff.changed, [{ before: before.entries[1], after: next.entries[1] }]);
  assert.deepEqual(diff.removed, [before.entries[0]]);
  const equivalent = JSON.parse(JSON.stringify(next));
  equivalent.source.reviewedAt = reviewedAt;
  equivalent.source.pageSha256 = "0".repeat(64);
  equivalent.entries.reverse();
  equivalent.entries.forEach(entry => { entry.types.reverse(); });
  equivalent.entries = equivalent.entries.map(entry => Object.fromEntries(Object.entries(entry).reverse()));
  assert.deepEqual(diffIndex(next, equivalent), { added: [], changed: [], removed: [] });
  const availabilityChange = buildIndex(snapshot([{ ...cards[0], promptShared: false }, cards[1]]), reviewedAt);
  const availabilityDiff = diffIndex(before, availabilityChange);
  assert.deepEqual(availabilityDiff.added, []);
  assert.deepEqual(availabilityDiff.removed, []);
  assert.deepEqual(availabilityDiff.changed, [{ before: before.entries[1], after: { ...before.entries[1], promptShared: false } }]);
  assert.throws(() => diffIndex(before, { ...next, entries: [...next.entries, next.entries[0]] }), /duplicate/);
});

test("refresh writes a new local review candidate while preserving the approved index and existing outputs", t => {
  const directory = temporary(t);
  const input = path.join(directory, "home.html");
  const output = path.join(directory, "candidate.json");
  fs.writeFileSync(input, snapshot());
  const bundledBefore = fs.readFileSync(bundledPath);
  const result = refresh({ input, reviewedAt, output });
  assert.deepEqual(JSON.parse(fs.readFileSync(output, "utf8")), result);
  assert.equal(result.index.entries.length, 2);
  assert.deepEqual(fs.readFileSync(bundledPath), bundledBefore);
  const existing = fs.readFileSync(output);
  assert.throws(() => refresh({ input, reviewedAt, output }), /EEXIST/);
  assert.deepEqual(fs.readFileSync(output), existing);
  assert.throws(() => refresh({ input, reviewedAt, output: input }), /new candidate path/);
  assert.throws(() => refresh({ input, reviewedAt, output: bundledPath }), /new candidate path/);
  const fileParent = path.join(directory, "regular-file");
  fs.writeFileSync(fileParent, "keep");
  assert.throws(() => refresh({ input, reviewedAt, output: path.join(fileParent, "candidate.json") }), /ENOTDIR|ENOENT/);
  assert.equal(fs.readFileSync(fileParent, "utf8"), "keep");
  assert.deepEqual(fs.readdirSync(directory).sort(), ["candidate.json", "home.html", "regular-file"]);
});

test("rejects invalid CLI options and unsafe local inputs without creating an output", t => {
  const directory = temporary(t);
  const input = path.join(directory, "home.html");
  const output = path.join(directory, "candidate.json");
  fs.writeFileSync(input, "<html>no cards</html>");
  const base = ["--input", input, "--reviewed-at", reviewedAt, "--output", output];
  for (const args of [[...base, "--fetch"], [...base, "--output", output], ["--input"], base.map(value => value === reviewedAt ? "2026-02-30" : value)]) assert.throws(() => parseArgs(args));
  assert.throws(() => refresh(parseArgs(base)), /no Flight/);
  assert.equal(fs.existsSync(output), false);
  assert.throws(() => refresh({ input: directory, reviewedAt, output }), /regular local HTML/);
  fs.writeFileSync(input, Buffer.alloc(4 * 1024 * 1024 + 1));
  assert.throws(() => refresh(parseArgs(base)), /4 MiB/);
  const command = spawnSync(process.execPath, [scriptPath, ...base, "--fetch"], { cwd: directory, encoding: "utf8", windowsHide: true });
  assert.equal(command.status, 1);
  assert.match(command.stderr, /unknown option/);
  assert.equal(fs.existsSync(output), false);
});

test("the bundled inventory contains only valid source metadata with stable unique identities", () => {
  const index = JSON.parse(fs.readFileSync(bundledPath, "utf8"));
  assert.ok(index.entries.length > 0);
  assert.deepEqual(diffIndex(index, index), { added: [], changed: [], removed: [] });
  assert.deepEqual(index.entries.map(entry => entry.id), index.entries.map(entry => entry.id).sort());
  assert.equal(new Set(index.entries.map(entry => entry.id)).size, index.entries.length);
});

"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const repoRoot = path.resolve(__dirname, "..");
const cliPath = path.join(repoRoot, "skill/scripts/designer-pipeline.cjs");
const referencesRoot = path.join(repoRoot, "skill/references");
const { COMMANDS, publicHelp } = require("../skill/scripts/cli-core.cjs");
const { listReferences, parseHeadings, readSection } = require("../skill/scripts/guide-core.cjs");

function cli(args) {
  const child = spawnSync(process.execPath, [cliPath, ...args], { cwd: repoRoot, encoding: "utf8" });
  let json = null;
  try { json = JSON.parse(child.stdout); } catch { /* text output */ }
  return { status: child.status, stdout: child.stdout, stderr: child.stderr, json };
}

function fixtureRoot(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "guide-section-reads-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}

const FIXTURE = [
  "# Fixture guide",
  "",
  "Intro.",
  "",
  "## Alpha",
  "",
  "### Notes",
  "first notes",
  "",
  "#### Deep",
  "deep text",
  "",
  "### Beta",
  "beta text",
  "",
  "## Gamma",
  "",
  "```bash",
  "# not a heading",
  "echo hi",
  "```",
  "",
  "````md",
  "```",
  "## still not a heading",
  "```",
  "````",
  "",
  "~~~",
  "# tilde, not a heading",
  "~~~",
  "",
  "## Notes",
  "",
  "second Notes, at the end",
  "",
];

function writeFixture(root, name, { eol = "\n", bom = "" } = {}) {
  const file = path.join(root, `${name}.md`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, bom + FIXTURE.join(eol));
  return file;
}

test("a section of a real guide is exactly its lines, found by an independent scan", () => {
  const bytes = fs.readFileSync(path.join(referencesRoot, "stages.md"));
  const lines = bytes.toString("utf8").split(/\r?\n/);
  const start = lines.indexOf("## Stage 4: Tasks");
  const end = lines.findIndex((line, index) => index > start && line.startsWith("## "));
  assert.ok(start > 0 && end > start, "stages.md has Stage 4 and a following ## heading");
  let last = end;
  while (!lines[last - 1].trim()) last -= 1;

  const result = readSection(referencesRoot, { reference: "stages", section: "stage-4-tasks" });
  assert.equal(result.startLine, start + 1);
  assert.equal(result.endLine, last);
  assert.equal(result.markdown, lines.slice(start, last).join("\n"));
  assert.equal(result.sha256, crypto.createHash("sha256").update(bytes).digest("hex"));
  assert.equal(result.partial, true);
  assert.equal(result.file, "references/stages.md");
  assert.deepEqual(result.headingPath, ["Stage Workflow Reference", "Stage 4: Tasks"]);
  assert.ok(result.totalLines > result.endLine, "the file is longer than the section");
});

test("heading text, anchor and a leading # give the same section", () => {
  const byAnchor = readSection(referencesRoot, { reference: "stages", section: "stage-4-tasks" });
  for (const section of ["Stage 4: Tasks", "stage 4:  TASKS", "#stage-4-tasks", "## Stage 4: Tasks"]) {
    assert.deepEqual(readSection(referencesRoot, { reference: "stages", section }), byAnchor, section);
  }
  assert.deepEqual(readSection(referencesRoot, { reference: "stages.md", section: "stage-4-tasks" }), byAnchor);
});

test("sections stop at a heading of the same or a shallower level and keep their subsections", (t) => {
  const root = fixtureRoot(t);
  writeFixture(root, "fixture");
  const notes = readSection(root, { reference: "fixture", section: "notes" });
  assert.equal(notes.markdown, ["### Notes", "first notes", "", "#### Deep", "deep text"].join("\n"));
  assert.deepEqual(notes.headingPath, ["Fixture guide", "Alpha", "Notes"]);
  const alpha = readSection(root, { reference: "fixture", section: "alpha" });
  assert.match(alpha.markdown, /### Beta\nbeta text$/);
  assert.doesNotMatch(alpha.markdown, /## Gamma/);
  const last = readSection(root, { reference: "fixture", section: "notes-1" });
  assert.equal(last.markdown, "## Notes\n\nsecond Notes, at the end");
  assert.equal(notes.endLine, FIXTURE.indexOf("deep text") + 1, "blank lines before the next heading are not part of the section");
  assert.equal(last.endLine, FIXTURE.indexOf("second Notes, at the end") + 1);
  assert.equal(last.endLine, last.totalLines, "the final newline does not add a line");
  const whole = readSection(root, { reference: "fixture", section: "fixture-guide" });
  assert.equal(whole.startLine, 1);
});

test("code fences hide their # lines, including nested and tilde fences", (t) => {
  const root = fixtureRoot(t);
  writeFixture(root, "fixture");
  const headings = parseHeadings(fs.readFileSync(path.join(root, "fixture.md"), "utf8"));
  assert.deepEqual(headings.map((heading) => heading.anchor), ["fixture-guide", "alpha", "notes", "deep", "beta", "gamma", "notes-1"]);
  const gamma = readSection(root, { reference: "fixture", section: "gamma" });
  assert.match(gamma.markdown, /# not a heading/);
  assert.match(gamma.markdown, /## still not a heading/);
  assert.match(gamma.markdown, /# tilde, not a heading/);
});

test("CRLF files and a byte-order mark give the same sections", (t) => {
  const root = fixtureRoot(t);
  writeFixture(root, "lf");
  writeFixture(root, "crlf", { eol: "\r\n", bom: "\uFEFF" });
  for (const section of ["fixture-guide", "alpha", "notes", "notes-1"]) {
    const lf = readSection(root, { reference: "lf", section });
    const crlf = readSection(root, { reference: "crlf", section });
    assert.equal(crlf.markdown, lf.markdown, section);
    assert.equal(crlf.startLine, lf.startLine, section);
    assert.equal(crlf.endLine, lf.endLine, section);
  }
});

test("a repeated title is ambiguous until an anchor is used", (t) => {
  const root = fixtureRoot(t);
  writeFixture(root, "fixture");
  assert.throws(() => readSection(root, { reference: "fixture", section: "Notes" }), (error) => {
    assert.equal(error.code, "SECTION_AMBIGUOUS");
    assert.deepEqual(error.details.anchors, ["notes", "notes-1"]);
    return true;
  });
  assert.match(readSection(root, { reference: "fixture", section: "notes-1" }).markdown, /^## Notes/);
});

test("a missing section names the closest headings, and a missing guide says so", (t) => {
  const root = fixtureRoot(t);
  writeFixture(root, "fixture");
  assert.throws(() => readSection(root, { reference: "fixture", section: "deep stuff" }), (error) => {
    assert.equal(error.code, "SECTION_NOT_FOUND");
    assert.deepEqual(error.details.nearest.map((item) => item.anchor), ["deep"]);
    return true;
  });
  assert.throws(() => readSection(root, { reference: "fixture", section: "zzz" }), (error) => {
    assert.equal(error.code, "SECTION_NOT_FOUND");
    assert.deepEqual(error.details.nearest, []);
    assert.match(error.message, /skill --reference fixture --list/);
    return true;
  });
  assert.throws(() => readSection(root, { reference: "nope", section: "alpha" }), { code: "REFERENCE_NOT_FOUND" });
});

test("names that leave references/ are rejected before anything is read", (t) => {
  for (const name of ["../scripts/cli-core", "stages/../../SKILL", path.resolve(referencesRoot, "stages"), "a\\b", "", "  ", "C:/x", "./stages", "a//b"]) {
    const outcome = cli(["skill", "--reference", name, "--section", "x", "--json"]);
    assert.equal(outcome.status, 1, JSON.stringify(name));
    assert.equal(outcome.json?.error?.code, "REFERENCE_INVALID", JSON.stringify(name));
  }
  assert.throws(() => readSection(referencesRoot, { reference: "stages\0", section: "x" }), { code: "REFERENCE_INVALID" }, "a NUL byte cannot reach the file system");
  const root = fixtureRoot(t);
  const outside = path.join(root, "outside.md");
  const inside = path.join(root, "references");
  fs.mkdirSync(inside);
  fs.writeFileSync(outside, "# Outside\n");
  try {
    fs.symlinkSync(outside, path.join(inside, "link.md"));
  } catch (error) {
    t.diagnostic(`symlink not created (${error.code}); the symlink case is skipped`);
    return;
  }
  assert.throws(() => readSection(inside, { reference: "link", section: "outside" }), { code: "REFERENCE_INVALID" });
});

test("reading writes nothing", (t) => {
  const root = fixtureRoot(t);
  writeFixture(root, "fixture");
  const snapshot = () => fs.readdirSync(root, { recursive: true }).map((name) => {
    const stat = fs.statSync(path.join(root, name));
    return `${name}:${stat.size}:${stat.mtimeMs}`;
  });
  const before = snapshot();
  readSection(root, { reference: "fixture", section: "alpha" });
  listReferences(root);
  assert.deepEqual(snapshot(), before);
});

test("skill needs a target and refuses conflicting ones", () => {
  for (const args of [["skill"], ["skill", "--reference", "stages"], ["skill", "--section", "x"]]) {
    const outcome = cli([...args, "--json"]);
    assert.equal(outcome.status, 1, args.join(" "));
    assert.equal(outcome.json.error.code, "OPTION_REQUIRED", args.join(" "));
    assert.ok(!("markdown" in outcome.json), "no guide text on failure");
  }
  const conflict = cli(["skill", "--reference", "stages", "--list", "--section", "x", "--json"]);
  assert.equal(conflict.status, 1);
  assert.equal(conflict.json.error.code, "OPTION_CONFLICT");
  assert.equal(cli(["skill", "extra", "--list"]).status, 1);
});

test("skill --list names every packaged guide once, sorted", () => {
  const expected = fs.readdirSync(referencesRoot, { recursive: true })
    .map((name) => name.split(path.sep).join("/"))
    .filter((name) => name.endsWith(".md") && fs.statSync(path.join(referencesRoot, name)).isFile())
    .map((name) => name.slice(0, -3))
    .sort();
  const outcome = cli(["skill", "--list", "--json"]);
  assert.equal(outcome.status, 0);
  assert.deepEqual(outcome.json.references.map((item) => item.name), expected);
  assert.ok(expected.includes("stages") && expected.includes("motion-recipes/families/web"));
  const stages = outcome.json.references.find((item) => item.name === "stages");
  assert.equal(stages.title, "Stage Workflow Reference");
  assert.equal(stages.headings, parseHeadings(fs.readFileSync(path.join(referencesRoot, "stages.md"), "utf8")).length);
  const text = cli(["skill", "--list"]);
  assert.equal(text.stdout.trimEnd().split("\n").length, expected.length);
  assert.match(text.stdout, /^stages\tStage Workflow Reference\t\d+$/m);
});

test("skill --reference --list shows levels and anchors, and numbers repeats", (t) => {
  const real = cli(["skill", "--reference", "stages", "--list", "--json"]);
  assert.equal(real.status, 0);
  const stagesText = fs.readFileSync(path.join(referencesRoot, "stages.md"), "utf8");
  const stage4Line = stagesText.slice(0, stagesText.indexOf("\n## Stage 4: Tasks") + 1).split("\n").length;
  assert.deepEqual(real.json.headings.find((item) => item.anchor === "stage-4-tasks"), { level: 2, anchor: "stage-4-tasks", heading: "Stage 4: Tasks", line: stage4Line });
  const root = fixtureRoot(t);
  writeFixture(root, "fixture");
  const anchors = parseHeadings(fs.readFileSync(path.join(root, "fixture.md"), "utf8")).filter((item) => item.text === "Notes").map((item) => item.anchor);
  assert.deepEqual(anchors, ["notes", "notes-1"]);
});

test("without --json the section is printed as plain Markdown", () => {
  const plain = cli(["skill", "--reference", "stages", "--section", "stage-4-tasks"]);
  const structured = cli(["skill", "--reference", "stages", "--section", "stage-4-tasks", "--json"]);
  assert.equal(plain.status, 0);
  assert.equal(plain.stdout, `${structured.json.markdown}\n`);
  assert.ok(structured.json.markdown.length < fs.statSync(path.join(referencesRoot, "stages.md")).size / 4);
  assert.equal(structured.json.schema, "design-pipeline.cli-result.v1");
});

test("describe returns the help lines of one command and nothing else", () => {
  const fonts = cli(["describe", "fonts", "--json"]).json;
  assert.equal(fonts.entries.length, 3);
  assert.ok(fonts.entries.every((entry) => entry.startsWith("  fonts ")));
  const query = cli(["describe", "fonts", "query", "--json"]).json;
  assert.equal(query.entries.length, 1);
  assert.match(query.entries[0], /^ {2}fonts query /);
  const status = cli(["describe", "status", "--json"]).json;
  assert.equal(status.entries.length, 1);
  assert.match(status.entries[0], /^ {2}doctor .* \| status --change-root <dir>/);
  assert.equal(status.exitCodes, publicHelp().split("\n").at(-1));
  const text = cli(["describe", "fonts", "refresh"]);
  assert.equal(text.status, 0);
  assert.match(text.stdout, /^ {2}fonts refresh /);
  assert.match(text.stdout, /Exit 0 means success/);
  assert.ok(text.stdout.length < 1000, "one command, not the whole help");
});

test("describe rejects unknown and missing commands", () => {
  for (const args of [["describe", "nonesuch"], ["describe", "fonts", "nonesuch"]]) {
    const outcome = cli([...args, "--json"]);
    assert.equal(outcome.status, 1, args.join(" "));
    assert.equal(outcome.json.error.code, "UNKNOWN_COMMAND", args.join(" "));
  }
  const missing = cli(["describe", "--json"]);
  assert.equal(missing.status, 1);
  assert.equal(missing.json.error.code, "OPTION_REQUIRED");
});

test("every command can be described, with lines taken from --help", () => {
  const helpLines = new Set(publicHelp().split("\n"));
  const keys = Object.keys(COMMANDS);
  assert.ok(keys.includes("skill") && keys.includes("describe"));
  for (const key of keys) {
    const outcome = cli(["describe", key, "--json"]);
    assert.equal(outcome.status, 0, `${key} has a help entry`);
    for (const entry of outcome.json.entries) {
      for (const line of entry.split("\n")) assert.ok(helpLines.has(line), `${key}: ${line.slice(0, 60)}`);
    }
  }
});

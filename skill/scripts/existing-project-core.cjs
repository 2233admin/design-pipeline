"use strict";

// Host facts for a ui job in an existing project (one with a root package.json): the rule files,
// the check commands and the constraint lines those rule files state. Rediscovered on every call
// and printed in the work action. That part only reads: nothing is stored, nothing is run, and the
// result is a prompt for the agent, not evidence for any gate or stage.
//
// The host test inventory is the one stored part: snapshotHostTests runs once, when the ui job
// starts, and workflow-core keeps the result in the existing state file; compareHostTests reads the
// working tree again at delivery and says which of those test files are gone or changed.

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const ROOT_RULE_FILES = ["AGENTS.md", "CLAUDE.md", "CONTEXT.md"];
const DOCS_MAX_DEPTH = 4; // docs/ is level 1
const DOCS_MAX_ENTRIES = 2000;
const DOCS_MAX_LISTED = 25;
const QUOTES_PER_FILE = 3;
const QUOTES_MAX = 15;
const QUOTE_MAX_CHARS = 400;
const FILE_MAX_BYTES = 512 * 1024;
const SKIPPED_DIRS = new Set(["node_modules"]);
const CHECKS = ["test", "typecheck", "lint", "build"];

// A constraint line is a line outside fenced code that contains one of these words or phrases
// (English case-insensitive, straight or curly apostrophe; Chinese as written). It is a hint with
// modest precision, not a complete list of the host's rules.
const CONSTRAINT_WORDS = /\b(?:must not|mustn['’]t|never|do not|don['’]t|forbidden|prohibited|not allowed)\b|禁止|禁区|严禁|不要|不得|不允许|切勿|不可/i;

function readText(file) {
  try {
    const stat = fs.statSync(file);
    if (!stat.isFile() || stat.size > FILE_MAX_BYTES) return null;
    return fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "");
  } catch { return null; }
}

// Root rule files by exact name, from the directory listing so case-insensitive file systems do
// not report a name the file does not have.
function rootRuleFiles(root) {
  const names = new Set(fs.readdirSync(root, { withFileTypes: true }).filter((entry) => entry.isFile()).map((entry) => entry.name));
  return ROOT_RULE_FILES.filter((name) => names.has(name));
}

// Every .md under the root docs/, sorted by path; dot folders, node_modules and symbolic links are
// skipped, and the walk stops at DOCS_MAX_DEPTH levels or DOCS_MAX_ENTRIES entries. At most
// DOCS_MAX_LISTED are listed, but a doc that is a quote source is never left out.
function docsFiles(root) {
  const found = [];
  let entries = 0;
  let cut = false;
  const visit = (dir, rel, depth) => {
    let list;
    try { list = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const entry of list.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))) {
      if (++entries > DOCS_MAX_ENTRIES) { cut = true; return; }
      if (entry.name.startsWith(".") || SKIPPED_DIRS.has(entry.name) || entry.isSymbolicLink()) continue;
      const relPath = `${rel}/${entry.name}`;
      if (entry.isDirectory()) {
        if (depth >= DOCS_MAX_DEPTH) { cut = true; continue; }
        visit(path.join(dir, entry.name), relPath, depth + 1);
        if (entries > DOCS_MAX_ENTRIES) return;
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
        found.push(relPath);
      }
    }
  };
  const docs = path.join(root, "docs");
  if (fs.existsSync(docs) && fs.lstatSync(docs).isDirectory()) visit(docs, "docs", 1);
  found.sort();
  let room = Math.max(0, DOCS_MAX_LISTED - found.filter((rel) => quotedDocGroup(rel) >= 0).length);
  const listed = found.filter((rel) => quotedDocGroup(rel) >= 0 || room-- > 0);
  return { listed, omitted: found.length - listed.length, cut };
}

function packageManager(root, pkg) {
  const declared = typeof pkg.packageManager === "string" ? pkg.packageManager.split("@")[0] : null;
  if (["pnpm", "yarn", "bun", "npm"].includes(declared)) return declared;
  if (fs.existsSync(path.join(root, "pnpm-lock.yaml"))) return "pnpm";
  if (fs.existsSync(path.join(root, "yarn.lock"))) return "yarn";
  if (fs.existsSync(path.join(root, "bun.lockb")) || fs.existsSync(path.join(root, "bun.lock"))) return "bun";
  return "npm";
}

// test, typecheck, lint and build from package.json scripts. A missing typecheck script falls back
// to `tsc --noEmit` when tsconfig.json exists; anything else missing is reported as missing.
function checkCommands(root, pkg) {
  const scripts = pkg.scripts && typeof pkg.scripts === "object" ? pkg.scripts : {};
  const pm = packageManager(root, pkg);
  return CHECKS.map((kind) => {
    const name = kind === "typecheck" ? ["typecheck", "type-check", "tsc"].find((key) => typeof scripts[key] === "string") : typeof scripts[kind] === "string" ? kind : undefined;
    if (name) return { kind, command: `${pm} run ${name}`, source: `package.json scripts.${name}: ${scripts[name]}` };
    if (kind === "typecheck" && fs.existsSync(path.join(root, "tsconfig.json"))) {
      return { kind, command: `${pm === "npm" ? "npx" : `${pm} exec`} tsc --noEmit`, source: "tsconfig.json; not a package.json script" };
    }
    return { kind, command: null, source: `no ${kind} script in package.json` };
  });
}

// Quote sources, in this order: the root rule files, then docs whose file name marks them as
// decisions (LEDGER, DECISION), then as acceptance (ACCEPTANCE, GATES), then as rules (PROTOCOL,
// RULES, CONVENTION, DOCTRINE); path order inside each group. Other docs are listed, never quoted.
const QUOTED_DOC_GROUPS = [/LEDGER|DECISION/i, /ACCEPTANCE|GATES/i, /PROTOCOL|RULES|CONVENTION|DOCTRINE/i];
const quotedDocGroup = (rel) => QUOTED_DOC_GROUPS.findIndex((pattern) => pattern.test(path.posix.basename(rel)));

function constraintQuotes(root, files) {
  const quotes = [];
  let omitted = 0;
  for (const rel of files) {
    const text = readText(path.join(root, rel));
    if (text === null) continue;
    let fenced = false;
    let inFile = 0;
    text.split(/\r?\n/).forEach((line, index) => {
      if (/^\s*(?:```|~~~)/.test(line)) { fenced = !fenced; return; }
      if (fenced || !CONSTRAINT_WORDS.test(line)) return;
      if (inFile >= QUOTES_PER_FILE || quotes.length >= QUOTES_MAX) { omitted += 1; return; }
      inFile += 1;
      const trimmed = line.trim();
      quotes.push({ path: rel, line: index + 1, text: trimmed.length > QUOTE_MAX_CHARS ? `${trimmed.slice(0, QUOTE_MAX_CHARS)} [line cut at ${QUOTE_MAX_CHARS} characters]` : trimmed });
    });
  }
  return { quotes, omitted };
}

// null for a folder without a root package.json (a new project); otherwise the host facts.
function inspectHost(root) {
  const pkgText = readText(path.join(root, "package.json"));
  if (pkgText === null) return null;
  let pkg = {};
  try { pkg = JSON.parse(pkgText) || {}; } catch { pkg = {}; }
  const rootRules = rootRuleFiles(root);
  const docs = docsFiles(root);
  const quotedDocs = QUOTED_DOC_GROUPS.flatMap((_, group) => docs.listed.filter((rel) => quotedDocGroup(rel) === group));
  const { quotes, omitted } = constraintQuotes(root, [...rootRules, ...quotedDocs]);
  return { ruleFiles: [...rootRules, ...docs.listed], docsOmitted: docs.omitted, docsCut: docs.cut, checks: checkCommands(root, pkg), quotes, quotesOmitted: omitted };
}

// The text of the ui work action for an existing project. The first line is the instruction; the
// rest lists the facts as found on disk at this call.
function hostWorkCommand(facts, tier, deliverCommand) {
  const lines = [
    `${tier === "full" ? "Open an OpenSpec change under openspec/changes/<id>/. " : ""}Existing project: its own rule files and check commands govern this work. Read the rule files below before editing, run its checks, then: ${deliverCommand}`,
    "Rule files found on disk at this call (paths only; this tool has not read them for you and does not claim the list is complete):",
  ];
  if (facts.ruleFiles.length) for (const file of facts.ruleFiles) lines.push(`- ${file}`);
  else lines.push("- none found (no AGENTS.md, CLAUDE.md, CONTEXT.md or docs/**/*.md)");
  if (facts.docsOmitted) lines.push(`- and ${facts.docsOmitted} more .md under docs/ not listed`);
  if (facts.docsCut) lines.push(`- the docs/ search stopped at ${DOCS_MAX_DEPTH} levels or ${DOCS_MAX_ENTRIES} entries; deeper files are not listed`);
  lines.push("Checks from package.json (defined, not run by this tool):");
  for (const check of facts.checks) lines.push(check.command ? `- ${check.kind}: ${check.command}  (${check.source})` : `- ${check.kind}: missing (${check.source})`);
  lines.push("Constraint lines quoted from the root rule files and from docs whose file name contains LEDGER, DECISION, ACCEPTANCE, GATES, PROTOCOL, RULES, CONVENTION or DOCTRINE (other docs are listed above, not quoted); a line is quoted when it contains must not, never, do not, don't, forbidden, prohibited, not allowed, 禁止, 禁区, 严禁, 不要, 不得, 不允许, 切勿 or 不可. A hint, not every rule:");
  if (facts.quotes.length) for (const quote of facts.quotes) lines.push(`- ${quote.path}:${quote.line}: ${quote.text}`);
  else lines.push("- none matched");
  if (facts.quotesOmitted) lines.push(`- and ${facts.quotesOmitted} more matching lines not shown (at most ${QUOTES_PER_FILE} per file, ${QUOTES_MAX} in all)`);
  lines.push("Do not create DESIGN.md or MOTION.md and do not run the pipeline's route, foundation, toolchain or stack gates for this project; references/pipeline-reference.md is optional background only. The checks do not show how the screen looks: in the evidence, say what you ran and what you did not see.");
  lines.push("Extend the project's existing tests freely. Removing or weakening one needs the user's confirmation before the job is done (removing a test title, or fewer tests or assertion lines in a file), and deleting a test file that existed when this job started makes deliver fail.");
  return lines.join("\n");
}

// Test files: a name like *.test.* or *.spec.* with a JS/TS extension, or a JS/TS file under a
// folder named tests or __tests__. node_modules, dot folders, dist, build, out and coverage are
// skipped; the walk stops after TESTS_MAX_ENTRIES entries and says so.
const TEST_CODE = /\.[cm]?[jt]sx?$/i;
const TEST_NAME = /\.(?:test|spec)\.[cm]?[jt]sx?$/i;
const TEST_DIRS = new Set(["tests", "__tests__"]);
const TESTS_SKIPPED_DIRS = new Set(["node_modules", "dist", "build", "out", "coverage"]);
const TESTS_MAX_ENTRIES = 20000;
// Titles: the first string literal of it(, test( or describe( (with .only, .skip, .todo,
// .concurrent, .sequential or .fails, or an x/f prefix). Other frameworks give no titles; their
// files are still tracked by path and content.
const TEST_TITLE = /(?:^|[^\w$.])[xf]?(?:it|test|describe)(?:\.(?:only|skip|todo|concurrent|sequential|fails))*\s*\(\s*(['"`])((?:\\.|(?!\1)[^\\\n])*)\1/g;
// Assertion lines: lines with expect( / expect.x( or assert( / assert.x(.
const ASSERTION_LINE = /\bexpect\s*(?:\.\w+\s*)?\(|\bassert(?:\.\w+)?\s*\(/;

function testFiles(root) {
  const found = [];
  let entries = 0;
  let cut = false;
  const visit = (dir, rel, inTestDir) => {
    let list;
    try { list = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const entry of list.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))) {
      if (++entries > TESTS_MAX_ENTRIES) { cut = true; return; }
      if (entry.name.startsWith(".") || TESTS_SKIPPED_DIRS.has(entry.name) || entry.isSymbolicLink()) continue;
      const relPath = rel ? `${rel}/${entry.name}` : entry.name;
      if (entry.isDirectory()) visit(path.join(dir, entry.name), relPath, inTestDir || TEST_DIRS.has(entry.name));
      else if (entry.isFile() && (TEST_NAME.test(entry.name) || (inTestDir && TEST_CODE.test(entry.name)))) found.push(relPath);
      if (entries > TESTS_MAX_ENTRIES) return;
    }
  };
  visit(root, "", false);
  return { files: found.sort(), cut };
}

function testFacts(text) {
  const titles = [...text.matchAll(TEST_TITLE)].map((match) => match[2]);
  return { titles, assertions: text.split(/\r?\n/).filter((line) => ASSERTION_LINE.test(line)).length, lines: text.split(/\r?\n/).length };
}

function readTest(file) {
  try { const bytes = fs.readFileSync(file); return { sha256: crypto.createHash("sha256").update(bytes).digest("hex"), ...testFacts(bytes.toString("utf8")) }; } catch { return null; }
}

// The working-tree test inventory when the ui job starts: path -> sha256, titles, assertion lines
// and line count. The user's uncommitted test edits are part of it, so they never count as this
// job's changes.
function snapshotHostTests(root) {
  const { files, cut } = testFiles(root);
  const entries = {};
  for (const rel of files) { const facts = readTest(path.join(root, rel)); if (facts) entries[rel] = facts; }
  return { takenAt: new Date().toISOString(), truncated: cut, files: entries };
}

function removedFrom(before, after) {
  const left = new Map();
  for (const title of after) left.set(title, (left.get(title) || 0) + 1);
  return before.filter((title) => { const count = left.get(title) || 0; if (count) left.set(title, count - 1); return !count; });
}

// deleted: snapshot test files no longer on disk (deliver refuses). changed: snapshot test files
// whose content differs, with the titles that disappeared or appeared and the assertion-line and
// line counts before and after. A change is `weakening` when a title disappeared or the test or
// assertion-line count went down; only weakening changes wait for the user's test-review verdict,
// and only they enter the digest the verdict is bound to. Purely additive changes are listed only.
// added: test files that were not in the snapshot (listed only).
function compareHostTests(root, snapshot) {
  const deleted = [];
  const changed = [];
  for (const [rel, before] of Object.entries(snapshot.files || {})) {
    const file = path.join(root, rel);
    if (!fs.existsSync(file)) { deleted.push({ path: rel, titles: before.titles }); continue; }
    const after = readTest(file);
    if (!after || after.sha256 === before.sha256) continue;
    const removedTitles = removedFrom(before.titles, after.titles);
    const weakening = removedTitles.length > 0 || after.titles.length < before.titles.length || after.assertions < before.assertions;
    changed.push({ path: rel, weakening, removedTitles, addedTitles: removedFrom(after.titles, before.titles), tests: `${before.titles.length} -> ${after.titles.length}`, assertionLines: `${before.assertions} -> ${after.assertions}`, lines: `${before.lines} -> ${after.lines}`, sha256: after.sha256 });
  }
  const added = testFiles(root).files.filter((rel) => !(rel in (snapshot.files || {})));
  const weakened = changed.filter((change) => change.weakening);
  const digest = crypto.createHash("sha256").update(JSON.stringify(weakened.map((change) => [change.path, change.sha256]))).digest("hex");
  return { since: snapshot.takenAt, deleted, changed, weakened, added, digest };
}

module.exports = { CONSTRAINT_WORDS, compareHostTests, hostWorkCommand, inspectHost, snapshotHostTests };

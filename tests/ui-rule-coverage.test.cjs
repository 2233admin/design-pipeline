"use strict";

// skill/references/ui-rule-coverage.json says where this project holds each rule of the upstream UI
// rule lists it tracks. These tests keep that map honest: every target exists, every upstream rule
// line of the pinned list has a row, and an upstream change to a rule file is a failing test until
// the list is regenerated and the changed rules are mapped.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { AUDIT_CODES } = require("../skill/scripts/interaction-audit.cjs");
const { COVERAGE, FIXTURE, FIXTURE_SCHEMA, extractBullets, extractSelected, sectionSlug } = require("../scripts/refresh-ui-rule-fixture.cjs");
const { lockedSource } = require("./helpers/locked-source.cjs");

const repoRoot = path.resolve(__dirname, "..");
const skillRoot = path.join(repoRoot, "skill");
const SCHEMA = "design-pipeline.ui-rule-coverage.v1";
const STATUSES = ["audit", "uc", "local", "pending", "not-adopted", "duplicate"];
const ROW_KEYS = new Set(["id", "rule", "status", "targets", "issue", "partial", "note", "reason", "duplicateOf"]);
const SHA = /^[0-9a-f]{40}$/;

const readJson = (file) => JSON.parse(fs.readFileSync(path.join(repoRoot, file), "utf8"));
const clone = (value) => JSON.parse(JSON.stringify(value));

// GitHub's heading anchor: lower case, punctuation dropped, each space a hyphen.
function headingAnchors(text) {
  const anchors = new Set();
  let fenced = false;
  for (const line of text.split(/\r?\n/)) {
    if (/^\s*(```|~~~)/.test(line)) fenced = !fenced;
    const heading = fenced ? null : line.match(/^#{1,6}\s+(.+?)\s*#*$/);
    if (heading) anchors.add(heading[1].toLowerCase().replace(/[^\p{L}\p{N}\s_-]/gu, "").replace(/\s/g, "-"));
  }
  return anchors;
}

function reviewRowIds(text) {
  return new Set([...text.matchAll(/^\| (UC-\d{2}) \|/gm)].map((match) => match[1]));
}

function context() {
  const files = new Map();
  return {
    auditCodes: new Set(AUDIT_CODES),
    reviewRows: reviewRowIds(fs.readFileSync(path.join(skillRoot, "references/ui-craft-sources.md"), "utf8")),
    anchors(file) {
      if (!files.has(file)) {
        const absolute = path.join(skillRoot, file);
        const inside = !path.isAbsolute(file) && !file.split("/").includes("..");
        files.set(file, inside && fs.existsSync(absolute) && fs.statSync(absolute).isFile() ? headingAnchors(fs.readFileSync(absolute, "utf8")) : null);
      }
      return files.get(file);
    },
    lock: (id) => { try { return lockedSource(id); } catch { return null; } },
    recordHash(file) {
      const absolute = path.join(skillRoot, file);
      return fs.existsSync(absolute) ? fs.readFileSync(absolute, "utf8").match(/^---\r?\n[\s\S]*?^\s*reviewedContentHash:\s*([0-9a-f]{64})\s*$[\s\S]*?^---/m)?.[1] ?? null : null;
    },
  };
}

function targetProblem(target, ctx) {
  if (typeof target !== "string" || !target) return "is not a string";
  if (target.startsWith("audit.")) return ctx.auditCodes.has(target) ? null : "is not an audit code of scripts/interaction-audit.cjs";
  if (/^UC-/.test(target)) return ctx.reviewRows.has(target) ? null : "is not a review row of references/ui-craft-sources.md";
  const [file, anchor, extra] = target.split("#");
  if (extra !== undefined || !/^(references|vendor)\/.+\.md$/.test(file)) return "is not an audit code, a UC id or a Markdown path under references/ or vendor/";
  const anchors = ctx.anchors(file);
  if (!anchors) return `names a file the skill does not have (${file})`;
  if (anchor !== undefined && !anchors.has(anchor)) return `names a heading ${file} does not have (#${anchor})`;
  return null;
}

const kind = (target) => (String(target).startsWith("audit.") ? "audit" : /^UC-/.test(String(target)) ? "uc" : "local");

// Every way the map can be wrong, as text. An empty list is a correct map.
function problems(coverage, fixture, ctx = context()) {
  const found = [];
  if (coverage?.schema !== SCHEMA) return [`schema must be ${SCHEMA}`];
  if (fixture?.schema !== FIXTURE_SCHEMA) return [`fixture schema must be ${FIXTURE_SCHEMA}`];
  if (!Array.isArray(coverage.sources) || !coverage.sources.length) return ["sources must be a non-empty array"];
  const sourceIds = new Set();
  for (const source of coverage.sources) {
    const label = source?.id || "<missing id>";
    if (sourceIds.has(source.id)) found.push(`${label}: duplicate source id`);
    sourceIds.add(source.id);
    if (!SHA.test(source.revision || "")) found.push(`${label}: revision must be a full commit id`);
    if (typeof source.license !== "string" || !source.license) found.push(`${label}: license is required`);
    const locked = ctx.lock(source.id);
    if (!locked || locked.kind !== "adapted-reference") found.push(`${label}: sources.lock.json has no adapted-reference ${label}`);
    else {
      if (locked.repo !== source.repo) found.push(`${label}: repo differs from sources.lock.json`);
      if (locked.revision !== source.revision) found.push(`${label}: revision ${source.revision} differs from the locked ${locked.revision}`);
      if (locked.documents?.[0] !== `skill/${source.record}`) found.push(`${label}: record must be the lock entry's document`);
    }
    const keys = new Set();
    for (const file of Array.isArray(source.files) ? source.files : []) {
      if (!/^[a-z0-9-]+$/.test(file.key || "") || keys.has(file.key)) found.push(`${label}: file keys must be unique kebab names`);
      keys.add(file.key);
      if (typeof file.path !== "string" || !["bullets", "selected"].includes(file.extract)) found.push(`${label}: ${file.key} needs a path and extract "bullets" or "selected"`);
      if (file.extract === "bullets" && typeof file.from !== "string") found.push(`${label}: ${file.key} needs the heading its rules start at`);
    }
    if (!keys.size) found.push(`${label}: files must list the upstream rule files`);

    const rows = new Map();
    for (const row of Array.isArray(source.rules) ? source.rules : []) {
      const at = `${label} ${row?.id || "<missing id>"}`;
      if (typeof row.id !== "string" || !keys.has(row.id.split("/")[0])) found.push(`${at}: id must start with one of the source's file keys`);
      if (rows.has(row.id)) found.push(`${at}: duplicate rule id`);
      rows.set(row.id, row);
      for (const key of Object.keys(row)) if (!ROW_KEYS.has(key)) found.push(`${at}: unknown field ${key}`);
      if (typeof row.rule !== "string" || !row.rule.trim()) found.push(`${at}: rule must quote the upstream line`);
      if (!STATUSES.includes(row.status)) { found.push(`${at}: status must be one of ${STATUSES.join(", ")}`); continue; }
      const targets = row.targets === undefined ? [] : row.targets;
      if (!Array.isArray(targets)) { found.push(`${at}: targets must be an array`); continue; }
      for (const target of targets) {
        const problem = targetProblem(target, ctx);
        if (problem) found.push(`${at}: target ${JSON.stringify(target)} ${problem}`);
      }
      const kinds = new Set(targets.map(kind));
      if (row.status === "audit" && !kinds.has("audit")) found.push(`${at}: an audit row needs an audit.* target`);
      if (row.status === "uc" && (!kinds.has("uc") || kinds.has("audit"))) found.push(`${at}: a uc row needs a UC- target and no audit code`);
      if (row.status === "local" && (!targets.length || kinds.has("audit") || kinds.has("uc"))) found.push(`${at}: a local row needs file targets only`);
      if (row.status === "pending" && !(Number.isInteger(row.issue) && row.issue > 0)) found.push(`${at}: a pending row needs the issue number that will add it`);
      if (row.status === "not-adopted" && (typeof row.reason !== "string" || row.reason.trim().length < 20)) found.push(`${at}: a not-adopted row needs a reason`);
      if (["not-adopted", "duplicate"].includes(row.status) && targets.length) found.push(`${at}: a ${row.status} row has no targets`);
      if (row.status !== "not-adopted" && row.reason !== undefined) found.push(`${at}: reason belongs to a not-adopted row`);
      if (row.status !== "duplicate" && row.duplicateOf !== undefined) found.push(`${at}: duplicateOf belongs to a duplicate row`);
      if (row.issue !== undefined && !(Number.isInteger(row.issue) && row.issue > 0)) found.push(`${at}: issue must be an issue number`);
      if (row.partial !== undefined && row.partial !== true) found.push(`${at}: partial is true or absent`);
      if ((row.partial === true || row.note !== undefined) && (typeof row.note !== "string" || row.note.trim().length < 20)) found.push(`${at}: a partial row says what differs in note`);
    }
    for (const row of rows.values()) {
      if (row.status !== "duplicate") continue;
      const original = rows.get(row.duplicateOf);
      if (!original || original.status === "duplicate" || original.id.split("/")[0] !== row.id.split("/")[0]) found.push(`${label} ${row.id}: duplicateOf must name a mapped row of the same file`);
    }

    // The pinned upstream list: every rule line has a row, quoted exactly, and no row is left over.
    const pinned = fixture.sources.find((item) => item.id === source.id);
    if (!pinned) { found.push(`${label}: ${FIXTURE} has no pinned rule list`); continue; }
    if (pinned.repo !== source.repo) found.push(`${label}: pinned rule list is from another repository`);
    const recorded = ctx.recordHash(source.record);
    if (!recorded) found.push(`${label}: ${source.record} does not record reviewedContentHash`);
    else if (recorded !== pinned.contentHash) found.push(`${label}: upstream rule files changed (${source.record} records ${recorded.slice(0, 12)}, the pinned list was read at ${pinned.contentHash.slice(0, 12)}); run scripts/refresh-ui-rule-fixture.cjs and map the changed rules`);
    const listed = new Set();
    for (const rule of pinned.rules) {
      listed.add(rule.id);
      const row = rows.get(rule.id);
      if (!row) found.push(`${label} ${rule.id}: upstream rule has no mapping: ${rule.text}`);
      else if (row.rule !== rule.text) found.push(`${label} ${rule.id}: mapped text differs from the upstream line: ${rule.text}`);
    }
    for (const id of rows.keys()) if (!listed.has(id)) found.push(`${label} ${id}: row is not in the pinned upstream list`);
  }
  for (const pinned of fixture.sources) if (!sourceIds.has(pinned.id)) found.push(`${pinned.id}: pinned rule list has no source in the map`);
  return found;
}

function counts(source) {
  const tally = Object.fromEntries(STATUSES.map((status) => [status, 0]));
  for (const row of source.rules) tally[row.status] += 1;
  return tally;
}

test("the rule coverage map is correct against the pinned upstream rule lists", () => {
  assert.deepEqual(problems(readJson(COVERAGE), readJson(FIXTURE)), []);
});

test("the map covers the four contracted rule lists at the locked revisions", () => {
  const coverage = readJson(COVERAGE);
  const fixture = readJson(FIXTURE);
  assert.deepEqual(coverage.sources.map((source) => [source.id, source.files.map((file) => file.path)]), [
    ["web-interface-guidelines", ["command.md", "README.md"]],
    ["ibelick-ui-skills-rules", ["skills/baseline-ui/SKILL.md", "skills/fixing-metadata/SKILL.md", "skills/fixing-motion-performance/SKILL.md"]],
  ]);
  for (const source of coverage.sources) {
    const locked = lockedSource(source.id);
    assert.equal(locked.kind, "adapted-reference", source.id);
    assert.match(locked.revision, SHA, source.id);
    assert.equal(source.revision, locked.revision, source.id);
    // The pinned list names the revision it was read at; the content hash, not the revision, decides
    // whether it is stale, so an upstream commit that leaves the rule files alone needs no refresh.
    const pinned = fixture.sources.find((item) => item.id === source.id);
    assert.match(pinned.revision, SHA, source.id);
    assert.match(pinned.contentHash, /^[0-9a-f]{64}$/, source.id);
    assert.deepEqual(pinned.files.map((file) => file.path), source.files.map((file) => file.path), source.id);
    for (const rule of pinned.rules) assert.ok(Number.isInteger(rule.line) && rule.line > 0 && rule.text, `${source.id} ${rule.id}`);
  }
  const byKey = (source, key) => source.rules.filter((row) => row.id.startsWith(`${key}/`));
  const [vercel, ibelick] = coverage.sources;
  // command.md: 104 rule lines, 13 of them the closing anti-pattern list restating earlier rules.
  assert.equal(byKey(vercel, "command").length, 104);
  assert.equal(byKey(vercel, "command").filter((row) => row.status === "duplicate").length, 13);
  assert.equal(byKey(vercel, "readme").length, 4);
  assert.deepEqual(["baseline-ui", "fixing-metadata", "fixing-motion-performance"].map((key) => byKey(ibelick, key).length), [42, 37, 41]);
});

test("known decisions stay recorded: not adopted with a reason, missing rules pending on their issue", () => {
  const coverage = readJson(COVERAGE);
  const row = (id) => coverage.sources.flatMap((source) => source.rules).find((item) => item.id === id);
  assert.match(row("command/content-copy/02").rule, /Title Case/);
  assert.match(row("command/performance/05").rule, /preconnect/);
  const notAdopted = ["command/content-copy/02", "command/performance/05", "baseline-ui/stack/01", "baseline-ui/stack/02", "baseline-ui/stack/03", "baseline-ui/stack/04", "baseline-ui/components/04", "baseline-ui/design/04"];
  for (const id of notAdopted) {
    assert.equal(row(id).status, "not-adopted", id);
    assert.ok(row(id).reason.length > 40, id);
  }
  for (const id of ["baseline-ui/stack/02", "baseline-ui/stack/03", "baseline-ui/stack/04", "baseline-ui/components/04"]) assert.match(row(id).rule, /motion\/react|tw-animate-css|`cn`|Base UI/, id);
  const pendingIssues = new Set(coverage.sources.flatMap((source) => source.rules).filter((item) => item.status === "pending").map((item) => item.issue));
  assert.deepEqual([...pendingIssues].sort(), [353, 354]);
  // #355 landed as audit.motion-properties: its measurable rules are audit rows, the rest review rows.
  for (const id of ["command/animation/03", "baseline-ui/animation/03", "baseline-ui/animation/07", "fixing-motion-performance/never-patterns/02", "fixing-motion-performance/scroll/04", "fixing-motion-performance/blur-and-filters/03"]) {
    assert.equal(row(id).status, "audit", id);
    assert.ok(row(id).targets.includes("audit.motion-properties"), id);
  }
  for (const id of ["baseline-ui/animation/07", "fixing-motion-performance/scroll/04"]) assert.match(row(id).note, /scrolls out of view later is reviewed under UC-43/, id);
  assert.equal(coverage.sources[1].rules.filter((entry) => entry.id.startsWith("fixing-motion-performance/") && entry.status === "pending").length, 0);
  for (const item of coverage.sources[1].rules.filter((entry) => entry.id.startsWith("fixing-metadata/") && entry.status === "pending")) assert.equal(item.issue, 353, item.id);
  // No row is mapped for appearance: a status total is the sum of real rows.
  for (const source of coverage.sources) assert.equal(Object.values(counts(source)).reduce((sum, value) => sum + value, 0), source.rules.length, source.id);
});

test("a wrong map is rejected: missing rows, dead targets, empty reasons and stale rule lists", () => {
  const coverage = readJson(COVERAGE);
  const fixture = readJson(FIXTURE);
  const broken = (edit) => {
    const next = { coverage: clone(coverage), fixture: clone(fixture) };
    edit(next.coverage, next.fixture);
    return problems(next.coverage, next.fixture).join("\n");
  };
  const rules = (data) => data.sources[0].rules;
  const find = (data, status) => rules(data).find((row) => row.status === status);

  assert.match(broken((map) => { rules(map).splice(0, 1); }), /command\/accessibility\/01: upstream rule has no mapping: Icon-only buttons/);
  assert.match(broken((map, pinned) => { pinned.sources.find((item) => item.id === "web-interface-guidelines").rules.push({ id: "command/forms/12", line: 50, text: "A rule upstream added" }); }), /command\/forms\/12: upstream rule has no mapping: A rule upstream added/);
  assert.match(broken((map) => { rules(map)[0].rule = "Icon-only buttons need a label"; }), /mapped text differs from the upstream line/);
  assert.match(broken((map) => { rules(map).push({ id: "command/forms/99", rule: "Invented", status: "pending", issue: 354 }); }), /command\/forms\/99: row is not in the pinned upstream list/);
  assert.match(broken((map, pinned) => { pinned.sources[0].contentHash = "0".repeat(64); }), /upstream rule files changed .*run scripts\/refresh-ui-rule-fixture\.cjs/);

  assert.match(broken((map) => { find(map, "audit").targets = ["audit.not-a-code"]; }), /"audit\.not-a-code" is not an audit code/);
  assert.match(broken((map) => { find(map, "uc").targets = ["UC-99"]; }), /"UC-99" is not a review row/);
  assert.match(broken((map) => { find(map, "local").targets = ["references/no-such-guide.md"]; }), /names a file the skill does not have/);
  assert.match(broken((map) => { find(map, "local").targets = ["references/mobile-web.md#no-such-heading"]; }), /names a heading references\/mobile-web\.md does not have/);
  assert.match(broken((map) => { find(map, "local").targets = ["../sources.lock.json"]; }), /is not an audit code, a UC id or a Markdown path/);
  assert.match(broken((map) => { find(map, "uc").targets = []; }), /a uc row needs a UC- target/);
  assert.match(broken((map) => { find(map, "local").targets.push("UC-01"); }), /a local row needs file targets only/);

  assert.match(broken((map) => { find(map, "not-adopted").reason = "  "; }), /a not-adopted row needs a reason/);
  assert.match(broken((map) => { delete find(map, "not-adopted").reason; }), /a not-adopted row needs a reason/);
  assert.match(broken((map) => { delete find(map, "pending").issue; }), /a pending row needs the issue number/);
  assert.match(broken((map) => { find(map, "pending").issue = "#354"; }), /a pending row needs the issue number/);
  assert.match(broken((map) => { find(map, "duplicate").duplicateOf = "command/forms/99"; }), /duplicateOf must name a mapped row/);
  assert.match(broken((map) => { rules(map).find((row) => row.partial).note = ""; }), /a partial row says what differs/);
  assert.match(broken((map) => { rules(map)[0].status = "covered"; }), /status must be one of/);
  assert.match(broken((map) => { map.sources[0].revision = "a".repeat(40); }), /differs from the locked/);
});

test("heading anchors follow the rendered Markdown, not text inside code fences", () => {
  assert.deepEqual([...headingAnchors("# One focus ring with `:focus-visible`\n```md\n## Not a heading\n```\n### TR-10 — Motion owns its resources\n## 5. Compositor cost\n")], ["one-focus-ring-with-focus-visible", "tr-10--motion-owns-its-resources", "5-compositor-cost"]);
});

test("the pinned list is extracted from rule files mechanically", () => {
  const text = ["# Guide", "", "- not a rule: before the start heading", "## Rules", "", "### Forms & Fields (critical)", "", "- First rule", "  - a nested detail is not a rule", "- Second rule", "", "```md", "- inside a code fence", "```", "### 2. second section", "- Third rule", "## Output", "- after the end heading"].join("\n");
  assert.deepEqual(extractBullets(text, { key: "guide", path: "guide.md", from: "## Rules", to: "## Output" }), [
    { id: "guide/forms-fields/01", line: 8, text: "First rule" },
    { id: "guide/forms-fields/02", line: 10, text: "Second rule" },
    { id: "guide/second-section/01", line: 16, text: "Third rule" },
  ]);
  assert.equal(extractBullets(text, { key: "guide", path: "guide.md", from: "## Rules", to: null }).length, 4);
  assert.throws(() => extractBullets(text, { key: "guide", path: "guide.md", from: "## Missing", to: null }), /has no "## Missing" heading/);
  assert.equal(sectionSlug("### 1. correctness and duplication (critical)"), "correctness-and-duplication");
  assert.deepEqual(extractSelected(text, { path: "guide.md" }, [{ id: "guide/01", rule: "Second rule" }]), [{ id: "guide/01", line: 10, text: "Second rule" }]);
  assert.throws(() => extractSelected(text, { path: "guide.md" }, [{ id: "guide/01", rule: "A rule upstream removed" }]), /no longer has the selected rule guide\/01/);
});

test("the map and both source records ship in the package", () => {
  const required = readJson("skill/references/package-resources.json").required;
  for (const file of ["references/ui-rule-coverage.json", "references/web-interface-guidelines.md", "references/ibelick-ui-skills.md"]) {
    assert.equal(required.filter((item) => item === file).length, 1, file);
    assert.ok(fs.existsSync(path.join(skillRoot, file)), file);
  }
});

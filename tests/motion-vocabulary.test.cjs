"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const repoRoot = path.resolve(__dirname, "..");
const skillRoot = path.join(repoRoot, "skill");
const cli = path.join(skillRoot, "scripts/designer-pipeline.cjs");
const { canonicalJson } = require("../skill/scripts/contract-utils.cjs");
const { normalizeSnapshot, searchCatalog } = require("../skill/scripts/design-system-catalog-core.cjs");
const { routeJob } = require("../skill/scripts/job-route-core.cjs");
const {
  CATALOG, CATEGORY, FIXTURE, FIXTURE_SCHEMA, GUIDE, LOCK_ID, RECORD_PREFIX, UPSTREAM_PATH, VOCABULARY,
  catalogIsCurrent, catalogRecords, parseGlossary, slug,
} = require("../scripts/refresh-motion-vocabulary.cjs");

const LOOKUP = "tests/fixtures/motion-vocabulary/lookup-queries.json";
const SHA = /^[0-9a-f]{40}$/;
const CJK = /[㐀-鿿]/;

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function readJson(relativePath) {
  return JSON.parse(read(relativePath));
}

const lock = readJson("sources.lock.json");
const locked = lock.sources.find((entry) => entry.id === LOCK_ID);
const catalog = normalizeSnapshot(readJson(CATALOG));
const primitives = new Set(readJson("skill/references/motion-primitives.json").primitives.map((item) => item.id));
const recipes = new Set(readJson("skill/references/motion-recipes/full-inventory.json").items.map((item) => item.id));

// GitHub heading anchors: lower case, punctuation dropped, each space a hyphen.
function anchors(file) {
  const found = new Set();
  let fenced = false;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    if (/^```/.test(line)) fenced = !fenced;
    const heading = fenced ? null : line.match(/^#{1,6}\s+(.+?)\s*$/);
    if (heading) found.add(heading[1].toLowerCase().replace(/[^\p{L}\p{N}\s_-]/gu, "").replace(/\s/g, "-"));
  }
  return found;
}

function guideProblem(reference) {
  const [file, anchor, extra] = reference.split("#");
  if (!file || !anchor || extra !== undefined) return `${reference}: a guide is <file>#<anchor>`;
  if (!/^(?:references|vendor)\/.+\.md$/.test(file)) return `${reference}: a guide is a Markdown file under references/ or vendor/`;
  const absolute = path.join(skillRoot, file);
  if (!fs.existsSync(absolute)) return `${reference}: ${file} does not exist`;
  return anchors(absolute).has(anchor) ? null : `${reference}: ${file} has no heading with that anchor`;
}

function aliasProblems(aliases, label) {
  const found = [];
  for (const lang of ["en", "zh"]) {
    const list = aliases?.[lang];
    if (!Array.isArray(list) || !list.length || list.some((item) => typeof item !== "string" || !item.trim())) found.push(`${label}: aliases.${lang} needs at least one description`);
    else if (new Set(list).size !== list.length) found.push(`${label}: aliases.${lang} repeats a description`);
  }
  if ((aliases?.en || []).some((item) => CJK.test(item))) found.push(`${label}: aliases.en holds Chinese text`);
  if ((aliases?.zh || []).some((item) => !CJK.test(item))) found.push(`${label}: aliases.zh holds an alias without Chinese text`);
  return found;
}

// Everything the vocabulary promises, checked against the pinned upstream glossary and the package.
function problems(vocabulary, fixture) {
  const found = [];
  if (vocabulary.schema !== "design-pipeline.motion-vocabulary.v1") found.push("schema is not design-pipeline.motion-vocabulary.v1");
  if (vocabulary.source?.id !== LOCK_ID || vocabulary.source?.path !== UPSTREAM_PATH) found.push(`source must name ${LOCK_ID} and ${UPSTREAM_PATH}`);
  if (vocabulary.source?.revision !== locked.revision) found.push(`source.revision ${vocabulary.source?.revision} differs from the locked ${locked.revision}`);
  if (vocabulary.source?.repository !== locked.repo) found.push("source.repository differs from the lock");
  if (canonicalJson(vocabulary.categories) !== canonicalJson(fixture.categories)) found.push("categories differ from the pinned upstream glossary");
  const ids = vocabulary.terms.map((term) => term.id);
  const termIds = new Set(ids);
  for (const id of ids.filter((value, index) => ids.indexOf(value) !== index)) found.push(`${id}: term id is repeated`);
  const pinned = new Map(fixture.terms.map((term) => [term.id, term]));
  for (const term of fixture.terms) if (!termIds.has(term.id)) found.push(`${term.id}: upstream term is missing from the vocabulary`);
  for (const term of vocabulary.terms) {
    const label = `term ${term.id}`;
    const source = pinned.get(term.id);
    if (!source) {
      found.push(`${label}: not in the pinned upstream glossary; a project-owned entry belongs in antiPatterns`);
      continue;
    }
    if (term.id !== slug(term.term)) found.push(`${label}: id is not the slug of its term`);
    if (term.term !== source.term || term.category !== source.category) found.push(`${label}: term or category differs from upstream`);
    if (term.definition !== source.definition) found.push(`${label}: definition is not the upstream text verbatim`);
    found.push(...aliasProblems(term.aliases, label));
    if (!Array.isArray(term.closeTerms)) found.push(`${label}: closeTerms must be a list`);
    for (const close of term.closeTerms || []) {
      if (!termIds.has(close.id)) found.push(`${label}: close term ${close.id} does not exist`);
      if (close.id === term.id) found.push(`${label}: lists itself as a close term`);
      if (typeof close.difference !== "string" || close.difference.trim().length < 20) found.push(`${label}: close term ${close.id} needs a difference`);
    }
    for (const id of term.local?.primitives || []) if (!primitives.has(id)) found.push(`${label}: primitive ${id} is not in motion-primitives.json`);
    for (const id of term.local?.recipes || []) if (!recipes.has(id)) found.push(`${label}: recipe ${id} is not in motion-recipes/full-inventory.json`);
    for (const reference of term.local?.guides || []) {
      const problem = guideProblem(reference);
      if (problem) found.push(`${label}: ${problem}`);
    }
    for (const key of ["primitives", "recipes", "guides"]) if (!Array.isArray(term.local?.[key])) found.push(`${label}: local.${key} must be a list`);
  }
  const antiIds = new Set();
  for (const item of vocabulary.antiPatterns || []) {
    const label = `anti-pattern ${item.id}`;
    if (antiIds.has(item.id) || termIds.has(item.id)) found.push(`${label}: id is already used`);
    antiIds.add(item.id);
    if (item.id !== slug(item.name || "")) found.push(`${label}: id is not the slug of its name`);
    for (const key of ["description", "fix", "origin"]) if (typeof item[key] !== "string" || !item[key].trim()) found.push(`${label}: ${key} is required`);
    if (!termIds.has(item.replacement)) found.push(`${label}: replacement ${item.replacement} is not a term`);
    if (!Array.isArray(item.terms) || !item.terms.length) found.push(`${label}: terms must name the terms it concerns`);
    for (const id of item.terms || []) if (!termIds.has(id)) found.push(`${label}: term ${id} does not exist`);
    if (!(item.terms || []).includes(item.replacement)) found.push(`${label}: terms must include the replacement`);
    found.push(...aliasProblems(item.aliases, label));
    if (!Array.isArray(item.sources?.guides) || !item.sources.guides.length) found.push(`${label}: sources.guides needs a packaged rule`);
    for (const reference of item.sources?.guides || []) {
      const problem = guideProblem(reference);
      if (problem) found.push(`${label}: ${problem}`);
    }
    for (const upstream of item.sources?.upstream || []) {
      if (typeof upstream.path !== "string" || !/^skills\/.+\.md$/.test(upstream.path) || typeof upstream.heading !== "string" || !upstream.heading.trim()) found.push(`${label}: an upstream source is { path, heading }`);
    }
  }
  return found;
}

function ids(results) {
  return results.map((entry) => entry.localId);
}

function termIdsOf(results) {
  return results.filter((entry) => entry.recordType === "term").map((entry) => entry.localId.slice(RECORD_PREFIX.length));
}

function search(query, options = {}) {
  return searchCatalog(catalog, { kind: "doc", query, ...options });
}

function runCli(args) {
  const child = spawnSync(process.execPath, [cli, ...args, "--json"], { cwd: repoRoot, encoding: "utf8", windowsHide: true, maxBuffer: 64 * 1024 * 1024 });
  let output;
  try { output = JSON.parse(child.stdout); } catch { output = { stdout: child.stdout, stderr: child.stderr }; }
  return { status: child.status, output, stderr: child.stderr };
}

function searchCli(query, extra = []) {
  return runCli(["design-system", "search", "--root", skillRoot, "--snapshot", "references/component-source-catalog.json", "--kind", "doc", "--query", query, ...extra]);
}

test("the vocabulary holds every pinned upstream term with its definition verbatim", () => {
  const vocabulary = readJson(VOCABULARY);
  const fixture = readJson(FIXTURE);
  assert.deepEqual(problems(vocabulary, fixture), []);
  assert.equal(fixture.schema, FIXTURE_SCHEMA);
  assert.equal(vocabulary.terms.length, fixture.terms.length);
  // The glossary at the locked revision: 12 categories, 91 terms.
  assert.equal(fixture.categories.length, 12);
  assert.equal(fixture.terms.length, 91);
  for (const category of fixture.categories) assert.ok(vocabulary.terms.some((term) => term.category === category.id), category.id);
  // Sixteen of them were named nowhere in the package before this vocabulary.
  for (const id of ["pop-in", "fill-mode", "stepped-animation", "direction-aware-transition", "swipe-to-dismiss", "rubber-banding", "asymmetric-easing", "perceptual-duration", "idle-animation", "line-drawing", "text-morph", "dropped-frame", "purposeful-animation", "perceived-performance", "frequency-of-use", "hardware-acceleration"]) {
    assert.ok(vocabulary.terms.some((term) => term.id === id), id);
  }
});

test("the pinned term list is the upstream file the lock and the guide name", () => {
  const fixture = readJson(FIXTURE);
  const guide = read(`skill/${GUIDE}`);
  assert.equal(locked.kind, "adapted-reference");
  assert.match(locked.revision, SHA);
  assert.ok(locked.documents.includes(`skill/${GUIDE}`), "the guide is a document of the existing lock entry");
  assert.equal(lock.sources.filter((entry) => /vocabulary/.test(entry.id)).length, 0, "no parallel lock entry");
  assert.equal(fixture.source.id, LOCK_ID);
  assert.equal(fixture.source.path, UPSTREAM_PATH);
  assert.match(fixture.source.revision, SHA);
  assert.ok(guide.includes(`reviewedRevision: ${locked.revision}`));
  assert.ok(guide.includes(`/blob/${locked.revision}/${UPSTREAM_PATH}`));
  // `npm run sources:update` rewrites the guide's reviewedContentHash from the new upstream file and
  // never touches tests/fixtures, so an upstream change to the glossary fails here until
  // scripts/refresh-motion-vocabulary.cjs --checkout refreshes the pinned list.
  const recorded = guide.match(/^\s*reviewedContentHash:\s*([0-9a-f]{64})\s*$/m)?.[1];
  assert.equal(recorded, fixture.source.sha256, "the pinned term list is stale: run node scripts/refresh-motion-vocabulary.cjs --checkout <clone>");
  assert.match(guide, /contentHashScope: single-source UTF-8 bytes at reviewedRevision/);
});

test("the glossary parser reads the upstream format and refuses a reshaped file", () => {
  const sample = ["# Animation Vocabulary", "", "## Glossary", "", "_A curated snapshot._", "", "### Entrances & Exits — how elements appear and disappear", "- **Fade in / Fade out** — Element appears or disappears by changing opacity.", "- **Pop in** — Element appears with a slight overshoot, like it bounces into place.", "", "### Easing — how speed changes over an animation", "- **Ease-out** — Starts fast, ends slow."].join("\n");
  const parsed = parseGlossary(sample);
  assert.deepEqual(parsed.categories.map((item) => item.id), ["entrances-and-exits", "easing"]);
  assert.deepEqual(parsed.terms.map((item) => [item.id, item.category]), [["fade-in-fade-out", "entrances-and-exits"], ["pop-in", "entrances-and-exits"], ["ease-out", "easing"]]);
  assert.equal(parsed.terms[1].definition, "Element appears with a slight overshoot, like it bounces into place.");
  assert.throws(() => parseGlossary("# No glossary here"), /Glossary/);
  assert.throws(() => parseGlossary(`${sample}\n* **Linear**: constant speed.`), /not a category heading or a term line/);
  assert.throws(() => parseGlossary(`${sample}\n- **Pop in** — Again.`), /repeats term ids/);
});

test("a wrong vocabulary is rejected", () => {
  const fixture = readJson(FIXTURE);
  const broken = (mutate, target = "vocabulary") => {
    const vocabulary = readJson(VOCABULARY);
    const pinned = readJson(FIXTURE);
    mutate(target === "vocabulary" ? vocabulary : pinned);
    return problems(vocabulary, pinned).join("\n");
  };
  const term = (vocabulary, id) => vocabulary.terms.find((item) => item.id === id);
  assert.match(broken((v) => { term(v, "stagger").definition += " Reworded."; }), /stagger: definition is not the upstream text verbatim/);
  assert.match(broken((v) => { v.terms = v.terms.filter((item) => item.id !== "pop-in"); }), /pop-in: upstream term is missing/);
  assert.match(broken((v) => { v.terms.push({ ...term(v, "pop-in"), id: "zoom-pop", term: "Zoom pop" }); }), /zoom-pop: not in the pinned upstream glossary/);
  assert.match(broken((v) => { term(v, "morph").closeTerms.push({ id: "dissolve", difference: "A dissolve is a film term for a crossfade." }); }), /close term dissolve does not exist/);
  assert.match(broken((v) => { term(v, "morph").aliases.zh = []; }), /morph: aliases.zh needs at least one description/);
  assert.match(broken((v) => { term(v, "morph").aliases.en = ["形变"]; }), /aliases.en holds Chinese text/);
  assert.match(broken((v) => { term(v, "spring").local.primitives.push("response.unknown"); }), /primitive response.unknown is not in motion-primitives.json/);
  assert.match(broken((v) => { term(v, "stagger").local.recipes.push("no-such-recipe"); }), /recipe no-such-recipe is not in/);
  assert.match(broken((v) => { term(v, "stagger").local.guides.push("references/ui-transition-rules.md#tr-99--missing"); }), /has no heading with that anchor/);
  assert.match(broken((v) => { term(v, "stagger").local.guides.push("references/no-such-guide.md#top"); }), /does not exist/);
  assert.match(broken((v) => { v.source.revision = "a".repeat(40); }), /differs from the locked/);
  assert.match(broken((v) => { v.antiPatterns[0].replacement = "grow"; }), /replacement grow is not a term/);
  assert.match(broken((v) => { v.antiPatterns[1].sources.guides = ["references/mobile-web.md#no-such-section"]; }), /hover-flicker: .*has no heading/);
  // Upstream adds, rewords or removes a term: the refreshed pinned list no longer matches.
  assert.match(broken((f) => { f.terms.push({ id: "wipe", term: "Wipe", category: "entrances-and-exits", definition: "New upstream term." }); }, "fixture"), /wipe: upstream term is missing/);
  assert.match(broken((f) => { f.terms.find((item) => item.id === "jank").definition = "Reworded upstream."; }, "fixture"), /jank: definition is not the upstream text verbatim/);
  assert.match(broken((f) => { f.terms = f.terms.filter((item) => item.id !== "ripple"); }, "fixture"), /ripple: not in the pinned upstream glossary/);
  assert.equal(fixture.terms.length, 91);
});

test("close terms tell the confusable pairs apart", () => {
  const vocabulary = readJson(VOCABULARY);
  const close = (id) => vocabulary.terms.find((term) => term.id === id).closeTerms;
  const difference = (id, other) => close(id).find((item) => item.id === other)?.difference || "";
  for (const [left, right] of [["pop-in", "bounce"], ["clip-path", "mask"], ["shared-element-transition", "layout-animation"], ["morph", "crossfade"], ["scale-in", "pop-in"]]) {
    assert.ok(difference(left, right), `${left} names ${right}`);
    assert.ok(difference(right, left), `${right} names ${left}`);
  }
  assert.ok(close("morph").some((item) => item.id === "shared-element-transition"));
  // "Shared layout animation" is not an upstream term: both sides say which term it is.
  assert.match(difference("layout-animation", "shared-element-transition"), /shared layout animation/i);
  assert.match(difference("shared-element-transition", "layout-animation"), /shared layout animation/i);
  assert.equal(termIdsOf(search("shared layout animation"))[0], "shared-element-transition");
  assert.ok(termIdsOf(search("shared layout animation")).includes("layout-animation"));
});

test("the three anti-patterns have a name, a replacement term and a packaged rule", () => {
  const vocabulary = readJson(VOCABULARY);
  assert.deepEqual(vocabulary.antiPatterns.map((item) => [item.id, item.replacement]), [["scale-from-zero", "scale-in"], ["hover-flicker", "hover-effect"], ["layered-entry", "orchestration"]]);
  const zero = vocabulary.antiPatterns[0];
  assert.ok(zero.sources.guides.includes("vendor/emil-design-eng/upstream/skills/emil-design-eng/UPSTREAM-SKILL.md#never-animate-from-scale0"));
  assert.deepEqual(zero.sources.upstream, [{ path: "skills/review-animations/STANDARDS.md", heading: "Physicality" }]);
  for (const item of vocabulary.antiPatterns) {
    const record = catalog.entries.find((entry) => entry.localId === `${RECORD_PREFIX}${item.id}`);
    assert.equal(record.motionVocabulary.kind, "anti-pattern", item.id);
    assert.equal(record.motionVocabulary.replacement.id, item.replacement, item.id);
    assert.equal(record.sourceId, "design-pipeline/motion-vocabulary", item.id);
    assert.equal(record.license.state, "project-owned", item.id);
    // Each term the anti-pattern concerns names it back.
    for (const id of item.terms) {
      const term = catalog.entries.find((entry) => entry.localId === `${RECORD_PREFIX}${id}`);
      assert.ok(term.motionVocabulary.antiPatterns.some((named) => named.id === item.id), `${id} names ${item.id}`);
    }
  }
  const found = search("popover grows from scale 0");
  assert.ok(termIdsOf(found).includes("scale-from-zero"));
  assert.ok(termIdsOf(found).some((id) => id === "pop-in" || id === "origin-aware-animation"));
  assert.equal(termIdsOf(search("hover flicker"))[0], "hover-flicker");
  assert.equal(termIdsOf(search("layered entry"))[0], "layered-entry");
});

test("catalog records are generated from the vocabulary, never written twice", () => {
  assert.ok(catalogIsCurrent(repoRoot), `${CATALOG} differs from ${VOCABULARY}; run node scripts/refresh-motion-vocabulary.cjs --catalog`);
  const vocabulary = readJson(VOCABULARY);
  const records = catalogRecords(vocabulary);
  assert.equal(records.filter((record) => record.recordType === "term").length, vocabulary.terms.length + vocabulary.antiPatterns.length);
  const entries = catalog.entries.filter((entry) => entry.category === CATEGORY);
  assert.equal(entries.length, vocabulary.terms.length + vocabulary.antiPatterns.length);
  for (const entry of entries) {
    assert.equal(entry.kind, "doc", entry.id);
    assert.equal(entry.recordType, "term", entry.id);
    assert.equal(entry.localPaths.guide, GUIDE, entry.id);
    assert.equal(entry.webRanking, false, entry.id);
  }
  const pop = entries.find((entry) => entry.localId === `${RECORD_PREFIX}pop-in`);
  const source = vocabulary.terms.find((term) => term.id === "pop-in");
  assert.equal(pop.name, "Pop in");
  assert.equal(pop.description, source.definition);
  assert.deepEqual(pop.aliases, [...source.aliases.en, ...source.aliases.zh]);
  assert.equal(pop.provenance.revision, locked.revision);
  assert.equal(pop.license.id, "MIT");
  assert.deepEqual(pop.motionVocabulary.local, source.local);
  // A term record never competes with web component routing.
  assert.equal(searchCatalog(catalog, { query: "pop in", platform: "web" }).filter((entry) => entry.recordType === "term").length, 0);
});

test("loose descriptions find their term in English and Chinese", () => {
  const fixture = readJson(LOOKUP);
  const vocabulary = readJson(VOCABULARY);
  const categories = new Set(vocabulary.categories.map((category) => category.id));
  const queries = fixture.queries;
  assert.ok(queries.length >= 24);
  for (const lang of ["en", "zh"]) assert.ok(queries.filter((item) => item.lang === lang).length >= 12, lang);
  for (const item of queries.filter((entry) => entry.lang === "zh")) assert.match(item.query, CJK, item.query);
  for (const category of categories) assert.ok(queries.some((item) => item.category === category), `no description for ${category}`);
  let first = 0;
  for (const item of queries) {
    const term = vocabulary.terms.find((entry) => entry.id === item.expect);
    assert.ok(term, item.expect);
    assert.equal(term.category, item.category, item.query);
    // The description is not one of the stored aliases: the match is by shared words.
    assert.ok(![...term.aliases.en, ...term.aliases.zh].includes(item.query), item.query);
    const found = termIdsOf(search(item.query));
    const rank = found.indexOf(item.expect) + 1;
    assert.ok(rank >= 1 && rank <= 3, `${item.query}: ${item.expect} is at ${rank || "no"} place in ${found.slice(0, 5).join(", ")}`);
    if (rank === 1) first += 1;
    for (const close of item.close || []) assert.ok(term.closeTerms.some((entry) => entry.id === close), `${item.expect} names ${close}`);
  }
  assert.ok(fixture.minimumFirst >= 18);
  assert.ok(first >= fixture.minimumFirst, `${first} of ${queries.length} descriptions rank their term first; ${fixture.minimumFirst} required`);
  // The three examples of the upstream skill.
  assert.deepEqual(queries.filter((item) => item.upstreamExample).map((item) => item.expect), ["origin-aware-animation", "morph", "rubber-banding"]);
  const morph = search("The thing where one image turns into another image.")[0];
  assert.equal(morph.localId, `${RECORD_PREFIX}morph`);
  assert.deepEqual(morph.motionVocabulary.closeTerms.map((item) => item.id).filter((id) => ["crossfade", "shared-element-transition"].includes(id)), ["crossfade", "shared-element-transition"]);
});

test("the lookup is the existing design-system search command", () => {
  const pop = searchCli("pop in");
  assert.equal(pop.status, 0, pop.stderr);
  assert.equal(pop.output.status, "valid");
  const [first] = pop.output.results;
  assert.equal(first.localId, `${RECORD_PREFIX}pop-in`);
  assert.equal(first.name, "Pop in");
  assert.equal(first.description, "Element appears with a slight overshoot, like it bounces into place.");
  assert.ok(first.motionVocabulary.closeTerms.some((item) => item.id === "bounce" && item.term === "Bounce" && item.difference));
  assert.ok(first.motionVocabulary.antiPatterns.some((item) => item.id === "scale-from-zero"));

  for (const [query, expect] of [["popover grows out of the button", "origin-aware-animation"], ["按钮按下去缩一下", "press-tap-feedback"]]) {
    const result = searchCli(query);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.output.results[0].localId, `${RECORD_PREFIX}${expect}`, query);
  }
  const zero = searchCli("popover grows from scale 0");
  assert.ok(termIdsOf(zero.output.results).includes("scale-from-zero"));
  assert.ok(termIdsOf(zero.output.results).includes("origin-aware-animation"));

  const only = searchCli("stagger", ["--category", CATEGORY, "--limit", "1"]);
  assert.deepEqual(ids(only.output.results), [`${RECORD_PREFIX}stagger`]);
  // No vocabulary command was added.
  const unknown = runCli(["motion-vocabulary", "search", "--query", "pop in"]);
  assert.notEqual(unknown.status, 0);
});

test("recipe search keeps every result and its order; terms are listed first", () => {
  const others = catalog.entries.filter((entry) => entry.kind === "doc" && entry.recordType !== "term");
  // Results the search returned before the vocabulary existed: the literal match, in catalog order.
  const before = (query) => others.filter((entry) => canonicalJson(entry).toLowerCase().includes(query)).map((entry) => entry.localId);
  for (const [query, minimum] of [["stagger", 38], ["rubber band", 2], ["回弹", 16], ["血条拖尾", 1], ["skeleton", 1], ["motion-reference/bar-chart-stagger", 1]]) {
    const found = search(query);
    const rest = found.filter((entry) => entry.recordType !== "term");
    assert.deepEqual(ids(rest), before(query), query);
    assert.ok(rest.length >= minimum, `${query}: ${rest.length} recipe records`);
    const lastTerm = found.map((entry) => entry.recordType).lastIndexOf("term");
    assert.ok(lastTerm < found.length - rest.length, `${query}: terms come before every other record`);
  }
  assert.equal(search("stagger")[0].localId, `${RECORD_PREFIX}stagger`);
  assert.equal(search("血条拖尾")[0].localId, "motion-recipe/hp-ghost-bar");
  assert.equal(search("回弹")[0].localId, `${RECORD_PREFIX}bounce`);
  // Words no term knows find no term; an empty query still lists everything in catalog order.
  assert.deepEqual(termIdsOf(search("血条拖尾")), []);
  assert.deepEqual(termIdsOf(search("zxqv glorp")), []);
  assert.deepEqual(ids(searchCatalog(catalog, { kind: "doc" })), catalog.entries.filter((entry) => entry.kind === "doc").map((entry) => entry.localId));
  // Same query, same order.
  assert.deepEqual(ids(search("the popover grows out of the button")), ids(search("the popover grows out of the button")));
  assert.deepEqual(ids(search("stagger", { limit: 3 })), ids(search("stagger")).slice(0, 3));
});

test("naming questions route to the motion-vocabulary job", () => {
  const packageResources = readJson("skill/references/package-resources.json");
  for (const file of [GUIDE, path.posix.relative("skill", VOCABULARY)]) {
    assert.ok(fs.existsSync(path.join(skillRoot, file)), file);
    assert.ok(packageResources.required.includes(file), file);
  }
  for (const query of [
    "what's it called when a popover grows out of the button",
    "这个按钮按下去缩一下的效果叫什么",
    "name the motion effect where items come in one after another",
    "列表一个接一个出现的动画叫什么",
    "有没有一份动效术语表可以查",
  ]) {
    const result = runCli(["route", "--root", repoRoot, "--query", query]);
    assert.equal(result.status, 0, `${query}: ${result.stderr}`);
    assert.equal(result.output.status, "ready", query);
    assert.equal(result.output.job, "motion-vocabulary", query);
    assert.ok(result.output.candidates[0].score > 0, query);
    assert.notEqual(result.output.confidence, "low", query);
    assert.equal(`references/${result.output.primaryKnowledge.id}.md`, GUIDE, query);
    // The door is the existing search command, after the kernel.
    assert.deepEqual(result.output.next.map((step) => [step.command, step.action, step.role]), [["foundation", "check", "kernel"], ["toolchain", "resolve", "kernel"], ["design-system", "search", "primary"]], query);
  }
  // An explicit job or a stronger scored match keeps the brief; ordinary briefs keep the default.
  assert.equal(routeJob({ query: "clone this site, and what's it called when the menu slides in" }).job, "website-clone");
  assert.equal(routeJob({ query: "what's it called when gsap scrolltrigger pins a section" }).job, "technique");
  const ordinary = routeJob({ query: "design a settings page for a billing product" });
  assert.equal(ordinary.job, "product-design");
  assert.equal(ordinary.confidence, "low");
});

test("the vocabulary is built in: guide, companion map and notices agree", () => {
  const vocabulary = readJson(VOCABULARY);
  const guide = read(`skill/${GUIDE}`);
  for (const term of vocabulary.terms) assert.ok(guide.includes(`\`${term.id}\``), `the guide lists ${term.id}`);
  for (const item of vocabulary.antiPatterns) assert.ok(guide.includes(`\`${item.id}\``), `the guide lists ${item.id}`);
  for (const category of vocabulary.categories) assert.ok(guide.includes(`**${category.name}**`), category.name);
  assert.match(guide, /design-system search/);
  assert.match(guide, /approximation/);
  const companions = readJson("skill/references/companion-capabilities.json");
  const motion = companions.groups.find((item) => item.name === "Motion design");
  assert.ok(!motion.skills.includes("animation-vocabulary"), "animation-vocabulary is no longer an external companion");
  assert.match(motion.fallback, /references\/motion-vocabulary\.md/);
  assert.match(read("skill/references/companion-skills.md"), /`animation-vocabulary` \| Built-in/);
  for (const file of ["skill/references/feature-routes.md", "skill/references/pipeline-reference.md", "skill/references/capability-routing.md", "skill/references/animation-opportunity-and-review.md"]) {
    assert.match(read(file), /motion-vocabulary\.md/, file);
  }
  const notices = read("THIRD_PARTY_NOTICES.md");
  assert.match(notices, /skills\/animation-vocabulary\/SKILL\.md/);
  assert.match(notices, /motion-vocabulary\.json/);
});

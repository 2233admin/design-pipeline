"use strict";

// Directions from three sources (OpenSpec change directions-from-three-sources): the ui playback, six
// cards from a designer, a real work and a catalog roulette, the thumbnail board, three full versions,
// what `direction check` finds (each with its fix), the owner's pick with words, mix and taste, and
// the appearance ledger written on delivery and read at the next direction stage. Library and ledger
// are fixtures; the browser measurement is skipped, with the reason, when no browser resolves.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const { decide, initState, nextAction, readState } = require("../skill/scripts/workflow-core.cjs");
const { checkDirectionPreview } = require("../skill/scripts/direction-preview-core.cjs");
const { execute } = require("../skill/scripts/cli-core.cjs");
const { draw, loadCatalog, parseCatalog } = require("../skill/scripts/directions-core.cjs");
const ledger = require("../skill/scripts/appearance-ledger-core.cjs");
const { resolvePuppeteer } = require("../skill/scripts/film-capture-core.cjs");
const { resolveBrowser } = require("../skill/scripts/browser-locate.cjs");
const { hash, isolate, readReceipt, saveReceipt, write, writeDirectionSet } = require("./helpers/direction-fixture.cjs");

const env = isolate();
test.after(env.restore);
const roots = [];
test.after(() => roots.forEach((root) => fs.rmSync(root, { recursive: true, force: true })));

const CARD = ["Need: a console for desk traders.", "Audience: traders on large desktop screens.", "Scene: open all day beside a market feed.", "Tone: calm and exact (my guess).", "Unstated: dense but never noisy (my guess).", "I'll make several real directions for you to see."].join("\n");

function project(tier = "standard", options = {}) {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), "directions-"));
  roots.push(parent);
  const root = path.join(parent, "console");
  fs.mkdirSync(root);
  initState(root, { deliverable: "ui", tier, ...options });
  return root;
}

const toPlayback = (root) => decide(root, { by: "owner", stage: "intake", answer: "A console for desk traders, desktop only" });
const toDirections = (root) => {
  toPlayback(root);
  decide(root, { by: "owner", stage: "intake", verdict: "accept", answer: CARD });
};
const findings = (root, stage = "preview") => checkDirectionPreview(root, { stage, recentEntries: ledger.recentEntries() });
const codes = (root) => findings(root).findings.map((item) => item.code);
const reset = () => fs.rmSync(env.ledger, { force: true });

// --- the restate step ------------------------------------------------------------------------------------

test("ui standard plays the reply back before any direction and never asks for a style in words", () => {
  const root = project();
  const first = nextAction(root);
  assert.equal(first.stage, "intake");
  assert.match(first.then, /play back/);
  toPlayback(root);
  const ask = nextAction(root);
  assert.equal(ask.stage, "intake");
  assert.equal(ask.type, "ask");
  for (const word of ["need", "audience", "scene", "tone", "did not say"]) assert.match(ask.instruction, new RegExp(word));
  assert.match(ask.instruction, /I'll make several real directions for you to see/);
  assert.match(ask.instruction, /Do not ask the owner to name or pick a style/);
  assert.throws(() => decide(root, { by: "owner", stage: "intake", verdict: "accept", answer: "Sounds good to me, go ahead" }), /need, audience, scene, tone/);
  decide(root, { by: "owner", stage: "intake", verdict: "reject", answer: "It is not for traders but for analysts" });
  assert.equal(nextAction(root).first.includes("analysts"), true);
  assert.deepEqual(readState(root).rules.map((rule) => rule.from), ["playback 1"]);
  decide(root, { by: "owner", stage: "intake", verdict: "accept", answer: CARD });
  assert.equal(nextAction(root).stage, "concepts");
  assert.equal(readState(root).decisions.playback, CARD);
});

test("quick and replicate ui keep their intake and have no playback", () => {
  assert.equal(nextAction(project("quick")).stage, "work");
  const replicate = project("standard", { mode: "replicate" });
  decide(replicate, { by: "owner", stage: "intake", answer: "default" });
  assert.equal(nextAction(replicate).stage, "reference");
  assert.throws(() => decide(replicate, { by: "owner", stage: "intake", verdict: "accept", answer: CARD }), /no playback/);
});

// --- the roulette ----------------------------------------------------------------------------------------

test("the catalog is read from the library and the roulette is S % count + 1, past the ledger's recent styles", () => {
  const catalog = loadCatalog();
  assert.deepEqual(Object.fromEntries(Object.entries(catalog).map(([k, v]) => [k, v.length])), { web: 20, ppt: 20, info: 20, app: 12, east: 12 });
  assert.equal(draw(catalog, "web", 37).number, 18);
  assert.equal(draw(catalog, "east", 37).number, 2);
  const skipped = draw(catalog, "east", 37, { avoid: new Set(["style:east/02", "style:east/03"]) });
  assert.deepEqual([skipped.number, skipped.skipped], [4, [2, 3]]);
  const pooled = draw(catalog, "web", 37, { pool: [4, 9, 15] });
  assert.equal(pooled.number, 9);
  assert.equal(draw(catalog, "web", 2).degrades !== undefined, true, "a style under 70% fidelity says what degrades");
  assert.equal(parseCatalog("## 网页风格库\n**A** `大胆·还原80%`\n- 样张:assets/x/01-a.jpg\n").web[0].specimen, "assets/x/01-a.html");
});

test("direction draw prints both draws for the second and honours the ledger", () => {
  reset();
  const out = execute(["direction", "draw", "--medium", "web", "--second", "37", "--json"]);
  assert.equal(out.exitCode, 0);
  assert.deepEqual(out.output.draws.map((item) => [item.section, item.number]), [["web", 18], ["east", 2]]);
  ledger.recordEntry({ project: "p-x", date: "2026-10-01", appearance: { lightness: "dark", hues: [], fonts: [], skeleton: "unmeasured", motion: "none" }, sources: ["style:east/02"] });
  const again = execute(["direction", "draw", "--medium", "web", "--second", "37", "--json"]);
  assert.deepEqual(again.output.draws[1].skipped, [2]);
  assert.equal(again.output.draws[1].number, 3);
  const bad = execute(["direction", "draw", "--medium", "poster", "--json"]);
  assert.equal(bad.exitCode, 1);
  assert.match(bad.output.error.message, /medium/);
  const outside = execute(["direction", "draw", "--medium", "web", "--second", "37", "--pool", "4,99", "--json"]);
  assert.equal(outside.exitCode, 1);
  assert.match(outside.output.error.message, /no style 99/);
  // The project's own earlier delivery is not a repeat: the draw skips nothing for it.
  const root = project();
  ledger.recordEntry({ project: ledger.projectId(root), date: "2026-10-02", appearance: { lightness: "dark", hues: [], fonts: [], skeleton: "unmeasured", motion: "none" }, sources: ["style:web/18"] });
  const own = execute(["direction", "draw", "--root", root, "--medium", "web", "--second", "37", "--json"]);
  assert.deepEqual([own.output.draws[0].number, own.output.draws[0].skipped], [18, []]);
  reset();
});

// --- direction check -------------------------------------------------------------------------------------

test("a complete set passes", () => {
  reset();
  const root = project();
  writeDirectionSet(root);
  const result = findings(root);
  assert.equal(result.status, "ready", result.blockers.join("\n"));
});

test("missing cards, boards and unseen reasons are findings with fixes", () => {
  reset();
  const root = project();
  const receipt = writeDirectionSet(root);
  receipt.cards = receipt.cards.slice(0, 4);
  saveReceipt(root, receipt);
  assert.ok(codes(root).includes("cards-count"));

  const second = writeDirectionSet(root);
  second.cards[2].source.board = { path: "refs/missing.png", sha256: "0".repeat(64) };
  second.cards[3].source.unseenReason = "";
  second.cards[0].borrowed = "";
  saveReceipt(root, second);
  const result = findings(root);
  for (const code of ["reference-board-missing", "reference-unseen-reason", "card-field-missing"]) assert.ok(result.findings.some((item) => item.code === code), code);
  assert.ok(result.findings.every((item) => item.fix && item.message));
  assert.match(result.blockers.join(" "), /Fix:/);

  const pretend = writeDirectionSet(root);
  delete pretend.cards[3].source.seen;
  saveReceipt(root, pretend);
  assert.ok(codes(root).includes("reference-seen-missing"), "a card says whether it saw the work");
});

test("roulette inconsistencies against the catalog are findings", () => {
  reset();
  const root = project();
  const mutate = (change) => {
    const receipt = writeDirectionSet(root);
    change(receipt);
    saveReceipt(root, receipt);
    return codes(root);
  };
  assert.ok(mutate((r) => { r.cards[4].source.number = 5; }).includes("roulette-number-mismatch"));
  assert.ok(mutate((r) => { r.cards[4].source.style = "Another style"; }).includes("roulette-style-mismatch"));
  assert.ok(mutate((r) => { r.cards[4].source.specimen = "assets/style-specimens/web/99-none.html"; }).includes("roulette-specimen-missing"));
  assert.ok(mutate((r) => { r.cards[5].source.second = 12; }).includes("roulette-second-differs"));
  assert.ok(mutate((r) => { r.cards[4].source.section = "ppt"; }).includes("roulette-sections"));
  assert.ok(mutate((r) => { r.cards[4].source.second = 75; }).includes("roulette-second-invalid"));
  assert.ok(mutate((r) => { r.context = "Apple"; }).includes("roulette-pool-missing"), "a named context needs compatible draws only");
  // A 65% style must say what degrades.
  const low = writeDirectionSet(root, { second: 2 });
  assert.equal(findings(root).status, "ready");
  delete low.cards[4].source.degrades;
  saveReceipt(root, low);
  assert.ok(codes(root).includes("roulette-degrades-missing"));
  // A skipped number must be the real sequence.
  const skipped = writeDirectionSet(root);
  skipped.cards[5].source.skipped = [9];
  saveReceipt(root, skipped);
  assert.ok(codes(root).includes("roulette-number-mismatch"));
  // A skip must be earned by a ledger collision: a valid-looking prefix with an empty ledger is not.
  const unearned = writeDirectionSet(root);
  Object.assign(unearned.cards[5].source, { skipped: [2], number: 3, style: "Style east3 Name", specimen: "assets/style-specimens/east/03-east-style-3.html" });
  saveReceipt(root, unearned);
  assert.ok(codes(root).includes("roulette-skip-unearned"));
  assert.ok(!codes(root).includes("roulette-number-mismatch"));
  // With a context and a pool the draw comes from the pool.
  const pooled = writeDirectionSet(root, { context: "Apple" });
  pooled.cards[4].source.pool = [4, 9, 15];
  pooled.cards[4].source.number = 9;
  pooled.cards[4].source.style = "Style web9 Name";
  pooled.cards[4].source.specimen = "assets/style-specimens/web/09-web-style-9.html";
  pooled.cards[5].source.pool = [2, 5];
  pooled.cards[5].source.number = 5;
  pooled.cards[5].source.style = "Style east5 Name";
  pooled.cards[5].source.specimen = "assets/style-specimens/east/05-east-style-5.html";
  saveReceipt(root, pooled);
  assert.equal(findings(root).status, "ready", findings(root).blockers.join("\n"));
});

test("thumbnail board and full versions are findings when missing or wrong", () => {
  reset();
  const root = project();
  const mutate = (change) => {
    const receipt = writeDirectionSet(root);
    change(receipt);
    saveReceipt(root, receipt);
    return codes(root);
  };
  assert.ok(mutate((r) => { delete r.thumbs; }).includes("thumbs-missing"));
  assert.ok(mutate((r) => { r.thumbs.png = { path: "direction-previews/none.png", sha256: "0".repeat(64) }; }).includes("thumbs-capture-missing"));
  assert.ok(mutate((r) => { r.thumbs.html = write(root, "direction-previews/thumbs.html", "<main><section data-card-id=\"designer-1\"></section></main>"); }).includes("thumbs-cells-missing"));
  assert.ok(mutate((r) => { r.directions = r.directions.slice(0, 2); }).includes("versions-count"));
  assert.ok(mutate((r) => { r.directions[0].html = { path: "direction-previews/dir-9.html", sha256: "0".repeat(64) }; }).includes("version-file-missing"));
  assert.ok(mutate((r) => { r.directions[1].card = "designer-1"; }).includes("version-card-duplicate"));
  assert.ok(mutate((r) => { r.directions[1].card = "nobody"; }).includes("version-card-unknown"));
  assert.ok(mutate((r) => { delete r.directions[0].reasons.ledger; }).includes("version-reasons-missing"));
  assert.ok(mutate((r) => { r.directions[0].overdone = true; r.directions[1].overdone = true; }).includes("versions-overdone"));
  const collided = mutate((r) => { r.directions[1].axes = { ...r.directions[0].axes, color: "x", material: "y" }; });
  assert.ok(collided.includes("versions-collide"), "two versions that differ by colour are one skeleton");
  const fix = findings(root).findings.find((item) => item.code === "versions-collide").fix;
  assert.match(fix, /alternate card|skeleton/);
});

test("the readability measurement applies to a captured version's elements", () => {
  reset();
  const root = project();
  writeDirectionSet(root);
  fs.rmSync(path.join(root, "direction-previews/dir-1/elements.json"));
  assert.ok(codes(root).includes("version-elements-missing"), "an uncaptured version cannot pass readability");
  fs.writeFileSync(path.join(root, "direction-previews/dir-1/elements.json"), "{not json");
  assert.ok(codes(root).includes("version-elements-missing"));
  fs.writeFileSync(path.join(root, "direction-previews/dir-1/elements.json"), JSON.stringify({ viewport: { width: 1440, height: 900 }, items: [{ kind: "text", id: "p:1", text: "Grey on grey", box: { x: 10, y: 10, w: 200, h: 20 }, fontSize: 14, fontWeight: 400, color: [150, 150, 150], background: [160, 160, 160] }] }));
  const result = findings(root);
  assert.ok(result.findings.some((item) => item.code === "text-contrast" && /notebook/.test(item.message)));
});

test("the ledger's last deliveries collide with a source or an appearance", () => {
  reset();
  const root = project();
  writeDirectionSet(root);
  ledger.recordEntry({ project: "p-old", date: "2026-10-10", appearance: { lightness: "mid", hues: ["teal"], fonts: ["other"], skeleton: "split/top-left/bold/sparse", motion: "none" }, sources: ["designer:experimental jetset", "style:web/18", "reference:https://example.com/work"] });
  const result = findings(root);
  for (const code of ["ledger-source-collision", "ledger-roulette-collision"]) assert.ok(result.findings.some((item) => item.code === code), code);
  assert.equal(result.findings.filter((item) => item.code === "ledger-source-collision").length, 3, "designer, reference and style versions all collide");
  reset();
  ledger.recordEntry({ project: "p-look", date: "2026-10-11", appearance: { lightness: "light", hues: [], fonts: ["fraunces"], skeleton: "unmeasured", motion: "none" }, sources: [] });
  const look = findings(root).findings.find((item) => item.code === "ledger-appearance-collision");
  assert.match(look.message, /notebook/);
  assert.match(look.fix, /skeleton|type/);
  // A recorded selection is not reopened by what other projects deliver later.
  assert.equal(findings(root, "selection").findings.some((item) => item.code.startsWith("ledger-")), false);
  reset();
});

// --- the owner's pick ------------------------------------------------------------------------------------

test("the ask shows three captures with their cards, the board and the alternates; the pick keeps words, mix and taste", () => {
  reset();
  const root = project();
  toDirections(root);
  assert.match(nextAction(root).instruction, /Stage 0[\s\S]*direction draw[\s\S]*thumbs\.html[\s\S]*dir-1\.html/);
  writeDirectionSet(root);
  const ask = nextAction(root);
  assert.equal(ask.type, "ask");
  assert.deepEqual(ask.directions.map((item) => item.id), ["notebook", "desk", "atlas"]);
  assert.match(ask.directions[0].card, /designer: Experimental Jetset; borrows/);
  assert.match(ask.directions[2].card, /roulette: .*web\/18, drawn at second 37/);
  assert.deepEqual(ask.alternates.map((item) => item.id), ["designer-2", "reference-2", "roulette-2"]);
  assert.match(ask.question, /other three are alternates/);
  assert.equal(ask.show.length, 4);
  assert.match(ask.show[0], /thumbs/);
  assert.match(ask.record, /--mix <part>=<id>/);
  assert.match(ask.record, /--taste/);

  assert.throws(() => decide(root, { by: "owner", stage: "concept", choice: "notebook", mix: ["layout=notebook"], answer: "Notebook only please" }), /--mix combines/);
  assert.throws(() => decide(root, { by: "owner", stage: "concept", choice: "notebook,desk", mix: ["layout=atlas"], answer: "Mix them up please" }), /only from the versions/);
  assert.throws(() => decide(root, { by: "agent", stage: "concept", choice: "notebook", taste: ["too plain"], answer: "Notebook is good" }), /owner/);
  decide(root, { by: "owner", stage: "concept", choice: "notebook,desk", mix: ["layout=notebook", "colour=desk"], taste: ["too plain, make it more like a magazine"], scope: "project", answer: "Notebook's layout with the dark colour of desk" });
  const decision = readReceipt(root).decision;
  assert.deepEqual(decision, { status: "selected", selectedDirectionId: "notebook", selectedDirectionIds: ["notebook", "desk"], mix: { layout: "notebook", colour: "desk" }, rationale: "Notebook's layout with the dark colour of desk", by: "owner" });
  const state = readState(root);
  assert.equal(state.decisions.concept, "notebook,desk");
  const taste = state.rules.find((rule) => rule.from === "direction taste");
  assert.equal(taste.text, "too plain, make it more like a magazine");
  assert.equal(taste.scope, "project");
  assert.equal(nextAction(root).stage, "work");
});

test("a waiver still works for a narrow repair", () => {
  const root = project();
  toDirections(root);
  fs.writeFileSync(path.join(root, "direction-preview.json"), JSON.stringify({ schema: "design-pipeline.direction-preview.v1", changeId: path.basename(root), applicability: { status: "waived", reason: "established-surface" }, comparison: null, directions: [], decision: { status: "waived", selectedDirectionId: null, rationale: "The surface already has its direction." } }));
  const ask = nextAction(root);
  assert.equal(ask.type, "ask");
  assert.match(ask.question, /build without choosing/);
  decide(root, { by: "owner", stage: "concept", choice: "waived", answer: "Keep the existing look" });
  assert.equal(nextAction(root).stage, "work");
});

// --- the appearance ledger -------------------------------------------------------------------------------

const PAGE = '<!doctype html><title>Console</title><style>body{background:#101418;color:#eee;font-family:"Space Grotesk",sans-serif}h1{font-size:96px;color:#e4572e;transition:opacity .2s}</style><h1>Desk</h1>';

test("delivery writes the measured appearance and sources; the next direction stage reads it", () => {
  reset();
  const root = project();
  toDirections(root);
  writeDirectionSet(root);
  decide(root, { by: "owner", stage: "concept", choice: "notebook,atlas", mix: ["layout=notebook", "colour=atlas"], answer: "Notebook's layout with atlas colour" });
  fs.writeFileSync(path.join(root, "index.html"), PAGE);
  decide(root, { by: "owner", stage: "deliver", answer: "index.html, checked in a browser" });
  const entries = ledger.readLedger();
  assert.equal(entries.length, 1);
  const [entry] = entries;
  assert.match(entry.project, /^p-[0-9a-f]{16}$/);
  assert.match(entry.date, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(entry.appearance.lightness, "dark");
  assert.deepEqual(entry.appearance.hues, ["red"]);
  assert.deepEqual(entry.appearance.fonts, ["space grotesk"]);
  assert.equal(entry.appearance.motion, "subtle");
  assert.deepEqual(entry.sources.sort(), ["designer:experimental jetset", "style:web/18"]);
  assert.doesNotMatch(JSON.stringify(entry), /Console|Desk|traders/, "no project text is stored");
  assert.equal(readState(root).decisions.ledger.status, "recorded");

  // Accepting the delivered interface replaces the same project's entry rather than adding another.
  decide(root, { by: "owner", stage: "review", verdict: "accept", answer: "Looks right" });
  assert.equal(ledger.readLedger().length, 1);
  assert.equal(nextAction(root).type, "done", "the project's own entry never reopens its direction");

  // The next project's direction stage sees it.
  const other = project();
  toDirections(other);
  writeDirectionSet(other);
  const result = checkDirectionPreview(other, { stage: "preview" });
  assert.ok(result.findings.some((item) => item.code === "ledger-source-collision"));
  assert.ok(result.findings.some((item) => item.code === "ledger-roulette-collision"));
  reset();
});

test("a project with nothing to measure records nothing and says why; the ledger never blocks delivery", () => {
  reset();
  const root = project("quick");
  decide(root, { by: "owner", stage: "deliver", answer: "the console, checked by hand" });
  assert.equal(readState(root).decisions.ledger.status, "skipped");
  assert.match(readState(root).decisions.ledger.reason, /index\.html/);
  assert.equal(ledger.readLedger().length, 0);
  fs.writeFileSync(env.ledger, "not json");
  assert.deepEqual(ledger.readLedger(), []);
  reset();
});

test("the ledger summary is deterministic and reads captured elements when there are some", () => {
  const elements = {
    viewport: { width: 1440, height: 900 },
    background: [16, 20, 24],
    items: [
      { kind: "text", id: "h1", text: "Headline", box: { x: 80, y: 80, w: 700, h: 120 }, fontSize: 96, fontWeight: 700, fontFamily: '"Space Grotesk", sans-serif', color: [228, 87, 46], background: [16, 20, 24] },
      { kind: "text", id: "p1", text: "Body copy for the page", box: { x: 80, y: 260, w: 500, h: 24 }, fontSize: 16, fontWeight: 400, fontFamily: "Inter, sans-serif", color: [238, 238, 238], background: [16, 20, 24] },
      { kind: "block", id: "b1", box: { x: 0, y: 0, w: 1440, h: 900 }, fill: [16, 20, 24] },
    ],
  };
  const first = ledger.summarizeAppearance({ elements, source: "a{}" });
  assert.deepEqual(first, ledger.summarizeAppearance({ elements, source: "a{}" }));
  assert.equal(first.measured, "browser");
  assert.equal(first.lightness, "dark");
  assert.deepEqual(first.hues, ["red"]);
  assert.deepEqual(first.fonts, ["space grotesk", "inter"], "the display font comes first");
  assert.equal(first.skeleton, "left/top-left/even/sparse");
  assert.equal(ledger.summarizeAppearance({ elements: null, source: "a{}" }).measured, "source");
});

// A real browser measures a page; skipped, with the resolver's reason, when none resolves.
function browserSkip() {
  try {
    resolvePuppeteer(path.resolve(__dirname, ".."), process.env.DESIGN_PIPELINE_PUPPETEER_MODULE);
    resolveBrowser();
    return false;
  } catch (error) {
    if (error.code !== "TOOL_MISSING") throw error;
    return `no browser (${error.message})`;
  }
}

test("a page measured in a real browser has a layout skeleton", { skip: browserSkip(), timeout: 120000 }, (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ledger-page-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  fs.writeFileSync(path.join(dir, "index.html"), PAGE);
  const measured = ledger.measurePage(path.join(dir, "index.html"));
  if (measured.measured !== "browser") return t.skip("no usable browser here; measured from source");
  assert.equal(measured.measured, "browser");
  assert.notEqual(measured.skeleton, "unmeasured");
});

test("package resources list the new modules", () => {
  const resources = JSON.parse(fs.readFileSync(path.join(__dirname, "../skill/references/package-resources.json"), "utf8"));
  for (const file of ["scripts/directions-core.cjs", "scripts/appearance-ledger-core.cjs", "scripts/workflows/directions.cjs"]) assert.ok(resources.required.includes(file), file);
  assert.equal(hash("x").length, 64);
});

test("a plain two-to-four candidate receipt is rejected everywhere; a waiver passes", () => {
  reset();
  const root = project();
  const plain = writeDirectionSet(root);
  for (const key of ["medium", "context", "cards", "thumbs"]) delete plain[key];
  // With a change root the gaps are findings, each with its fix.
  saveReceipt(root, plain);
  const result = findings(root);
  assert.equal(result.status, "blocked");
  for (const code of ["medium-missing", "cards-count", "thumbs-missing"]) assert.ok(result.findings.some((item) => item.code === code), code);
  // A receipt alone has no files to check: missing parts and a wrong version count are contract errors.
  assert.throws(() => checkDirectionPreview(null, { receipt: plain }), /carries medium/);
  const full = writeDirectionSet(project());
  assert.throws(() => checkDirectionPreview(null, { receipt: { ...full, cards: undefined } }), /carries cards/);
  assert.throws(() => checkDirectionPreview(null, { receipt: { ...full, thumbs: undefined } }), /carries thumbs/);
  assert.throws(() => checkDirectionPreview(null, { receipt: { ...full, directions: full.directions.slice(0, 2) } }), /exactly three/);
  assert.equal(checkDirectionPreview(null, { receipt: full }).status, "ready");
  // The ui flow shows the same findings as a run action.
  toDirections(root);
  const action = nextAction(root);
  assert.equal(action.type, "run");
  assert.ok(action.findings.some((item) => item.code === "cards-count"));
  // A clear direction is waived.
  saveReceipt(root, { schema: plain.schema, changeId: plain.changeId, applicability: { status: "waived", reason: "single-user-direction" }, comparison: null, directions: [], decision: { status: "waived", selectedDirectionId: null, rationale: "The owner named the direction." } });
  const waived = findings(root);
  assert.equal(waived.status, "ready");
  assert.equal(waived.applicable, false);
});

test("a card id with regex characters is a finding, not a crash", () => {
  reset();
  const root = project();
  const receipt = writeDirectionSet(root);
  receipt.cards[0].id = "designer(1";
  receipt.directions[0].card = "designer(1";
  saveReceipt(root, receipt);
  const result = findings(root);
  assert.ok(result.findings.some((item) => item.code === "card-id-invalid"));
  assert.ok(result.findings.some((item) => item.code === "thumbs-cells-missing"));
});

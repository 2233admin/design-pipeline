"use strict";

// The web concepts stage and its prototype variant switcher: concept production and the agent's
// pre-screen, the switchable variants page the owner picks from (markers, switcher, picks and
// rejections), the tiers and modes without variants, the build that refuses a shipped switcher in any
// form, and the switcher itself in a real browser (skipped, with the reason, when no browser resolves).
// Assertions pin behaviour (stages, action shapes, records, rules, what renders), not the wording of a
// question.

const assert = require("node:assert/strict");
const test = require("node:test");
const crypto = require("node:crypto");
const fs = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { decide, initState, nextAction, readState } = require("../skill/scripts/workflow-core.cjs");
const { resolveChrome, resolvePuppeteer } = require("../skill/scripts/film-capture-core.cjs");
const flow = require("./helpers/web-flow.cjs");

const repoRoot = path.resolve(__dirname, "..");
const cli = path.join(repoRoot, "skill/scripts/designer-pipeline.cjs");
const SOURCE = fs.readFileSync(path.join(repoRoot, "skill/tools/variant-switcher/variant-switcher.js"), "utf8");
const sha256 = bytes => crypto.createHash("sha256").update(bytes).digest("hex");

// --- concept production and screening ---------------------------------------------------------------

function conceptsAction(tier, ready) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "concept-screening-"));
  try {
    initState(root, { deliverable: "web", tier });
    flow.confirmPlayback(root);
    decide(root, { stage: "reference", answer: "none" });
    if (ready) {
      fs.writeFileSync(path.join(root, "concepts.md"), "# Three concept cards\n");
      fs.writeFileSync(path.join(root, "concepts.html"), flow.variantsPage());
    }
    const child = spawnSync(process.execPath, [cli, "next", "--project-root", root, "--json"], { cwd: root, encoding: "utf8", windowsHide: true });
    assert.equal(child.status, 0, child.stdout + child.stderr);
    return JSON.parse(child.stdout);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

function requiresScreening(action) {
  const guidance = `${action.instruction || ""} ${action.why || ""}`;
  assert.match(guidance, /same[- ]size|equal[- ]size/i, "compare like-size first screens");
  assert.match(guidance, /contact sheet/i, "screen the three cards together");
  assert.match(guidance, /pre-screen/i, "agent screens before involving the user");
  assert.match(guidance, /same skeleton/i, "reject structural duplicates");
  assert.match(guidance, /common template/i, "reject generic template choices");
  assert.match(guidance, /hierarchy.*collaps|collaps.*hierarchy/i, "reject unreadable hierarchy");
  assert.match(guidance, /redo|rework/i, "repair failed cards rather than show them");
  assert.match(guidance, /before (asking|showing|presenting)|without showing/i, "screening precedes the user choice");
  assert.match(guidance, /not (?:owner )?Visual Acceptance/i, "screening cannot grant acceptance");
}

for (const tier of ["standard", "full"]) {
  test(`web ${tier} concept production requires structural divergence and screening`, () => {
    const action = conceptsAction(tier, false);
    assert.equal(action.stage, "concepts");
    assert.equal(action.type, "run");
    for (const relation of [/skeleton/i, /focal element/i, /type position/i, /image(?:'s)? role/i]) {
      assert.match(action.instruction, relation, "first-screen structure must genuinely diverge");
    }
    assert.match(action.instruction, /one[- ]line skeleton|skeleton in one line/i);
    requiresScreening(action);
  });

  test(`web ${tier} concept choice still requires screening when concepts.md exists`, () => {
    const action = conceptsAction(tier, true);
    assert.equal(action.stage, "concepts");
    assert.equal(action.type, "ask");
    requiresScreening(action);
  });
}

// --- the variants page and the owner's pick ----------------------------------------------------------

function project(t, { tier = "standard", mode = "brief" } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "web-concepts-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true, maxRetries: 3 }));
  initState(root, { deliverable: "web", tier, mode });
  return root;
}

function write(root, rel, text) {
  fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
  fs.writeFileSync(path.join(root, rel), text);
}

// Every file under the project with its digest; a refused record changes none of them.
function snapshot(root, dir = root, files = {}) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) snapshot(root, file, files);
    else files[path.relative(root, file).split(path.sep).join("/")] = sha256(fs.readFileSync(file));
  }
  return files;
}

function refuses(root, options, code) {
  const before = snapshot(root);
  assert.throws(() => decide(root, options), { code }, JSON.stringify(options));
  assert.deepEqual(snapshot(root), before, `refused ${JSON.stringify(options)} changed the project`);
}

const rulesFrom = root => readState(root).rules.map(rule => rule.from);

test("the variants page needs three marked first screens and the switcher before the owner picks", t => {
  const root = project(t);
  flow.confirmPlayback(root);
  refuses(root, { stage: "concept", choice: "A" }, "WORKFLOW_NOT_READY");
  decide(root, { stage: "reference", answer: "none" });
  const run = nextAction(root);
  assert.equal(run.stage, "concepts");
  assert.equal(run.type, "run");
  assert.equal(run.findings, undefined);
  assert.match(run.instruction, /concepts\.md/);
  assert.match(run.instruction, /concepts\.html/);
  write(root, "concepts.md", "# Concepts\n");
  assert.equal(nextAction(root).type, "run", "concepts.md alone is not the variants page");
  refuses(root, { stage: "concept", verdict: "reject", answer: "They look the same" }, "WORKFLOW_NOT_READY");

  const codes = () => {
    const action = nextAction(root);
    assert.equal(action.type, "run");
    return action.findings.map(item => item.code);
  };
  write(root, "concepts.html", "<!doctype html><p>Three ideas</p>");
  assert.deepEqual(codes(), ["variants-incomplete", "variant-switcher-missing"]);
  refuses(root, { stage: "concept", choice: "A" }, "WORKFLOW_NOT_READY");
  write(root, "concepts.html", flow.variantsPage(["A", "B"]));
  assert.deepEqual(codes(), ["variants-incomplete"]);
  write(root, "concepts.html", flow.variantsPage().replace(/<script>[\s\S]*<\/script>/, ""));
  assert.deepEqual(codes(), ["variant-switcher-missing"]);
  refuses(root, { stage: "concept", choice: "A" }, "WORKFLOW_NOT_READY");

  flow.writeVariants(root);
  const ask = nextAction(root);
  assert.equal(ask.stage, "concepts");
  assert.equal(ask.type, "ask");
  assert.equal(ask.first, undefined);
  assert.deepEqual(ask.show, ["concepts.html", "concepts.md"].map(rel => path.join(path.resolve(root), rel)), "the owner is shown the variants page and the cards");
  assert.match(ask.record, /--stage concept --choice /);
  assert.match(ask.correction, /--stage concept --verdict reject --answer /);

  for (const choice of ["2", "D", "A,A"]) refuses(root, { stage: "concept", choice }, "CONTRACT_INVALID");
  refuses(root, { stage: "concept", choice: "B,C" }, "CONTRACT_INVALID");
  decide(root, { stage: "concept", choice: "b" });
  assert.equal(readState(root).decisions.concept, "B");
  assert.equal(nextAction(root).stage, "components");
  decide(root, { stage: "concept", choice: "B,C", answer: "B's header with C's proof grid" });
  const { concept, conceptNotes, variants } = readState(root).decisions;
  assert.equal(concept, "B,C");
  assert.equal(conceptNotes, "B's header with C's proof grid");
  assert.deepEqual(variants.map(item => [item.verdict, item.choice]), [["pick", "B"], ["pick", "B,C"]]);
});

test("a variants rejection becomes a rule and asks for a redo until concepts.html changes", t => {
  const root = project(t);
  flow.toComponents(root);
  const page = fs.readFileSync(path.join(root, "concepts.html"));
  decide(root, { stage: "concept", verdict: "reject", answer: "All three look like templates" });
  const redo = nextAction(root);
  assert.equal(redo.stage, "concepts");
  assert.equal(redo.type, "ask");
  assert.ok(redo.first.includes("All three look like templates"), redo.first);
  assert.deepEqual(fs.readFileSync(path.join(root, "concepts.html")), page);
  assert.deepEqual(readState(root).rules, [{ text: "All three look like templates", from: "variants 1", scope: "project" }]);
  fs.appendFileSync(path.join(root, "concepts.html"), "<!-- redone without the template look -->\n");
  const ask = nextAction(root);
  assert.equal(ask.type, "ask");
  assert.equal(ask.first, undefined);
  decide(root, { stage: "concept", verdict: "reject", answer: "C is still a stock grid" });
  assert.deepEqual(rulesFrom(root), ["variants 1", "variants 2"]);
  flow.pickVariant(root, "C");
  assert.equal(nextAction(root).stage, "components");
  assert.deepEqual(readState(root).decisions.variants.map(item => item.verdict), ["pick", "reject", "reject", "pick"]);
});

test("quick and replicate projects have no variants to pick or reject", t => {
  for (const [tier, mode] of [["quick", "brief"], ["quick", "replicate"], ["standard", "replicate"], ["full", "replicate"]]) {
    const root = project(t, { tier, mode });
    flow.toComponents(root);
    flow.writeVariants(root);
    refuses(root, { stage: "concept", choice: "A" }, "CONTRACT_INVALID");
    refuses(root, { stage: "concept", verdict: "reject", answer: "None of these" }, "CONTRACT_INVALID");
    assert.equal(nextAction(root).stage, "components", `${tier}/${mode}`);
  }
});

// --- the switcher never ships ------------------------------------------------------------------------

// Components written from scratch: the recorded decision and the manifest the build stage checks.
function fromScratch(root, answer = "Write the components from scratch") {
  decide(root, { stage: "components", choice: "scratch", answer });
  write(root, "component-manifest.json", JSON.stringify({ fromScratch: true, entries: [] }));
}

// index.html with one marked section per id, then anything extra (a revision, a shipped switcher).
function buildPage(root, ids, extra = "") {
  write(root, "index.html", `<!doctype html>\n<html lang="en"><body>\n${ids.map(id => `<section data-section="${id}"><h2>${id}</h2></section>\n`).join("")}${extra}</body></html>\n`);
}

// A project at build whose approved description names `sections`, with components from scratch.
function approved(t, sections = ["first-screen", "proof"], options = {}) {
  const root = project(t, options);
  flow.toComponents(root);
  fromScratch(root);
  flow.toBuild(root, sections);
  return root;
}

const INLINE_SWITCHER = `<script>\n${SOURCE}\n</script>\n`;

// Build stays unfinished with exactly the shipped-switcher finding; returns that finding.
function shipped(root, context) {
  const action = nextAction(root);
  assert.equal(action.stage, "build", context);
  assert.equal(action.type, "run", context);
  assert.deepEqual(action.findings?.map(item => item.code), ["variant-switcher-shipped"], context);
  return action.findings[0];
}

test("the prototype switcher never ships: build stays unfinished while index.html carries it", t => {
  const root = approved(t, ["first-screen"]);
  buildPage(root, ["first-screen"], INLINE_SWITCHER);
  shipped(root, "standard page with the inlined switcher");
  refuses(root, { stage: "section", choice: "first-screen", verdict: "accept" }, "WORKFLOW_NOT_READY");
  buildPage(root, ["first-screen"]);
  assert.equal(nextAction(root).type, "ask");
  assert.equal(flow.acceptSections(root).stage, "probe");
  buildPage(root, ["first-screen"], INLINE_SWITCHER);
  shipped(root, "an accepted page that gains the switcher reopens build");

  const quick = project(t, { tier: "quick" });
  flow.toComponents(quick);
  fromScratch(quick);
  buildPage(quick, [], INLINE_SWITCHER);
  shipped(quick, "quick page with the inlined switcher");
  buildPage(quick, []);
  assert.equal(nextAction(quick).stage, "probe");
});

test("build refuses the switcher in any form it can ship in, and a comment naming it is not the switcher", t => {
  const quick = project(t, { tier: "quick" });
  flow.toComponents(quick);
  fromScratch(quick);
  write(quick, "switcher.js", SOURCE);
  const panels = '<section data-variant="A"><h1>One</h1></section>\n<section data-variant="B"><h1>Two</h1></section>\n';
  // The inline script and the remote URL carry the text variant-switcher in index.html itself; the
  // panels are flagged by their data-variant attributes; the renamed local copy only by its contents.
  const forms = {
    "the inlined switcher": INLINE_SWITCHER,
    "two variant panels and a renamed copy of the switcher script": `${panels}<script src="switcher.js"></script>\n`,
    "a renamed copy of the switcher script without panels": '<script src="switcher.js"></script>\n',
    "the switcher loaded from a remote URL": '<script src="https://cdn.example.test/variant-switcher.js"></script>\n',
  };
  let quickFix;
  for (const [form, extra] of Object.entries(forms)) {
    buildPage(quick, [], extra);
    quickFix = shipped(quick, form).fix;
  }
  // The comment names the switcher, so this page finishes only because comments are not markup.
  buildPage(quick, [], "<!-- built without data-variant-switcher or its panels -->\n<p>Clean</p>\n");
  assert.equal(nextAction(quick).stage, "probe", "a page whose only mention of the switcher is a comment finishes build");

  // The fix points at the variants page only where one exists.
  const standard = approved(t, ["first-screen"]);
  buildPage(standard, ["first-screen"], INLINE_SWITCHER);
  assert.match(shipped(standard, "standard page").fix, /concepts\.html/, "standard keeps the switcher in its variants page");
  assert.doesNotMatch(quickFix, /concepts\.html/, "quick has no variants page to point at");
  buildPage(standard, ["first-screen"], "<!-- data-variant-switcher stays in concepts.html -->\n");
  const review = nextAction(standard);
  assert.equal(review.stage, "build");
  assert.equal(review.type, "ask", "a clean page moves on to section review");
  assert.equal(review.section, "first-screen");
});

// --- the switcher in a real browser ------------------------------------------------------------------

const HOST = "[data-variant-switcher]";
const STYLE = "[data-variant-switcher-style]";
const OPTIONS = (tools) => ({ skip: tools.skip, timeout: 60_000 });

// Only a missing tool skips, with the resolver's reason; anything else thrown here is a bug.
function browserTools() {
  try {
    resolvePuppeteer(repoRoot, process.env.DESIGN_PIPELINE_PUPPETEER_MODULE);
    const puppeteerModule = process.env.DESIGN_PIPELINE_PUPPETEER_MODULE ? path.resolve(process.env.DESIGN_PIPELINE_PUPPETEER_MODULE) : require.resolve("puppeteer-core", { paths: [repoRoot] });
    return { chrome: resolveChrome(), puppeteerModule, skip: false };
  } catch (error) {
    if (error.code !== "TOOL_MISSING") throw error;
    return { skip: `no browser for the variant switcher (${error.message})` };
  }
}
const tools = browserTools();

const page = (head, sections) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Variants</title>${head}</head><body>
${sections}
<label>Note <input id="field" type="text"></label>
<script>${SOURCE}</script>
</body></html>`;

const NAMES = { A: "Split hero", B: "Stacked headline", C: "Proof grid" };
const panelsWith = (attrs = () => "") => Object.entries(NAMES)
  .map(([key, name]) => `<section data-variant="${key}" data-variant-name="${name}"${attrs(key)}><h1>${name} ${key}</h1></section>`).join("\n");

// "/" is the plain variants page; the others set display on the variants from author CSS, the way a
// real concepts page does, which the hidden attribute alone loses to.
const PAGES = {
  "/": page("", panelsWith()),
  "/element-rule": page("<style>body { margin: 0 } section { display: grid; min-height: 100vh; place-items: center }</style>", panelsWith()),
  "/class-rule": page("<style>body { margin: 0 } .hero { display: flex; min-height: 100vh; align-items: center }</style>", panelsWith(() => ' class="hero"')),
  "/id-rule": page("<style>body { margin: 0 } #variant-A, #variant-B, #variant-C { display: block; min-height: 100vh }</style>", panelsWith(key => ` id="variant-${key}"`)),
  "/inline-style": page("<style>body { margin: 0 }</style>", panelsWith(() => ' style="display:grid; min-height:100vh"')),
};

let server, origin, browser;

test.before(async () => {
  server = http.createServer((req, res) => {
    const body = req.method === "GET" ? PAGES[new URL(req.url, "http://localhost").pathname] : undefined;
    if (body) {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(body);
    } else {
      res.writeHead(404, { "content-type": "text/plain" });
      res.end("not found");
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
  if (!tools.skip) browser = await require(tools.puppeteerModule).launch({ executablePath: tools.chrome, headless: true });
});

test.after(async () => {
  if (browser) await browser.close();
  if (server) await new Promise((resolve) => server.close(resolve));
});

// A fresh page at `pathname` + `query`; page errors are asserted absent when the test ends.
async function open(t, query = "", pathname = "/") {
  const tab = await browser.newPage();
  const errors = [];
  tab.on("pageerror", (error) => errors.push(error.message));
  t.after(async () => {
    await tab.close();
    assert.deepEqual(errors, [], "the page threw");
  });
  await tab.goto(`${origin}${pathname}${query}`, { waitUntil: "load" });
  return tab;
}

const state = (tab) => tab.evaluate((host) => ({
  visible: [...document.querySelectorAll("[data-variant]")].filter((el) => !el.hidden).map((el) => el.getAttribute("data-variant")),
  label: document.querySelector(host).shadowRoot.querySelector("output").textContent,
  search: location.search,
  hosts: document.querySelectorAll(host).length,
}), HOST);

const LABELS = { A: "A (Split hero)", B: "B (Stacked headline)", C: "C (Proof grid)" };
async function assertShows(tab, key, context = "") {
  const now = await state(tab);
  assert.deepEqual(now.visible, [key], `visible ${context}`);
  assert.equal(now.label, LABELS[key], `label ${context}`);
  assert.equal(now.search, `?variant=${key}`, `search ${context}`);
}

// What actually renders, not just which panel carries `hidden`: the variants with a box, and the
// variant under the centre of the viewport.
const rendered = (tab) => tab.evaluate(() => ({
  boxed: [...document.querySelectorAll("[data-variant]")]
    .filter((el) => getComputedStyle(el).display !== "none" && el.getBoundingClientRect().height > 0)
    .map((el) => el.getAttribute("data-variant")),
  centre: document.elementFromPoint(innerWidth / 2, innerHeight / 2)?.closest("[data-variant]")?.getAttribute("data-variant") ?? null,
}));

const button = (tab, step) => tab.$(`${HOST} >>> button[data-step="${step}"]`);

test("with no query only the first variant shows and the URL records it", OPTIONS(tools), async (t) => {
  const tab = await open(t);
  await assertShows(tab, "A");
  assert.deepEqual(await tab.evaluate(() => [...document.querySelectorAll("[data-variant]")].map((el) => el.hidden)), [false, true, true]);
});

test("?variant= picks a variant case-insensitively and an unknown key falls back to the first", OPTIONS(tools), async (t) => {
  await assertShows(await open(t, "?variant=c"), "C", "for ?variant=c");
  await assertShows(await open(t, "?variant=z"), "A", "for ?variant=z");
});

test("the arrow buttons cycle with wrap-around without navigating", OPTIONS(tools), async (t) => {
  const tab = await open(t);
  await tab.evaluate(() => { window.__marker = 1; });
  const next = await button(tab, 1);
  for (const key of ["B", "C", "A"]) {
    await next.click();
    await assertShows(tab, key, `after next → ${key}`);
  }
  await (await button(tab, -1)).click();
  await assertShows(tab, "C", "after previous from A");
  assert.equal(await tab.evaluate(() => window.__marker), 1, "the page navigated");
});

test("ArrowRight and ArrowLeft cycle with wrap-around", OPTIONS(tools), async (t) => {
  const tab = await open(t);
  assert.equal(await tab.evaluate(() => document.activeElement === document.body), true);
  for (const key of ["B", "C", "A"]) {
    await tab.keyboard.press("ArrowRight");
    await assertShows(tab, key, `after ArrowRight → ${key}`);
  }
  await tab.keyboard.press("ArrowLeft");
  await assertShows(tab, "C", "after ArrowLeft from A");
});

test("the keys are ignored while a form field has focus", OPTIONS(tools), async (t) => {
  const tab = await open(t);
  await tab.focus("#field");
  const before = await state(tab);
  await tab.keyboard.press("ArrowRight");
  await tab.keyboard.press("ArrowLeft");
  assert.deepEqual(await state(tab), before);
  await assertShows(tab, "A", "while the field is focused");
  await tab.evaluate(() => document.activeElement.blur());
  await tab.keyboard.press("ArrowRight");
  await assertShows(tab, "B", "after blurring the field");
});

test("one toolbar host and one hiding style even when the script runs twice, with accessible names", OPTIONS(tools), async (t) => {
  const tab = await open(t);
  const counts = () => tab.evaluate((host, style) => [document.querySelectorAll(host).length, document.querySelectorAll(style).length], HOST, STYLE);
  assert.deepEqual(await counts(), [1, 1]);
  await tab.addScriptTag({ content: SOURCE });
  assert.deepEqual(await counts(), [1, 1], "a second run added another host or hiding style");
  const toolbarLabel = await tab.$eval(`${HOST} >>> [role="toolbar"]`, (el) => el.getAttribute("aria-label") || "");
  assert.notEqual(toolbarLabel.trim(), "", "the toolbar has no aria-label");
  for (const [step, name] of [[-1, /previous/i], [1, /next/i]]) {
    const handle = await button(tab, step);
    assert.notEqual((await handle.evaluate((el) => el.getAttribute("aria-label") || "")).trim(), "", `button ${step} has no aria-label`);
    const node = await tab.accessibility.snapshot({ root: handle });
    assert.equal(node?.role, "button", `button ${step} role`);
    assert.match(node?.name || "", name, `button ${step} accessible name`);
  }
});

test("only the chosen variant renders even when the page's own CSS sets display on the variants", OPTIONS(tools), async (t) => {
  for (const pathname of Object.keys(PAGES).filter((key) => key !== "/")) {
    const tab = await open(t, "?variant=B", pathname);
    assert.deepEqual(await rendered(tab), { boxed: ["B"], centre: "B" }, `${pathname} at ?variant=B`);
    await tab.keyboard.press("ArrowRight");
    await assertShows(tab, "C", `${pathname} after ArrowRight`);
    assert.deepEqual(await rendered(tab), { boxed: ["C"], centre: "C" }, `${pathname} after ArrowRight`);
  }
});

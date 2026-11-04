"use strict";

// The look signature (OpenSpec change direction-look-signature): the appearance ledger's record gains a
// measured accent hex, display and body fonts, light or dark theme and hero layout class, and the
// direction stage shows the last few signatures as advisory "you used these recently" information.
// Synthetic elements pin the rules; real pages measured in headless Chromium prove them (skipped, with
// the reason, when no browser resolves).

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const { decide, initState, nextAction } = require("../skill/scripts/workflow-core.cjs");
const { checkDirectionPreview } = require("../skill/scripts/direction-preview-core.cjs");
const ledger = require("../skill/scripts/appearance-ledger-core.cjs");
const { resolvePuppeteer } = require("../skill/scripts/film-capture-core.cjs");
const { resolveBrowser } = require("../skill/scripts/browser-locate.cjs");
const { isolate, writeDirectionSet } = require("./helpers/direction-fixture.cjs");

const env = isolate();
test.after(env.restore);
const roots = [];
test.after(() => roots.forEach((root) => fs.rmSync(root, { recursive: true, force: true })));
const reset = () => fs.rmSync(env.ledger, { force: true });

const W = 1440;
const H = 900;
const text = (id, box, fontSize, fontFamily, color, extra = {}) => ({ kind: "text", id, text: id, box, fontSize, fontWeight: 400, fontFamily, color, background: extra.background || null, ...extra });
const block = (id, box, fill) => ({ kind: "block", id, box, ...(fill ? { fill } : {}) });
const page = (items, { background = [255, 255, 255], media = [] } = {}) => ({ viewport: { width: W, height: H }, background, items, media });
const look = (elements) => ledger.summarizeAppearance({ elements, source: "" }).signature;

test("the signature reads accent, fonts, theme and hero from captured elements", () => {
  const split = look(page([
    block("bg", { x: 0, y: 0, w: W, h: H }, [16, 20, 24]),
    text("h1", { x: 80, y: 200, w: 560, h: 220 }, 88, '"Fraunces", serif', [240, 240, 240], { align: "left" }),
    text("p", { x: 80, y: 440, w: 560, h: 60 }, 18, "Inter, system-ui, sans-serif", [200, 200, 200], { align: "left" }),
    text("cta", { x: 80, y: 530, w: 180, h: 48 }, 16, "Inter, sans-serif", [255, 255, 255], { align: "center", fill: [228, 87, 46] }),
    text("link", { x: 300, y: 540, w: 120, h: 24 }, 16, "Inter, sans-serif", [228, 87, 46], { align: "left" }),
  ], { background: [16, 20, 24], media: [{ tag: "img", box: { x: 760, y: 140, w: 600, h: 520 } }] }));
  assert.deepEqual(split, { accent: "#e4572e", displayFont: "fraunces", bodyFont: "inter", theme: "dark", hero: "split" });

  // A full-bleed photograph under the headline, light page.
  assert.equal(look(page([text("h1", { x: 0, y: 300, w: W, h: 120 }, 96, "Syne", [255, 255, 255], { align: "center" })], { media: [{ tag: "div", box: { x: 0, y: 0, w: W, h: H } }] })).hero, "full-bleed-image");
  // Centred text only; the heading's own alignment decides, not its full-width box.
  assert.equal(look(page([text("h1", { x: 0, y: 200, w: W, h: 120 }, 96, "Syne", [0, 0, 0], { align: "center" })])).hero, "centred");
  assert.equal(look(page([text("h1", { x: 0, y: 200, w: W, h: 120 }, 96, "Syne", [0, 0, 0], { align: "start" })])).hero, "left");
  assert.equal(look(page([text("h1", { x: 0, y: 200, w: W, h: 120 }, 96, "Syne", [0, 0, 0], { align: "right" })])).hero, "right");
  // A filled panel across the centre line from the heading is a split too (a product mock in divs).
  assert.equal(look(page([text("h1", { x: 80, y: 200, w: 560, h: 120 }, 80, "Syne", [0, 0, 0], { align: "left" }), block("mock", { x: 780, y: 160, w: 560, h: 480 }, [230, 236, 250])])).hero, "split");
  // No text of 24px or more in the first viewport: no hero. A large heading below the fold is not one.
  assert.equal(look(page([text("p", { x: 80, y: 100, w: 400, h: 20 }, 16, "Inter", [0, 0, 0]), text("h2", { x: 80, y: 1400, w: 600, h: 80 }, 64, "Syne", [0, 0, 0])])).hero, "none");
  // An image under a centred heading, centred itself, is not a split.
  assert.equal(look(page([text("h1", { x: 0, y: 100, w: W, h: 100 }, 80, "Syne", [0, 0, 0], { align: "center" })], { media: [{ tag: "img", box: { x: 420, y: 260, w: 600, h: 400 } }] })).hero, "centred");
});

test("a large chromatic field is the theme, not the accent; a small repeated colour is the accent", () => {
  const sig = look(page([
    block("field", { x: 0, y: 0, w: W, h: H }, [18, 128, 120]),
    text("h1", { x: 80, y: 200, w: 700, h: 120 }, 80, "Syne", [255, 255, 255], { align: "left" }),
    text("b1", { x: 80, y: 400, w: 160, h: 48 }, 16, "Inter", [20, 20, 20], { fill: [255, 92, 160] }),
    text("b2", { x: 260, y: 400, w: 160, h: 48 }, 16, "Inter", [20, 20, 20], { fill: [255, 92, 160] }),
  ], { background: [18, 128, 120] }));
  assert.equal(sig.accent, "#ff5ca0");
  assert.equal(sig.theme, "dark", "white text reads better than black on #127f78");
  // Neutral pages have no accent rather than a grey one.
  assert.equal(look(page([text("h1", { x: 80, y: 80, w: 400, h: 100 }, 80, "Syne", [17, 17, 17]), block("rule", { x: 80, y: 200, w: 400, h: 2 }, [200, 200, 200])])).accent, null);
});

test("without a browser the signature comes from the CSS tokens and says the hero is unmeasured", () => {
  const sig = ledger.summarizeAppearance({ elements: null, source: ':root{--color-accent:#2f6bff}body{background:#0b0d10;font-family:"Space Grotesk",sans-serif}h1{font-family:"Fraunces",serif}' }).signature;
  assert.equal(sig.accent, "#2f6bff");
  assert.equal(sig.theme, "dark");
  assert.equal(sig.hero, "unmeasured");
  assert.ok(["space grotesk", "fraunces"].includes(sig.displayFont));
});

test("recent looks: newest first, at most five, other projects only, older entries without a signature left out", () => {
  const sig = (accent) => ({ accent, displayFont: "syne", bodyFont: "inter", theme: "light", hero: "centred" });
  const entry = (project, date, signature) => ({ project, date, appearance: { lightness: "light", hues: [], fonts: [], skeleton: "unmeasured", motion: "none", ...(signature ? { signature } : {}) }, sources: [] });
  const entries = [
    entry("p-1", "2026-10-01", sig("#111111")),
    entry("p-2", "2026-10-02", null),
    entry("p-3", "2026-10-03", sig("#e4572e")),
    entry("p-4", "2026-10-04", { accent: "red", hero: "centred", theme: "light" }),
    entry("p-5", "2026-10-05", sig("#2f6bff")),
    entry("p-6", "2026-10-06", sig("#00aa55")),
    entry("p-7", "2026-10-07", sig("#aa00aa")),
    entry("p-own", "2026-10-08", sig("#ffcc00")),
    entry("p-8", "2026-10-09", sig("#123456")),
  ];
  const looks = ledger.recentLooks(entries, { exclude: "p-own" });
  assert.equal(ledger.LOOKS, 5);
  assert.deepEqual(looks.map((item) => item.date), ["2026-10-09", "2026-10-07", "2026-10-06", "2026-10-05", "2026-10-03"]);
  assert.equal(looks[0].says, "light theme, centred hero, display syne, body inter, accent #123456");
  assert.deepEqual(ledger.recentLooks([], {}), []);

  // Overlap: a near accent reads as the same colour; theme and hero repeat by name.
  const shared = ledger.lookOverlap({ accent: "#e85a30", displayFont: "fraunces", bodyFont: "inter", theme: "dark", hero: "split" }, { accent: "#e4572e", displayFont: "fraunces", bodyFont: "inter", theme: "dark", hero: "split" });
  assert.deepEqual(shared, ["accent #e4572e", "display fraunces", "body inter", "dark theme", "split hero"]);
  assert.deepEqual(ledger.lookOverlap({ accent: "#2f6bff", displayFont: "syne", bodyFont: "syne", theme: "light", hero: "none" }, { accent: "#e4572e", displayFont: "fraunces", bodyFont: "inter", theme: "dark", hero: "none" }), []);
});

// --- the direction stage ---------------------------------------------------------------------------------

const CARD = ["Need: a console for desk traders.", "Audience: traders on large desktop screens.", "Scene: open all day beside a market feed.", "Tone: calm and exact (my guess).", "Unstated: dense but never noisy (my guess).", "I'll make several real directions for you to see."].join("\n");
function project() {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), "look-"));
  roots.push(parent);
  const root = path.join(parent, "console");
  fs.mkdirSync(root);
  initState(root, { deliverable: "ui", tier: "standard" });
  decide(root, { by: "owner", stage: "intake", answer: "A console for desk traders, desktop only" });
  decide(root, { by: "owner", stage: "intake", verdict: "accept", answer: CARD });
  return root;
}

test("the direction stage lists recent looks and what each version repeats, and never blocks on them", () => {
  reset();
  const root = project();
  assert.equal(nextAction(root).recentLooks, undefined, "an empty ledger adds nothing");
  // A recent delivery whose palette differs (no ledger collision) but whose display font and theme match dir-1.
  ledger.recordEntry({ project: "p-other", date: "2026-10-20", appearance: { lightness: "dark", hues: ["teal"], fonts: ["fraunces"], skeleton: "unmeasured", motion: "none", signature: { accent: "#127f78", displayFont: "fraunces", bodyFont: null, theme: "light", hero: "left" } }, sources: [] });
  ledger.recordEntry({ project: ledger.projectId(root), date: "2026-10-21", appearance: { lightness: "light", hues: [], fonts: [], skeleton: "unmeasured", motion: "none", signature: { accent: null, displayFont: "inter", bodyFont: null, theme: "light", hero: "none" } }, sources: [] });
  const run = nextAction(root);
  assert.equal(run.type, "run");
  assert.deepEqual(run.recentLooks.looks.map((item) => item.date), ["2026-10-20"], "this project's own entry is left out");
  assert.match(run.recentLooks.note, /not a rule/);

  writeDirectionSet(root);
  const before = checkDirectionPreview(root, { stage: "preview", recentEntries: [] });
  const withLooks = checkDirectionPreview(root, { stage: "preview", recentEntries: ledger.recentEntries() });
  assert.equal(withLooks.status, "ready");
  assert.deepEqual(withLooks.findings.map((item) => item.code), before.findings.map((item) => item.code), "a shared look adds no finding");

  const ask = nextAction(root);
  assert.equal(ask.type, "ask");
  assert.equal(ask.recentLooks.looks[0].says, "light theme, left-aligned hero, display fraunces, accent #127f78");
  assert.match(ask.instruction, /you used these recently/);
  const [notebook, desk] = ask.directions;
  assert.equal(notebook.look.displayFont, "fraunces");
  assert.deepEqual(notebook.repeatsRecent, [{ date: "2026-10-20", shared: ["display fraunces", "light theme", "left-aligned hero"] }]);
  assert.equal(desk.look.theme, "dark");
  assert.deepEqual(desk.repeatsRecent, [{ date: "2026-10-20", shared: ["left-aligned hero"] }], "only what is really shared is named");

  // The pick goes through regardless of what it repeats.
  decide(root, { by: "owner", stage: "concept", choice: "notebook", answer: "Notebook, the same serif is what I want" });
  assert.equal(nextAction(root).stage, "work");
  reset();
});

test("a foreign or broken ledger shows no recent looks and the stage proceeds", () => {
  reset();
  const root = project();
  fs.writeFileSync(env.ledger, "{not json");
  assert.equal(nextAction(root).recentLooks, undefined);
  writeDirectionSet(root);
  assert.equal(nextAction(root).type, "ask");
  reset();
});

// --- real pages in headless Chromium ---------------------------------------------------------------------

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

// One pixel PNG, so an <img> loads offline.
const PIXEL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
const PAGES = {
  // Dark, two-column grid: heading left, image right; orange buttons and links; tokens through var().
  split: `<!doctype html><style>:root{--accent:#e4572e;--display:"Fraunces",serif}body{margin:0;background:#101418;color:#eee;font-family:Inter,system-ui,sans-serif}
    .hero{display:grid;grid-template-columns:1fr 1fr;gap:40px;padding:120px 80px;min-height:700px;align-items:center}
    h1{font-family:var(--display);font-size:88px;margin:0}a{color:var(--accent)}.btn{display:inline-block;background:var(--accent);color:#fff;padding:14px 22px;border-radius:6px}
    img{width:100%;height:520px;object-fit:cover}</style>
    <section class="hero"><div><h1>Read the tape</h1><p>Every order book on one quiet screen, built for a long day at the desk.</p><a class="btn">Start trading</a> <a href="#">See pricing</a> <a class="btn">Book a demo</a></div><img src="${PIXEL}" alt=""></section>
    <section><p>More body copy about the product sits under the fold and reads in the body face.</p></section>`,
  // Light page, centred headline over a full-bleed background image (a gradient-free url()).
  fullBleed: `<!doctype html><style>body{margin:0;background:#fafaf7;color:#111;font-family:"IBM Plex Sans",sans-serif}
    .hero{height:100vh;background:url(${PIXEL}) center/cover;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}
    h1{font-family:"Syne",sans-serif;font-size:110px;margin:0}.btn{background:#2f6bff;color:#fff;padding:12px 20px}</style>
    <div class="hero"><h1>Open water</h1><p>Body copy under the headline, long enough to be the body face.</p><span class="btn">Plan a trip</span></div>`,
  // Text only, left aligned, warm paper; the accent lives in links alone.
  left: `<!doctype html><style>body{margin:0;background:#f4efe4;color:#222;font-family:Georgia,serif;padding:140px 96px}
    h1{font-family:"Playfair Display",serif;font-size:72px;max-width:900px}a{color:#7a3cff}</style>
    <h1>Notes from the archive</h1><p>A long paragraph of body text with <a href="#">one link</a>, <a href="#">another link</a> and <a href="#">a third</a> to read.</p>`,
  // Adversarial: the whole page is a strong teal field (large chromatic area) and the pink CTA is small.
  field: `<!doctype html><style>body{margin:0;background:#127f78;color:#fff;font-family:"Work Sans",sans-serif}
    main{padding:160px 80px;text-align:center}h1{font-size:96px;margin:0;font-family:"Anton",sans-serif}.btn{display:inline-block;background:#ff5ca0;color:#111;padding:14px 24px;margin:8px}</style>
    <main><h1>Loud field</h1><p>Body copy on the teal field, set in the body family for reading.</p><span class="btn">Join</span><span class="btn">Listen</span></main>`,
  // Adversarial: an inline SVG illustration on the right, no <img>, flex layout.
  svgSplit: `<!doctype html><style>body{margin:0;background:#ffffff;color:#111;font-family:Inter,sans-serif}
    .hero{display:flex;align-items:center;justify-content:space-between;padding:100px 80px}h1{font-size:76px;font-family:"Space Grotesk",sans-serif;max-width:600px}</style>
    <div class="hero"><div><h1>Plot every route</h1><p>Body copy on the left half beside the drawing for the body face.</p></div>
    <svg width="560" height="460" viewBox="0 0 560 460"><circle cx="280" cy="230" r="200" fill="#ffd166"/></svg></div>`,
};

test("real pages measured in a browser give the expected signature", { skip: browserSkip(), timeout: 600000 }, (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "look-pages-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const measure = (name) => {
    const file = path.join(dir, name, "index.html");
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, PAGES[name]);
    return ledger.measurePage(file);
  };
  const split = measure("split");
  if (split.measured !== "browser") return t.skip("no usable browser here; measured from source");
  assert.deepEqual(split.signature, { accent: "#e4572e", displayFont: "fraunces", bodyFont: "inter", theme: "dark", hero: "split" });
  assert.deepEqual(measure("fullBleed").signature, { accent: "#2f6bff", displayFont: "syne", bodyFont: "ibm plex sans", theme: "light", hero: "full-bleed-image" });
  assert.deepEqual(measure("left").signature, { accent: "#7a3cff", displayFont: "playfair display", bodyFont: "georgia", theme: "light", hero: "left" });
  assert.deepEqual(measure("field").signature, { accent: "#ff5ca0", displayFont: "anton", bodyFont: "work sans", theme: "dark", hero: "centred" });
  const svg = measure("svgSplit").signature;
  assert.equal(svg.hero, "split");
  assert.equal(svg.accent, null, "an illustration's fill is not read as an accent");
  assert.equal(svg.theme, "light");
});

test("delivery records the signature in the ledger entry", { skip: browserSkip(), timeout: 300000 }, (t) => {
  reset();
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), "look-deliver-"));
  t.after(() => fs.rmSync(parent, { recursive: true, force: true }));
  fs.writeFileSync(path.join(parent, "index.html"), PAGES.split);
  const result = ledger.recordDelivery(parent, ["style:web/18"]);
  assert.equal(result.status, "recorded");
  const [entry] = ledger.readLedger();
  assert.ok(entry.appearance.signature, "the entry carries a signature");
  if (entry.appearance.measured === "browser") assert.equal(entry.appearance.signature.hero, "split");
  assert.doesNotMatch(JSON.stringify(entry), /Read the tape|order book/, "no project text is stored");
  reset();
});

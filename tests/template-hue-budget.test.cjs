"use strict";

// Rule `hue-budget` of the browser half of `template check`: an opt-in saturated-hue budget by
// declared colour role. The pixel measure runs on synthetic shots; the page tests need puppeteer-core
// and a headless Chrome (no particular fonts) and skip without them.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { PAGE_RULES, checkPage, hueBudget, launch } = require("../skill/tools/template-bank/page-check.cjs");

const repoRoot = path.resolve(__dirname, "..");
const read = (relative) => fs.readFileSync(path.join(repoRoot, relative), "utf8");

const BRAND = [255, 212, 0];
const COUNTER = [31, 59, 214];
const ALERT = [229, 56, 59];
const GREEN = [47, 178, 74];

// A 200 x 100 shot on a light ground with solid blocks: [x, y, w, h, rgb].
function shotWith(blocks, width = 200, height = 100) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i += 1) data.set([242, 242, 239, 255], i * 4);
  for (const [x0, y0, w, h, rgb] of blocks) {
    for (let y = y0; y < y0 + h; y += 1) for (let x = x0; x < x0 + w; x += 1) data.set([...rgb, 255], (y * width + x) * 4);
  }
  return { width, height, data };
}
const near = (actual, expected, tolerance = 0.005) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} is not within ${tolerance} of ${expected}`);

test("hueBudget gives each saturated pixel to the nearest declared role and counts the rest as undeclared hues", () => {
  const roles = { brand: BRAND, counter: COUNTER, alert: ALERT, timed: null };
  const shot = shotWith([
    [0, 0, 100, 50, BRAND], // 25% of the canvas
    [100, 0, 10, 20, COUNTER], // 1%
    [110, 0, 10, 10, ALERT], // 0.5%
    [120, 0, 20, 20, GREEN], // 2%, declared nowhere
    [150, 60, 40, 20, [120, 120, 120]], // grey is never a hue
  ]);
  const result = hueBudget(shot, roles, PAGE_RULES);
  near(result.share.brand, 0.25);
  near(result.share.counter, 0.01);
  near(result.share.status, 0.005);
  assert.equal(result.others.length, 1);
  near(result.others[0].share, 0.02);
  assert.match(result.others[0].hue, /^1[0-9]0-1[0-9]0$/);
  assert.deepEqual(result.declared.map((entry) => entry.role), ["brand", "counter", "alert"]);
  assert.deepEqual(result.unmeasured, ["timed is not a colour"]);
});

test("hueBudget does not treat a hue near a declared role as undeclared, and reports a grey role as unmeasured", () => {
  const warmer = [255, 190, 20]; // the brand's neighbour, a few degrees away
  const result = hueBudget(shotWith([[0, 0, 100, 50, warmer]]), { brand: BRAND, counter: [128, 128, 128] }, PAGE_RULES);
  near(result.share.brand, 0.25);
  assert.deepEqual(result.others, []);
  assert.equal(result.unmeasured.length, 1);
  assert.match(result.unmeasured[0], /counter #808080 is not saturated/);
});

test("the rule limits in PAGE_RULES are the ones the guides state", () => {
  assert.equal(PAGE_RULES.hueCounterMax, 0.03);
  assert.equal(PAGE_RULES.hueStatusMax, 0.01);
  assert.equal(PAGE_RULES.hueOtherMax, 0.001);
  const guide = read("skill/references/industrial-document-sheets.md");
  assert.match(guide, /\| Counter \|[^\n]*\| 3% \|/);
  assert.match(guide, /\| Status \(alert, timed\) \|[^\n]*\| 1% together \|/);
  assert.match(guide, /\| Anything else \|[^\n]*\| 0\.1% per hue \|/);
  const bank = read("skill/references/template-bank.md");
  for (const text of ["`hue-budget`", "data-hue-brand", "data-hue-counter", "data-hue-alert", "data-hue-timed"]) assert.ok(bank.includes(text), text);
  assert.ok(guide.includes("data-hue-alert") && guide.includes("data-hue-timed"));
});

const BROWSER = (() => {
  try {
    const puppeteerModule = process.env.DESIGN_PIPELINE_PUPPETEER_MODULE || path.dirname(require.resolve("puppeteer-core/package.json"));
    const { resolveBrowser } = require("../skill/scripts/browser-locate.cjs");
    return { puppeteerModule, chrome: resolveBrowser() };
  } catch (error) {
    return { skip: `browser unavailable: ${error.message}` };
  }
})();

function box(left, top, width, height, color, attributes = "") {
  return `<div ${attributes} style="position:absolute;left:${left}px;top:${top}px;width:${width}px;height:${height}px;background:${color}"></div>`;
}

test("the browser half applies the hue budget only to a page that declares colour roles", { skip: BROWSER.skip }, async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hue-budget-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const declaration = 'data-hue-brand="#ffd400" data-hue-counter="rgb(31 59 214)" data-hue-alert="#e5383b" data-hue-timed="#f28c28"';
  const page = (name, root, body) => {
    const file = path.join(dir, name);
    fs.writeFileSync(file, `<!doctype html><html ${root}><head><meta charset="utf-8"><style>html,body{margin:0;background:#f2f2ef}p{position:absolute;margin:0;left:12px;top:260px;font:700 16px sans-serif;color:#191919}</style></head><body>${body}<p>SHEET 01</p></body></html>`);
    return file;
  };
  const within = [box(0, 0, 100, 100, "#ffd400"), box(300, 10, 20, 20, "#1f3bd6"), box(330, 10, 20, 10, "#e5383b")].join("");
  const over = [box(0, 0, 100, 100, "#ffd400"), box(300, 10, 80, 60, "#1f3bd6"), box(300, 100, 60, 30, "#e5383b"), box(200, 150, 40, 40, "#2fb24a")].join("");
  const decor = [box(0, 0, 100, 100, "#ffd400"), box(300, 10, 80, 60, "#1f3bd6", "data-deco"), box(300, 100, 60, 30, "#e5383b", "data-deco"), box(200, 150, 40, 40, "#2fb24a", "data-deco")].join("");
  const browser = await launch({ chrome: BROWSER.chrome, puppeteerModule: BROWSER.puppeteerModule });
  try {
    const run = (file) => checkPage({ file, browser, size: [400, 300] });
    const passed = await run(page("within.html", declaration, within));
    assert.deepEqual(passed.findings.filter((f) => f.rule === "hue-budget"), [], JSON.stringify(passed.findings));
    near(passed.hue.share.brand, 100 * 100 / (400 * 300), 0.01);
    assert.ok(passed.notes.some((note) => note.startsWith("hue-budget: brand")));

    const failed = await run(page("over.html", declaration, over));
    const hue = failed.findings.filter((f) => f.rule === "hue-budget");
    assert.deepEqual(hue.map((f) => f.slot.replace(/^hue \d+-\d+$/, "hue")).sort(), ["counter", "hue", "status"], JSON.stringify(hue));
    near(hue.find((f) => f.slot === "counter").measured.share, 80 * 60 / (400 * 300), 0.01);
    near(hue.find((f) => f.slot.startsWith("hue ")).measured.share, 40 * 40 / (400 * 300), 0.01);
    assert.ok(hue.every((f) => f.measuredBy === "browser" && f.fix.length > 20));
    assert.equal(failed.status, "failed");

    // decoration marked data-deco is left out of the measure (a colour control strip, a ghost numeral)
    const exempt = await run(page("decor.html", declaration, decor));
    assert.deepEqual(exempt.findings.filter((f) => f.rule === "hue-budget"), [], JSON.stringify(exempt.findings));

    // no declaration, no rule: an existing page keeps its verdict
    const silent = await run(page("silent.html", "", over));
    assert.equal(silent.hue, undefined);
    assert.deepEqual(silent.findings.filter((f) => f.rule === "hue-budget"), []);
    assert.ok(!silent.notes.some((note) => note.startsWith("hue-budget")));

    // a declared value that is not a colour is said, not guessed
    const broken = await run(page("broken.html", 'data-hue-brand="#ffd400" data-hue-counter="not-a-colour"', within));
    assert.ok(broken.notes.some((note) => note === "hue-budget: counter is not a colour"), JSON.stringify(broken.notes));

    // a role declared in a non-RGB colour space is converted to the sRGB the screenshot holds, not read as RGB numbers
    const wide = 'data-hue-brand="oklch(0.87 0.18 95)" data-hue-counter="color(display-p3 0.1 0.2 0.8)"';
    const modern = [box(0, 0, 100, 100, "oklch(0.87 0.18 95)"), box(300, 10, 20, 20, "color(display-p3 0.1 0.2 0.8)")].join("");
    const converted = await run(page("wide.html", wide, modern));
    assert.deepEqual(converted.findings.filter((f) => f.rule === "hue-budget"), [], JSON.stringify(converted.findings));
    assert.deepEqual(converted.hue.declared.map((entry) => entry.role), ["brand", "counter"], JSON.stringify(converted.hue));
    assert.deepEqual(converted.notes.filter((note) => /^hue-budget: .* is not /.test(note)), [], JSON.stringify(converted.notes));
    // nothing above the undeclared-hue limit: the 16 px label's antialiased edge pixels may add a few stray ones below it
    assert.ok(converted.hue.others.every((entry) => entry.share < PAGE_RULES.hueOtherMax), JSON.stringify(converted.hue.others));
    near(converted.hue.share.brand, 100 * 100 / (400 * 300), 0.01);
    near(converted.hue.share.counter, 20 * 20 / (400 * 300), 0.005);
  } finally {
    await browser.close();
  }
});

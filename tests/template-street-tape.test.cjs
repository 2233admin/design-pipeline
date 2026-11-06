"use strict";

// The street-tape style pack: a Japanese street-fashion city game's official-site grammar, measured
// on a private reference board and proven on an original site (回放街区). Five templates: the top
// bar, the section title block, the vertical pager, the cut container with its carousel and the
// sticker CTA. Each renders from parameters with original copy and passes both halves of the check.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { spawnSync } = require("node:child_process");
const { PNG } = require("pngjs");
const bank = require("../skill/tools/template-bank/bank.cjs");
const { CUT } = require("../skill/tools/template-bank/layouts-street.cjs");

const CLI = path.join(__dirname, "..", "skill", "scripts", "designer-pipeline.cjs");
const CATALOG = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "skill", "references", "fonts", "catalog.json"), "utf8"));
const IDS = ["banner.tape-sticker-cta", "card.tape-section-title", "kv.tape-cut-carousel", "kv.tape-hero", "ui.tape-pager", "ui.tape-topbar"];

const messages = (report) => JSON.stringify(report.findings.map((f) => `${f.rule}:${f.slot}: ${f.message}`));
function cli(root, ...args) {
  const child = spawnSync(process.execPath, [CLI, ...args, "--root", root, "--json"], { encoding: "utf8", windowsHide: true, timeout: 600000, maxBuffer: 64 << 20 });
  let payload = null;
  try { payload = JSON.parse(child.stdout); } catch { payload = null; }
  return { status: child.status, payload, stderr: child.stderr };
}
const BROWSER = (() => {
  try {
    const puppeteerModule = process.env.DESIGN_PIPELINE_PUPPETEER_MODULE || path.dirname(require.resolve("puppeteer-core/package.json"));
    const { resolveBrowser } = require("../skill/scripts/browser-locate.cjs");
    return { puppeteerModule, chrome: resolveBrowser() };
  } catch (error) {
    return { skip: `browser unavailable: ${error.message}` };
  }
})();
const CI_SKIP = process.env.GITHUB_ACTIONS === "true" && "text-occluded differs on the CI runner (#305)";

test("street-tape names its case and lineage, borrows grammar not assets, and resolves its fonts through the catalog", () => {
  const style = bank.loadStyle("street-tape");
  assert.match(style.provenance.borrow, /^Borrow grammar, never assets\./);
  assert.match(style.provenance.lineage, /private and is not shipped/);
  assert.ok(style.layout.grammar.length >= 5 && style.motion.grammar.length);
  assert.ok(style.checks.guidance.some((line) => /^64 px distinctiveness \(guidance/.test(line)));
  assert.equal(style.checks.browserOnRender, true);
  for (const recipe of style.materials.recipes) assert.match(recipe, /materials (fetch|cut|process|generate)/);
  const families = new Set(CATALOG.families.map((f) => f.family));
  for (const [role, spec] of Object.entries(style.fonts.roles)) {
    assert.ok(spec.stack.length >= 2 && spec.stack.some((family) => families.has(family)), `${role}: ${spec.stack.join(" > ")}`);
  }
  assert.deepEqual(bank.templateIds().filter((id) => bank.loadManifest(id).style === "street-tape"), IDS);
  const listed = cli(fs.mkdtempSync(path.join(os.tmpdir(), "street-tape-")), "template", "list", "--style", "street-tape");
  assert.equal(listed.status, 0, JSON.stringify(listed.payload));
  assert.deepEqual(listed.payload.styles[0].templates, IDS);
});

test("street-tape templates pass the static check at every size and for 50 seeds, and in their variants", () => {
  for (const id of IDS) {
    for (const size of bank.loadManifest(id).sizes) {
      const report = bank.check(bank.render(id, { size }).svg);
      assert.equal(report.status, "passed", `${id} ${size}: ${messages(report)}`);
    }
    for (let seed = 1; seed <= 50; seed += 1) {
      const report = bank.check(bank.render(id, { seed }).svg);
      assert.equal(report.status, "passed", `${id} seed ${seed}: ${messages(report)}`);
    }
  }
  const variants = [
    ["card.tape-section-title", { side: "right" }, { title_cjk: "影像资料", title_latin: "MEDIA", number: "03" }],
    ["kv.tape-cut-carousel", { side: "right", control: "dots", items: 5, active: 3 }, { title_cjk: "设定档案", title_latin: "ARCHIVE", number: "05" }],
    ["ui.tape-topbar", { current: 4, icons: false }, {}],
    ["ui.tape-pager", {}, { current: "06", next: "01" }],
  ];
  for (const [id, params, set] of variants) {
    const report = bank.check(bank.render(id, { params, set }).svg);
    assert.equal(report.status, "passed", `${id} ${JSON.stringify(params)}: ${messages(report)}`);
  }
});

test("one 49-degree cut", () => {
  assert.equal(CUT, 49);
  const svg = bank.render("kv.tape-cut-carousel").svg;
  const acid = /<path d="([^"]+)" fill="#D4FF00" data-role="acid"\/>/.exec(svg);
  assert.ok(acid, "the acid slab is a path");
  const pts = [...acid[1].matchAll(/(-?[\d.]+) (-?[\d.]+)/g)].map((m) => [Number(m[1]), Number(m[2])]);
  let best = null;
  for (let i = 1; i < pts.length; i += 1) {
    const [dx, dy] = [pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]];
    if (Math.abs(dx) > 1 && Math.abs(dy) > 1 && (!best || Math.hypot(dx, dy) > best.len)) best = { len: Math.hypot(dx, dy), angle: Math.atan2(Math.abs(dy), Math.abs(dx)) * 180 / Math.PI };
  }
  assert.ok(best && Math.abs(best.angle - 49) < 0.5, JSON.stringify(best));
});

test("structural slots reject copy they cannot draw, with a fix", () => {
  const bad = (id, set, pattern) => assert.throws(() => bank.render(id, { set }), (error) => error.code === "OPTION_VALUE_INVALID" && pattern.test(error.message) && /Fix:/.test(error.message));
  bad("card.tape-section-title", { number: "四" }, /digits only/);
  bad("kv.tape-cut-carousel", { number: "004" }, /digits only/);
  bad("ui.tape-pager", { current: "A" }, /digits only/);
  bad("kv.tape-cut-carousel", { date: "11月5日" }, /digits and \/ \. - only/);
  const long = bank.check(bank.render("kv.tape-cut-carousel", { set: { headline: "这是一条长得放不下的新闻标题，它会超出预算并且溢出它的框" } }).svg);
  assert.ok(long.findings.some((f) => f.rule === "text-length" && f.slot === "headline"), messages(long));
});

test("every street-tape default render passes the browser check too", { skip: BROWSER.skip || CI_SKIP, timeout: 1200000 }, (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "street-tape-browser-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  for (const id of IDS) {
    const result = cli(root, "template", "render", id, "-o", `${id}.svg`, "--chrome", BROWSER.chrome, "--puppeteer-module", BROWSER.puppeteerModule);
    assert.equal(result.status, 0, `${id}: ${JSON.stringify(result.payload?.check?.findings || result.payload?.error || result.stderr)}`);
    assert.equal(result.payload.check.status, "passed", id);
  }
});

// Ink rows of a slot in the rendered PNG: dark-ink pixels inside the slot's data-box (canvas = PNG pixels).
function inkRows(svg, png, slot) {
  const tag = new RegExp(`<text data-slot="${slot}"[^>]*>`).exec(svg)[0];
  const [bx, by, bw, bh] = /data-box="([^"]+)"/.exec(tag)[1].split(",").map(Number);
  const rows = [];
  for (let y = Math.max(0, Math.floor(by)); y < Math.min(png.height, Math.ceil(by + bh)); y += 1) {
    let hit = false;
    for (let x = Math.max(0, Math.floor(bx)); x < Math.min(png.width, Math.ceil(bx + bw)) && !hit; x += 1) {
      const i = (y * png.width + x) * 4;
      hit = png.data[i] < 70 && png.data[i + 1] < 70 && png.data[i + 2] < 70 && png.data[i + 3] > 200;
    }
    if (hit) rows.push(y);
  }
  assert.ok(rows.length, `${slot}: no ink in its box`);
  return rows[rows.length - 1] - rows[0] + 1;
}
function renderMeasured(root, id, name, ...args) {
  const result = cli(root, "template", "render", id, "-o", `${name}.svg`, "--png", `${name}.png`, "--chrome", BROWSER.chrome, "--puppeteer-module", BROWSER.puppeteerModule, ...args);
  assert.equal(result.status, 0, `${id}: ${JSON.stringify(result.payload?.check?.findings || result.payload?.error || result.stderr)}`);
  assert.equal(result.payload.check.status, "passed", id);
  const svg = fs.readFileSync(path.join(root, `${name}.svg`), "utf8");
  const png = PNG.sync.read(fs.readFileSync(path.join(root, `${name}.png`)));
  return { result, svg, ratio: inkRows(svg, png, "number") / inkRows(svg, png, "title_cjk") };
}

test("the section number's measured ink is 2.6-2.9 times the CJK title's, with or without Anton", { skip: BROWSER.skip, timeout: 600000 }, (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "street-tape-ratio-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  // No --font-dir: Anton is not shipped, the num role resolves to its Oswald fallback and the stack says so.
  const bare = renderMeasured(root, "card.tape-section-title", "bare");
  assert.deepEqual(bare.result.payload.fontSwitches.filter((f) => f.role === "num").map((f) => `${f.from}>${f.to}`), ["Anton>Oswald"]);
  assert.match(bare.svg, /data-slot="number"[^>]*font-family="'Oswald'/);
  assert.ok(bare.ratio > 2.6 && bare.ratio < 2.9, `Oswald number : CJK ink ${bare.ratio.toFixed(2)}`);
  const right = renderMeasured(root, "card.tape-section-title", "right", "--param", "side=right", "--set", "number=03");
  assert.ok(right.ratio > 2.6 && right.ratio < 2.9, `right-aligned number : CJK ink ${right.ratio.toFixed(2)}`);
  // With Anton in --font-dir the number is Anton, sized from Anton's digit height, and the ratio holds too.
  const fonts = path.join(root, "fonts");
  fs.mkdirSync(fonts);
  fs.copyFileSync(path.join(__dirname, "..", "skill", "tools", "art-motion", "fonts", "Anton-400.woff"), path.join(fonts, "Anton-Regular.woff"));
  const anton = renderMeasured(root, "card.tape-section-title", "anton", "--font-dir", fonts);
  assert.equal((anton.result.payload.fontSwitches || []).filter((f) => f.role === "num").length, 0);
  assert.match(anton.svg, /data-slot="number"[^>]*font-family="'Anton'/);
  assert.ok(anton.ratio > 2.6 && anton.ratio < 2.9, `Anton number : CJK ink ${anton.ratio.toFixed(2)}`);
});

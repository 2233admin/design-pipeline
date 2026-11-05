"use strict";

// The game style packs distilled from the owner-approved cases: citypop-sleeve (gacha event),
// xerox-flyer (esports broadcast), cassandre-litho (the Steam capsule set), woodblock-pixel (pixel
// RPG UI), acid-print-hud (tactical HUD) and cyanotype-specimen (trading cards). Each pack carries
// its lineage and "borrow grammar, never assets"; each template renders from parameters with
// original placeholder copy and passes the static and the browser half of template check.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { spawnSync } = require("node:child_process");
const bank = require("../skill/tools/template-bank/bank.cjs");
const measure = require("../skill/tools/template-bank/measure.cjs");
const { decodePng } = require("../skill/scripts/png-core.cjs");

const CLI = path.join(__dirname, "..", "skill", "scripts", "designer-pipeline.cjs");
const CATALOG = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "skill", "references", "fonts", "catalog.json"), "utf8"));

const PACKS = {
  "citypop-sleeve": ["cover.event-kv", "ui.gacha-recruit", "ui.tenpull-wall"],
  "xerox-flyer": ["broadcast.bp-board", "broadcast.scorebug", "poster.tour-flyer"],
  "cassandre-litho": ["steam.event-cover", "steam.event-header", "steam.header-capsule", "steam.library-capsule", "steam.main-capsule", "steam.small-capsule", "steam.vertical-capsule"],
  "woodblock-pixel": ["pixel.inventory", "pixel.title-screen"],
  "acid-print-hud": ["hud.combat"],
  "cyanotype-specimen": ["card.tcg-frame", "ui.pack-open"],
};
const NEW = Object.values(PACKS).flat();

function tempRoot(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "game-packs-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}

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
// text-occluded is measured differently on the CI runner (#305): the browser sweep runs locally.
const CI_SKIP = process.env.GITHUB_ACTIONS === "true" && "text-occluded differs on the CI runner (#305)";

const messages = (report) => JSON.stringify(report.findings.map((f) => `${f.rule}:${f.slot}: ${f.message}`));

// ---- packs ------------------------------------------------------------------------------------

test("each game pack names its lineage, borrows grammar not assets, and resolves its fonts through the catalog", () => {
  const families = new Set(CATALOG.families.map((f) => f.family));
  for (const [id, templates] of Object.entries(PACKS)) {
    const style = bank.loadStyle(id);
    assert.ok(style.provenance.lineage && style.provenance.case, `${id} names its case and lineage`);
    assert.match(style.provenance.borrow, /^Borrow grammar, never assets\./, `${id} states the rule`);
    assert.ok(style.layout.grammar.length >= 5 && style.motion?.grammar?.length, `${id} has layout and motion grammar`);
    assert.ok(style.materials.procedural.length && Array.isArray(style.materials.recipes), `${id} lists procedural materials and recipes`);
    for (const recipe of style.materials.recipes) assert.match(recipe, /materials (fetch|cut|process|generate)|render --png/, `${id} recipe names a tool: ${recipe}`);
    assert.ok(style.checks.guidance.some((line) => /^64 px distinctiveness \(guidance/.test(line)), `${id} carries the 64 px note as guidance`);
    assert.equal(style.checks.browserOnRender, true, `${id} runs the browser check on render`);
    for (const [role, spec] of Object.entries(style.fonts.roles)) {
      assert.ok(spec.stack.some((family) => families.has(family)), `${id} font role ${role} falls back to a catalog family: ${spec.stack.join(" > ")}`);
      assert.ok(spec.stack.length >= 2, `${id} font role ${role} has a fallback`);
    }
    assert.match(style.fonts.resolve, /fonts query/);
    assert.ok(style.examples.renders.length, `${id} lists the screens that stayed example renders`);
    assert.deepEqual(bank.templateIds().filter((t) => bank.loadManifest(t).style === id), templates);
  }
});

test("game templates pass the static check at every size and for 50 seeds", () => {
  for (const id of NEW) {
    const manifest = bank.loadManifest(id);
    for (const size of manifest.sizes) {
      const report = bank.check(bank.render(id, { size }).svg);
      assert.equal(report.status, "passed", `${id} ${size}: ${messages(report)}`);
    }
    for (let seed = 1; seed <= 50; seed += 1) {
      const report = bank.check(bank.render(id, { seed }).svg);
      assert.equal(report.status, "passed", `${id} seed ${seed}: ${messages(report)}`);
    }
  }
});

test("variants: four card rarities, the half-size scorebug reflow, pause and match point, every pull state", () => {
  for (const rarity of ["common", "rare", "epic", "legend"]) {
    const svg = bank.render("card.tcg-frame", { params: { rarity } }).svg;
    assert.equal(bank.check(svg).status, "passed", rarity);
  }
  const full = bank.render("broadcast.scorebug").svg;
  const half = bank.render("broadcast.scorebug", { params: { scale: "half", sticker: false, centre_frame: "dashed" }, set: { centre_label: "PAUSED 1:42", centre_title: "技术暂停" } }).svg;
  const halfReport = bank.check(half);
  assert.equal(halfReport.status, "passed", messages(halfReport));
  for (const row of halfReport.measured.filter((r) => r.kind === "text")) assert.ok(row.sizePx >= 12, `${row.slot} is ${row.sizePx}px at half size`);
  // the reflow drops the spray bridges and shrinks the plates, it does not scale the whole bug
  assert.ok((full.match(/rotate\(-4 /g) || []).length > (half.match(/rotate\(-4 /g) || []).length);
  for (const params of [{ revealed: 0 }, { revealed: 5, new_card: -1 }, { revealed: 2, rarity_4: "rare" }]) assert.equal(bank.check(bank.render("ui.pack-open", { params }).svg).status, "passed", JSON.stringify(params));
  for (const params of [{ tabs: 2 }, { items: 3, selected: 2, locked: -1 }]) {
    const id = params.tabs ? "ui.gacha-recruit" : "pixel.title-screen";
    assert.equal(bank.check(bank.render(id, { params }).svg).status, "passed", JSON.stringify(params));
  }
});

test("slots that carry structure reject copy they cannot draw, with a fix", () => {
  assert.throws(() => bank.render("cover.event-kv", { set: { time: "3PM" } }), (error) => error.code === "OPTION_VALUE_INVALID" && /digits 0-9 and : \. - \/ only/.test(error.message) && /Fix:/.test(error.message));
  assert.throws(() => bank.render("ui.tenpull-wall", { set: { card_3_stars: "★★" } }), (error) => error.code === "OPTION_VALUE_INVALID" && /3 to 6 stars/.test(error.message));
  assert.throws(() => bank.render("pixel.inventory", { size: "1280x720" }), (error) => error.code === "OPTION_VALUE_INVALID" && /whole number/.test(error.message) && /960x540/.test(error.message));
  const long = bank.check(bank.render("steam.small-capsule", { set: { title: "远灯守夜人" } }).svg);
  assert.ok(long.findings.some((f) => f.rule === "text-length" && f.slot === "title"), messages(long));
});

test("the Steam set is one design re-composed per size: exact Steam sizes, the title inside the frame and the light", () => {
  const STEAM = { "steam.header-capsule": "920x430", "steam.small-capsule": "462x174", "steam.main-capsule": "1232x706", "steam.vertical-capsule": "748x896", "steam.library-capsule": "600x900", "steam.event-cover": "800x450", "steam.event-header": "1920x622" };
  for (const [id, size] of Object.entries(STEAM)) {
    const manifest = bank.loadManifest(id);
    assert.deepEqual(manifest.sizes, [size]);
    const report = bank.check(bank.render(id, { set: { title: "雾港", title_latin: "FOGPORT" } }).svg);
    assert.equal(report.status, "passed", `${id}: ${messages(report)}`);
    const title = report.measured.find((r) => r.slot === "title");
    const [, H] = size.split("x").map(Number);
    // the store shows the small capsule at 120 x 45: its title is about half the capsule's height
    if (id === "steam.small-capsule") assert.ok(title.sizePx / H > 0.5, `${id} title ${title.sizePx}px of ${H}`);
    assert.ok(title.contrast >= 7, `${id} title ink on the paper light ${title.contrast}:1`);
  }
});

test("pixel templates keep the grid: whole-pixel geometry at every scale", () => {
  for (const size of ["480x270", "960x540", "1920x1080"]) {
    const svg = bank.render("pixel.title-screen", { size }).svg;
    const u = Number(size.split("x")[0]) / 480;
    assert.match(svg, new RegExp(`<g transform="scale\\(${u}\\)" shape-rendering="crispEdges">`));
    const pixelLayer = svg.slice(svg.indexOf(`scale(${u})`), svg.indexOf("</g>", svg.indexOf(`scale(${u})`)));
    for (const m of pixelLayer.matchAll(/(?:x|y|width|height)="([-\d.]+)"/g)) assert.ok(Number.isInteger(Number(m[1])), `${size}: ${m[0]} is off the grid`);
    for (const m of svg.matchAll(/font-size="([\d.]+)"/g)) if (!/monospace/.test(svg.slice(Math.max(0, m.index - 200), m.index))) assert.ok([12, 24].includes(Number(m[1]) / u), `${size}: text at ${m[1]}px is not 12 or 24 native`);
  }
});

// ---- check fixes that came with the packs ---------------------------------------------------------

test("static geometry reads arcs, curves and H/V commands without phantom polygons", () => {
  const rings = measure.paints(measure.parseXml(`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200"><path d="M300 100 A40 40 0 0 1 380 100 Z" fill="#000"/><path d="M10 10h50v20h-50z" fill="#000"/></svg>`));
  const [arc, box] = rings.map((p) => p.rings[0]);
  assert.ok(arc.every(([x]) => x >= 300), `arc stays where it is drawn: ${JSON.stringify(arc)}`);
  assert.deepEqual(box, [[10, 10], [60, 10], [60, 30], [10, 30]]);
  // a dome drawn with an arc no longer darkens the ground of a title far away (the Steam event cover)
  const report = bank.check(bank.render("steam.event-cover").svg);
  assert.ok(report.measured.find((r) => r.slot === "title").contrast > 10, messages(report));
});

test("placeholder labels reach 4.5:1 on their own hatch", () => {
  const svg = bank.render("hud.combat").svg;
  const label = /<g data-slot="scene"[^>]*>.*?<text [^>]*fill="(#[0-9A-Fa-f]{6})"/.exec(svg);
  const ground = measure.parseColor("#8E918A");
  assert.ok(label && measure.contrastRatio(measure.parseColor(label[1]), ground) >= 4.5, label && label[1]);
});

test("paths outside --root say how to widen it", (t) => {
  const root = tempRoot(t);
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), "game-packs-fonts-"));
  t.after(() => fs.rmSync(outside, { recursive: true, force: true }));
  const result = cli(root, "template", "render", "card.tcg-frame", "-o", "card.svg", "--font-dir", outside);
  assert.equal(result.status, 1);
  assert.match(result.payload.error.message, /--font-dir must stay inside .*Fix: pass --root <a directory that contains --font-dir/);
});

// ---- browser ------------------------------------------------------------------------------------

test("every game template's default render passes the browser check too", { skip: BROWSER.skip || CI_SKIP, timeout: 1800000 }, (t) => {
  const root = tempRoot(t);
  for (const id of NEW) {
    const result = cli(root, "template", "render", id, "-o", `${id}.svg`, "--chrome", BROWSER.chrome, "--puppeteer-module", BROWSER.puppeteerModule);
    assert.equal(result.status, 0, `${id}: ${JSON.stringify(result.payload?.check?.findings || result.payload?.error || result.stderr)}`);
    assert.equal(result.payload.check.status, "passed", id);
  }
});

test("pixel PNG at x4: every 4 x 4 block outside text is one palette colour", { skip: BROWSER.skip, timeout: 600000 }, (t) => {
  const root = tempRoot(t);
  const palette = new Set(Object.values(bank.loadStyle("woodblock-pixel").palette).map((p) => p.value.toUpperCase()));
  for (const id of ["pixel.title-screen", "pixel.inventory"]) {
    const result = cli(root, "template", "render", id, "-o", `${id}.svg`, "--png", `${id}.png`, "--chrome", BROWSER.chrome, "--puppeteer-module", BROWSER.puppeteerModule);
    assert.equal(result.status, 0, JSON.stringify(result.payload?.check?.findings || result.payload?.error));
    const svg = fs.readFileSync(path.join(root, `${id}.svg`), "utf8");
    // text boxes (the font may not be installed here): excluded, everything else is measured
    const boxes = [...svg.matchAll(/data-kind="text"[^>]*data-box="([^"]+)"/g)].map((m) => m[1].split(",").map(Number));
    const png = decodePng(fs.readFileSync(path.join(root, `${id}.png`)));
    const at = (x, y) => { const i = (y * png.width + x) * 4; return `#${[0, 1, 2].map((c) => png.data[i + c].toString(16).padStart(2, "0")).join("").toUpperCase()}`; };
    let mixed = 0; let off = 0; let blocks = 0;
    for (let by = 0; by < png.height; by += 4) for (let bx = 0; bx < png.width; bx += 4) {
      if (boxes.some(([x, y, w, h]) => bx + 4 > x - 4 && bx < x + w + 4 && by + 4 > y - 4 && by < y + h + 4)) continue;
      blocks += 1;
      const first = at(bx, by);
      if (!palette.has(first)) off += 1;
      for (let j = 0; j < 4; j += 1) for (let i = 0; i < 4; i += 1) if (at(bx + i, by + j) !== first) { mixed += 1; j = 4; break; }
    }
    assert.ok(blocks > 60000, `${id}: ${blocks} blocks measured`);
    assert.equal(mixed, 0, `${id}: ${mixed} blocks hold two colours`);
    assert.equal(off, 0, `${id}: ${off} blocks are off the palette`);
  }
});

test("a drawn numeral marked data-chk is measured as lettering, by its stroke colour", { skip: BROWSER.skip, timeout: 300000 }, (t) => {
  const root = tempRoot(t);
  fs.writeFileSync(path.join(root, "numeral.svg"), `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="300" viewBox="0 0 600 300"><rect width="600" height="300" fill="#22B8C2"/><g data-chk="time" data-cap="160"><path d="M60 60 L120 40 V220" fill="none" stroke="#F7F4EC" stroke-width="22"/><path d="M200 60 H300 L230 220" fill="none" stroke="#F7F4EC" stroke-width="22"/></g><text x="380" y="160" font-size="40" fill="#083B40" font-family="sans-serif">ok</text></svg>`);
  const result = cli(root, "template", "check", "numeral.svg", "--chrome", BROWSER.chrome, "--puppeteer-module", BROWSER.puppeteerModule);
  assert.equal(result.status, 2, JSON.stringify(result.payload));
  const finding = result.payload.findings.find((f) => f.rule === "contrast" && f.slot === "time");
  assert.ok(finding && finding.measured.ratio < 3, JSON.stringify(result.payload.findings));
  assert.ok(!result.payload.findings.some((f) => f.rule === "no-text-measured"));
});

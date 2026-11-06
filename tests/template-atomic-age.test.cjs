"use strict";

// The atomic-age style pack: mid-century Space-Age retro-futurism in two linked grammars (editorial and
// poster; mission documents), measured privately on an owner-supplied mood board and proven on the
// example kit. Ten templates. Marks are image slots and are never drawn; rockets and satellites are flat
// glyphs; titles are sized from the face that renders, and a face embedded in the file is measured with
// its own advance table (measure.registerFaceAdvances), never a face that is only named.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { spawnSync } = require("node:child_process");
const bank = require("../skill/tools/template-bank/bank.cjs");
const measure = require("../skill/tools/template-bank/measure.cjs");
const { GRAMMAR, FACES } = require("../skill/tools/template-bank/layouts-atomic.cjs");

const CLI = path.join(__dirname, "..", "skill", "scripts", "designer-pipeline.cjs");
const CATALOG = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "skill", "references", "fonts", "catalog.json"), "utf8"));
const IDS = ["banner.atomic-ad-panel", "card.atomic-credential", "card.atomic-field-label", "cover.atomic-linen-book", "cover.atomic-magazine", "doc.atomic-checklist", "doc.atomic-flight-plan", "poster.atomic-orbit-plate", "poster.atomic-solar-print", "poster.atomic-travel"];
const MARKS = { "banner.atomic-ad-panel": ["logo"], "card.atomic-credential": ["emblem"], "card.atomic-field-label": ["emblem"], "cover.atomic-linen-book": ["publisher_mark"], "cover.atomic-magazine": ["emblem"], "poster.atomic-travel": ["emblem"] };

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

// OFL subset fixtures named after the pack's face files (tests/fixtures/atomic-age/provenance.csv), plus
// Noto Sans SC 700 bundled with the skill under the pack's face name, so nothing depends on installed fonts.
function fontDir(root) {
  const dir = path.join(root, "fonts");
  fs.mkdirSync(dir, { recursive: true });
  const fixtures = path.join(__dirname, "fixtures", "atomic-age", "fonts");
  for (const file of fs.readdirSync(fixtures).filter((f) => f.endsWith(".woff"))) fs.copyFileSync(path.join(fixtures, file), path.join(dir, file));
  fs.copyFileSync(path.join(__dirname, "..", "skill", "tools", "art-motion", "fonts", "NotoSansSC-700.woff"), path.join(dir, "NotoSansSC[wght].woff"));
  return dir;
}
const FIXTURE_ROOT = fs.mkdtempSync(path.join(os.tmpdir(), "atomic-fonts-"));
const FONTS = fontDir(FIXTURE_ROOT);
test.after(() => fs.rmSync(FIXTURE_ROOT, { recursive: true, force: true }));

test("atomic-age names its case and lineage, borrows grammar not assets, keeps real names and marks out of its defaults, and names its OFL faces", () => {
  const style = bank.loadStyle("atomic-age");
  assert.match(style.provenance.borrow, /^Borrow grammar, never assets\./);
  assert.match(style.provenance.lineage, /stays private and is not shipped/);
  const all = JSON.stringify([style, ...IDS.map((id) => bank.loadManifest(id))]) + IDS.map((id) => fs.readFileSync(path.join(bank.TEMPLATES_ROOT, id, "spec.md"), "utf8") + fs.readFileSync(path.join(bank.TEMPLATES_ROOT, id, "template.svg"), "utf8")).join("");
  assert.doesNotMatch(all, /\bnasa\b|oldsmobile|sputnik|apollo|gemini|vostok|soviet|ussr|cccp|gagarin|armstrong|aldrin|collins|meatball|lighthouse|灯塔/i);
  assert.ok(style.layout.grammar.length >= 6);
  assert.ok(style.checks.guidance.some((line) => /^64 px distinctiveness \(guidance/.test(line)));
  assert.ok(style.checks.guidance.some((line) => /Never draw a logo, insignia, emblem/.test(line)));
  assert.ok(style.checks.guidance.some((line) => /Never draw a realistic vehicle, person or building in code \(#301\)/.test(line)));
  assert.ok(style.checks.guidance.some((line) => /Annotations are unsigned/.test(line)));
  for (const recipe of style.materials.recipes) assert.match(recipe, /materials (fetch|process|generate)|task sheet/);
  const families = new Set(CATALOG.families.map((f) => f.family));
  for (const [role, spec] of Object.entries(style.fonts.roles)) assert.ok(spec.stack.some((family) => families.has(family)), `${role} has a catalog family in its stack`);
  for (const face of style.fonts.faces) assert.ok(/^SIL OFL/.test(face.licence) && /\/ofl\//.test(face.source), `${face.family} ${face.weight} names an OFL source`);
  for (const [, [family, weight, file]] of Object.entries(FACES)) assert.ok(style.fonts.faces.some((face) => face.family === family && face.weight === weight && face.file.startsWith(file)), `${family} ${weight} is a declared face`);
  assert.equal(style.fonts.bundled, false);
  assert.deepEqual(bank.templateIds().filter((id) => bank.loadManifest(id).style === "atomic-age"), IDS);
  const listed = cli(fs.mkdtempSync(path.join(os.tmpdir(), "atomic-")), "template", "list", "--style", "atomic-age");
  assert.equal(listed.status, 0, JSON.stringify(listed.payload));
  assert.deepEqual(listed.payload.styles[0].templates, IDS);
});

test("atomic-age templates pass the static check at every size, for 50 seeds, in their variants, with and without the faces", () => {
  for (const id of IDS) {
    for (const size of bank.loadManifest(id).sizes) {
      for (const fontDirOpt of [null, FONTS]) {
        const report = bank.check(bank.render(id, { size, fontDir: fontDirOpt }).svg);
        assert.equal(report.status, "passed", `${id} ${size} ${fontDirOpt ? "faces" : "pinned"}: ${messages(report)}`);
      }
    }
    for (let seed = 1; seed <= 50; seed += 1) {
      const report = bank.check(bank.render(id, { seed, fontDir: seed % 2 ? FONTS : null }).svg);
      assert.equal(report.status, "passed", `${id} seed ${seed}: ${messages(report)}`);
    }
  }
  const variants = [
    ["poster.atomic-travel", { ground: "ink", title_ink: "vermilion", vehicle: "satellite", italic: false, halftone: false, misregister: 0 }, { title: "SEE MARS", band: "THE RED PLANET" }],
    ["poster.atomic-travel", { ground: "teal", title_ink: "paper", art: "slot", planet: "mustard" }, {}],
    ["cover.atomic-linen-book", { cloth: "charcoal", swoop: "loop" }, { title_1: "LUNAR", title_2: "TRAJECTORY", title_3: "TABLES" }],
    ["cover.atomic-linen-book", { swoop_ink: "vermilion" }, {}],
    ["cover.atomic-magazine", { items: 3, halftone: false, starburst: false, misregister: 8 }, { masthead_a: "space", masthead_b: "craft" }],
    ["card.atomic-field-label", { ground: "teal", emblem: true }, {}],
    ["doc.atomic-flight-plan", { start_hour: 102, period_end: 30, events: 3, holes: false, annotations: false }, {}],
    ["doc.atomic-checklist", { sections: 2, rows: 3, checked: 0, craft: "slot", stamp: false, holes: false }, {}],
    ["poster.atomic-solar-print", { ground: "teal", rings: 8, labels: 4, seed: 99 }, {}],
    ["poster.atomic-solar-print", { ground: "ink", rings: 12, labels: 10 }, {}],
    ["poster.atomic-orbit-plate", { grid: false, star_seed: 3 }, {}],
    ["card.atomic-credential", { hole: false, stamp: false }, { mission: "MERIDIAN", number: "88" }],
  ];
  for (const [id, params, set] of variants) {
    for (const fontDirOpt of [null, FONTS]) {
      const report = bank.check(bank.render(id, { params, set, fontDir: fontDirOpt }).svg);
      assert.equal(report.status, "passed", `${id} ${JSON.stringify(params)}: ${messages(report)}`);
    }
  }
});

test("marks are image slots with a size and clear-space rule, never drawn; motifs and glyphs are decoration", () => {
  for (const [id, slots] of Object.entries(MARKS)) {
    const manifest = bank.loadManifest(id);
    for (const slot of slots) {
      assert.equal(manifest.slots[slot].kind, "image", `${id} ${slot}`);
      assert.match(manifest.slots[slot].note, /clear space/, `${id} ${slot} states its clear space`);
      assert.match(manifest.slots[slot].note, /never drawn by the template/);
    }
    const svg = bank.render(id, { params: id === "card.atomic-field-label" ? { emblem: true } : {} }).svg;
    for (const slot of slots) assert.match(svg, new RegExp(`data-slot="${slot}" data-kind="image"[^>]*><rect[^>]*fill="url\\(#hatch-`), `${id} leaves ${slot} an empty labelled slot`);
  }
  // the poster's scene slot replaces the drawn glyph; the drawn variant still declares the slot, empty
  const drawn = bank.render("poster.atomic-travel").svg;
  assert.match(drawn, /<g data-slot="art" data-kind="image"[^>]*data-ground="#1F3640"><\/g>/);
  const slotted = bank.render("poster.atomic-travel", { params: { art: "slot" } }).svg;
  assert.match(slotted, /data-slot="art" data-kind="image"[^>]*><rect/);
  assert.ok(slotted.indexOf('data-slot="art"') > slotted.indexOf("<ellipse"), "the scene paints above the orbit");
  // the title colour is refused where it cannot reach 3:1
  assert.throws(() => bank.render("poster.atomic-travel", { params: { title_ink: "vermilion" } }), (error) => error.code === "OPTION_VALUE_INVALID" && /Fix:/.test(error.message));
  // Latin faces take Latin copy; mixed CJK goes to a body slot
  assert.throws(() => bank.render("cover.atomic-magazine", { set: { masthead_c: "明日画报" } }), (error) => error.code === "OPTION_VALUE_INVALID" && /Fix:/.test(error.message));
});

test("the measured grammar: masthead, sun, ladder, holes and one vermilion main colour per editorial template", () => {
  assert.equal(GRAMMAR.masthead, 0.17);
  assert.equal(GRAMMAR.sun, 0.216);
  assert.deepEqual(GRAMMAR.ladderTicks, [10, 1]);
  assert.equal(GRAMMAR.holes, 5);
  const share = (id, params = {}) => bank.check(bank.render(id, { params }).svg).summary.accentShare;
  assert.ok(share("banner.atomic-ad-panel") > 0.4, "the ad is a vermilion field");
  assert.ok(share("cover.atomic-magazine") > 0.03 && share("cover.atomic-magazine") < 0.08, "the cover's sun and masthead half");
  assert.ok(share("doc.atomic-flight-plan") < 0.01, "documents carry only ballpoint and stamp ink");
  // a minute tick ladder: 120 ticks with 13 labels over two hours
  const plan = bank.render("doc.atomic-flight-plan").svg;
  assert.equal((plan.match(/data-slot="tick_\d+"/g) || []).length, 13);
  assert.match(plan, />40:00</);
  assert.match(plan, />:50</);
  assert.equal((bank.render("doc.atomic-checklist").svg.match(/data-deco="1" d="M[^"]*Z" fill="#3A3632"/g) || []).length, 5, "five punched holes");
});

test("a face embedded in the file is measured at its own width; a face that is only named is not", () => {
  const withFaces = bank.render("cover.atomic-magazine", { fontDir: FONTS });
  assert.equal(withFaces.fontSwitches.filter((f) => f.role === "display").length, 0);
  const slot = (svg, name) => measure.readSlots(measure.parseXml(svg)).find((s) => s.slot === name);
  const embedded = slot(withFaces.svg, "masthead_a");
  const size = Number(withFaces.svg.match(/data-slot="masthead_a"[^>]*font-size="([\d.]+)"/)[1]);
  const table = measure.faceAdvances("League Gothic", 400);
  const expected = [..."orbit"].reduce((w, ch) => w + table.get(ch) * size, 0) + (-10 / 1000) * size * 4;
  assert.ok(Math.abs(embedded.extent[2] - expected) < 1, `measured ${embedded.extent[2]} against the face's ${expected}`);
  // strip the @font-face rules: the same text is measured with the calibrated sans model again, and the
  // condensed masthead no longer fits its box (the check cannot trust a face it cannot see)
  const stripped = withFaces.svg.replace(/<style>[^<]*<\/style>/, "");
  const report = bank.check(stripped);
  assert.equal(report.status, "failed");
  assert.ok(report.findings.some((f) => f.rule === "text-overflow" && f.slot === "masthead_a"), messages(report));
  assert.equal(bank.check(withFaces.svg).status, "passed");
  // without --font-dir the display role is pinned to Noto Sans SC and sized from the model
  const bare = bank.render("cover.atomic-magazine");
  assert.ok(bare.fontSwitches.some((f) => f.role === "display" && f.from === "League Gothic" && f.to === "Noto Sans SC"));
  assert.match(bare.svg, /data-slot="masthead_a"[^>]*font-family="'Noto Sans SC',sans-serif"/);
  // a face at another weight than the registered one keeps the model
  assert.equal(measure.faceAdvances("League Gothic", 700), null);
});

test("every atomic-age default render passes the browser check with the OFL fixtures", { skip: BROWSER.skip || CI_SKIP, timeout: 1800000 }, (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "atomic-browser-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const fonts = fontDir(root);
  for (const id of IDS) {
    const result = cli(root, "template", "render", id, "-o", `${id}.svg`, "--font-dir", fonts, "--browser", "--chrome", BROWSER.chrome, "--puppeteer-module", BROWSER.puppeteerModule);
    assert.equal(result.status, 0, `${id}: ${JSON.stringify(result.payload?.check?.findings || result.payload?.error || result.stderr)}`);
    assert.equal(result.payload.check.status, "passed", id);
  }
});

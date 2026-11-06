"use strict";

// The crisis-command style pack: a crisis-terminal and title-card grammar measured privately on frames of a
// 1990s giant-robot anime and its film remakes, proven on the original case 潮位警报 TIDEMARK. Five templates:
// the title card, the film title line, the alarm wall, the countdown bezel and the coupling board. Heavy
// Mincho is compressed with a scale-only transform in the measured steps; digits are drawn segments.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { spawnSync } = require("node:child_process");
const bank = require("../skill/tools/template-bank/bank.cjs");
const measure = require("../skill/tools/template-bank/measure.cjs");
const { COMPRESS, HEX, CARD, segText, hexPts } = require("../skill/tools/template-bank/layouts-crisis.cjs");

const CLI = path.join(__dirname, "..", "skill", "scripts", "designer-pipeline.cjs");
const CATALOG = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "skill", "references", "fonts", "catalog.json"), "utf8"));
const IDS = ["banner.crisis-film-title", "card.crisis-title-card", "ui.crisis-alert-wall", "ui.crisis-countdown", "ui.crisis-sync-graph"];

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

// Fonts the browser tests render with, so they do not depend on what the machine has installed: OFL subset
// fixtures of Noto Serif SC Black (the pack's CJK copy) and Archivo (ASCII), tests/fixtures/crisis-command/
// provenance.csv, and Noto Sans SC 700 bundled with the skill under the pack's face name.
function fontDir(root, name = "fonts") {
  const dir = path.join(root, name);
  fs.mkdirSync(dir, { recursive: true });
  const fixtures = path.join(__dirname, "fixtures", "crisis-command", "fonts");
  for (const file of ["NotoSerifSC[wght].woff", "Archivo[wdth,wght].woff"]) fs.copyFileSync(path.join(fixtures, file), path.join(dir, file));
  fs.copyFileSync(path.join(__dirname, "..", "skill", "tools", "art-motion", "fonts", "NotoSansSC-700.woff"), path.join(dir, "NotoSansSC[wght].woff"));
  return dir;
}

test("crisis-command names its case and lineage without the work, borrows grammar not assets, resolves its CJK roles through the font catalog and names Archivo with licence and source", () => {
  const style = bank.loadStyle("crisis-command");
  assert.match(style.provenance.borrow, /^Borrow grammar, never assets\./);
  assert.match(style.provenance.lineage, /stay private and are not shipped/);
  const all = JSON.stringify([style, ...IDS.map((id) => bank.loadManifest(id))]) + IDS.map((id) => fs.readFileSync(path.join(bank.TEMPLATES_ROOT, id, "spec.md"), "utf8")).join("");
  assert.doesNotMatch(all, /evangelion|福音|\bnerv\b|ネルフ|\bmagi\b|seele|matisse|fontworks|使徒|新東京|新东京|lighthouse|灯塔/i);
  assert.ok(style.layout.grammar.length >= 5 && style.motion.grammar.length >= 3);
  assert.ok(style.checks.guidance.some((line) => /^64 px distinctiveness \(guidance/.test(line)));
  assert.ok(style.checks.guidance.some((line) => /Never draw mecha, weapons or people in code \(#301\)/.test(line)));
  assert.equal(style.checks.browserOnRender, true);
  for (const recipe of style.materials.recipes) assert.match(recipe, /materials (fetch|cut|process|generate)|task sheet/);
  const families = new Set(CATALOG.families.map((f) => f.family));
  const faces = new Map(style.fonts.faces.map((face) => [face.family, face]));
  assert.ok(families.has(style.fonts.roles.head.stack[0]) && families.has(style.fonts.roles.body.stack[0]), "head and body resolve through the catalog");
  assert.equal(style.fonts.roles.head.weight, 900);
  const archivo = faces.get("Archivo");
  assert.ok(archivo && /^SIL OFL/.test(archivo.licence) && /\/ofl\/archivo$/.test(archivo.source));
  assert.ok(style.fonts.roles.grot.stack.slice(1).some((family) => families.has(family)), "a catalog family sits behind Archivo");
  assert.match(style.fonts.substitution, /proprietary heavy Mincho/);
  assert.equal(style.fonts.bundled, false);
  assert.deepEqual(bank.templateIds().filter((id) => bank.loadManifest(id).style === "crisis-command"), IDS);
  const listed = cli(fs.mkdtempSync(path.join(os.tmpdir(), "crisis-")), "template", "list", "--style", "crisis-command");
  assert.equal(listed.status, 0, JSON.stringify(listed.payload));
  assert.deepEqual(listed.payload.styles[0].templates, IDS);
});

test("crisis-command templates pass the static check at every size, for 50 seeds and in their variants", () => {
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
    ["card.crisis-title-card", { ground: "paper", number: "column" }, { number: "第拾弍报", head_1: "零", head_2: "号", head_3: "闸门" }],
    ["card.crisis-title-card", { ground: "red", compress: 0.85 }, { head_2: "闸门", head_3: "不开" }],
    ["banner.crisis-film-title", { ink: "deep", caption: false, compress: 0.35, height: 0.39 }, {}],
    ["ui.crisis-alert-wall", { scanlines: false }, { title_1: "东缘十二号闸", title_2: "无响应", latin_1: "GATE E-12", latin_2: "NO RESPONSE" }],
    ["ui.crisis-countdown", { state: "danger", mode: 4, supply: 2 }, { clock: "00:00:09" }],
    ["ui.crisis-sync-graph", { dissent: 1, trace_seed: 42 }, { ratio: "28.4" }],
  ];
  for (const [id, params, set] of variants) {
    const report = bank.check(bank.render(id, { params, set }).svg);
    assert.equal(report.status, "passed", `${id} ${JSON.stringify(params)}: ${messages(report)}`);
  }
});

test("the measured grammar: compression steps, the hexagon, the card proportions, one hot colour per screen", () => {
  assert.deepEqual(COMPRESS, { card: 1, caption: 0.85, credits: 0.65, film: 0.35 });
  assert.deepEqual(HEX, { aspect: 3.06, tip: 55 });
  assert.equal(CARD.titleInk / CARD.numInk > 2 - 0.05 && CARD.titleInk / CARD.numInk < 2.05, true, "number at half the title");
  // the film title is compressed by a scale-only matrix, the title card's lines are not
  const film = bank.render("banner.crisis-film-title").svg;
  assert.match(film, /<g transform="matrix\(0\.4 0 0 1 [\d.]+ 0\)"><text data-slot="title"/);
  assert.doesNotMatch(bank.render("card.crisis-title-card").svg, /data-slot="head_1"[^>]*>[^<]*<\/text><\/g>|matrix\(0\.[0-9]+ 0 0 1 [\d.]+ 0\)"><text data-slot="head_1"/);
  // the hexagon's tips are 55 degrees from the horizontal
  const [left, top] = hexPts(0, 0, 306, 100);
  assert.ok(Math.abs((Math.atan2(left[1] - top[1], top[0] - left[0]) * 180) / Math.PI - 55) < 0.01);
  // type cards stay black; alarm screens carry the hot field; the coupling board keeps red-orange to state
  const share = (id, params = {}) => bank.check(bank.render(id, { params }).svg).summary.accentShare;
  assert.equal(share("card.crisis-title-card"), 0);
  assert.ok(share("card.crisis-title-card", { ground: "red" }) > 0.05);
  assert.ok(share("ui.crisis-alert-wall") > 0.3, "the honeycomb is a hot field");
  assert.ok(share("ui.crisis-sync-graph") < 0.02, "red-orange is state only on the board");
  assert.ok(share("ui.crisis-countdown", { state: "danger" }) > share("ui.crisis-countdown"), "the danger cut adds red-orange");
});

test("compressed text keeps its type size and is measured through the transform", () => {
  const svg = bank.render("banner.crisis-film-title").svg;
  const slot = measure.readSlots(measure.parseXml(svg)).find((s) => s.slot === "title");
  const size = Number(svg.match(/data-slot="title"[^>]*font-size="([\d.]+)"/)[1]);
  assert.ok(Math.abs(slot.size - size) < 0.01, `type size ${slot.size} keeps the vertical size ${size}`);
  const uncompressed = measure.textWidth("潮位警报重编版", size, (-10 / 1000) * size, { serif: true, weight: 900 });
  assert.ok(Math.abs(slot.extent[2] - uncompressed * 0.4) < 2, `extent ${slot.extent[2]} is 0.4 of ${uncompressed}`);
});

test("segment digits are drawn (no font): capsule and LCD, only digits and separators", () => {
  const capsule = segText("8", 0, 0, 100, "capsule");
  assert.equal((capsule.d.match(/Z/g) || []).length, 7, "an 8 lights seven segments");
  assert.ok(Math.abs(capsule.width - 42) < 0.5, "capsule digit 0.42 of its height");
  assert.equal((segText("1", 0, 0, 100, "lcd").d.match(/Z/g) || []).length, 2);
  const clock = bank.render("ui.crisis-countdown").svg;
  assert.match(clock, /data-slot="clock" data-kind="lettering"[^>]*data-cap="280.0"><g class="lettering" fill="#F2A93B" data-text="04:59:58"><path d="M/);
  const bad = (id, set, pattern) => assert.throws(() => bank.render(id, { set }), (error) => error.code === "OPTION_VALUE_INVALID" && pattern.test(error.message) && /Fix:/.test(error.message));
  bad("ui.crisis-countdown", { clock: "4:59" }, /segment digits/);
  bad("ui.crisis-countdown", { elapsed: "十二分" }, /segment digits/);
  bad("ui.crisis-sync-graph", { ratio: "41%" }, /segment digits/);
  bad("ui.crisis-alert-wall", { latin_1: "第九区" }, /Latin, digits and ASCII punctuation only/);
  assert.throws(() => bank.render("ui.crisis-sync-graph", { set: { verdict_1: "否" } }), /derived/);
  const long = bank.check(bank.render("card.crisis-title-card", { set: { head_3: "越过警戒线" } }).svg);
  assert.ok(long.findings.some((f) => f.rule === "text-length" && f.slot === "head_3"), messages(long));
});

test("the grotesque is sized from the face that renders: Archivo when supplied, else pinned to Noto Sans SC", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "crisis-pin-"));
  try {
    const bare = bank.render("ui.crisis-alert-wall");
    assert.ok(bare.fontSwitches.some((f) => f.role === "grot" && f.from === "Archivo" && f.to === "Noto Sans SC"));
    assert.match(bare.svg, /data-slot="latin_1"[^>]*font-family="'Noto Sans SC',sans-serif"/);
    const supplied = bank.render("ui.crisis-alert-wall", { fontDir: fontDir(root) });
    assert.equal(supplied.fontSwitches.filter((f) => f.role === "grot").length, 0);
    assert.match(supplied.svg, /data-slot="latin_1"[^>]*font-family="'Archivo','Noto Sans SC',sans-serif"/);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("every crisis-command default render passes the browser check with the OFL fixtures", { skip: BROWSER.skip || CI_SKIP, timeout: 1200000 }, (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "crisis-browser-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  for (const id of IDS) {
    const result = cli(root, "template", "render", id, "-o", `${id}.svg`, "--font-dir", fontDir(root), "--chrome", BROWSER.chrome, "--puppeteer-module", BROWSER.puppeteerModule);
    assert.equal(result.status, 0, `${id}: ${JSON.stringify(result.payload?.check?.findings || result.payload?.error || result.stderr)}`);
    assert.equal(result.payload.check.status, "passed", id);
  }
});

"use strict";

// The megastructure-ink style pack: endless structure drawn as an abstract ink line system, a person
// stated only by a scale marker, black and cold grey with one light, white hairline HUD frames, monitor
// panels and the pack's own rail script. Measured privately on reference images (never shipped) and
// proven on the original kit in examples/megastructure-ink-kit. Five templates; each renders from
// parameters with original copy and passes both halves of the check. Fonts come from fixtures, never
// from what the machine has installed.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { spawnSync } = require("node:child_process");
const bank = require("../skill/tools/template-bank/bank.cjs");
const { railLayout } = require("../skill/tools/template-bank/layouts-ink.cjs");
const kitGlyphs = require("../examples/megastructure-ink-kit/templates/glyphs.js");

const CLI = path.join(__dirname, "..", "skill", "scripts", "designer-pipeline.cjs");
const CATALOG = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "skill", "references", "fonts", "catalog.json"), "utf8"));
const IDS = ["banner.ink-terminal", "card.ink-label-plate", "kv.ink-shaft-hero", "ui.ink-hud-frame", "ui.ink-topbar"];
const BUNDLED = path.join(__dirname, "..", "skill", "tools", "art-motion", "fonts");
const FIXTURE = path.join(__dirname, "fixtures", "megastructure-ink", "fonts");

const messages = (report) => JSON.stringify(report.findings.map((f) => `${f.rule}:${f.slot}: ${f.message}`));
function cli(root, ...args) {
  const child = spawnSync(process.execPath, [CLI, ...args, "--root", root, "--json"], { encoding: "utf8", windowsHide: true, timeout: 600000, maxBuffer: 64 << 20 });
  let payload = null;
  try { payload = JSON.parse(child.stdout); } catch { payload = null; }
  return { status: child.status, payload, stderr: child.stderr };
}
// Every face of the pack from fixtures: Noto Sans SC 400 / 900 from the skill's own woffs, Michroma and
// Chakra Petch from the OFL subsets in tests/fixtures/megastructure-ink.
function fontDir(root, name = "fonts") {
  const dir = path.join(root, name);
  fs.mkdirSync(dir, { recursive: true });
  fs.copyFileSync(path.join(BUNDLED, "NotoSansSC-900.woff"), path.join(dir, "NotoSansSC-Black.woff"));
  fs.copyFileSync(path.join(BUNDLED, "NotoSansSC-500.woff"), path.join(dir, "NotoSansSC-Regular.woff"));
  for (const file of ["Michroma-Regular.woff", "ChakraPetch-Medium.woff"]) fs.copyFileSync(path.join(FIXTURE, file), path.join(dir, file));
  return dir;
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

test("megastructure-ink names its case and lineage, borrows grammar not assets, forbids code-drawn figures and resolves its CJK roles through the catalog", () => {
  const style = bank.loadStyle("megastructure-ink");
  assert.match(style.provenance.borrow, /^Borrow grammar, never assets\./);
  assert.match(style.provenance.lineage, /stay private and are not shipped/);
  assert.ok(style.layout.grammar.length >= 5 && style.motion.grammar.length);
  assert.ok(style.checks.guidance.some((line) => /^64 px distinctiveness \(guidance/.test(line)));
  assert.ok(style.checks.guidance.some((line) => /^Show mode without figures \(guidance\): never draw a person, mecha/.test(line)));
  assert.equal(style.checks.browserOnRender, true);
  for (const recipe of style.materials.recipes) assert.match(recipe, /materials (fetch|cut|process|generate)/);
  const families = new Set(CATALOG.families.map((f) => f.family));
  for (const [role, spec] of Object.entries(style.fonts.roles)) {
    assert.ok(spec.stack.length >= 2 && spec.stack.some((family) => families.has(family)), `${role}: ${spec.stack.join(" > ")}`);
  }
  for (const face of style.fonts.faces) assert.match(face.licence, /^SIL OFL 1\.1$/);
  assert.equal(style.fonts.bundled, false);
  // no name from the lineage in the pack
  assert.doesNotMatch(JSON.stringify(style), /blame|sidonia|biomega|aposimz|nihei|弐瓶|二瓶/i);
  assert.deepEqual(bank.templateIds().filter((id) => bank.loadManifest(id).style === "megastructure-ink"), IDS);
  const listed = cli(fs.mkdtempSync(path.join(os.tmpdir(), "megastructure-ink-")), "template", "list", "--style", "megastructure-ink");
  assert.equal(listed.status, 0, JSON.stringify(listed.payload));
  assert.deepEqual(listed.payload.styles[0].templates, IDS);
});

test("megastructure-ink templates pass the static check at every size and for 50 seeds, and in their variants", () => {
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
    ["kv.ink-shaft-hero", { plate: "slot" }, { title_cjk: "下层", title_latin: "UNDERSTRATA", value_1: "−9,600" }],
    ["ui.ink-topbar", { current: 7 }, {}],
    ["card.ink-label-plate", { tone: "alarm" }, { plate: "警报", plate_en: "ALARM", value: "1,240" }],
    ["card.ink-label-plate", { tone: "screen" }, {}],
    ["ui.ink-hud-frame", { view: "slot", alert: false, gauge_3: 0.9 }, {}],
    ["banner.ink-terminal", { state: "idle", lines: 3 }, { message: "接线台空闲。" }],
  ];
  for (const [id, params, set] of variants) {
    const report = bank.check(bank.render(id, { params, set }).svg);
    assert.equal(report.status, "passed", `${id} ${JSON.stringify(params)}: ${messages(report)}`);
  }
});

test("the key visual: structure over the top 70% and no picture drawn, the name 10x a label, the scale marker's tick and bracket", () => {
  const { svg } = bank.render("kv.ink-shaft-hero");
  assert.match(svg, /<clipPath id="ink-shaft-1"><rect x="0.0" y="0.0" width="1920.0" height="756.0"\/>/, "the plate fills the top 70%");
  assert.doesNotMatch(svg, /<image\b/, "the drawn plate embeds no picture");
  const size = (slot) => Number(new RegExp(`data-slot="${slot}"[^>]*font-size="([\\d.]+)"`).exec(svg)[1]);
  assert.ok(size("title_cjk") / size("label_1") >= 10, `name ${size("title_cjk")} : label ${size("label_1")}`);
  assert.match(svg, /<path d="M900.0 360.0v10.0"\/><path d="M914.0 360.0v10.0H1334.0v-10.0"\/>/, "a 10-unit tick beside a 420-unit bracket");
  const slot = bank.render("kv.ink-shaft-hero", { params: { plate: "slot" } }).svg;
  assert.match(slot, /data-slot="plate"[^>]*data-layer="bg"/, "slot mode leaves a ground layer for generated art");
});

test("the rail script in the pack draws exactly what the kit's glyphs.js draws", () => {
  for (const text of ["vaultwell", "sounding bureau", "stratum 4112", "echo key", "穹井"]) {
    assert.deepEqual(railLayout(text), kitGlyphs.layout(text), text);
  }
  const a = railLayout("abc"); const b = railLayout("abd");
  assert.notDeepEqual(a.rects, b.rects, "different text draws different glyphs");
});

test("structural slots reject copy the grammar cannot carry, with a fix", () => {
  const bad = (id, set, pattern) => assert.throws(() => bank.render(id, { set }), (error) => error.code === "OPTION_VALUE_INVALID" && pattern.test(error.message) && /Fix:/.test(error.message));
  bad("kv.ink-shaft-hero", { value_1: "很深" }, /is a readout/);
  bad("kv.ink-shaft-hero", { title_latin: "穹井" }, /Latin caps line/);
  bad("ui.ink-topbar", { depth_3: "第三层" }, /is a readout/);
  bad("card.ink-label-plate", { plate_en: "live" }, /Latin caps line/);
  const long = bank.check(bank.render("banner.ink-terminal", { set: { line_1: "这是一条长得放不下的终端记录，它会超出一行的预算，并且越过监视屏的右边" } }).svg);
  assert.ok(long.findings.some((f) => f.rule === "text-length" && f.slot === "line_1"), messages(long));
});

test("with the fixture fonts the data face covers the minus sign, degree and middle dot, and the Latin faces never get CJK", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "megastructure-ink-fonts-"));
  try {
    const dir = fontDir(root);
    for (const id of IDS) {
      const rendered = bank.render(id, { fontDir: dir });
      assert.deepEqual(rendered.fontFaces.map((f) => f.family).sort(), ["Chakra Petch", "Michroma", "Noto Sans SC", "Noto Sans SC"], id);
      assert.deepEqual(rendered.fontSwitches.filter((f) => f.to === null), [], `${id}: ${JSON.stringify(rendered.fontSwitches)}`);
      for (const m of rendered.svg.matchAll(/<text [^>]*data-font-role="(wide|data)"[^>]*>([^<]*)</g)) assert.doesNotMatch(m[2], /[　-鿿＀-￯]/, `${id}: ${m[2]} in ${m[1]}`);
    }
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("every megastructure-ink default render passes the browser check with the fixture fonts", { skip: BROWSER.skip || CI_SKIP, timeout: 1200000 }, (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "megastructure-ink-browser-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const dir = fontDir(root);
  for (const id of IDS) {
    const result = cli(root, "template", "render", id, "-o", `${id}.svg`, "--font-dir", dir, "--chrome", BROWSER.chrome, "--puppeteer-module", BROWSER.puppeteerModule);
    assert.equal(result.status, 0, `${id}: ${JSON.stringify(result.payload?.check?.findings || result.payload?.error || result.stderr)}`);
    assert.equal(result.payload.check.status, "passed", id);
  }
});

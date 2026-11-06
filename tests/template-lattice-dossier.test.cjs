"use strict";

// The lattice-dossier style pack: an industrial dossier-terminal game site grammar, measured on a
// privately captured official site and proven on an original site (雾航信标 FOGWAKE). Five templates:
// the top frame, the rail pager, the section heading with its ghost word, the bulletin screen and the
// four columns. Each renders from parameters with original copy and passes both halves of the check.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { spawnSync } = require("node:child_process");
const bank = require("../skill/tools/template-bank/bank.cjs");
const { GRID, FRAME } = require("../skill/tools/template-bank/layouts-lattice.cjs");

const CLI = path.join(__dirname, "..", "skill", "scripts", "designer-pipeline.cjs");
const CATALOG = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "skill", "references", "fonts", "catalog.json"), "utf8"));
const IDS = ["banner.lattice-columns", "card.lattice-ghost-title", "kv.lattice-bulletin", "ui.lattice-pager", "ui.lattice-topbar"];

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

test("lattice-dossier names its case and lineage without a game, borrows grammar not assets, and resolves its fonts through the catalog", () => {
  const style = bank.loadStyle("lattice-dossier");
  assert.match(style.provenance.borrow, /^Borrow grammar, never assets\./);
  assert.match(style.provenance.lineage, /stay private and are not shipped/);
  assert.doesNotMatch(JSON.stringify(style), /arknights|明日方舟|hypergryph|鹰角|rhodes|罗德岛|originium|源石/i);
  assert.ok(style.layout.grammar.length >= 5 && style.motion.grammar.length);
  assert.ok(style.checks.guidance.some((line) => /^64 px distinctiveness \(guidance/.test(line)));
  assert.equal(style.checks.browserOnRender, true);
  for (const recipe of style.materials.recipes) assert.match(recipe, /materials (fetch|cut|process|generate)/);
  const families = new Set(CATALOG.families.map((f) => f.family));
  for (const [role, spec] of Object.entries(style.fonts.roles)) {
    assert.ok(spec.stack.length >= 2 && spec.stack.some((family) => families.has(family)), `${role}: ${spec.stack.join(" > ")}`);
  }
  assert.deepEqual(bank.templateIds().filter((id) => bank.loadManifest(id).style === "lattice-dossier"), IDS);
  const listed = cli(fs.mkdtempSync(path.join(os.tmpdir(), "lattice-")), "template", "list", "--style", "lattice-dossier");
  assert.equal(listed.status, 0, JSON.stringify(listed.payload));
  assert.deepEqual(listed.payload.styles[0].templates, IDS);
});

test("lattice-dossier templates pass the static check at every size and for 50 seeds, and in their variants", () => {
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
    ["ui.lattice-topbar", { current: 4, icons: false }, {}],
    ["ui.lattice-pager", {}, { current: "05", total: "05", section: "MORE" }],
    ["kv.lattice-bulletin", { tab: 3, items: 2, active: 3 }, { headline: "开发者通讯 Vol.12" }],
    ["banner.lattice-columns", { icons: false }, { col_zh_2: "营建" }],
    ["card.lattice-ghost-title", {}, { title_cjk: "设定", title_latin: "ATLAS", ghost: "ATLAS" }],
  ];
  for (const [id, params, set] of variants) {
    const report = bank.check(bank.render(id, { params, set }).svg);
    assert.equal(report.status, "passed", `${id} ${JSON.stringify(params)}: ${messages(report)}`);
  }
});

test("the frame: a 172-unit lattice and hairlines at y 152, y 900 and x 1683; one cyan, state only", () => {
  assert.equal(GRID, 172);
  assert.deepEqual(FRAME, { top: 152, base: 900, rail: 1683 });
  const svg = bank.render("kv.lattice-bulletin").svg;
  for (const d of ["M0.0 152.0L1920.0 152.0", "M0.0 900.0L1920.0 900.0", "M1683.0 0.0L1683.0 1080.0"]) assert.ok(svg.includes(d), d);
  assert.ok(!/ rx="/.test(svg), "no rounded corners");
  // cyan is state only: under 3% of the screen (the reference's inner screens), main button included
  for (const id of ["kv.lattice-bulletin", "banner.lattice-columns", "card.lattice-ghost-title"]) {
    const share = bank.check(bank.render(id).svg).summary.accentShare;
    assert.ok(share < 0.03 && (id === "banner.lattice-columns" || share > 0), `${id} cyan share ${share}`);
  }
  // the rail numeral is decoration cut to its top 55%; the readable number is the small line
  const pager = bank.render("ui.lattice-pager").svg;
  assert.match(pager, /data-slot="numeral"[^>]*data-decor="1"/);
  assert.match(pager, /<clipPath id="rail-cut-1"><rect [^>]*height="47\.5"/);
});

test("structural slots reject copy they cannot draw, with a fix", () => {
  const bad = (id, set, pattern) => assert.throws(() => bank.render(id, { set }), (error) => error.code === "OPTION_VALUE_INVALID" && pattern.test(error.message) && /Fix:/.test(error.message));
  bad("ui.lattice-pager", { current: "二" }, /digits only/);
  bad("ui.lattice-pager", { total: "005" }, /digits only/);
  bad("kv.lattice-bulletin", { date_1: "11月6日" }, /dossier form/);
  bad("kv.lattice-bulletin", { head_date: "Nov 6" }, /dossier form/);
  assert.throws(() => bank.render("ui.lattice-pager", { set: { numeral: "09" } }), /derived/);
  const long = bank.check(bank.render("kv.lattice-bulletin", { set: { headline: "这是一条长得放不下的情报标题，它会超出预算并且溢出它的框，还要再长一些" } }).svg);
  assert.ok(long.findings.some((f) => f.rule === "text-length" && f.slot === "headline"), messages(long));
});

test("every lattice-dossier default render passes the browser check too", { skip: BROWSER.skip || CI_SKIP, timeout: 1200000 }, (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "lattice-browser-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  for (const id of IDS) {
    const result = cli(root, "template", "render", id, "-o", `${id}.svg`, "--chrome", BROWSER.chrome, "--puppeteer-module", BROWSER.puppeteerModule);
    assert.equal(result.status, 0, `${id}: ${JSON.stringify(result.payload?.check?.findings || result.payload?.error || result.stderr)}`);
    assert.equal(result.payload.check.status, "passed", id);
  }
});

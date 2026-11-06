"use strict";

// The milspec-ops style pack: a tactical extraction shooter's official-site grammar, measured on a
// private reference and proven on an original site (寂原行动). Five templates: the bottom dock, the
// selection rail, the gunsmith callout screen, the intel card and the detail column. Each renders from
// parameters with original copy and passes both halves of the check.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { spawnSync } = require("node:child_process");
const bank = require("../skill/tools/template-bank/bank.cjs");
const { PENT } = require("../skill/tools/template-bank/layouts-ops.cjs");

const CLI = path.join(__dirname, "..", "skill", "scripts", "designer-pipeline.cjs");
const CATALOG = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "skill", "references", "fonts", "catalog.json"), "utf8"));
const IDS = ["card.ops-intel", "card.ops-select-rail", "kv.ops-callout", "ui.ops-brief", "ui.ops-dock"];

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

test("milspec-ops names its case and lineage, borrows grammar not assets, names no game and resolves its fonts through the catalog", () => {
  const style = bank.loadStyle("milspec-ops");
  assert.match(style.provenance.borrow, /^Borrow grammar, never assets\./);
  assert.match(style.provenance.lineage, /stay private and are not shipped/);
  assert.ok(style.layout.grammar.length >= 5 && style.motion.grammar.length);
  assert.ok(style.checks.guidance.some((line) => /^64 px distinctiveness \(guidance/.test(line)));
  assert.equal(style.checks.browserOnRender, true);
  for (const recipe of style.materials.recipes) assert.match(recipe, /materials (fetch|cut|process|generate)/);
  const families = new Set(CATALOG.families.map((f) => f.family));
  for (const [role, spec] of Object.entries(style.fonts.roles)) {
    assert.ok(spec.stack.length >= 2 && spec.stack.some((family) => families.has(family)), `${role}: ${spec.stack.join(" > ")}`);
  }
  assert.deepEqual(bank.templateIds().filter((id) => bank.loadManifest(id).style === "milspec-ops"), IDS);
  const listed = cli(fs.mkdtempSync(path.join(os.tmpdir(), "milspec-ops-")), "template", "list", "--style", "milspec-ops");
  assert.equal(listed.status, 0, JSON.stringify(listed.payload));
  assert.deepEqual(listed.payload.styles[0].templates, IDS);
});

test("milspec-ops templates pass the static check at every size and for 50 seeds, and in their variants", () => {
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
    ["ui.ops-dock", { current: 6, glow: false }, { cta_1: "开始", cta_2: "行动" }],
    ["card.ops-select-rail", { items: 3, current: 2 }, { name_1: "全域会战", name_2: "寂原撤离", name_3: "断桥协议" }],
    ["kv.ops-callout", { tilt: -4, callouts: 3 }, { title_cjk: "GP-62 通用机枪" }],
    ["card.ops-intel", { pin: false }, { date: "2026.09.30", title: "《寂原行动》公平竞技守则" }],
    ["ui.ops-brief", { rows: 2, icons: false }, { title: "全域会战", name: "32 对 32 大地图攻防" }],
  ];
  for (const [id, params, set] of variants) {
    const report = bank.check(bank.render(id, { params, set }).svg);
    assert.equal(report.status, "passed", `${id} ${JSON.stringify(params)}: ${messages(report)}`);
  }
});

test("the measured geometry: a five-sided CTA plate, 147-unit dock items, a 126-unit rail pitch", () => {
  const plate = PENT(878, 0, 165, 110);
  assert.equal(plate.length, 5, "five-sided, not the reference's triangle");
  const dock = bank.render("ui.ops-dock").svg;
  const poly = /<polygon points="([^"]+)" fill="#0E3A2C" data-role="green_deep"\/>/.exec(dock);
  assert.ok(poly && poly[1].trim().split(" ").length === 5, "the plate is drawn as a five-point polygon");
  const xs = [...dock.matchAll(/<text data-slot="nav_\d"[^>]* x="([\d.]+)"/g)].map((m) => Number(m[1]));
  assert.deepEqual(xs.slice(0, 3).map((x, i, a) => (i ? Math.round(x - a[i - 1]) : 0)), [0, 146, 147]);
  const rail = bank.render("card.ops-select-rail").svg;
  const ys = [...rail.matchAll(/<text data-slot="name_\d"[^>]* y="([\d.]+)"/g)].map((m) => Number(m[1]));
  assert.equal(ys.length, 6);
  for (let i = 1; i < ys.length; i += 1) assert.equal(Math.round(ys[i] - ys[i - 1]), 126);
});

test("structural slots reject copy they cannot draw, with a fix", () => {
  assert.throws(() => bank.render("card.ops-intel", { set: { date: "10月28日" } }), (error) => error.code === "OPTION_VALUE_INVALID" && /digits and \/ \. - only/.test(error.message) && /Fix:/.test(error.message));
  const long = bank.check(bank.render("card.ops-intel", { set: { title: "这是一条长得放不下的新闻标题，它会超出预算并且溢出它的框" } }).svg);
  assert.ok(long.findings.some((f) => f.rule === "text-length" && f.slot === "title"), messages(long));
});

test("every milspec-ops default render passes the browser check too", { skip: BROWSER.skip || CI_SKIP, timeout: 1200000 }, (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "milspec-ops-browser-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  for (const id of IDS) {
    const result = cli(root, "template", "render", id, "-o", `${id}.svg`, "--chrome", BROWSER.chrome, "--puppeteer-module", BROWSER.puppeteerModule);
    assert.equal(result.status, 0, `${id}: ${JSON.stringify(result.payload?.check?.findings || result.payload?.error || result.stderr)}`);
    assert.equal(result.payload.check.status, "passed", id);
  }
});

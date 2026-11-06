"use strict";

// The frontier-survey style pack: an industrial sci-fi frontier game's official-site grammar,
// measured on a private reference site and proven on an original site (远垦导线). Five templates:
// the left rail, the section opener, the crew dossier, the album screen and the version timeline.
// Each renders from parameters with original copy and passes both halves of the check.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { spawnSync } = require("node:child_process");
const bank = require("../skill/tools/template-bank/bank.cjs");

const CLI = path.join(__dirname, "..", "skill", "scripts", "designer-pipeline.cjs");
const CATALOG = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "skill", "references", "fonts", "catalog.json"), "utf8"));
const IDS = ["banner.survey-timeline", "card.survey-dossier", "card.survey-section-title", "kv.survey-album", "ui.survey-rail"];

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

test("frontier-survey names its case and lineage, borrows grammar not assets, and resolves its fonts through the catalog", () => {
  const style = bank.loadStyle("frontier-survey");
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
  // one strong colour: yellow is the only accent role of every template
  for (const id of IDS) assert.deepEqual(bank.loadManifest(id).accent.roles, ["yellow"], id);
  assert.deepEqual(bank.templateIds().filter((id) => bank.loadManifest(id).style === "frontier-survey"), IDS);
  const listed = cli(fs.mkdtempSync(path.join(os.tmpdir(), "frontier-survey-")), "template", "list", "--style", "frontier-survey");
  assert.equal(listed.status, 0, JSON.stringify(listed.payload));
  assert.deepEqual(listed.payload.styles[0].templates, IDS);
});

test("frontier-survey templates pass the static check at every size and for 50 seeds, and in their variants", () => {
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
    ["card.survey-section-title", { tone: "dark", ruler: false }, { title_cjk: "影像资料", title_latin: "MEDIA" }],
    ["kv.survey-album", { side: "right", band: "grey", wordmark: false }, { title_cjk: "工段规划", title_latin: "WORKLINE", band_latin: "WORKLINE", index: "1/5", caption: "自动化工段" }],
    ["ui.survey-rail", { current: 6 }, {}],
    ["card.survey-dossier", { rank: 5 }, { name: "白砾", code: "CAIRN", index: "2/5" }],
    ["banner.survey-timeline", { current: 3 }, { date_3: "12.18" }],
  ];
  for (const [id, params, set] of variants) {
    const report = bank.check(bank.render(id, { params, set }).svg);
    assert.equal(report.status, "passed", `${id} ${JSON.stringify(params)}: ${messages(report)}`);
  }
});

test("the measured proportions hold: the crew column, the album band, the rail pitch", () => {
  const dossier = bank.render("card.survey-dossier").svg;
  assert.match(dossier, /<rect x="[\d.]+" y="0" width="656\.0" height="1043\.0" fill="#FFEE00" data-role="yellow"\/>/);
  const album = bank.render("kv.survey-album").svg;
  assert.match(album, /width="229\.0" height="653\.0" fill="#FFEE00" data-role="yellow"/);
  const grey = bank.render("kv.survey-album", { params: { side: "right", band: "grey" } }).svg;
  assert.match(grey, /width="229\.0" height="653\.0" fill="#EDEDED" data-role="band_grey"/);
  const plate = (current) => Number(/<rect x="0" y="([\d.]+)" width="252\.0" height="60\.0" fill="#E6E6E6"/.exec(bank.render("ui.survey-rail", { params: { current } }).svg)[1]);
  assert.equal(plate(1), 152);
  assert.equal(plate(4) - plate(3), 60);
  // the title block at the reference's 1920 sizes on the 960 card: a 78 x 24 grey arrow block, CJK 36
  const title = bank.render("card.survey-section-title").svg;
  assert.match(title, /width="78\.0" height="24\.0" fill="#D9D9D9" data-role="grey3"/);
  assert.match(title, /data-slot="title_cjk"[^>]*font-size="36\.0"/);
});

test("structural slots reject copy they cannot draw, with a fix", () => {
  const bad = (id, set, pattern) => assert.throws(() => bank.render(id, { set }), (error) => error.code === "OPTION_VALUE_INVALID" && pattern.test(error.message) && /Fix:/.test(error.message));
  bad("card.survey-section-title", { title_latin: "世界观" }, /Latin caps/);
  bad("kv.survey-album", { mark_latin: "Traverse" }, /Latin caps and digits only/);
  bad("kv.survey-album", { index: "第一张" }, /digits and \/ only/);
  bad("card.survey-dossier", { index: "一/五" }, /digits and \/ only/);
  bad("banner.survey-timeline", { date_1: "11月20日" }, /digits and \. only/);
  const long = bank.check(bank.render("card.survey-dossier", { set: { name: "一个很长很长的名字" } }).svg);
  assert.ok(long.findings.some((f) => f.rule === "text-length" && f.slot === "name"), messages(long));
});

test("every frontier-survey default render passes the browser check too", { skip: BROWSER.skip || CI_SKIP, timeout: 1200000 }, (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "frontier-survey-browser-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  for (const id of IDS) {
    const result = cli(root, "template", "render", id, "-o", `${id}.svg`, "--chrome", BROWSER.chrome, "--puppeteer-module", BROWSER.puppeteerModule);
    assert.equal(result.status, 0, `${id}: ${JSON.stringify(result.payload?.check?.findings || result.payload?.error || result.stderr)}`);
    assert.equal(result.payload.check.status, "passed", id);
  }
});

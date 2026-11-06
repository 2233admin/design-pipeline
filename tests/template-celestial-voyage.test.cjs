"use strict";

// The celestial-voyage style pack: a star-voyage fantasy RPG's official-site grammar, measured on the
// reference site the owner named (captures private) and proven on an original site (长庚航志). Four
// templates: the top bar with a hanging logo and a cream tab, one gilt news ticket, the news section and
// the character section with its faction orbit. Each renders from parameters with original copy and
// passes both halves of the check.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { spawnSync } = require("node:child_process");
const bank = require("../skill/tools/template-bank/bank.cjs");
const { ORBIT } = require("../skill/tools/template-bank/layouts-voyage.cjs");

const CLI = path.join(__dirname, "..", "skill", "scripts", "designer-pipeline.cjs");
const CATALOG = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "skill", "references", "fonts", "catalog.json"), "utf8"));
const IDS = ["card.voyage-ticket", "kv.voyage-orbit-roster", "kv.voyage-ticket-carousel", "ui.voyage-topbar"];

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

test("celestial-voyage names its case and lineage, borrows grammar not assets, and resolves its fonts through the catalog", () => {
  const style = bank.loadStyle("celestial-voyage");
  assert.match(style.provenance.borrow, /^Borrow grammar, never assets\./);
  assert.match(style.provenance.lineage, /stay private and are not shipped/);
  assert.ok(style.layout.grammar.length >= 5 && style.motion.grammar.length);
  assert.ok(style.checks.guidance.some((line) => /^64 px distinctiveness \(guidance/.test(line)));
  assert.ok(style.checks.guidance.some((line) => /^Show mode without figures \(guidance/.test(line)));
  assert.equal(style.checks.browserOnRender, true);
  for (const recipe of style.materials.recipes) assert.match(recipe, /materials (fetch|cut|process|generate)/);
  const families = new Set(CATALOG.families.map((f) => f.family));
  for (const [role, spec] of Object.entries(style.fonts.roles)) {
    assert.ok(spec.stack.length >= 2 && spec.stack.some((family) => families.has(family)), `${role}: ${spec.stack.join(" > ")}`);
  }
  assert.deepEqual(bank.templateIds().filter((id) => bank.loadManifest(id).style === "celestial-voyage"), IDS);
  const listed = cli(fs.mkdtempSync(path.join(os.tmpdir(), "celestial-voyage-")), "template", "list", "--style", "celestial-voyage");
  assert.equal(listed.status, 0, JSON.stringify(listed.payload));
  assert.deepEqual(listed.payload.styles[0].templates, IDS);
});

test("celestial-voyage templates pass the static check at every size and for 50 seeds, and in their variants", () => {
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
    ["ui.voyage-topbar", { current: 7, login: false }, {}],
    ["card.voyage-ticket", { active: false }, { tag: "公告", headline: "「引航」概率公示与航票返还规则说明", date: "2026/11/05" }],
    ["kv.voyage-ticket-carousel", { rail: false, items: 3 }, { title_cjk: "活动", title_latin: "EVENTS" }],
    ["kv.voyage-orbit-roster", { avatars: 5, active: 5 }, { name: "白鹭", name_latin: "BAILU", faction: "潮汐商会" }],
  ];
  for (const [id, params, set] of variants) {
    const report = bank.check(bank.render(id, { params, set }).svg);
    assert.equal(report.status, "passed", `${id} ${JSON.stringify(params)}: ${messages(report)}`);
  }
});

test("the faction orbit: medallions sit on one arc centred off the left, 13.7 degrees apart", () => {
  assert.deepEqual(ORBIT, { cx: 1005, cy: 540, r: 760, step: 13.7 });
  assert.ok(ORBIT.cx - ORBIT.r < 1920 && ORBIT.cx + ORBIT.r > 1700, "the arc's rightmost point sits in the right rail");
  const svg = bank.render("kv.voyage-orbit-roster").svg;
  const discs = [...svg.matchAll(/<circle cx="([\d.]+)" cy="([\d.]+)" r="(60\.0|70\.0)" fill="#151C2B"/g)].map((m) => [Number(m[1]), Number(m[2])]);
  assert.equal(discs.length, 5);
  for (const [x, y] of discs) assert.ok(Math.abs(Math.hypot(x - ORBIT.cx, y - ORBIT.cy) - ORBIT.r) < 0.5, `medallion (${x}, ${y}) is on the arc`);
  const angles = discs.map(([x, y]) => (Math.atan2(y - ORBIT.cy, x - ORBIT.cx) * 180) / Math.PI).sort((a, b) => a - b);
  for (let i = 1; i < angles.length; i += 1) assert.ok(Math.abs(angles[i] - angles[i - 1] - ORBIT.step) < 0.05, JSON.stringify(angles));
});

test("structural slots reject copy they cannot draw, with a fix", () => {
  const bad = (id, set, pattern) => assert.throws(() => bank.render(id, { set }), (error) => error.code === "OPTION_VALUE_INVALID" && pattern.test(error.message) && /Fix:/.test(error.message));
  bad("card.voyage-ticket", { date: "11月10日" }, /digits and \/ \. - only/);
  bad("kv.voyage-ticket-carousel", { date_2: "next week" }, /digits and \/ \. - only/);
  bad("kv.voyage-ticket-carousel", { title_latin: "新闻" }, /capitals, digits/);
  bad("kv.voyage-orbit-roster", { title_latin: "Crew" }, /capitals, digits/);
  const long = bank.check(bank.render("card.voyage-ticket", { set: { headline: "这是一条长得放不下的新闻标题，它会超出两行的预算，并且溢出它的标题条，最后被截断在打孔线下面" } }).svg);
  assert.ok(long.findings.some((f) => f.rule === "text-length" && f.slot === "headline"), messages(long));
});

test("every celestial-voyage default render passes the browser check too", { skip: BROWSER.skip || CI_SKIP, timeout: 1200000 }, (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "celestial-voyage-browser-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  for (const id of IDS) {
    const result = cli(root, "template", "render", id, "-o", `${id}.svg`, "--chrome", BROWSER.chrome, "--puppeteer-module", BROWSER.puppeteerModule);
    assert.equal(result.status, 0, `${id}: ${JSON.stringify(result.payload?.check?.findings || result.payload?.error || result.stderr)}`);
    assert.equal(result.payload.check.status, "passed", id);
  }
});

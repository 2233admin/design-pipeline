"use strict";

// The atomic-age example kit: the print-set content renders through all ten templates and passes the static
// check; every picture has a recorded source (NASA period imagery 1957-1975 or a materials generator) and a
// matching hash; the sheet and page credit NASA imagery; no mark file ships; the OFL subsets cover every
// character the pages set; every art slot has a task sheet; and (with headless Chrome) the sheet and the
// landing page pass the browser half of `template check` at 1440 and 390 wide.

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { spawnSync } = require("node:child_process");
const coverage = require("../skill/tools/template-bank/coverage.cjs");

const REPO = path.join(__dirname, "..");
const KIT = path.join(REPO, "examples", "atomic-age-kit");
const CLI = path.join(REPO, "skill", "scripts", "designer-pipeline.cjs");
const { RENDERS, CREDIT } = require(path.join(KIT, "build", "data.cjs"));
const { staticChecks } = require(path.join(KIT, "build", "build.cjs"));
const read = (file) => fs.readFileSync(path.join(KIT, file), "utf8");
const PAGES = ["sheet.html", "site/index.html"];

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

test("the print-set content renders through all ten templates and passes the static check with the kit's fonts", () => {
  const results = staticChecks();
  assert.equal(results.length, 10);
  for (const r of results) {
    assert.equal(r.status, "passed", `${r.id}: ${JSON.stringify(r.findings.map((f) => `${f.rule}:${f.slot} ${f.message}`))}`);
    assert.equal(r.fontSwitches.length, 0, `${r.id} renders in the pack's faces`);
    assert.ok(fs.existsSync(path.join(KIT, "renders", `${r.id}.jpg`)), `renders/${r.id}.jpg (node build/build.cjs --browser)`);
  }
});

test("every picture has its source, its materials record and a matching hash; NASA imagery is 1957-1975 and credited", () => {
  const prov = JSON.parse(read("art/provenance.json"));
  const records = JSON.parse(read("art/materials-licenses.json"));
  const files = fs.readdirSync(path.join(KIT, "art")).filter((f) => /\.(jpe?g|png)$/i.test(f));
  assert.deepEqual(files.sort(), Object.keys(prov.files).sort(), "art/ and provenance.json list the same pictures");
  for (const [file, entry] of Object.entries(prov.files)) {
    const sha = crypto.createHash("sha256").update(fs.readFileSync(path.join(KIT, "art", file))).digest("hex");
    assert.equal(entry.sha256, sha, `${file} hash`);
    if (entry.materialsRecord) assert.ok(records[entry.materialsRecord], `${file} has a materials record`);
    if (entry.generator) assert.ok(entry.generator.name && entry.generator.params && Number.isInteger(entry.generator.seed), `${file} records generator, params and seed`);
    if (entry.process) assert.ok(entry.process.effect && entry.process.params && entry.process.sha256, `${file} records effect, params and source hash`);
    const nasa = entry.nasaId || /NASA/.test(entry.license || entry.sourceRecord?.license || "");
    if (nasa) {
      const year = Number(String(entry.dateCreated).slice(0, 4));
      assert.ok(year >= 1957 && year <= 1975, `${file} dates from ${entry.dateCreated}, inside 1957-1975`);
      assert.equal(entry.credit, CREDIT);
      assert.match(entry.sourceRecord?.license || entry.license, /PD-USGov-NASA/);
    }
  }
  for (const page of PAGES) assert.ok(read(page).includes("Imagery: NASA. Not endorsed by NASA."), `${page} credits NASA imagery`);
  // marks never ship with the kit: no insignia, emblem or logo files, and the pages leave the slots empty
  const all = [];
  const walk = (dir) => { for (const e of fs.readdirSync(dir, { withFileTypes: true })) (e.isDirectory() ? walk(path.join(dir, e.name)) : all.push(path.join(dir, e.name))); };
  walk(KIT);
  assert.deepEqual(all.filter((f) => /logo|insignia|emblem|meatball|hammer|sickle/i.test(path.basename(f))), []);
  for (const r of RENDERS) for (const slot of Object.keys(r.images || {})) assert.ok(!/emblem|logo|mark/.test(slot), `${r.id} fills no mark slot`);
});

test("the OFL subsets cover every character the sheet, the page and the renders set", () => {
  const text = PAGES.map(read).join("").replace(/<[^>]*>/g, " ").replace(/&[a-z]+;/g, " ")
    + JSON.stringify(RENDERS.map((r) => r.set || {}));
  const used = new Set([...text].filter((ch) => ch.codePointAt(0) >= 0x20 && !/\s/.test(ch)));
  for (const file of ["LeagueGothic-Regular.woff", "Jost-Bold.woff", "Jost-Medium.woff", "CourierPrime-Regular.woff", "CourierPrime-Bold.woff", "Caveat-SemiBold.woff"]) {
    const cmap = coverage.readFontCoverage(path.join(KIT, "fonts", file));
    const missing = [...used].filter((ch) => !cmap.has(ch.codePointAt(0)) && ch !== "×");
    assert.deepEqual(missing, [], `${file} lacks ${missing.join("")}`);
  }
  for (const licence of ["OFL-LeagueGothic.txt", "OFL-Jost.txt", "OFL-CourierPrime.txt", "OFL-Caveat.txt"]) assert.match(read(`fonts/${licence}`), /SIL Open Font License/);
});

test("every art slot names a task sheet, every task sheet is used, and ?slot=1 shows the placeholders", () => {
  const html = read("site/index.html");
  const used = [...html.matchAll(/data-task="([^"]+)"/g)].map((m) => m[1]);
  const tasks = JSON.parse(read("art-tasks/tasks.json")).tasks.map((t) => t.id);
  assert.deepEqual([...new Set(used)].sort(), tasks.sort());
  for (const id of tasks) assert.match(read(`art-tasks/${id}.md`), /## 提示词/);
  assert.match(html, /get\("slot"\) === "1"/);
  assert.match(read("site/site.css"), /\.slot-mode \.slot-label \{ display: block;/);
});

function pageHeight(page, width) {
  const script = `const p=require(${JSON.stringify(BROWSER.puppeteerModule)});(async()=>{const b=await p.launch({executablePath:${JSON.stringify(BROWSER.chrome)},args:["--no-sandbox"]});const g=await b.newPage();await g.setViewport({width:${width},height:900});await g.goto(${JSON.stringify("file://" + path.join(KIT, page))},{waitUntil:"networkidle0"});await g.evaluate(()=>document.fonts.ready);console.log(await g.evaluate(()=>document.documentElement.scrollHeight));await b.close();})();`;
  return Number(spawnSync(process.execPath, ["-e", script], { encoding: "utf8", timeout: 120000 }).stdout.trim());
}

test("the sheet and the landing page pass the browser check at 1440 and 390 wide", { skip: BROWSER.skip || CI_SKIP, timeout: 1800000 }, () => {
  for (const page of PAGES) {
    for (const width of [1440, 390]) {
      const height = pageHeight(page, width);
      assert.ok(height > 800, `${page} at ${width} has a height`);
      const run = spawnSync(process.execPath, [CLI, "template", "check", path.join(KIT, page), "--browser", "--size", `${width}x${height}`, "--chrome", BROWSER.chrome, "--puppeteer-module", BROWSER.puppeteerModule, "--root", REPO, "--json"], { encoding: "utf8", timeout: 600000, maxBuffer: 64 << 20 });
      const payload = JSON.parse(run.stdout);
      const report = payload.result || payload;
      assert.equal(report.status, "passed", `${page} ${width}: ${JSON.stringify((report.findings || []).map((f) => `${f.rule}:${f.id || ""} ${f.message}`))}`);
    }
  }
});

"use strict";

// The megastructure-ink kit example: its design-system package and foundations are ready, generated files
// are current, every art slot has a task sheet, the layer contracts validate, templates stay self-contained
// and draw no pictures in previews, and (where headless Chrome is installed) its pages pass the browser
// half of `template check`.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { spawnSync } = require("node:child_process");
const { checkDesignSystemPackage } = require("../skill/scripts/design-system-package-core.cjs");
const { validateContract } = require("../skill/tools/template-bank/layers.cjs");

const REPO = path.join(__dirname, "..");
const KIT = path.join(REPO, "examples", "megastructure-ink-kit");
const CLI = path.join(REPO, "skill", "scripts", "designer-pipeline.cjs");
const TEMPLATES = path.join(KIT, "templates");
const PAGES = ["index", "site", "hud", "terminal"];

function cli(args, timeout = 240000) {
  return spawnSync(process.execPath, [CLI, ...args], { cwd: REPO, encoding: "utf8", timeout, maxBuffer: 64 << 20 });
}

test("the design-system package is ready, every contrast pair passes and at least 20 components ship", () => {
  const result = checkDesignSystemPackage({ projectRoot: KIT });
  assert.equal(result.status, "ready", JSON.stringify(result.findings, null, 1));
  assert.deepEqual(result.tokenUse.unused.filter((name) => name !== "primary"), [], "only the primary alias may go unused");
  assert.ok(result.components.length >= 20, `components: ${result.components.join(", ")}`);
  for (const pair of result.contrast) assert.ok(pair.ratio >= pair.min, `${pair.text} on ${pair.on} ${pair.ratio}`);
});

test("DESIGN.md, MOTION.md and the package pass foundation check together", () => {
  const run = cli(["foundation", "check", "--kind", "all", "--project-root", path.relative(REPO, KIT)]);
  assert.equal(run.status, 0, run.stdout + run.stderr);
  assert.equal(JSON.parse(run.stdout).status, "ready");
});

test("generated pages, tokens.css and previews match build/build.cjs", () => {
  const run = spawnSync(process.execPath, [path.join(KIT, "build", "build.cjs"), "--check"], { encoding: "utf8" });
  assert.equal(run.status, 0, run.stderr);
});

test("every art slot names a task sheet, every task sheet is used, and the layer contracts validate", () => {
  const tasks = JSON.parse(fs.readFileSync(path.join(KIT, "art-tasks", "tasks.json"), "utf8")).tasks;
  const used = new Set();
  for (const page of PAGES) for (const m of fs.readFileSync(path.join(TEMPLATES, `${page}.html`), "utf8").matchAll(/data-task="([^"]+)"/g)) used.add(m[1]);
  for (const id of used) {
    assert.ok(tasks.some((t) => t.id === id), `slot task ${id} has no entry in tasks.json`);
    const sheet = fs.readFileSync(path.join(KIT, "art-tasks", `${id}.md`), "utf8");
    assert.match(sheet, /原创角色，不得出现任何现有作品的角色/, `${id}: the original-characters line`);
    assert.match(sheet, /不出现灯塔/, `${id}: no lighthouse`);
  }
  for (const t of tasks) {
    assert.ok(used.has(t.id), `task ${t.id} is not used by any slot`);
    if (t.layers) validateContract(JSON.parse(fs.readFileSync(path.join(KIT, t.layers), "utf8")), { id: t.id, palette: { signal: "#7fe6ea" } });
  }
});

test("pages are self-contained, previews carry no pictures, and no name from the lineage appears", () => {
  for (const page of PAGES) {
    const html = fs.readFileSync(path.join(TEMPLATES, `${page}.html`), "utf8");
    for (const m of html.matchAll(/\s(?:src|href)="([^"#][^"]*)"/g)) {
      const ref = m[1];
      assert.ok(!/^[a-z]+:\/\//i.test(ref) && !ref.startsWith("//"), `${page}: remote reference ${ref}`);
      assert.ok(fs.existsSync(path.resolve(TEMPLATES, ref.split(/[?#]/)[0])), `${page}: ${ref} does not exist`);
    }
    for (const m of html.matchAll(/<use href="#(i-[a-zA-Z]+)"/g)) assert.ok(html.includes(`<symbol id="${m[1]}"`), `${page}: icon ${m[1]} missing from the sprite`);
    assert.equal((html.match(/<h1\b/g) || []).length, 1, `${page}: exactly one h1`);
    assert.doesNotMatch(html, /<img\b|<image\b/i, `${page}: show mode draws plates, never pictures`);
  }
  const components = path.join(KIT, "design-system", "components");
  for (const comp of fs.readdirSync(components)) {
    const file = path.join(components, comp, "preview.html");
    if (fs.existsSync(file)) assert.doesNotMatch(fs.readFileSync(file, "utf8"), /<img\b|<picture\b|<video\b|<image\b/i, `${comp} preview embeds a picture`);
  }
  const all = [...fs.readdirSync(KIT, { recursive: true })].filter((f) => /\.(md|json|html|cjs|js|css)$/.test(f)).map((f) => fs.readFileSync(path.join(KIT, f), "utf8")).join("\n");
  assert.doesNotMatch(all, /blame|sidonia|biomega|aposimz|nihei|弐瓶|二瓶|netsphere/i);
});

test("bundle.css registers every face the stacks lead with, so the pages do not lean on system CJK fonts", () => {
  const css = fs.readFileSync(path.join(KIT, "design-system", "components", "bundle.css"), "utf8");
  const registered = [...css.matchAll(/@font-face\s*\{[^}]*font-family:\s*"([^"]+)"[^}]*url\("([^"]+)"\)/g)];
  const families = new Set(registered.map((m) => m[1]));
  for (const family of ["Michroma", "Chakra Petch", "Noto Sans SC"]) assert.ok(families.has(family), `${family} has no @font-face`);
  for (const m of registered) assert.ok(fs.existsSync(path.resolve(KIT, "design-system", "components", m[2])), `${m[1]}: ${m[2]} does not exist`);
  assert.ok(fs.existsSync(path.join(KIT, "design-system", "fonts", "OFL-NotoSansSC.txt")), "the Noto Sans SC licence sits beside its faces");
});

function browserEnvironment() {
  try { require.resolve("puppeteer-core/package.json", { paths: [REPO] }); } catch { return "puppeteer-core is not installed"; }
  try { require("../skill/scripts/browser-locate.cjs").resolveBrowser(); } catch { return "no headless Chrome, Edge or Chromium"; }
  return false;
}
const skip = browserEnvironment() || (process.env.GITHUB_ACTIONS === "true" && "text-occluded differs on the CI runner (#305)");

for (const [page, size] of [["hud", "1920x1080"], ["terminal", "1920x1080"]]) {
  test(`template check --browser passes on ${page} at ${size}`, { skip, timeout: 300000 }, () => {
    const run = cli(["template", "check", path.relative(REPO, path.join(TEMPLATES, `${page}.html`)), "--browser", "--size", size], 280000);
    const result = JSON.parse(run.stdout);
    assert.equal(result.status, "passed", JSON.stringify(result.findings, null, 1));
  });
}

test("the structure plates draw deterministically and fill their slots (no figure layer in show mode)", { skip, timeout: 120000 }, async () => {
  const puppeteer = require(require.resolve("puppeteer-core", { paths: [REPO] }));
  const resolved = require("../skill/scripts/browser-locate.cjs").resolveBrowser();
  const executablePath = typeof resolved === "string" ? resolved : resolved.executablePath || resolved.path;
  const args = typeof process.getuid === "function" && process.getuid() === 0 ? ["--no-sandbox"] : [];
  const browser = await puppeteer.launch({ executablePath, headless: true, args, timeout: 120000 });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    const url = require("node:url").pathToFileURL(path.join(TEMPLATES, "site.html")).href;
    const read = () => page.$$eval("canvas[data-plate]", (cs) => cs.map((c) => { const x = c.getContext("2d").getImageData(0, 0, c.width, c.height).data; let ink = 0, sum = 0; for (let i = 0; i < x.length; i += 4 * 97) { const l = x[i] * 0.2126 + x[i + 1] * 0.7152 + x[i + 2] * 0.0722; sum += l; if (l < 40) ink += 1; } return { w: c.width, sum, ink }; }));
    await page.goto(url, { waitUntil: "load" });
    const first = await read();
    await page.goto(url, { waitUntil: "load" });
    assert.deepEqual(await read(), first, "same seed, same plate");
    assert.ok(first.length >= 5 && first.every((p) => p.w > 0 && p.ink > 0), JSON.stringify(first));
    await page.goto(`${url}?slot=1`, { waitUntil: "load" });
    assert.equal(await page.$eval("html", (h) => h.getAttribute("data-mode")), "slot");
    assert.equal(await page.$$eval("canvas[data-plate]", (cs) => cs.filter((c) => getComputedStyle(c).display !== "none").length), 0, "slot mode hides the plates");
  } finally {
    await browser.close();
  }
});

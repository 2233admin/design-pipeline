"use strict";

// The archive-terminal wiki kit example: its design-system package and foundations are ready, its generated
// files are current, every art slot has a task sheet, templates stay self-contained, and (where headless
// Chrome is installed) its pages pass the browser half of `template check`.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { spawnSync } = require("node:child_process");
const { checkDesignSystemPackage } = require("../skill/scripts/design-system-package-core.cjs");

const REPO = path.join(__dirname, "..");
const KIT = path.join(REPO, "examples", "archive-terminal-wiki-kit");
const CLI = path.join(REPO, "skill", "scripts", "designer-pipeline.cjs");
const TEMPLATES = path.join(KIT, "templates");
const PAGES = ["index", "home", "entity", "list", "item", "article", "changes", "search"];

function cli(args, timeout = 240000) {
  return spawnSync(process.execPath, [CLI, ...args], { cwd: REPO, encoding: "utf8", timeout });
}

test("the design-system package is ready with every contrast pair passing in both themes", () => {
  const result = checkDesignSystemPackage({ projectRoot: KIT });
  assert.equal(result.status, "ready", JSON.stringify(result.findings, null, 1));
  assert.deepEqual(result.tokenUse.unused.filter((name) => name !== "primary"), [], "only the primary alias may go unused");
  assert.ok(result.components.length >= 22, `components: ${result.components.join(", ")}`);
  for (const pair of result.contrast) assert.ok(pair.ratio >= pair.min, `${pair.text} on ${pair.on} (${pair.theme}) ${pair.ratio}`);
  assert.deepEqual([...new Set(result.contrast.map((pair) => pair.theme))], ["light", "dark"]);
});

test("DESIGN.md, MOTION.md and the package pass foundation check together", () => {
  const run = cli(["foundation", "check", "--kind", "all", "--project-root", path.relative(REPO, KIT)]);
  assert.equal(run.status, 0, run.stdout + run.stderr);
  assert.equal(JSON.parse(run.stdout).status, "ready");
});

test("generated templates, tokens.css and previews match build/build.cjs", () => {
  const run = spawnSync(process.execPath, [path.join(KIT, "build", "build.cjs"), "--check"], { encoding: "utf8" });
  assert.equal(run.status, 0, run.stderr);
});

test("every art slot names a task sheet and every task sheet is used", () => {
  const tasks = JSON.parse(fs.readFileSync(path.join(KIT, "art-tasks", "tasks.json"), "utf8")).tasks.map((t) => t.id);
  const used = new Set();
  for (const page of PAGES) {
    for (const m of fs.readFileSync(path.join(TEMPLATES, `${page}.html`), "utf8").matchAll(/data-task="([^"]+)"/g)) used.add(m[1]);
  }
  for (const id of used) {
    assert.ok(tasks.includes(id), `slot task ${id} has no entry in tasks.json`);
    assert.ok(fs.existsSync(path.join(KIT, "art-tasks", `${id}.md`)), `slot task ${id} has no sheet`);
  }
  for (const id of tasks) assert.ok(used.has(id), `task ${id} is not used by any slot`);
});

test("templates are self-contained: no remote assets and every local link resolves", () => {
  for (const page of PAGES) {
    const html = fs.readFileSync(path.join(TEMPLATES, `${page}.html`), "utf8");
    for (const m of html.matchAll(/\s(?:src|href)="([^"#][^"]*)"/g)) {
      const ref = m[1];
      assert.ok(!/^[a-z]+:\/\//i.test(ref) && !ref.startsWith("//"), `${page}: remote reference ${ref}`);
      if (ref.startsWith("mailto:")) continue;
      assert.ok(fs.existsSync(path.resolve(TEMPLATES, ref.split(/[?#]/)[0])), `${page}: ${ref} does not exist`);
    }
    for (const m of html.matchAll(/<use href="#(i-[a-zA-Z]+)"/g)) assert.ok(html.includes(`<symbol id="${m[1]}"`), `${page}: icon ${m[1]} missing from the sprite`);
    assert.match(html, /<a class="at-skip"[^>]*href="#main"/, `${page}: skip link`);
    assert.equal((html.match(/<h1\b/g) || []).length, 1, `${page}: exactly one h1`);
  }
  for (const file of ["kit.js", "../design-system/components/bundle.css"]) {
    const text = fs.readFileSync(path.join(TEMPLATES, file), "utf8");
    assert.doesNotMatch(text, /(?:src|href|url)\(?\s*["']?https?:\/\/(?!www\.w3\.org)/i, `${file} loads a remote resource`);
  }
});

test("showcase previews and the cover carry no art: every preview slot is an empty frame", () => {
  const components = path.join(KIT, "design-system", "components");
  for (const comp of fs.readdirSync(components)) {
    const file = path.join(components, comp, "preview.html");
    if (!fs.existsSync(file)) continue;
    const html = fs.readFileSync(file, "utf8");
    assert.doesNotMatch(html, /<img\b|<picture\b|<video\b|<image\b/i, `${comp} preview embeds a picture`);
  }
});

function browserEnvironment() {
  try { require.resolve("puppeteer-core/package.json", { paths: [REPO] }); } catch { return "puppeteer-core is not installed"; }
  try { require("../skill/scripts/browser-locate.cjs").resolveBrowser(); } catch { return "no headless Chrome, Edge or Chromium"; }
  return false;
}
const skip = browserEnvironment();

// `template check` loads a file path, so it cannot add ?notice=0. The home page is checked as a returning
// visitor sees it: a temporary copy of the kit whose home.html first records the notice and the onboarding
// toast as already seen. Without that, the first-visit notice dialog covers the page it is measuring.
function returningVisitorCopy() {
  const dir = fs.mkdtempSync(path.join(require("node:os").tmpdir(), "at-kit-"));
  for (const sub of ["templates", "design-system"]) fs.cpSync(path.join(KIT, sub), path.join(dir, sub), { recursive: true });
  const home = path.join(dir, "templates", "home.html");
  const html = fs.readFileSync(home, "utf8");
  const seeded = html.replace("<head>", '<head><script>try{localStorage.setItem("at-notice","v2.4.0");localStorage.setItem("at-guided","1")}catch(e){}</script>');
  assert.notEqual(seeded, html, "home.html has no <head> to seed");
  fs.writeFileSync(home, seeded);
  return { dir, home };
}

for (const [page, size] of [["home", null], ["entity", "390x4800"]]) {
  test(`template check --browser passes on ${page}${size ? ` at ${size}` : ""}`, { skip, timeout: 300000 }, (t) => {
    let file = path.join(TEMPLATES, `${page}.html`);
    if (page === "home") {
      const copy = returningVisitorCopy();
      t.after(() => fs.rmSync(copy.dir, { recursive: true, force: true }));
      file = copy.home;
    }
    const args = ["template", "check", page === "home" ? file : path.relative(REPO, file), "--browser"];
    if (page === "home") args.push("--root", path.resolve(file, "..", ".."));
    if (size) args.push("--size", size);
    const run = cli(args, 280000);
    const result = JSON.parse(run.stdout);
    assert.equal(result.status, "passed", JSON.stringify(result.findings, null, 1));
    assert.equal(run.status, 0);
  });
}

// Interaction checks on kit.js, driven through puppeteer-core. ?notice=0 / ?notice=1 are explicit; the
// no-parameter case is the real first-visit path.
const homeUrl = (query = "") => require("node:url").pathToFileURL(path.join(TEMPLATES, "home.html")).href + query;

async function withPage(fn) {
  const puppeteer = require(require.resolve("puppeteer-core", { paths: [REPO] }));
  const { resolveBrowser } = require("../skill/scripts/browser-locate.cjs");
  const resolved = resolveBrowser();
  const executablePath = typeof resolved === "string" ? resolved : resolved.executablePath || resolved.path;
  const args = typeof process.getuid === "function" && process.getuid() === 0 ? ["--no-sandbox"] : [];
  const browser = await puppeteer.launch({ executablePath, headless: true, args, timeout: 120000 });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });
    await fn(page);
  } finally {
    await browser.close();
  }
}

test("a suggestion pressed for 400 ms and then released still navigates", { skip, timeout: 120000 }, async () => {
  await withPage(async (page) => {
    await page.goto(homeUrl("?notice=0"), { waitUntil: "load" });
    await page.type(".at-topbar .at-search__input", "白砾");
    await page.waitForSelector(".at-topbar .at-suggest:not([hidden]) a");
    const box = await (await page.$(".at-topbar .at-suggest a")).boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await new Promise((resolve) => setTimeout(resolve, 400));
    assert.equal(await page.$eval(".at-topbar .at-suggest", (el) => el.hidden), false, "list closed while the suggestion was pressed");
    await Promise.all([page.waitForNavigation({ waitUntil: "load" }), page.mouse.up()]);
    assert.match(page.url(), /entity\.html/);
  });
});

test("the version notice: ?notice=0 suppresses it, ?notice=1 forces it, a first visit shows it once", { skip, timeout: 120000 }, async () => {
  await withPage(async (page) => {
    const open = () => page.$eval("dialog#notice", (el) => el.open);
    const settle = () => new Promise((resolve) => setTimeout(resolve, 900));
    await page.goto(homeUrl("?notice=0"), { waitUntil: "load" });
    await settle();
    assert.equal(await open(), false, "?notice=0 still opened the notice");
    assert.equal(await page.$$eval("[data-toasts] li", (items) => items.length), 0, "?notice=0 still showed the onboarding toast");
    await page.goto(homeUrl("?notice=1"), { waitUntil: "load" });
    await settle();
    assert.equal(await open(), true, "?notice=1 did not open the notice");
    await page.goto(homeUrl(), { waitUntil: "load" });
    await page.evaluate(() => { try { localStorage.clear(); } catch { /* private mode */ } });
    await page.goto(homeUrl(), { waitUntil: "load" });
    await settle();
    assert.equal(await open(), true, "first visit did not auto-show the notice");
    await page.click(".at-modal__close");
    await page.goto(homeUrl(), { waitUntil: "load" });
    await settle();
    assert.equal(await open(), false, "the notice came back after it was dismissed");
  });
});

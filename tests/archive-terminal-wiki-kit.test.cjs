"use strict";

// The archive-terminal wiki kit example: its design-system package and foundations are ready, its generated
// files are current, every art slot has a task sheet, templates stay self-contained, and (where headless
// Chrome and the CJK fonts are installed) its pages pass the browser half of `template check`.

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
  const fonts = spawnSync("fc-list", [":", "family"], { encoding: "utf8" });
  if (fonts.status !== 0 || !fonts.stdout.includes("Noto Sans CJK SC")) return "Noto Sans CJK SC is not installed";
  return false;
}
const skip = browserEnvironment();

for (const [page, size] of [["home", null], ["entity", "390x4800"]]) {
  test(`template check --browser passes on ${page}${size ? ` at ${size}` : ""}`, { skip, timeout: 300000 }, () => {
    const args = ["template", "check", path.relative(REPO, path.join(TEMPLATES, `${page}.html`)), "--browser"];
    if (size) args.push("--size", size);
    const run = cli(args, 280000);
    const result = JSON.parse(run.stdout);
    assert.equal(result.status, "passed", JSON.stringify(result.findings, null, 1));
    assert.equal(run.status, 0);
  });
}

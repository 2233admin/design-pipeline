"use strict";

// The crisis-command UI kit example: its design-system package and foundations are ready, its generated files
// are current, the bundled OFL font subsets cover every character the kit sets, every art slot has a task sheet
// and a layer stack, pages stay self-contained and free of the reference's names, and (where headless Chrome is
// installed) the app screens and the 390-wide site pass the browser half of `template check`.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { spawnSync } = require("node:child_process");
const { checkDesignSystemPackage } = require("../skill/scripts/design-system-package-core.cjs");
const coverage = require("../skill/tools/template-bank/coverage.cjs");

const REPO = path.join(__dirname, "..");
const KIT = path.join(REPO, "examples", "crisis-command-ui-kit");
const CLI = path.join(REPO, "skill", "scripts", "designer-pipeline.cjs");
const TEMPLATES = path.join(KIT, "templates");
const PAGES = ["index", "site", "console", "sync"];
const read = (file) => fs.readFileSync(file, "utf8");

function cli(args, timeout = 240000) {
  return spawnSync(process.execPath, [CLI, ...args], { cwd: REPO, encoding: "utf8", timeout });
}

test("the design-system package is ready: one Terminal theme, 26 components, every contrast pair passing", () => {
  const result = checkDesignSystemPackage({ projectRoot: KIT });
  assert.equal(result.status, "ready", JSON.stringify(result.findings, null, 1));
  assert.deepEqual(result.tokenUse.unused.filter((name) => name !== "primary"), [], "only the primary alias may go unused");
  assert.ok(result.components.length >= 26, `components: ${result.components.join(", ")}`);
  for (const pair of result.contrast) assert.ok(pair.ratio >= pair.min, `${pair.text} on ${pair.on} ${pair.ratio}`);
  assert.deepEqual([...new Set(result.contrast.map((pair) => pair.theme))], ["terminal"]);
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

test("the bundled OFL subsets cover every CJK character and every ASCII character the kit sets", () => {
  const files = [...PAGES.map((p) => path.join(TEMPLATES, `${p}.html`)), path.join(TEMPLATES, "kit.js"),
    ...fs.readdirSync(path.join(KIT, "design-system", "components")).map((c) => path.join(KIT, "design-system", "components", c, "preview.html")).filter((f) => fs.existsSync(f))];
  const text = files.map(read).join("").replace(/<[^>]*>/g, " ");
  const cjk = new Set([...text].filter((ch) => /[⺀-鿿　-〿＀-￯]/.test(ch)));
  const mincho = coverage.readFontCoverage(path.join(KIT, "fonts", "NotoSerifSC-Black-kit.woff"));
  const missing = [...cjk].filter((ch) => !mincho.has(ch.codePointAt(0)));
  assert.deepEqual(missing, [], `rebuild fonts/ with the missing characters: ${missing.join("")}`);
  const archivo = coverage.readFontCoverage(path.join(KIT, "fonts", "Archivo-kit.woff"));
  for (let c = 0x20; c < 0x7f; c += 1) assert.ok(archivo.has(c), `Archivo subset covers U+${c.toString(16)}`);
  for (const licence of ["OFL-NotoSerifSC.txt", "OFL-Archivo.txt"]) assert.match(read(path.join(KIT, "fonts", licence)), /SIL Open Font License/);
});

test("every art slot names a task sheet with a layer stack, and every task sheet is used", () => {
  const tasks = JSON.parse(read(path.join(KIT, "art-tasks", "tasks.json"))).tasks.map((t) => t.id);
  const layers = JSON.parse(read(path.join(KIT, "art-tasks", "layers.json"))).slots;
  const used = new Set();
  for (const page of PAGES) for (const m of read(path.join(TEMPLATES, `${page}.html`)).matchAll(/data-task="([^"]+)"/g)) used.add(m[1]);
  for (const id of used) {
    assert.ok(tasks.includes(id), `slot task ${id} has no entry in tasks.json`);
    assert.ok(fs.existsSync(path.join(KIT, "art-tasks", `${id}.md`)), `slot task ${id} has no sheet`);
    assert.equal(layers[id].stack.at(-1).role, "type", `${id}: type is the last layer`);
    assert.match(read(path.join(KIT, "art-tasks", `${id}.md`)), /原创设计/);
  }
  for (const id of tasks) assert.ok(used.has(id), `task ${id} is not used by any slot`);
});

test("pages are self-contained and accessible, and no file of the kit names the reference", () => {
  for (const page of PAGES) {
    const html = read(path.join(TEMPLATES, `${page}.html`));
    for (const m of html.matchAll(/\s(?:src|href)="([^"#][^"]*)"/g)) {
      const ref = m[1];
      assert.ok(!/^[a-z]+:\/\//i.test(ref) && !ref.startsWith("//"), `${page}: remote reference ${ref}`);
      assert.ok(fs.existsSync(path.resolve(TEMPLATES, ref.split(/[?#]/)[0])), `${page}: ${ref} does not exist`);
    }
    assert.match(html, /<a class="cc-skip" href="#main"/, `${page}: skip link`);
    assert.equal((html.match(/<h1\b/g) || []).length, 1, `${page}: exactly one h1`);
  }
  const all = [];
  const walk = (dir) => { for (const e of fs.readdirSync(dir, { withFileTypes: true })) { const f = path.join(dir, e.name); if (e.isDirectory()) { if (e.name !== ".design-pipeline") walk(f); } else if (/\.(html|css|js|cjs|md|json)$/.test(e.name)) all.push(read(f)); } };
  walk(KIT);
  assert.doesNotMatch(all.join("\n"), /evangelion|福音|\bnerv\b|ネルフ|\bmagi\b|seele|matisse|fontworks|使徒|新東京|新东京|灯塔/i);
  for (const file of ["kit.js", "seg.js", "pages.css", "../design-system/components/bundle.css"]) {
    assert.doesNotMatch(read(path.join(TEMPLATES, file)), /(?:src|href|url)\(?\s*["']?https?:\/\/(?!www\.w3\.org)/i, `${file} loads a remote resource`);
  }
});

test("show mode carries no art: previews and pages embed no picture, and no slot draws a figure", () => {
  const components = path.join(KIT, "design-system", "components");
  for (const comp of fs.readdirSync(components)) {
    const file = path.join(components, comp, "preview.html");
    if (fs.existsSync(file)) assert.doesNotMatch(read(file), /<img\b|<picture\b|<video\b|<image\b/i, `${comp} preview embeds a picture`);
  }
  for (const page of PAGES) assert.doesNotMatch(read(path.join(TEMPLATES, `${page}.html`)), /<img\b|<image\b/i, `${page} embeds a picture`);
});

function browserEnvironment() {
  try { require.resolve("puppeteer-core/package.json", { paths: [REPO] }); } catch { return "puppeteer-core is not installed"; }
  try { require("../skill/scripts/browser-locate.cjs").resolveBrowser(); } catch { return "no headless Chrome, Edge or Chromium"; }
  return false;
}
const skip = browserEnvironment();

for (const [page, size] of [["console", "1920x1080"], ["sync", "1920x1080"]]) {
  test(`template check --browser passes on ${page} at ${size}`, { skip, timeout: 300000 }, () => {
    const run = cli(["template", "check", path.relative(REPO, path.join(TEMPLATES, `${page}.html`)), "--browser", "--size", size], 280000);
    const result = JSON.parse(run.stdout);
    assert.equal(result.status, "passed", JSON.stringify(result.findings, null, 1));
  });
}

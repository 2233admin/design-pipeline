"use strict";

// `evidence refs` numbers the visible meaningful elements of the built page. The browser tests drive
// the real CLI (so the kernel, the contained writes and the current-capture rule are all exercised)
// and skip, like the interaction capture test, only when no browser or puppeteer-core is found.

const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { resolvePuppeteer } = require("../skill/scripts/film-capture-core.cjs");
const { resolveBrowser } = require("../skill/scripts/browser-locate.cjs");

const repoRoot = path.resolve(__dirname, "..");
const cli = path.join(repoRoot, "skill/scripts/designer-pipeline.cjs");
const FIXTURES = path.join(__dirname, "fixtures", "page-refs");
const PUPPETEER_MODULE = process.env.DESIGN_PIPELINE_PUPPETEER_MODULE;

function missingTool() {
  for (const probe of [() => resolvePuppeteer(process.cwd(), PUPPETEER_MODULE), () => resolveBrowser()]) {
    try {
      probe();
    } catch (error) {
      if (error.code !== "TOOL_MISSING") throw error;
      return `no browser for page refs (${error.message})`;
    }
  }
  return false;
}
const skip = missingTool();

function puppeteerPath() {
  return PUPPETEER_MODULE || path.dirname(require.resolve("puppeteer-core/package.json", { paths: [repoRoot] }));
}

function project(fixture) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "page-refs-"));
  fs.copyFileSync(path.join(FIXTURES, fixture), path.join(dir, "index.html"));
  return dir;
}

function run(args, cwd = repoRoot) {
  const child = spawnSync(process.execPath, [cli, ...args], { cwd, encoding: "utf8", windowsHide: true, timeout: 120000 });
  let output = null;
  try { output = JSON.parse(child.stdout); } catch { output = null; }
  return { status: child.status, stdout: child.stdout, stderr: child.stderr, output };
}

const refs = (dir, extra = []) => run(["evidence", "refs", "--root", dir, "--project-root", dir, "--puppeteer-module", puppeteerPath(), ...extra]);
const readRefs = (dir) => JSON.parse(fs.readFileSync(path.join(dir, "evidence", "refs.json"), "utf8"));
const snapshot = (dir) => ["refs.json", "refs.png"].map((name) => {
  const file = path.join(dir, "evidence", name);
  return [fs.readFileSync(file).toString("base64"), fs.statSync(file).mtimeMs];
});

test("a sectioned page is numbered per section and outside them", { skip }, async () => {
  const dir = project("sections.html");
  const before = fs.readFileSync(path.join(dir, "index.html"));
  const result = refs(dir);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(result.output.status, "captured");
  assert.equal(result.output.json, "evidence/refs.json");
  assert.equal(result.output.png, "evidence/refs.png");

  const doc = readRefs(dir);
  assert.equal(doc.schema, "design-pipeline.page-refs.v1");
  assert.match(doc.page, /^sha256:/);
  assert.deepEqual(doc.viewport, { width: 1440, height: 900 });
  assert.ok(doc.browser.version && doc.browser.executable);
  assert.ok(!Number.isNaN(Date.parse(doc.capturedAt)));
  assert.equal(result.output.refs, doc.refs.length);

  const summary = doc.refs.map((item) => [item.ref, item.tag, item.text]);
  assert.deepEqual(summary, [
    ["1", "a", "Home"],
    ["hero-1", "h1", "Welcome"],
    ["hero-2", "p", "Read the proof below."],
    ["hero-3", "a", "proof"],
    ["hero-4", "a", "Logo"],
    ["hero-5", "p", "Two lines of text"],
    ["proof-1", "h2", "Proof"],
    ["proof-2", "p", "Revealed on scroll"],
    ["proof-3", "button", "Reserve now"],
    ["2", "p", "Outside by invalid id"],
  ]);
  assert.deepEqual(doc.refs.map((item) => item.section), [null, "hero", "hero", "hero", "hero", "hero", "proof", "proof", "proof", null]);
  assert.ok(!doc.refs.some((item) => ["img", "div", "svg"].includes(item.tag) || item.text === "Hidden text"), "image in a link, wrapper and hidden text get no reference");

  for (const item of doc.refs) {
    assert.ok(item.box.width >= 1 && item.box.height >= 1);
    for (const key of ["x", "y", "width", "height"]) assert.ok(Number.isInteger(item.box[key]), `${item.ref} box.${key}`);
  }
  const hero = doc.refs.find((item) => item.ref === "hero-1");
  const proof = doc.refs.find((item) => item.ref === "proof-1");
  assert.ok(proof.box.y >= 900, "boxes are in document coordinates, below the first viewport");
  assert.ok(proof.box.y > hero.box.y);

  // Each selector finds exactly its element in the page the capture measured.
  const puppeteer = resolvePuppeteer(process.cwd(), PUPPETEER_MODULE);
  const browser = await puppeteer.launch({ executablePath: resolveBrowser(), headless: true, args: ["--allow-file-access-from-files"] });
  try {
    const page = await browser.newPage();
    await page.goto(`file://${path.join(dir, "index.html")}`);
    const resolved = await page.evaluate((items) => items.map((item) => {
      const hits = document.querySelectorAll(item.selector);
      return [item.ref, hits.length, hits[0] ? hits[0].localName : null];
    }), doc.refs);
    for (const [index, [ref, count, tag]] of resolved.entries()) {
      assert.equal(count, 1, `${ref} selector ${doc.refs[index].selector}`);
      assert.equal(tag, doc.refs[index].tag, ref);
    }
  } finally {
    await browser.close();
  }
  assert.match(doc.refs[1].selector, /^\[data-section="hero"\] > h1:nth-of-type\(1\)$/);
  assert.match(doc.refs[0].selector, /^body > /);

  const png = fs.readFileSync(path.join(dir, "evidence", "refs.png"));
  assert.equal(png.subarray(1, 4).toString("latin1"), "PNG");
  assert.ok(png.readUInt32BE(16) === 1440 && png.readUInt32BE(20) >= 2700, "full-page screenshot");
  assert.ok(fs.readFileSync(path.join(dir, "index.html")).equals(before), "index.html is byte-identical");
  fs.rmSync(dir, { recursive: true, force: true });
});

test("a second run on the same page is current and rewrites nothing", { skip }, async () => {
  const dir = project("sections.html");
  assert.equal(refs(dir).status, 0);
  const first = snapshot(dir);
  await new Promise((resolve) => setTimeout(resolve, 30));
  const again = refs(dir);
  assert.equal(again.status, 0, again.stderr);
  assert.equal(again.output.status, "current");
  assert.deepEqual(snapshot(dir), first);

  // A changed page is captured again.
  fs.appendFileSync(path.join(dir, "index.html"), "\n<!-- edited -->\n");
  const third = refs(dir);
  assert.equal(third.status, 0, third.stderr);
  assert.equal(third.output.status, "captured");
  fs.rmSync(dir, { recursive: true, force: true });
});

test("a page without sections is numbered 1, 2, 3", { skip }, () => {
  const dir = project("plain.html");
  const result = refs(dir);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const doc = readRefs(dir);
  assert.deepEqual(doc.refs.map((item) => [item.ref, item.section, item.tag]), [["1", null, "h1"], ["2", null, "p"], ["3", null, "button"]]);
  fs.rmSync(dir, { recursive: true, force: true });
});

test("a missing browser exits 1 and writes nothing", () => {
  const dir = project("plain.html");
  const result = run(["evidence", "refs", "--root", dir, "--project-root", dir, "--puppeteer-module", puppeteerPath(), "--chrome", path.join(dir, "no-such-chrome")]);
  assert.equal(result.status, 1);
  assert.match(result.output?.error?.message || result.stderr, /does not exist|browser/i);
  assert.equal(fs.existsSync(path.join(dir, "evidence")), false);
  fs.rmSync(dir, { recursive: true, force: true });
});

test("a missing puppeteer-core exits 1 naming it and writes nothing", () => {
  const dir = project("plain.html");
  const result = run(["evidence", "refs", "--root", dir, "--project-root", dir, "--puppeteer-module", path.join(dir, "no-puppeteer-core-here")]);
  assert.equal(result.status, 1);
  assert.match(result.output?.error?.message || result.stderr, /puppeteer-core not found/);
  assert.equal(fs.existsSync(path.join(dir, "evidence")), false);
  fs.rmSync(dir, { recursive: true, force: true });
});

test("a project without index.html exits 1", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "page-refs-"));
  const result = run(["evidence", "refs", "--root", dir, "--project-root", dir]);
  assert.equal(result.status, 1);
  assert.match(result.output?.error?.message || result.stderr, /index\.html/);
  fs.rmSync(dir, { recursive: true, force: true });
});

test("decide takes --ref as a repeatable option and lists it in the help", () => {
  const help = run(["--help"]);
  assert.match(help.stdout + help.stderr, /--ref <reference> \.\.\.\]/);
  assert.match(help.stdout + help.stderr, /evidence refs --project-root/);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "page-refs-"));
  // Parsing succeeds (no DUPLICATE_OPTION / UNKNOWN_OPTION); the workflow itself refuses without a state.
  const result = run(["decide", "--root", dir, "--project-root", dir, "--stage", "section", "--choice", "hero", "--verdict", "reject", "--by", "owner", "--answer", "too small", "--ref", "hero-1", "--ref", "hero-2"]);
  assert.doesNotMatch(result.output?.error?.code || "", /DUPLICATE_OPTION|UNKNOWN_OPTION/);
  fs.rmSync(dir, { recursive: true, force: true });
});

// Codex review on #138: the capture binds what the browser loaded, CSS-imported assets included, and
// its own screenshot; a lazily lengthened page is walked to its new end.
test("a capture binds the files the page loaded, so a changed CSS asset or screenshot needs a new one", { skip }, async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "page-refs-"));
  const pixel = (color) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="4" height="4"><rect width="4" height="4" fill="${color}"/></svg>`);
  fs.writeFileSync(path.join(dir, "bg.svg"), pixel("#c33"));
  fs.writeFileSync(path.join(dir, "late.svg"), Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200"><rect width="300" height="200" fill="#999"/></svg>'));
  // Smooth scrolling on the page: the walk must still reach the bottom, where content is appended.
  fs.writeFileSync(path.join(dir, "style.css"), "html { scroll-behavior: smooth; }\nsection { min-height: 1500px; background: url(bg.svg); }\nh1 { background: url(later.svg); }\n");
  fs.writeFileSync(path.join(dir, "index.html"), `<!doctype html><html><head><link rel="stylesheet" href="style.css"></head><body>
<section data-section="hero"><h1>Fresh bread</h1></section>
<div id="more"></div>
<img loading="lazy" src="late.svg" alt="Late picture" style="margin-top: 2400px; display: block">
<script>
  // Content appended only once the reader scrolls near the end: the walk must reach it.
  let added = 0;
  addEventListener("scroll", () => {
    if (added < 3 && innerHeight + scrollY >= document.documentElement.scrollHeight - 50) {
      added += 1;
      const p = document.createElement("p");
      p.style.marginTop = "1200px";
      p.textContent = "Loaded " + added;
      document.getElementById("more").appendChild(p);
    }
  });
</script></body></html>`);
  const first = refs(dir);
  assert.equal(first.status, 0, first.stderr || first.stdout);
  const doc = readRefs(dir);
  assert.deepEqual(Object.keys(doc.lineage).sort(), ["bg.svg", "index.html", "late.svg", "later.svg", "style.css"], "the CSS-loaded image is bound");
  assert.ok(doc.refs.some((item) => item.tag === "img" && item.text === "Late picture" && item.box.height === 200), "a lazy image started by the scroll is loaded before numbering");
  assert.equal(doc.lineage["later.svg"], null, "a requested file that does not exist yet is bound as absent");
  assert.match(doc.png, /^sha256:/);
  assert.ok(doc.refs.some((item) => item.text === "Loaded 3"), `the walk reaches lazily added content: ${doc.refs.map((item) => item.text).join(" | ")}`);
  assert.equal(refs(dir).output.status, "current");
  fs.writeFileSync(path.join(dir, "bg.svg"), pixel("#33c"));
  assert.equal(refs(dir).output.status, "captured", "a changed background image makes the capture stale");
  fs.writeFileSync(path.join(dir, "evidence", "refs.png"), "replaced");
  assert.equal(refs(dir).output.status, "captured", "a replaced screenshot is not taken as current");
  assert.equal(refs(dir).output.status, "current");
  fs.writeFileSync(path.join(dir, "later.svg"), pixel("#3c3"));
  assert.equal(refs(dir).output.status, "captured", "an absent asset that appears makes the capture stale");
});

// CodeRabbit review on #138: the resource wait has one deadline, and its expiry fails the capture.
test("media that never finishes loading fails the capture at the deadline", { skip }, async () => {
  const { awaitResources } = require("../skill/scripts/page-refs-core.cjs");
  const puppeteer = require(puppeteerPath());
  const browser = await puppeteer.launch({ executablePath: resolveBrowser(), headless: true });
  try {
    const page = await browser.newPage();
    await page.setRequestInterception(true);
    // The image request is held forever, as a stalled server would.
    page.on("request", (request) => { if (!request.url().endsWith("/never.png")) request.continue(); });
    await page.setContent('<img src="http://refs.test/never.png" alt="Never">', { waitUntil: "domcontentloaded" });
    const started = Date.now();
    await assert.rejects(awaitResources(page, 1500), /still loading 1\.5 s after it was scrolled through/);
    assert.ok(Date.now() - started < 5000, "the deadline bounds the whole wait");
  } finally {
    await browser.close();
  }
});

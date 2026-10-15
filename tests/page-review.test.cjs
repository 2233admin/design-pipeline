"use strict";

// The review page's overlay (owner-attention-page-review): in a real browser, a click inside a numbered
// element in comment mode comments on its reference, the page's own click handler never sees it, and
// one submit produces the block decide records. Skips only when no browser or puppeteer-core is found.

const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { resolvePuppeteer } = require("../skill/scripts/film-capture-core.cjs");
const { resolveBrowser } = require("../skill/scripts/browser-locate.cjs");
const { SCHEMA, reviewHtml } = require("../skill/scripts/workflows/page-review.cjs");

const ROOT = path.resolve(__dirname, "..");

function browserTools() {
  try { return { puppeteer: resolvePuppeteer(ROOT, process.env.DESIGN_PIPELINE_PUPPETEER_MODULE), chrome: resolveBrowser() }; }
  catch (error) { if (error.code !== "TOOL_MISSING") throw error; return { skip: `browser is unavailable: ${error.message}` }; }
}
const BROWSER = browserTools();

const PAGE = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><link rel="stylesheet" href="style.css"></head><body>
<section data-section="hero"><h1>Fresh bread</h1><a href="#visit" class="cta"><span>Reserve</span> a loaf</a></section>
<section data-section="visit" id="visit"><p>Open daily</p></section>
<script>window.pageClicks = 0; document.addEventListener("click", () => { window.pageClicks += 1; });</script>
</body></html>
`;
const DATA = {
  schema: SCHEMA, page: "sha256:" + "a".repeat(64), capture: "sha256:" + "b".repeat(64), ask: { stage: "section", choice: "hero" },
  refs: {
    desktop: [
      { ref: "hero-1", selector: "[data-section=\"hero\"] > h1:nth-of-type(1)" },
      { ref: "hero-2", selector: "[data-section=\"hero\"] > a:nth-of-type(1)" },
    ],
    mobile: [],
  },
};

function project(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "page-review-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  fs.writeFileSync(path.join(dir, "index.html"), PAGE);
  fs.writeFileSync(path.join(dir, "style.css"), "h1 { color: rgb(200, 0, 0); }\n");
  fs.mkdirSync(path.join(dir, "evidence"));
  fs.writeFileSync(path.join(dir, "evidence", "review.html"), reviewHtml(PAGE, DATA));
  return dir;
}

const act = (page, name) => page.evaluate(which => document.querySelector("dp-page-review").shadowRoot.querySelector(`[data-act="${which}"]`).click(), name);
const shadow = (page, selector, what = "value") => page.evaluate((sel, prop) => document.querySelector("dp-page-review").shadowRoot.querySelector(sel)[prop], selector, what);
const typeInto = (page, selector, text) => page.evaluate((sel, value) => { document.querySelector("dp-page-review").shadowRoot.querySelector(sel).value = value; }, selector, text);

test("the review copy loads the page's files and leaves the page's markup in place", () => {
  const html = reviewHtml(PAGE, DATA);
  assert.match(html, /<head><base href="\.\.\/"><meta charset/);
  assert.ok(html.indexOf("<script>\n") > html.indexOf("window.pageClicks"), "the overlay comes after the page's own scripts");
  assert.ok(html.trimEnd().endsWith("</body></html>"));
  assert.doesNotMatch(html, /var DATA = __DATA__/);
  const tricky = reviewHtml("<html><body></body></html>", { ...DATA, ask: { stage: "section", choice: "</script><b>x" } });
  assert.doesNotMatch(tricky, /<\/script><b>/, "data cannot close the overlay's script");
});

test("a click inside a numbered element comments on its reference, and one submit gives the block", { skip: BROWSER.skip, timeout: 120000 }, async t => {
  const dir = project(t);
  const browser = await BROWSER.puppeteer.launch({ executablePath: BROWSER.chrome, headless: true, args: ["--allow-file-access-from-files"] });
  t.after(() => browser.close());
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto(pathToFileURL(path.join(dir, "evidence", "review.html")).href, { waitUntil: "load" });
  assert.equal(await page.$eval("h1", node => getComputedStyle(node).color), "rgb(200, 0, 0)", "the page's stylesheet loads through the base");

  // Outside comment mode the page works as usual.
  await page.click("[data-section=\"visit\"] p");
  assert.equal(await page.evaluate(() => window.pageClicks), 1);

  await act(page, "mode");
  await page.click(".cta span");
  assert.equal(await page.evaluate(() => window.pageClicks), 1, "comment mode keeps the click from the page");
  assert.match(await shadow(page, "[data-target]", "textContent"), /hero-2/);
  await typeInto(page, "[data-text]", "Make the button larger");
  await act(page, "add");
  await page.click("[data-section=\"visit\"] p");
  assert.match(await shadow(page, "[data-target]", "textContent"), /Not on a numbered element/);
  await typeInto(page, "[data-text]", "Spacing feels tight");
  await act(page, "add");

  await act(page, "accept");
  assert.match(await shadow(page, "[data-problem]", "textContent"), /Remove the comments/, "an acceptance carries no comments");
  assert.equal(await shadow(page, "[data-out]", "hidden"), true);

  await act(page, "reject");
  const block = JSON.parse(await shadow(page, "[data-block]"));
  assert.equal(block.schema, SCHEMA);
  assert.equal(block.page, DATA.page);
  assert.equal(block.capture, DATA.capture);
  assert.deepEqual(block.ask, DATA.ask);
  assert.equal(block.verdict, "reject");
  assert.deepEqual(block.comments, [{ ref: "hero-2", text: "Make the button larger" }, { ref: null, text: "Spacing feels tight" }]);

  // The pending comments survive a reload of the same page version.
  await page.reload({ waitUntil: "load" });
  assert.equal(await page.evaluate(() => document.querySelector("dp-page-review").shadowRoot.querySelectorAll("[data-list] li").length), 2);
});

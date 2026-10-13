"use strict";

// The prototype variant switcher (skill/tools/variant-switcher/variant-switcher.js) in a real browser:
// ?variant= selection (default, case-insensitive, unknown key), arrow clicks and ← → keys with
// wrap-around and URL rewrite, keys ignored while a form field has focus, a single toolbar host even
// when the script runs twice, and accessible names on the toolbar and its buttons.

const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { resolveChrome, resolvePuppeteer } = require("../skill/scripts/film-capture-core.cjs");

const repoRoot = path.resolve(__dirname, "..");
const SOURCE = fs.readFileSync(path.join(repoRoot, "skill/tools/variant-switcher/variant-switcher.js"), "utf8");
const HOST = "[data-variant-switcher]";
const OPTIONS = (tools) => ({ skip: tools.skip, timeout: 60_000 });

// Only a missing tool skips, with the resolver's reason; anything else thrown here is a bug.
function browserTools() {
  try {
    resolvePuppeteer(repoRoot, process.env.DESIGN_PIPELINE_PUPPETEER_MODULE);
    const puppeteerModule = process.env.DESIGN_PIPELINE_PUPPETEER_MODULE ? path.resolve(process.env.DESIGN_PIPELINE_PUPPETEER_MODULE) : require.resolve("puppeteer-core", { paths: [repoRoot] });
    return { chrome: resolveChrome(), puppeteerModule, skip: false };
  } catch (error) {
    if (error.code !== "TOOL_MISSING") throw error;
    return { skip: `no browser for the variant switcher (${error.message})` };
  }
}
const tools = browserTools();

const PAGE = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Variants</title></head><body>
<section data-variant="A" data-variant-name="Split hero"><h1>Alpha split hero</h1></section>
<section data-variant="B" data-variant-name="Stacked headline"><h1>Bravo stacked headline</h1></section>
<section data-variant="C" data-variant-name="Proof grid"><h1>Charlie proof grid</h1></section>
<label>Note <input id="field" type="text"></label>
<script>${SOURCE}</script>
</body></html>`;

let server, origin, browser;

test.before(async () => {
  server = http.createServer((req, res) => {
    if (req.method === "GET" && new URL(req.url, "http://localhost").pathname === "/") {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(PAGE);
    } else {
      res.writeHead(404, { "content-type": "text/plain" });
      res.end("not found");
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
  if (!tools.skip) browser = await require(tools.puppeteerModule).launch({ executablePath: tools.chrome, headless: true });
});

test.after(async () => {
  if (browser) await browser.close();
  if (server) await new Promise((resolve) => server.close(resolve));
});

// A fresh page at `query`; page errors are asserted absent when the test ends.
async function open(t, query = "") {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  t.after(async () => {
    await page.close();
    assert.deepEqual(errors, [], "the page threw");
  });
  await page.goto(`${origin}/${query}`, { waitUntil: "load" });
  return page;
}

const state = (page) => page.evaluate((host) => ({
  visible: [...document.querySelectorAll("[data-variant]")].filter((el) => !el.hidden).map((el) => el.getAttribute("data-variant")),
  label: document.querySelector(host).shadowRoot.querySelector("output").textContent,
  search: location.search,
  hosts: document.querySelectorAll(host).length,
}), HOST);

const LABELS = { A: "A (Split hero)", B: "B (Stacked headline)", C: "C (Proof grid)" };
async function assertShows(page, key, context = "") {
  const now = await state(page);
  assert.deepEqual(now.visible, [key], `visible ${context}`);
  assert.equal(now.label, LABELS[key], `label ${context}`);
  assert.equal(now.search, `?variant=${key}`, `search ${context}`);
}

const button = (page, step) => page.$(`${HOST} >>> button[data-step="${step}"]`);

test("with no query only the first variant shows and the URL records it", OPTIONS(tools), async (t) => {
  const page = await open(t);
  await assertShows(page, "A");
  assert.deepEqual(await page.evaluate(() => [...document.querySelectorAll("[data-variant]")].map((el) => el.hidden)), [false, true, true]);
});

test("?variant= picks a variant case-insensitively and an unknown key falls back to the first", OPTIONS(tools), async (t) => {
  await assertShows(await open(t, "?variant=c"), "C", "for ?variant=c");
  await assertShows(await open(t, "?variant=z"), "A", "for ?variant=z");
});

test("the arrow buttons cycle with wrap-around without navigating", OPTIONS(tools), async (t) => {
  const page = await open(t);
  await page.evaluate(() => { window.__marker = 1; });
  const next = await button(page, 1);
  for (const key of ["B", "C", "A"]) {
    await next.click();
    await assertShows(page, key, `after next → ${key}`);
  }
  await (await button(page, -1)).click();
  await assertShows(page, "C", "after previous from A");
  assert.equal(await page.evaluate(() => window.__marker), 1, "the page navigated");
});

test("ArrowRight and ArrowLeft cycle with wrap-around", OPTIONS(tools), async (t) => {
  const page = await open(t);
  assert.equal(await page.evaluate(() => document.activeElement === document.body), true);
  for (const key of ["B", "C", "A"]) {
    await page.keyboard.press("ArrowRight");
    await assertShows(page, key, `after ArrowRight → ${key}`);
  }
  await page.keyboard.press("ArrowLeft");
  await assertShows(page, "C", "after ArrowLeft from A");
});

test("the keys are ignored while a form field has focus", OPTIONS(tools), async (t) => {
  const page = await open(t);
  await page.focus("#field");
  const before = await state(page);
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowLeft");
  assert.deepEqual(await state(page), before);
  await assertShows(page, "A", "while the field is focused");
  await page.evaluate(() => document.activeElement.blur());
  await page.keyboard.press("ArrowRight");
  await assertShows(page, "B", "after blurring the field");
});

test("one toolbar host even when the script runs twice, with accessible names", OPTIONS(tools), async (t) => {
  const page = await open(t);
  assert.equal((await state(page)).hosts, 1);
  await page.addScriptTag({ content: SOURCE });
  assert.equal((await state(page)).hosts, 1, "a second run added another host");
  const toolbarLabel = await page.$eval(`${HOST} >>> [role="toolbar"]`, (el) => el.getAttribute("aria-label") || "");
  assert.notEqual(toolbarLabel.trim(), "", "the toolbar has no aria-label");
  for (const [step, name] of [[-1, /previous/i], [1, /next/i]]) {
    const handle = await button(page, step);
    assert.notEqual((await handle.evaluate((el) => el.getAttribute("aria-label") || "")).trim(), "", `button ${step} has no aria-label`);
    const node = await page.accessibility.snapshot({ root: handle });
    assert.equal(node?.role, "button", `button ${step} role`);
    assert.match(node?.name || "", name, `button ${step} accessible name`);
  }
});

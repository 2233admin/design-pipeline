"use strict";

// Numbered element references for the built page (`evidence refs`). The page is loaded over file://
// in the browser the interaction probe uses, settled by scrolling through it, measured, and drawn on
// with a badge layer that lives only in the browser: index.html is never written. This layer only
// measures and draws; the CLI decides whether a capture is still current and writes the files.

const fs = require("node:fs");
const path = require("node:path");
const { fileURLToPath, pathToFileURL } = require("node:url");
const { fail, sha256 } = require("./contract-utils.cjs");
const { resolvePuppeteer } = require("./film-capture-core.cjs");
const { browserIdentity, resolveBrowser } = require("./browser-locate.cjs");

const SCOPE = "page refs";
const REFS_SCHEMA = "design-pipeline.page-refs.v1";
const VIEWPORT = { width: 1440, height: 900 };
const SECTION_ID = /^[a-z0-9][a-z0-9-]*$/;
const TEXT_LIMIT = 80;
const NAVIGATION_TIMEOUT_MS = 30000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// The bytes of a file the page loaded: a hash, null while it does not exist, undefined for a
// directory or anything else that is not a file.
function fileHash(file) {
  let stat;
  try { stat = fs.statSync(file); } catch { return null; }
  return stat.isFile() ? "sha256:" + sha256(fs.readFileSync(file)) : undefined;
}

// Scrolls instantly, whatever scroll-behavior the page sets, and waits until the position is reached
// (or the page cannot scroll that far), so a smooth-scrolling page is not left halfway.
async function scrollToY(page, top) {
  await page.evaluate((y) => window.scrollTo({ top: y, left: 0, behavior: "instant" }), top);
  for (let waited = 0; waited < 1000; waited += 40) {
    const reached = await page.evaluate((y) => Math.abs(window.scrollY - Math.min(y, Math.max(0, document.documentElement.scrollHeight - window.innerHeight))) < 2, top);
    if (reached) break;
    await sleep(40);
  }
}

// puppeteer-core discovery stays in film-capture-core; only the wording is re-scoped, because a built
// page has no HyperFrames composition. The code stays TOOL_MISSING so a missing tool can be told
// from a broken capture.
function refsPuppeteer(dir, explicit) {
  try {
    return resolvePuppeteer(dir, explicit);
  } catch (error) {
    if (error.code !== "TOOL_MISSING") throw error;
    fail(SCOPE, "puppeteer-core not found. Fix: run `npm i puppeteer-core` in the project that holds the page, or pass --puppeteer-module <path to puppeteer-core>", { code: "TOOL_MISSING" });
  }
}

// Runs in the page. Returns the numbered elements in DOM order; nothing here changes the page.
// Everything it needs is passed in or defined inside, because the function is serialized.
function measureRefs(sectionIdSource, textLimit) {
  const sectionId = new RegExp(sectionIdSource);
  const TEXT = "h1,h2,h3,h4,h5,h6,p,li,blockquote,figcaption,label";
  const INTERACTIVE = 'a,button,input,select,textarea,summary,[role="button"],[role="link"]';
  const MEDIA = 'img,picture,video,[role="img"],svg';
  const candidates = document.querySelectorAll(`${TEXT},${INTERACTIVE},${MEDIA}`);

  const visible = (element) => {
    const box = element.getBoundingClientRect();
    if (box.width < 1 || box.height < 1) return false;
    const style = getComputedStyle(element);
    if (style.display === "none" || style.visibility === "hidden") return false;
    for (let node = element; node && node.nodeType === 1; node = node.parentElement) {
      if (Number(getComputedStyle(node).opacity) === 0) return false;
    }
    return true;
  };
  const clean = (value) => {
    const spaced = String(value || "").replace(/\s+/g, " ").replace(/[\u0000-\u001f\u007f-\u009f]/g, "").trim();
    const points = Array.from(spaced);
    return points.length > textLimit ? points.slice(0, textLimit).join("") : spaced;
  };
  const textOf = (element) => {
    const label = element.getAttribute("aria-label");
    if (element.matches(MEDIA)) return clean(element.getAttribute("alt") || label || element.getAttribute("title"));
    // A link or button that holds only an image or icon is named by what it holds.
    const inner = element.querySelector("[alt],[aria-label]");
    return clean(element.innerText || label || element.getAttribute("alt") || element.value || element.getAttribute("placeholder")
      || (inner && (inner.getAttribute("alt") || inner.getAttribute("aria-label"))));
  };
  const step = (element) => {
    let index = 1;
    for (let sibling = element.previousElementSibling; sibling; sibling = sibling.previousElementSibling) {
      if (sibling.localName === element.localName && sibling.namespaceURI === element.namespaceURI) index += 1;
    }
    return `${element.localName}:nth-of-type(${index})`;
  };
  const pathFrom = (root, element) => {
    const steps = [];
    for (let node = element; node && node !== root; node = node.parentElement) steps.unshift(step(node));
    return steps;
  };
  const sectionRoot = (element) => {
    const region = element.closest("[data-section]");
    const id = region ? region.getAttribute("data-section") : null;
    return region && sectionId.test(id) ? { region, id } : null;
  };

  const numbered = new Set();
  const counters = new Map();
  const found = [];
  const ancestorNumbered = (element) => {
    for (let node = element.parentElement; node; node = node.parentElement) if (numbered.has(node)) return true;
    return false;
  };
  for (const element of candidates) {
    // An svg inside another candidate (an icon in a button) is part of it, never a reference of its own.
    if (element.matches("svg") && element.parentElement && element.parentElement.closest(`${TEXT},${INTERACTIVE},${MEDIA}`)) continue;
    if (!visible(element)) continue;
    if (!element.matches(INTERACTIVE) && ancestorNumbered(element)) continue;
    numbered.add(element);
    const owner = sectionRoot(element);
    const key = owner ? owner.id : "";
    const count = (counters.get(key) || 0) + 1;
    counters.set(key, count);
    const box = element.getBoundingClientRect();
    let selector = null;
    if (owner) {
      const head = `[data-section="${CSS.escape(owner.id)}"]`;
      const tail = pathFrom(owner.region, element);
      selector = [head, ...tail].join(" > ");
    }
    const bodyPath = ["body", ...pathFrom(document.body, element)].join(" > ");
    const resolves = (css) => {
      try {
        const hits = document.querySelectorAll(css);
        return hits.length === 1 && hits[0] === element;
      } catch {
        return false;
      }
    };
    // A repeated section id makes the section path ambiguous; the body path is always unique.
    if (!selector || !resolves(selector)) selector = bodyPath;
    if (!resolves(selector)) throw new Error(`selector ${selector} does not resolve to the numbered element`);
    found.push({
      ref: owner ? `${owner.id}-${count}` : String(count),
      section: owner ? owner.id : null,
      selector,
      tag: element.localName,
      text: textOf(element),
      box: {
        x: Math.round(box.x + window.scrollX),
        y: Math.round(box.y + window.scrollY),
        width: Math.round(box.width),
        height: Math.round(box.height),
      },
    });
  }
  return found;
}

// Runs in the page, after measuring: one absolutely positioned layer in a shadow root, a badge at the
// top-left of each element in document coordinates. It is added last so no selector depends on it.
function drawBadges(refs) {
  const host = document.createElement("div");
  host.setAttribute("data-page-refs-layer", "");
  host.style.cssText = "position:absolute;left:0;top:0;width:0;height:0;margin:0;padding:0;border:0;overflow:visible;pointer-events:none;z-index:2147483647";
  document.body.appendChild(host);
  // A positioned body, or margins on it, shift the layer's origin away from the document's.
  const origin = host.getBoundingClientRect();
  const offsetX = origin.x + window.scrollX;
  const offsetY = origin.y + window.scrollY;
  const shadow = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = ".b{position:absolute;box-sizing:border-box;padding:2px 5px;border-radius:4px;background:#d6246e;color:#fff;font:700 12px/1.2 ui-monospace,Menlo,Consolas,monospace;white-space:nowrap;box-shadow:0 0 0 2px #fff}";
  shadow.appendChild(style);
  for (const item of refs) {
    const badge = document.createElement("span");
    badge.className = "b";
    badge.textContent = item.ref;
    badge.style.left = `${Math.max(0, item.box.x) - offsetX}px`;
    badge.style.top = `${Math.max(0, item.box.y) - offsetY}px`;
    shadow.appendChild(badge);
  }
}

// Scroll to the bottom in viewport steps and back so scroll-reveal content settles, then wait for
// fonts and transitions. Each step scrolls and waits before it re-reads the height, so content that
// loads or reveals on scroll lengthens the walk (bounded, for pages that grow without end).
async function settle(page) {
  const stepPx = VIEWPORT.height;
  // Smooth scrolling would leave each step mid-animation; the capture's own walk is always instant.
  await page.evaluate(() => {
    for (const element of [document.documentElement, document.body]) element?.style.setProperty("scroll-behavior", "auto", "important");
  });
  const positions = [];
  for (let y = 0, guard = 0; guard < 200; guard += 1) {
    await scrollToY(page, y);
    await sleep(120);
    positions.push(y);
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    if (y + stepPx >= height) break;
    y += stepPx;
  }
  for (const y of [...positions.slice(0, -1).reverse(), 0]) {
    await scrollToY(page, y);
    await sleep(120);
  }
  await page.evaluate(() => document.fonts.ready.then(() => true));
  await sleep(600);
}

// After the walk, wait (bounded) for what scrolling started: network idle as far as it comes, then
// every image loaded and decoded. An image still loading after the bound fails the capture rather
// than numbering an incomplete page.
async function awaitResources(page, timeoutMs = 10000) {
  await page.waitForNetworkIdle({ idleTime: 300, timeout: timeoutMs }).catch(() => {});
  const pending = await page.evaluate(async (ms) => {
    const loading = [...document.images].filter((img) => !img.complete);
    const settled = Promise.all(loading.map((img) => new Promise((done) => {
      img.addEventListener("load", done, { once: true });
      img.addEventListener("error", done, { once: true });
    })));
    await Promise.race([settled, new Promise((done) => setTimeout(done, ms))]);
    await Promise.all([...document.images].filter((img) => img.complete && img.naturalWidth > 0).map((img) => img.decode().catch(() => {})));
    return [...document.images].filter((img) => !img.complete).length;
  }, timeoutMs);
  if (pending) fail(SCOPE, `${pending} image(s) were still loading ${timeoutMs / 1000} s after the page was scrolled through. Fix: make the page's images load locally and promptly, then run \`evidence refs\` again`);
}

// Browser work for one capture. The caller supplies `digest` (the page digest function) so the page
// version is read before and after, and a page that moved under the capture writes nothing.
async function captureRefs(projectRoot, options = {}) {
  const file = path.join(projectRoot, "index.html");
  if (!fs.existsSync(file)) fail(SCOPE, `index.html not found in ${projectRoot}. Fix: build the page before numbering it`);
  const digest = options.digest;
  const before = digest(projectRoot);
  const puppeteer = refsPuppeteer(projectRoot, options.puppeteerModule);
  const executablePath = resolveBrowser(options.chrome);
  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ["--allow-file-access-from-files", "--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows"],
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ ...VIEWPORT, deviceScaleFactor: 1 });
    // Every local file the page loads, CSS-imported fonts and images included: the capture binds them,
    // so a changed asset makes it stale even when index.html is unchanged.
    // Each file is hashed when the browser requests it and again after the screenshot, so the bytes
    // bound are the bytes rendered: a file rewritten during the capture fails it instead.
    const loaded = new Map();
    page.on("request", (request) => {
      const url = request.url();
      if (!url.startsWith("file:") || loaded.has(url)) return;
      let file;
      try { file = fileURLToPath(url); } catch { return; }
      loaded.set(url, { file, hash: fileHash(file) });
    });
    await page.goto(pathToFileURL(file).href, { waitUntil: "load", timeout: NAVIGATION_TIMEOUT_MS });
    await settle(page);
    await awaitResources(page);
    const refs = await page.evaluate(measureRefs, SECTION_ID.source, TEXT_LIMIT);
    await page.evaluate(drawBadges, refs);
    const png = Buffer.from(await page.screenshot({ type: "png", fullPage: true, captureBeyondViewport: true }));
    const identity = await browserIdentity(browser, executablePath);
    const moved = [...loaded.values()].find((item) => fileHash(item.file) !== item.hash);
    if (moved) fail(SCOPE, `${path.basename(moved.file)}, which the page loaded, changed during the capture. Fix: stop editing the page and its files, then run \`evidence refs\` again`);
    const after = digest(projectRoot);
    if (before !== after) fail(SCOPE, "the page changed during the capture. Fix: stop editing index.html and its files, then run `evidence refs` again");
    return {
      doc: { schema: REFS_SCHEMA, page: after, viewport: { ...VIEWPORT }, browser: identity, capturedAt: new Date().toISOString(), refs },
      png,
      loaded: Object.fromEntries([...loaded].filter(([, item]) => item.hash !== undefined).map(([url, item]) => [url, item.hash])),
    };
  } finally {
    await browser.close();
  }
}

module.exports = { REFS_SCHEMA, SECTION_ID, VIEWPORT, awaitResources, captureRefs, drawBadges, measureRefs, refsPuppeteer, settle };

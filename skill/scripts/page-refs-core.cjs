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
// The viewports the page is numbered at (OpenSpec change owner-attention-mobile-compare). The phone is
// the probe audit's 390x844 with mobile and touch emulation, so the owner sees what a phone shows (a
// missing viewport meta, coarse-pointer rules); its references carry `m:`, which no section id can hold.
const PROFILES = {
  desktop: { viewport: { ...VIEWPORT, deviceScaleFactor: 1 }, prefix: "", json: "evidence/refs.json", png: "evidence/refs.png" },
  mobile: { viewport: { width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true }, prefix: "m:", json: "evidence/refs-mobile.json", png: "evidence/refs-mobile.png" },
};
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

// Runs in the page: each `data-section` region with a valid id, in document order, with its box in
// document coordinates (OpenSpec change owner-attention-page-compare).
function measureSections(sectionIdSource) {
  const sectionId = new RegExp(sectionIdSource);
  return [...document.querySelectorAll("[data-section]")]
    .filter((element) => sectionId.test(element.getAttribute("data-section")))
    .map((element) => {
      const box = element.getBoundingClientRect();
      return {
        id: element.getAttribute("data-section"),
        box: { x: Math.round(box.x + window.scrollX), y: Math.round(box.y + window.scrollY), width: Math.round(box.width), height: Math.round(box.height) },
      };
    });
}

// Runs on a blank page: a fingerprint of the pixels inside each box of the clean (unbadged) full-page
// screenshot, so a later capture can tell which elements look different wherever they moved. Two
// 32-bit FNV-1a hashes over the box size and its RGBA bytes; null for a box outside the picture. With
// it, the box's palette: the colours (4 bits a channel) covering at least 1% of it, each with its share
// in 5% steps, which a move by a fraction of a pixel does not change, for sections whose contents round
// to new pixels when they move.
async function regionPixels(base64, boxes) {
  const blob = await (await fetch(`data:image/png;base64,${base64}`)).blob();
  const bitmap = await createImageBitmap(blob);
  // Read in slices, so a box taller than the browser's largest canvas is still read whole.
  const SLICE = 2048;
  const canvas = new OffscreenCanvas(1, 1);
  const context = canvas.getContext("2d", { willReadFrequently: true });
  return boxes.map((box) => {
    const x = Math.max(0, box.x);
    const y = Math.max(0, box.y);
    const width = Math.min(box.x + box.width, bitmap.width) - x;
    const height = Math.min(box.y + box.height, bitmap.height) - y;
    if (width < 1 || height < 1) return { pixels: null, palette: null };
    const buckets = new Uint32Array(4096);
    let a = 0x811c9dc5 ^ width;
    let b = 0x01000193 ^ height;
    for (let top = 0; top < height; top += SLICE) {
      const rows = Math.min(SLICE, height - top);
      if (canvas.width !== width || canvas.height !== rows) {
        canvas.width = width;
        canvas.height = rows;
      }
      context.clearRect(0, 0, width, rows);
      context.drawImage(bitmap, x, y + top, width, rows, 0, 0, width, rows);
      const data = context.getImageData(0, 0, width, rows).data;
      for (let index = 0; index < data.length; index += 1) {
        a = Math.imul(a ^ data[index], 0x01000193);
        b = Math.imul(b ^ data[index], 0x5bd1e995) ^ (b >>> 15);
      }
      for (let index = 0; index < data.length; index += 4) buckets[((data[index] >> 4) << 8) | ((data[index + 1] >> 4) << 4) | (data[index + 2] >> 4)] += 1;
    }
    const floor = width * height * 0.01;
    const palette = [];
    for (let bucket = 0; bucket < buckets.length; bucket += 1) {
      if (buckets[bucket] >= floor) palette.push(`${bucket.toString(16).padStart(3, "0")}:${Math.round((buckets[bucket] / (width * height)) * 20) * 5}`);
    }
    return { pixels: `${width}x${height}:${(a >>> 0).toString(16).padStart(8, "0")}${(b >>> 0).toString(16).padStart(8, "0")}`, palette: palette.join(",") };
  });
}

// Runs in the page, after measuring: one absolutely positioned layer in a shadow root, a badge at the
// top-left of each element in document coordinates. It is added last so no selector depends on it.
function drawBadges(refs) {
  // The layer hangs off <html>, outside <body>, so a page that scales, rotates or zooms its body (an
  // artboard) does not transform the badges a second time. A transformed or zoomed root has no such
  // outside, so the capture is refused there rather than drawing badges over the wrong elements.
  const root = getComputedStyle(document.documentElement);
  // `scale` and `rotate` are separate properties that `transform` does not report (a `translate`
  // only shifts the layer, which its origin offset already absorbs).
  const moved = (value) => value && value !== "none";
  if (moved(root.transform) || moved(root.scale) || moved(root.rotate) || (root.zoom && !["1", "normal"].includes(root.zoom))) return "root-transformed";
  const host = document.createElement("div");
  host.setAttribute("data-page-refs-layer", "");
  host.style.cssText = "position:absolute;left:0;top:0;width:0;height:0;margin:0;padding:0;border:0;overflow:visible;pointer-events:none;z-index:2147483647";
  document.documentElement.appendChild(host);
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
  const stepPx = await page.evaluate(() => window.innerHeight);
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
  await sleep(600);
}

// After the walk, wait for what scrolling started: network idle as far as it comes, then every image
// loaded and decoded and every sourced video showing a frame. One deadline bounds all of it; when it
// expires the capture fails rather than numbering an incomplete page.
async function awaitResources(page, timeoutMs = 10000) {
  const deadline = Date.now() + timeoutMs;
  await page.waitForNetworkIdle({ idleTime: 300, timeout: timeoutMs }).catch(() => {});
  const remaining = Math.max(1, deadline - Date.now());
  const pending = await page.evaluate(async (ms) => {
    const sleep = (wait) => new Promise((done) => setTimeout(done, wait));
    const images = [...document.images];
    const videos = [...document.querySelectorAll("video")].filter((video) => video.currentSrc || video.src || video.querySelector("source"));
    const unready = () => images.filter((img) => !img.complete).length + videos.filter((video) => video.readyState < 2 && !video.error).length
      + (document.fonts.status === "loaded" ? 0 : 1);
    const work = (async () => {
      await document.fonts.ready;
      await Promise.all(images.filter((img) => !img.complete).map((img) => new Promise((done) => {
        img.addEventListener("load", done, { once: true });
        img.addEventListener("error", done, { once: true });
      })));
      await Promise.all(images.filter((img) => img.naturalWidth > 0).map((img) => img.decode().catch(() => {})));
      while (unready()) await sleep(100);
      return 0;
    })();
    const expired = sleep(ms).then(() => Math.max(1, unready()));
    return Promise.race([work, expired]);
  }, remaining);
  if (pending) fail(SCOPE, `the page's fonts, images or videos (${pending} pending) were still loading ${timeoutMs / 1000} s after it was scrolled through. Fix: make the page's media load locally and promptly, then run \`evidence refs\` again`);
}

// Pauses every CSS animation, transition and Web Animation, and stops new ones from moving, so the
// boxes measured are where the badges are drawn and what the screenshot shows. Motion driven by a
// script's own timers is outside the browser's animation list and is not stopped.
async function freezeMotion(page) {
  await page.evaluate(() => {
    const style = document.createElement("style");
    style.setAttribute("data-page-refs-freeze", "");
    style.textContent = "*,*::before,*::after{animation-play-state:paused!important;transition:none!important}";
    document.documentElement.appendChild(style);
    for (const animation of document.getAnimations()) animation.pause();
  });
}

// Browser work for one capture. The caller supplies `digest` (the page digest function) so the page
// version is read before and after, and a page that moved under the capture writes nothing.
async function captureRefs(projectRoot, options = {}) {
  const file = path.join(projectRoot, "index.html");
  if (!fs.existsSync(file)) fail(SCOPE, `index.html not found in ${projectRoot}. Fix: build the page before numbering it`);
  const digest = options.digest;
  const profile = PROFILES[options.viewport || "desktop"];
  if (!profile) fail(SCOPE, `unknown viewport ${options.viewport}; use one of ${Object.keys(PROFILES).join(", ")}`);
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
    await page.setViewport(profile.viewport);
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
    await freezeMotion(page);
    // The prefix goes on before the badges are drawn, so the picture shows exactly what is cited.
    const measured = (await page.evaluate(measureRefs, SECTION_ID.source, TEXT_LIMIT)).map((item) => ({ ...item, ref: profile.prefix + item.ref }));
    const regions = await page.evaluate(measureSections, SECTION_ID.source);
    // Each element and section carries a fingerprint of how it looks, taken from a clean screenshot
    // before any badge is drawn, so two captures can be compared element by element.
    const clean = await page.screenshot({ type: "png", fullPage: true, captureBeyondViewport: true, encoding: "base64" });
    const blank = await browser.newPage();
    let pixels = null;
    try {
      pixels = await blank.evaluate(regionPixels, clean, [...measured, ...regions].map((item) => item.box));
    } catch {
      // A page too large to decode still gets its numbers; without fingerprints its captures are not
      // comparable (no `pixels`, no `sections`), which reopens rather than hides a change.
      pixels = null;
    } finally {
      await blank.close();
    }
    let refs = pixels ? measured.map((item, index) => ({ ...item, pixels: pixels[index].pixels })) : measured;
    let sections = pixels ? regions.map((item, index) => ({ ...item, ...pixels[measured.length + index] })) : undefined;
    if (await page.evaluate(drawBadges, refs) === "root-transformed") fail(SCOPE, "the page transforms or zooms its <html> element, so badges cannot be placed on its elements. Fix: ask the owner to name elements by their text, label or place");
    const png = Buffer.from(await page.screenshot({ type: "png", fullPage: true, captureBeyondViewport: true }));
    // The fingerprints describe the frame the owner sees only if the page did not move between the clean
    // screenshot and the numbered one (a script's own timers are not frozen): without the badges, the page
    // must look exactly as it did. A page still moving is numbered without fingerprints (not comparable).
    if (sections) {
      await page.evaluate(() => document.querySelector("[data-page-refs-layer]")?.remove());
      const again = await page.screenshot({ type: "png", fullPage: true, captureBeyondViewport: true, encoding: "base64" });
      if (again !== clean) {
        refs = measured;
        sections = undefined;
      }
    }
    const identity = await browserIdentity(browser, executablePath);
    const moved = [...loaded.values()].find((item) => fileHash(item.file) !== item.hash);
    if (moved) fail(SCOPE, `${path.basename(moved.file)}, which the page loaded, changed during the capture. Fix: stop editing the page and its files, then run \`evidence refs\` again`);
    const after = digest(projectRoot);
    if (before !== after) fail(SCOPE, "the page changed during the capture. Fix: stop editing index.html and its files, then run `evidence refs` again");
    return {
      doc: { schema: REFS_SCHEMA, page: after, viewport: { width: profile.viewport.width, height: profile.viewport.height, ...(profile.viewport.isMobile ? { mobile: true } : {}) }, browser: identity, capturedAt: new Date().toISOString(), refs, ...(sections ? { sections } : {}) },
      png,
      loaded: Object.fromEntries([...loaded].filter(([, item]) => item.hash !== undefined).map(([url, item]) => [url, item.hash])),
    };
  } finally {
    await browser.close();
  }
}

module.exports = { PROFILES, REFS_SCHEMA, SECTION_ID, VIEWPORT, awaitResources, captureRefs, freezeMotion, drawBadges, measureRefs, measureSections, refsPuppeteer, regionPixels, settle };

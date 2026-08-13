#!/usr/bin/env node
"use strict";

// BrowserPort + EvidencePort adapter for the local Prewalk pipeline run.
// Selectors are evidence-driven and should be updated when the source topology changes.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");
const pixelmatchModule = require("pixelmatch");
const { PNG } = require("pngjs");

const pixelmatch = pixelmatchModule.default || pixelmatchModule;
const DEFAULT_VIEWPORTS = [
  { width: 1440, height: 900 },
  { width: 768, height: 1024 },
  { width: 390, height: 844 },
];

function parseArgs(argv) {
  const [command = "probe", ...rest] = argv;
  const options = { command, headed: true, viewports: DEFAULT_VIEWPORTS };
  for (let index = 0; index < rest.length; index += 1) {
    const key = rest[index];
    if (key === "--headless") options.headed = false;
    else if (key === "--url") options.url = rest[++index];
    else if (key === "--implementation-url") options.implementationUrl = rest[++index];
    else if (key === "--reference-dir") options.referenceDir = path.resolve(rest[++index]);
    else if (key === "--out") options.out = path.resolve(rest[++index]);
    else if (key === "--viewports") options.viewports = parseViewports(rest[++index]);
    else throw new Error(`Unknown option: ${key}`);
  }
  return options;
}

function parseViewports(value) {
  return value.split(",").map((item) => {
    const match = /^(\d+)x(\d+)$/.exec(item.trim());
    if (!match) throw new Error(`Invalid viewport: ${item}`);
    return { width: Number(match[1]), height: Number(match[2]) };
  });
}

function keyFor(viewport) {
  return `${viewport.width}x${viewport.height}`;
}

function normalizeText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function ensureOut(out) {
  if (!out) throw new Error("--out is required");
  fs.mkdirSync(out, { recursive: true });
}

async function waitUntilStable(page) {
  await page.waitForLoadState("domcontentloaded");
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
}

async function walkPage(page) {
  await page.evaluate(async () => {
    const step = Math.max(240, Math.floor(innerHeight * 0.7));
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      scrollTo(0, y);
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    }
    scrollTo(0, 0);
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
}

async function freezeStaticFrame(page) {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation: none !important;
        transition: none !important;
        caret-color: transparent !important;
        scroll-behavior: auto !important;
      }
    `,
  });
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

async function inspectPage(page, response, viewport) {
  return page.evaluate(({ status, viewport }) => {
    const normalize = (value) => String(value || "").replace(/\s+/g, " ").trim();
    const selectorHint = (element) => {
      if (element.id) return `#${element.id}`;
      const classes = [...element.classList].slice(0, 3).join(".");
      return `${element.tagName.toLowerCase()}${classes ? `.${classes}` : ""}`;
    };
    const rect = (element) => {
      const box = element.getBoundingClientRect();
      return {
        x: Number(box.x.toFixed(2)),
        y: Number((box.y + scrollY).toFixed(2)),
        width: Number(box.width.toFixed(2)),
        height: Number(box.height.toFixed(2)),
      };
    };
    const styleFields = [
      "display", "position", "gridTemplateColumns", "gap", "width", "maxWidth", "height",
      "marginTop", "marginRight", "marginBottom", "marginLeft", "paddingTop", "paddingRight",
      "paddingBottom", "paddingLeft", "fontFamily", "fontSize", "fontWeight", "lineHeight",
      "letterSpacing", "color", "backgroundColor", "borderColor", "borderRadius", "boxShadow",
      "opacity", "transform", "overflow", "objectFit", "transition", "animationName",
      "animationDuration", "zIndex",
    ];
    const summarize = (element) => {
      const computed = getComputedStyle(element);
      return {
        selector: selectorHint(element),
        tag: element.tagName.toLowerCase(),
        text: normalize(element.textContent).slice(0, 160),
        rect: rect(element),
        style: Object.fromEntries(styleFields.map((field) => [field, computed[field]])),
      };
    };
    const visible = (element) => {
      const box = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return box.width > 0 && box.height > 0 && style.visibility !== "hidden" && style.display !== "none";
    };
    const all = [...document.body.querySelectorAll("*")].filter(visible);
    const colorCounts = new Map();
    for (const element of all) {
      const computed = getComputedStyle(element);
      for (const property of ["color", "backgroundColor", "borderTopColor"]) {
        const value = computed[property];
        if (!value || value === "rgba(0, 0, 0, 0)") continue;
        const key = `${property}|${value}`;
        colorCounts.set(key, (colorCounts.get(key) || 0) + 1);
      }
    }
    const important = [
      document.body,
      ...document.querySelectorAll("header, nav, main, article, section, footer, h1, h2, h3, figure, pre, blockquote"),
    ].filter(Boolean).filter(visible);
    return {
      environment: {
        finalUrl: location.href,
        status,
        title: document.title,
        viewport,
        deviceScale: devicePixelRatio,
        locale: navigator.language,
        colorScheme: matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light",
        readyState: document.readyState,
        fontStatus: document.fonts.status,
        userAgent: navigator.userAgent,
        capturedAt: new Date().toISOString(),
      },
      document: {
        width: document.documentElement.scrollWidth,
        height: document.documentElement.scrollHeight,
        text: normalize(document.body.innerText),
        htmlLang: document.documentElement.lang,
      },
      colors: [...colorCounts.entries()]
        .map(([key, count]) => {
          const [property, value] = key.split("|");
          return { property, value, count };
        })
        .sort((a, b) => b.count - a.count),
      landmarks: important.map(summarize),
      headings: [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].filter(visible).map(summarize),
      interactions: [...document.querySelectorAll("a,button,input,select,textarea,[tabindex]")]
        .filter(visible)
        .map((element) => ({
          ...summarize(element),
          role: element.getAttribute("role"),
          name: element.getAttribute("aria-label") || normalize(element.textContent),
          href: element.href || null,
          title: element.getAttribute("title"),
          tabindex: element.tabIndex,
        })),
      assets: [...document.querySelectorAll("img,svg,canvas,video,picture")].filter(visible).map((element, index) => ({
        index,
        ...summarize(element),
        src: element.currentSrc || element.src || null,
        intrinsicWidth: element.naturalWidth || element.videoWidth || element.width?.baseVal?.value || element.width || null,
        intrinsicHeight: element.naturalHeight || element.videoHeight || element.height?.baseVal?.value || element.height || null,
        alt: element.getAttribute("alt"),
      })),
      stylesheets: [...document.styleSheets].map((sheet) => sheet.href).filter(Boolean),
    };
  }, { status: response ? response.status() : null, viewport });
}

async function captureStates(page) {
  return page.evaluate(async () => {
    const normalize = (value) => String(value || "").replace(/\s+/g, " ").trim();
    const fields = ["color", "backgroundColor", "borderColor", "outline", "opacity", "transform"];
    const snapshot = (element) => {
      const style = getComputedStyle(element);
      return Object.fromEntries(fields.map((field) => [field, style[field]]));
    };
    const candidates = [...document.querySelectorAll("a,button")]
      .filter((element) => element.getBoundingClientRect().width > 0)
      .slice(0, 40);
    return candidates.map((element, index) => ({
      index,
      tag: element.tagName.toLowerCase(),
      name: element.getAttribute("aria-label") || normalize(element.textContent),
      href: element.href || null,
      base: snapshot(element),
    }));
  });
}

async function exerciseStates(page, baseStates) {
  const results = [];
  const candidates = page.locator("a,button");
  const count = Math.min(await candidates.count(), 40);
  for (let index = 0; index < count; index += 1) {
    const element = candidates.nth(index);
    if (!(await element.isVisible())) continue;
    const read = () => element.evaluate((node) => {
      const style = getComputedStyle(node);
      return Object.fromEntries(["color", "backgroundColor", "borderColor", "outline", "opacity", "transform"].map((field) => [field, style[field]]));
    });
    await element.hover();
    const hover = await read();
    await element.focus();
    const focus = await read();
    results.push({ ...baseStates[index], hover, focus });
  }
  return results;
}

async function replayCopy(page) {
  const button = page.locator('button[title="Copy link"]').first();
  if (!(await button.count()) || !(await button.isVisible())) return { attempted: false, writes: [] };
  await button.click();
  return {
    attempted: true,
    writes: await page.evaluate(() => globalThis.__prewalkClipboardWrites || []),
  };
}

async function capture(options) {
  ensureOut(options.out);
  if (!options.url) throw new Error("--url is required");
  const browser = await chromium.launch({ headless: !options.headed });
  const summary = { adapter: "playwright-chromium", browserVersion: browser.version(), visibleBrowser: options.headed, viewports: [] };
  try {
    for (const viewport of options.viewports) {
      const key = keyFor(viewport);
      const context = await browser.newContext({ viewport, deviceScaleFactor: 1, locale: "en-US", colorScheme: "light" });
      const page = await context.newPage();
      await page.addInitScript(() => {
        globalThis.__prewalkClipboardWrites = [];
        Object.defineProperty(navigator, "clipboard", {
          configurable: true,
          value: {
            writeText: async (value) => globalThis.__prewalkClipboardWrites.push(String(value)),
          },
        });
      });
      const response = await page.goto(options.url, { waitUntil: "networkidle", timeout: 90000 });
      await waitUntilStable(page);
      await walkPage(page);
      const report = await inspectPage(page, response, viewport);
      if (viewport.width === options.viewports[0].width) {
        const baseStates = await captureStates(page);
        report.interactionStates = await exerciseStates(page, baseStates);
        report.copyReplay = await replayCopy(page);
      }
      await freezeStaticFrame(page);
      const screenshot = path.join(options.out, `full-${key}.png`);
      await page.screenshot({ path: screenshot, fullPage: true, animations: "disabled" });
      const canvases = page.locator("canvas");
      const canvasCount = await canvases.count();
      for (let index = 0; index < canvasCount; index += 1) {
        const canvas = canvases.nth(index);
        if (await canvas.isVisible()) {
          const dataUrl = await canvas.evaluate((element) => element.toDataURL("image/png"));
          fs.writeFileSync(path.join(options.out, `canvas-${key}-${index}.png`), Buffer.from(dataUrl.split(",")[1], "base64"));
        }
      }
      fs.writeFileSync(path.join(options.out, `observation-${key}.json`), `${JSON.stringify(report, null, 2)}\n`);
      fs.writeFileSync(path.join(options.out, `source-${key}.html`), await page.content());
      summary.viewports.push({ ...viewport, screenshot: path.basename(screenshot), document: report.document, assetCount: report.assets.length, interactionCount: report.interactions.length });
      await context.close();
    }
  } finally {
    await browser.close();
  }
  fs.writeFileSync(path.join(options.out, "capture-summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

function padImage(image, width, height) {
  const padded = new PNG({ width, height, colorType: 6 });
  padded.data.fill(255);
  PNG.bitblt(image, padded, 0, 0, image.width, image.height, 0, 0);
  return padded;
}

function textCoverage(reference, implementation) {
  const ref = new Set(normalizeText(reference).split(" ").filter(Boolean));
  const actual = new Set(normalizeText(implementation).split(" ").filter(Boolean));
  if (!ref.size) return 1;
  return [...ref].filter((token) => actual.has(token)).length / ref.size;
}

function windowedSsim(reference, implementation) {
  const c1 = 0.01 ** 2;
  const c2 = 0.03 ** 2;
  let score = 0;
  let windows = 0;
  for (let y = 0; y < reference.height; y += 8) {
    for (let x = 0; x < reference.width; x += 8) {
      let pixels = 0;
      let sumReference = 0;
      let sumImplementation = 0;
      let sumReferenceSquared = 0;
      let sumImplementationSquared = 0;
      let sumProduct = 0;
      for (let row = y; row < Math.min(y + 8, reference.height); row += 1) {
        for (let column = x; column < Math.min(x + 8, reference.width); column += 1) {
          const index = (row * reference.width + column) * 4;
          const left = (0.2126 * reference.data[index] + 0.7152 * reference.data[index + 1] + 0.0722 * reference.data[index + 2]) / 255;
          const right = (0.2126 * implementation.data[index] + 0.7152 * implementation.data[index + 1] + 0.0722 * implementation.data[index + 2]) / 255;
          pixels += 1;
          sumReference += left;
          sumImplementation += right;
          sumReferenceSquared += left * left;
          sumImplementationSquared += right * right;
          sumProduct += left * right;
        }
      }
      const meanReference = sumReference / pixels;
      const meanImplementation = sumImplementation / pixels;
      const divisor = Math.max(1, pixels - 1);
      const varianceReference = (sumReferenceSquared - pixels * meanReference * meanReference) / divisor;
      const varianceImplementation = (sumImplementationSquared - pixels * meanImplementation * meanImplementation) / divisor;
      const covariance = (sumProduct - pixels * meanReference * meanImplementation) / divisor;
      score += ((2 * meanReference * meanImplementation + c1) * (2 * covariance + c2)) /
        ((meanReference ** 2 + meanImplementation ** 2 + c1) * (varianceReference + varianceImplementation + c2));
      windows += 1;
    }
  }
  return score / windows;
}

function interactionCoverage(reference, implementation) {
  const key = (item) => {
    let href = item.href || "";
    if (href.includes("#")) href = `#${href.split("#").slice(1).join("#")}`;
    return `${item.tag}|${item.name}|${href}`;
  };
  const implementationInteractions = new Set(implementation.interactions.map(key));
  if (!reference.interactions.length) return 1;
  return reference.interactions.filter((item) => implementationInteractions.has(key(item))).length / reference.interactions.length;
}

async function compare(options) {
  ensureOut(options.out);
  if (!options.url || !options.implementationUrl) throw new Error("--url and --implementation-url are required");
  const referenceOut = options.referenceDir || path.join(options.out, "reference");
  const implementationOut = path.join(options.out, "implementation");
  if (!options.referenceDir) await capture({ ...options, out: referenceOut });
  await capture({ ...options, url: options.implementationUrl, out: implementationOut });
  const results = [];
  for (const viewport of options.viewports) {
    const key = keyFor(viewport);
    const referenceImage = PNG.sync.read(fs.readFileSync(path.join(referenceOut, `full-${key}.png`)));
    const implementationImage = PNG.sync.read(fs.readFileSync(path.join(implementationOut, `full-${key}.png`)));
    const width = Math.max(referenceImage.width, implementationImage.width);
    const height = Math.max(referenceImage.height, implementationImage.height);
    const reference = padImage(referenceImage, width, height);
    const implementation = padImage(implementationImage, width, height);
    const diff = new PNG({ width, height });
    const different = pixelmatch(reference.data, implementation.data, diff.data, width, height, { threshold: 0.1, includeAA: true });
    fs.writeFileSync(path.join(options.out, `diff-${key}.png`), PNG.sync.write(diff));
    const refObservation = JSON.parse(fs.readFileSync(path.join(referenceOut, `observation-${key}.json`), "utf8"));
    const implObservation = JSON.parse(fs.readFileSync(path.join(implementationOut, `observation-${key}.json`), "utf8"));
    const refLandmarks = new Map(refObservation.landmarks.map((item) => [`${item.tag}|${item.text}`, item.rect]));
    const deltas = implObservation.landmarks.flatMap((item) => {
      const expected = refLandmarks.get(`${item.tag}|${item.text}`);
      if (!expected) return [];
      return [Math.max(...["x", "y", "width", "height"].map((field) => Math.abs(expected[field] - item.rect[field])))];
    });
    results.push({
      ...viewport,
      pixelDifferenceRatio: different / (width * height),
      ssim: windowedSsim(reference, implementation),
      maxLayoutDeltaPx: deltas.length ? Math.max(...deltas) : null,
      textCoverage: textCoverage(refObservation.document.text, implObservation.document.text),
      interactionCoverage: interactionCoverage(refObservation, implObservation),
      copyReplay: {
        reference: refObservation.copyReplay || null,
        implementation: implObservation.copyReplay || null,
      },
      referenceAssetCount: refObservation.assets.length,
      implementationAssetCount: implObservation.assets.length,
      referenceInteractionCount: refObservation.interactions.length,
      implementationInteractionCount: implObservation.interactions.length,
      unresolvedDifferences: [],
    });
  }
  const report = { schema: "prewalk.pipeline.comparison.v1", referenceUrl: options.url, implementationUrl: options.implementationUrl, viewports: results };
  fs.writeFileSync(path.join(options.out, "comparison.json"), `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

function selfTest() {
  assert.deepEqual(parseViewports("390x844,1440x900"), [{ width: 390, height: 844 }, { width: 1440, height: 900 }]);
  assert.equal(normalizeText(" a\n b  "), "a b");
  assert.equal(textCoverage("alpha beta", "alpha beta gamma"), 1);
  const same = new PNG({ width: 1, height: 1 });
  same.data.fill(255);
  assert.equal(windowedSsim(same, same), 1);
  process.stdout.write("OK prewalk pipeline browser adapter self-test\n");
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.command === "capture") await capture(options);
  else if (options.command === "compare") await compare(options);
  else if (options.command === "self-test") selfTest();
  else throw new Error(`Unknown command: ${options.command}`);
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});

#!/usr/bin/env node
"use strict";

// Kernel for the template bank's browser measurements. Reads one JSON request on stdin:
//   { mode: "pixels", svg, width, height, points: { <slot>: [[x, y], ...] } }
//     renders the SVG with every text and lettering slot hidden and returns the RGB under each point
//   { mode: "widths", fonts: [{ family, weight }], strings: [...] }
//     returns getComputedTextLength at font-size 100 for each font x string
// Optional request fields: chrome (executable), puppeteerModule (path to puppeteer-core).
// Writes { ok: true, ... } to stdout; exits 1 with a message on stderr when the browser is missing.

const path = require("node:path");
const { resolvePuppeteer } = require("./film-capture-core.cjs");
const { resolveBrowser } = require("./browser-locate.cjs");

function readStdin() {
  return new Promise((resolve, reject) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => { data += chunk; });
    process.stdin.on("end", () => resolve(data));
    process.stdin.on("error", reject);
  });
}

async function pixels(page, request) {
  await page.setViewport({ width: request.width, height: request.height });
  await page.setContent("<!doctype html><html><body style=\"margin:0\"><canvas id=\"c\"></canvas></body></html>");
  return page.evaluate(async ({ svg, width, height, points }) => {
    const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
    for (const node of doc.querySelectorAll("[data-kind=text], [data-kind=lettering], #guides")) node.setAttribute("visibility", "hidden");
    const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(doc)], { type: "image/svg+xml" }));
    const img = new Image();
    await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = () => reject(new Error("the SVG did not load as an image")); img.src = url; });
    const canvas = document.getElementById("c");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
    const data = ctx.getImageData(0, 0, width, height).data;
    const out = {};
    for (const [slot, list] of Object.entries(points)) {
      out[slot] = list.map(([x, y]) => {
        const px = Math.max(0, Math.min(width - 1, Math.round(x)));
        const py = Math.max(0, Math.min(height - 1, Math.round(y)));
        const i = (py * width + px) * 4;
        return [data[i], data[i + 1], data[i + 2]];
      });
    }
    return out;
  }, request);
}

async function widths(page, request) {
  await page.setContent("<!doctype html><html><head><meta charset=\"utf-8\"></head><body><svg id=\"s\" xmlns=\"http://www.w3.org/2000/svg\" width=\"4000\" height=\"200\"></svg></body></html>");
  return page.evaluate(async ({ fonts, strings }) => {
    const svg = document.getElementById("s");
    const rows = [];
    for (const font of fonts) {
      for (const text of strings) {
        const t = document.createElementNS("http://www.w3.org/2000/svg", "text");
        t.setAttribute("font-family", font.family);
        t.setAttribute("font-weight", String(font.weight));
        t.setAttribute("font-size", "100");
        t.textContent = text;
        svg.appendChild(t);
        rows.push({ family: font.family, weight: font.weight, text, width: t.getComputedTextLength() });
        t.remove();
      }
    }
    return { rows };
  }, request);
}

(async () => {
  let browser;
  try {
    const request = JSON.parse(await readStdin());
    const puppeteer = resolvePuppeteer(process.cwd(), request.puppeteerModule ? path.resolve(request.puppeteerModule) : undefined);
    browser = await puppeteer.launch({ executablePath: resolveBrowser(request.chrome), headless: true, args: ["--no-sandbox"] });
    const page = await browser.newPage();
    const result = request.mode === "widths" ? await widths(page, request) : await pixels(page, request);
    process.stdout.write(`${JSON.stringify({ ok: true, result })}\n`);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
  }
})();

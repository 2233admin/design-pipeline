#!/usr/bin/env node
"use strict";

// BuilderPort adapter: reconstruct the captured page as a local, source-independent static site.

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const SOURCE_ORIGIN = "https://stencil.so";
const CSS_URLS = [
  `${SOURCE_ORIGIN}/_build/assets/client-C65yZmsU.css`,
  `${SOURCE_ORIGIN}/_build/assets/styles-CkpDw653.css`,
];

function parseArgs(argv) {
  const [command = "self-test", ...rest] = argv;
  const options = { command };
  for (let index = 0; index < rest.length; index += 1) {
    const key = rest[index];
    if (key === "--source") options.source = path.resolve(rest[++index]);
    else if (key === "--responsive-source-dir") options.responsiveSourceDir = path.resolve(rest[++index]);
    else if (key === "--canvas-root") options.canvasRoot = path.resolve(rest[++index]);
    else if (key === "--out") options.out = path.resolve(rest[++index]);
    else if (key === "--graybox") options.graybox = true;
    else throw new Error(`Unknown option: ${key}`);
  }
  return options;
}

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function write(file, bytes) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, bytes);
}

function relativeAssetName(url, index) {
  const clean = path.basename(new URL(url).pathname) || `asset-${index}`;
  return `vendor/${index}-${clean.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
}

async function download(url, destination, receipt, type) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Download failed ${response.status}: ${url}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  write(destination, bytes);
  receipt.push({ sourceUrl: url, destination: destination.replaceAll("\\", "/"), type, bytes: bytes.length, sha256: sha256(bytes), permission: "Local evaluation copy requested by the user; not published." });
  return bytes;
}

async function localizeCss(url, css, assetsDir, receipt) {
  const matches = [...css.matchAll(/url\((['"]?)([^)'"\s]+)\1\)/g)];
  let rewritten = css;
  let index = 0;
  for (const match of matches) {
    const raw = match[2];
    if (raw.startsWith("data:") || raw.startsWith("#")) continue;
    const resolved = new URL(raw, url).href;
    const relative = relativeAssetName(resolved, index++);
    await download(resolved, path.join(assetsDir, relative), receipt, "stylesheet-dependency");
    rewritten = rewritten.split(raw).join(relative);
  }
  return rewritten;
}

function canvasPicture(index) {
  const classes = index === 0 ? "post-header-sigil" : "st-chart";
  const style = index === 0 ? "display:block;image-rendering:pixelated" : `height:${index === 1 ? 340 : 300}px`;
  if (index === 0) return `<img class="${classes}" style="${style}" src="assets/canvas-1440x900-0.png" alt="" aria-hidden="true">`;
  return `<picture class="pipeline-canvas pipeline-canvas-${index}"><source media="(max-width: 500px)" srcset="assets/canvas-390x844-${index}.png"><source media="(max-width: 900px)" srcset="assets/canvas-768x1024-${index}.png"><img class="${classes}" style="${style}" src="assets/canvas-1440x900-${index}.png" alt="" aria-hidden="true"></picture>`;
}

function responsiveFragments(source) {
  const fragments = {};
  for (const pattern of [
    /<svg\b[^>]*data-hk="([^"]+)"[^>]*class="trace-flow-tokens"[^>]*>[\s\S]*?<\/svg>/g,
    /<span\b[^>]*data-hk="([^"]+)"[^>]*class="trace-flow-tokens-label[^"]*"[^>]*>[\s\S]*?<\/span>/g,
  ]) {
    for (const match of source.matchAll(pattern)) fragments[match[1]] = match[0];
  }
  return fragments;
}

function transformHtml(source, graybox, responsive = null) {
  let html = source
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<link\b[^>]*rel="(?:modulepreload|preload)"[^>]*>/gi, "")
    .replace(/<link\b[^>]*href="\/?_build\/assets\/(?:client|styles)-[^\"]+\.css"[^>]*>/gi, "")
    .replace(/<link\b[^>]*href="\/?(?:favicon|apple-touch-icon|site\.webmanifest)[^\"]*"[^>]*>/gi, "")
    .replace(/<canvas\b[^>]*>[\s\S]*?<\/canvas>/gi, () => canvasPicture(transformHtml.canvasIndex++))
    .replaceAll('src="/authors/can.webp"', 'src="assets/can.webp"')
    .replaceAll('src="/og/prewalk.png"', 'src="assets/og-prewalk.png"')
    .replace(/href="\/(?!\/)([^"#]*)"/g, `href="${SOURCE_ORIGIN}/$1"`);
  html = html.replace(/<head>/i, `<head>\n<link rel="stylesheet" href="assets/client.css">\n<link rel="stylesheet" href="assets/styles.css">\n<link rel="stylesheet" href="assets/clone.css">`);
  html = html.replace(/<html\b([^>]*)>/i, `<html$1${graybox ? " data-graybox" : ""}>`);
  const responsiveJson = JSON.stringify(responsive || {}).replaceAll("<", "\\u003c");
  const runtime = `<script>\n(() => {\n  const responsive = ${responsiveJson};\n  const applyResponsiveEvidence = () => {\n    const key = innerWidth <= 500 ? 'mobile' : innerWidth <= 900 ? 'tablet' : 'desktop';\n    for (const [id, fragment] of Object.entries(responsive[key] || {})) {\n      const current = document.querySelector('[data-hk="' + id + '"]');\n      if (current && current.outerHTML !== fragment) current.outerHTML = fragment;\n    }\n  };\n  applyResponsiveEvidence();\n  addEventListener('resize', applyResponsiveEvidence, { passive: true });\n  const button = document.querySelector('button[title="Copy link"]');\n  button?.addEventListener('click', async () => {\n    const value = '${SOURCE_ORIGIN}/blog/prewalk';\n    try { await navigator.clipboard.writeText(value); }\n    catch { const field = Object.assign(document.createElement('textarea'), { value }); document.body.append(field); field.select(); document.execCommand('copy'); field.remove(); }\n  });\n  window.__prewalkPipelineReady = true;\n})();\n<\/script>`;
  const copyState = `<script>document.querySelector('button[title="Copy link"]')?.addEventListener('click', (event) => { const button = event.currentTarget; button.title = 'Copied'; button.dataset.copied = 'true'; button.innerHTML = '<svg aria-hidden="true" fill="none" height="13" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" width="13"><path d="M4 12.5 10 18.5 20 6"></path></svg>'; });<\/script>`;
  return html.replace(/<\/body>/i, `${runtime}\n${copyState}\n</body>`);
}
transformHtml.canvasIndex = 0;

async function build(options) {
  for (const key of ["source", "responsiveSourceDir", "canvasRoot", "out"]) if (!options[key]) throw new Error(`--${key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)} is required`);
  const assetsDir = path.join(options.out, "assets");
  fs.mkdirSync(assetsDir, { recursive: true });
  const receipt = [];
  for (let index = 0; index < CSS_URLS.length; index += 1) {
    const url = CSS_URLS[index];
    const response = await fetch(url);
    if (!response.ok) throw new Error(`CSS download failed ${response.status}: ${url}`);
    const original = await response.text();
    const localized = await localizeCss(url, original, assetsDir, receipt);
    const name = index === 0 ? "client.css" : "styles.css";
    write(path.join(assetsDir, name), localized);
    receipt.push({ sourceUrl: url, destination: `assets/${name}`, type: "stylesheet", bytes: Buffer.byteLength(localized), sha256: sha256(localized), permission: "Local evaluation copy requested by the user; not published." });
  }
  await download(`${SOURCE_ORIGIN}/authors/can.webp`, path.join(assetsDir, "can.webp"), receipt, "author-image");
  await download(`${SOURCE_ORIGIN}/og/prewalk.png`, path.join(assetsDir, "og-prewalk.png"), receipt, "share-preview-image");
  for (const viewport of ["1440x900", "768x1024", "390x844"]) {
    for (let index = 0; index < 4; index += 1) {
      const name = `canvas-${viewport}-${index}.png`;
      const from = path.join(options.canvasRoot, name);
      const bytes = fs.readFileSync(from);
      write(path.join(assetsDir, name), bytes);
      receipt.push({ sourceUrl: `pipeline-capture:${name}`, destination: `assets/${name}`, type: "captured-noninteractive-canvas", bytes: bytes.length, sha256: sha256(bytes), permission: "Local evaluation evidence derived from the authorized browser capture; not published." });
    }
  }
  write(path.join(assetsDir, "clone.css"), `
:root { color-scheme: dark; }
.pipeline-canvas { display: contents; }
.pipeline-canvas img { max-width: 100%; object-fit: fill; }
html[data-graybox] * { color: #909096 !important; border-color: #56565e !important; background-image: none !important; box-shadow: none !important; text-shadow: none !important; filter: none !important; }
html[data-graybox] body { background: #111114 !important; }
html[data-graybox] figure, html[data-graybox] table, html[data-graybox] pre { background: #202026 !important; outline: 1px solid #56565e !important; }
html[data-graybox] figure *, html[data-graybox] table * { color: #77777e !important; fill: #77777e !important; stroke: #56565e !important; background-color: transparent !important; }
html[data-graybox] img { opacity: 0 !important; }
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation: none !important; transition: none !important; scroll-behavior: auto !important; } }
`);
  transformHtml.canvasIndex = 0;
  const responsive = {
    desktop: responsiveFragments(fs.readFileSync(path.join(options.responsiveSourceDir, "source-1440x900.html"), "utf8")),
    tablet: responsiveFragments(fs.readFileSync(path.join(options.responsiveSourceDir, "source-768x1024.html"), "utf8")),
    mobile: responsiveFragments(fs.readFileSync(path.join(options.responsiveSourceDir, "source-390x844.html"), "utf8")),
  };
  const html = transformHtml(fs.readFileSync(options.source, "utf8"), options.graybox, responsive);
  write(path.join(options.out, options.graybox ? "graybox.html" : "index.html"), html);
  write(path.join(options.out, "build-receipt.json"), `${JSON.stringify({ schema: "prewalk.builder-receipt.v1", builtAt: new Date().toISOString(), mode: options.graybox ? "graybox" : "full", input: options.source.replaceAll("\\", "/"), inputSha256: sha256(fs.readFileSync(options.source)), assets: receipt }, null, 2)}\n`);
  process.stdout.write(`Built ${options.graybox ? "graybox.html" : "index.html"} with ${receipt.length} localized assets\n`);
}

function selfTest() {
  assert.equal(canvasPicture(1).includes("canvas-390x844-1.png"), true);
  transformHtml.canvasIndex = 0;
  const output = transformHtml('<html><head><link rel="stylesheet" href="/_build/assets/client-a.css"></head><body><canvas></canvas><script>x()</script></body></html>', true);
  assert.equal(output.includes("data-graybox"), true);
  assert.equal(output.includes("<canvas"), false);
  assert.equal(output.includes("/_build/assets"), false);
  assert.equal(transformHtml('<html><head></head><body><img src="/og/prewalk.png"></body></html>', false).includes('src="assets/og-prewalk.png"'), true);
  assert.equal(Object.keys(responsiveFragments('<svg data-hk="x" class="trace-flow-tokens"></svg><span data-hk="y" class="trace-flow-tokens-label">z</span>')).length, 2);
  process.stdout.write("OK prewalk BuilderPort self-test\n");
}

const options = parseArgs(process.argv.slice(2));
Promise.resolve(options.command === "build" ? build(options) : options.command === "self-test" ? selfTest() : Promise.reject(new Error(`Unknown command: ${options.command}`)))
  .catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; });

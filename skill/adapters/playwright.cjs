#!/usr/bin/env node
"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

async function main() {
  const request = JSON.parse(fs.readFileSync(0, "utf8"));
  const modulePath = process.env.DESIGN_PIPELINE_PLAYWRIGHT_MODULE;
  if (!modulePath || !path.isAbsolute(modulePath)) throw new Error("DESIGN_PIPELINE_PLAYWRIGHT_MODULE must be an explicit absolute path");
  const playwright = require(modulePath);
  const browser = await playwright.chromium.launch({ headless: true });
  const artifacts = { screenshot: "page.png", trace: "trace.zip", dom: "page.html", console: "console.json", network: "network.json", accessibility: "accessibility.json", performance: "performance.json" };
  try {
    const context = await browser.newContext({ viewport: request.viewport });
    await context.tracing.start({ screenshots: true, snapshots: true });
    const page = await context.newPage();
    const consoleItems = [];
    page.on("console", (message) => consoleItems.push({ type: message.type(), text: message.text() }));
    await page.goto(request.url, { waitUntil: "networkidle" });
    await page.screenshot({ path: path.join(request.outputRoot, artifacts.screenshot), fullPage: true });
    fs.writeFileSync(path.join(request.outputRoot, artifacts.dom), await page.content());
    fs.writeFileSync(path.join(request.outputRoot, artifacts.console), JSON.stringify(consoleItems));
    fs.writeFileSync(path.join(request.outputRoot, artifacts.network), "[]");
    fs.writeFileSync(path.join(request.outputRoot, artifacts.accessibility), JSON.stringify({ status: "unknown", reason: "No explicit accessibility host adapter" }));
    fs.writeFileSync(path.join(request.outputRoot, artifacts.performance), JSON.stringify({ status: "unknown", reason: "No explicit performance host adapter" }));
    await context.tracing.stop({ path: path.join(request.outputRoot, artifacts.trace) });
    const hashes = Object.fromEntries(Object.entries(artifacts).map(([key, value]) => [key, crypto.createHash("sha256").update(fs.readFileSync(path.join(request.outputRoot, value))).digest("hex")]));
    process.stdout.write(JSON.stringify({ schema: "design-pipeline.evidence-receipt.v1", id: `web-${Date.now()}`, status: "partial", adapter: { id: "playwright", version: playwright.version || "unknown", availability: "available", probe: { ok: true, message: "browser capture completed" } }, target: { url: request.url, viewport: request.viewport }, capturedAt: new Date().toISOString(), artifacts, hashes, redaction: { status: "not-required", notes: [] } }));
  } finally { await browser.close(); }
}
main().catch((error) => { process.stderr.write(error.stack || error.message); process.exitCode = 1; });

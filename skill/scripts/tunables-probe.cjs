#!/usr/bin/env node
"use strict";

// Kernel for `tunables probe`: shows whether each param changes anything on screen. The page is
// loaded from the preview server with the saved values and again with one param changed (a draft
// held in memory), screenshots are compared byte for byte, and a param whose every stable sample
// is identical gets the warning `param-no-visible-effect`. Project files are never written.
// Async browser work lives in its own process so the synchronous CLI can spawn it, like the other
// capture kernels.

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { canvasSize, resolvePuppeteer } = require("./film-capture-core.cjs");
const { resolveBrowser } = require("./browser-locate.cjs");
const { fail, jsonResult } = require("./contract-utils.cjs");
const tunables = require("./tunables-core.cjs");
const { startPanel } = require("./tunables-preview-core.cjs");

const SCOPE = "tunables probe";
const PAGE_VIEWPORT = { width: 1280, height: 800 };
const FRACTIONS = [0.25, 0.5, 0.75];
const SETTLE_MS = 300;

function parseArgs(argv) {
  const allowed = new Set(["--project-root", "--param", "--chrome", "--puppeteer-module"]);
  const result = {};
  for (let index = 0; index < argv.length; index += 2) {
    const name = argv[index];
    if (!allowed.has(name)) fail(SCOPE, `unknown option ${name}; allowed: ${[...allowed].join(", ")}`);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) fail(SCOPE, `${name} requires a value`);
    result[name] = value;
  }
  if (!result["--project-root"]) fail(SCOPE, "--project-root is required");
  return result;
}

function digest(files) {
  const hash = crypto.createHash("sha256");
  for (const file of files) hash.update(fs.existsSync(file) ? fs.readFileSync(file) : "absent");
  return hash.digest("hex");
}

// A value for the param that differs from the one now in effect, or null when none fits.
function changedValue(param, current) {
  if (param.type === "checkbox") return !current;
  if (param.type === "select") return param.options[(param.options.indexOf(current) + 1) % param.options.length];
  if (param.type === "text") return `${current} W`.slice(0, tunables.MAX_TEXT);
  if (param.type === "color") {
    const channels = [1, 3, 5].map((at) => (255 - Number.parseInt(current.slice(at, at + 2), 16)).toString(16).padStart(2, "0"));
    return `#${channels.join("")}${current.slice(7)}`;
  }
  const middle = Number(((param.min + param.max) / 2).toFixed(6));
  const candidates = [param.max, param.min, middle].filter((value) => value !== current).sort((a, b) => Math.abs(b - current) - Math.abs(a - current));
  return candidates[0] ?? null;
}

async function settle(page) {
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

// Loads the page and returns the sample points: seconds on a registered timeline, or null for one shot after load.
// Only a film waits for its timeline to register; a page has none, so waiting would only add delay.
async function load(page, url, seconds, film) {
  await page.goto(url, { waitUntil: "networkidle0", timeout: 30000 });
  if (film) await page.waitForFunction(() => Object.keys(window.__timelines || {}).length > 0, { timeout: 2500 }).catch(() => {});
  const timeline = await page.evaluate(() => {
    const registry = window.__timelines || {};
    const id = Object.keys(registry).includes("main") ? "main" : Object.keys(registry)[0];
    return id && typeof registry[id].seek === "function" ? { id, duration: Number(registry[id].duration()) || 0 } : null;
  });
  if (!timeline) {
    await new Promise((resolve) => setTimeout(resolve, SETTLE_MS));
    return { timeline: null, points: [null] };
  }
  const from = seconds ? seconds.startSec : 0;
  const span = seconds ? seconds.endSec - seconds.startSec : timeline.duration;
  return { timeline, points: FRACTIONS.map((fraction) => Number((from + span * fraction).toFixed(3))) };
}

async function shoot(page, timeline, at) {
  if (timeline) {
    await page.evaluate((id, seconds) => { const tl = window.__timelines[id]; tl.pause(); tl.seek(seconds); }, timeline.id, at);
  }
  await settle(page);
  return Buffer.from(await page.screenshot({ type: "png" }));
}

async function sample(page, url, seconds, film) {
  const { timeline, points } = await load(page, url, seconds, film);
  const frames = [];
  for (const at of points) frames.push(await shoot(page, timeline, at));
  return { points, frames, timeline: Boolean(timeline) };
}

async function probe(options) {
  const project = path.resolve(options["--project-root"]);
  const loaded = tunables.readTunables(project);
  tunables.assertDocument(loaded.doc);
  const doc = loaded.doc;
  const chosen = options["--param"] ? doc.params.filter((param) => param.id === options["--param"]) : doc.params;
  if (options["--param"] && !chosen.length) fail(SCOPE, `no param named ${options["--param"]}; declared: ${doc.params.map((param) => param.id).join(", ") || "none"}`, { code: "VALUE_UNKNOWN", id: options["--param"] });
  const guarded = [path.join(project, tunables.FILE), path.join(project, tunables.SCRIPT)];
  const before = digest(guarded);
  const page0 = path.join(project, "index.html");
  if (!fs.existsSync(page0)) fail(SCOPE, `no index.html in ${project}`, { code: "INPUT_MISSING" });
  const film = /data-composition-id=/i.test(fs.readFileSync(page0, "utf8"));
  const viewport = film ? canvasSize(fs.readFileSync(page0, "utf8")) : PAGE_VIEWPORT;

  let puppeteer;
  let executablePath;
  try {
    puppeteer = resolvePuppeteer(project, options["--puppeteer-module"]);
    executablePath = resolveBrowser(options["--chrome"]);
  } catch (error) {
    if (error.code !== "TOOL_MISSING") throw error;
    const reason = error.message.replace(/^(?:[a-z][a-z -]*: )+/i, "");
    const browserMissing = /^browser:/i.test(error.message);
    fail(SCOPE, `${reason}${browserMissing ? ". Or install one with `npx puppeteer browsers install chrome-headless-shell`" : ""}`, { code: "BROWSER_UNAVAILABLE" });
  }
  const panel = await startPanel(project, { idleMinutes: 30 });
  const url = `${panel.previewUrl}index.html`;
  const findings = [];
  const probed = [];
  const pageErrors = [];
  let browser = null;
  try {
    // Launch inside the cleanup scope: a browser that is found but cannot start must still close the panel,
    // or its idle timer keeps the process alive.
    browser = await puppeteer.launch({ executablePath, headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
    const page = await browser.newPage();
    page.on("pageerror", (error) => pageErrors.push(error.message));
    await page.setViewport(viewport);
    await page.evaluateOnNewDocument(() => { window.__timelines = window.__timelines || {}; });
    // Each param is compared with the page loaded twice at its saved values: a point that differs
    // between those two loads is running by itself (a clock, a video) and is not evidence either way.
    // Params that sample the same time range share one such pair.
    const baselines = new Map();
    const baseline = async (window) => {
      const key = JSON.stringify(window || null);
      if (!baselines.has(key)) {
        panel.setDraft(doc.values);
        const first = await sample(page, url, window, film);
        const second = await sample(page, url, window, film);
        baselines.set(key, { first, stable: first.frames.map((frame, index) => frame.equals(second.frames[index])) });
      }
      return baselines.get(key);
    };
    for (const param of chosen) {
      const { first, stable } = await baseline(param.window);
      const current = Object.hasOwn(doc.values, param.id) ? doc.values[param.id] : param.default;
      const value = changedValue(param, current);
      if (value === null || tunables.valueProblem(param, value)) {
        probed.push({ id: param.id, status: "skipped", reason: "no other valid value to try" });
        continue;
      }
      panel.setDraft({ ...doc.values, [param.id]: value });
      const moved = await sample(page, url, param.window, film);
      const points = first.points.map((at, index) => ({ atSec: at, stable: stable[index], differs: stable[index] ? !first.frames[index].equals(moved.frames[index]) : null }));
      const usable = points.filter((point) => point.stable);
      const status = !usable.length ? "unstable" : usable.some((point) => point.differs) ? "visible" : "no-visible-effect";
      probed.push({ id: param.id, status, tried: value, points });
      if (status === "no-visible-effect") {
        findings.push({
          code: "param-no-visible-effect",
          severity: "warning",
          id: param.id,
          message: `changing ${param.id} from ${JSON.stringify(current)} to ${JSON.stringify(value)} left ${usable.length} sampled frame(s) identical (${usable.map((point) => (point.atSec === null ? "after load" : `${point.atSec}s`)).join(", ")})`,
          fix: `Open \`${tunables.command(project, "panel")}\` and move ${param.id}. If nothing on screen follows it, the page may overwrite it with a constant, read it outside the sampled time, or not use it: set "window": { "startSec": <s>, "endSec": <s> } on the param to sample where it acts, fix the line that overrides it, or remove the param.`,
        });
      } else if (status === "unstable") {
        findings.push({
          code: "probe-unstable",
          severity: "warning",
          id: param.id,
          message: `two loads of the page with the same values differ at every sampled frame, so ${param.id} could not be judged`,
          fix: "Pause what moves by itself (a CSS animation, a video, a clock) or register a paused timeline as window.__timelines so the probe can seek to fixed times, then probe again.",
        });
      }
    }
  } finally {
    try { if (browser) await browser.close(); } finally { await panel.close(); }
  }
  const after = digest(guarded);
  if (after !== before) fail(SCOPE, `${tunables.FILE} or ${tunables.SCRIPT} changed during the probe; the probe never writes them`, { code: "PROBE_WROTE_FILES" });
  return {
    status: findings.length ? "warnings" : "passed",
    mode: film ? "film" : "page",
    viewport,
    probed,
    findings,
    ...(pageErrors.length ? { pageErrors: [...new Set(pageErrors)].slice(0, 5) } : {}),
    projectFilesUnchanged: true,
    creativeAcceptance: "not-assessed",
  };
}

(async () => {
  try {
    const result = await probe(parseArgs(process.argv.slice(2)));
    process.stdout.write(`${JSON.stringify(jsonResult(true, result))}\n`);
  } catch (error) {
    process.stdout.write(`${JSON.stringify(jsonResult(false, {}, error))}\n`);
    process.exitCode = 1;
  }
})();

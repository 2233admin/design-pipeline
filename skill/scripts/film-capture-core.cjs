"use strict";

// Capture a HyperFrames composition's GSAP timeline as design-pipeline.film-timeline.v1 by
// loading the page in headless Chrome and running references/film-choreography/timeline-probe.js.
// Reuses the browser stack a HyperFrames project already installs (puppeteer-core and the
// chrome-headless-shell cache); it adds no dependency to this package.

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { spawnSync } = require("node:child_process");
const { fail } = require("./contract-utils.cjs");

const SCOPE = "film capture";
const PROBE = path.join(__dirname, "../references/film-choreography/timeline-probe.js");

function resolvePuppeteer(compositionDir, explicit) {
  const candidates = explicit ? [explicit] : [compositionDir, process.cwd()];
  for (const base of candidates) {
    try {
      return require(require.resolve(explicit ? path.resolve(explicit) : "puppeteer-core", explicit ? undefined : { paths: [base] }));
    } catch {
      // try next base
    }
  }
  fail(SCOPE, "puppeteer-core not found. Fix: run `npm i hyperframes` in the composition project (it installs puppeteer-core), or pass --puppeteer-module <path to puppeteer-core>", { code: "TOOL_MISSING" });
}

function newestChrome() {
  const root = path.join(os.homedir(), ".cache", "hyperframes", "chrome", "chrome-headless-shell");
  if (!fs.existsSync(root)) return null;
  const exe = process.platform === "win32" ? "chrome-headless-shell.exe" : "chrome-headless-shell";
  const builds = fs.readdirSync(root).sort().reverse();
  for (const build of builds) {
    const dir = path.join(root, build);
    for (const sub of fs.readdirSync(dir)) {
      const candidate = path.join(dir, sub, exe);
      if (fs.existsSync(candidate)) return candidate;
    }
  }
  return null;
}

function resolveChrome(explicit) {
  const chrome = explicit || process.env.PUPPETEER_EXECUTABLE_PATH || newestChrome();
  if (!chrome || !fs.existsSync(chrome)) fail(SCOPE, "headless Chrome not found. Fix: run `npx hyperframes browser ensure` (or any `npx hyperframes check`) to download it, or pass --chrome <path to chrome executable>", { code: "TOOL_MISSING" });
  return chrome;
}

// Nested blocks (data-composition-src) only load under the HyperFrames runtime, which the
// preview server injects. Returns the built preview URL, starting a background preview when
// none is running; `started` tells the caller to stop it afterwards.
// Runs npx without a shell: npm's npx-cli.js through the current node when present (Windows
// cannot spawn npx.cmd without a shell), otherwise the npx binary.
function runNpx(args, options = {}) {
  const cli = path.join(path.dirname(process.execPath), "node_modules", "npm", "bin", "npx-cli.js");
  const [command, prefix] = fs.existsSync(cli) ? [process.execPath, [cli]] : ["npx", []];
  return spawnSync(command, [...prefix, ...args], { encoding: "utf8", windowsHide: true, timeout: 180000, maxBuffer: 64 << 20, ...options });
}

function hyperframesPreview(projectDir, options = {}) {
  const cli = options.cliVersion ? `hyperframes@${options.cliVersion}` : "hyperframes";
  const call = (args) => runNpx(["--yes", cli, "preview", ...args], { cwd: projectDir, timeout: 120000 });
  const status = () => {
    const out = call(["--status", "--json"]);
    try { return JSON.parse(String(out.stdout).slice(String(out.stdout).indexOf("{"))).result; } catch { return null; }
  };
  let state = status();
  let started = false;
  if (!state || state.state !== "running" || !state.ready) {
    call(["--background", "--no-open"]);
    started = true;
    state = status();
  }
  if (!state || !state.ready || !state.serverUrl) fail(SCOPE, `could not start a HyperFrames preview in ${projectDir}. Fix: run "npx hyperframes preview --background" there and pass --url <serverUrl>/api/projects/<id>/preview`, { code: "TOOL_FAILED" });
  return { url: `${state.serverUrl}/api/projects/${encodeURIComponent(state.projectName)}/preview`, started, stop: () => call(["--stop"]) };
}

async function captureTimeline(compositionFile, options = {}) {
  const file = compositionFile ? path.resolve(compositionFile) : null;
  if (!options.url && (!file || !fs.existsSync(file))) fail(SCOPE, `composition not found: ${file}. Fix: pass --composition <path to the HyperFrames index.html> or --url <preview url>`);
  const compositionId = options.compositionId || "main";
  const puppeteer = resolvePuppeteer(file ? path.dirname(file) : process.cwd(), options.puppeteerModule);
  const browser = await puppeteer.launch({ executablePath: resolveChrome(options.chrome), headless: true, args: ["--allow-file-access-from-files", "--autoplay-policy=no-user-gesture-required"] });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    // HyperFrames' runtime normally provides the registry; a bare page needs it before scripts run.
    await page.evaluateOnNewDocument(() => { window.__timelines = window.__timelines || {}; });
    await page.goto(options.url || pathToFileURL(file).href, { waitUntil: "networkidle0", timeout: options.timeoutMs || 30000 });
    const nested = await page.evaluate(() => ({ hosts: document.querySelectorAll("[data-composition-src]").length, runtime: Boolean(window.__hyperframes) }));
    if (nested.hosts && !nested.runtime) fail(SCOPE, `${nested.hosts} nested composition(s) (data-composition-src) do not load without the HyperFrames runtime, so their motion would be missing. Fix: capture through the preview server: "designer-pipeline film check" does this automatically for projects with hyperframes.json, or pass --url <serverUrl>/api/projects/<id>/preview`);
    if (nested.runtime) await page.waitForFunction(() => window.__renderReady === true || window.__playerReady === true, { timeout: 15000 }).catch(() => {});
    await page.addScriptTag({ content: fs.readFileSync(PROBE, "utf8") });
    const result = await page.evaluate((id) => {
      const timeline = window.__timelines && window.__timelines[id];
      if (!timeline) return { missing: Object.keys(window.__timelines || {}) };
      return { manifest: window.FilmTimelineProbe.probe(timeline, id) };
    }, compositionId);
    if (result.missing) fail(SCOPE, `window.__timelines["${compositionId}"] is not registered (found: ${result.missing.join(", ") || "none"}${errors.length ? `; page errors: ${errors.join(" | ")}` : ""}). Fix: register the paused timeline synchronously as window.__timelines["${compositionId}"], or pass --composition-id`);
    return { ...result.manifest, ...(errors.length ? { pageErrors: errors } : {}) };
  } finally {
    await browser.close();
  }
}

module.exports = { captureTimeline, hyperframesPreview, resolveChrome, resolvePuppeteer, runNpx };

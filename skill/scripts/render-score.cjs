#!/usr/bin/env node
"use strict";

// Kernel for `film score`: renders a Strudel pattern offline in headless Chrome with the
// project's Strudel bundle and writes the WAV plus the pattern's event list. The page is served
// from localhost because AudioWorklet (used by Strudel effects) needs a secure context, and
// Math.random is seeded so noise and randomized synthesis render the same way every time.

const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { resolveChrome, resolvePuppeteer } = require("./film-capture-core.cjs");
const { fail, jsonResult } = require("./contract-utils.cjs");

function parseArgs(argv) {
  const allowed = new Set(["--bundle", "--pattern", "--cps", "--duration", "--output", "--project", "--chrome", "--puppeteer-module"]);
  const result = {};
  for (let index = 0; index < argv.length; index += 2) {
    const name = argv[index];
    if (!allowed.has(name)) fail("film score", `unknown option ${name}; allowed: ${[...allowed].join(", ")}`);
    result[name] = argv[index + 1];
  }
  for (const name of ["--bundle", "--pattern", "--cps", "--duration", "--output", "--project"]) if (!result[name]) fail("film score", `${name} is required`);
  return result;
}

(async () => {
  let browser;
  let server;
  let downloads;
  try {
    const options = parseArgs(process.argv.slice(2));
    const cps = Number(options["--cps"]);
    const duration = Number(options["--duration"]);
    const code = fs.readFileSync(options["--pattern"], "utf8");
    const output = path.resolve(options["--output"]);
    downloads = fs.mkdtempSync(path.join(path.dirname(output), ".score-"));
    const puppeteer = resolvePuppeteer(options["--project"], options["--puppeteer-module"]);
    browser = await puppeteer.launch({ executablePath: resolveChrome(options["--chrome"]), headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
    const page = await browser.newPage();
    const problems = [];
    page.on("pageerror", (error) => problems.push(error.message));
    page.on("console", (message) => { const text = message.text(); if (/error|not found|not a note/i.test(text)) problems.push(text.replace(/%c|background-color[^;]*;?|color:[^;]*;?|border-radius:[^;]*;?/g, "").trim()); });
    const cdp = await page.createCDPSession();
    await cdp.send("Browser.setDownloadBehavior", { behavior: "allow", downloadPath: downloads });
    await page.evaluateOnNewDocument(() => {
      let seed = 0x9e3779b9;
      Math.random = () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    });
    server = http.createServer((req, res) => { res.setHeader("content-type", "text/html"); res.end("<!doctype html><title>score</title>"); });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    await page.addScriptTag({ content: fs.readFileSync(options["--bundle"], "utf8") });
    const events = await page.evaluate(async (source, cpsValue, seconds) => {
      const S = window.strudel;
      Object.assign(window, S);
      S.miniAllStrings();
      S.registerSynthSounds();
      let pattern;
      try { pattern = new Function(`return (${source});`)(); } catch (error) { throw new Error(`pattern does not evaluate: ${error.message}`); }
      if (!pattern || typeof pattern.queryArc !== "function") throw new Error("pattern file must be one Strudel expression that returns a pattern, e.g. stack(...)");
      const cycles = seconds * cpsValue;
      const haps = pattern.queryArc(0, cycles, { _cps: cpsValue }).filter((hap) => hap.hasOnset());
      await S.renderPatternAudio(pattern, cpsValue, 0, cycles, 48000, 128, false, "score");
      return haps.map((hap) => ({ atSec: hap.whole.begin.valueOf() / cpsValue, durSec: hap.duration.valueOf() / cpsValue, value: hap.value }));
    }, code, cps, duration);
    let wav = null;
    for (let i = 0; i < 240 && !wav; i += 1) {
      wav = fs.readdirSync(downloads).find((name) => name.endsWith(".wav"));
      if (!wav) await new Promise((resolve) => setTimeout(resolve, 250));
    }
    if (!wav) fail("film score", "render produced no WAV within 60 s");
    fs.renameSync(path.join(downloads, wav), output);
    const unique = [...new Set(problems)];
    if (unique.length) fail("film score", `pattern rendered with errors: ${unique.slice(0, 4).join(" | ")}. Fix: use synth sounds (sine, triangle, square, sawtooth, white, pink, brown) and note names like c3; samples are not loaded`);
    process.stdout.write(`${JSON.stringify(jsonResult(true, { status: "rendered", output, events }))}\n`);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
    if (server) server.close();
    // Also on failure: a failed render must not leave an empty .score-* folder beside the output.
    if (downloads) fs.rmSync(downloads, { recursive: true, force: true });
  }
})();

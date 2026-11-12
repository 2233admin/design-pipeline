"use strict";

// Scratch projects for the tunables tests: a film (GSAP timeline, CSS custom property, canvas) and a
// plain page (CSS units, data-tn-* selectors, data-tn-text), both wired through tunables.js.

const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { resolveBrowser } = require("../../skill/scripts/browser-locate.cjs");
const { resolvePuppeteer } = require("../../skill/scripts/film-capture-core.cjs");
const tunables = require("../../skill/scripts/tunables-core.cjs");

const cliFile = path.join(__dirname, "../../skill/scripts/designer-pipeline.cjs");

function browserTools() {
  try {
    const puppeteerModule = process.env.DESIGN_PIPELINE_PUPPETEER_MODULE || require.resolve("puppeteer-core");
    resolvePuppeteer(process.cwd(), puppeteerModule);
    return { puppeteerModule, chrome: resolveBrowser(), gsap: require.resolve("gsap/dist/gsap.min.js") };
  } catch (error) {
    if (!["TOOL_MISSING", "MODULE_NOT_FOUND"].includes(error.code)) throw error;
    return { skip: `browser or GSAP unavailable: ${error.message}` };
  }
}

const tmp = (name = "tunables-") => fs.mkdtempSync(path.join(os.tmpdir(), name));

// Runs the CLI with --json and returns { status, body }.
function cli(args, options = {}) {
  const run = spawnSync(process.execPath, [cliFile, ...args, "--json"], { encoding: "utf8", windowsHide: true, timeout: options.timeout || 120000 });
  let body = null;
  try { body = JSON.parse(run.stdout.trim().split("\n").at(-1)); } catch { body = { raw: run.stdout, stderr: run.stderr }; }
  return { status: run.status, body };
}

const tn = (dir, action, extra = []) => cli(["tunables", action, "--root", dir, "--project-root", dir, ...extra]);

// SHA-256 over every file under dir (path and bytes), so "nothing changed" is one comparison.
function hashTree(dir) {
  const hash = crypto.createHash("sha256");
  const walk = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else hash.update(path.relative(dir, full)).update(fs.readFileSync(full));
    }
  };
  walk(dir);
  return hash.digest("hex");
}

// Writes tunables.json (params, values) and the generated script into dir.
function declare(dir, params, values = {}) {
  tunables.writeTunables(dir, { schema: tunables.SCHEMA, params, values });
}

const FILM_PARAMS = [
  { id: "beat-duration", label: "Beat duration", group: "timing", type: "range", default: 2, min: 0.5, max: 3, step: 0.1, unit: "s" },
  { id: "accent", label: "Accent", group: "color", type: "color", default: "#ff0000" },
  { id: "canvas-fill", label: "Canvas fill", group: "color", type: "color", default: "#0000ff" },
  { id: "late-shift", label: "Late shift", group: "timing", type: "range", default: 0, min: 0, max: 200, step: 1, unit: "px" },
  { id: "ghost", label: "Ghost", group: "misc", type: "range", default: 1, min: 0, max: 5, step: 1 },
];

// A 640x360, 4 s composition: GSAP reads beat-duration and late-shift, CSS reads accent, a canvas
// reads canvas-fill, and ghost is read into a data attribute nothing draws.
function makeFilm(dir, gsapFile, options = {}) {
  fs.mkdirSync(dir, { recursive: true });
  fs.copyFileSync(gsapFile, path.join(dir, "gsap.min.js"));
  fs.writeFileSync(path.join(dir, "index.html"), `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=640, height=360">
<script src="tunables.js"></script>
<script src="gsap.min.js"></script>
<style>
html, body { margin: 0; width: 640px; height: 360px; overflow: hidden; background: #101418; }
#root { position: relative; width: 640px; height: 360px; }
#box { position: absolute; left: 40px; top: 40px; width: 120px; height: 120px; background: var(--tn-accent); }
#late { position: absolute; left: 40px; top: 170px; width: 60px; height: 20px; background: #fff; }
#c { position: absolute; left: 0; top: 200px; width: 640px; height: 160px; }
</style></head><body>
<div id="root" data-composition-id="main" data-start="0" data-duration="4" data-width="640" data-height="360">
  <div id="box"></div><div id="late"></div><canvas id="c" width="640" height="160"></canvas>
</div>
<script>
const tl = gsap.timeline({ paused: true });
tl.to("#box", { x: 400, duration: tunable("beat-duration"), ease: "none" }, 0);
tl.set("#late", { x: tunable("late-shift") }, 3.5);
tl.to({}, { duration: 4 }, 0);
const ctx = document.getElementById("c").getContext("2d");
ctx.fillStyle = tunable("canvas-fill");
ctx.fillRect(0, 0, 640, 160);
document.getElementById("box").dataset.ghost = String(tunable("ghost"));
window.__timelines["main"] = tl;
tl.seek(0);
</script></body></html>
`);
  declare(dir, options.params || FILM_PARAMS, options.values || {});
  return dir;
}

const PAGE_PARAMS = [
  { id: "accent", label: "Accent", group: "color", type: "color", default: "#0b5fff" },
  { id: "card-radius", label: "Card radius", group: "shape", type: "range", default: 8, min: 0, max: 48, step: 1, unit: "px" },
  { id: "density", label: "Density", group: "shape", type: "select", default: "comfortable", options: ["comfortable", "compact"] },
  { id: "grain", label: "Grain", group: "texture", type: "checkbox", default: false },
  { id: "title-text", label: "Title", group: "copy", type: "text", default: "Hello" },
];

// A page that reads every param without script: custom properties, attribute selectors, data-tn-text.
function makePage(dir, options = {}) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "index.html"), `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<script src="tunables.js"></script>
<style>
body { margin: 0; background: #fff; font: 20px system-ui; }
.card { margin: 16px; padding: 24px; background: var(--tn-accent); color: #fff; border-radius: var(--tn-card-radius); }
[data-tn-density="compact"] .card { padding: 8px; }
[data-tn-grain="true"] .card { outline: 4px dotted #000; }
</style></head><body>
<div class="card"><h1 data-tn-text="title-text">Hello</h1></div>
</body></html>
`);
  declare(dir, options.params || PAGE_PARAMS, options.values || {});
  return dir;
}

module.exports = { FILM_PARAMS, PAGE_PARAMS, browserTools, cli, declare, hashTree, makeFilm, makePage, tmp, tn };

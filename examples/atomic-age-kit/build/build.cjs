#!/usr/bin/env node
"use strict";

// Renders the ten atomic-age templates with the print-set content (data.cjs), checks each one, and writes
// the sheet's pictures.
//
//   node build.cjs            static check of every render (no browser)
//   node build.cjs --browser  render through the CLI with --browser and --png, write renders/<id>.jpg
//                             (needs headless Chrome and ffmpeg); SVGs go to .design-pipeline/atomic-age-kit/
//   node build.cjs --marks <dir> --out <dir>   private preview: also fill the mark slots from <dir>
//                             (never written into the repository)

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { RENDERS } = require("./data.cjs");

const KIT = path.join(__dirname, "..");
const REPO = path.join(KIT, "..", "..");
const CLI = path.join(REPO, "skill", "scripts", "designer-pipeline.cjs");
const bank = require(path.join(REPO, "skill", "tools", "template-bank", "bank.cjs"));
const FONTS = path.join(KIT, "fonts");
const ART = path.join(KIT, "art");

function dataUrl(file) {
  const type = /\.png$/i.test(file) ? "image/png" : /\.svg$/i.test(file) ? "image/svg+xml" : "image/jpeg";
  return `data:${type};base64,${fs.readFileSync(file).toString("base64")}`;
}

// Static: render in-process with the kit's fonts, check with the declared tones of the image slots.
function staticChecks(extra = {}) {
  return RENDERS.map((r) => {
    const set = { ...(r.set || {}) };
    for (const [slot, file] of Object.entries({ ...(r.images || {}), ...(extra[r.id] || {}) })) set[slot] = dataUrl(path.isAbsolute(file) ? file : path.join(ART, file));
    const out = bank.render(r.id, { set, params: r.params || {}, fontDir: FONTS });
    const report = bank.check(out.svg, { tones: r.tones || {} });
    return { id: r.id, status: report.status, findings: report.findings, fontSwitches: out.fontSwitches, svg: out.svg };
  });
}

function browserRenders({ outDir, jpgDir, marks = null }) {
  fs.mkdirSync(outDir, { recursive: true });
  if (jpgDir) fs.mkdirSync(jpgDir, { recursive: true });
  const chrome = process.env.DESIGN_PIPELINE_CHROME || require(path.join(REPO, "skill", "scripts", "browser-locate.cjs")).resolveBrowser();
  const pm = process.env.DESIGN_PIPELINE_PUPPETEER_MODULE || path.dirname(require.resolve("puppeteer-core/package.json", { paths: [REPO] }));
  const results = [];
  for (const r of RENDERS) {
    const args = [CLI, "template", "render", r.id, "-o", path.join(outDir, `${r.id}.svg`), "--png", path.join(outDir, `${r.id}.png`), "--font-dir", FONTS, "--browser", "--chrome", chrome, "--puppeteer-module", pm, "--root", "/", "--json"];
    const images = { ...(r.images || {}), ...((marks && marks.images[r.id]) || {}) };
    for (const [slot, file] of Object.entries(images)) if (file) args.push("--set", `${slot}=${path.isAbsolute(file) ? file : path.join(ART, file)}`);
    for (const [slot, value] of Object.entries({ ...(r.set || {}), ...((marks && marks.set[r.id]) || {}) })) args.push("--set", `${slot}=${value}`);
    for (const [name, value] of Object.entries({ ...(r.params || {}), ...((marks && marks.params[r.id]) || {}) })) args.push("--param", `${name}=${value}`);
    const run = spawnSync(process.execPath, args, { encoding: "utf8", maxBuffer: 64 << 20, timeout: 600000 });
    let payload = null; try { payload = JSON.parse(run.stdout); } catch { payload = null; }
    const check = payload?.result?.check || payload?.check || payload?.result || {};
    results.push({ id: r.id, status: check.status || payload?.error?.message || run.stderr.slice(0, 200), findings: (check.findings || []).map((f) => `${f.rule}:${f.slot || f.id || ""} ${f.message || ""}`) });
    if (jpgDir && fs.existsSync(path.join(outDir, `${r.id}.png`))) {
      spawnSync("ffmpeg", ["-y", "-loglevel", "error", "-i", path.join(outDir, `${r.id}.png`), "-vf", "scale='min(1200,iw)':-2", "-q:v", "6", path.join(jpgDir, `${r.id}.jpg`)]);
    }
  }
  return results;
}

if (require.main === module) {
  const argv = process.argv.slice(2);
  const flag = (name) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : null; };
  if (argv.includes("--browser") || flag("--marks")) {
    const marksDir = flag("--marks");
    const marks = marksDir ? require(path.join(path.resolve(marksDir), "marks.cjs")) : null;
    const outDir = path.resolve(flag("--out") || path.join(REPO, ".design-pipeline", "atomic-age-kit"));
    const results = browserRenders({ outDir, jpgDir: marks ? outDir : path.join(KIT, "renders"), marks });
    for (const r of results) console.log(r.id, r.status, r.findings.join(" | "));
    process.exitCode = results.every((r) => r.status === "passed") ? 0 : 2;
  } else {
    const results = staticChecks();
    for (const r of results) console.log(r.id, r.status, r.findings.map((f) => `${f.rule}:${f.slot} ${f.message}`).join(" | "));
    process.exitCode = results.every((r) => r.status === "passed") ? 0 : 2;
  }
}

module.exports = { staticChecks, browserRenders, dataUrl };

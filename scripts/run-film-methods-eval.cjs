#!/usr/bin/env node
"use strict";

// Reuses real example components, capture, HyperFrames and film checks; outputs stay local.
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { launch, recordStopMotion, serveStatic } = require("../evals/cases/capture-core.cjs");
const { runNpx } = require("../skill/scripts/film-capture-core.cjs");
const { decodePng } = require("../skill/scripts/png-core.cjs");

const REPO = path.resolve(__dirname, "..");
const CLI = path.join(REPO, "skill/scripts/designer-pipeline.cjs");
const FIXTURES = path.join(REPO, "evals/cases/film-methods");
const SOURCE = "evals/cases/skill-behavior/index.html";
const CASES = ["brand-promo", "feature-loop"];
const hash = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const write = (file, value) => fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);

function parseArgs(args) {
  assert.ok(args.every((arg) => arg === "--render" || arg === "--help"), "Only --render and --help are supported; output always uses a fresh ignored local directory");
  return { render: args.includes("--render"), help: args.includes("--help") };
}

function cli(args, allowed = [0]) {
  const result = spawnSync(process.execPath, [CLI, ...args, "--root", REPO, "--json"], { cwd: REPO, encoding: "utf8", windowsHide: true, maxBuffer: 64 << 20 });
  assert.ok(allowed.includes(result.status), result.stderr || result.stdout);
  return JSON.parse(result.stdout);
}

function prepareCases(output) {
  const local = path.join(REPO, ".design-pipeline");
  assert.ok(path.resolve(output).startsWith(`${local}${path.sep}`), "Evidence output must stay inside the repository's .design-pipeline directory");
  for (const id of CASES) assert.ok(!fs.existsSync(path.join(output, id)), "Refusing to overwrite existing film evidence");
  fs.mkdirSync(output, { recursive: true });
  const discovery = cli(["project", "inspect", "--project-root", ".", "--scope", SOURCE, "--query", "profile-form"]);
  write(path.join(output, "project-discovery.json"), discovery);
  return CASES.map((id) => {
    const dir = path.join(output, id);
    fs.mkdirSync(path.join(dir, "assets"), { recursive: true });
    for (const file of ["storyboard.json", "index.html"]) fs.copyFileSync(path.join(FIXTURES, id, file), path.join(dir, file));
    const plan = cli(["film", "methods", "--project-root", dir, "--input", path.join(FIXTURES, id, "plan.json"), "--write"]);
    assert.equal(plan.components[0].sha256, hash(path.join(REPO, SOURCE)), "component source binding");
    fs.copyFileSync(require.resolve("gsap/dist/gsap.min.js"), path.join(dir, "lib/gsap.min.js"));
    write(path.join(dir, "selection.json"), plan);
    fs.writeFileSync(path.join(dir, "reference.md"), `# Reference\n\n- Product: Design Pipeline's real account-settings evaluation example; not a production account service.\n- Component source: ${SOURCE}; SHA-256 ${plan.components[0].sha256}. Mode: frame-twin.\n- Brand: actual Chinese labels and light green tokens in that source, identified in selection.json; no house palette is invented.\n- Observed moving reference: none. Prompt Motion's two reviewed page descriptions are method discovery only; embedded films were not watched and music was not heard.\n- Production: record actual demo-only browser input on the original component, then frame its pixels with the selected Cinetic FilmMotion.E.ui adapter at 30 fps.\n- Adaptation: ${id === "feature-loop" ? "camera-return and matching seam states are adapted to a finite 2D scale cycle; no 3D orbit is claimed." : "isolating push and native UI changes serve one concrete form action; recipe frame counts are converted through the maintained caller-fps adapter."}\n- Capture observations and byte hashes: assets/capture.json (created only by actual capture).\n- Sound: intentional silence; no music or audition claim.\n- Visual Acceptance: not assessed.\n`);
    return { id, dir, plan };
  });
}

async function captureCases(cases) {
  const { server, origin } = await serveStatic(path.join(REPO, "evals/cases/skill-behavior"));
  let browser;
  try {
    browser = await launch();
    for (const item of cases) {
      const context = await browser.createBrowserContext();
      const page = await context.newPage();
      await page.setViewport({ width: 1000, height: 900 });
      await page.goto(origin, { waitUntil: "load" });
      // The real source owns focus styling; a manual caret avoids an unrelated blinking seam.
      await page.addStyleTag({ content: "input { caret-animation: manual; }" });
      const loop = item.id === "feature-loop", observations = [];
      await recordStopMotion(page, { file: path.join(item.dir, "assets/source.mp4"), frames: loop ? 120 : 180, scale: 1, settleMs: 0,
        setFrame: async (frame) => {
          if (loop) {
            if (frame === 40 || frame === 80) { await page.click("#notifications"); await page.evaluate(() => document.activeElement.blur()); }
          } else {
            await page.evaluate((index) => {
              const update = (id, value) => { const el = document.querySelector(id); if (el.value !== value) { el.value = value; el.dispatchEvent(new Event("input", { bubbles: true })); } };
              update("#full-name", "林晓雨".slice(0, Math.max(0, index - 15)));
              update("#email", "xiaoyu@example.com".slice(0, Math.max(0, index - 45)));
            }, frame);
            if (frame === 90) await page.click("#notifications");
            if (frame === 135) await page.click("button[type=submit]");
          }
          if ([0, 40, 80, 90, 135, (loop ? 119 : 179)].includes(frame)) observations.push({ frame, atSec: frame / 30, ...(await page.evaluate(() => ({ name: document.querySelector("#full-name").value, notifications: document.querySelector("#notifications").checked, status: document.querySelector("#save-status").textContent }))) });
        } });
      const state = await page.evaluate(() => ({ on: document.querySelector("#notifications").checked, status: document.querySelector("#save-status").textContent }));
      assert.equal(state.on, loop, "actual toggle interaction");
      if (!loop) assert.equal(state.status, "资料已保存。", "actual component save action");
      assert.equal(hash(path.join(REPO, SOURCE)), item.plan.components[0].sha256, "source must still match the selected component after capture");
      const tokens = await page.evaluate(() => { const css = getComputedStyle(document.body), button = getComputedStyle(document.querySelector("button")); return { background: css.backgroundColor, foreground: css.color, font: css.fontFamily, buttonBackground: button.backgroundColor, labels: [...document.querySelectorAll("label")].map((el) => el.textContent.trim()) }; });
      write(path.join(item.dir, "assets/capture.json"), { source: SOURCE, sourceSha256: hash(path.join(REPO, SOURCE)), sourceVideoSha256: hash(path.join(item.dir, "assets/source.mp4")), browser: browser.version(), frames: loop ? 120 : 180, fps: 30, observations, tokens, behaviorAssertions: "actual toggle and save handler passed", audio: "silent; not auditioned", componentConformance: "not-assessed", visualAcceptance: "not-assessed" });
      await context.close();
    }
  } finally { if (browser) await browser.close(); await new Promise((resolve) => server.close(resolve)); }
}

function changedShare(a, b) {
  assert.equal(a.width, b.width); assert.equal(a.height, b.height);
  let changed = 0;
  for (let i = 0; i < a.data.length; i += 4) if (Math.max(...[0, 1, 2].map((c) => Math.abs(a.data[i + c] - b.data[i + c]))) > 16) changed += 1;
  return changed / (a.width * a.height);
}

function checkLoopFrames(item, video, prefix) {
  const times = [0, 1.8, 2.3, 119 / 30];
  const frames = times.map((atSec, index) => {
    const file = path.join(item.dir, `${prefix}-${index}.png`);
    const result = spawnSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-ss", String(atSec), "-i", video, "-frames:v", "1", file], { windowsHide: true, encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    return decodePng(fs.readFileSync(file));
  });
  const seam = changedShare(frames[0], frames[3]), middle = frames.slice(1, 3).map((frame) => changedShare(frames[0], frame));
  write(path.join(item.dir, `${prefix}-pixels.json`), { timesSec: times, channelDeltaThreshold: 16, seam, middle, limits: "Pixel differences verify a bounded return and non-static middle, not aesthetic quality." });
  assert.ok(seam < 0.005, `${prefix}: start/end differ beyond codec tolerance (${seam})`);
  assert.ok(middle.every((share) => share > 0.0002), `${prefix}: middle frames must show actual change (${middle})`);
}

function renderCases(cases) {
  for (const item of cases) {
    const result = runNpx(["--no-install", "hyperframes", "render", "--output", "out.mp4", "--quiet", "--workers", "2"], { cwd: item.dir });
    fs.writeFileSync(path.join(item.dir, "render.log"), `${result.stdout || ""}\n${result.stderr || ""}`);
    assert.equal(result.status, 0, `render failed; inspect ${path.join(item.dir, "render.log")}`);
    const check = cli(["film", "check", "--project-root", item.dir], [0, 2]);
    write(path.join(item.dir, "film-check.json"), check);
    assert.equal(check.status, "passed", `film check failed; inspect ${path.join(item.dir, "film-check.json")}`);
    if (item.id === "feature-loop") {
      checkLoopFrames(item, path.join(item.dir, "assets/source.mp4"), "source-loop");
      checkLoopFrames(item, path.join(item.dir, "out.mp4"), "render-loop");
    }
    write(path.join(item.dir, "output.json"), { file: "out.mp4", sha256: hash(path.join(item.dir, "out.mp4")), filmTechnicalChecks: check.status, componentConformance: "not-assessed", visualAcceptance: "not-assessed" });
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) { console.log("node scripts/run-film-methods-eval.cjs [--render]\nPrepare real-component captures; --render also runs HyperFrames and film check. Output uses a fresh ignored .design-pipeline directory."); return; }
  const local = path.join(REPO, ".design-pipeline");
  fs.mkdirSync(local, { recursive: true });
  const output = fs.mkdtempSync(path.join(local, "film-methods-eval-"));
  console.log(`Evidence: ${output}`);
  try {
    const cases = prepareCases(output);
    await captureCases(cases);
    if (args.render) renderCases(cases);
    console.log(JSON.stringify({ output, cases: cases.map(({ id, dir }) => ({ id, dir })), rendered: args.render, visualAcceptance: "not-assessed" }));
  } catch (error) { fs.writeFileSync(path.join(output, "failure.log"), error.stack); throw error; }
}

module.exports = { CASES, FIXTURES, REPO, SOURCE, captureCases, changedShare, parseArgs, prepareCases, renderCases };
if (require.main === module) main().catch((error) => { console.error(error.stack); process.exitCode = 1; });

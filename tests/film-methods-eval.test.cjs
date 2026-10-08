"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { launch, serveStatic } = require("../evals/cases/capture-core.cjs");
const { changedShare, parseArgs, prepareCases, REPO } = require("../scripts/run-film-methods-eval.cjs");

test("eval rejects unsupported arguments, output escapes and overwrites; pixel comparison cannot accept a static middle", (t) => {
  assert.throws(() => parseArgs(["--case", "unknown"]), /Only --render/);
  assert.throws(() => parseArgs(["--output", "../user-work"]), /Only --render/);
  assert.throws(() => prepareCases(path.resolve(REPO, "../user-work")), /must stay inside/);
  const local = path.join(REPO, ".design-pipeline");
  fs.mkdirSync(local, { recursive: true });
  const output = fs.mkdtempSync(path.join(local, "film-methods-overwrite-test-"));
  t.after(() => fs.rmSync(output, { recursive: true, force: true }));
  fs.mkdirSync(path.join(output, "brand-promo"));
  const sentinel = path.join(output, "brand-promo", "index.html");
  fs.writeFileSync(sentinel, "existing user evidence");
  assert.throws(() => prepareCases(output), /Refusing to overwrite/);
  assert.equal(fs.readFileSync(sentinel, "utf8"), "existing user evidence");
  assert.deepEqual(parseArgs(["--render"]), { render: true, help: false });
  const first = { width: 2, height: 1, data: Buffer.from([10, 10, 10, 255, 10, 10, 10, 255]) };
  assert.equal(changedShare(first, first), 0);
  assert.equal(changedShare(first, { ...first, data: Buffer.from([10, 10, 10, 255, 40, 10, 10, 255]) }), 0.5);
});

test("real-component film fixtures use selected Cinetic motion at declared fps and return the loop camera", async (t) => {
  const local = path.join(REPO, ".design-pipeline");
  fs.mkdirSync(local, { recursive: true });
  const output = fs.mkdtempSync(path.join(local, "film-methods-test-"));
  t.after(() => fs.rmSync(output, { recursive: true, force: true }));
  const cases = prepareCases(output);
  const browser = await launch();
  try {
    for (const item of cases) {
      const { server, origin } = await serveStatic(item.dir);
      const page = await browser.newPage();
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      try {
      await page.goto(`${origin}/index.html`, { waitUntil: "load" });
      const state = await page.evaluate(() => {
        const tl = window.__timelines.main;
        const samples = [0, tl.duration() / 2, tl.duration()].map((time) => { tl.seek(time); return [Number(gsap.getProperty("#camera", "scaleX")), Number(gsap.getProperty("#camera", "x")), Number(gsap.getProperty("#camera", "y"))]; });
        tl.seek(tl.duration() / 4);
        return { duration: tl.duration(), samples, quarter: Number(gsap.getProperty("#camera", "scaleX")), easedHalf: FilmMotion.create({ fps: 30, bpm: 120 }).E.ui(0.5) };
      });
      assert.deepEqual(errors, []);
      const peak = item.id === "feature-loop" ? 1.04 : 1.035;
      assert.equal(state.duration, item.id === "feature-loop" ? 4 : 6, "frame/beat conversion must preserve actual duration");
      assert.deepEqual(state.samples, [[1, 0, 0], [peak, -24, -12], [1, 0, 0]], "the loop is dynamic and returns to its starting transform");
      assert.ok(Math.abs(state.quarter - (1 + (peak - 1) * state.easedHalf)) < 0.0001, "selected adapter easing actually drives the rendered camera");
      assert.equal(item.plan.components[0].mode, "frame-twin");
      assert.ok(item.plan.techniques.length > 0);
      } finally { await page.close(); await new Promise((resolve) => server.close(resolve)); }
    }
  } finally { await browser.close(); }
});

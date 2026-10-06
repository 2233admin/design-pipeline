"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { createLongScroll } = require("../skill/tools/art-motion/scroll.js");
const { resolveChrome, resolvePuppeteer } = require("../skill/scripts/film-capture-core.cjs");

function makeWorld({ direction = 1, viewport = { width: 240, height: 120 }, scale = 1 } = {}) {
  const start = { x: direction === 1 ? 0 : 200, y: 100 };
  const common = {
    groundAt: () => 100,
    drawBackground(context, frame) {
      context.fillStyle = frame.segment.id === "a" ? "#f00" : "#00f";
      context.fillRect(frame.segment.x0, 0, frame.segment.width, 220);
    },
    drawActor(context, frame) {
      context.fillStyle = frame.segment.id === "a" ? "#ff0" : "#0f0";
      context.fillRect(frame.actor.x - 10, frame.actor.y - 10, 20, 20);
    },
    drawForeground(context, frame) {
      if (frame.segment.id === "b") {
        context.fillStyle = "#fff";
        context.fillRect(102, 90, 6, 20);
      }
    },
  };
  return createLongScroll({
    segments: [
      { ...common, id: "a", width: 100, interactions: [{ id: "pause", at: 50, duration: 2 }] },
      { ...common, id: "b", width: 120 },
    ],
    viewport, start, speed: 10, direction, scale,
    camera: (state, view) => ({ x: state.actor.x - view.width / scale / 2, y: state.actor.y - view.height / scale / 2 }),
    actorBounds: (actor) => ({ x: actor.x - 10, y: actor.y - 10, width: 20, height: 20 }),
    earnedItemsAt: (state) => state.time >= 6 ? [{ id: "kept-token", from: "a" }] : [],
  });
}

function browserTools() {
  try { return { puppeteer: resolvePuppeteer(process.cwd(), process.env.DESIGN_PIPELINE_PUPPETEER_MODULE), chrome: resolveChrome() }; }
  catch (error) {
    if (error.code !== "TOOL_MISSING") throw error;
    return { skip: `browser is unavailable: ${error.message}` };
  }
}
const BROWSER = browserTools();
const SCRIPT = fs.readFileSync(path.join(__dirname, "../skill/tools/art-motion/scroll.js"), "utf8");

test("long-scroll layout preserves global timing, interaction pauses, boundary ground and earned-item callbacks", () => {
  const world = makeWorld();
  const layout = world.layout();
  assert.equal(layout.durationSec, 24);
  assert.deepEqual(layout.segments.map(({ id, x0, x1 }) => ({ id, x0, x1 })), [
    { id: "a", x0: 0, x1: 100 }, { id: "b", x0: 100, x1: 220 },
  ]);
  assert.deepEqual(layout.phases.map(({ kind, segmentId, startSec, endSec }) => [kind, segmentId, startSec, endSec]), [
    ["walk", "a", 0, 5], ["interaction", "a", 5, 7], ["walk", "a", 7, 12], ["walk", "b", 12, 24],
  ]);
  const hold = world.stateAt(6.25);
  assert.equal(hold.mode, "interaction");
  assert.equal(hold.actor.x, 50);
  assert.equal(hold.interaction.id, "pause");
  assert.equal(hold.interaction.progress, 0.625);
  assert.deepEqual(hold.earnedItems, [{ id: "kept-token", from: "a" }]);
  assert.equal(world.stateAt(12.01).segmentId, "b");
  assert.throws(() => createLongScroll({
    segments: [
      { id: "a", width: 10, groundAt: () => 20 },
      { id: "b", width: 10, groundAt: () => 23 },
    ], viewport: { width: 100, height: 100 }, start: { x: 0, y: 20 }, speed: 1,
    camera: () => ({ x: 0, y: 0 }), actorBounds: () => ({ x: 0, y: 0, width: 1, height: 1 }),
  }), /ground discontinuity/);
});

test("reverse traversal lays the worlds in route order without changing callback-owned style or pose", () => {
  const world = makeWorld({ direction: -1 });
  assert.deepEqual(world.layout().segments.map(({ id, x0, x1 }) => [id, x0, x1]), [["a", 100, 200], ["b", -20, 100]]);
  assert.equal(world.stateAt(11.25).actor.x, 107.5);
  assert.equal(world.stateAt(12).segmentId, "b");
});

test("browser draws one continuous actor through both style clips with foreground occlusion at multiple viewports and on reverse seek", { skip: BROWSER.skip }, async () => {
  let browser;
  try {
    browser = await BROWSER.puppeteer.launch({ executablePath: BROWSER.chrome, headless: true, args: ["--allow-file-access-from-files"] });
    const page = await browser.newPage();
    await page.setContent("<!doctype html><meta charset=utf-8><canvas id=c></canvas>");
    await page.addScriptTag({ content: SCRIPT });
    const renders = await page.evaluate(() => {
      function makeWorld({ direction, width, height, scale }) {
        const viewport = { width, height }, start = { x: direction === 1 ? 0 : 200, y: 100 };
        const segment = (id, span) => ({
          id, width: span, groundAt: () => 100,
          drawBackground(ctx, frame) { ctx.fillStyle = id === "a" ? "#f00" : "#00f"; ctx.fillRect(frame.segment.x0, 0, span, 220); },
          drawActor(ctx, frame) { ctx.fillStyle = id === "a" ? "#ff0" : "#0f0"; ctx.fillRect(frame.actor.x - 10, frame.actor.y - 10, 20, 20); },
          drawForeground(ctx) { if (id === "b") { ctx.fillStyle = "#fff"; ctx.fillRect(direction === 1 ? 102 : 92, 90, 6, 20); } },
          ...(id === "a" ? { interactions: [{ id: "pause", at: 50, duration: 2 }] } : {}),
        });
        return window.ArtMotionScroll.createLongScroll({
          segments: [segment("a", 100), segment("b", 120)], viewport, start, speed: 10, direction, scale,
          camera: (state, view) => ({ x: state.actor.x - view.width / scale / 2, y: state.actor.y - view.height / scale / 2 }),
          actorBounds: (actor) => ({ x: actor.x - 10, y: actor.y - 10, width: 20, height: 20 }),
          earnedItemsAt: (state) => state.time >= 6 ? [{ id: "kept-token" }] : [],
        });
      }
      function run(config) {
        const canvas = document.querySelector("#c"); canvas.width = config.width; canvas.height = config.height;
        const ctx = canvas.getContext("2d", { willReadFrequently: true }), world = makeWorld(config), boundaryX = 100;
        const read = (x, y) => Array.from(ctx.getImageData(Math.floor(x), Math.floor(y), 1, 1).data).slice(0, 3);
        function frame(time) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          const state = world.draw(ctx, time), sx = (boundaryX - state.camera.x) * config.scale, sy = (state.actor.y - state.camera.y) * config.scale;
          return {
            state: { x: state.actor.x, y: state.actor.y, mode: state.mode },
            left: read(sx - 1, sy), right: read(sx + 1, sy),
            occluded: read(((config.direction === 1 ? 105 : 95) - state.camera.x) * config.scale, sy), pixels: canvas.toDataURL(),
          };
        }
        const first = frame(11.25);
        frame(1);
        const reordered = frame(11.25);
        return { first, reordered, hold: world.stateAt(6.25).actor.x, size: [config.width, config.height] };
      }
      return [
        run({ direction: 1, width: 240, height: 120, scale: 1 }),
        run({ direction: 1, width: 120, height: 240, scale: 1.25 }),
        run({ direction: -1, width: 240, height: 120, scale: 1 }),
      ];
    });
    for (const [index, output] of renders.entries()) {
      assert.equal(output.first.state.x, index === 2 ? 107.5 : 92.5);
      assert.equal(output.hold, index === 2 ? 150 : 50);
      assert.equal(output.first.pixels, output.reordered.pixels, `cold/reordered pixels differ for case ${index}`);
      assert.deepEqual(output.first.occluded, [255, 255, 255], `foreground should cover actor for case ${index}`);
      const expectedLeft = index === 2 ? [0, 255, 0] : [255, 255, 0];
      const expectedRight = index === 2 ? [255, 255, 0] : [0, 255, 0];
      assert.deepEqual(output.first.left, expectedLeft, `incoming/outgoing style left of seam for case ${index}`);
      assert.deepEqual(output.first.right, expectedRight, `incoming/outgoing style right of seam for case ${index}`);
    }
  } finally { if (browser) await browser.close(); }
});

"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { resolveChrome, resolvePuppeteer } = require("../skill/scripts/film-capture-core.cjs");
const VisualCraft = require("../skill/tools/visual-craft/canvas.js");

function fakeContext() {
  return {
    font: "10px sans-serif", globalAlpha: 1, fillStyle: "#000", calls: [],
    save() { this.calls.push(["save"]); },
    restore() { this.calls.push(["restore"]); },
    beginPath() { this.calls.push(["beginPath"]); },
    moveTo(x, y) { this.calls.push(["moveTo", x, y]); },
    lineTo(x, y) { this.calls.push(["lineTo", x, y]); },
    closePath() { this.calls.push(["closePath"]); },
    fill(path) { this.calls.push(["fill", path]); },
    clip(path) { this.calls.push(["clip", path]); },
    fillRect(x, y, width, height) { this.calls.push(["fillRect", x, y, width, height]); },
    measureText(text) {
      const size = Number.parseFloat(this.font.match(/\d+(?:\.\d+)?px/)?.[0]) || 10;
      const width = Array.from(text).reduce((sum, char) => sum + (/\s/u.test(char) ? 0.34 : /[\u2E80-\u9FFF]/u.test(char) ? 1 : 0.58) * size, 0);
      return { width };
    },
  };
}

function area(points) {
  return Math.abs(points.reduce((sum, point, index) => {
    const next = points[(index + 1) % points.length];
    return sum + point[0] * next[1] - next[0] * point[1];
  }, 0) / 2);
}

test("pressure stroke samples by arc length and has deterministic, non-degenerate geometry", () => {
  const points = [[0, 0], [12, 0], [12, 18]];
  const options = { width: 8, spacing: 3, progress: 0.8, pressures: [0.2, 0.9, 0.35], seed: 48 };
  const first = VisualCraft.strokeGeometry(points, options);
  assert.deepEqual(VisualCraft.strokeGeometry(points, options), first);
  assert.notDeepEqual(VisualCraft.strokeGeometry(points, { ...options, seed: 49 }).outline, first.outline);
  assert.notDeepEqual(VisualCraft.strokeGeometry(points, { ...options, pressures: [1, 1, 1] }).outline, first.outline);
  assert.equal(first.length, 30);
  assert.equal(first.visibleLength, 24);
  assert.equal(first.samples.at(-1).distance, 24);
  assert.ok(first.outline.length >= 18);
  assert.ok(area(first.outline) > 20, "the brush should enclose visible area");
  assert.throws(() => VisualCraft.strokeGeometry([[0, 0], [0, 0]], { width: 8 }), /positive length/);
  assert.throws(() => VisualCraft.strokeGeometry(points, { width: 8, progress: 1.01 }), /progress/);
  assert.throws(() => VisualCraft.strokeGeometry(points, { width: 8, seed: -1 }), /seed/);
  const sparsePressures = new Array(3); sparsePressures[0] = 1;
  assert.throws(() => VisualCraft.strokeGeometry(points, { width: 8, pressures: sparsePressures }), /pressures\[1\]/);
  assert.throws(() => VisualCraft.strokeGeometry(new Array(2), { width: 8 }), /points\[0\]/);
  assert.throws(() => VisualCraft.strokeGeometry([[0, 0], [10000, 0]], { width: 8, spacing: 0.25 }), /samples/);
});

test("brush drawing restores Canvas state and grain stays deterministically clipped", () => {
  const context = fakeContext();
  const savedPath2D = globalThis.Path2D;
  globalThis.Path2D = class {
    constructor() { this.commands = []; }
    moveTo(x, y) { this.commands.push(["moveTo", x, y]); }
    lineTo(x, y) { this.commands.push(["lineTo", x, y]); }
    closePath() { this.commands.push(["closePath"]); }
  };
  try {
    const geometry = VisualCraft.drawBrush(context, [[0, 0], [20, 10]], { width: 6, color: "#222", seed: 7 });
    assert.ok(geometry.outline.length >= 4);
    assert.equal(context.calls[0][0], "save");
    assert.equal(context.calls.at(-1)[0], "restore");
    const fill = context.calls.find(([method]) => method === "fill");
    assert.ok(fill[1] instanceof globalThis.Path2D);
    assert.ok(fill[1].commands.some(([method]) => method === "closePath"));
    assert.ok(!context.calls.some(([method]) => ["beginPath", "moveTo", "lineTo"].includes(method)), "drawing uses a local Path2D and preserves the caller's current path");
  } finally {
    if (savedPath2D === undefined) delete globalThis.Path2D;
    else globalThis.Path2D = savedPath2D;
  }

  const path = {};
  const grainContext = fakeContext();
  VisualCraft.paperGrain(grainContext, path, { x: 3, y: 4, width: 50, height: 40 }, { seed: 11, count: 20 });
  const marks = grainContext.calls.filter(([method]) => method === "fillRect");
  assert.equal(grainContext.calls[1][0], "clip");
  assert.equal(grainContext.calls[1][1], path);
  const repeat = fakeContext();
  VisualCraft.paperGrain(repeat, path, { x: 3, y: 4, width: 50, height: 40 }, { seed: 11, count: 20 });
  assert.deepEqual(repeat.calls.filter(([method]) => method === "fillRect"), marks);
});

test("text wrapping preserves CJK, explicit newlines, long words and emoji; fit reports its minimum overflow", () => {
  const context = fakeContext();
  const source = "短句🙂\nUnbrokenWordIsKept";
  const layout = VisualCraft.wrapText(context, source, 32, "10px sans-serif");
  const clusters = (value) => Array.from(new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(value), (part) => part.segment);
  assert.deepEqual(layout.lines.flatMap(clusters), clusters(source).filter((cluster) => cluster !== "\n"));
  assert.ok(layout.lines.some((line) => line.includes("短")));
  assert.ok(layout.lines.some((line) => line.includes("🙂")));
  assert.ok(layout.lines.includes("UnbrokenWordIsKept"));
  assert.equal(layout.overflow, true);

  const fit = VisualCraft.fitText(context, "Supercalifragilisticexpialidocious", { width: 35, height: 30 }, { size: 20, minFontSize: 12, lineHeight: 1 });
  assert.equal(fit.ok, false);
  assert.equal(fit.overflow, true);
  assert.equal(fit.size, 12);
  assert.deepEqual(fit.overflowReasons, ["width"]);
  assert.deepEqual(fit.lines, ["Supercalifragilisticexpialidocious"]);
  assert.throws(() => VisualCraft.fitText(context, "x", { width: 20, height: 20 }, { size: 20, minFontSize: 0.5 }), /minFontSize/);

  const bounded = fakeContext();
  let measurements = 0;
  const measure = bounded.measureText;
  bounded.measureText = function (value) { measurements += 1; return measure.call(this, value); };
  assert.throws(() => VisualCraft.fitText(bounded, "界".repeat(100), { width: 1, height: 1 }, { size: 512, minFontSize: 1, step: 0.25, lineHeight: 1 }), /50000 Canvas measurements/);
  assert.equal(measurements, 50000);

  const longWordContext = fakeContext();
  let longWordMeasurements = 0;
  const longWordMeasure = longWordContext.measureText;
  longWordContext.measureText = function (value) { longWordMeasurements += 1; return longWordMeasure.call(this, value); };
  assert.throws(() => VisualCraft.fitText(longWordContext, "a".repeat(20000), { width: 1, height: 1 }, { size: 100, minFontSize: 1, step: 1, lineHeight: 1 }), /1000000 measured UTF-16 units/);
  assert.equal(longWordMeasurements, 50);
});

test("image placement returns centered contain/cropped cover rectangles and sprite frames clamp or loop", () => {
  assert.deepEqual(VisualCraft.imageRect(200, 100, { x: 10, y: 20, width: 100, height: 100 }, "contain"), {
    sx: 0, sy: 0, sw: 200, sh: 100, dx: 10, dy: 45, dw: 100, dh: 50,
  });
  const cover = VisualCraft.imageRect(200, 100, { x: 10, y: 20, width: 100, height: 100 }, "cover");
  assert.deepEqual(cover, { sx: 50, sy: 0, sw: 100, sh: 100, dx: 10, dy: 20, dw: 100, dh: 100 });
  assert.equal(VisualCraft.spriteFrame(0, 4, 10), 0);
  assert.equal(VisualCraft.spriteFrame(0.099, 4, 10), 0);
  assert.equal(VisualCraft.spriteFrame(0.1, 4, 10), 1);
  assert.equal(VisualCraft.spriteFrame(50, 4, 10), 3);
  assert.equal(VisualCraft.spriteFrame(0.4, 4, 10, { loop: true }), 0);
  assert.throws(() => VisualCraft.spriteFrame(-0.1, 4, 10), /time/);
});

test("the canonical Art Motion license keeps the MIT notice that canvas.js names", () => {
  const license = fs.readFileSync(path.join(__dirname, "../skill/tools/art-motion/LICENSE"), "utf8");
  assert.match(license, /Copyright \(c\) 2026 alchaincyf/);
  assert.match(license, /The above copyright notice and this permission notice shall be included in all\s+copies or substantial portions of the Software\./);
  assert.match(fs.readFileSync(path.join(__dirname, "../skill/tools/visual-craft/canvas.js"), "utf8"), /LICENSE\.art-motion/);
});

let browserTools;
try { browserTools = { puppeteer: resolvePuppeteer(process.cwd(), process.env.DESIGN_PIPELINE_PUPPETEER_MODULE), chrome: resolveChrome() }; }
catch (error) { if (error.code !== "TOOL_MISSING") throw error; browserTools = { skip: error.message }; }

test("browser study redraws cold/reordered at two sizes and preserves real Canvas state", { skip: browserTools.skip }, async () => {
  const browser = await browserTools.puppeteer.launch({ executablePath: browserTools.chrome, headless: true, args: ["--allow-file-access-from-files"] });
  const errors = [];
  try {
    const url = pathToFileURL(path.join(__dirname, "../skill/tools/visual-craft/study.html")).href;
    async function open(width) {
      const page = await browser.newPage();
      page.on("pageerror", error => errors.push(error.message));
      await page.setViewport({ width, height: 900 });
      await page.goto(url, { waitUntil: "load" });
      await page.evaluate(() => document.fonts.ready);
      return page;
    }
    const sample = (page, progress) => page.evaluate(p => {
      const state = window.renderStudy(p);
      return { state, pixels: document.querySelector("canvas").toDataURL(), control: document.querySelector("input").value, pageWidth: document.documentElement.scrollWidth };
    }, progress);
    for (const width of [390, 1280]) {
      const page = await open(width), cold = await open(width);
      const forward = await sample(page, 0.52);
      assert.equal(forward.state.fit.ok, true); assert.equal(forward.control, "0.52");
      assert.ok(forward.pageWidth <= width);
      await sample(page, 1); await sample(page, 0);
      assert.deepEqual(await sample(page, 0.52), forward);
      assert.deepEqual(await sample(cold, 0.52), forward);
      assert.equal(await page.evaluate(() => {
        const ctx = document.querySelector("canvas").getContext("2d");
        ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 0.4; ctx.font = "20px serif";
        ctx.beginPath(); ctx.rect(1, 1, 4, 4);
        const before = { alpha: ctx.globalAlpha, font: ctx.font, path: ctx.isPointInPath(2, 2) };
        VisualCraft.drawBrush(ctx, [[20, 20], [70, 35]], { width: 9 });
        const fit = VisualCraft.fitText(ctx, "LongUnbrokenLabel", { width: 10, height: 20 }, { size: 20, minFontSize: 16 });
        const same = ctx.globalAlpha === before.alpha && ctx.font === before.font && ctx.isPointInPath(2, 2) === before.path;
        ctx.restore();
        return same && !fit.ok && fit.size === 16;
      }), true);
      await page.close(); await cold.close();
    }
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});

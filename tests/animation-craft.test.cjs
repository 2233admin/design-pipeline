"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const path = require("node:path");
const patterns = require("../skill/references/film-choreography/patterns.js");
const { checkTimeline } = require("../skill/scripts/film-timeline-core.cjs");
const { resolveChrome, resolvePuppeteer } = require("../skill/scripts/film-capture-core.cjs");

function browserTools() {
  try {
    const puppeteer = resolvePuppeteer(process.cwd(), process.env.DESIGN_PIPELINE_PUPPETEER_MODULE);
    const chrome = resolveChrome();
    let gsapPath;
    try { gsapPath = require.resolve("gsap/dist/gsap.min.js"); }
    catch (error) {
      if (error.code !== "MODULE_NOT_FOUND") throw error;
      return { skip: `GSAP is unavailable: ${error.message}` };
    }
    return { puppeteer, chrome, gsapPath };
  } catch (error) {
    if (error.code !== "TOOL_MISSING") throw error;
    return { skip: `browser is unavailable: ${error.message}` };
  }
}

const BROWSER_TOOLS = browserTools();

function actionBoard() {
  return {
    schema: "design-pipeline.film-storyboard.v1", id: "held-poses", durationSec: 4, grammar: "product-demonstration",
    benefit: "One card shows its state.", proofAction: "The card moves to its new place.",
    sound: { mode: "silent", reason: "A motion-only gate regression." },
    beats: [{ id: "pose", startSec: 0, endSec: 4, role: "action", subject: "card", productAction: "Card changes pose", transformation: { kind: "state-change", from: "left", to: "right" }, handoff: "open", motion: ["pose-to-pose"] }],
  };
}

const set = (target, startSec, props, to) => ({ targets: [target], startSec, durationSec: 0, props, to });
const timelineOf = (tweens) => ({ schema: "design-pipeline.film-timeline.v1", compositionId: "main", durationSec: 4, tweens });
const findingCodes = (result) => result.findings.map(({ code }) => code);

function timeline() {
  const calls = [];
  const tl = new Proxy({}, { get: (_, method) => (...args) => { calls.push({ method, args }); return tl; } });
  return { tl, calls };
}

test("draw-on divides the drawing interval by SVG arc length and fits its pen-lift gap", () => {
  const { tl, calls } = timeline();
  const paths = [{ getTotalLength: () => 10 }, { getTotalLength: () => 30 }];
  const end = patterns["draw-on"](tl, { paths, at: 2, duration: 2, gap: 0.5 });
  const strokes = calls.filter(({ method }) => method === "fromTo");
  assert.equal(end, 4);
  assert.deepEqual(strokes.map(({ args }) => [args[3], args[2].duration]), [[2, 0.375], [2.875, 1.125]]);
  assert.equal(calls.filter(({ method }) => method === "set").length, 2);
  assert.ok(calls.filter(({ method }) => method === "set").every(({ args }) => args[1].immediateRender === true));
});

test("draw-on rejects bad geometry before adding anything to the timeline", () => {
  const { tl, calls } = timeline();
  assert.throws(() => patterns["draw-on"](tl, { paths: [{ getTotalLength: () => 5 }, {}], at: 0, duration: 1 }), /finite positive SVG length/);
  assert.equal(calls.length, 0);
  assert.throws(() => patterns["draw-on"](tl, { paths: [{ getTotalLength: () => 5 }, { getTotalLength: () => 5 }], at: 0, duration: 0.5, gap: 0.5 }), /positive drawing time/);
  assert.equal(calls.length, 0);
});

test("pose-to-pose preserves authored unequal spacing and switches held poses at their key time", () => {
  const { tl, calls } = timeline();
  const keys = [
    { at: 0, pose: { x: 0, y: 0 } },
    { at: 0.3, pose: { x: 10, y: -4 }, ease: "power2.in" },
    { at: 1.1, pose: { x: 30, y: -4 }, hold: true },
    { at: 1.4, pose: { x: 34, y: 0 }, ease: "power3.out" },
  ];
  const end = patterns["pose-to-pose"](tl, { subject: "#actor", at: 2, keys });
  assert.equal(end, 3.4);
  assert.deepEqual(calls.map(({ method, args }) => [method, args[method === "fromTo" ? 3 : 2]]), [
    ["set", 2],
    ["fromTo", 2],
    ["set", 3.1],
    ["fromTo", 3.1],
  ]);
  assert.ok(Math.abs(calls[1].args[2].duration - 0.3) < 1e-12);
  assert.ok(Math.abs(calls[3].args[2].duration - 0.3) < 1e-12);
  assert.equal(calls[1].args[2].ease, "power2.in");
  assert.equal(calls[1].args[2].immediateRender, false);
  assert.equal(calls[3].args[2].ease, "power3.out");
});

test("pose-to-pose sequences on one subject establish setup at their own start times", () => {
  const { tl, calls } = timeline();
  const keys = [{ at: 0, pose: { x: 0 } }, { at: 0.5, pose: { x: 10 } }];
  patterns["pose-to-pose"](tl, { subject: "#actor", at: 1, keys });
  patterns["pose-to-pose"](tl, { subject: "#actor", at: 3, keys });
  assert.deepEqual(calls.filter(({ method }) => method === "set").map(({ args }) => args[2]), [1, 3]);
  assert.ok(calls.filter(({ method }) => method === "set").every(({ args }) => args[1].immediateRender === undefined));
});

test("pose-to-pose immediately applies a first pose when its sequence starts at zero", () => {
  const { tl, calls } = timeline();
  patterns["pose-to-pose"](tl, { subject: "#actor", at: 0, keys: [{ at: 0, pose: { x: 20 } }, { at: 1, pose: { x: 30 } }] });
  assert.equal(calls[0].method, "set");
  assert.equal(calls[0].args[2], 0);
  assert.equal(calls[0].args[1].x, 20);
  assert.equal(calls[0].args[1].immediateRender, true);
});

test("pose-to-pose validates the entire contract before timeline mutation", () => {
  const invalid = [
    { subject: "#actor", at: 1, extra: true, keys: [{ at: 0, pose: { x: 0 } }, { at: 1, pose: { x: 2 } }] },
    { subject: "#actor", at: 1, keys: [{ at: 0, pose: { x: 0 } }, { at: 1, pose: { x: 2, width: 20 } }] },
    { subject: "#actor", at: 1, keys: [{ at: 0, pose: { x: 0 } }, { at: 1, pose: { x: NaN } }] },
    { subject: "#actor", at: 1, keys: [{ at: 0, pose: { x: 0 } }, { at: 1, pose: { x: 2, y: 3 } }] },
    { subject: "#actor", at: 1, keys: [{ at: 0, pose: { x: 0 } }, { at: 0, pose: { x: 2 } }] },
    { subject: "#actor", at: 1, keys: [{ at: 0, pose: { x: 0 } }, { at: 1, pose: { x: 2 }, surprise: true }] },
    { subject: {}, at: 1, keys: [{ at: 0, pose: { x: 0 } }, { at: 1, pose: { x: 2 } }] },
  ];
  for (const options of invalid) {
    const { tl, calls } = timeline();
    assert.throws(() => patterns["pose-to-pose"](tl, options));
    assert.equal(calls.length, 0);
  }
  const { tl, calls } = timeline();
  assert.equal(patterns["pose-to-pose"](tl, { subject: { nodeType: 1 }, at: 1, keys: [{ at: 0, pose: { opacity: 0 } }, { at: 0.5, pose: { opacity: 1 } }] }), 1.5);
  assert.equal(calls.length, 2);
});

test("held non-fade poses count only when later same-target transform values change", () => {
  const result = checkTimeline(timelineOf([
    set("#card", 0, ["x"], { x: 0 }),
    set("#card", 1, ["x"], { x: 30 }),
    set("#card", 2, ["x"], { x: 80 }),
  ]), actionBoard());
  assert.equal(result.status, "passed", JSON.stringify(result.findings));
  assert.ok(!findingCodes(result).includes("beat-static"));
  assert.equal(result.metrics.staticActionBeats, 0);
});

test("unchanged, initial-only and opacity-only held sets still fail action motion checks", () => {
  const same = checkTimeline(timelineOf([
    set("#card", 0, ["x"], { x: 10 }),
    set("#card", 1, ["x"], { x: 10 }),
    set("#card", 2, ["x"], { x: 10 }),
  ]), actionBoard());
  assert.ok(findingCodes(same).includes("beat-static"));

  const initial = checkTimeline(timelineOf([set("#card", 0, ["x"], { x: 10 })]), actionBoard());
  assert.ok(findingCodes(initial).includes("beat-static"));

  const opacity = checkTimeline(timelineOf([
    set("#card", 0, ["opacity"], { opacity: 0 }),
    set("#card", 1, ["opacity"], { opacity: 1 }),
  ]), actionBoard());
  assert.ok(findingCodes(opacity).includes("beat-fade-only"));
  assert.equal(opacity.metrics.fadeOnlyActionBeats, 1);

  const scale = checkTimeline(timelineOf([
    set("#card", 0, ["scale"], { scale: 1 }),
    set("#card", 1, ["scale"], { scale: 1.2 }),
  ]), actionBoard());
  assert.ok(findingCodes(scale).includes("beat-fade-only"));
});

test("held pose comparisons stay isolated by target and property", () => {
  const result = checkTimeline(timelineOf([
    set("#a", 0, ["x"], { x: 0 }),
    set("#a", 1, ["y"], { y: 30 }),
    set("#b", 1, ["x"], { x: 30 }),
    set("#a", 2, ["x"], { x: 0 }),
  ]), actionBoard());
  assert.ok(findingCodes(result).includes("beat-static"), JSON.stringify(result.findings));
});

test("a timed transform plus opacity pose changes is not measured as fade-only", () => {
  const result = checkTimeline(timelineOf([
    { targets: ["#card"], startSec: 1, durationSec: 1, props: ["x"], to: { x: 40 } },
    set("#card", 0, ["opacity"], { opacity: 0 }),
    set("#card", 2, ["opacity"], { opacity: 1 }),
  ]), actionBoard());
  assert.equal(result.status, "passed", JSON.stringify(result.findings));
  assert.equal(result.metrics.fadeOnlyActionBeats, 0);
});

test("real GSAP cold start, held keys, draw-on timing and reverse seek stay deterministic", { skip: BROWSER_TOOLS.skip }, async () => {
  let browser;
  try {
    browser = await BROWSER_TOOLS.puppeteer.launch({ executablePath: BROWSER_TOOLS.chrome, headless: true, args: ["--allow-file-access-from-files"] });
    const page = await browser.newPage();
    await page.setContent(`<!doctype html><html><body>
      <div id="actor"></div>
      <svg width="120" height="30"><path id="stroke-a" d="M0 0 L100 0" /><path id="stroke-b" d="M0 10 L100 10" /></svg>
    </body></html>`);
    await page.addScriptTag({ path: BROWSER_TOOLS.gsapPath });
    await page.addScriptTag({ path: path.join(__dirname, "../skill/references/film-choreography/patterns.js") });
    const states = await page.evaluate(() => {
      const gsap = window.gsap;
      const patterns = window.FilmPatterns;
      const actor = document.querySelector("#actor");
      const first = document.querySelector("#stroke-a");
      const second = document.querySelector("#stroke-b");
      const timeline = gsap.timeline({ paused: true });
      patterns["pose-to-pose"](timeline, { subject: actor, at: 0, keys: [
        { at: 0, pose: { x: 20 } },
        { at: 0.5, pose: { x: 60 }, hold: true },
        { at: 1, pose: { x: 80 }, hold: true },
      ] });
      patterns["pose-to-pose"](timeline, { subject: actor, at: 2, keys: [
        { at: 0, pose: { x: 100 } },
        { at: 0.5, pose: { x: 120 }, hold: true },
      ] });
      patterns["draw-on"](timeline, { paths: [first, second], at: 0.5, duration: 1, gap: 0.2 });
      const read = () => ({
        x: Number.parseFloat(gsap.getProperty(actor, "x")),
        firstOpacity: Number(getComputedStyle(first).opacity),
        firstOffset: Number.parseFloat(getComputedStyle(first).strokeDashoffset),
        secondOpacity: Number(getComputedStyle(second).opacity),
        secondOffset: Number.parseFloat(getComputedStyle(second).strokeDashoffset),
      });
      const result = { cold: read() };
      timeline.seek(0, true);
      result.zero = read();
      timeline.seek(0.499, true); result.beforePoseKey = read();
      timeline.seek(0.5, true); result.atPoseKey = read();
      timeline.seek(0.7, true); result.drawMidpoint = read();
      timeline.seek(1, true); result.strokeGap = read();
      timeline.seek(1.5, true); result.drawComplete = read();
      timeline.seek(1.999, true); result.beforeLaterSequence = read();
      timeline.seek(2, true); result.atLaterSequence = read();
      timeline.seek(2.5, true); result.end = read();
      timeline.seek(0, true); result.reverseZero = read();
      return result;
    });

    assert.equal(states.cold.x, 20, JSON.stringify(states.cold));
    assert.deepEqual(states.zero, states.cold);
    assert.equal(states.beforePoseKey.x, 20);
    assert.equal(states.atPoseKey.x, 60);
    assert.equal(states.beforeLaterSequence.x, 80);
    assert.equal(states.atLaterSequence.x, 100);
    assert.equal(states.end.x, 120);
    assert.equal(states.cold.firstOpacity, 0);
    assert.equal(states.cold.firstOffset, 100);
    assert.equal(states.cold.secondOpacity, 0);
    assert.equal(states.cold.secondOffset, 100);
    assert.ok(Math.abs(states.drawMidpoint.firstOffset - 50) < 1, JSON.stringify(states.drawMidpoint));
    assert.equal(states.strokeGap.firstOpacity, 1);
    assert.equal(states.strokeGap.firstOffset, 0);
    assert.equal(states.strokeGap.secondOpacity, 0);
    assert.equal(states.strokeGap.secondOffset, 100);
    assert.equal(states.drawComplete.secondOpacity, 1);
    assert.equal(states.drawComplete.secondOffset, 0);
    assert.deepEqual(states.reverseZero, states.cold);
  } finally {
    if (browser) await browser.close();
  }
});

"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { evaluateProbeFile, validateProbeFile, HINTS } = require("../skill/scripts/interaction-core.cjs");
const { changedPixelShare, mediaFingerprints, planScrollPoints, scrollBudgetMs, scrollResultFailure, settledMedia, statesDiffer, toImageRect } = require("../skill/scripts/interaction-scroll.cjs");
const { captureInteraction } = require("../skill/scripts/interaction-capture-core.cjs");
const { resolvePuppeteer } = require("../skill/scripts/film-capture-core.cjs");
const { resolveBrowser } = require("../skill/scripts/browser-locate.cjs");

const SCHEMA = "design-pipeline.interaction-probe.v1";
const PUPPETEER_MODULE = process.env.DESIGN_PIPELINE_PUPPETEER_MODULE;

const doc = (...probes) => ({ schema: SCHEMA, id: "scroll-scenes", url: "index.html", probes });
const scrollProbe = (extra = {}) => ({ id: "story", kind: "scroll", target: "#scene", ...extra });

// ---------- contract ----------

test("a scroll probe gets desktop and phone viewports, six steps and the motion probe's settle in both passes by default", () => {
  const [probe] = validateProbeFile(doc(scrollProbe())).probes;
  assert.deepEqual(probe, {
    id: "story", kind: "scroll", target: "#scene", points: 6, settleMs: 1200, reducedSettleMs: 1200, restWindowMs: 300, ignore: [],
    viewports: [{ width: 1440, height: 900, mobile: false }, { width: 390, height: 844, mobile: true }],
  });
  // Per viewport: a 2 s load allowance, the initial settle and 9 frames x (settle + rest), per pass.
  assert.equal(scrollBudgetMs(probe), 2 * 2 * (2000 + 1200 + 9 * 1500));
  assert.equal(scrollBudgetMs({ ...probe, reducedSettleMs: 400 }), 2 * ((2000 + 1200 + 9 * 1500) + (2000 + 400 + 9 * 700)));
  assert.deepEqual(validateProbeFile(doc(scrollProbe({ ignore: [".glow", ".particles *"] }))).probes[0].ignore, [".glow", ".particles *"]);
});

test("scroll probe fields are bounded and unknown fields are rejected before the browser starts", () => {
  const rejects = (probe, pattern) => assert.throws(() => validateProbeFile(doc(probe)), pattern);
  rejects(scrollProbe({ points: 1 }), /points must be an integer between 2 and 20/);
  rejects(scrollProbe({ points: 2.5 }), /points must be an integer/);
  rejects(scrollProbe({ settleMs: -1 }), /settleMs must be an integer between 0 and 3000/);
  rejects(scrollProbe({ restWindowMs: 10 }), /restWindowMs must be an integer between 50 and 2000/);
  rejects(scrollProbe({ viewports: [] }), /must list 1 to 4 viewports/);
  rejects(scrollProbe({ viewports: [{ width: 390, height: 844 }, { width: 390, height: 844, mobile: true }] }), /duplicates viewport 390x844/);
  rejects(scrollProbe({ viewports: [{ width: 390, height: 844, mobile: "yes" }] }), /mobile must be true or false/);
  rejects(scrollProbe({ exclude: ["#loop"] }), /exclude/);
  rejects(scrollProbe({ target: "" }), /target/);
  rejects(scrollProbe({ points: 20, settleMs: 3000, restWindowMs: 2000 }), /plans \d+ ms .*limit is 120000 ms/);
  rejects(scrollProbe({ reducedSettleMs: 5000 }), /reducedSettleMs must be an integer between 0 and 3000/);
  rejects(scrollProbe({ ignore: ".glow" }), /ignore must list at most 16 non-empty selectors/);
  rejects(scrollProbe({ ignore: [""] }), /ignore must list/);
  rejects(scrollProbe({ ignore: [".glow", ".glow"] }), /ignore lists a selector twice/);
  rejects({ id: "story", kind: "scrol", target: "#scene" }, /kind has invalid value scrol; allowed: audit, scroll/);
  rejects({ ...scrollProbe(), id: "" }, /id/);
  assert.throws(() => validateProbeFile(doc(scrollProbe(), scrollProbe())), /duplicates probe id story/);
});

// ---------- point plan and pixels ----------

test("progress runs over the pinned hold of a tall scene and through the viewport of a short one", () => {
  const hold = planScrollPoints({ top: 900, height: 2700, maxScroll: 10000 }, 900, 4);
  assert.equal(hold.range, "hold");
  assert.deepEqual(hold.points.map((point) => [point.label, point.plannedY]), [["before", 450], ["0%", 900], ["25%", 1350], ["50%", 1800], ["75%", 2250], ["100%", 2700], ["after", 3240]]);
  const through = planScrollPoints({ top: 900, height: 600, maxScroll: 10000 }, 900, 2);
  assert.equal(through.range, "pass-through");
  assert.deepEqual(through.points.map((point) => [point.label, point.progress, point.plannedY]), [["0%", 0, 0], ["50%", 0.5, 750], ["100%", 1, 1500]]);
  const clamped = planScrollPoints({ top: 900, height: 2700, maxScroll: 2000 }, 900, 2);
  assert.deepEqual(clamped.points.map((point) => point.plannedY), [450, 900, 1800, 2000, 2000]);
});

test("pixel change is counted inside the scene's visible region only, in screenshot pixels", () => {
  const image = (fill) => ({ width: 4, height: 2, data: Buffer.alloc(32, fill) });
  const a = image(0), b = image(0);
  b.data[0] = 200; // pixel (0,0) changes
  assert.equal(changedPixelShare(a, b, { x: 0, y: 0, width: 4, height: 2 }), 1 / 8);
  assert.equal(changedPixelShare(a, b, { x: 2, y: 0, width: 2, height: 2 }), 0);
  b.data[4] = 8; // a change of 8 of 255 is not a change
  assert.equal(changedPixelShare(a, b, { x: 1, y: 0, width: 1, height: 1 }), 0);
  // Pixels under an ignored element are left out of both the count and the area.
  assert.equal(changedPixelShare(a, b, { x: 0, y: 0, width: 4, height: 2 }, [{ x: 0, y: 0, width: 1, height: 1 }]), 0);
  assert.equal(changedPixelShare(a, b, { x: 0, y: 0, width: 4, height: 2 }, [{ x: 2, y: 0, width: 2, height: 2 }]), 1 / 4);
  // A 980 px layout shown on a 390 px phone screenshot: CSS px are scaled down into the image.
  assert.deepEqual(toImageRect({ x: 490, y: 0, width: 490, height: 100 }, { x: 0, y: 0, width: 980, height: 2122 }, { width: 390, height: 844 }), { x: 195, y: 0, width: 195, height: 100 * 844 / 2122 });
});

test("a canvas counts as changed when its averaged pixels move, not when resampling jitters them", () => {
  const canvas = (square, jitter = 0) => {
    const image = { width: 64, height: 32, data: Buffer.alloc(64 * 32 * 4, 30) };
    for (let y = 8; y < 24; y += 1) for (let x = square; x < square + 8; x += 1) image.data.fill(250, (y * 64 + x) * 4, (y * 64 + x) * 4 + 3);
    for (let index = 0; index < image.data.length; index += 7) image.data[index] = Math.min(255, image.data[index] + jitter);
    return image;
  };
  const rect = [{ x: 0, y: 0, width: 64, height: 32 }];
  const at = (image) => ({ state: "dom", media: mediaFingerprints(image, rect) });
  assert.equal(statesDiffer(at(canvas(4)), at(canvas(4, 5))), false);
  assert.equal(statesDiffer(at(canvas(4)), at(canvas(40))), true);
  assert.equal(statesDiffer(at(canvas(4)), { state: "dom", media: mediaFingerprints(canvas(4), [{ x: 60, y: 0, width: 64, height: 32 }]) }), true, "a canvas leaving the viewport is a change");
  assert.equal(statesDiffer({ state: "a", media: [] }, { state: "b", media: [] }), true);
  // A canvas that played on its own during the rest window is not evidence that the scene started.
  const loop = settledMedia(mediaFingerprints(canvas(4), rect), mediaFingerprints(canvas(40), rect));
  assert.deepEqual(loop, ["moving"]);
  assert.equal(statesDiffer({ state: "dom", media: loop }, at(canvas(20))), false);
});

// ---------- evaluation ----------

const quiet = { structural: false, shiftPx: 0, opacity: 0, pixelShare: 0 };

function pass(viewport, passName, states, rests = [], scrollYs = null) {
  const labels = ["before", ...states.map((_, index) => `${Math.round((index / (states.length - 1)) * 100)}%`), "after"];
  const all = ["s-before", ...states, "s-after"];
  return {
    viewport, pass: passName, range: "hold",
    points: labels.map((label, index) => ({
      label, progress: index === 0 || index === labels.length - 1 ? null : (index - 1) / (states.length - 1),
      plannedY: index * 100, scrollY: scrollYs ? scrollYs[index] : index * 100, state: all[index], elements: 3, rest: rests[index] || quiet,
    })),
  };
}

function capture(passes, extra = {}) {
  return { schema: "design-pipeline.interaction-capture.v1", url: "file:///p/index.html", pageOrigin: "file:", probes: [{ id: "story", kind: "scroll", passes, requests: [], ...extra }] };
}

const one = { viewports: [{ width: 800, height: 600 }] };
const view = { width: 800, height: 600, mobile: false };

test("a scene that changes across progress and rests at every held position passes", () => {
  const result = evaluateProbeFile(doc(scrollProbe(one)), capture([pass(view, "motion", ["a", "b", "c"]), pass(view, "reduced", ["a", "a", "a"])]));
  assert.equal(result.status, "passed");
  assert.deepEqual(result.findings, []);
  assert.deepEqual(result.probes[0].coverage.map((entry) => [entry.pass, entry.changedPoints, entry.restingPoints, entry.points]), [["motion", 2, 5, 5], ["reduced", 0, 5, 5]]);
  assert.equal(scrollResultFailure(validateProbeFile(doc(scrollProbe(one))).probes[0], result.probes[0]), null);
});

test("a scene that measures the same from 0 to 100 % never started, and page errors are named", () => {
  const result = evaluateProbeFile(doc(scrollProbe(one)), capture([pass(view, "motion", ["a", "a", "a"]), pass(view, "reduced", ["a", "a", "a"])], { pageErrors: ["gsap is not defined"] }));
  assert.equal(result.status, "failed");
  assert.deepEqual(result.findings.map((finding) => [finding.code, finding.viewport, finding.pass]), [["scroll-never-started", "800x600", "motion"]]);
  const [finding] = result.findings;
  assert.match(finding.message, /same at all 3 progress points.*page errors: gsap is not defined/);
  assert.equal(finding.fix, HINTS["scroll-never-started"]);
  assert.match(finding.actual, /0 of 2 progress points differ from the 0 % frame/);
  assert.match(scrollResultFailure(validateProbeFile(doc(scrollProbe(one))).probes[0], { ...result.probes[0], status: "passed", findings: [] }), /never started/);
});

test("a page that never scrolled is reported as a scene that was never scrolled through", () => {
  const result = evaluateProbeFile(doc(scrollProbe(one)), capture([pass(view, "motion", ["a", "a", "a"], [], [0, 0, 0, 0, 0]), pass(view, "reduced", ["a", "a", "a"])]));
  assert.match(result.findings[0].message, /stayed at scrollY 0 for every progress point/);
});

test("movement inside the rest window never rests, in the motion and in the reduced-motion pass", () => {
  const moving = { structural: false, shiftPx: 12.5, opacity: 0, pixelShare: 0.02 };
  const fade = { structural: false, shiftPx: 0, opacity: 0.2, pixelShare: 0 };
  const pixels = { structural: false, shiftPx: 0, opacity: 0, pixelShare: 0.006 };
  const subThreshold = { structural: false, shiftPx: 2, opacity: 0.01, pixelShare: 0.005 };
  const result = evaluateProbeFile(doc(scrollProbe({ ...one, reducedSettleMs: 400 })), capture([
    pass(view, "motion", ["a", "b", "c"], [quiet, moving, subThreshold]),
    pass(view, "reduced", ["a", "a", "a"], [fade, pixels, quiet, { ...quiet, structural: true }]),
  ]));
  assert.deepEqual(result.findings.map((finding) => [finding.code, finding.pass]), [["scroll-never-rests", "motion"], ["scroll-never-rests", "reduced"]]);
  assert.match(result.findings[0].message, /1 of 5 held positions still changed during the 300 ms rest window after 1200 ms of settle: 0% \(12\.5 px/);
  assert.match(result.findings[1].message, /prefers-reduced-motion: reduce: 3 of 5 held positions still changed during the 300 ms rest window after 400 ms of settle/);
  assert.match(result.findings[1].message, /elements added or removed/);
  assert.equal(result.findings[1].fix, HINTS["scroll-never-rests"]);
});

test("a smooth-scroll drift of 1.5 px rests with motion allowed but not under reduced motion", () => {
  const drift = { structural: false, shiftPx: 1.5, opacity: 0, pixelShare: 0.001 };
  const result = evaluateProbeFile(doc(scrollProbe(one)), capture([
    pass(view, "motion", ["a", "b", "c"], [drift, drift, drift]),
    pass(view, "reduced", ["a", "a", "a"], [drift]),
  ]));
  assert.deepEqual(result.findings.map((finding) => [finding.code, finding.pass]), [["scroll-never-rests", "reduced"]]);
  assert.match(result.findings[0].expected, /at most 0\.5 px/);
});

test("points the scroller did not reach as planned are listed and noted, not failed", () => {
  const snapped = pass(view, "motion", ["a", "b", "c"], [], [0, 100, 200, 340, 400]);
  const result = evaluateProbeFile(doc(scrollProbe(one)), capture([snapped, pass(view, "reduced", ["a", "a", "a"])]));
  assert.equal(result.status, "passed");
  assert.deepEqual(result.probes[0].coverage[0].offPlan, [{ label: "100%", plannedY: 300, scrollY: 340 }]);
  assert.equal(result.probes[0].coverage[1].offPlan, undefined);
  assert.match(result.notes[0], /^story: 800x600 motion: 1 of 5 points ended away from the planned scroll position \(100% 300 -> 340\), for example by scroll snapping/);
});

test("an incomplete or reordered scroll capture is a contract error, not a pass", () => {
  const ok = [pass(view, "motion", ["a", "b", "c"]), pass(view, "reduced", ["a", "a", "a"])];
  const run = (passes) => evaluateProbeFile(doc(scrollProbe(one)), capture(passes));
  assert.throws(() => run(ok.slice(0, 1)), /incomplete scroll passes/);
  assert.throws(() => run([ok[1], ok[0]]), /missing or reordered/);
  const noEnd = structuredClone(ok);
  noEnd[0].points.splice(3, 1);
  assert.throws(() => run(noEnd), /does not cover 0 to 100 %/);
  const unmeasured = structuredClone(ok);
  delete unmeasured[0].points[2].rest;
  assert.throws(() => run(unmeasured), /rest is not a measurement/);
});

test("a scroll row that drops a pass or claims a pass over a moving scene does not complete natively", () => {
  const probe = validateProbeFile(doc(scrollProbe(one))).probes[0];
  const row = evaluateProbeFile(doc(scrollProbe(one)), capture([pass(view, "motion", ["a", "b", "c"]), pass(view, "reduced", ["a", "a", "a"])])).probes[0];
  assert.match(scrollResultFailure(probe, { ...row, coverage: row.coverage.slice(0, 1) }), /failed or incomplete/);
  assert.match(scrollResultFailure(probe, { ...row, coverage: [row.coverage[0], { ...row.coverage[1], restingPoints: 4 }] }), /never rests/);
});

test("a scroll probe's requests outside the project fail with the existing external-request finding", () => {
  const result = evaluateProbeFile(doc(scrollProbe(one)), capture([pass(view, "motion", ["a", "b", "c"]), pass(view, "reduced", ["a", "a", "a"])], { requests: ["https://cdn.example.com/gsap.min.js"] }));
  assert.deepEqual(result.findings.map((finding) => finding.code), ["external-request"]);
  assert.equal(result.status, "failed");
});

// ---------- real browser ----------

function missingTool() {
  for (const probe of [() => resolvePuppeteer(process.cwd(), PUPPETEER_MODULE), () => resolveBrowser()]) {
    try {
      probe();
    } catch (error) {
      if (error.code !== "TOOL_MISSING") throw error;
      return `no browser for the scroll probe (${error.message})`;
    }
  }
  return false;
}
const skip = missingTool();

const STYLE = "html,body{margin:0;background:#0e0e12;color:#eee;font:16px system-ui}.pad{height:600px;background:#1a1a22}#scene{height:300vh;position:relative}.stage{position:sticky;top:0;height:100vh;overflow:hidden;display:grid;place-items:center}#box{width:120px;height:120px;background:#4af}";
const PROGRESS = "var s=document.getElementById('scene');function p(){var r=s.getBoundingClientRect();return Math.min(1,Math.max(0,-r.top/(r.height-innerHeight)));}";

function page(script, { head = "", meta = true, stage = '<div id="box"></div>', body = null, style = STYLE } = {}) {
  return `<!doctype html><html><head><meta charset="utf-8">${meta ? '<meta name="viewport" content="width=device-width,initial-scale=1">' : ""}<link rel="icon" href="data:,"><style>${style}</style>${head}</head>
${body ?? `<body><div class="pad"></div><section id="scene"><div class="stage">${stage}</div></section><div class="pad"></div><script>${script}</script></body>`}</html>`;
}

const SCRUB = `${PROGRESS}var b=document.getElementById('box');function u(){b.style.transform='translateX('+((p()-0.5)*300)+'px)';}addEventListener('scroll',u,{passive:true});u();`;
// Smooth-scroll libraries ease; the well-behaved ones stop easing under reduced motion.
const REDUCE = "var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;";

const PAGES = {
  scrub: page(SCRUB),
  lerp06: page(`${PROGRESS}${REDUCE}var b=document.getElementById('box'),x=0;(function t(){var goal=(p()-0.5)*600;x=reduce?goal:x+(goal-x)*0.06;b.style.transform='translateX('+x+'px)';requestAnimationFrame(t);})();`),
  smoother: page("", { body: `<body><div id="wrap" style="position:fixed;top:0;left:0;width:100%"><div class="pad"></div><section id="scene"><div class="stage"><div id="box"></div></div></section><div class="pad"></div></div><div id="ghost"></div><script>${REDUCE}var w=document.getElementById('wrap'),y=0;document.getElementById('ghost').style.height=w.offsetHeight+'px';(function t(){y=reduce?scrollY:y+(scrollY-y)*0.08;w.style.transform='translateY('+(-y)+'px)';var r=document.getElementById('scene').getBoundingClientRect();document.getElementById('box').style.transform='translateX('+((-r.top/innerHeight)*100)+'px)';requestAnimationFrame(t);})();</script></body>` }),
  breathing: page(SCRUB, { head: "<style>@keyframes breathe{0%,100%{opacity:.85}50%{opacity:1}}.stage{animation:breathe 6s ease-in-out infinite}</style>" }),
  headerAndLoop: page("", { body: `<body><div class="pad"></div><section id="scene"><header id="bar" style="position:fixed;top:0;left:0;right:0;height:80px;background:#333"></header><div class="stage"><canvas id="cv" width="300" height="200" style="width:300px;height:200px"></canvas></div></section><div class="pad"></div><script>addEventListener('scroll',function(){document.getElementById('bar').style.height=scrollY>50?'40px':'80px';});var g=document.getElementById('cv').getContext('2d'),t=0;(function f(){t++;g.fillStyle='#222';g.fillRect(0,0,300,200);g.fillStyle='#fa4';g.fillRect((t*3)%260,80,40,40);requestAnimationFrame(f);})();</script></body>` }),
  inner: page("", { body: `<body style="overflow:hidden"><div id="sc" style="height:100vh;overflow-y:auto"><div class="pad"></div><section id="scene"><div class="stage"><div id="box"></div></div></section><div class="pad"></div></div><script>var sc=document.getElementById('sc'),b=document.getElementById('box');sc.addEventListener('scroll',function(){var r=document.getElementById('scene').getBoundingClientRect();b.style.transform='translateX('+(-r.top/3)+'px)';});</script></body>` }),
  fixedPage: page("", { body: `<body style="overflow:hidden"><section id="scene" style="height:50vh"><div id="box"></div></section></body>` }),
  snap: page(SCRUB, { style: `${STYLE}html{scroll-snap-type:y mandatory}.pad,#scene{scroll-snap-align:start}` }),
  dead: page("throw new Error('ScrollTrigger is not defined');"),
  lerp: page(`${PROGRESS}var b=document.getElementById('box'),x=0;(function t(){x+=((p()-0.5)*600-x)*0.015;b.style.transform='translateX('+x+'px)';requestAnimationFrame(t);})();`),
  reduceLoop: page(`${PROGRESS}var b=document.getElementById('box');if(!matchMedia('(prefers-reduced-motion: reduce)').matches){function u(){b.style.transform='translateY('+((p()-0.5)*200)+'px)';}addEventListener('scroll',u,{passive:true});u();}`, { head: "<style>@keyframes spin{to{transform:rotate(360deg)}}@media (prefers-reduced-motion: reduce){#box{animation:spin 2s linear infinite}}</style>" }),
  canvas: page(`${PROGRESS}var g=document.getElementById('cv').getContext('2d');function u(){g.fillStyle='#222';g.fillRect(0,0,300,200);g.fillStyle='#fa4';g.fillRect(p()*260,80,40,40);}addEventListener('scroll',u,{passive:true});u();`, { meta: false, stage: '<canvas id="cv" width="300" height="200" style="width:300px;height:200px"></canvas>' }),
  canvasStatic: page(`${PROGRESS}var g=document.getElementById('cv').getContext('2d');g.fillStyle='#222';g.fillRect(0,0,300,200);g.fillStyle='#fa4';g.fillRect(p()*260,80,40,40);`, { meta: false, stage: '<canvas id="cv" width="300" height="200" style="width:300px;height:200px"></canvas>' }),
};

async function scroll(name, viewport, framesDir = null, options = { points: 2, settleMs: 300, reducedSettleMs: 300, restWindowMs: 250 }) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dp-scroll-"));
  try {
    fs.writeFileSync(path.join(dir, "index.html"), PAGES[name]);
    const raw = doc(scrollProbe({ ...options, viewports: [viewport] }));
    const probeFile = path.join(dir, "interaction.json");
    fs.writeFileSync(probeFile, JSON.stringify(raw));
    const captured = await captureInteraction(probeFile, { doc: validateProbeFile(raw), puppeteerModule: PUPPETEER_MODULE, framesDir });
    return { captured, result: evaluateProbeFile(raw, captured, { project: dir }) };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

const desktop = { width: 800, height: 600 };
const codes = (result) => result.findings.map((finding) => `${finding.code}:${finding.pass}`);

test("a scrubbed sticky scene passes and leaves one labelled contact sheet per pass", { skip }, async () => {
  const sheets = fs.mkdtempSync(path.join(os.tmpdir(), "dp-scroll-sheets-"));
  try {
    const { captured, result } = await scroll("scrub", desktop, sheets);
    assert.deepEqual(codes(result), []);
    assert.equal(result.status, "passed");
    const [motion, reduced] = result.probes[0].coverage;
    assert.equal(motion.range, "hold");
    assert.equal(motion.changedPoints, 2);
    assert.equal(motion.restingPoints, 5);
    assert.equal(reduced.pass, "reduced");
    assert.deepEqual(fs.readdirSync(sheets).sort(), ["story-800x600-motion.jpg", "story-800x600-reduced.jpg"]);
    assert.equal(motion.sheet, "story-800x600-motion.jpg");
    const points = captured.probes[0].passes[0].points;
    assert.deepEqual(points.map((point) => point.label), ["before", "0%", "50%", "100%", "after"]);
    assert.ok(points.every((point) => point.scrollY === point.plannedY), JSON.stringify(points.map((point) => [point.plannedY, point.scrollY])));
  } finally {
    fs.rmSync(sheets, { recursive: true, force: true });
  }
});

test("a scene whose script threw never started, and the page error is named", { skip }, async () => {
  const { result } = await scroll("dead", desktop);
  assert.deepEqual(codes(result), ["scroll-never-started:motion"]);
  assert.match(result.findings[0].message, /ScrollTrigger is not defined/);
});

test("a scene that eases toward its target forever never rests", { skip }, async () => {
  const { result } = await scroll("lerp", desktop);
  assert.deepEqual(codes(result), ["scroll-never-rests:motion", "scroll-never-rests:reduced"]);
});

test("a loop that only runs under reduced motion fails only the reduced pass", { skip }, async () => {
  const { result } = await scroll("reduceLoop", desktop);
  assert.deepEqual(codes(result), ["scroll-never-rests:reduced"]);
});

test("a canvas scene on a phone page without a viewport meta tag is measured in screenshot pixels", { skip }, async () => {
  const phone = { width: 390, height: 844, mobile: true };
  const drawn = await scroll("canvas", phone);
  assert.deepEqual(codes(drawn.result), []);
  assert.equal(drawn.result.probes[0].coverage[0].changedPoints, 2);
  const still = await scroll("canvasStatic", phone);
  assert.deepEqual(codes(still.result), ["scroll-never-started:motion"]);
});

// The defaults where settling is what is being judged: six steps and 1200 ms of settle in both passes.
const DEFAULTS = { points: 6 };

test("a lerp of 0.06 per frame and a fixed smooth-scroll wrapper rest with motion allowed", { skip }, async () => {
  for (const name of ["lerp06", "smoother"]) {
    const { result } = await scroll(name, desktop, null, DEFAULTS);
    assert.deepEqual(codes(result), [], `${name}: ${JSON.stringify(result.probes[0].coverage.map((entry) => entry.maxRest))}`);
    assert.ok(result.probes[0].coverage[0].changedPoints > 0, name);
  }
});

test("a breathing stage never rests unless the probe ignores it, and then the scene still counts", { skip }, async () => {
  const plain = await scroll("breathing", desktop, null, DEFAULTS);
  assert.ok(codes(plain.result).includes("scroll-never-rests:motion"), JSON.stringify(codes(plain.result)));
  const ignored = await scroll("breathing", desktop, null, { ...DEFAULTS, ignore: [".stage"] });
  assert.deepEqual(codes(ignored.result), []);
  assert.ok(ignored.result.probes[0].coverage[0].changedPoints > 0);
});

test("a shrinking fixed header and a looping canvas do not make a static scene count as started", { skip }, async () => {
  const plain = await scroll("headerAndLoop", desktop);
  assert.ok(codes(plain.result).includes("scroll-never-started:motion"), JSON.stringify(codes(plain.result)));
  assert.ok(codes(plain.result).includes("scroll-never-rests:motion"), "the loop itself still moves");
  const ignored = await scroll("headerAndLoop", desktop, null, { points: 2, settleMs: 300, reducedSettleMs: 300, restWindowMs: 250, ignore: ["#cv"] });
  assert.deepEqual(codes(ignored.result), ["scroll-never-started:motion"]);
});

test("a scene inside an overflow scroller is scrolled through that scroller", { skip }, async () => {
  const { captured, result } = await scroll("inner", desktop);
  assert.deepEqual(codes(result), []);
  assert.equal(captured.probes[0].passes[0].scroller, "#sc");
  assert.ok(result.probes[0].coverage[0].changedPoints > 0);
});

test("a target with nothing to scroll is a contract error, not never-started", { skip }, async () => {
  await assert.rejects(scroll("fixedPage", desktop), /the target is not inside a scrollable area/);
});

test("points that scroll snapping moved are measured where they stopped and noted", { skip }, async () => {
  const { result } = await scroll("snap", desktop);
  assert.equal(result.status, "passed");
  assert.ok(result.probes[0].coverage[0].offPlan.length > 0);
  assert.match(result.notes.join("\n"), /ended away from the planned scroll position .*scroll snapping/);
});

"use strict";

/*
 * Scroll probes for `verify interaction`: photograph one scroll scene at fixed points of its scroll
 * progress (before, 0 %, 10 % ... 100 %, after) on every declared viewport, once with motion allowed
 * and once with `prefers-reduced-motion: reduce`, and decide two measurable failures:
 *
 * - never started: with motion allowed, the scene looks and measures the same at every progress
 *   point, so its scroll-driven animation never ran (a missing script, a scene that threw, a
 *   timeline bound to the wrong scroller, or a page that shows its finished composition at once);
 * - never rests: at a held scroll position the scene is still changing after the settle time, so
 *   it never comes to rest (a scrub that keeps easing, a feedback loop, a loop left running under
 *   reduced motion).
 *
 * The progress points, the before/after frames, the desktop plus phone pair and the reduced-motion
 * pass follow the method of taste-skill's scripts/scenes.mjs (MIT); no code is taken from it. Its
 * "never started" check reads class names its own runtime sets; this one measures the rendered
 * scene, so it holds for CSS scroll timelines, GSAP, Lenis or hand-written handlers alike.
 *
 * `scrollSceneState` and `scrollSceneRest` run inside the page through page.evaluate, which
 * serializes them with toString: each stays one self-contained function. The rest is plain Node:
 * the probe contract, the point plan, pixel comparison and the pure evaluator.
 */

const { assertKeys, assertString, fail, isObject } = require("./contract-utils.cjs");

const SCOPE = "interaction probe";
const SCROLL_KEYS = ["id", "kind", "target", "points", "settleMs", "restWindowMs", "viewports"];
const DEFAULT_SCROLL_VIEWPORTS = [{ width: 1440, height: 900, mobile: false }, { width: 390, height: 844, mobile: true }];
const DEFAULTS = { points: 10, settleMs: 1200, restWindowMs: 300 };
const MAX_VIEWPORTS = 4;
const MAX_VIEWPORT_PX = 4096;
const MAX_POINTS = 20;
// Planned waiting per probe (viewports x 2 passes x frames x (settle + rest window)). The CLI gives
// the capture kernel this budget on top of its usual minute, so the cap keeps one probe from asking
// for a run nobody waits for.
const MAX_BUDGET_MS = 120000;
const PASSES = ["motion", "reduced"];

// Thresholds of the contract, not tuning knobs. A scene element is still moving when its box moved
// more than 0.5 px or its opacity by more than 0.01 inside the rest window, the same "at rest"
// numbers the motion probe uses; a pixel has changed when one channel moved by more than 8 of 255,
// and the scene is still changing when more than 0.5 % of its visible pixels did.
const MOVE_EPS_PX = 0.5;
const OPACITY_EPS = 0.01;
const PIXEL_CHANNEL_EPS = 8;
const PIXEL_SHARE_EPS = 0.005;

const HINTS = {
  "scroll-never-started": "Make the scene run on scroll: check that its script loads without an error, that the scroll timeline or trigger is bound to this element and the page's real scroller, and that the scene starts from its first state rather than its finished composition. Then rerun; every progress point should differ from the 0 % frame somewhere.",
  "scroll-never-rests": "Let the scene settle when scrolling stops: end scrubbed tweens on the scroll position (scrub true or a short lag), stop easing loops that never reach their target, and pause looping decoration while the scene is held. Under reduced motion, jump to the state for the position instead of animating to it. A loop that is the point of the scene belongs outside the probed target.",
};

function integerBetween(value, label, min, max) {
  if (!Number.isInteger(value) || value < min || value > max) fail(SCOPE, `${label} must be an integer between ${min} and ${max}`);
}

function validateScrollViewports(list, label) {
  if (list === undefined) return DEFAULT_SCROLL_VIEWPORTS.map((viewport) => ({ ...viewport }));
  if (!Array.isArray(list) || list.length < 1 || list.length > MAX_VIEWPORTS) fail(SCOPE, `${label} must list 1 to ${MAX_VIEWPORTS} viewports`);
  const seen = new Set();
  return list.map((viewport, index) => {
    const at = `${label}[${index}]`;
    assertKeys(viewport, ["width", "height"], ["width", "height", "mobile"], at, SCOPE);
    integerBetween(viewport.width, `${at}.width`, 1, MAX_VIEWPORT_PX);
    integerBetween(viewport.height, `${at}.height`, 1, MAX_VIEWPORT_PX);
    if (viewport.mobile !== undefined && typeof viewport.mobile !== "boolean") fail(SCOPE, `${at}.mobile must be true or false`);
    const key = `${viewport.width}x${viewport.height}`;
    if (seen.has(key)) fail(SCOPE, `${at} duplicates viewport ${key}`);
    seen.add(key);
    return { width: viewport.width, height: viewport.height, mobile: viewport.mobile === true };
  });
}

function framesPerPass(points) {
  return points + 3;
}

function scrollBudgetMs(probe) {
  return probe.viewports.length * PASSES.length * framesPerPass(probe.points) * (probe.settleMs + probe.restWindowMs);
}

// Returns the probe with its defaults applied, so capture and evaluation never re-apply them.
function validateScrollProbe(probe, label) {
  assertKeys(probe, ["id", "kind", "target"], SCROLL_KEYS, label, SCOPE);
  assertString(probe.id, `${label}.id`, SCOPE);
  if (probe.kind !== "scroll") fail(SCOPE, `${label}.kind must be scroll`);
  assertString(probe.target, `${label}.target`, SCOPE);
  const points = probe.points ?? DEFAULTS.points;
  const settleMs = probe.settleMs ?? DEFAULTS.settleMs;
  const restWindowMs = probe.restWindowMs ?? DEFAULTS.restWindowMs;
  integerBetween(points, `${label}.points`, 2, MAX_POINTS);
  integerBetween(settleMs, `${label}.settleMs`, 0, 3000);
  integerBetween(restWindowMs, `${label}.restWindowMs`, 50, 2000);
  const normalized = { id: probe.id, kind: "scroll", target: probe.target, points, settleMs, restWindowMs, viewports: validateScrollViewports(probe.viewports, `${label}.viewports`) };
  const budget = scrollBudgetMs(normalized);
  if (budget > MAX_BUDGET_MS) fail(SCOPE, `${label} plans ${budget} ms of waiting (viewports x 2 passes x ${framesPerPass(points)} frames x (settleMs + restWindowMs)); the limit is ${MAX_BUDGET_MS} ms. Fix: lower points, settleMs or restWindowMs, or split the viewports across two probes`);
  return normalized;
}

// ---------- capture helpers (Node side) ----------

// The scroll positions to visit, from the scene's document geometry at load. A scene taller than
// the viewport is pinned for a hold of (height - viewport) px: progress runs over that hold, with
// one frame half a screen before it and one 0.6 screen after it. A scene no taller than the
// viewport has no hold: progress runs from its top entering at the bottom edge to its bottom
// leaving at the top edge. Every position is clamped to what the page can scroll.
function planScrollPoints(geometry, viewportHeight, points) {
  const { top, height, maxScroll } = geometry;
  const clamp = (y) => Math.round(Math.min(Math.max(0, y), Math.max(0, maxScroll)));
  const span = height - viewportHeight;
  const list = [];
  const hold = span > 0;
  if (hold) list.push({ label: "before", progress: null, plannedY: clamp(top - viewportHeight * 0.5) });
  for (let step = 0; step <= points; step += 1) {
    const ratio = step / points;
    const y = hold ? top + span * ratio : top - viewportHeight + (height + viewportHeight) * ratio;
    list.push({ label: `${Math.round(ratio * 100)}%`, progress: Math.round(ratio * 1000) / 1000, plannedY: clamp(y) });
  }
  if (hold) list.push({ label: "after", progress: null, plannedY: clamp(top + span + viewportHeight * 0.6) });
  return { range: hold ? "hold" : "pass-through", points: list };
}

// Share of pixels inside `rect` (viewport px) whose largest channel difference exceeds the
// contract threshold. Both images are decoded RGBA of the same size.
function changedPixelShare(a, b, rect) {
  if (a.width !== b.width || a.height !== b.height) return 1;
  const x0 = Math.max(0, Math.floor(rect.x));
  const y0 = Math.max(0, Math.floor(rect.y));
  const x1 = Math.min(a.width, Math.ceil(rect.x + rect.width));
  const y1 = Math.min(a.height, Math.ceil(rect.y + rect.height));
  if (x1 <= x0 || y1 <= y0) return 0;
  let changed = 0;
  for (let y = y0; y < y1; y += 1) {
    for (let x = x0; x < x1; x += 1) {
      const offset = (y * a.width + x) * 4;
      const delta = Math.max(Math.abs(a.data[offset] - b.data[offset]), Math.abs(a.data[offset + 1] - b.data[offset + 1]), Math.abs(a.data[offset + 2] - b.data[offset + 2]));
      if (delta > PIXEL_CHANNEL_EPS) changed += 1;
    }
  }
  return changed / ((x1 - x0) * (y1 - y0));
}

// A fingerprint of the pixels of each canvas or video fully inside the viewport: their content is
// not in the DOM, so a scene drawn on a canvas only counts as started when these pixels change. The
// crop is averaged into an 8 x 8 grid of RGB means: a scaled phone page resamples the same canvas a
// little differently at each scroll offset, which an exact hash would read as change.
const GRID = 8;
function mediaFingerprints(image, rects) {
  return rects.map((rect) => {
    const x0 = Math.round(rect.x), y0 = Math.round(rect.y), w = Math.round(rect.width), h = Math.round(rect.height);
    if (w < GRID || h < GRID || x0 < 0 || y0 < 0 || x0 + w > image.width || y0 + h > image.height) return null;
    const sums = new Array(GRID * GRID * 3).fill(0);
    const counts = new Array(GRID * GRID).fill(0);
    for (let y = 0; y < h; y += 1) {
      const row = Math.min(GRID - 1, Math.floor((y * GRID) / h));
      for (let x = 0; x < w; x += 1) {
        const cell = row * GRID + Math.min(GRID - 1, Math.floor((x * GRID) / w));
        const offset = ((y0 + y) * image.width + x0 + x) * 4;
        sums[cell * 3] += image.data[offset];
        sums[cell * 3 + 1] += image.data[offset + 1];
        sums[cell * 3 + 2] += image.data[offset + 2];
        counts[cell] += 1;
      }
    }
    return sums.map((sum, index) => Math.round(sum / counts[Math.floor(index / 3)]));
  });
}

// Two scene states differ when the DOM state differs, or when a canvas or video fingerprint moved
// by more than the pixel threshold in any cell (or one of them is outside the viewport).
function statesDiffer(a, b) {
  if (a.state !== b.state) return true;
  const left = a.media || [], right = b.media || [];
  if (left.length !== right.length) return true;
  return left.some((cells, index) => {
    const other = right[index];
    if (cells === null || other === null) return cells !== other;
    return cells.length !== other.length || cells.some((value, cell) => Math.abs(value - other[cell]) > PIXEL_CHANNEL_EPS);
  });
}

// A rect in layout-viewport CSS px, mapped to the pixels of a screenshot of the visual viewport.
function toImageRect(rect, frame, image) {
  const scaleX = image.width / frame.width;
  const scaleY = image.height / frame.height;
  return { x: (rect.x - frame.x) * scaleX, y: (rect.y - frame.y) * scaleY, width: rect.width * scaleX, height: rect.height * scaleY };
}

// ---------- in-page measurement ----------

// Runs in the page. The scene's own state at this scroll position: for the target and up to 400
// descendants, computed transform, opacity, filter, clip-path and visibility, and each box relative
// to its frame of reference (the nearest fixed or sticky ancestor inside the scene, else the
// target), so plain scrolling and pinning do not read as animation while any element that moves
// within the scene does. Text is included so a scroll-driven counter counts as change. The full
// record is kept on window for the rest comparison; only a hash and the geometry leave the page.
function scrollSceneState(selector) {
  const target = document.querySelector(selector);
  if (!target) return { found: false };
  const elements = [target, ...target.querySelectorAll("*")].slice(0, 401);
  const half = (value) => Math.round(value * 2) / 2;
  const reference = (element) => {
    for (let current = element; current; current = current.parentElement) {
      const position = getComputedStyle(current).position;
      if (position === "fixed" || position === "sticky" || current === target) return current;
    }
    return target;
  };
  const records = elements.map((element) => {
    const style = getComputedStyle(element);
    const box = element.getBoundingClientRect();
    const frame = reference(element);
    const origin = frame === element ? { x: box.x, y: box.y } : frame.getBoundingClientRect();
    return {
      key: [half(box.x - origin.x), half(box.y - origin.y), half(box.width), half(box.height), style.transform, style.opacity, style.filter, style.clipPath, style.visibility].join("|"),
      box: [box.x, box.y, box.width, box.height],
      opacity: Number(style.opacity),
    };
  });
  const text = target.textContent || "";
  let hash = 2166136261;
  const feed = (value) => {
    for (let index = 0; index < value.length; index += 1) {
      hash ^= value.charCodeAt(index);
      hash = Math.imul(hash, 16777619) >>> 0;
    }
  };
  for (const record of records) feed(record.key + "\n");
  feed(text);
  window.__scrollSceneRecords = records.map((record) => ({ box: record.box, opacity: record.opacity }));
  const box = target.getBoundingClientRect();
  const media = [...target.querySelectorAll("canvas, video")].slice(0, 4).map((element) => {
    const rect = element.getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  });
  const visible = {
    x: Math.max(0, box.x),
    y: Math.max(0, box.y),
    width: Math.max(0, Math.min(innerWidth, box.right) - Math.max(0, box.x)),
    height: Math.max(0, Math.min(innerHeight, box.bottom) - Math.max(0, box.y)),
  };
  // The screenshot shows the visual viewport: on a phone page without a viewport meta tag that is a
  // scaled-down 980 px layout, so the regions are mapped from CSS px to screenshot px in Node.
  const view = window.visualViewport;
  const frame = view ? { x: view.offsetLeft, y: view.offsetTop, width: view.width, height: view.height } : { x: 0, y: 0, width: innerWidth, height: innerHeight };
  return { found: true, hash: hash.toString(16), elements: records.length, media, visible, frame, scrollY: Math.round(scrollY) };
}

// Runs in the page after the rest window: how far the scene moved since scrollSceneState.
function scrollSceneRest(selector) {
  const target = document.querySelector(selector);
  const before = window.__scrollSceneRecords;
  if (!target || !Array.isArray(before)) return { found: false };
  const elements = [target, ...target.querySelectorAll("*")].slice(0, 401);
  let shiftPx = 0;
  let opacity = 0;
  const structural = elements.length !== before.length;
  if (!structural) {
    elements.forEach((element, index) => {
      const box = element.getBoundingClientRect();
      const was = before[index];
      shiftPx = Math.max(shiftPx, Math.abs(box.x - was.box[0]), Math.abs(box.y - was.box[1]), Math.abs(box.width - was.box[2]), Math.abs(box.height - was.box[3]));
      opacity = Math.max(opacity, Math.abs(Number(getComputedStyle(element).opacity) - was.opacity));
    });
  }
  return { found: true, shiftPx: Math.round(shiftPx * 1000) / 1000, opacity: Math.round(opacity * 1000) / 1000, structural };
}

// Runs in the page: where the scene sits in the document and how far the page can scroll.
function scrollSceneGeometry(selector) {
  const target = document.querySelector(selector);
  if (!target) return { found: false };
  const box = target.getBoundingClientRect();
  const scroller = document.scrollingElement || document.documentElement;
  // The viewport height in CSS px: a phone page without a viewport meta tag lays out 980 px wide, so
  // its screen is taller in CSS px than the device viewport the probe declared.
  const viewportHeight = document.documentElement.clientHeight || innerHeight;
  return { found: true, top: box.top + scrollY, height: box.height, viewportHeight, maxScroll: scroller.scrollHeight - viewportHeight };
}

// ---------- evaluation (pure) ----------

const round = (value, digits = 4) => Math.round(value * 10 ** digits) / 10 ** digits;

function restMoving(rest) {
  return rest.structural === true || rest.shiftPx > MOVE_EPS_PX || rest.opacity > OPACITY_EPS || rest.pixelShare > PIXEL_SHARE_EPS;
}

function readPass(shot, viewport, passName, label) {
  const at = `${label} ${viewport.width}x${viewport.height} ${passName}`;
  if (!isObject(shot) || shot.pass !== passName || shot.viewport?.width !== viewport.width || shot.viewport?.height !== viewport.height) fail(SCOPE, `${at} is missing or reordered`);
  if (!["hold", "pass-through"].includes(shot.range) || !Array.isArray(shot.points) || shot.points.length < 3) fail(SCOPE, `${at} has no progress points`);
  shot.points.forEach((point, index) => {
    const where = `${at} point ${index}`;
    if (!isObject(point) || typeof point.label !== "string" || typeof point.state !== "string" || !point.state) fail(SCOPE, `${where} has no measured state`);
    if (point.media !== undefined && !(Array.isArray(point.media) && point.media.every((cells) => cells === null || (Array.isArray(cells) && cells.every(Number.isFinite))))) fail(SCOPE, `${where}.media must list pixel fingerprints or null`);
    if (point.progress !== null && !(typeof point.progress === "number" && point.progress >= 0 && point.progress <= 1)) fail(SCOPE, `${where}.progress must be null or between 0 and 1`);
    for (const key of ["plannedY", "scrollY"]) if (!Number.isFinite(point[key])) fail(SCOPE, `${where}.${key} must be a number`);
    const rest = point.rest;
    if (!isObject(rest) || typeof rest.structural !== "boolean" || !["shiftPx", "opacity", "pixelShare"].every((key) => Number.isFinite(rest[key]) && rest[key] >= 0)) fail(SCOPE, `${where}.rest is not a measurement`);
  });
  const progress = shot.points.filter((point) => point.progress !== null);
  if (progress.length < 3 || progress[0].progress !== 0 || progress[progress.length - 1].progress !== 1) fail(SCOPE, `${at} does not cover 0 to 100 % of the scene's progress`);
  return { at, progress };
}

// One row per scroll probe: per viewport and pass the number of progress points whose scene differs
// from the 0 % frame and the largest movement inside a rest window, and the two findings.
function evaluateScroll(probe, shot) {
  assertKeys(shot, ["id", "kind", "passes"], ["id", "kind", "passes", "requests", "pageErrors"], `capture ${probe.id}`, SCOPE);
  if (shot.kind !== "scroll" || !Array.isArray(shot.passes) || shot.passes.length !== probe.viewports.length * PASSES.length) fail(SCOPE, `capture ${probe.id} has incomplete scroll passes`);
  const pageErrors = Array.isArray(shot.pageErrors) ? shot.pageErrors.filter((entry) => typeof entry === "string") : [];
  const coverage = [];
  const findings = [];
  probe.viewports.forEach((viewport, viewportIndex) => {
    PASSES.forEach((passName, passIndex) => {
      const recorded = shot.passes[viewportIndex * PASSES.length + passIndex];
      const { progress } = readPass(recorded, viewport, passName, `capture ${probe.id}`);
      const label = `${viewport.width}x${viewport.height}`;
      const changedPoints = progress.slice(1).filter((point) => statesDiffer(point, progress[0])).length;
      const scrolled = new Set(progress.map((point) => point.scrollY)).size > 1;
      const moving = recorded.points.filter((point) => restMoving(point.rest));
      const maxRest = {
        shiftPx: round(Math.max(...recorded.points.map((point) => point.rest.shiftPx))),
        opacity: round(Math.max(...recorded.points.map((point) => point.rest.opacity))),
        pixelShare: round(Math.max(...recorded.points.map((point) => point.rest.pixelShare))),
      };
      coverage.push({ viewport: { ...viewport }, pass: passName, range: recorded.range, points: recorded.points.length, changedPoints, restingPoints: recorded.points.length - moving.length, maxRest, ...(typeof recorded.sheet === "string" ? { sheet: recorded.sheet } : {}) });
      if (passName === "motion" && changedPoints === 0) {
        const cause = scrolled ? `the scene measured the same at all ${progress.length} progress points from 0 % to 100 %` : `the page stayed at scrollY ${progress[0].scrollY} for every progress point, so the scene was never scrolled through`;
        findings.push({
          code: "scroll-never-started", severity: "error", viewport: label, pass: passName, selector: probe.target,
          message: `${probe.target} never started at ${label}: ${cause} (element boxes within their frame, transform, opacity, filter, clip-path, visibility, text and canvas/video pixels)${pageErrors.length ? `; page errors: ${pageErrors.slice(0, 3).join(" | ")}` : ""}`,
          fix: HINTS["scroll-never-started"], actual: `0 of ${progress.length - 1} progress points differ from the 0 % frame`, expected: "at least 1 progress point after 0 % differs from it",
        });
      }
      if (moving.length) {
        const worst = moving.map((point) => `${point.label} (${point.rest.structural ? "elements added or removed, " : ""}${round(point.rest.shiftPx, 2)} px, opacity ${round(point.rest.opacity, 3)}, ${round(point.rest.pixelShare * 100, 2)} % pixels)`);
        findings.push({
          code: "scroll-never-rests", severity: "error", viewport: label, pass: passName, selector: probe.target,
          message: `${probe.target} never rests at ${label}${passName === "reduced" ? " with prefers-reduced-motion: reduce" : ""}: ${moving.length} of ${recorded.points.length} held positions still changed during the ${probe.restWindowMs} ms rest window after ${probe.settleMs} ms of settle: ${worst.slice(0, 6).join("; ")}${worst.length > 6 ? "; ..." : ""}`,
          fix: HINTS["scroll-never-rests"], actual: worst.slice(0, 6).join("; "), expected: `box moves at most ${MOVE_EPS_PX} px, opacity at most ${OPACITY_EPS}, at most ${PIXEL_SHARE_EPS * 100} % of visible scene pixels change`,
        });
      }
    });
  });
  return { id: probe.id, kind: "scroll", status: findings.some((finding) => finding.severity === "error") ? "failed" : "passed", coverage, findings };
}

// Native completion re-reads a scroll row against the normalized declaration: every viewport and
// pass present in order, the motion pass started and every pass at rest. The row's own status is
// never trusted alone.
function scrollResultFailure(probe, row) {
  const label = `Interaction scroll ${probe.id}`;
  if (!isObject(row) || row.id !== probe.id || row.kind !== "scroll" || row.status !== "passed" || !Array.isArray(row.findings) || row.findings.some((finding) => finding?.severity === "error") || !Array.isArray(row.coverage) || row.coverage.length !== probe.viewports.length * PASSES.length) return `${label} is failed or incomplete.`;
  for (const [index, entry] of row.coverage.entries()) {
    const viewport = probe.viewports[Math.floor(index / PASSES.length)];
    const pass = PASSES[index % PASSES.length];
    const at = `${label} at ${viewport.width}x${viewport.height} (${pass})`;
    if (entry?.viewport?.width !== viewport.width || entry?.viewport?.height !== viewport.height || entry.pass !== pass || !Number.isInteger(entry.points) || entry.points < 3 || !Number.isInteger(entry.changedPoints) || entry.changedPoints < 0) return `${at} is missing, reordered or unmeasured.`;
    if (pass === "motion" && entry.changedPoints < 1) return `${at} never started.`;
    if (entry.restingPoints !== entry.points) return `${at} never rests.`;
  }
  return null;
}

module.exports = {
  DEFAULT_SCROLL_VIEWPORTS, HINTS, PASSES,
  changedPixelShare, evaluateScroll, mediaFingerprints, planScrollPoints, scrollBudgetMs, scrollResultFailure, statesDiffer, toImageRect,
  scrollSceneGeometry, scrollSceneRest, scrollSceneState, validateScrollProbe,
};

"use strict";

// Drive real input at a page in headless Chrome and record what one target does, frame by frame.
// This layer only measures: the probe document arrives already validated (options.doc) and the
// findings are derived from these samples by the pure evaluator in interaction-core.cjs, which this
// file deliberately does not require. Browser discovery is the film capture's, re-worded for probes.

const fs = require("node:fs");
const path = require("node:path");
const { fileURLToPath, pathToFileURL } = require("node:url");
const { fail } = require("./contract-utils.cjs");
const { resolveChrome, resolvePuppeteer } = require("./film-capture-core.cjs");

const SCOPE = "interaction capture";
const CAPTURE_SCHEMA = "design-pipeline.interaction-capture.v1";
const PRE_INPUT_MS = 200;
const SAFETY_MS = 2000;
const STEP_MS = 1000 / 60;
const CLICK_HOLD_MS = 50;
const NON_NETWORK = /^(data|blob|about):/i;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)));

// Discovery stays in film-capture-core; only the wording is re-scoped, because a page under an
// interaction probe has no HyperFrames composition to run `npm i hyperframes` in. The code stays
// TOOL_MISSING so callers (and the browser test) can tell a missing tool from a broken capture.
function interactionPuppeteer(dir, explicit) {
  try {
    return resolvePuppeteer(dir, explicit);
  } catch (error) {
    if (error.code !== "TOOL_MISSING") throw error;
    fail(SCOPE, "puppeteer-core not found. Fix: run `npm i puppeteer-core` in the project that holds the page, or pass --puppeteer-module <path to puppeteer-core>", { code: "TOOL_MISSING" });
  }
}

function interactionChrome(explicit) {
  try {
    return resolveChrome(explicit);
  } catch (error) {
    if (error.code !== "TOOL_MISSING") throw error;
    fail(SCOPE, "headless Chrome not found. Fix: run `npx hyperframes browser ensure` to download one, set PUPPETEER_EXECUTABLE_PATH, or pass --chrome <path to chrome executable>", { code: "TOOL_MISSING" });
  }
}

function resolvePageUrl(probeFile, url) {
  if (/^https?:\/\//i.test(url)) return url;
  const file = path.resolve(path.dirname(probeFile), url);
  if (!fs.existsSync(file)) fail(SCOPE, `page not found: ${file}. Fix: point "url" at a file next to ${path.basename(probeFile)}, or at the http:// url of a running dev server`);
  return pathToFileURL(file).href;
}

function isNetworkUrl(url) {
  return typeof url === "string" && url.length > 0 && !NON_NETWORK.test(url);
}

// `file:` pages have no origin in the browser sense ("null"), so they compare by scheme instead.
function originOf(url) {
  if (url.startsWith("file:")) return "file:";
  try {
    return new URL(url).origin;
  } catch {
    fail(SCOPE, `cannot read an origin from ${url}. Fix: give "url" a full http:// or https:// url, or a path relative to the probe file`);
  }
}

// Runs in the page. One sample per animation frame on the frame clock (the rAF timestamp, not the
// callback's own execution time), so per-frame deltas measure the frames the user actually saw.
// The recording ends on the first frame at or after the settle deadline the driver sets when the
// input finishes, which is what gives the evaluator an endpoint sample past its own deadline
// without a timing race. `abortAfterMs` is only a safety bound for a page that stops animating.
// The target is re-queried every frame: a re-rendered node would otherwise leave a detached
// element behind, whose all-zero rect reads downstream as enormous motion.
function installRecorder(selector, abortAfterMs) {
  const state = { samples: [], phase: "pre", start: null, deadline: null, done: false, truncated: false, lost: false };
  const round = (value) => Math.round(value * 1000) / 1000;
  const frame = (timestamp) => {
    const element = document.querySelector(selector);
    if (!element) {
      state.lost = true;
      return;
    }
    if (state.start === null) state.start = timestamp;
    const elapsed = timestamp - state.start;
    const box = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    state.samples.push({
      t: round(elapsed),
      phase: state.phase,
      box: { x: round(box.x), y: round(box.y), width: round(box.width), height: round(box.height) },
      transform: style.transform,
      opacity: Number(style.opacity),
    });
    if (state.deadline !== null && elapsed >= state.deadline) {
      state.done = true;
      return;
    }
    if (elapsed >= abortAfterMs) {
      state.truncated = true;
      return;
    }
    requestAnimationFrame(frame);
  };
  window.__interactionRecording = state;
  requestAnimationFrame(frame);
}

async function targetCentre(page, selector) {
  return page.evaluate((css) => {
    const box = document.querySelector(css).getBoundingClientRect();
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  }, selector);
}

// How long the gesture is meant to take, known before it runs so the 5 s cap can be enforced
// against the input rather than discovered halfway through it.
function plannedInputMs(input) {
  if (input.kind === "pointer-sweep") return input.durationMs;
  if (input.kind === "wheel") return input.steps * input.intervalMs;
  return CLICK_HOLD_MS;
}

// 60 intermediate positions per planned second for the pointer. Keep every native move: skipping
// to the elapsed-time position after a delayed browser round trip creates an artificial jump.
// Pace each step after the previous move actually finishes, so a delayed driver cannot burst
// through overdue positions. A slow driver may take longer, as the wheel already does, and the
// recorder retains that real input duration and its safety bound.
async function driveInput(page, probe) {
  const input = probe.input;
  if (input.kind === "pointer-sweep") {
    const moveTo = (ratio) => page.mouse.move(input.from[0] + (input.to[0] - input.from[0]) * ratio, input.from[1] + (input.to[1] - input.from[1]) * ratio);
    const steps = Math.ceil(input.durationMs / STEP_MS);
    await moveTo(0);
    for (let step = 1; step <= steps; step += 1) {
      await sleep(input.durationMs / steps);
      await moveTo(step / steps);
    }
    return;
  }
  if (input.kind === "wheel") {
    // A wheel event goes to whatever is under the cursor, so park it on the target first.
    const centre = await targetCentre(page, probe.target);
    await page.mouse.move(centre.x, centre.y);
    for (let step = 0; step < input.steps; step += 1) {
      await page.mouse.wheel({ deltaY: input.deltaY / input.steps });
      await sleep(input.intervalMs);
    }
    return;
  }
  // A real press: pointerdown/mousedown, a human-length hold, then the release that makes a click.
  await page.mouse.move(input.at[0], input.at[1]);
  await page.mouse.down();
  await sleep(CLICK_HOLD_MS);
  await page.mouse.up();
}

// Runs in the real page. Resolve one component node per declaration; an unrelated or absent
// node is not the boolean false or missing attribute a caller may have expected.
function observeJourney(wrapperSelector, assertions) {
  const wrappers = document.querySelectorAll(wrapperSelector);
  if (wrappers.length !== 1) return { wrapperFound: false, observations: [] };
  const wrapper = wrappers[0];
  const observations = assertions.map(assertion => {
    const matches = document.querySelectorAll(assertion.selector);
    const element = matches.length === 1 && wrapper.contains(matches[0]) ? matches[0] : null;
    const identity = { selector: assertion.selector, kind: assertion.kind, ...(assertion.kind === "attribute" ? { name: assertion.name } : {}) };
    if (!element) return { ...identity, found: false, actual: null };
    let actual;
    if (assertion.kind === "text") actual = (element.textContent || "").trim();
    else if (assertion.kind === "attribute") actual = element.getAttribute(assertion.name);
    else if (assertion.kind === "focused") actual = document.activeElement === element;
    else {
      actual = [...element.getClientRects()].some(box => box.width > 0 && box.height > 0);
      for (let current = element; actual && current; current = current.parentElement) {
        const style = getComputedStyle(current);
        if (style.display === "none" || ["hidden", "collapse"].includes(style.visibility) || Number(style.opacity) === 0) actual = false;
      }
    }
    return { ...identity, found: true, actual };
  });
  return { wrapperFound: true, observations };
}

async function recordJourney(page, probe, recordedRequests, mark, assertLocalTarget) {
  const steps = [];
  for (const step of probe.steps) {
    assertLocalTarget();
    if (step.input?.kind === "click") {
      const contained = await page.evaluate((wrapperSelector, selector) => {
        const wrappers = document.querySelectorAll(wrapperSelector), elements = document.querySelectorAll(selector);
        return wrappers.length === 1 && elements.length === 1 && wrappers[0].contains(elements[0]);
      }, probe.target, step.input.selector);
      assertLocalTarget();
      if (!contained) fail(SCOPE, `probe "${probe.id}" step "${step.id}": click selector ${step.input.selector} must name one element inside ${probe.target}`);
      await page.click(step.input.selector);
    } else if (step.input?.kind === "key") await page.keyboard.press(step.input.key);
    assertLocalTarget();
    const startedAt = Date.now();
    await sleep(step.timeoutMs);
    assertLocalTarget();
    const observed = await page.evaluate(observeJourney, probe.target, step.assertions);
    assertLocalTarget();
    if (!observed.wrapperFound) fail(SCOPE, `probe "${probe.id}" step "${step.id}": stable wrapper ${probe.target} is missing or ambiguous`);
    steps.push({ id: step.id, elapsedMs: Date.now() - startedAt, observations: observed.observations });
  }
  return { id: probe.id, steps, requests: recordedRequests.slice(mark) };
}

async function recordProbe(page, probe, url, recordedRequests, timeoutMs) {
  const mark = recordedRequests.length;
  const pageErrors = [];
  const onError = (error) => pageErrors.push(error.message);
  const assertLocalTarget = () => {
    if (!url.startsWith("file:")) return;
    const actualUrl = page.url();
    if (!actualUrl.startsWith("file:") || path.relative(fs.realpathSync(fileURLToPath(url)), fs.realpathSync(fileURLToPath(actualUrl))) !== "") {
      fail(SCOPE, `probe "${probe.id}": actual local page ${actualUrl} differs from the requested target ${url}. Fix: remove the redirect or bind the probe to the page that is actually measured`, { code: "INTERACTION_TARGET_MISMATCH" });
    }
  };
  page.on("pageerror", onError);
  try {
    // A reload per probe is the reset: fresh DOM, fresh listeners, and its own load requests.
    await page.goto(url, { waitUntil: "networkidle0", timeout: timeoutMs });
    assertLocalTarget();
    const present = await page.evaluate((css) => Boolean(document.querySelector(css)), probe.target);
    if (!present) fail(SCOPE, `probe "${probe.id}": no element matches ${probe.target} on ${url}. Fix: point "target" at a selector the page has rendered by load, or probe a wrapper that is always present`);
    if (probe.steps) return await recordJourney(page, probe, recordedRequests, mark, assertLocalTarget);

    // Normalization has one owner (validateProbeFile); a missing field here is a caller bug.
    const settleWithinMs = probe.expect && typeof probe.expect.settleWithinMs === "number" ? probe.expect.settleWithinMs : null;
    if (settleWithinMs === null) fail(SCOPE, `probe "${probe.id}": expect.settleWithinMs is missing. Fix: pass the document returned by validateProbeFile, which fills the probe defaults in`);
    // No cap on the recording itself: design.md caps the settle window, and validateProbeFile
    // already limits settleWithinMs. Truncating a long but legal probe would hand the evaluator a
    // moving box as if it were the resting one. The safety bound below only catches a dead page.
    const inputMs = plannedInputMs(probe.input);
    const abortAfterMs = PRE_INPUT_MS + inputMs + settleWithinMs + SAFETY_MS;

    await page.evaluate(installRecorder, probe.target, abortAfterMs);
    await sleep(PRE_INPUT_MS);
    await page.evaluate(() => { window.__interactionRecording.phase = "input"; });
    await driveInput(page, probe);
    // The deadline is stamped on the page's own frame clock at the instant the input ends, and the
    // recorder stops on the first frame at or after it: the last sample is always at or beyond
    // inputEnd + settleWithinMs, whatever the frame jitter is.
    await page.evaluate((settleMs) => {
      const state = window.__interactionRecording;
      state.phase = "post";
      state.deadline = (state.start === null ? 0 : performance.now() - state.start) + settleMs;
    }, settleWithinMs);
    // Polled on a timer, not on frames: a page that stopped animating would never poll on rAF.
    await page.waitForFunction(() => {
      const state = window.__interactionRecording;
      return state.done || state.truncated || state.lost;
    }, { polling: 100, timeout: abortAfterMs + SAFETY_MS }).catch(() => {});
    const state = await page.evaluate(() => {
      const recording = window.__interactionRecording;
      return { samples: recording.samples, lost: recording.lost, done: recording.done };
    });
    if (state.lost) fail(SCOPE, `probe "${probe.id}": ${probe.target} disappeared from ${url} while the input was running. Fix: probe an element that survives the interaction, such as the wrapper the page re-renders into`);
    // A short recording is never read as "it settled": the page stopped animating before the
    // deadline, so the measurement is missing rather than clean.
    if (!state.done) fail(SCOPE, `probe "${probe.id}": the recording was truncated after ${state.samples.length} frame(s) — ${url} stopped producing animation frames before ${inputMs + settleWithinMs}ms of input and settle had elapsed${pageErrors.length ? ` (page errors: ${pageErrors.join(" | ")})` : ""}. Fix: check the page loads and animates without a script error, or lower expect.settleWithinMs to the time the motion actually takes`);
    assertLocalTarget();
    return { id: probe.id, samples: state.samples, requests: recordedRequests.slice(mark) };
  } finally {
    page.off("pageerror", onError);
  }
}

async function captureInteraction(probeFile, options = {}) {
  const doc = options.doc;
  if (!doc || typeof doc !== "object" || !Array.isArray(doc.probes) || !doc.probes.length) fail(SCOPE, "options.doc must be the probe document returned by validateProbeFile. Fix: validate the file first, then pass it as options.doc");
  if (typeof doc.url !== "string" || !doc.url) fail(SCOPE, "options.doc.url is missing. Fix: pass the document returned by validateProbeFile instead of a hand-built object");
  if (!doc.viewport || typeof doc.viewport.width !== "number" || typeof doc.viewport.height !== "number") fail(SCOPE, "options.doc.viewport is missing. Fix: pass the document returned by validateProbeFile, which fills the viewport default in");
  if (!probeFile) fail(SCOPE, "probe file path is required. Fix: pass the path of the interaction.json the document came from, so a relative url resolves");
  const file = path.resolve(probeFile);
  const url = resolvePageUrl(file, doc.url);
  const pageOrigin = originOf(url);
  const puppeteer = interactionPuppeteer(path.dirname(file), options.puppeteerModule);
  // Throttling would stretch animation frames to hundreds of milliseconds and make every settle
  // window a lie, so the flags that background a headless renderer are all off.
  const browser = await puppeteer.launch({
    executablePath: interactionChrome(options.chrome),
    headless: true,
    args: ["--allow-file-access-from-files", "--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows"],
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: doc.viewport.width, height: doc.viewport.height });
    await page.bringToFront();
    const requests = [];
    // Listening before the first navigation is what makes the load requests observable at all.
    // Only the non-network schemes are dropped: a favicon from another origin is exactly the
    // remote runtime resource the gate downstream exists to catch.
    page.on("request", (request) => { if (isNetworkUrl(request.url())) requests.push(request.url()); });
    const probes = [];
    for (const probe of doc.probes) probes.push(await recordProbe(page, probe, url, requests, options.timeoutMs || 30000));
    return { schema: CAPTURE_SCHEMA, url: url.startsWith("file:") ? page.url() : url, pageOrigin, probes };
  } finally {
    await browser.close();
  }
}

module.exports = { captureInteraction, resolvePageUrl };

"use strict";

// Timeline gate: compare what a HyperFrames composition actually animates (a timeline.json
// written by references/film-choreography/timeline-probe.js) with the storyboard it claims to
// implement. Catches layout tweens, infinite repeats, static or fade-only action beats, and
// planned continuity handoffs that no animated subject actually carries across the boundary.

const { assertKeys, assertString, fail } = require("./contract-utils.cjs");
const { checkStoryboard } = require("./film-core.cjs");
const { withFix } = require("./film-hints.cjs");

const TIMELINE_SCHEMA = "design-pipeline.film-timeline.v1";
const SCOPE = "film timeline";
const LAYOUT_PROPS = new Set(["top", "left", "right", "bottom", "width", "height", "display", "visibility", "margin", "marginTop", "marginLeft", "marginRight", "marginBottom", "padding", "paddingTop", "paddingLeft", "paddingRight", "paddingBottom"]);
const FADE_PROPS = new Set(["opacity", "autoAlpha", "scale", "scaleX", "scaleY"]);
const CARRIED_HANDOFFS = new Set(["continuation", "morph", "camera-carry"]);
const FRAME_TOLERANCE_SEC = 0.05;
const BOUNDARY_WINDOW_SEC = 0.35;

function validateTimeline(timeline) {
  assertKeys(timeline, ["schema", "compositionId", "durationSec", "tweens"], ["schema", "compositionId", "durationSec", "tweens"], "timeline", SCOPE);
  if (timeline.schema !== TIMELINE_SCHEMA) fail(SCOPE, `schema must be ${TIMELINE_SCHEMA}`);
  assertString(timeline.compositionId, "compositionId", SCOPE);
  if (!(timeline.durationSec > 0)) fail(SCOPE, "durationSec must be positive");
  if (!Array.isArray(timeline.tweens)) fail(SCOPE, "tweens must be an array");
  for (const [index, tween] of timeline.tweens.entries()) {
    const label = `tweens[${index}]`;
    assertKeys(tween, ["targets", "startSec", "durationSec", "props"], ["targets", "startSec", "durationSec", "props", "from", "to", "repeat"], label, SCOPE);
    if (!Array.isArray(tween.targets) || tween.targets.some((target) => typeof target !== "string")) fail(SCOPE, `${label}.targets must be a string array`);
    if (!Array.isArray(tween.props) || tween.props.some((prop) => typeof prop !== "string")) fail(SCOPE, `${label}.props must be a string array`);
    for (const key of ["startSec", "durationSec"]) {
      if (typeof tween[key] !== "number" || !Number.isFinite(tween[key]) || tween[key] < 0) fail(SCOPE, `${label}.${key} must be a non-negative number`);
    }
  }
}

// A tween is active in [start, end) of a window if it overlaps it; zero-length sets count at their instant.
function overlaps(tween, start, end) {
  const tweenEnd = tween.startSec + tween.durationSec;
  if (tween.durationSec === 0) return tween.startSec >= start && tween.startSec < end;
  return tween.startSec < end && tweenEnd > start;
}

function checkTimeline(timeline, board, options = {}) {
  validateTimeline(timeline);
  const storyboard = checkStoryboard(board, options);
  const findings = [];
  const add = (code, message, beatId) => findings.push(withFix("timeline", beatId ? { code, beatId, message } : { code, message }));

  if (Math.abs(timeline.durationSec - board.durationSec) > FRAME_TOLERANCE_SEC) add("duration-mismatch", `timeline is ${timeline.durationSec}s, storyboard declares ${board.durationSec}s`);
  for (const tween of timeline.tweens) {
    const layout = tween.props.filter((prop) => LAYOUT_PROPS.has(prop));
    if (layout.length) add("layout-tween", `${tween.targets.join(", ")} tweens layout ${layout.join(", ")} at ${tween.startSec}s; use transform aliases`);
    if (tween.repeat === -1) add("infinite-repeat", `${tween.targets.join(", ")} repeats forever at ${tween.startSec}s; renderer cannot seek a closed film`);
    if (tween.startSec + tween.durationSec > timeline.durationSec + FRAME_TOLERANCE_SEC) add("tween-past-end", `${tween.targets.join(", ")} runs past the film end`);
  }

  // Ambient targets (animated over most of the film, e.g. a drifting background) do not count.
  const coverage = new Map();
  for (const tween of timeline.tweens) for (const target of tween.targets) coverage.set(target, (coverage.get(target) || 0) + tween.durationSec);
  const ambient = new Set([...coverage].filter(([, total]) => total / timeline.durationSec > 0.6).map(([target]) => target));
  const subjects = (tween) => tween.targets.filter((target) => !ambient.has(target));
  const perBeat = board.beats.map((beat) => {
    const tweens = timeline.tweens.filter((tween) => subjects(tween).length > 0 && overlaps(tween, beat.startSec, beat.endSec));
    const animated = tweens.filter((tween) => tween.durationSec > 0);
    const propsUsed = new Set(animated.flatMap((tween) => tween.props));
    const targets = new Set(animated.flatMap(subjects));
    return { beat, tweens: animated, props: [...propsUsed].sort(), targets };
  });

  for (const { beat, tweens, props } of perBeat) {
    if (beat.role !== "action") continue;
    if (tweens.length === 0) add("beat-static", "action beat has no animated tween", beat.id);
    else if (props.every((prop) => FADE_PROPS.has(prop))) add("beat-fade-only", `action beat only animates ${props.join(", ")}`, beat.id);
  }

  // Continuity: a carried handoff needs one subject animated on both sides of the boundary.
  let carried = 0;
  let carriedPlanned = 0;
  for (let index = 1; index < board.beats.length; index += 1) {
    const beat = board.beats[index];
    if (!CARRIED_HANDOFFS.has(beat.handoff)) continue;
    carriedPlanned += 1;
    const boundary = beat.startSec;
    const before = new Set(timeline.tweens.filter((tween) => tween.durationSec > 0 && overlaps(tween, boundary - BOUNDARY_WINDOW_SEC, boundary)).flatMap(subjects));
    const after = timeline.tweens.filter((tween) => tween.durationSec > 0 && overlaps(tween, boundary, boundary + BOUNDARY_WINDOW_SEC)).flatMap(subjects);
    const shared = after.filter((target) => before.has(target));
    const spanning = timeline.tweens.some((tween) => tween.durationSec > 0 && tween.startSec < boundary && tween.startSec + tween.durationSec > boundary && subjects(tween).length > 0);
    if (shared.length || spanning) carried += 1;
    else add("handoff-not-carried", `planned ${beat.handoff} handoff at ${boundary}s but no animated subject spans or continues across it`, beat.id);
  }

  const actionBeats = perBeat.filter(({ beat }) => beat.role === "action");
  return {
    schema: TIMELINE_SCHEMA,
    id: board.id,
    compositionId: timeline.compositionId,
    status: storyboard.status === "passed" && findings.length === 0 ? "passed" : "failed",
    storyboard: { status: storyboard.status, findings: storyboard.findings },
    findings,
    metrics: {
      tweens: timeline.tweens.length,
      staticActionBeats: actionBeats.filter(({ tweens }) => tweens.length === 0).length,
      fadeOnlyActionBeats: actionBeats.filter(({ tweens, props }) => tweens.length && props.every((prop) => FADE_PROPS.has(prop))).length,
      ambientTargets: [...ambient].sort(),
      carriedHandoffs: carriedPlanned ? Number((carried / carriedPlanned).toFixed(3)) : null,
      beats: perBeat.map(({ beat, tweens, props, targets }) => ({ id: beat.id, tweens: tweens.length, props, targets: [...targets].sort() })),
    },
    creativeAcceptance: "not-assessed",
  };
}

module.exports = { TIMELINE_SCHEMA, checkTimeline };

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
    assertKeys(tween, ["targets", "startSec", "durationSec", "props"], ["targets", "startSec", "durationSec", "props", "from", "to", "repeat", "driver", "ease"], label, SCOPE);
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
  const add = (code, message, beatId, severity = "error") => findings.push(withFix("timeline", { code, severity, message, ...(beatId ? { beatId } : {}) }));

  if (Math.abs(timeline.durationSec - board.durationSec) > FRAME_TOLERANCE_SEC) add("duration-mismatch", `timeline is ${timeline.durationSec}s, storyboard declares ${board.durationSec}s`);
  for (const tween of timeline.tweens) {
    const layout = tween.props.filter((prop) => LAYOUT_PROPS.has(prop));
    if (layout.length) add("layout-tween", `${tween.targets.join(", ")} tweens layout ${layout.join(", ")} at ${tween.startSec}s; use transform aliases`);
    if (tween.repeat === -1) add("infinite-repeat", `${tween.targets.join(", ")} repeats forever at ${tween.startSec}s; renderer cannot seek a closed film`);
    if (tween.startSec + tween.durationSec > timeline.durationSec + FRAME_TOLERANCE_SEC) add("tween-past-end", `${tween.targets.join(", ")} runs past the film end`);
  }

  // Ambient targets (animated over most of the film by one long tween, e.g. a drifting
  // background) do not count. A subject carried through a one-take film is also animated most of
  // the time, but by a chain of separate actions; it stays a subject.
  const coverage = new Map();
  const longest = new Map();
  for (const tween of timeline.tweens) for (const target of tween.targets) {
    coverage.set(target, (coverage.get(target) || 0) + tween.durationSec);
    longest.set(target, Math.max(longest.get(target) || 0, tween.durationSec));
  }
  const ambient = new Set([...coverage].filter(([target, total]) => total / timeline.durationSec > 0.6 && longest.get(target) / timeline.durationSec >= 0.5).map(([target]) => target));
  const subjects = (tween) => (tween.driver ? [] : tween.targets.filter((target) => !ambient.has(target)));
  // One time source per property: two tweens driving the same property of the same element at
  // overlapping times fight each other (and stack their easing), so the motion is undefined.
  const tracks = new Map();
  for (const tween of timeline.tweens) {
    if (tween.driver || tween.durationSec <= 0) continue;
    for (const target of tween.targets) for (const prop of tween.props) {
      const key = `${target}|${prop}`;
      if (!tracks.has(key)) tracks.set(key, []);
      tracks.get(key).push(tween);
    }
  }
  const conflicts = [];
  for (const [key, list] of tracks) {
    list.sort((a, b) => a.startSec - b.startSec);
    for (let i = 1; i < list.length; i += 1) {
      const previousEnd = list[i - 1].startSec + list[i - 1].durationSec;
      if (list[i].startSec < previousEnd - 0.001) { conflicts.push({ key, at: list[i].startSec, until: Number(previousEnd.toFixed(3)) }); break; }
    }
  }
  for (const conflict of conflicts.slice(0, 8)) {
    const [target, prop] = conflict.key.split("|");
    add("property-conflict", `${target} ${prop} is driven by two tweens between ${conflict.at}s and ${conflict.until}s`);
  }
  // Linear easing on a moving element reads as mechanical; opacity and drivers are exempt.
  const LINEAR = /^(none|linear|power0(\.\w+)?)$/i;
  const linear = timeline.tweens.filter((tween) => !tween.driver && tween.durationSec > 0.3 && LINEAR.test(tween.ease || "") && tween.props.some((prop) => /^(x|y|z|xPercent|yPercent|scale[XYZ]?|rotat(e|ion)[XYZ]?|location[XYZ])$/.test(prop)));
  for (const tween of linear.slice(0, 5)) add("linear-motion", `${tween.targets.join(", ")} moves with ${tween.ease} easing for ${tween.durationSec}s at ${tween.startSec}s`, undefined, "warn");

  const perBeat = board.beats.map((beat) => {
    // Ambient targets do not count as a beat's subject, unless nothing else moves in the beat
    // (a single continuous shot, such as a Blender turntable, is all "ambient" by coverage).
    const own = timeline.tweens.filter((tween) => subjects(tween).length > 0 && overlaps(tween, beat.startSec, beat.endSec));
    const tweens = own.length ? own : timeline.tweens.filter((tween) => !tween.driver && overlaps(tween, beat.startSec, beat.endSec));
    const animated = tweens.filter((tween) => tween.durationSec > 0);
    const propsUsed = new Set(animated.flatMap((tween) => tween.props));
    const targets = new Set(animated.flatMap((tween) => (own.length ? subjects(tween) : tween.targets)));
    return { beat, tweens: animated, props: [...propsUsed].sort(), targets };
  });

  const drivers = timeline.tweens.filter((tween) => tween.driver && tween.durationSec > 0);
  const drivenBeats = new Set(board.beats.filter((beat) => drivers.some((tween) => overlaps(tween, beat.startSec, beat.endSec))).map((beat) => beat.id));
  for (const { beat, tweens, props } of perBeat) {
    if (beat.role !== "action") continue;
    // Procedurally driven beats (3D, shader, canvas) are judged from rendered pixels instead.
    if (tweens.length === 0 && drivenBeats.has(beat.id)) continue;
    if (tweens.length === 0) add("beat-static", "action beat has no animated tween", beat.id);
    else if (props.every((prop) => FADE_PROPS.has(prop))) add("beat-fade-only", `action beat only animates ${props.join(", ")}`, beat.id);
  }

  // Continuity: a carried handoff needs one subject animated on both sides of the boundary.
  // Opacity alone never carries: a panel fading out across the boundary while the next fades in
  // is a dissolve, however much the two fades overlap.
  const OPACITY_ONLY = new Set(["opacity", "autoAlpha"]);
  const carries = (tween) => tween.durationSec > 0 && tween.props.some((prop) => !OPACITY_ONLY.has(prop));
  let carried = 0;
  let proceduralHandoffs = 0;
  let carriedPlanned = 0;
  for (let index = 1; index < board.beats.length; index += 1) {
    const beat = board.beats[index];
    if (!CARRIED_HANDOFFS.has(beat.handoff)) continue;
    carriedPlanned += 1;
    const boundary = beat.startSec;
    const before = new Set(timeline.tweens.filter((tween) => carries(tween) && overlaps(tween, boundary - BOUNDARY_WINDOW_SEC, boundary)).flatMap(subjects));
    const after = timeline.tweens.filter((tween) => carries(tween) && overlaps(tween, boundary, boundary + BOUNDARY_WINDOW_SEC)).flatMap(subjects);
    const shared = after.filter((target) => before.has(target));
    const spanning = timeline.tweens.some((tween) => carries(tween) && tween.startSec < boundary && tween.startSec + tween.durationSec > boundary && subjects(tween).length > 0);
    const procedural = drivers.some((tween) => tween.startSec < boundary && tween.startSec + tween.durationSec > boundary) && !before.size && !after.length;
    if (shared.length || spanning) carried += 1;
    else if (procedural) proceduralHandoffs += 1;
    else add("handoff-not-carried", `planned ${beat.handoff} handoff at ${boundary}s but no animated subject spans or continues across it`, beat.id);
  }

  const actionBeats = perBeat.filter(({ beat }) => beat.role === "action");
  return {
    schema: TIMELINE_SCHEMA,
    id: board.id,
    compositionId: timeline.compositionId,
    status: storyboard.status === "passed" && !findings.some((finding) => finding.severity !== "warn") ? "passed" : "failed",
    storyboard: { status: storyboard.status, findings: storyboard.findings },
    findings,
    metrics: {
      tweens: timeline.tweens.length,
      staticActionBeats: actionBeats.filter(({ tweens }) => tweens.length === 0).length,
      fadeOnlyActionBeats: actionBeats.filter(({ tweens, props }) => tweens.length && props.every((prop) => FADE_PROPS.has(prop))).length,
      ambientTargets: [...ambient].sort(),
      proceduralBeats: [...drivenBeats].filter((id) => !perBeat.find((entry) => entry.beat.id === id).tweens.length),
      carriedHandoffs: carriedPlanned ? Number((carried / Math.max(1, carriedPlanned - proceduralHandoffs)).toFixed(3)) : null,
      proceduralHandoffs,
      beats: perBeat.map(({ beat, tweens, props, targets }) => ({ id: beat.id, tweens: tweens.length, props, targets: [...targets].sort() })),
    },
    creativeAcceptance: "not-assessed",
  };
}

module.exports = { TIMELINE_SCHEMA, checkTimeline };

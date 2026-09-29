"use strict";

// Timeline gate: compare what a HyperFrames composition actually animates (a timeline.json
// written by references/film-choreography/timeline-probe.js) with the storyboard it claims to
// implement. Catches layout tweens, infinite repeats, static or fade-only action beats, and
// planned continuity handoffs that no animated subject actually carries across the boundary.

const fs = require("node:fs");
const path = require("node:path");
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
  let carried = 0;
  let proceduralHandoffs = 0;
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

// ---------- composition source scan ----------

// Static scan of composition HTML for sources whose value depends on when or where the frame is
// computed, so the exported frame can differ from the previewed one. Motion must be a pure
// function of timeline time; jitter must be hash(seed, frameIndex). Seeded generators such as
// mulberry32 use none of these APIs and pass. Comments and string contents are ignored, and
// findings keep the original line numbers (every blanking step preserves length and newlines).
// Limits: only inline scripts and markup of the scanned HTML are read, not files loaded through
// <script src>; a regex literal containing a quote can confuse the string skipping.
const SOURCE_RULES = [
  { pattern: /\bMath\s*\.\s*random\b/g, name: () => "Math.random", why: "an unseeded random value differs on every render", severity: "error" },
  { pattern: /\bDate\s*\.\s*now\b/g, name: () => "Date.now", why: "the wall clock differs between preview and export", severity: "error" },
  { pattern: /\bperformance\s*\.\s*now\b/g, name: () => "performance.now", why: "the render-time clock differs between preview and export", severity: "error" },
  { pattern: /\brequestAnimationFrame\b/g, name: () => "requestAnimationFrame", why: "a frame callback runs on wall time, but the renderer seeks the timeline frame by frame", severity: "error" },
  { pattern: /\b(setTimeout|setInterval)\b/g, name: (match) => match[1], why: "a wall-clock callback does not fire at the seeked frame time", severity: "warn" },
];

const blankText = (text) => text.replace(/[^\n]/g, " ");

function blankJs(code) {
  let out = "";
  let index = 0;
  const length = code.length;
  while (index < length) {
    const char = code[index];
    const next = code[index + 1];
    if (char === "/" && next === "/") {
      let end = code.indexOf("\n", index);
      if (end < 0) end = length;
      out += blankText(code.slice(index, end));
      index = end;
    } else if (char === "/" && next === "*") {
      const close = code.indexOf("*/", index + 2);
      const end = close < 0 ? length : close + 2;
      out += blankText(code.slice(index, end));
      index = end;
    } else if (char === "\"" || char === "'") {
      let end = index + 1;
      while (end < length && code[end] !== char && code[end] !== "\n") end += code[end] === "\\" ? 2 : 1;
      end = Math.min(end + 1, length);
      out += blankText(code.slice(index, end));
      index = end;
    } else if (char === "`") {
      out += "`";
      index += 1;
      while (index < length && code[index] !== "`") {
        if (code[index] === "\\") {
          out += blankText(code.slice(index, index + 2));
          index += 2;
        } else if (code[index] === "$" && code[index + 1] === "{") {
          let depth = 1;
          let end = index + 2;
          while (end < length && depth > 0) {
            if (code[end] === "{") depth += 1;
            else if (code[end] === "}") depth -= 1;
            end += 1;
          }
          out += `\${${blankJs(code.slice(index + 2, depth === 0 ? end - 1 : end))}${depth === 0 ? "}" : ""}`;
          index = end;
        } else {
          out += blankText(code[index]);
          index += 1;
        }
      }
      if (index < length) out += "`";
      index += 1;
    } else {
      out += char;
      index += 1;
    }
  }
  return out;
}

function prepareSource(html) {
  const scripts = [];
  const externals = [];
  const text = html.replace(/<!--[\s\S]*?-->/g, blankText).replace(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi, (all, attrs, body, offset) => {
    const type = /\btype\s*=\s*["']?([^"'\s>]+)/i.exec(attrs);
    const javascript = !type || /javascript|ecmascript|module/i.test(type[1]);
    if (!javascript) return all.slice(0, 8 + attrs.length) + blankText(body) + all.slice(8 + attrs.length + body.length);
    const src = /\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(attrs);
    if (src) externals.push({ src: (src[1] ?? src[2] ?? src[3]).trim(), index: offset });
    const start = offset + 8 + attrs.length;
    scripts.push([start, start + body.length]);
    return all.slice(0, 8 + attrs.length) + blankJs(body) + all.slice(8 + attrs.length + body.length);
  });
  let markup = text;
  for (const [start, end] of scripts) markup = markup.slice(0, start) + blankText(markup.slice(start, end)) + markup.slice(end);
  markup = markup.replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, blankText);
  return { text, scripts, externals, markup };
}

const lineAt = (text, index) => text.slice(0, index).split("\n").length;
const inside = (rootDir, target) => {
  const relative = path.relative(rootDir, target);
  return relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
};
const posix = (file) => file.split(path.sep).join("/");

// Where a <script src> lives, if it is a local file inside the project. A root-relative src
// (/js/app.js) resolves against the project root, the composition's serve root; any other
// relative src resolves against the HTML file that names it, then the root. Network URLs (any
// scheme or protocol-relative), filesystem-absolute forms (drive letters, UNC, file:), minified
// files (listed, with a warning) and anything resolving outside the project root (lexically or through a symlink)
// are never read.
function locateScript(root, fromFile, src) {
  const clean = src.split(/[?#]/)[0].trim();
  if (!clean) return { skip: "empty src" };
  if (/^file:/i.test(clean) || /^[a-z]:[\\/]/i.test(clean) || /^\\\\/.test(clean)) return { skip: "filesystem absolute path" };
  if (/^[a-z][a-z0-9+.-]*:/i.test(clean) || /^[/\\]{2}/.test(clean)) return { skip: "network URL" };
  if (/\.min\.[cm]?js$/i.test(clean)) return { skip: "minified, not scanned", warn: true };
  const rootDir = path.resolve(root);
  const rootRelative = /^[/\\]/.test(clean);
  const candidates = rootRelative ? [path.resolve(rootDir, `.${clean.replace(/\\/g, "/")}`)] : [...new Set([path.resolve(rootDir, path.dirname(fromFile), clean), path.resolve(rootDir, clean)])];
  const local = candidates.filter((candidate) => inside(rootDir, candidate));
  if (!local.length) return { outside: true };
  const found = local.find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
  if (!found) return { missing: true };
  const real = fs.realpathSync(found);
  if (!inside(fs.realpathSync(rootDir), real)) return { outside: true };
  return { file: real, label: posix(path.relative(rootDir, found)) };
}

// files: [{ file, html }] with file as the label to report (a path relative to the project root).
// Returns findings, the local script files that were scanned, and the scripts that were not.
function scanCompositionSource(files, { root } = {}) {
  const findings = [];
  const scriptFiles = [];
  const unscanned = [];
  const seen = new Set();
  const add = (code, message, severity, where) => findings.push(withFix("timeline", { code, severity, message, ...where }));
  const hits = (code) => SOURCE_RULES.flatMap((rule) => [...code.matchAll(rule.pattern)].map((match) => ({ rule, match })));
  const report = (file, line, { rule, match }) => add("nondeterministic-source", `${file}:${line} uses ${rule.name(match)}: ${rule.why}`, rule.severity, { file, line });
  for (const { file, html } of files) {
    const { text, scripts, externals, markup } = prepareSource(html);
    for (const [start, end] of scripts) for (const hit of hits(text.slice(start, end))) report(file, lineAt(text, start + hit.match.index), hit);
    for (const match of markup.matchAll(/<(video|audio)\b[^>]*?\sautoplay(?=[\s=>/])[^>]*>/gi)) {
      const line = lineAt(markup, match.index);
      add("nondeterministic-source", `${file}:${line} <${match[1].toLowerCase()}> autoplays: the media clock must be owned by the renderer, not the element`, "error", { file, line });
    }
    for (const { src, index } of externals) {
      const line = lineAt(text, index);
      const located = root ? locateScript(root, file, src) : { skip: "no project root" };
      if (located.skip) {
        unscanned.push({ src, from: file, reason: located.skip });
        if (located.warn) add("external-script-unscanned", `${file}:${line} <script src="${src}"> is minified and was not scanned; it may be the project's own bundle`, "warn", { file, line });
      }
      else if (located.outside || located.missing) {
        unscanned.push({ src, from: file, reason: located.outside ? "outside project root" : "file not found" });
        add("external-script-unscanned", `${file}:${line} <script src="${src}"> ${located.outside ? "resolves outside the project root and was not read" : "does not exist in the project, so it could not be scanned"}`, "warn", { file, line });
      } else if (!seen.has(located.file)) {
        seen.add(located.file);
        let code;
        try { code = blankJs(fs.readFileSync(located.file, "utf8")); } catch (error) {
          unscanned.push({ src, from: file, reason: `unreadable: ${error.code || error.message}` });
          add("external-script-unscanned", `${file}:${line} <script src="${src}"> could not be read (${error.code || error.message})`, "warn", { file, line });
          continue;
        }
        scriptFiles.push(located.label);
        for (const hit of hits(code)) report(located.label, lineAt(code, hit.match.index), hit);
      }
    }
  }
  findings.sort((a, b) => (a.file < b.file ? -1 : a.file > b.file ? 1 : a.line - b.line));
  return { findings, scriptFiles, unscanned };
}

module.exports = { TIMELINE_SCHEMA, checkTimeline, scanCompositionSource };

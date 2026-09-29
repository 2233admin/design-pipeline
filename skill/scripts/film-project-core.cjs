"use strict";

// Film project workflow: `film scaffold` writes a ready-to-edit film project around the
// choreography library, and `film check` runs every film gate that the project's current files
// allow, reporting skipped gates with the command that unblocks them. This is the shortest
// correct path for any agent: scaffold, edit storyboard.json, build index.html, render, check.

const fs = require("node:fs");
const path = require("node:path");
const { fail, readJson } = require("./contract-utils.cjs");
const { checkStoryboard, evaluateFilmRender } = require("./film-core.cjs");
const { checkTimeline, scanCompositionSource } = require("./film-timeline-core.cjs");
const { checkComposition } = require("./composition-core.cjs");
const { decodePng } = require("./png-core.cjs");
const { hyperframesPreview } = require("./film-capture-core.cjs");
const { blockNames } = require("./film-blocks-core.cjs");
const { checkGridAlignment } = require("./score-core.cjs");
const { checkAudio } = require("./audio-core.cjs");
const { withFix } = require("./film-hints.cjs");

const CHECK_SCHEMA = "design-pipeline.film-check.v1";
const refs = path.join(__dirname, "../references/film-choreography");
const CARRIED_HANDOFFS = new Set(["continuation", "morph", "camera-carry"]);

// carryScore: over the planned carried boundaries (not the first beat, not match-cut, which is a
// cut by design), the share that neither gate reported broken. A gate that did not run cannot
// veto a boundary; if neither ran there is nothing to score.
function carryContinuity(board, steps) {
  const timelineStep = steps.find((step) => step.gate === "timeline");
  const renderStep = steps.find((step) => step.gate === "render");
  const timelineRan = Boolean(timelineStep && timelineStep.findings);
  const renderRan = Boolean(renderStep && renderStep.findings);
  const planned = board.beats.slice(1).filter((beat) => CARRIED_HANDOFFS.has(beat.handoff));
  const carried = planned.filter((beat) => {
    const timelineOk = !timelineRan || !timelineStep.findings.some((finding) => finding.code === "handoff-not-carried" && finding.beatId === beat.id);
    const renderOk = !renderRan || !renderStep.findings.some((finding) => finding.code === "carry-cut" && finding.beatId === beat.id);
    return timelineOk && renderOk;
  }).length;
  const carryScore = (timelineRan || renderRan) && planned.length ? Number((carried / planned.length).toFixed(3)) : null;
  return { carryScore, carriedBoundaries: carried, plannedCarriedBoundaries: planned.length };
}

// Kit skeletons take the beat's window (`at`, `until`). Colours come from STYLE, hits from
// FilmAudio through `audio` (declared by compositionHtml when a beat names an instrument).
// Selectors are placeholders; voice selectors are the rows of references/film-score.md.
const KICK = `{ sound: "sine", midiMax: "b1"`;
const CLAP = `{ sound: "white", gainMin: 0.2`;
const HAT = `{ sound: "white", durMax: 0.375`;
const hitsIn = (voice, at, until) => `FilmAudio.hits(audio, ${voice}, from: ${at}, to: ${until} })`;
const cellList = (selector, count) => `Array.from({ length: ${count} }, (_, i) => \`${selector}:nth-child(\${i + 1})\`)`;
const CALLS = {
  "continuous-morph": (at) => `P["continuous-morph"](tl, { from: "#FROM", to: "#TO", delta: { x: 0, y: 0, scale: 1 }, at: ${at} });`,
  "match-cut": (at) => `P["match-cut"](tl, { from: "#FROM", to: "#TO", at: ${at} });`,
  "camera-push": (at) => `P["camera-push"](tl, { stage: "#world", focus: { x: 0, y: 0 }, at: ${at} });`,
  "kinetic-type": (at) => `P["kinetic-type"](tl, { words: ".word", count: 3, at: ${at} });`,
  "ui-demo": (at) => `P["ui-demo"](tl, { cursor: "#cursor", path: [{ x: 0, y: 0 }], result: "#RESULT", at: ${at} });`,
  "assembly": (at) => `P["assembly"](tl, { pieces: ".piece", offsets: [{ x: -200, y: 80, rotation: -8 }], at: ${at} });`,
  "reveal-in-context": (at) => `P["reveal-in-context"](tl, { subject: "#SUBJECT", at: ${at} });`,
  "audio-meter": (at, beat) => `P["audio-meter"](tl, { target: "#METER .fk-meter__bar", hits: ${hitsIn(KICK, at, beat.endSec)}, at: ${at}, until: ${beat.endSec} });`,
  "event-scope": (at, beat) => `P["event-scope"](tl, { columns: ${cellList("#SCOPE .fk-scope__col", 12)}, hits: ${hitsIn(HAT, at, beat.endSec)}, at: ${at}, until: ${beat.endSec} });`,
  "tick-ticker": (at, beat) => `P["tick-ticker"](tl, { target: "#LOG .fk-log__col", hits: ${hitsIn(CLAP, at, beat.endSec)}, at: ${at}, until: ${beat.endSec}, rowPx: 24, rows: 8 });`,
  "grid-pulse": (at, beat) => `P["grid-pulse"](tl, { cells: ${cellList("#CELLS .fk-cell", 24)}, hits: ${hitsIn(KICK, at, beat.endSec)}, at: ${at}, until: ${beat.endSec}, rest: STYLE.rest, lit: STYLE.accent });`,
  "build-countdown": (at, beat) => `P["build-countdown"](tl, { target: "#COUNT .fk-readout__value", hits: ${hitsIn(KICK, at, beat.endSec)}, at: ${at}, until: ${beat.endSec}, format: (value) => value.toFixed(2).padStart(5, "0"), textColor: STYLE.text, alert: STYLE.alert });`,
  "hold-then-hit": (at) => `P["hold-then-hit"](tl, { hit: ${at}, flash: "#FLASH", target: "#STAGE" });`,
};

// The one style table of the scaffold: the chrome's own colour defaults, read from the registry so
// the table and the CSS cannot drift. The film replaces the values with its style bible.
function styleTable() {
  const registry = readJson(path.join(refs, "registry.json"), "film choreography registry");
  return Object.fromEntries(registry.chrome.properties
    .filter((property) => /^#[0-9a-f]{6}$/i.test(property.default))
    .map((property) => [property.name.replace(/^--fk-/, ""), property.default]));
}

const AUDIO_KITS = new Set(["audio-meter", "event-scope", "tick-ticker", "grid-pulse", "build-countdown"]);

function compositionHtml(board) {
  const beats = board.beats.map((beat) => {
    const call = beat.block
      ? `// Block ${beat.block}: run \`npx hyperframes add ${beat.block}\`, then host it in #world as\n      // <div data-composition-id="${beat.block}" data-composition-src="compositions/${beat.block}.html" data-start="${beat.startSec}" data-duration="${Number((beat.endSec - beat.startSec).toFixed(3))}" data-width="1920" data-height="1080"></div>`
      : beat.choreography && CALLS[beat.choreography] ? CALLS[beat.choreography](beat.startSec, beat) : `// Author motion that turns "${beat.transformation.from || "?"}" into "${beat.transformation.to || "?"}".`;
    return `      // ${beat.startSec}-${beat.endSec}s ${beat.id} (${beat.role}, handoff ${beat.handoff}): ${beat.productAction}\n      ${call}`;
  }).join("\n");
  const audio = board.beats.some((beat) => AUDIO_KITS.has(beat.choreography))
    ? "      const audio = FilmAudio.fromScoreGrid(); // needs lib/score-grid.js: run `designer-pipeline film score`, then uncomment its script tag above"
    : "      // const audio = FilmAudio.fromScoreGrid(); // hits for the instrument kit; needs lib/score-grid.js (see the commented script tag above)";
  const style = `{ ${Object.entries(styleTable()).map(([key, value]) => `${key}: "${value}"`).join(", ")} }`;
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1920, height=1080" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <script src="lib/patterns.js"></script>
    <script src="lib/audio-events.js"></script>
    <link rel="stylesheet" href="lib/instrument-chrome.css" />
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: 1920px; height: 1080px; overflow: hidden; background: var(--fk-ink); }
      #root { position: relative; width: 100%; height: 100%; }
      #world { position: absolute; inset: 0; transform-origin: 50% 50%; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${board.durationSec}" data-width="1920" data-height="1080">
      <div id="world" class="clip" data-start="0" data-duration="${board.durationSec}" data-track-index="0">
        <!-- Product subjects go here. Give every animated element an id. -->
      </div>
      <!-- <audio id="score" src="assets/score.wav" data-start="0" data-duration="${board.durationSec}"></audio> -->
      <!-- After \`designer-pipeline film score\`, uncomment (it must stay after lib/audio-events.js and before the main script): -->
      <!-- <script src="lib/score-grid.js"></script> -->
    </div>
    <script>
      // One style table: the palette has one source. It sets the --fk- custom properties of
      // lib/instrument-chrome.css, and the kit calls take their colours from it (GSAP cannot
      // read var(...)). Replace the values with the film's style bible.
      const STYLE = ${style};
      for (const key of Object.keys(STYLE)) document.documentElement.style.setProperty("--fk-" + key, STYLE[key]);
      const tl = gsap.timeline({ paused: true });
      const P = window.FilmPatterns;
${audio}
${beats}
      window.__timelines["main"] = tl;
      tl.seek(0);
    </script>
  </body>
</html>
`;
}

const NOTES = {
  "reference.md": "# Reference\n\n- Primary moving reference (URL/title, role):\n- Observed time ranges (shot scale, motion, cuts, type, sound actually heard):\n- Transfer to this product / keep with the reference:\n- Asset inventory and missing shots:\n- Inspection limits:\n",
  "sound.md": "# Sound\n\n- Energy arc:\n- Music source and reuse basis (auditioned / pending):\n- BPM, bar length (s), start of bar 1 (s) (measured or from reliable metadata; a window is (bar - 1) x bar length):\n- Entry and exit points:\n- Intentional silence:\n\n## Song map\n\nOne row per beat, in storyboard order. Section: intro, groove, build, drop, break or outro. Music event: downbeat, impact, riser, break, accent or none. Motion response comes from the music-to-motion vocabulary in references/film-score.md. Every hit event needs a cue in storyboard sound.cues, bound in that beat's soundCues.\n\n| Beat id | Window (s) | Bars | Section | Music event | Motion response |\n| --- | --- | --- | --- | --- | --- |\n|  |  |  |  |  |  |\n",
  "qa.md": "# QA\n\n## Technical (film check)\n\n## Creative review (watch uninterrupted at speed)\n\n- Product comprehension:\n- Continuity:\n- Rhythm:\n- Transformation:\n- Identity:\n- Reference fit:\n- Sound:\n\n## Music-driven review (music-led films only)\n\nRules R1 to R7 of references/product-film-direction.md are Visual Acceptance guidance: they add no finding and change no gate. Record each with the field you read.\n\n- R1 One dominant instrument per plate, at most three supporting layers (beat `motion`; contact sheet):\n- R2 Builds accelerate through rate, size or colour (beat lengths under the riser cue; hit rate):\n- R3 The last beat before a drop holds still (`holdSec`):\n- R4 A drop is a hard cut with impact (handoff kind, `plannedCutsSec`, `cuts.missedSec`, `audio.cutsOnOnset`):\n- R5 A break stops pumping without freezing (per-beat `changedShare`):\n- R6 Sections differ in density (per-beat `changedShare` by section; contact sheet):\n- R7 Every planned hard cut is visible to the scene detector (`cuts.missedSec`; contact sheet):\n- Instruments that are not a product or concept object (revision findings):\n\n## User acceptance\n\nPending.\n",
  "FILM.md": "# Film project\n\n1. Fill reference.md and sound.md from real references before editing the storyboard.\n2. Edit storyboard.json, then `designer-pipeline verify film-storyboard --storyboard storyboard.json` until it passes.\n3. Build index.html from the beat comments; replace #FROM/#TO/#SUBJECT/#RESULT with real element ids.\n4. Music-led film only: write `## Treatment` under the chosen card of concepts.md, fill the `Section` song map in sound.md, run `designer-pipeline film score` for `lib/score-grid.js`, build with the instruments in lib/patterns.js (ids #METER #SCOPE #LOG #CELLS #COUNT #FLASH #STAGE are placeholders), the fk- classes of lib/instrument-chrome.css and the STYLE table in index.html, and fill the music-driven review in qa.md.\n5. `npx hyperframes check`, then `npx hyperframes render --output out.mp4`.\n6. `designer-pipeline film check --project-root .` captures timeline.json and runs every film gate; follow each finding's `fix`.\n7. Watch the film and write the creative review in qa.md. Gates never grant creative acceptance.\n",
};

function scaffoldFilm(dir, options = {}) {
  const target = path.resolve(dir);
  const board = readJson(path.join(refs, "storyboard.example.json"), "film storyboard example");
  if (options.id) board.id = options.id;
  const files = {
    "storyboard.json": `${JSON.stringify(board, null, 2)}\n`,
    "index.html": compositionHtml(board),
    "lib/patterns.js": fs.readFileSync(path.join(refs, "patterns.js"), "utf8"),
    "lib/timeline-probe.js": fs.readFileSync(path.join(refs, "timeline-probe.js"), "utf8"),
    "lib/audio-events.js": fs.readFileSync(path.join(refs, "audio-events.js"), "utf8"),
    "lib/instrument-chrome.css": fs.readFileSync(path.join(refs, "instrument-chrome.css"), "utf8"),
    ...NOTES,
  };
  // Notes the workflow may already have written (reference.md in the reference stage) are kept;
  // only the storyboard, composition and libraries are refused without --replace.
  const kept = Object.keys(NOTES).filter((name) => fs.existsSync(path.join(target, name)));
  for (const name of kept) delete files[name];
  const existing = Object.keys(files).filter((name) => fs.existsSync(path.join(target, name)));
  if (existing.length && !options.replace) fail("film scaffold", `refusing to overwrite ${existing.join(", ")} in ${target}. Fix: choose an empty --output directory, or pass --replace to overwrite these files`, { code: "OUTPUT_EXISTS" });
  for (const [name, content] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(target, name)), { recursive: true });
    fs.writeFileSync(path.join(target, name), content);
  }
  return { status: "scaffolded", root: target, files: Object.keys(files), kept, next: NOTES["FILM.md"].split("\n").filter((line) => /^\d\./.test(line)) };
}

function newestRender(dir) {
  const candidates = [path.join(dir, "out.mp4")];
  const renders = path.join(dir, "renders");
  if (fs.existsSync(renders)) for (const name of fs.readdirSync(renders)) if (name.endsWith(".mp4")) candidates.push(path.join(renders, name));
  const present = candidates.filter((file) => fs.existsSync(file) && fs.statSync(file).size > 0);
  present.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  return present[0] || null;
}

// index.html and compositions/*.html, labelled relative to the project root.
function compositionSources(root) {
  const files = ["index.html"];
  const dir = path.join(root, "compositions");
  if (fs.existsSync(dir)) for (const name of fs.readdirSync(dir).sort()) if (name.endsWith(".html")) files.push(`compositions/${name}`);
  const realRoot = fs.realpathSync(root);
  const contained = (file) => { const relative = path.relative(realRoot, fs.realpathSync(path.join(root, file))); return !relative.startsWith("..") && !path.isAbsolute(relative); };
  return files.filter((file) => fs.existsSync(path.join(root, file)) && contained(file)).map((file) => ({ file, html: fs.readFileSync(path.join(root, file), "utf8") }));
}

// capture(compositionFile) -> timeline manifest; injected so the CLI can run it in a kernel.
function checkFilmProject(dir, options = {}) {
  const root = path.resolve(dir);
  const steps = [];
  const storyboardFile = path.join(root, "storyboard.json");
  if (!fs.existsSync(storyboardFile)) fail("film check", `no storyboard.json in ${root}. Fix: run \`designer-pipeline film scaffold --output ${dir}\` or write storyboard.json first`, { code: "INPUT_MISSING" });
  const board = readJson(storyboardFile, "film storyboard");
  const storyboard = checkStoryboard(board, { blockNames: blockNames(root) || undefined });
  steps.push({ gate: "storyboard", status: storyboard.status, findings: storyboard.findings });

  // A Strudel score exports its exact event grid; cuts and accent cues are checked against it.
  const gridFile = path.join(root, "score-grid.json");
  if (fs.existsSync(gridFile)) {
    const alignment = checkGridAlignment(board, readJson(gridFile, "score grid"));
    steps.push({ gate: "score", status: alignment.status, findings: alignment.findings, toleranceSec: alignment.toleranceSec });
  }

  const timelineFile = path.join(root, "timeline.json");
  const composition = path.join(root, "index.html");
  let timeline = null;
  let timelineNote = null;
  if (fs.existsSync(composition) && options.capture) {
    // HyperFrames projects are captured through the preview runtime so nested blocks load.
    const isHyperframes = fs.existsSync(path.join(root, "hyperframes.json"));
    let preview = null;
    try {
      if (isHyperframes) preview = (options.preview || ((dir) => hyperframesPreview(dir)))(root);
      timeline = options.capture(composition, preview ? preview.url : undefined);
      fs.writeFileSync(timelineFile, `${JSON.stringify(timeline, null, 2)}\n`);
      timelineNote = preview ? "captured through the HyperFrames preview runtime" : "captured from index.html";
    } catch (error) {
      timelineNote = `capture failed: ${error.message}`;
    } finally {
      if (preview && preview.started && preview.stop) preview.stop();
    }
  }
  // A capture that failed falls back to the previous timeline.json, which may no longer match
  // the composition: the step is marked stale and the check cannot pass on it.
  let stale = false;
  if (!timeline && fs.existsSync(timelineFile)) { stale = Boolean(timelineNote); timeline = readJson(timelineFile, "film timeline"); timelineNote = timelineNote ? `${timelineNote}; used existing timeline.json` : "existing timeline.json"; }
  // The source scan needs no capture, so its findings join the timeline step whether or not a
  // timeline exists. Without a timeline the step stays skipped unless the scan found an error.
  const sources = compositionSources(root);
  const scan = scanCompositionSource(sources, { root });
  const sourceFindings = scan.findings;
  const sourceFailed = sourceFindings.some((finding) => finding.severity !== "warn");
  const sourceScan = { sourceFiles: sources.map((source) => source.file), scriptFiles: scan.scriptFiles, unscannedScripts: scan.unscanned };
  if (timeline) {
    const result = checkTimeline(timeline, board);
    steps.push({ gate: "timeline", status: result.status === "failed" || sourceFailed ? "failed" : "passed", ...(stale ? { stale: true, next: "Fix the capture error above and re-run film check; this result comes from an old timeline.json." } : {}), source: timelineNote, ...sourceScan, findings: [...result.findings, ...sourceFindings], metrics: { carriedHandoffs: result.metrics.carriedHandoffs, proceduralBeats: result.metrics.proceduralBeats, proceduralHandoffs: result.metrics.proceduralHandoffs } });
  } else {
    steps.push({ gate: "timeline", status: sourceFailed ? "failed" : "skipped", reason: timelineNote || "no index.html or timeline.json", next: "Build index.html, then re-run `film check` to capture timeline.json.", ...sourceScan, ...(sourceFindings.length ? { findings: sourceFindings } : {}) });
  }

  const video = newestRender(root);
  if (video) {
    // Procedurally driven beats are sampled at their start and end too (progress 0, 0.5, 1).
    const procedural = (steps.find((step) => step.gate === "timeline")?.metrics?.proceduralBeats) || [];
    const extraSamples = Object.fromEntries(procedural.map((id) => [id, [0.05, 0.95]]));
    const result = evaluateFilmRender(board, video, { outDir: path.join(root, "evidence"), extraSamples });
    steps.push({ gate: "render", status: result.status, video: path.relative(root, video), findings: result.findings, motion: result.motion, contactSheet: result.contactSheet && path.join("evidence", result.contactSheet.sheet), audio: result.audio, cuts: result.cuts });
    if (board.sound.mode !== "silent" || result.audio.present) {
      const audio = checkAudio(video, { storyboard: board, target: options.audioTarget || "web" });
      steps.push({ gate: "audio", status: audio.status, findings: audio.findings, metrics: audio.metrics });
    }
    // Composition of each beat's midpoint frame: errors fail, warnings are review prompts.
    const frames = (result.contactSheet ? [...result.contactSheet.frames, ...result.contactSheet.extras] : []).map((frame) => {
      const check = checkComposition(decodePng(fs.readFileSync(path.join(root, "evidence", frame.file)), frame.file), { profile: "frame", allow: options.allowComposition || [] });
      return { beatId: frame.beatId, atSec: frame.atSec, status: check.status, findings: check.findings.map((finding) => ({ ...finding, beatId: frame.beatId })) };
    });
    if (frames.length) steps.push({ gate: "composition", status: frames.some((frame) => frame.status === "failed") ? "failed" : "passed", findings: frames.flatMap((frame) => frame.findings), frames: frames.map(({ beatId, atSec, status }) => ({ beatId, atSec, status })) });
  } else {
    steps.push({ gate: "render", status: "skipped", reason: "no out.mp4 or renders/*.mp4", next: "Run `npx hyperframes render --output out.mp4`, then re-run `film check`." });
  }

  const continuity = carryContinuity(board, steps);
  const continuityFindings = [];
  if (continuity.plannedCarriedBoundaries >= 3 && continuity.carryScore !== null && continuity.carryScore < 0.6) {
    continuityFindings.push(withFix("check", { code: "low-carry", severity: "error", message: `carryScore ${continuity.carryScore}: only ${continuity.carriedBoundaries}/${continuity.plannedCarriedBoundaries} planned carried boundaries survive as continuity (need at least 0.6)` }));
  }
  steps.push({ gate: "check", status: continuityFindings.length ? "failed" : "passed", metrics: continuity, findings: continuityFindings });

  const failed = steps.some((step) => step.status === "failed");
  const skipped = steps.some((step) => step.status === "skipped" || step.stale);
  const fixes = steps.flatMap((step) => (step.findings || []).map((finding) => ({ gate: step.gate, code: finding.code, ...(finding.severity ? { severity: finding.severity } : {}), ...(finding.beatId ? { beatId: finding.beatId } : {}), ...(finding.file ? { file: finding.file, line: finding.line } : {}), fix: finding.fix })));
  return {
    schema: CHECK_SCHEMA,
    id: board.id,
    status: failed ? "failed" : skipped ? "incomplete" : "passed",
    steps,
    fixes,
    creativeAcceptance: "not-assessed",
    next: failed ? "Apply each entry in fixes, then re-run `film check`." : skipped ? steps.filter((step) => step.next).map((step) => step.next).join(" ") : "All film gates pass. Watch the film and record the creative review in qa.md.",
  };
}

module.exports = { CALLS, CHECK_SCHEMA, carryContinuity, checkFilmProject, compositionHtml, scaffoldFilm };

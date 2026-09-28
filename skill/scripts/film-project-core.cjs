"use strict";

// Film project workflow: `film scaffold` writes a ready-to-edit film project around the
// choreography library, and `film check` runs every film gate that the project's current files
// allow, reporting skipped gates with the command that unblocks them. This is the shortest
// correct path for any agent: scaffold, edit storyboard.json, build index.html, render, check.

const fs = require("node:fs");
const path = require("node:path");
const { fail, readJson } = require("./contract-utils.cjs");
const { checkStoryboard, evaluateFilmRender } = require("./film-core.cjs");
const { checkTimeline } = require("./film-timeline-core.cjs");
const { checkComposition } = require("./composition-core.cjs");
const { decodePng } = require("./png-core.cjs");
const { checkAudio } = require("./audio-core.cjs");

const CHECK_SCHEMA = "design-pipeline.film-check.v1";
const refs = path.join(__dirname, "../references/film-choreography");

const CALLS = {
  "continuous-morph": (at) => `P["continuous-morph"](tl, { from: "#FROM", to: "#TO", delta: { x: 0, y: 0, scale: 1 }, at: ${at} });`,
  "match-cut": (at) => `P["match-cut"](tl, { from: "#FROM", to: "#TO", at: ${at} });`,
  "camera-push": (at) => `P["camera-push"](tl, { stage: "#world", focus: { x: 0, y: 0 }, at: ${at} });`,
  "kinetic-type": (at) => `P["kinetic-type"](tl, { words: ".word", count: 3, at: ${at} });`,
  "ui-demo": (at) => `P["ui-demo"](tl, { cursor: "#cursor", path: [{ x: 0, y: 0 }], result: "#RESULT", at: ${at} });`,
  "assembly": (at) => `P["assembly"](tl, { pieces: ".piece", offsets: [{ x: -200, y: 80, rotation: -8 }], at: ${at} });`,
  "reveal-in-context": (at) => `P["reveal-in-context"](tl, { subject: "#SUBJECT", at: ${at} });`,
};

function compositionHtml(board) {
  const beats = board.beats.map((beat) => {
    const call = beat.choreography && CALLS[beat.choreography] ? CALLS[beat.choreography](beat.startSec) : `// Author motion that turns "${beat.transformation.from || "?"}" into "${beat.transformation.to || "?"}".`;
    return `      // ${beat.startSec}-${beat.endSec}s ${beat.id} (${beat.role}, handoff ${beat.handoff}): ${beat.productAction}\n      ${call}`;
  }).join("\n");
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1920, height=1080" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <script src="lib/patterns.js"></script>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: 1920px; height: 1080px; overflow: hidden; background: #0b0d12; }
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
    </div>
    <script>
      const tl = gsap.timeline({ paused: true });
      const P = window.FilmPatterns;
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
  "sound.md": "# Sound\n\n- Energy arc:\n- Music source and reuse basis (auditioned / pending):\n- Entry and exit points:\n- Accents bound to beats (match storyboard soundCues):\n- Intentional silence:\n",
  "qa.md": "# QA\n\n## Technical (film check)\n\n## Creative review (watch uninterrupted at speed)\n\n- Product comprehension:\n- Continuity:\n- Rhythm:\n- Transformation:\n- Identity:\n- Reference fit:\n- Sound:\n\n## User acceptance\n\nPending.\n",
  "FILM.md": "# Film project\n\n1. Fill reference.md and sound.md from real references before editing the storyboard.\n2. Edit storyboard.json, then `designer-pipeline verify film-storyboard --storyboard storyboard.json` until it passes.\n3. Build index.html from the beat comments; replace #FROM/#TO/#SUBJECT/#RESULT with real element ids.\n4. `npx hyperframes check`, then `npx hyperframes render --output out.mp4`.\n5. `designer-pipeline film check --project-root .` captures timeline.json and runs every film gate; follow each finding's `fix`.\n6. Watch the film and write the creative review in qa.md. Gates never grant creative acceptance.\n",
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
    ...NOTES,
  };
  const existing = Object.keys(files).filter((name) => fs.existsSync(path.join(target, name)));
  if (existing.length && !options.replace) fail("film scaffold", `refusing to overwrite ${existing.join(", ")} in ${target}. Fix: choose an empty --output directory, or pass --replace to overwrite these files`, { code: "OUTPUT_EXISTS" });
  for (const [name, content] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(target, name)), { recursive: true });
    fs.writeFileSync(path.join(target, name), content);
  }
  return { status: "scaffolded", root: target, files: Object.keys(files), next: NOTES["FILM.md"].split("\n").filter((line) => /^\d\./.test(line)) };
}

function newestRender(dir) {
  const candidates = [path.join(dir, "out.mp4")];
  const renders = path.join(dir, "renders");
  if (fs.existsSync(renders)) for (const name of fs.readdirSync(renders)) if (name.endsWith(".mp4")) candidates.push(path.join(renders, name));
  const present = candidates.filter((file) => fs.existsSync(file) && fs.statSync(file).size > 0);
  present.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  return present[0] || null;
}

// capture(compositionFile) -> timeline manifest; injected so the CLI can run it in a kernel.
function checkFilmProject(dir, options = {}) {
  const root = path.resolve(dir);
  const steps = [];
  const storyboardFile = path.join(root, "storyboard.json");
  if (!fs.existsSync(storyboardFile)) fail("film check", `no storyboard.json in ${root}. Fix: run \`designer-pipeline film scaffold --output ${dir}\` or write storyboard.json first`, { code: "INPUT_MISSING" });
  const board = readJson(storyboardFile, "film storyboard");
  const storyboard = checkStoryboard(board);
  steps.push({ gate: "storyboard", status: storyboard.status, findings: storyboard.findings });

  const timelineFile = path.join(root, "timeline.json");
  const composition = path.join(root, "index.html");
  let timeline = null;
  let timelineNote = null;
  if (fs.existsSync(composition) && options.capture) {
    try {
      timeline = options.capture(composition);
      fs.writeFileSync(timelineFile, `${JSON.stringify(timeline, null, 2)}\n`);
      timelineNote = "captured from index.html";
    } catch (error) {
      timelineNote = `capture failed: ${error.message}`;
    }
  }
  if (!timeline && fs.existsSync(timelineFile)) { timeline = readJson(timelineFile, "film timeline"); timelineNote = timelineNote ? `${timelineNote}; used existing timeline.json` : "existing timeline.json"; }
  if (timeline) {
    const result = checkTimeline(timeline, board);
    steps.push({ gate: "timeline", status: result.status, source: timelineNote, findings: result.findings, metrics: { carriedHandoffs: result.metrics.carriedHandoffs } });
  } else {
    steps.push({ gate: "timeline", status: "skipped", reason: timelineNote || "no index.html or timeline.json", next: "Build index.html, then re-run `film check` to capture timeline.json." });
  }

  const video = newestRender(root);
  if (video) {
    const result = evaluateFilmRender(board, video, { outDir: path.join(root, "evidence") });
    steps.push({ gate: "render", status: result.status, video: path.relative(root, video), findings: result.findings, contactSheet: result.contactSheet && path.join("evidence", result.contactSheet.sheet), audio: result.audio, cuts: result.cuts });
    if (board.sound.mode !== "silent" || result.audio.present) {
      const audio = checkAudio(video, { storyboard: board, target: options.audioTarget || "web" });
      steps.push({ gate: "audio", status: audio.status, findings: audio.findings, metrics: audio.metrics });
    }
    // Composition of each beat's midpoint frame: errors fail, warnings are review prompts.
    const frames = (result.contactSheet ? result.contactSheet.frames : []).map((frame) => {
      const check = checkComposition(decodePng(fs.readFileSync(path.join(root, "evidence", frame.file)), frame.file), { profile: "frame", allow: options.allowComposition || [] });
      return { beatId: frame.beatId, atSec: frame.atSec, status: check.status, findings: check.findings.map((finding) => ({ ...finding, beatId: frame.beatId })) };
    });
    if (frames.length) steps.push({ gate: "composition", status: frames.some((frame) => frame.status === "failed") ? "failed" : "passed", findings: frames.flatMap((frame) => frame.findings), frames: frames.map(({ beatId, atSec, status }) => ({ beatId, atSec, status })) });
  } else {
    steps.push({ gate: "render", status: "skipped", reason: "no out.mp4 or renders/*.mp4", next: "Run `npx hyperframes render --output out.mp4`, then re-run `film check`." });
  }

  const failed = steps.some((step) => step.status === "failed");
  const skipped = steps.some((step) => step.status === "skipped");
  const fixes = steps.flatMap((step) => (step.findings || []).map((finding) => ({ gate: step.gate, code: finding.code, ...(finding.severity ? { severity: finding.severity } : {}), ...(finding.beatId ? { beatId: finding.beatId } : {}), fix: finding.fix })));
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

module.exports = { CHECK_SCHEMA, checkFilmProject, compositionHtml, scaffoldFilm };

"use strict";

// Tracking HUD build: rebuilds everything derived from film.config.js in this project.
//
//   node build.cjs              storyboard.json, index.html, tracks.json and assets/sfx.wav
//   node build.cjs --no-sound   the same without synthesizing the sound (no ffmpeg needed)
//
// The config is checked first: upstream's invariants (every line fits the screen, every tracked
// target stays inside the safe frame) plus what new content can break (lines inside the screen
// margins, the lock ping clear of the cuts, palette contrast, the Done pill and its label, the last
// frame showing its subject, every drawn character in the vendored JetBrains Mono, and the lock
// moment of every shot that names its word in `lock`). A failing config writes nothing; warnings
// are printed and do not stop the build. The sound is synthesized raw; master it with
// `designer-pipeline audio master --input assets/sfx.wav --output assets/sfx-mastered.wav --target
// web` before rendering, because index.html plays the master.

const fs = require("node:fs");
const path = require("node:path");

const SCHEMA = "design-pipeline.film-storyboard.v1";
const SOUND_FILE = "assets/sfx-mastered.wav";

function load(dir) {
  const configFile = path.join(dir, "film.config.js");
  const tracksFile = path.join(dir, "lib", "tracks.js");
  for (const file of [configFile, tracksFile]) delete require.cache[require.resolve(file)];
  const config = require(configFile);
  return require(tracksFile).create(config);
}

// The flat screen is drawn in the vendored JetBrains Mono: hero lines and the Done label in Bold,
// the title and the log in Regular.
const FONTS = { 400: "assets/fonts/JetBrainsMono-Regular.ttf", 700: "assets/fonts/JetBrainsMono-Bold.ttf" };

/** A TrueType font's character map (cmap formats 4 and 12) and advance widths in em. */
function readFont(buf) {
  const tables = {};
  for (let i = 0; i < buf.readUInt16BE(4); i += 1) tables[buf.toString("latin1", 12 + i * 16, 16 + i * 16)] = buf.readUInt32BE(20 + i * 16);
  const glyphs = new Map();
  for (let i = 0; i < buf.readUInt16BE(tables.cmap + 2); i += 1) {
    const sub = tables.cmap + buf.readUInt32BE(tables.cmap + 8 + i * 8);
    const format = buf.readUInt16BE(sub);
    if (format === 4) {
      const segments = buf.readUInt16BE(sub + 6) / 2;
      const ends = sub + 14;
      const starts = ends + segments * 2 + 2;
      const deltas = starts + segments * 2;
      const offsets = deltas + segments * 2;
      for (let k = 0; k < segments; k += 1) {
        const [start, end] = [buf.readUInt16BE(starts + 2 * k), buf.readUInt16BE(ends + 2 * k)];
        const [delta, offset] = [buf.readUInt16BE(deltas + 2 * k), buf.readUInt16BE(offsets + 2 * k)];
        for (let c = start; c <= end && c !== 0xffff; c += 1) {
          const g = offset ? buf.readUInt16BE(offsets + 2 * k + offset + 2 * (c - start)) : c;
          if (g && (g + delta) & 0xffff) glyphs.set(c, (g + delta) & 0xffff);
        }
      }
    } else if (format === 12) {
      for (let k = 0; k < buf.readUInt32BE(sub + 12); k += 1) {
        const [start, end, first] = [0, 4, 8].map((o) => buf.readUInt32BE(sub + 16 + k * 12 + o));
        for (let c = start; c <= end; c += 1) glyphs.set(c, first + c - start);
      }
    }
  }
  const unitsPerEm = buf.readUInt16BE(tables.head + 18);
  const metrics = buf.readUInt16BE(tables.hhea + 34);
  return { glyphs, advance: (g) => buf.readUInt16BE(tables.hmtx + 4 * Math.min(g, metrics - 1)) / unitsPerEm };
}

/** Every string the flat screen draws from the config, against the project's fonts: a missing
 * glyph would be drawn in a fallback font, off the 0.6 em cell grid the tracker boxes measure. */
function fontProblems(T, dir) {
  const faces = {};
  for (const [weight, rel] of Object.entries(FONTS)) {
    const file = path.join(dir, rel);
    if (!fs.existsSync(file)) return [`${rel} is missing: the flat screen is drawn in the vendored JetBrains Mono; scaffold the project again or restore the file`];
    faces[weight] = readFont(fs.readFileSync(file));
  }
  const strings = [];
  T.shots.forEach((s, i) => {
    if (s.kind === "typing" || s.kind === "cursor") strings.push([`shot ${i + 1}`, s.text, 700, true]);
  });
  if (T.shots.some((s) => s.kind === "done")) strings.push(["done.label", T.config.done?.label ?? "Done", 700, false]);
  strings.push(["screen.title", T.config.screen.title, 400, false]);
  T.config.screen.log.forEach((line, i) => strings.push([`screen.log[${i}]`, line, 400, false]));
  const out = [];
  for (const [where, text, weight, cells] of strings) {
    const bad = [];
    for (const ch of new Set(Array.from(text))) {
      const name = `${ch} (U+${ch.codePointAt(0).toString(16).toUpperCase().padStart(4, "0")})`;
      const glyph = faces[weight].glyphs.get(ch.codePointAt(0));
      if (/[\p{M}\p{C}]/u.test(ch)) bad.push(`${name} is a combining, control or format character`);
      else if (!glyph) bad.push(`${name} is not in the font`);
      else if (cells && Math.abs(faces[weight].advance(glyph) - T.MONO_ADV) > 1e-9) bad.push(`${name} is not one ${T.MONO_ADV} em cell wide`);
    }
    if (bad.length) out.push(`${where} "${text}": ${bad.join("; ")} (JetBrains Mono ${weight === 700 ? "Bold" : "Regular"}). The browser would draw it in a fallback font, off the cell grid the tracker boxes measure; use characters the font covers`);
  }
  return out;
}

/** Every check a build runs: tracks problems() (geometry, timing, palettes, last frame), glyph
 * coverage, and each typing shot's lock moment. A lock that does not read on any lock frame is a
 * problem when the shot names its word in `lock`, a warning for the implicit last-word lock
 * (upstream's own default has three: shots 2, 3 and 9). */
function check(dir, T = load(dir)) {
  const overlayFile = path.join(dir, "lib", "overlay.js");
  delete require.cache[require.resolve(overlayFile)];
  const overlay = require(overlayFile);
  const problems = [...T.problems(), ...fontProblems(T, dir)];
  const warnings = [];
  T.shots.forEach((s, si) => {
    if (s.kind !== "typing") return;
    const { legible, frames } = overlay.lockLegibility(T, si);
    if (legible) return;
    const word = s.chars.slice(s.lockSpan[0], s.lockSpan[1] + 1).join("");
    const where = `shot ${si + 1}: the lock on "${word}" does not read on any lock frame (${frames.map((entry) => `frame ${entry.frame}: ${entry.issues.join(", ")}`).join("; ")})`;
    if (s.lock === undefined) warnings.push(`${where}. Allowed for the implicit last-word lock; name the word in shots[${si}].lock to require a readable lock`);
    else problems.push(`${where}. Zoom the shot out, re-aim it or shorten shots[${si}].lock`);
  });
  return { problems, warnings };
}

const sec = (frames, fps) => Number((frames / fps).toFixed(4));
const quote = (text) => `"${text}"`;

/** What shot si locks on, in words: a typing shot's named lock or last word, else its target. */
function lockTarget(T, si) {
  const s = T.shots[si];
  if (s.kind === "typing") return s.lock === undefined ? "the last word" : quote(s.lock);
  if (s.kind === "cursor") return "the cursor";
  if (s.kind === "collapse") return "the collapsed box";
  return `the first letter of ${quote(T.config.done?.label ?? "Done")}`;
}

function beatFor(T, si) {
  const s = T.shots[si];
  const startSec = sec(si * T.SHOT_FRAMES, T.FPS);
  const endSec = sec((si + 1) * T.SHOT_FRAMES, T.FPS);
  const slug = (s.kind === "typing" || s.kind === "done" ? s.text : s.kind).normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 32) || s.kind;
  const id = `shot-${String(si + 1).padStart(2, "0")}-${slug}`;
  const camera = `${s.palette} palette, zoom ${s.cam.zoom[0]} to ${s.cam.zoom[1]}`;
  const common = { id, startSec, endSec, role: "action", handoff: si === 0 ? "open" : "hard-cut", motion: ["type-on", "rack-focus", "tracker-lock", "hand-held camera"], soundCues: [`lock-${si + 1}`] };
  if (s.kind === "typing") {
    const cut = Array.from(s.text).slice(0, T.visible(si, 0)).join("");
    const locked = s.lock === undefined ? ["the last word", "its last word"] : [quote(s.lock), quote(s.lock)];
    return { ...common, subject: `The typed line ${quote(s.text)} on the agent's terminal, filmed close through the lens (${camera})`, productAction: `The agent types ${quote(s.text)} glyph by glyph while tracker boxes chain onto the newest glyphs and lock on ${locked[0]}`, transformation: { kind: "state-change", from: `${quote(cut)} on screen at the cut`, to: `${quote(s.text)} complete, ${locked[1]} locked in red with a ping` } };
  }
  if (s.kind === "cursor") return { ...common, motion: ["blinking cursor", "rack-focus", "tracker-lock", "hand-held camera"], subject: `The prompt ${quote(s.text)} and the cursor, filmed very close (${camera})`, productAction: "The tracker finds the prompt and locks onto the waiting cursor", transformation: { kind: "state-change", from: "an idle prompt with a free cursor box", to: "the cursor box locked in red with a ping" } };
  if (s.kind === "collapse") return { ...common, motion: ["box collapse", "rack-focus", "tracker-lock", "hand-held camera"], subject: `Fourteen tracker boxes spread over the agent log (${camera})`, productAction: "Every tracker box falls into one point and locks as a single box", transformation: { kind: "assembly", from: "fourteen boxes spread over the log", to: "one locked box at the centre" } };
  return { ...common, motion: ["pill grow", "rack-focus", "tracker-lock", "hand-held camera"], subject: `The ${quote(T.config.done?.label ?? "Done")} pill (${camera})`, productAction: `The locked box becomes the ${quote(T.config.done?.label ?? "Done")} pill, which holds to the last frame`, transformation: { kind: "reveal-in-context", from: "the single locked box", to: `the ${quote(T.config.done?.label ?? "Done")} pill with its check mark` } };
}

/** storyboard.json for the existing film gates: one action beat per shot, hard cuts, lock cues. */
function storyboard(T) {
  const e = T.events();
  const cues = [{ id: "entry", atSec: 0, kind: "entry", note: "Screen hum and the first cut glitch start with the picture" }];
  e.locks.forEach((frame, si) => cues.push({ id: `lock-${si + 1}`, atSec: sec(frame, T.FPS), kind: "accent", note: `Lock ping of shot ${si + 1}, panned to the locked box` }));
  if (e.collapse !== null) cues.push({ id: "collapse-riser", atSec: sec(e.collapse, T.FPS), kind: "riser", note: "Noise riser from the collapse into the last shot" });
  if (e.done !== null) cues.push({ id: "done-chime", atSec: sec(e.done, T.FPS), kind: "impact", note: "Chime and sub thump on the Done pill" });
  const beats = T.shots.map((_, si) => beatFor(T, si));
  if (e.collapse !== null) beats[Math.floor(e.collapse / T.SHOT_FRAMES)].soundCues.push("collapse-riser");
  if (e.done !== null) beats[Math.floor(e.done / T.SHOT_FRAMES)].soundCues.push("done-chime");
  beats[0].soundCues.unshift("entry");
  return {
    schema: SCHEMA,
    id: T.config.id || "tracking-hud",
    durationSec: sec(T.TOTAL_FRAMES, T.FPS),
    fps: T.FPS,
    grammar: "kinetic-type",
    benefit: "A virtual camera films an agent's terminal while a tracker locks onto every glyph it types, so the viewer reads the agent's thought stream as it is produced.",
    proofAction: "Each shot types one line glyph by glyph; boxes chain onto the newest glyphs with their real output pixel coordinates, the focus racks to the target and the newest box locks red with a ping, until every box collapses into the final pill.",
    reference: "mrsarac/ff-tracking cc7f4e1 (MIT), ported to HyperFrames by the design-pipeline tracking-hud template; style credit Michael Nowak, none of his material used",
    sound: {
      mode: "scored",
      source: "Synthesized with ffmpeg from the tracks events by sfx.cjs (hum, cut glitches, key clicks, panned lock pings, riser, chime), mastered with audio master",
      cues,
      usage: "commercial",
      assets: [{ id: "tracking-sfx", license: "Generated in this project from code; no third-party audio", commercialUse: true, file: SOUND_FILE }],
    },
    rendering: {
      route: "webgl",
      requirements: [],
      reason: "A WebGL2 port of the ff-tracking lens shader films a Canvas 2D terminal each frame: perspective, depth of field, aberration, palette, bloom, LED grid, tear and grain; the tracker overlay is projected with the same camera.",
      samples: e.locks.slice(0, 3).map((frame, si) => ({ atSec: sec(frame, T.FPS), purpose: `Shot ${si + 1} lock: red box, tear and LOCK label on ${lockTarget(T, si)}` })),
    },
    beats,
  };
}

/** The HyperFrames composition: one paused GSAP timeline drives every frame. */
function compositionHtml(T, options = {}) {
  const duration = sec(T.TOTAL_FRAMES, T.FPS);
  const audio = options.sound === false ? "" : `\n      <audio id="sfx" src="${SOUND_FILE}" data-start="0" data-duration="${duration}" data-track-index="2"></audio>`;
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=${T.W}, height=${T.H}" />
    <!-- Generated by build.cjs from film.config.js; edit the config or lib/, then rebuild. -->
    <script src="node_modules/gsap/dist/gsap.min.js"></script>
    <script src="film.config.js"></script>
    <script src="lib/tracks.js"></script>
    <script src="lib/flat.js"></script>
    <script src="lib/lens.js"></script>
    <script src="lib/overlay.js"></script>
    <style>
      @font-face { font-family: "JetBrains Mono"; src: url("assets/fonts/JetBrainsMono-Regular.ttf") format("truetype"); font-weight: 400; font-style: normal; }
      @font-face { font-family: "JetBrains Mono"; src: url("assets/fonts/JetBrainsMono-Bold.ttf") format("truetype"); font-weight: 700; font-style: normal; }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: ${T.W}px; height: ${T.H}px; overflow: hidden; background: #000; }
      #root { position: relative; width: 100%; height: 100%; }
      #lens, #overlay { position: absolute; left: 0; top: 0; width: ${T.W}px; height: ${T.H}px; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${duration}" data-width="${T.W}" data-height="${T.H}" data-fps="${T.FPS}">
      <canvas id="lens" class="clip" data-start="0" data-duration="${duration}" data-track-index="0"></canvas>
      <canvas id="overlay" class="clip" data-start="0" data-duration="${duration}" data-track-index="1"></canvas>${audio}
    </div>
    <script>
      window.__timelines = window.__timelines || {};
      (async () => {
        const T = FFTracking.create(window.FF_TRACKING_CONFIG);
        const state = (window.__ffTracking = { T, error: null, renderer: null, frame: -1, drawn: null, draws: 0 });
        // The flat screen is drawn in JetBrains Mono: wait for both weights before the first frame.
        await Promise.all([document.fonts.load('400 26px "JetBrains Mono"'), document.fonts.load('700 80px "JetBrains Mono"')]);
        const flatCanvas = document.createElement("canvas");
        const flat = FFTrackingFlat.create(T, flatCanvas);
        const overlay = FFTrackingOverlay.create(T, document.getElementById("overlay"));
        let lens = null;
        try {
          lens = FFTrackingLens.create(T, document.getElementById("lens"));
          state.renderer = lens.renderer;
        } catch (error) {
          state.error = error.message;
          console.error(error.message);
        }
        if (!document.fonts.check('700 80px "JetBrains Mono"') || !document.fonts.check('400 26px "JetBrains Mono"')) state.error = "tracking-hud: JetBrains Mono did not load from assets/fonts";
        const frameAt = (t) => Math.min(T.TOTAL_FRAMES - 1, Math.max(0, Math.floor(t * T.FPS + 1e-3)));
        // One frame: flat screen -> texture -> lens -> overlay, synchronously.
        function draw(frame, options = {}) {
          if (!lens || state.error) {
            overlay.error(state.error);
            throw new Error(state.error);
          }
          const shot = T.shot(frame);
          flat.draw(frame, options);
          lens.draw(shot, flatCanvas, options);
          state.drawn = options.overlay === false ? (overlay.clear(), null) : overlay.draw(shot);
          state.frame = frame;
          state.draws += 1;
          return state.drawn;
        }
        Object.assign(state, { draw, frameAt, flat, flatCanvas, lens, overlay });
        const clock = { t: 0 };
        const tl = gsap.timeline({ paused: true });
        tl.to(clock, { t: T.DURATION, duration: T.DURATION, ease: "none", onUpdate: () => draw(frameAt(clock.t)) });
        if (lens && !state.error) draw(0);
        else overlay.error(state.error);
        window.__timelines.main = tl;
      })();
    </script>
  </body>
</html>
`;
}

/** Writes storyboard.json, index.html and tracks.json after check(); returns the problems that
 * stopped it, and the warnings either way. */
function build(dir, options = {}) {
  const T = load(dir);
  const { problems, warnings } = check(dir, T);
  if (problems.length) return { status: "failed", problems, warnings };
  const write = (name, content) => fs.writeFileSync(path.join(dir, name), content);
  write("storyboard.json", `${JSON.stringify(storyboard(T), null, 2)}\n`);
  write("index.html", compositionHtml(T, options));
  write("tracks.json", `${JSON.stringify(T.tracksJson(), null, 2)}\n`);
  const written = ["storyboard.json", "index.html", "tracks.json"];
  if (options.sound !== false && options.synthesize !== false) {
    const { synthesize } = require(path.join(dir, "sfx.cjs"));
    const result = synthesize(T, path.join(dir, "assets", "sfx.wav"), { ffmpeg: options.ffmpeg });
    written.push(path.relative(dir, result.output).replaceAll("\\", "/"));
  }
  return { status: "built", durationSec: sec(T.TOTAL_FRAMES, T.FPS), frames: T.TOTAL_FRAMES, shots: T.SHOTS, written, warnings };
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const known = new Set(["--no-sound"]);
  const unknown = args.filter((arg) => !known.has(arg));
  if (unknown.length) {
    console.error(`unknown option ${unknown.join(" ")}; usage: node build.cjs [--no-sound]`);
    process.exit(1);
  }
  try {
    const result = build(__dirname, { synthesize: !args.includes("--no-sound") });
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.status === "built" ? 0 : 2);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

module.exports = { FONTS, SOUND_FILE, build, check, compositionHtml, fontProblems, load, readFont, storyboard };

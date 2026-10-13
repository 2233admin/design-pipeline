"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");
const { spawnSync } = require("node:child_process");
const { checkStoryboard } = require("../skill/scripts/film-core.cjs");
const { scaffoldFilm } = require("../skill/scripts/film-project-core.cjs");

const tool = path.join(__dirname, "../skill/tools/ff-tracking-hud");
const vendor = path.join(__dirname, "../skill/vendor/ff-tracking/upstream");
const fixtures = path.join(vendor, "score/tests/fixtures");
const FFTracking = require(path.join(tool, "lib/tracks.js"));
const overlay = require(path.join(tool, "lib/overlay.js"));
const lens = require(path.join(tool, "lib/lens.js"));
const hud = require(path.join(tool, "build.cjs"));
const probe = require(path.join(tool, "probe.cjs"));
const config = () => JSON.parse(JSON.stringify(require(path.join(tool, "film.config.js"))));
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "tracking-hud-"));
const sha = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");

// Upstream prints these fixtures from f32 values; the port computes in f64. A value matches when
// it is within half its printed step plus a declared single-precision error budget.
const within = (actual, printed, step) => Math.abs(actual - printed) <= step / 2 + 0.005 * step * 10;

test("the port reproduces the upstream tracks and camera fixtures for every frame", () => {
  const T = FFTracking.create(config());
  const tracks = JSON.parse(fs.readFileSync(path.join(fixtures, "tracks.json"), "utf8"));
  const camera = JSON.parse(fs.readFileSync(path.join(fixtures, "camera.json"), "utf8"));
  const mine = T.tracksJson();
  for (const key of ["fps", "frames", "seconds", "cuts", "locks", "keys", "collapse", "done"]) assert.deepEqual(mine[key], tracks[key], key);
  assert.equal(mine.focus.length, tracks.focus.length);
  const rows = T.cameraJson().frames;
  assert.equal(rows.length, camera.frames.length);
  for (let g = 0; g < rows.length; g += 1) {
    const [a, b] = [rows[g], camera.frames[g]];
    assert.equal(a.lock, b.lock, `frame ${g} lock`);
    for (const axis of [0, 1]) {
      assert.ok(within(T.shot(g).focus[axis], tracks.focus[g][axis], 0.1), `frame ${g} focus`);
      assert.ok(within(a.aim[axis], b.aim[axis], 0.1), `frame ${g} aim`);
      assert.ok(within(a.focus_screen[axis], b.focus_screen[axis], 0.1), `frame ${g} projected focus`);
      assert.ok(within(a.centre_screen[axis], b.centre_screen[axis], 0.1), `frame ${g} projected centre`);
    }
    assert.ok(within(a.zoom, b.zoom, 0.001), `frame ${g} zoom`);
    for (const key of ["tilt_x", "tilt_y", "roll"]) assert.ok(within(a[key], b[key], 0.0001), `frame ${g} ${key}`);
  }
});

test("hud::rnd matches u32 wrapping arithmetic and the default config passes the upstream self-tests", () => {
  // Independent reference of upstream `hud::rnd`: exact u32 wrapping products, then an f32 cast.
  const M = (1n << 32n) - 1n;
  const mul = (a, b) => (a * b) & M;
  const reference = (a, b) => {
    let h = mul(BigInt(a), 0x9e3779b1n) ^ mul(BigInt(b), 0x85ebca77n) ^ 0x27d4eb2fn;
    h ^= h >> 15n;
    h = mul(h, 0x2c1b3c6dn);
    h ^= h >> 12n;
    h = mul(h, 0x297a2d39n);
    h ^= h >> 15n;
    return Math.fround(Math.fround(Number(h)) / Math.fround(4294967295));
  };
  for (const [a, b] of [[0, 0], [1, 2], [77, 13], [4294967295, 999], [12345, 4294967294], [250, 180]]) assert.equal(FFTracking.rnd(a, b), reference(a, b), `${a},${b}`);
  for (let i = 0; i < 2000; i += 1) assert.equal(FFTracking.rnd(i * 37, i * 101 + 999), reference(i * 37, i * 101 + 999));
  assert.deepEqual(FFTracking.create(config()).problems(), []);
});

// A project directory with the template's build, tracks, overlay and the vendored fonts: what
// `check` and `node build.cjs` read.
function project(cfg) {
  const dir = tmp();
  fs.mkdirSync(path.join(dir, "lib"));
  fs.mkdirSync(path.join(dir, "assets", "fonts"), { recursive: true });
  for (const name of ["build.cjs", "lib/tracks.js", "lib/overlay.js"]) fs.copyFileSync(path.join(tool, name), path.join(dir, name));
  for (const face of ["Regular", "Bold"]) fs.copyFileSync(path.join(vendor, `media/JetBrainsMono-${face}.ttf`), path.join(dir, `assets/fonts/JetBrainsMono-${face}.ttf`));
  if (cfg) fs.writeFileSync(path.join(dir, "film.config.js"), `module.exports = ${JSON.stringify(cfg, null, 2)};\n`);
  return dir;
}

// One broken config per failure mode new content can introduce, each refused by the build with a
// message that names the shot or frame, the measured value and the limit.
const NEAR_BLACK = ["#000502", "#030805", "#050b07", "#070e09", "#0a120c"];
const REFUSED = [
  ["typed line runs past the right screen edge", (c) => { c.shots[2].text = "reading 14 files and then 40 more"; }, /shot 3: the line "reading 14 files and then 40 more" runs past the screen edge \(ends at x 1993, limit 1860\)/],
  ["typed line climbs into the title bar", (c) => { c.shots[3].hero = [420, 60]; }, /shot 4: the line "src\/render\.rs" reaches up to y -12, into the title bar/],
  ["typed line starts left of the screen margin", (c) => { c.shots[4].hero = [20, 560]; }, /shot 5: the line "tool_call: render_frame\(\)" starts at x 20, left of the screen margin 60/],
  ["typed line drops into the status bar", (c) => { c.shots[4].hero = [230, 1000]; }, /shot 5: the line "tool_call: render_frame\(\)" reaches down to y 1013, into the status bar/],
  ["target glyph leaves the frame after the camera", (c) => { c.shots[1].camera.pan = [2600, 0]; }, /frame 15 \(shot 2\): target lands at 3254,645, outside the safe frame 200-1720 x 150-930/],
  ["named lock word and its LOCK label leave the frame", (c) => { c.shots[1].lock = "thinking…"; }, /shot 2: the lock on "thinking…" does not read on any lock frame \(frame 24: the locked box spans x -401\.\.1409, y 291\.\.702, the LOCK label spans x -401\.\.-196, y 266\.\.286; frame 25: .*\)\. Zoom the shot out/],
  ["named lock's LOCK label collides with another label", (c) => { c.shots[2].lock = "files"; }, /shot 3: the lock on "files" does not read on any lock frame \(frame 39: 1 other label overlaps the LOCK label; frame 40: 1 other label overlaps the LOCK label\)/],
  ["lock ping too close to the next cut", (c) => { Object.assign(c.timing, { lockAt: 13, lockFrames: 2 }); }, /timing: each lock ping \(shot frame 13\) lands 0\.433 s after its cut and 0\.067 s before the next; keep it at least 0\.1 s from both/],
  ["palette too flat for its text", (c) => { c.palettes.mono = ["#1a1a1a", "#1e1e1e", "#222222", "#262626", "#2a2a2a"]; }, /palette mono \(shot 3, 4, 7\): text stop #2a2a2a on background stop #1a1a1a is 1\.21:1, below 3:1/],
  ["glyphs JetBrains Mono does not have", (c) => { c.shots[2].text = "读取 14 个文件"; }, /shot 3 "读取 14 个文件": 读 \(U\+8BFB\) is not in the font; .* \(JetBrains Mono Bold\)\. The browser would draw it in a fallback font/],
  ["Done label wider than its pill", (c) => { c.done = { ...c.done, label: "design-pipeline" }; }, /done\.label "design-pipeline" ends at x 1640, past the pill's inner edge 1146; set done\.size to at least \[914, 132\]/],
  ["last frame cuts into the Done pill", (c) => { c.shots[11].camera.zoom = [3.0, 9]; }, /frame 179 \(last frame, shot 12\): the Done pill is not whole in the frame \(x -2470\.\.2769/],
  ["last shot on a near-black palette", (c) => { c.palettes.neon = NEAR_BLACK; }, /palette neon \(shot 12\): text stop #0a120c on background stop #000502 is 1\.08:1, below 3:1/],
];
const INVALID = [
  ["lock word missing from the typed line", (c) => { c.shots[5].lock = "token 4813"; }, /shots\[5\]\.lock "token 4813" is not in the typed line "attention → token 4812"/],
  ["shot shorter than typing plus lock", (c) => { c.shotFrames = 10; }, /timing: typing ends at shot frame 8 and the lock holds frames 9-10, in a shot of 10 frames \(0-9\)/],
  ["typed line ending in a space", (c) => { c.shots[2].text = "reading 14 files "; }, /shots\[2\]\.text "reading 14 files " ends with a space/],
  ["unknown shot kind", (c) => { c.shots[0].kind = "slideshow"; }, /kind must be one of cursor, typing, collapse, done/],
  ["unknown palette", (c) => { c.shots[1].palette = "sepia"; }, /palette sepia is not in palettes/],
];

test("every content failure mode is refused with a message that names it", () => {
  const dir = project(config());
  try {
    const fresh = hud.check(dir);
    assert.deepEqual(fresh.problems, []);
    for (const [mode, edit, message] of REFUSED) {
      const broken = config();
      edit(broken);
      fs.writeFileSync(path.join(dir, "film.config.js"), `module.exports = ${JSON.stringify(broken)};\n`);
      assert.match(hud.check(dir).problems.join("\n"), message, mode);
    }
    for (const [mode, edit, message] of INVALID) {
      const broken = config();
      edit(broken);
      assert.throws(() => FFTracking.create(broken), message, mode);
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("a lock that does not read only warns until the shot names its word", () => {
  const dir = project(config());
  try {
    const { problems, warnings } = hud.check(dir);
    assert.deepEqual(problems, []);
    // Upstream's own default: shot 2 locks a word wider than the frame, shots 3 and 9 draw a label over the LOCK label.
    assert.deepEqual(warnings.map((w) => w.match(/^shot (\d+): the lock on "([^"]+)"/).slice(1).join(" ")), ["2 thinking…", "3 files", "9 frames"]);
    assert.match(warnings[0], /Allowed for the implicit last-word lock; name the word in shots\[1\]\.lock to require a readable lock/);
    const named = config();
    named.shots[5].lock = "token";
    fs.writeFileSync(path.join(dir, "film.config.js"), `module.exports = ${JSON.stringify(named)};\n`);
    const T = hud.load(dir);
    const box = T.track(5, T.LOCK_AT).boxes.at(-1);
    const [start, end] = [T.cell(5, 12), T.cell(5, 16)];
    assert.deepEqual(T.shots[5].lockSpan, [12, 16]);
    assert.ok(box.locked && box.x < start[0] && box.x + box.w > end[0] + end[2], "the lock box covers token");
    assert.match(hud.storyboard(T).beats[5].productAction, /lock on "token"$/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("a refused config writes nothing: build exits 2 on a problem and 1 on an invalid config", () => {
  const wide = config();
  wide.shots[2].text = "reading 14 files and then 40 more";
  const dir = project(wide);
  try {
    const result = spawnSync(process.execPath, [path.join(dir, "build.cjs"), "--no-sound"], { encoding: "utf8" });
    assert.equal(result.status, 2, result.stdout + result.stderr);
    assert.match(JSON.parse(result.stdout).problems[0], /runs past the screen edge/);
    for (const name of ["storyboard.json", "index.html", "tracks.json"]) assert.equal(fs.existsSync(path.join(dir, name)), false, name);
    const invalid = config();
    invalid.shots[5].lock = "token 4813";
    fs.writeFileSync(path.join(dir, "film.config.js"), `module.exports = ${JSON.stringify(invalid)};\n`);
    const refused = spawnSync(process.execPath, [path.join(dir, "build.cjs"), "--no-sound"], { encoding: "utf8" });
    assert.equal(refused.status, 1);
    assert.match(refused.stderr, /lock "token 4813" is not in the typed line/);
    fs.rmSync(path.join(dir, "assets", "fonts", "JetBrainsMono-Bold.ttf"));
    fs.writeFileSync(path.join(dir, "film.config.js"), `module.exports = ${JSON.stringify(config())};\n`);
    assert.match(hud.check(dir).problems.join("\n"), /assets\/fonts\/JetBrainsMono-Bold\.ttf is missing/);
    assert.equal(spawnSync(process.execPath, [path.join(dir, "build.cjs"), "--sound"], { encoding: "utf8" }).status, 1);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("the generated storyboard passes the film gate and binds a cue to every shot", () => {
  const T = FFTracking.create(config());
  const board = hud.storyboard(T);
  const result = checkStoryboard(board);
  assert.equal(result.status, "passed", JSON.stringify(result.findings));
  assert.deepEqual(result.findings.map((f) => f.code), ["uniform-cadence"]);
  assert.equal(board.beats.length, 12);
  assert.equal(board.durationSec, 6);
  assert.deepEqual(board.beats.slice(1).map((b) => b.handoff), Array(11).fill("hard-cut"));
  assert.ok(board.beats.every((b, i) => b.soundCues.includes(`lock-${i + 1}`)));
  assert.equal(board.sound.cues.filter((c) => c.kind === "accent").length, 12);
  assert.equal(board.rendering.route, "webgl");
});

test("the composition is one paused timeline that films flat, lens and overlay in one callback", () => {
  const T = FFTracking.create(config());
  const html = hud.compositionHtml(T);
  assert.match(html, /data-composition-id="main" data-start="0" data-duration="6" data-width="1920" data-height="1080" data-fps="30"/);
  assert.match(html, /<audio id="sfx" src="assets\/sfx-mastered\.wav" data-start="0" data-duration="6"/);
  assert.match(html, /gsap\.timeline\(\{ paused: true \}\)/);
  assert.match(html, /window\.__timelines\.main = tl/);
  assert.match(html, /flat\.draw\(frame, options\);\s+lens\.draw\(shot, flatCanvas, options\);/);
  assert.doesNotMatch(html, /Math\.random|Date\.now|performance\.now|requestAnimationFrame/);
  assert.doesNotMatch(hud.compositionHtml(T, { sound: false }), /<audio/);
  const shader = lens.fragmentSource(T);
  assert.match(shader, /const int TAPS = 36;/);
  assert.match(shader, /const int GLOW_TAPS = 16;/);
  assert.match(shader, /float coc = clamp\(uBlur \* 190\.0 \* abs\(1\.0 - zf \/ z\), 0\.0, 46\.0\);/);
  // fframes samples the flat for the SkSL shader with FilterMode::Linear: bilinear, not texel fetches.
  assert.match(shader, /return texture\(iChannel0, q \* FLAT_SCALE \/ uFlatSize\)\.rgb;/);
  assert.doesNotMatch(shader, /texelFetch/);
  assert.match(fs.readFileSync(path.join(tool, "lib/lens.js"), "utf8"), /\[gl\.TEXTURE_MIN_FILTER, gl\.LINEAR\], \[gl\.TEXTURE_MAG_FILTER, gl\.LINEAR\]/);
  for (const source of ["lib/tracks.js", "lib/flat.js", "lib/lens.js", "lib/overlay.js"]) assert.doesNotMatch(fs.readFileSync(path.join(tool, source), "utf8"), /Math\.random|Date\.now|performance\.now/, source);
});

test("every overlay label states the rounded projection of its box centre", () => {
  const T = FFTracking.create(config());
  let labels = 0;
  for (let g = 0; g < T.TOTAL_FRAMES; g += 1) {
    const shot = T.shot(g);
    const boxes = T.track(shot.shotIndex, shot.shotFrame).boxes;
    for (const label of overlay.layout(T, shot).labels) {
      const c = T.project(shot, T.center(boxes[label.box]), T.W, T.H);
      assert.equal(label.text, `${boxes[label.box].locked ? "LOCK " : ""}x: ${Math.round(c[0])} y: ${Math.round(c[1])}`);
      labels += 1;
    }
  }
  assert.ok(labels > 300);
});

test("film scaffold writes the tracking HUD project from its config and the vendored fonts", () => {
  const dir = tmp();
  try {
    const project = path.join(dir, "hud");
    const result = scaffoldFilm(project, { template: "tracking-hud", id: "agent-hud" });
    for (const name of ["film.config.js", "build.cjs", "sfx.cjs", "probe.cjs", "lib/tracks.js", "lib/flat.js", "lib/lens.js", "lib/overlay.js", "index.html", "storyboard.json", "tracks.json", "FILM.md", "qa.md", "package.json"]) assert.ok(fs.existsSync(path.join(project, name)), name);
    assert.equal(sha(path.join(project, "assets/fonts/JetBrainsMono-Bold.ttf")), sha(path.join(vendor, "media/JetBrainsMono-Bold.ttf")));
    assert.equal(sha(path.join(project, "assets/fonts/JetBrainsMono-OFL.txt")), sha(path.join(vendor, "licenses/JetBrainsMono-OFL.txt")));
    assert.equal(sha(path.join(project, "LICENSE.ff-tracking")), sha(path.join(vendor, "LICENSE")));
    for (const name of ["lib/tracks.js", "lib/lens.js", "build.cjs"]) assert.equal(sha(path.join(project, name)), sha(path.join(tool, name)), name);
    const board = JSON.parse(fs.readFileSync(path.join(project, "storyboard.json"), "utf8"));
    assert.equal(board.id, "agent-hud");
    assert.equal(checkStoryboard(board).status, "passed");
    assert.match(fs.readFileSync(path.join(project, "film.config.js"), "utf8"), /id: "agent-hud",/);
    const pkg = JSON.parse(fs.readFileSync(path.join(project, "package.json"), "utf8"));
    assert.deepEqual(Object.keys(pkg.devDependencies).sort(), ["gsap", "hyperframes"]);
    assert.ok(result.next.every((line) => /^\d\./.test(line)));
    assert.ok(result.next.some((line) => line.includes(`node ${path.join(project, "build.cjs").replaceAll("\\", "/")}`)), result.next.join("\n"));
    assert.ok(result.next.some((line) => / audio master --input assets\/sfx\.wav --output assets\/sfx-mastered\.wav --target web/.test(line)));
    // The rebuilt project matches what the scaffold wrote.
    const rebuilt = spawnSync(process.execPath, [path.join(project, "build.cjs"), "--no-sound"], { encoding: "utf8" });
    assert.equal(rebuilt.status, 0, rebuilt.stderr);
    assert.equal(JSON.parse(fs.readFileSync(path.join(project, "storyboard.json"), "utf8")).id, "agent-hud");
    assert.throws(() => scaffoldFilm(project, { template: "tracking-hud" }), /refusing to overwrite .*film\.config\.js/);
    assert.throws(() => scaffoldFilm(path.join(dir, "other"), { template: "terminal-hud" }), /allowed: default, motion-study, tracking-hud/);
    assert.equal(fs.existsSync(path.join(dir, "other")), false);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("the self-test refuses unknown options before touching a browser", () => {
  assert.deepEqual(probe.parseArgs(["--gpu", "software", "--dpr", "2", "--frames", "4,9"]), { gpu: "software", dpr: 2, frames: [4, 9], chrome: null, out: "evidence/self-test.json" });
  assert.throws(() => probe.parseArgs(["--gpu", "metal"]), /--gpu must be auto, hardware or software/);
  assert.throws(() => probe.parseArgs(["--dpr", "3"]), /--dpr must be 1/);
  assert.throws(() => probe.parseArgs(["--strict"]), /unknown or incomplete option --strict/);
  assert.equal(probe.MARKER_TOLERANCE_PX, 1);
  assert.equal(probe.GLYPH_TOLERANCE_PX, 3);
});

test("the sound's band-passes are the Butterworth sections sfx.py gets from scipy", () => {
  const { bandpassSos } = require(path.join(tool, "sfx.cjs"));
  const gainDb = (sos, f) => {
    const w = (2 * Math.PI * f) / 48000;
    const h = sos.reduce((acc, [b0, b1, b2, a1, a2]) => {
      const num = [b0 + b1 * Math.cos(w) + b2 * Math.cos(2 * w), -(b1 * Math.sin(w) + b2 * Math.sin(2 * w))];
      const den = [1 + a1 * Math.cos(w) + a2 * Math.cos(2 * w), -(a1 * Math.sin(w) + a2 * Math.sin(2 * w))];
      const d = den[0] ** 2 + den[1] ** 2;
      const q = [(num[0] * den[0] + num[1] * den[1]) / d, (num[1] * den[0] - num[0] * den[1]) / d];
      return [acc[0] * q[0] - acc[1] * q[1], acc[0] * q[1] + acc[1] * q[0]];
    }, [1, 0]);
    return 20 * Math.log10(Math.hypot(h[0], h[1]));
  };
  for (const [lo, hi] of [[400, 3000], [2500, 9000], [350, 700]]) {
    const sos = bandpassSos(lo, hi);
    assert.equal(sos.length, 2);
    // Prewarped edges sit at -3.01 dB and the analog centre at 0 dB, as in butter(2, [lo, hi], "bandpass").
    for (const f of [lo, hi]) assert.ok(Math.abs(gainDb(sos, f) + 3.0103) < 1e-3, `${lo}-${hi} at ${f}`);
    const centre = (48000 / Math.PI) * Math.atan(Math.sqrt(16 * Math.tan((Math.PI * lo) / 48000) * Math.tan((Math.PI * hi) / 48000)) / 4);
    assert.ok(Math.abs(gainDb(sos, centre)) < 1e-6, `${lo}-${hi} centre`);
  }
});

test("the sound is synthesized by ffmpeg from the tracks events, deterministically", (t) => {
  if (spawnSync("ffmpeg", ["-version"], { encoding: "utf8" }).status !== 0) {
    t.skip("ffmpeg is not on PATH");
    return;
  }
  const { synthesize } = require(path.join(tool, "sfx.cjs"));
  const dir = tmp();
  try {
    const T = FFTracking.create(config());
    const a = synthesize(T, path.join(dir, "a.wav"));
    const b = synthesize(T, path.join(dir, "b.wav"));
    assert.equal(sha(a.output), sha(b.output));
    assert.deepEqual(a.events, { cuts: 12, keys: 67, locks: 12, riser: true, chime: true });
    assert.ok(Math.abs(a.peakDbfs + 12) < 0.05, String(a.peakDbfs));
    const probed = spawnSync("ffprobe", ["-v", "error", "-show_entries", "stream=sample_rate,channels,duration_ts", "-of", "csv=p=0", a.output], { encoding: "utf8" }).stdout.trim();
    assert.equal(probed, "48000,2,288000");
    const short = config();
    short.shots = short.shots.slice(0, 10);
    const c = synthesize(FFTracking.create(short), path.join(dir, "c.wav"));
    assert.deepEqual(c.events, { cuts: 10, keys: 67, locks: 10, riser: false, chime: false });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

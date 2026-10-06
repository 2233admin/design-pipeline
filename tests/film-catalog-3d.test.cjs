"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { probe } = require("../skill/references/film-choreography/timeline-probe.js");
const { checkTimeline } = require("../skill/scripts/film-timeline-core.cjs");
const { checkStoryboard, evaluateFilmRender } = require("../skill/scripts/film-core.cjs");
const { loadCatalog, searchBlocks, blockNames } = require("../skill/scripts/film-blocks-core.cjs");
const { checkFilmProject, scaffoldFilm } = require("../skill/scripts/film-project-core.cjs");

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "film-3d-"));
const codes = (result) => result.findings.map((finding) => finding.code);
const CATALOG = [
  { name: "camera-dolly-zoom", type: "block", title: "Dolly Zoom (Vertigo Shot)", description: "Camera tracks toward the subject while the field of view changes", tags: ["camera", "depth", "3d", "cinematic"], duration: 4 },
  { name: "app-showcase", type: "block", title: "App Showcase", description: "Three floating smartphone screens", tags: ["showcase", "app", "3d"], duration: 6 },
  { name: "glitch", type: "block", title: "Glitch", description: "Shader transition with digital glitch artifacts", tags: ["transition", "shader"], duration: 1 },
];

function blockBoard() {
  return {
    schema: "design-pipeline.film-storyboard.v1", id: "block-film", durationSec: 4, grammar: "continuous-transformation",
    benefit: "Focus holds while the world moves.", proofAction: "Camera dolly with counter-zoom.",
    sound: { mode: "silent", reason: "verification clip" },
    beats: [{ id: "vertigo", startSec: 0, endSec: 4, role: "action", subject: "figure", productAction: "Camera dolly with counter-zoom", transformation: { kind: "camera-move", from: "flat", to: "deep" }, handoff: "open", motion: ["dolly-zoom"], block: "camera-dolly-zoom" }],
  };
}

test("enamel plans reject flat routes and missing angle samples without claiming acceptance", () => {
  const board = blockBoard();
  board.rendering = { route: "css3d", requirements: ["solid-depth", "bevel", "clearcoat", "view-dependent-color", "surface-relief"], reason: "Reference enamel has depth and view-dependent reflections.", samples: [{ atSec: 0, purpose: "front" }] };
  const wrong = checkStoryboard(board);
  assert.ok(codes(wrong).includes("material-route-incapable"));
  assert.ok(codes(wrong).includes("material-angle-samples-missing"));
  assert.match(wrong.findings[0].fix, /WebGL/);
  for (const route of ["webgl", "blender", "footage"]) {
    board.rendering.route = route;
    board.rendering.samples = [{ atSec: 0, purpose: "front" }, { atSec: 2, purpose: "oblique" }];
    assert.equal(checkStoryboard(board).status, "passed");
    assert.equal(checkStoryboard(board).creativeAcceptance, "not-assessed");
  }
  board.rendering.samples[1].atSec = 0;
  assert.ok(codes(checkStoryboard(board)).includes("material-angle-samples-missing"));
  board.rendering.samples[1].atSec = 5;
  assert.throws(() => checkStoryboard(board), /within the film/);
  board.rendering.samples[1].atSec = 2;
  board.rendering.requirements = ["unknown-effect"];
  assert.throws(() => checkStoryboard(board), /allowed/);
  delete board.rendering;
  assert.equal(checkStoryboard(board).status, "passed", "legacy generic storyboards remain valid");
});

test("probe marks tweens on plain objects as procedural drivers", () => {
  const tween = (targets) => ({ startTime: () => 0, duration: () => 4, targets: () => targets, vars: { u: 1 }, repeat: () => 0 });
  const root = { duration: () => 4, timeScale: () => 1, getChildren: () => [tween([{ u: 0 }]), tween([{ nodeType: 1, id: "card", getAttribute: () => null }])] };
  const manifest = probe(root, "main");
  assert.equal(manifest.tweens[0].driver, true);
  assert.equal(manifest.tweens[1].driver, undefined);
});

test("timeline gate leaves driver-only beats to pixel evidence instead of calling them static", () => {
  const timeline = { schema: "design-pipeline.film-timeline.v1", compositionId: "main", durationSec: 4, tweens: [{ targets: ["object"], startSec: 0, durationSec: 4, props: ["u"], driver: true }] };
  const result = checkTimeline(timeline, blockBoard());
  assert.equal(result.status, "passed", JSON.stringify(result.findings));
  assert.deepEqual(result.metrics.proceduralBeats, ["vertigo"]);
  const staticTimeline = { ...timeline, tweens: [] };
  assert.ok(codes(checkTimeline(staticTimeline, blockBoard())).includes("beat-static"));
});

test("catalog search ranks name and tag hits and filters by tag", () => {
  assert.equal(searchBlocks(CATALOG, "dolly zoom camera")[0].name, "camera-dolly-zoom");
  assert.deepEqual(searchBlocks(CATALOG, "", { tag: "shader" }).map((r) => r.name), ["glitch"]);
  assert.equal(searchBlocks(CATALOG, "phone showcase")[0].install, "npx hyperframes add app-showcase");
  assert.deepEqual(searchBlocks(CATALOG, "nothing-matches-this"), []);
});

test("catalog is cached per project and storyboards naming unknown blocks get a fix", () => {
  const dir = tmp();
  try {
    let fetched = 0;
    const first = loadCatalog(dir, { fetch: () => { fetched += 1; return CATALOG; } });
    assert.equal(first.cached, false);
    assert.equal(loadCatalog(dir, { fetch: () => { fetched += 1; return CATALOG; } }).cached, true);
    assert.equal(fetched, 1);
    const names = blockNames(dir);
    assert.equal(checkStoryboard(blockBoard(), { blockNames: names }).status, "passed");
    const board = blockBoard();
    board.beats[0].block = "made-up-block";
    const finding = checkStoryboard(board, { blockNames: names }).findings.find((f) => f.code === "block-unknown");
    assert.match(finding.fix, /film blocks --query/);
    assert.equal(checkStoryboard(board).status, "passed", "without a catalog the block name is not judged");
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("scaffold hosts a named block at its beat time with the install command", () => {
  const dir = tmp();
  try {
    scaffoldFilm(dir);
    const board = JSON.parse(fs.readFileSync(path.join(dir, "storyboard.json"), "utf8"));
    board.beats[2].block = "camera-dolly-zoom";
    fs.writeFileSync(path.join(dir, "storyboard.json"), JSON.stringify(board));
    const html = require("../skill/scripts/film-project-core.cjs").compositionHtml(board);
    assert.ok(html.includes("npx hyperframes add camera-dolly-zoom"));
    assert.ok(html.includes(`data-composition-src="compositions/camera-dolly-zoom.html" data-start="${board.beats[2].startSec}"`));
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("film check captures HyperFrames projects through the preview runtime and stops a preview it started", () => {
  const dir = tmp();
  try {
    scaffoldFilm(dir);
    fs.writeFileSync(path.join(dir, "hyperframes.json"), "{}");
    let stopped = false;
    let seenUrl = null;
    const probed = JSON.parse(fs.readFileSync(path.join(__dirname, "../skill/references/film-choreography/timeline.example.json"), "utf8"));
    const result = checkFilmProject(dir, {
      preview: () => ({ url: "http://127.0.0.1:1/api/projects/x/preview", started: true, stop: () => { stopped = true; } }),
      capture: (composition, url) => { seenUrl = url; return probed; },
    });
    assert.equal(seenUrl, "http://127.0.0.1:1/api/projects/x/preview");
    assert.equal(stopped, true);
    assert.equal(result.steps.find((step) => step.gate === "timeline").source, "captured through the HyperFrames preview runtime");
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

const hasFfmpeg = spawnSync("ffmpeg", ["-version"], { windowsHide: true }).status === 0;

test("render motion evidence fails a frozen action beat and passes a moving one", { skip: !hasFfmpeg && "ffmpeg not installed" }, () => {
  const dir = tmp();
  try {
    const make = (name, filter) => {
      const run = spawnSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-f", "lavfi", "-i", filter, "-c:v", "libx264", "-pix_fmt", "yuv420p", path.join(dir, name)], { windowsHide: true, encoding: "utf8" });
      assert.equal(run.status, 0, run.stderr);
      return path.join(dir, name);
    };
    const frozen = make("frozen.mp4", "color=c=0x202830:s=320x180:r=30:d=4");
    const moving = make("moving.mp4", "color=c=0x202830:s=320x180:r=30:d=4[bg];color=c=white:s=40x40:r=30:d=4[b];[bg][b]overlay=x='mod(t*80,280)':y=60");
    const stuck = evaluateFilmRender(blockBoard(), frozen);
    assert.ok(codes(stuck).includes("render-static-beat"));
    assert.match(stuck.findings.find((f) => f.code === "render-static-beat").fix, /procedural driver/);
    const alive = evaluateFilmRender(blockBoard(), moving);
    assert.ok(!codes(alive).includes("render-static-beat"));
    assert.ok(alive.motion[0].changedShare > 0.002);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

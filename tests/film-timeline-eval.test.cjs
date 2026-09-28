"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { checkTimeline } = require("../skill/scripts/film-timeline-core.cjs");
const { measureFilmBenchmark } = require("../skill/scripts/film-eval-core.cjs");
const { evaluateBenchmark } = require("../skill/scripts/benchmark-core.cjs");
const { probe } = require("../skill/references/film-choreography/timeline-probe.js");

const refs = path.join(__dirname, "../skill/references/film-choreography");
const evals = path.join(__dirname, "../skill/evals/film");
const load = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const board = () => load(path.join(refs, "storyboard.example.json"));
const timeline = () => load(path.join(refs, "timeline.example.json"));
const codes = (result) => result.findings.map((finding) => finding.code);

function slideshowTimeline() {
  const tweens = [{ targets: ["#bg"], startSec: 0, durationSec: 12, props: ["x"] }];
  board().beats.forEach((beat, index) => {
    tweens.push({ targets: [`#p${index}`], startSec: beat.startSec, durationSec: 0.4, props: ["opacity"] });
    tweens.push({ targets: [`#p${index}`], startSec: beat.endSec - 0.4, durationSec: 0.4, props: ["opacity"] });
  });
  return { schema: "design-pipeline.film-timeline.v1", compositionId: "main", durationSec: 12, tweens };
}

test("probed golden timeline (real GSAP + shipped patterns) passes and carries every planned handoff", () => {
  const result = checkTimeline(timeline(), board());
  assert.equal(result.status, "passed", JSON.stringify(result.findings));
  assert.equal(result.metrics.carriedHandoffs, 1);
  assert.equal(result.creativeAcceptance, "not-assessed");
});

test("fade-in/fade-out panel timeline fails even behind an ambient background tween", () => {
  const result = checkTimeline(slideshowTimeline(), board());
  assert.equal(result.status, "failed");
  assert.deepEqual(result.metrics.ambientTargets, ["#bg"]);
  assert.equal(result.metrics.fadeOnlyActionBeats, 4);
  assert.ok(codes(result).includes("handoff-not-carried"));
});

test("layout tweens, infinite repeats, static beats and duration drift are reported", () => {
  const data = timeline();
  data.tweens.push({ targets: ["#card"], startSec: 1, durationSec: 0.5, props: ["width"] });
  data.tweens.push({ targets: ["#spinner"], startSec: 2, durationSec: 0.5, props: ["rotation"], repeat: -1 });
  data.durationSec = 12.5;
  const result = checkTimeline(data, board());
  for (const code of ["layout-tween", "infinite-repeat", "duration-mismatch"]) assert.ok(codes(result).includes(code), code);
  const empty = timeline();
  empty.tweens = empty.tweens.filter((tween) => tween.startSec + tween.durationSec <= 3.8 || tween.startSec >= 8.8);
  assert.ok(checkTimeline(empty, board()).findings.some((finding) => finding.code === "beat-static" && finding.beatId === "image-bloom"));
});

test("malformed timelines are contract errors", () => {
  assert.throws(() => checkTimeline({ ...timeline(), schema: "x" }), /schema/);
  const data = timeline();
  data.tweens[0].startSec = -1;
  assert.throws(() => checkTimeline(data, board()), /non-negative/);
});

test("probe flattens nested timelines with absolute times and strips control vars", () => {
  const tween = (targets, start, duration, vars) => ({ startTime: () => start, duration: () => duration, targets: () => targets, vars, repeat: () => vars.repeat || 0 });
  const nested = { startTime: () => 2, duration: () => 1, timeScale: () => 1, getChildren: () => [tween([{ id: "b" }], 0.5, 0.5, { x: 10, ease: "none", startAt: { x: 0 } })] };
  const root = { duration: () => 3, timeScale: () => 1, getChildren: () => [tween([{ id: "a" }], 0, 1, { opacity: 1, duration: 1, onComplete() {} }), nested] };
  const manifest = probe(root, "main");
  assert.equal(manifest.durationSec, 3);
  assert.deepEqual(manifest.tweens.map((t) => [t.targets[0], t.startSec, t.props.join()]), [["#a", 0, "opacity"], ["#b", 2.5, "x"]]);
  assert.deepEqual(manifest.tweens[1].from, { x: 0 });
  assert.throws(() => probe({}), /GSAP timeline/);
});

const hasFfmpeg = spawnSync("ffmpeg", ["-version"], { windowsHide: true }).status === 0;

function synthesize(file) {
  // Segment durations (not equal 3s/3s/3s/3s) so the actual scene cuts at 2/5/8s land clear of
  // the golden storyboard's carried-boundary beat starts (1.6/3.8/8.8/10.6s).
  const durations = [2, 3, 3, 4];
  const cuts = [2, 5, 8];
  const inputs = ["red", "blue", "green", "yellow"].flatMap((color, index) => ["-f", "lavfi", "-i", `color=c=${color}:s=160x90:r=30:d=${durations[index]}[bg];color=c=white:s=20x20:r=30:d=${durations[index]}[b];[bg][b]overlay=x='mod(t*60,140)':y=30`]);
  const clicks = cuts.map((at) => `between(t,${at},${at + 0.03})*0.9*sin(2*PI*1000*t)`).join("+");
  const run = spawnSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...inputs, "-f", "lavfi", "-i", `aevalsrc='0.01*sin(2*PI*220*t)+${clicks}':s=8000:d=12`,
    "-filter_complex", "[0:v][1:v][2:v][3:v]concat=n=4:v=1:a=0[v]", "-map", "[v]", "-map", "4:a", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", file], { windowsHide: true, encoding: "utf8" });
  assert.equal(run.status, 0, run.stderr);
}

test("film benchmark manifest is a valid v2 benchmark whose brief hides private expectations", () => {
  const manifest = load(path.join(evals, "film-benchmark.json"));
  const cli = path.join(__dirname, "../skill/scripts/designer-pipeline.cjs");
  const run = spawnSync(process.execPath, [cli, "benchmark", "brief", "--manifest", path.join(evals, "film-benchmark.json"), "--root", path.join(__dirname, "..")], { encoding: "utf8" });
  assert.equal(run.status, 0, run.stdout + run.stderr);
  assert.ok(!run.stdout.includes("privateExpectations"));
  assert.equal(manifest.scenarios.length, 3);
  const fixture = load(path.join(evals, "slideshow.storyboard.json"));
  const { checkStoryboard } = require("../skill/scripts/film-core.cjs");
  assert.equal(checkStoryboard(fixture).status, "failed", "repair fixture must start broken");
});

test("film-eval measures systems through the film gates and benchmark evaluate ranks them", { skip: !hasFfmpeg && "ffmpeg not installed" }, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "film-eval-"));
  try {
    const manifest = load(path.join(evals, "film-benchmark.json"));
    const put = (system, scenario, files) => {
      const target = path.join(dir, system, scenario);
      fs.mkdirSync(target, { recursive: true });
      for (const [name, value] of Object.entries(files)) fs.writeFileSync(path.join(target, name), typeof value === "string" ? value : JSON.stringify(value));
      return target;
    };
    for (const scenario of manifest.scenarios) {
      const good = put("claude", scenario.id, { "storyboard.json": board(), "timeline.json": timeline() });
      synthesize(path.join(good, "out.mp4"));
      put("codex", scenario.id, { "storyboard.json": load(path.join(evals, "slideshow.storyboard.json")), "timeline.json": slideshowTimeline() });
    }
    put("omp", "canvas-launch", { "storyboard.json": "{not json" });

    const measurements = measureFilmBenchmark(manifest, dir);
    assert.equal(measurements.schema, "design-pipeline.benchmark-measurements.v2");
    assert.equal(measurements.measurements.claude["canvas-launch"].score, 1);
    assert.ok(measurements.measurements.codex["canvas-launch"].score < 0.4);
    assert.equal(measurements.measurements.omp["canvas-launch"].score, 0);
    assert.equal(measurements.measurements.omp["cli-launch"], undefined);

    const result = evaluateBenchmark(manifest, measurements);
    assert.equal(result.status, "blocked", "unmeasured omp scenarios block the benchmark");
    const system = (name) => result.systems.find((entry) => entry.system === name);
    assert.equal(system("claude").status, "passed");
    assert.equal(system("codex").status, "failed");
    assert.ok(result.unknownRequired.includes("omp/cli-launch"));

    const cli = path.join(__dirname, "../skill/scripts/designer-pipeline.cjs");
    fs.copyFileSync(path.join(evals, "film-benchmark.json"), path.join(dir, "manifest.json"));
    const run = spawnSync(process.execPath, [cli, "film-eval", "measure", "--root", dir, "--manifest", "manifest.json", "--runs", ".", "--output", "measurements.json"], { encoding: "utf8" });
    assert.equal(run.status, 0, run.stdout + run.stderr);
    assert.equal(load(path.join(dir, "measurements.json")).measurements.claude["repair-slideshow"].score, 1);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("a one-take subject animated by a chain of actions stays a subject, not an ambient target", () => {
  const boundaries = board().beats.slice(1).map((beat) => beat.startSec);
  const edges = [0, ...boundaries, 12];
  const tweens = [{ targets: ["#bg"], startSec: 0, durationSec: 12, props: ["x"] }];
  // One action per beat on the same element, each overlapping the next boundary slightly.
  for (let index = 0; index < edges.length - 1; index += 1) {
    const start = Math.max(0, edges[index] - 0.1);
    const end = Math.min(12, edges[index + 1] + 0.1);
    tweens.push({ targets: ["#hero"], startSec: start, durationSec: Number((end - start).toFixed(3)), props: ["x", "y", "rotation"] });
  }
  const result = checkTimeline({ schema: "design-pipeline.film-timeline.v1", compositionId: "main", durationSec: 12, tweens }, board());
  assert.deepEqual(result.metrics.ambientTargets, ["#bg"], "only the single long drift is ambient");
  assert.ok(!codes(result).includes("handoff-not-carried"), JSON.stringify(result.findings));
});

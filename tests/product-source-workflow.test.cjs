"use strict";

// Product-promo films (Stage 0 deliverableForm product-launch-video) in the film workflow: the bound
// job plan, the source admission stage, the owner-viewed sample and the gate inputs that bind the
// real product material. Admission runs for real; gate passes are recorded with the inputs the CLI
// verifiers bind, standing in for the verifiers themselves.

const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { bindStateJobPlan, decide, initState, nextAction, projectJobPlan, readState, recordGate } = require("../skill/scripts/workflow-core.cjs");
const { canonicalJson, sha256, sortValue } = require("../skill/scripts/contract-utils.cjs");
const { buildJobPlan, routeJob } = require("../skill/scripts/job-route-core.cjs");
const { productSourceFiles } = require("../skill/scripts/film-core.cjs");
const { scaffoldFilm } = require("../skill/scripts/film-project-core.cjs");
const { sampleBinding, stages } = require("../skill/scripts/workflows/film.cjs");
const { gateStatus } = require("../skill/scripts/workflows/shared.cjs");

const PRODUCT_QUERY = "制作产品宣传动画"; // Stage 0 classifies it as product-launch-video.
const MOTION_QUERY = "Create a kinetic typography video"; // ... and this as motion-graphics-video.
const COMMIT = "3fe612277df7e149fbb48c3bbe5fd30770052857";
const PRODUCT = { deliverableForm: "product-launch-video" };
const PRODUCT_STANDARD = ["intake", "source", "reference", "concepts", "plan", "sample", "build", "check", "review", "deliver"];
const EXAMPLE = JSON.parse(fs.readFileSync(path.join(__dirname, "../skill/references/film-choreography/storyboard.example.json"), "utf8"));
const BEAT_SOURCES = { "type-prompt": ["market"], "connect-edge": ["switch-3m"], "image-bloom": ["candles-63"], "into-storyboard": ["pinned"] };

function project(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "product-source-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}
const touch = (dir, rel, body = "x") => { fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true }); fs.writeFileSync(path.join(dir, rel), body); };
const hex = (dir, rel) => sha256(fs.readFileSync(path.join(dir, rel)));
const stateFile = dir => path.join(dir, ".design-pipeline/state.json");

// Only the media test below decodes a real sample.mp4 with ffmpeg/ffprobe, which CI runners lack
// (AGENTS.md); it and the tests that `cut()` real clips skip without them.
const hasFfmpeg = ["ffmpeg", "ffprobe"].every(bin => spawnSync(bin, ["-version"], { windowsHide: true }).status === 0);
const cuts = new Map();
// A real H.264 clip of the given length; `tag` changes its bytes, and the same arguments reproduce them.
// `audioSeconds` adds an AAC tone of that length, so the container can outlast the video stream.
function cutBytes(seconds, tag = "cut", audioSeconds = null) {
  const key = `${seconds}:${tag}:${audioSeconds}`;
  if (!cuts.has(key)) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sample-cut-"));
    try {
      const out = path.join(dir, "cut.mp4");
      const audio = audioSeconds === null ? [] : ["-f", "lavfi", "-i", `sine=frequency=440:duration=${audioSeconds}`, "-c:a", "aac"];
      const made = spawnSync("ffmpeg", ["-v", "error", "-f", "lavfi", "-i", `testsrc=size=160x90:rate=10:duration=${seconds}`, ...audio, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-fflags", "+bitexact", "-flags:v", "+bitexact", "-metadata", `comment=${tag}`, out], { encoding: "utf8", windowsHide: true });
      assert.equal(made.status, 0, made.stderr);
      cuts.set(key, fs.readFileSync(out));
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  }
  return cuts.get(key);
}
const cut = (dir, seconds, tag, audioSeconds) => { fs.writeFileSync(path.join(dir, "sample.mp4"), cutBytes(seconds, tag, audioSeconds)); };

// The walk exercises the sample stage with a stand-in for ffmpeg/ffprobe, so its verdict, hash,
// delivery and admission assertions run on runners without them. film-core binds `spawnSync` when it
// loads and the stage runs the bare `ffmpeg`/`ffprobe` names (CreateProcess cannot run a script
// there), so the workflow graph is loaded afresh while `child_process.spawnSync` answers those two
// names from the file's bytes; every other command goes to the real one. The shared module cache is
// restored afterwards, so no other test sees the stand-in. Real decoding stays with the media test.
// Like real ffprobe, the stand-in reports the video stream's own duration; a cut written with
// `streamDuration: false` reports only the container's, as a stream whose duration is N/A does.
const FAKE_CUT = "fake-mp4";
const fakeCut = (dir, seconds, tag, { streamDuration = true } = {}) => fs.writeFileSync(path.join(dir, "sample.mp4"), `${FAKE_CUT} duration=${seconds} tag=${tag}${streamDuration ? "" : " stream-duration=none"}`);
function workflowWithFakeMedia() {
  const childProcess = require("node:child_process");
  const scripts = path.resolve(__dirname, "../skill/scripts") + path.sep;
  const loaded = () => Object.keys(require.cache).filter(key => key.startsWith(scripts));
  const saved = loaded().map(key => [key, require.cache[key]]);
  for (const [key] of saved) delete require.cache[key];
  const realSpawnSync = childProcess.spawnSync, calls = [];
  childProcess.spawnSync = (bin, args, options) => {
    if (bin !== "ffmpeg" && bin !== "ffprobe") return realSpawnSync(bin, args, options);
    calls.push(bin);
    const file = bin === "ffprobe" ? args.at(-1) : args[args.indexOf("-i") + 1];
    const text = fs.readFileSync(file, "utf8");
    const seconds = text.startsWith(FAKE_CUT) ? /duration=([\d.]+)/.exec(text)?.[1] : null;
    if (!seconds) return { status: 1, stdout: "", stderr: `${file}: Invalid data found when processing input\n` };
    const video = { codec_type: "video", r_frame_rate: "10/1", ...(text.includes("stream-duration=none") ? {} : { duration: seconds }) };
    const stdout = bin === "ffprobe" ? JSON.stringify({ format: { duration: seconds }, streams: [video] }) : "";
    return { status: 0, stdout, stderr: "" };
  };
  try { return { ...require("../skill/scripts/workflow-core.cjs"), calls }; }
  finally {
    childProcess.spawnSync = realSpawnSync;
    for (const key of loaded()) delete require.cache[key];
    for (const [key, entry] of saved) require.cache[key] = entry;
  }
}
const ids = state => stages(state).map(stage => stage.id);
const codes = action => action.findings.map(finding => finding.code);

function writePlan(dir, query, rel = "job-plan.json") {
  const plan = buildJobPlan(routeJob({ query }));
  touch(dir, rel, canonicalJson(plan));
  return plan;
}

// A quick product promo bound to the job-plan.json it discovers.
function productFilm(t) {
  const dir = project(t);
  writePlan(dir, PRODUCT_QUERY);
  initState(dir, { deliverable: "film", tier: "quick" });
  return dir;
}

// A run log and captures on disk, recorded by path and sha256 the way the source stage asks.
function admittedSource(dir) {
  touch(dir, "source/run.log", `$ git -C product rev-parse HEAD\n${COMMIT}\n$ pnpm --dir ui dev --mode demo\nready on http://localhost:5173\n`);
  const captures = [
    ["market", "ui-state", "source/market.png", "Market tab, NVDA 1Y, 251 candles", "10:55:00"],
    ["switch-3m", "operation", "source/switch-3m.mp4", "user clicks 3M", "10:56:00"],
    ["candles-63", "ui-state", "source/candles-63.png", "chart redraws with 63 candles", "10:56:10"],
    ["pinned", "ui-state", "source/pinned.png", "3M range pinned on the watchlist", "10:56:30"],
  ].map(([id, kind, rel, shows, time]) => {
    touch(dir, rel, `capture ${id}`);
    return { id, kind, path: rel, sha256: hex(dir, rel), shows, capturedAt: `2026-09-19T${time}Z` };
  });
  return {
    status: "admitted",
    repository: "https://github.com/TraderAlice/OpenAlice",
    commit: COMMIT,
    run: { command: "pnpm --dir ui dev --mode demo", observedAt: "2026-09-19T10:54:00Z", log: { path: "source/run.log", sha256: hex(dir, "source/run.log") }, url: "http://localhost:5173" },
    captures,
    flow: { action: ["switch-3m"], response: ["candles-63"], result: ["pinned"] },
  };
}

// The scaffold's storyboard; with an admitted record its action beats are built from the captures.
function writeStoryboard(dir, productSource) {
  const board = structuredClone(EXAMPLE);
  if (productSource) board.productSource = productSource;
  if (productSource?.status === "admitted") board.beats = board.beats.map(beat => (BEAT_SOURCES[beat.id] ? { ...beat, source: BEAT_SOURCES[beat.id] } : beat));
  touch(dir, "storyboard.json", `${JSON.stringify(board, null, 2)}\n`);
  return board;
}

// Inputs exactly as the CLI verifiers record them: their checked files, then the admitted record's
// files and the bound job plan.
function evidence(dir) {
  const plan = projectJobPlan(dir);
  return [...productSourceFiles(JSON.parse(fs.readFileSync(path.join(dir, "storyboard.json"), "utf8"))), ...(plan?.jobPlanPath ? [plan.jobPlanPath] : [])];
}
const passStoryboard = dir => recordGate(dir, "storyboard", "passed", ["storyboard.json", ...(fs.existsSync(path.join(dir, "reference.md")) ? ["reference.md"] : []), ...evidence(dir)]);
const passFilm = dir => recordGate(dir, "film", "passed", ["storyboard.json", "out.mp4", ...["index.html", "timeline.json", "score-grid.json"].filter(file => fs.existsSync(path.join(dir, file))), ...evidence(dir)]);

test("product-promo films add source, and sample at standard and full; other films keep their stage ids", t => {
  for (const mode of ["brief"]) assert.deepEqual(ids({ tier: "quick", mode, jobPlan: PRODUCT }), ["source", "plan", "build", "check", "review"]);
  assert.deepEqual(ids({ tier: "quick", mode: "replicate", jobPlan: PRODUCT }), ["reference", "source", "plan", "build", "check", "review"]);
  for (const tier of ["standard", "full"]) {
    for (const mode of ["brief", "replicate"]) assert.deepEqual(ids({ tier, mode, jobPlan: PRODUCT }), PRODUCT_STANDARD);
  }
  for (const jobPlan of [undefined, { deliverableForm: "motion-graphics-video" }]) {
    assert.deepEqual(ids({ tier: "quick", mode: "brief", jobPlan }), ["plan", "build", "check", "review"]);
    assert.deepEqual(ids({ tier: "quick", mode: "replicate", jobPlan }), ["reference", "plan", "build", "check", "review"]);
    for (const tier of ["standard", "full"]) assert.deepEqual(ids({ tier, mode: "brief", jobPlan }), ["intake", "reference", "concepts", "plan", "build", "check", "review", "deliver"]);
  }
  // The same orders through a real bound plan.
  for (const [tier, mode, first, total] of [["quick", "brief", "source", 5], ["quick", "replicate", "reference", 6], ["standard", "brief", "intake", 10], ["full", "brief", "intake", 10]]) {
    const dir = project(t);
    writePlan(dir, PRODUCT_QUERY);
    initState(dir, { deliverable: "film", tier, mode });
    const next = nextAction(dir);
    assert.equal(next.stage, first, `${tier}/${mode}`);
    assert.equal(next.remaining, total, `${tier}/${mode}`);
  }
});

test("films without a product-launch-video plan keep their first actions and intake questions", t => {
  for (const [tier, mode, first] of [["quick", "brief", "plan"], ["quick", "replicate", "reference"], ["standard", "brief", "intake"], ["full", "brief", "intake"]]) {
    const plain = project(t), bound = project(t);
    initState(plain, { deliverable: "film", tier, mode });
    writePlan(bound, MOTION_QUERY);
    initState(bound, { deliverable: "film", tier, mode });
    assert.equal(readState(plain).jobPlan, undefined);
    assert.equal(readState(bound).jobPlan.deliverableForm, "motion-graphics-video");
    const action = nextAction(plain);
    assert.equal(action.stage, first, `${tier}/${mode}`);
    assert.equal(nextAction(bound).stage, first, `${tier}/${mode}`);
  }
});

test("a bound film's checks also bind its job plan, so a pass recorded before the binding reruns", t => {
  const plain = project(t), bound = project(t);
  writePlan(bound, MOTION_QUERY);
  for (const dir of [plain, bound]) {
    initState(dir, { deliverable: "film", tier: "quick" });
    touch(dir, "storyboard.json", "{}");
  }
  for (const dir of [plain, bound]) recordGate(dir, "storyboard", "passed", ["storyboard.json"]);
  assert.equal(nextAction(plain).stage, "build", "a film without a plan binds what it bound before");
  const stale = nextAction(bound);
  assert.equal(stale.stage, "plan");
  assert.equal(stale.verification.status, "stale");
  assert.deepEqual(stale.verification.findings.map(finding => [finding.code, finding.path]), [["workflow-input-unbound", "job-plan.json"]]);
  passStoryboard(bound);
  assert.equal(nextAction(bound).stage, "build");
  touch(bound, "out.mp4", "draft");
  passFilm(bound);
  decide(bound, { by: "owner", stage: "review", verdict: "accept", answer: "Looks right to me" });
  const done = nextAction(bound);
  assert.equal(done.type, "done");
  assert.equal(Object.hasOwn(done, "admission"), false, "only product promos report admission");
});

test("initState binds a named, absolute or discovered Stage 0 plan by its project-relative path", t => {
  const named = project(t);
  const plan = writePlan(named, PRODUCT_QUERY, "plans/promo.json");
  const binding = { jobId: plan.jobId, jobPlanSha256: plan.planSha256, jobPlanPath: "plans/promo.json", deliverableForm: "product-launch-video" };
  initState(named, { deliverable: "film", jobPlan: "plans/promo.json" });
  assert.deepEqual(readState(named).jobPlan, binding);
  assert.deepEqual(projectJobPlan(named), binding);
  initState(named, { deliverable: "film", jobPlan: path.join(named, "plans", "promo.json"), replace: true });
  assert.deepEqual(readState(named).jobPlan, binding, "an absolute path inside the project is recorded relative");

  const discovered = project(t);
  const found = writePlan(discovered, PRODUCT_QUERY);
  const foundBinding = { jobId: found.jobId, jobPlanSha256: found.planSha256, jobPlanPath: "job-plan.json", deliverableForm: "product-launch-video" };
  assert.deepEqual(projectJobPlan(discovered), foundBinding, "without state the project's job-plan.json is reported");
  initState(discovered, { deliverable: "film", tier: "quick" });
  assert.deepEqual(readState(discovered).jobPlan, foundBinding);
  assert.equal(nextAction(discovered).stage, "source");

  const none = project(t);
  assert.equal(projectJobPlan(none), null);
  initState(none, { deliverable: "film" });
  assert.equal(readState(none).jobPlan, undefined, "no plan, no binding");
  writePlan(none, PRODUCT_QUERY);
  assert.equal(projectJobPlan(none), null, "an existing film binds a later plan only through bindStateJobPlan");
  assert.equal(nextAction(none).stage, "intake");
});

test("initState rejects a plan for another deliverable and an invalid, missing or outside plan without writing state", t => {
  const web = project(t);
  writePlan(web, PRODUCT_QUERY);
  assert.throws(() => initState(web, { deliverable: "web", jobPlan: "job-plan.json" }), /a Stage 0 job plan binds a film, not a web project/);
  assert.equal(fs.existsSync(stateFile(web)), false);
  initState(web, { deliverable: "web", tier: "quick" });
  assert.equal(readState(web).jobPlan, undefined, "only a film discovers job-plan.json");

  const tampered = project(t);
  const plan = writePlan(tampered, PRODUCT_QUERY);
  touch(tampered, "job-plan.json", canonicalJson({ ...plan, query: MOTION_QUERY }));
  for (const options of [{ jobPlan: "job-plan.json" }, {}]) {
    assert.throws(() => initState(tampered, { deliverable: "film", ...options }), error => error.code === "CONTRACT_INVALID"
      && error.message.includes("the Stage 0 job plan job-plan.json is invalid: job plan hash does not match contents"));
    assert.equal(fs.existsSync(stateFile(tampered)), false);
  }

  const outside = project(t), elsewhere = project(t);
  writePlan(elsewhere, PRODUCT_QUERY);
  assert.throws(() => initState(outside, { deliverable: "film", jobPlan: path.join(elsewhere, "job-plan.json") }), /must stay inside|resolves outside/);
  assert.throws(() => initState(outside, { deliverable: "film", jobPlan: "missing.json" }), /does not exist/);
  assert.equal(fs.existsSync(stateFile(outside)), false);

  const replaced = project(t);
  initState(replaced, { deliverable: "film", tier: "quick" });
  const before = fs.readFileSync(stateFile(replaced));
  touch(replaced, "job-plan.json", "{ not json");
  assert.throws(() => initState(replaced, { deliverable: "film", replace: true }), /job-plan\.json is invalid: cannot parse/);
  assert.deepEqual(fs.readFileSync(stateFile(replaced)), before, "a failed replacement keeps the old state");
});

test("bindStateJobPlan rebinds an existing film, turning a legacy film into a product promo", t => {
  const dir = project(t);
  initState(dir, { deliverable: "film", tier: "quick" });
  assert.equal(nextAction(dir).stage, "plan");
  const plan = writePlan(dir, PRODUCT_QUERY, "plans/promo.json");
  const binding = bindStateJobPlan(dir, "plans/promo.json");
  assert.deepEqual(binding, { jobId: plan.jobId, jobPlanSha256: plan.planSha256, jobPlanPath: "plans/promo.json", deliverableForm: "product-launch-video" });
  assert.deepEqual(readState(dir).jobPlan, binding);
  const next = nextAction(dir);
  assert.equal(next.stage, "source");
  assert.equal(next.remaining, 5);
  writePlan(dir, MOTION_QUERY, "plans/motion.json");
  bindStateJobPlan(dir, "plans/motion.json");
  assert.equal(readState(dir).jobPlan.deliverableForm, "motion-graphics-video");
  assert.equal(nextAction(dir).stage, "plan", "a non-product plan restores the film stages");
  touch(dir, "plans/broken.json", "{}");
  const before = fs.readFileSync(stateFile(dir));
  assert.throws(() => bindStateJobPlan(dir, "plans/broken.json"), /plans\/broken\.json is invalid: unsupported job plan schema/);
  assert.deepEqual(fs.readFileSync(stateFile(dir)), before);

  const web = project(t);
  initState(web, { deliverable: "web", tier: "quick" });
  writePlan(web, PRODUCT_QUERY);
  assert.throws(() => bindStateJobPlan(web, "job-plan.json"), /binds a film, not a web project/);
  assert.equal(readState(web).jobPlan, undefined);
  const empty = project(t);
  writePlan(empty, PRODUCT_QUERY);
  assert.throws(() => bindStateJobPlan(empty, "job-plan.json"), error => error.code === "INPUT_MISSING");
  assert.equal(fs.existsSync(stateFile(empty)), false);
});

test("a stale Stage 0 binding throws JOB_PLAN_STALE from next, decide and projectJobPlan without writing state", t => {
  const stale = reason => error => error.code === "JOB_PLAN_STALE"
    && error.message.startsWith("workflow: the bound Stage 0 job plan job-plan.json is stale: ")
    && reason.test(error.message);
  // Hand-made and correctly hashed, but its stored form is no longer what Stage 0 classifies its
  // query as (a classifier change after it was bound).
  const reclassified = () => {
    const { planSha256, ...body } = buildJobPlan(routeJob({ query: MOTION_QUERY }));
    assert.ok(planSha256);
    body.deliverableForm = "product-launch-video";
    return sortValue({ ...body, planSha256: sha256(canonicalJson(body)) });
  };
  const cases = {
    "edited plan bytes": [dir => {
      const plan = JSON.parse(fs.readFileSync(path.join(dir, "job-plan.json"), "utf8"));
      touch(dir, "job-plan.json", canonicalJson({ ...plan, query: `${plan.query}，突出产品` }));
    }, /job plan hash does not match contents/],
    "deleted plan": [dir => fs.rmSync(path.join(dir, "job-plan.json")), /does not exist/],
    "another valid plan": [dir => writePlan(dir, "Make a product launch video for our app"), /jobPlanSha256 does not match the job plan/],
    "query classified as another form": [dir => {
      const plan = reclassified();
      touch(dir, "job-plan.json", canonicalJson(plan));
      const state = JSON.parse(fs.readFileSync(stateFile(dir), "utf8"));
      state.jobPlan = { jobId: plan.jobId, jobPlanSha256: plan.planSha256, jobPlanPath: "job-plan.json", deliverableForm: "product-launch-video" };
      fs.writeFileSync(stateFile(dir), `${JSON.stringify(state, null, 2)}\n`);
    }, /deliverable-form conflict/],
  };
  for (const [label, [change, reason]] of Object.entries(cases)) {
    const dir = project(t);
    writePlan(dir, PRODUCT_QUERY);
    initState(dir, { deliverable: "film", tier: "standard" });
    assert.equal(nextAction(dir).stage, "intake");
    change(dir);
    const before = fs.readFileSync(stateFile(dir));
    assert.throws(() => nextAction(dir), stale(reason), label);
    assert.throws(() => projectJobPlan(dir), stale(reason), label);
    assert.throws(() => decide(dir, { by: "owner", stage: "intake", answer: "default" }), stale(reason), label);
    assert.deepEqual(fs.readFileSync(stateFile(dir)), before, `${label}: nothing is written`);
    assert.equal(fs.existsSync(path.join(dir, "brief.md")), false, `${label}: nothing is written`);
  }
  // Without state, a stale job-plan.json fails when a film would bind it or a film gate reads it;
  // the start question stays open for every deliverable.
  const fresh = project(t);
  touch(fresh, "job-plan.json", canonicalJson(reclassified()));
  assert.equal(nextAction(fresh).stage, "start");
  assert.throws(() => projectJobPlan(fresh), stale(/deliverable-form conflict/));
  assert.throws(() => initState(fresh, { deliverable: "film" }), /job-plan\.json is invalid: deliverable-form conflict/);
  assert.equal(fs.existsSync(stateFile(fresh)), false);
});

test("the source stage returns admission findings, blocks on a blocked record and advances once admitted", t => {
  const dir = productFilm(t);
  let next = nextAction(dir);
  assert.equal(next.type, "run");
  assert.equal(next.stage, "source");
  assert.equal(next.guide, "references/workflow-film.md#source");
  assert.match(next.instruction, /^Run the command first, then: Source the real product: /);
  assert.match(next.instruction, /full commit SHA.*git -C <checkout> rev-parse HEAD.*one user operation/);
  assert.deepEqual(codes(next), ["product-source-missing"], "a card-only film has no product record");
  assert.ok(next.findings.every(finding => finding.fix));

  writeStoryboard(dir);
  next = nextAction(dir);
  assert.equal(next.command, undefined, "an existing storyboard is not scaffolded again");
  assert.match(next.instruction, /^Source the real product: /);
  assert.deepEqual(codes(next), ["product-source-missing"]);

  const source = admittedSource(dir);
  writeStoryboard(dir, { ...source, commit: undefined });
  next = nextAction(dir);
  assert.deepEqual(codes(next), ["product-source-invalid"]);
  assert.match(next.findings[0].message, /productSource is missing commit/);
  touch(dir, "storyboard.json", "{ not json");
  assert.deepEqual(codes(nextAction(dir)), ["product-source-invalid"]);

  writeStoryboard(dir, { ...source, captures: source.captures.map(capture => ({ ...capture, kind: "ui-state" })) });
  next = nextAction(dir);
  assert.equal(next.stage, "source", "an incomplete record keeps the source open");
  assert.deepEqual([...new Set(codes(next))], ["product-source-captures-incomplete"]);
  writeStoryboard(dir, source);
  touch(dir, "source/pinned.png", "a different picture");
  assert.deepEqual(codes(nextAction(dir)), ["product-source-file-changed"]);
  touch(dir, "source/pinned.png", "capture pinned");

  const blocker = { kind: "needs-credentials", reason: "The dashboard requires a live broker login.", needs: "A demo mode or seeded test account from the owner." };
  writeStoryboard(dir, { status: "blocked", repository: source.repository, blocker });
  // Recorded passes and a render cannot carry a blocked product past its source.
  recordGate(dir, "storyboard", "passed", ["storyboard.json", "job-plan.json"]);
  touch(dir, "out.mp4", "draft");
  recordGate(dir, "film", "passed", ["storyboard.json", "out.mp4", "job-plan.json"]);
  const before = fs.readFileSync(stateFile(dir));
  next = nextAction(dir);
  assert.equal(next.type, "blocked");
  assert.equal(next.stage, "source");
  assert.deepEqual(next.blocker, blocker);
  assert.equal(next.command, undefined);
  assert.ok(next.why && next.instruction);
  assert.deepEqual(next.completed, []);
  assert.equal(next.line, `film/quick: source (1/5) - blocked (needs-credentials): ${blocker.reason} Needs: ${blocker.needs}`);
  for (const options of [{ stage: "review", verdict: "accept" }, { stage: "review", verdict: "reject", answer: "Not the product." }, { stage: "deliver", answer: "out.mp4" }, { stage: "sample", verdict: "accept" }]) {
    assert.throws(() => decide(dir, { by: "owner", ...options }), error => error.code === "WORKFLOW_NOT_READY" && /while source is unfinished/.test(error.message), options.stage);
  }
  assert.deepEqual(fs.readFileSync(stateFile(dir)), before);
  assert.equal(nextAction(dir).type, "blocked", "a blocked product never advances");

  writeStoryboard(dir, source);
  next = nextAction(dir);
  assert.equal(next.stage, "plan");
  assert.deepEqual(next.completed, ["source"]);
  assert.match(next.instruction, /list the capture ids each beat shows in beats\[\]\.source/);
});

// The source stage scaffolds before the reference stage; the scaffold's empty reference.md
// template must not count as a studied reference, or `next` skips straight to concepts.
test("a standard product promo scaffolded at source still asks for its reference", t => {
  const dir = project(t);
  writePlan(dir, PRODUCT_QUERY);
  initState(dir, { deliverable: "film", tier: "standard" });
  decide(dir, { by: "owner", stage: "intake", answer: "default" });
  assert.match(nextAction(dir).instruction, /^Run the command first, then: /);
  scaffoldFilm(dir);
  assert.ok(fs.existsSync(path.join(dir, "reference.md")), "the scaffold writes the reference template");
  writeStoryboard(dir, admittedSource(dir));
  let next = nextAction(dir);
  assert.equal(next.stage, "reference", "an unfilled template is not a reference study");
  assert.deepEqual(next.completed, ["intake", "source"]);
  touch(dir, "reference.md", fs.readFileSync(path.join(dir, "reference.md"), "utf8").replace(/\n/g, "\r\n"));
  assert.equal(nextAction(dir).stage, "reference", "a CRLF copy of the template is still unfilled");

  touch(dir, "reference.md", "# Reference\n\n- Primary moving reference: product walkthrough, 0:00-0:12, one continuous take.\n");
  next = nextAction(dir);
  assert.equal(next.stage, "concepts");
  assert.deepEqual(next.completed, ["intake", "source", "reference"]);
});

test("changed product material, or a pass recorded without it, reopens plan and check through their bound inputs", t => {
  const dir = productFilm(t);
  const source = admittedSource(dir);
  const board = writeStoryboard(dir, source);
  const bound = [...productSourceFiles(board), "job-plan.json"];
  recordGate(dir, "storyboard", "passed", ["storyboard.json"]);
  let next = nextAction(dir);
  assert.equal(next.stage, "plan");
  assert.equal(next.verification.status, "stale");
  assert.deepEqual(next.verification.findings.map(finding => [finding.code, finding.path]).sort(), bound.map(file => ["workflow-input-unbound", file]).sort());
  passStoryboard(dir);
  next = nextAction(dir);
  assert.equal(next.stage, "build");
  assert.match(next.instruction, /^Build from the admitted captures each beat cites in beats\[\]\.source/);
  touch(dir, "out.mp4", "draft");
  passFilm(dir);
  assert.equal(nextAction(dir).stage, "review");

  // Recaptured: new bytes with their recorded sha256.
  touch(dir, "source/market.png", "market recaptured");
  writeStoryboard(dir, { ...source, captures: source.captures.map(capture => (capture.id === "market" ? { ...capture, sha256: hex(dir, "source/market.png") } : capture)) });
  next = nextAction(dir);
  assert.equal(next.stage, "plan");
  assert.equal(next.verification.gate, "storyboard");
  assert.equal(next.verification.status, "stale");
  assert.ok(next.verification.findings.some(finding => finding.code === "workflow-input-changed" && finding.path === "source/market.png"));
  passStoryboard(dir);
  next = nextAction(dir);
  assert.equal(next.stage, "check");
  assert.equal(next.verification.gate, "film");
  assert.ok(next.verification.findings.some(finding => finding.code === "workflow-input-changed" && finding.path === "source/market.png"));
  passFilm(dir);
  assert.equal(nextAction(dir).stage, "review");

  // Bytes that no longer match the record stop at the source again.
  touch(dir, "source/run.log", "edited log");
  next = nextAction(dir);
  assert.equal(next.stage, "source");
  assert.ok(codes(next).includes("product-source-file-changed"));
});

test("a standard product promo walks source and an owner-viewed sample to done with its admission", t => {
  const { decide, nextAction, calls } = workflowWithFakeMedia();
  const dir = project(t);
  writePlan(dir, PRODUCT_QUERY);
  initState(dir, { deliverable: "film", tier: "standard", director: "claude-opus-5-5" });
  let next = nextAction(dir);
  assert.equal(next.stage, "intake");
  assert.equal(next.remaining, 10);
  const assets = next.questions.find(question => question.id === "assets");
  assert.match(assets.ask, /product's repository.*run/);
  assert.equal(assets.recommended, "The product's own repository, run at a pinned commit; its real UI is captured — nothing invented.");
  decide(dir, { by: "owner", stage: "intake", answer: "default" });
  assert.equal(nextAction(dir).stage, "source");
  const source = admittedSource(dir);
  const board = writeStoryboard(dir, source);
  assert.equal(nextAction(dir).stage, "reference");
  decide(dir, { by: "owner", stage: "reference", answer: "none" });
  touch(dir, "concepts.md");
  assert.match(nextAction(dir).director, /claude-opus-5-5/);
  decide(dir, { by: "owner", stage: "concept", choice: "1" });
  next = nextAction(dir);
  assert.equal(next.stage, "plan");
  assert.match(next.instruction, /beats\[\]\.source/);
  assert.match(next.instruction, /only a pure brand card, a brand-hold with transformation none, may stay unsourced, within a quarter of the film/);
  assert.throws(() => decide(dir, { by: "owner", stage: "sample", verdict: "accept" }), error => error.code === "WORKFLOW_NOT_READY");
  passStoryboard(dir);

  next = nextAction(dir);
  assert.equal(next.stage, "sample");
  assert.equal(next.type, "run");
  assert.equal(next.guide, "references/workflow-film.md#sample");
  assert.match(next.instruction, /5–8 s sample from the real captures cited in beats\[\]\.source/);
  assert.match(next.instruction, /sample\.mp4 at the project root/);
  let before = fs.readFileSync(stateFile(dir));
  assert.throws(() => decide(dir, { by: "owner", stage: "sample", verdict: "accept" }), error => error.code === "INPUT_MISSING");
  assert.deepEqual(fs.readFileSync(stateFile(dir)), before);

  fakeCut(dir, 6, "first cut");
  next = nextAction(dir);
  assert.equal(next.type, "ask");
  assert.equal(next.first, undefined);
  assert.match(next.director, /claude-opus-5-5/, "art director mode applies to the sample");
  assert.deepEqual(next.show, ["sample.mp4", ...source.captures.map(capture => capture.path)].map(rel => path.join(dir, rel)));
  assert.throws(() => decide(dir, { by: "owner", stage: "sample", verdict: "reject" }), /--answer must say in one sentence what is wrong with the sample/);
  const rejection = "The chart is cropped off at the right edge.";
  const rejected = decide(dir, { by: "owner", stage: "sample", verdict: "reject", answer: rejection });
  assert.equal(rejected.next.stage, "sample");
  assert.equal(rejected.next.type, "ask");
  assert.ok(rejected.next.first.includes(`rejected this exact sample.mp4 ("${rejection}")`), "the rejected cut is recut before asking again");
  assert.match(rejected.next.line, /^film\/standard: sample \(6\/10\) - The owner rejected/);
  assert.deepEqual(rejected.next.rules, [`sample: ${rejection}`], "a sample rule is labelled with the sample");
  assert.deepEqual(readState(dir).rules.map(({ text, from, scope, object }) => ({ text, from, scope, object })), [{ text: rejection, from: "sample 1", scope: "object", object: { stage: "sample" } }]);

  fakeCut(dir, 6, "second cut");
  assert.equal(nextAction(dir).first, undefined, "a new cut is asked about afresh");
  decide(dir, { by: "owner", stage: "sample", verdict: "accept" });
  const samples = readState(dir).decisions.samples;
  assert.deepEqual(samples.map(sample => sample.verdict), ["reject", "accept"]);
  assert.equal(samples[1].sha256, `sha256:${hex(dir, "sample.mp4")}`);
  assert.equal(samples[1].sourceSha256, `sha256:${sha256(canonicalJson(board.productSource))}`);
  next = nextAction(dir);
  assert.equal(next.stage, "build");
  assert.match(next.instruction, /admitted captures each beat cites in beats\[\]\.source/);

  fakeCut(dir, 6, "third cut");
  assert.equal(nextAction(dir).stage, "sample", "a changed sample asks again");
  fakeCut(dir, 6, "second cut");
  assert.equal(nextAction(dir).stage, "build", "the accepted bytes are accepted");

  // A changed product record reopens plan, then the sample cut from the old record.
  writeStoryboard(dir, { ...source, captures: source.captures.map(capture => (capture.id === "pinned" ? { ...capture, shows: "3M range pinned on the watchlist after reload" } : capture)) });
  assert.equal(nextAction(dir).stage, "plan");
  passStoryboard(dir);
  next = nextAction(dir);
  assert.equal(next.stage, "sample");
  assert.equal(next.type, "ask");
  before = fs.readFileSync(stateFile(dir));
  decide(dir, { by: "owner", stage: "sample", verdict: "accept" });
  assert.notDeepEqual(fs.readFileSync(stateFile(dir)), before);

  touch(dir, "out.mp4", "draft");
  assert.equal(nextAction(dir).stage, "check");
  passFilm(dir);
  next = nextAction(dir);
  assert.equal(next.stage, "review");
  assert.equal(next.director, undefined, "final acceptance stays with the owner; it is never routed to the art director");
  decide(dir, { by: "owner", stage: "review", verdict: "accept", answer: "Looks right to me" });
  assert.equal(nextAction(dir).stage, "deliver");
  touch(dir, "final.mp4", "final");
  decide(dir, { by: "owner", stage: "deliver", answer: "final.mp4" });
  const done = nextAction(dir);
  assert.equal(done.type, "done");
  assert.deepEqual(done.completed, PRODUCT_STANDARD);
  assert.deepEqual(done.admission, { required: true, status: "admitted", form: "product-launch-video", repository: source.repository, commit: COMMIT });
  assert.ok(calls.includes("ffprobe") && calls.includes("ffmpeg"), "the sample stage inspected the cuts through the stand-in");
});

test("a sample whose video stream reports no duration is not measured by its container", t => {
  const { decide, nextAction } = workflowWithFakeMedia();
  const dir = project(t);
  writePlan(dir, PRODUCT_QUERY);
  initState(dir, { deliverable: "film", tier: "standard" });
  decide(dir, { by: "owner", stage: "intake", answer: "default" });
  writeStoryboard(dir, admittedSource(dir));
  decide(dir, { by: "owner", stage: "reference", answer: "none" });
  touch(dir, "concepts.md");
  decide(dir, { by: "owner", stage: "concept", choice: "1" });
  passStoryboard(dir);

  // The container reports 6 s, but that may be a longer audio track over a short cut.
  fakeCut(dir, 6, "no stream duration", { streamDuration: false });
  const next = nextAction(dir);
  assert.equal(next.stage, "sample");
  assert.equal(next.type, "run", "the owner is not asked");
  assert.deepEqual(codes(next), ["sample-duration-unknown"]);
  assert.match(next.findings[0].message, /video stream of sample\.mp4 reports no duration/);
  assert.match(next.findings[0].fix, /Recut sample\.mp4 .* 5–8 s/);
  const before = fs.readFileSync(stateFile(dir));
  assert.throws(() => decide(dir, { by: "owner", stage: "sample", verdict: "accept" }), error => error.code === "SAMPLE_INVALID");
  assert.deepEqual(fs.readFileSync(stateFile(dir)), before, "no verdict is recorded");

  fakeCut(dir, 6, "stream duration");
  assert.equal(nextAction(dir).type, "ask");
});

test("the owner is shown sample.mp4 only when it decodes and runs 5–8 s", { skip: !hasFfmpeg }, t => {
  const dir = project(t);
  writePlan(dir, PRODUCT_QUERY);
  initState(dir, { deliverable: "film", tier: "standard" });
  decide(dir, { by: "owner", stage: "intake", answer: "default" });
  writeStoryboard(dir, admittedSource(dir));
  decide(dir, { by: "owner", stage: "reference", answer: "none" });
  touch(dir, "concepts.md");
  decide(dir, { by: "owner", stage: "concept", choice: "1" });
  passStoryboard(dir);
  assert.equal(nextAction(dir).stage, "sample");

  const truncated = cutBytes(7, "truncated");
  const refused = [
    ["sample-not-video", () => touch(dir, "sample.mp4", "not a video at all")],
    ["sample-not-video", () => { fs.writeFileSync(path.join(dir, "sample.mp4"), truncated.subarray(0, Math.floor(truncated.length * 0.6))); }],
    ["sample-duration", () => cut(dir, 1)],
    ["sample-duration", () => cut(dir, 30)],
    // The video stream runs 4 s; a longer audio track stretches the container to 6.5 s.
    ["sample-duration", () => cut(dir, 4, "cut", 6.5)],
  ];
  for (const [code, write] of refused) {
    write();
    const next = nextAction(dir);
    assert.equal(next.stage, "sample");
    assert.equal(next.type, "run", `${code}: the owner is not asked`);
    assert.deepEqual(codes(next), [code]);
    assert.match(next.findings[0].fix, /Recut sample\.mp4 .* 5–8 s/);
    assert.equal(next.command, undefined);
    assert.ok(next.instruction.startsWith(next.findings[0].fix));
    const before = fs.readFileSync(stateFile(dir));
    assert.throws(() => decide(dir, { by: "owner", stage: "sample", verdict: "accept" }), error => error.code === "SAMPLE_INVALID");
    assert.deepEqual(fs.readFileSync(stateFile(dir)), before, "no verdict is recorded");
  }

  // The video stream decides the length: 6 s of video passes under a 9 s audio track.
  cut(dir, 6, "cut", 9);
  assert.equal(nextAction(dir).type, "ask");

  cut(dir, 7.64);
  assert.equal(nextAction(dir).type, "ask");
  decide(dir, { by: "owner", stage: "sample", verdict: "accept" });
  assert.equal(nextAction(dir).stage, "build");

  // A verdict recorded before this check on an off-length file no longer finishes the stage.
  cut(dir, 30);
  const state = readState(dir);
  state.decisions.samples = [{ verdict: "accept", reason: null, at: "2026-10-10T00:00:00.000Z", ...sampleBinding(dir) }];
  fs.writeFileSync(stateFile(dir), JSON.stringify(state));
  assert.deepEqual(codes(nextAction(dir)), ["sample-duration"]);
});

test("a recorded blocked check reports blocked rather than incomplete", t => {
  const dir = productFilm(t);
  writeStoryboard(dir, admittedSource(dir));
  const finding = { code: "product-source-blocked", severity: "error", message: "the product could not be sourced", fix: "Resolve the named blocker with the user." };
  recordGate(dir, "storyboard", "blocked", ["storyboard.json"], { findings: [finding] });
  const next = nextAction(dir);
  assert.equal(next.stage, "plan");
  assert.equal(next.type, "run");
  assert.equal(next.verification.status, "blocked");
  assert.equal(next.verification.recordedStatus, "blocked");
  assert.deepEqual(next.verification.findings, [finding]);
  assert.match(next.line, /^film\/quick: plan \(2\/5\) - Author storyboard\.json/);
  for (const [status, expected] of [["failed", "failed"], ["blocked", "blocked"], ["skipped", "incomplete"], [undefined, "incomplete"]]) {
    assert.equal(gateStatus({ gates: status ? { film: { status } } : {} }, dir, "film").status, expected, String(status));
  }
});

// Needs the source and sample sections of references/workflow-film.md.
test("every product-promo stage names a section of the film guide", () => {
  const guide = fs.readFileSync(path.join(__dirname, "../skill/references/workflow-film.md"), "utf8");
  for (const tier of ["quick", "standard", "full"]) {
    for (const mode of ["brief", "replicate"]) {
      for (const id of ids({ tier, mode, jobPlan: PRODUCT })) assert.match(guide, new RegExp(`^## ${id}$`, "m"), `workflow-film.md lacks ## ${id}`);
    }
  }
});

test("the generic workflow's reference check decides unfilled templates without loading the film core", (t) => {
  const dir = project(t);
  const run = () => JSON.parse(require("node:child_process").execFileSync(process.execPath, ["-e", `
    const { reference } = require(${JSON.stringify(path.join(__dirname, "../skill/scripts/workflows/shared.cjs"))});
    const observed = reference("study").finished({ mode: "brief", decisions: {} }, ${JSON.stringify(dir)});
    console.log(JSON.stringify({ observed, film: Object.keys(require.cache).filter(file => /film-project-core\\.cjs$/.test(file)) }));
  `], { encoding: "utf8" }));
  fs.writeFileSync(path.join(dir, "reference.md"), scaffoldNote("reference.md"));
  assert.deepEqual(run(), { observed: false, film: [] });
  fs.writeFileSync(path.join(dir, "reference.md"), "# Reference\n\n- Primary moving reference: https://example.com/clip\n");
  assert.deepEqual(run(), { observed: true, film: [] });
});

function scaffoldNote(name) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "scaffold-note-"));
  try {
    scaffoldFilm(dir, {});
    return fs.readFileSync(path.join(dir, name), "utf8");
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

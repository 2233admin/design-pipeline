"use strict";

// CERE-515: a product-promo film (Stage 0 form product-launch-video) is evaluated only after its
// storyboard's real product source is admitted. Admission is a precondition, not a weighted finding.

const assert = require("node:assert/strict");
const test = require("node:test");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { checkStoryboard, evaluateFilmRender, productSourceFiles } = require("../skill/scripts/film-core.cjs");
const { checkTimeline } = require("../skill/scripts/film-timeline-core.cjs");
const { checkFilmProject, scaffoldFilm } = require("../skill/scripts/film-project-core.cjs");
const { evaluateFilmRuns } = require("../skill/scripts/film-eval-core.cjs");
const { evaluateBenchmark } = require("../skill/scripts/benchmark-core.cjs");
const { buildJobPlan, routeJob } = require("../skill/scripts/job-route-core.cjs");

const cli = path.join(__dirname, "../skill/scripts/designer-pipeline.cjs");
const example = () => JSON.parse(fs.readFileSync(path.join(__dirname, "../skill/references/film-choreography/storyboard.example.json"), "utf8"));
const codes = (result) => result.findings.map((finding) => finding.code);
const sha = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "product-source-"));
// The rejected CERE-515 brief: a fictional product's promo. Stage 0 classifies it as a product promo.
const TERN_QUERY = "制作一支 Tern 产品宣传动画（product animation / product launch video）：20秒无声、1280x720、30fps，Tern是虚构的软件团队交接工具";
const COMMIT = "3fe612277df7e149fbb48c3bbe5fd30770052857";
const PROMO = { deliverableForm: "product-launch-video" };

function put(root, rel, body) {
  fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
  fs.writeFileSync(path.join(root, rel), body);
  return sha(Buffer.from(body));
}

// A real-material record: a run log that shows the pinned commit, UI-state and operation captures
// taken after the run started, and an action -> response -> result flow.
function sourceFiles(root) {
  const captures = [
    ["prompt-typed", "ui-state", "source/captures/prompt-typed.png", "prompt node with typed text"],
    ["edge-drag", "operation", "source/captures/edge-drag.mp4", "user drags an edge from the prompt to a new image node"],
    ["image-rendered", "ui-state", "source/captures/image-rendered.png", "image node shows the generated picture"],
    ["strip-frame", "ui-state", "source/captures/strip-frame.png", "storyboard strip holds the image as frame 3"],
  ].map(([id, kind, rel, shows], index) => ({ id, kind, path: rel, sha256: put(root, rel, `captured bytes of ${id}`), shows, capturedAt: `2026-09-19T10:5${5 + index}:00Z` }));
  return {
    status: "admitted",
    repository: "https://github.com/example-org/canvas-app",
    commit: COMMIT,
    run: { command: "pnpm install && pnpm dev --mode demo", observedAt: "2026-09-19T10:54:00Z", log: { path: "source/run.log", sha256: put(root, "source/run.log", `$ git -C checkout rev-parse HEAD\n${COMMIT}\n$ pnpm dev --mode demo\nready on http://localhost:5173\n`) }, url: "http://localhost:5173" },
    captures,
    flow: { action: ["edge-drag"], response: ["image-rendered"], result: ["strip-frame"] },
  };
}

function sourcedBoard(root) {
  const board = example();
  board.productSource = sourceFiles(root);
  const mapping = { "type-prompt": ["prompt-typed"], "connect-edge": ["edge-drag"], "image-bloom": ["image-rendered"], "into-storyboard": ["strip-frame"] };
  for (const beat of board.beats) if (mapping[beat.id]) beat.source = mapping[beat.id];
  return board;
}

function writeBoard(root, board) {
  fs.writeFileSync(path.join(root, "storyboard.json"), `${JSON.stringify(board, null, 2)}\n`);
}

const blockedSource = () => ({ status: "blocked", blocker: { kind: "no-repository", reason: "Tern is a fictional product; no repository exists to run or capture.", needs: "the real product's repository, or a different brief" } });

function runCli(root, ...args) {
  const child = spawnSync(process.execPath, [cli, ...args, "--root", root, "--json"], { encoding: "utf8", windowsHide: true });
  return { status: child.status, output: child.stdout ? JSON.parse(child.stdout) : null, stderr: child.stderr };
}

test("a card-only product-promo storyboard fails admission whatever its other checks say", () => {
  const plan = buildJobPlan(routeJob({ query: TERN_QUERY }));
  assert.equal(plan.deliverableForm, "product-launch-video", "the rejected Tern brief is a product promo for Stage 0");
  const board = example();
  const generic = checkStoryboard(board);
  assert.equal(generic.status, "passed", "the same cards pass every structural check");
  const promo = checkStoryboard(board, { deliverableForm: plan.deliverableForm, projectRoot: tmp() });
  assert.equal(promo.status, "failed");
  assert.deepEqual(codes(promo), ["product-source-missing"], "only the admission contract speaks; nothing else is evaluated");
  assert.match(promo.findings[0].message, /storyboard\.json\.productSource/);
  assert.match(promo.findings[0].fix, /blocked/);
  assert.deepEqual(promo.admission, { required: true, status: "failed", form: "product-launch-video" });
  assert.equal(promo.metrics, null, "no structure or rhythm metric can offset the missing product source");
  assert.equal(promo.creativeAcceptance, "not-assessed");
});

test("every required productSource field and value is a contract, not a score", () => {
  const root = tmp();
  try {
    const removals = [
      [(s) => delete s.repository, /productSource is missing repository/],
      [(s) => delete s.commit, /productSource is missing commit/],
      [(s) => delete s.run, /productSource is missing run/],
      [(s) => delete s.captures, /productSource is missing captures/],
      [(s) => delete s.flow, /productSource is missing flow/],
      [(s) => delete s.run.command, /productSource\.run is missing command/],
      [(s) => delete s.run.observedAt, /productSource\.run is missing observedAt/],
      [(s) => delete s.run.log, /productSource\.run is missing log/],
      [(s) => delete s.run.log.sha256, /productSource\.run\.log is missing sha256/],
      ...["id", "kind", "path", "sha256", "shows", "capturedAt"].map((key) => [(s) => delete s.captures[1][key], new RegExp(`productSource\\.captures\\[1\\] is missing ${key}`)]),
      ...["action", "response", "result"].map((step) => [(s) => delete s.flow[step], new RegExp(`productSource\\.flow is missing ${step}`)]),
    ];
    const invalid = [
      [(s) => { s.commit = "3fe6122"; }, /full 40- or 64-character/],
      [(s) => { s.commit = "main"; }, /not a branch, tag or short SHA/],
      [(s) => { s.repository = "D:/openalice"; }, /not a local path/],
      [(s) => { s.repository = "https://user:token@github.com/org/repo"; }, /must not contain credentials/],
      [(s) => { s.repository = "https://github.com/"; }, /must name the repository/],
      [(s) => { s.captures[0].path = "source/mock.html"; }, /image or video capture/],
      [(s) => { s.captures[0].path = "../outside.png"; }, /project-relative path/],
      [(s) => { s.captures[0].kind = "card"; }, /kind has invalid value card/],
      [(s) => { s.captures[0].capturedAt = "yesterday"; }, /ISO 8601/],
      [(s) => { s.captures[0].sha256 = "abc"; }, /SHA-256 hex digest/],
      [(s) => { s.flow.response = ["invented-screen"]; }, /references unknown capture invented-screen/],
      [(s) => { s.status = "pending"; }, /status has invalid value pending/],
      [(s) => { s.blocker = { kind: "run-failed", reason: "r", needs: "n" }; }, /only allowed when status is blocked/],
      [(s) => { s.status = "blocked"; s.blocker = { kind: "run-failed", reason: "r", needs: "n" }; }, /must not carry run/],
    ];
    for (const [mutate, message] of [...removals, ...invalid]) {
      const board = sourcedBoard(root);
      mutate(board.productSource);
      assert.throws(() => checkStoryboard(board, { ...PROMO, projectRoot: root }), message, String(message));
    }
    const unknown = sourcedBoard(root);
    unknown.beats[0].source = ["made-up-card"];
    assert.throws(() => checkStoryboard(unknown, { ...PROMO, projectRoot: root }), /beats\[0\]\.source references unknown capture made-up-card/);
    const orphan = example();
    orphan.beats[0].source = ["prompt-typed"];
    assert.throws(() => checkStoryboard(orphan), /no admitted productSource records it/);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("a pinned-commit run with captures and a complete shot mapping is admitted and then evaluated", () => {
  const root = tmp();
  try {
    const board = sourcedBoard(root);
    const result = checkStoryboard(board, { ...PROMO, projectRoot: root });
    assert.equal(result.status, "passed", JSON.stringify(result.findings));
    assert.deepEqual(result.admission, { required: true, status: "admitted", form: "product-launch-video", repository: "https://github.com/example-org/canvas-app", commit: COMMIT });
    assert.ok(result.metrics && result.metrics.actionBeats === 4, "an admitted promo is evaluated by the existing checks");
    assert.deepEqual(productSourceFiles(board), ["source/run.log", "source/captures/prompt-typed.png", "source/captures/edge-drag.mp4", "source/captures/image-rendered.png", "source/captures/strip-frame.png"]);
    board.beats[1].transformation = { kind: "none" };
    assert.deepEqual(codes(checkStoryboard(board, { ...PROMO, projectRoot: root })), ["transformation-missing"], "after admission the ordinary gate findings still apply");
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("admission rejects missing, changed or unpinned material and shots that do not use it", () => {
  const root = tmp();
  try {
    const cases = [
      ["product-source-file-missing", (board) => fs.rmSync(path.join(root, board.productSource.captures[2].path))],
      ["product-source-file-changed", (board) => fs.writeFileSync(path.join(root, board.productSource.captures[0].path), "a different screenshot")],
      ["product-source-run-unpinned", (board) => { board.productSource.run.log.sha256 = put(root, "source/run.log", "ready on http://localhost:5173\n"); }],
      ["product-source-captures-incomplete", (board) => { board.productSource.captures[1].kind = "ui-state"; }],
      ["product-source-time-order", (board) => { board.productSource.captures[0].capturedAt = "2026-09-19T09:00:00Z"; }],
      ["product-source-time-order", (board) => { board.productSource.captures[3].capturedAt = "2026-09-19T10:55:30Z"; }],
      ["shot-source-missing", (board) => { delete board.beats[0].source; }],
      ["flow-unshown", (board) => { board.beats[3].source = ["prompt-typed"]; }],
      ["source-share-low", (board) => {
        board.beats[0].source = ["edge-drag", "image-rendered"];
        board.beats[1].source = ["strip-frame"];
        for (const beat of board.beats.slice(2, 4)) { beat.role = "title-hold"; delete beat.source; }
      }],
    ];
    for (const [code, mutate] of cases) {
      const board = sourcedBoard(root);
      mutate(board);
      const result = checkStoryboard(board, { ...PROMO, projectRoot: root });
      assert.equal(result.status, "failed", code);
      assert.equal(result.admission.status, "failed", code);
      assert.ok(codes(result).includes(code), `${code}: ${JSON.stringify(codes(result))}`);
      assert.ok(result.findings.every((finding) => finding.severity === "error" && finding.fix), code);
      assert.equal(result.metrics, null, code);
    }
    assert.throws(() => checkStoryboard(sourcedBoard(root), PROMO), /needs the project root/);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

// Review bypasses of a8ec651: half real captures plus invented result cards, a result only a
// title-hold claims, flow steps shown out of order, and capture times that only look ordered.
test("half real captures plus invented result and benefit cards is not admitted", () => {
  const root = tmp();
  try {
    const board = sourcedBoard(root);
    board.beats[0].source = ["edge-drag"];
    board.beats[1].source = ["image-rendered", "strip-frame"];
    board.beats[1].endSec = 6;
    board.beats[2].startSec = 6;
    const cards = [
      [board.beats[2], "card-result", "Ready for review card", "an invented 'Ready for review' result card"],
      [board.beats[3], "card-benefit", "Saves hours card", "an invented benefit card"],
    ];
    for (const [beat, id, to, productAction] of cards) {
      Object.assign(beat, { id, role: "title-hold", productAction, transformation: { kind: "reveal-in-context", from: "empty card", to } });
      delete beat.source;
    }
    const result = checkStoryboard(board, { ...PROMO, projectRoot: root });
    assert.equal(result.status, "failed", "50% real captures must not admit invented result cards");
    assert.equal(result.admission.status, "failed");
    const missing = result.findings.filter((finding) => finding.code === "shot-source-missing").map((finding) => finding.beatId);
    assert.deepEqual(missing, ["card-result", "card-benefit"]);
    assert.match(result.findings.find((finding) => finding.beatId === "card-result").message, /title-hold card-result presents copy or a product claim without real product material/);
    // A pure brand card (brand-hold that changes nothing) may stay unsourced, within a quarter of the film.
    assert.equal(checkStoryboard(sourcedBoard(root), { ...PROMO, projectRoot: root }).status, "passed");
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("each flow step is shown by an action beat citing its capture, in order", () => {
  const root = tmp();
  try {
    const titleResult = sourcedBoard(root);
    Object.assign(titleResult.beats[3], { role: "title-hold", source: ["strip-frame"] });
    titleResult.beats[2].source = ["image-rendered"];
    const claimed = checkStoryboard(titleResult, { ...PROMO, projectRoot: root });
    assert.equal(claimed.status, "failed");
    assert.ok(claimed.findings.some((finding) => finding.code === "flow-unshown" && /flow result/.test(finding.message)), JSON.stringify(claimed.findings));

    const reversed = sourcedBoard(root);
    reversed.beats[0].source = ["strip-frame"];
    reversed.beats[3].source = ["prompt-typed"];
    const outOfOrder = checkStoryboard(reversed, { ...PROMO, projectRoot: root });
    assert.equal(outOfOrder.status, "failed");
    assert.deepEqual(codes(outOfOrder), ["flow-out-of-order"]);

    const continuous = sourcedBoard(root);
    continuous.beats[1].source = ["edge-drag", "image-rendered", "strip-frame"];
    continuous.beats[2].source = ["prompt-typed"];
    continuous.beats[3].source = ["prompt-typed"];
    assert.equal(checkStoryboard(continuous, { ...PROMO, projectRoot: root }).status, "passed", "one continuous beat may carry the whole flow");
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("every capture of a flow step precedes every capture of the next step", () => {
  const root = tmp();
  try {
    const board = sourcedBoard(root);
    const at = (id, time) => { board.productSource.captures.find((capture) => capture.id === id).capturedAt = time; };
    at("prompt-typed", "2026-09-19T10:55:10Z");
    at("edge-drag", "2026-09-19T10:55:30Z");
    at("image-rendered", "2026-09-19T10:55:20Z");
    at("strip-frame", "2026-09-19T10:55:40Z");
    board.productSource.flow.action = ["prompt-typed", "edge-drag"];
    const result = checkStoryboard(board, { ...PROMO, projectRoot: root });
    assert.equal(result.status, "failed", "action [10s, 30s], response [20s], result [40s] is not an ordered flow");
    assert.deepEqual(codes(result), ["product-source-time-order"]);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("a declared-unrunnable product is blocked, never passed, at every evaluation surface", () => {
  const root = tmp();
  try {
    scaffoldFilm(root);
    const board = example();
    board.productSource = blockedSource();
    writeBoard(root, board);
    const storyboard = checkStoryboard(board, { ...PROMO, projectRoot: root });
    assert.equal(storyboard.status, "blocked");
    assert.deepEqual(codes(storyboard), ["product-source-blocked"]);
    assert.match(storyboard.findings[0].message, /no-repository.*fictional product.*Needs: the real product's repository/);
    assert.equal(storyboard.admission.status, "blocked");
    fs.writeFileSync(path.join(root, "out.mp4"), "not probed: evaluation stops at admission");
    const check = checkFilmProject(root, { deliverableForm: "product-launch-video" });
    assert.equal(check.status, "blocked");
    assert.deepEqual(check.steps.map((step) => step.gate), ["storyboard"], "timeline, render, audio and composition were not evaluated");
    assert.match(check.next, /resolve the blocker with the user/);
    assert.equal(evaluateFilmRender(board, path.join(root, "out.mp4"), { ...PROMO, projectRoot: root }).status, "blocked");
    // A declared productSource is always checked, even without a Stage 0 plan: blocked exits 2.
    const blocked = runCli(root, "verify", "film-storyboard", "--storyboard", "storyboard.json");
    assert.equal(blocked.status, 2, blocked.stderr || JSON.stringify(blocked.output));
    assert.equal(blocked.output.status, "blocked");
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("film check, timeline and render evidence evaluate nothing for a card-only product promo", () => {
  const root = tmp();
  try {
    scaffoldFilm(root);
    const timeline = { schema: "design-pipeline.film-timeline.v1", compositionId: "main", durationSec: 12, tweens: [] };
    fs.writeFileSync(path.join(root, "timeline.json"), JSON.stringify(timeline));
    fs.writeFileSync(path.join(root, "out.mp4"), "not probed: evaluation stops at admission");
    const check = checkFilmProject(root, { deliverableForm: "product-launch-video" });
    assert.equal(check.status, "failed");
    assert.deepEqual(check.steps.map((step) => step.gate), ["storyboard"]);
    assert.deepEqual(check.fixes.map((fix) => fix.code), ["product-source-missing"]);
    assert.equal(check.admission.status, "failed");
    const board = example();
    const timelineResult = checkTimeline(timeline, board, { ...PROMO, projectRoot: root });
    assert.equal(timelineResult.status, "failed");
    assert.deepEqual(timelineResult.findings, []);
    assert.equal(timelineResult.metrics, null);
    const render = evaluateFilmRender(board, path.join(root, "out.mp4"), { ...PROMO, projectRoot: root });
    assert.equal(render.status, "failed");
    assert.match(render.limits, /Not evaluated/);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("film-eval leaves non-admitted product-promo runs unmeasured instead of scoring them", () => {
  const runs = tmp();
  try {
    const manifest = {
      schema: "design-pipeline.benchmark-manifest.v2", id: "promo-admission", candidateSystem: "cards", systems: ["cards", "fiction", "real"],
      systemChannels: { cards: "stable", fiction: "stable", real: "stable" },
      fairness: { samePrompts: true, sameEnvironmentClass: true, evaluatorBlind: true, expectedAnswersHidden: true, freshContext: true, representativeDelivery: true },
      requiredDimensions: ["motion"],
      scenarios: [
        { id: "tern", operation: "generate", dimension: "motion", required: true, threshold: 0.3, evidenceType: "film-gates", prompt: TERN_QUERY, privateExpectations: ["real product material"] },
        { id: "type-study", operation: "generate", dimension: "motion", required: true, threshold: 0.3, evidenceType: "film-gates", prompt: "Create a kinetic typography video about rhythm", privateExpectations: ["structure"] },
      ],
    };
    const timeline = JSON.stringify({ schema: "design-pipeline.film-timeline.v1", compositionId: "main", durationSec: 12, tweens: [] });
    for (const scenario of ["tern", "type-study"]) {
      const cards = path.join(runs, "cards", scenario);
      fs.mkdirSync(cards, { recursive: true });
      writeBoard(cards, example());
      fs.writeFileSync(path.join(cards, "timeline.json"), timeline);
    }
    const fiction = path.join(runs, "fiction", "tern");
    fs.mkdirSync(fiction, { recursive: true });
    writeBoard(fiction, { ...example(), productSource: blockedSource() });
    const real = path.join(runs, "real", "tern");
    fs.mkdirSync(real, { recursive: true });
    writeBoard(real, sourcedBoard(real));

    const { measurements, admission } = evaluateFilmRuns(manifest, runs);
    assert.equal(measurements.measurements.cards.tern, undefined, "card-only promo is not admitted to evaluation");
    assert.equal(typeof measurements.measurements.cards["type-study"].score, "number", "the same cards are still measured where no product promo is asked");
    assert.ok(measurements.measurements.cards["type-study"].score > 0);
    assert.deepEqual(admission.cards.tern.findings.map((finding) => finding.code), ["product-source-missing"]);
    assert.equal(admission.cards.tern.status, "failed");
    assert.equal(measurements.measurements.fiction.tern, undefined);
    assert.equal(admission.fiction.tern.status, "blocked");
    assert.equal(admission.real.tern.status, "admitted");
    assert.ok(measurements.measurements.real.tern.evidence.some((line) => line.startsWith("admission: admitted (https://github.com/example-org/canvas-app @ ")));
    assert.ok(measurements.measurements.real.tern.score > 0, "an admitted promo is scored by the existing gates");
    assert.deepEqual(Object.keys(measurements), ["schema", "benchmarkId", "measurements"], "the measurements document keeps the v2 shape");

    const result = evaluateBenchmark(manifest, measurements);
    assert.equal(result.status, "blocked", "unmeasured product promos block the benchmark rather than scoring 0");
    for (const id of ["cards/tern", "fiction/tern"]) assert.ok(result.unknownRequired.includes(id), id);
    assert.equal(result.systems.find((entry) => entry.system === "cards").scenarios.find((entry) => entry.id === "tern").score, null);

    fs.writeFileSync(path.join(runs, "manifest.json"), JSON.stringify(manifest));
    const measured = runCli(runs, "film-eval", "measure", "--manifest", "manifest.json", "--runs", ".", "--output", "measurements.json");
    assert.equal(measured.status, 0, measured.stderr);
    assert.equal(measured.output.admission.cards.tern.status, "failed");
    assert.deepEqual(Object.keys(JSON.parse(fs.readFileSync(path.join(runs, "measurements.json"), "utf8"))), ["schema", "benchmarkId", "measurements"]);
  } finally { fs.rmSync(runs, { recursive: true, force: true }); }
});

test("non-product films keep their gate results and output shape", () => {
  const board = example();
  const baseline = checkStoryboard(board);
  for (const deliverableForm of [undefined, "motion-graphics-video", "ui-motion", "interactive-page"]) {
    const result = checkStoryboard(board, { deliverableForm, projectRoot: tmp() });
    assert.deepEqual(result, baseline, String(deliverableForm));
    assert.equal("admission" in result, false);
  }
  const root = tmp();
  try {
    scaffoldFilm(root);
    const check = checkFilmProject(root, { deliverableForm: "motion-graphics-video" });
    assert.equal("admission" in check, false);
    assert.ok(check.steps.some((step) => step.gate === "timeline"), "non-product films run every applicable gate");
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("public CLI rejects a card-only product promo, blocks fiction and admits the real product", () => {
  const root = tmp();
  try {
    const routed = runCli(root, "route", "--query", TERN_QUERY, "--write", "--output", "job-plan.json");
    assert.equal(routed.status, 0, routed.stderr);
    assert.equal(routed.output.deliverableForm, "product-launch-video");
    const started = runCli(root, "next", "--deliverable", "film", "--tier", "quick", "--job-plan", "job-plan.json");
    assert.equal(started.status, 0, started.stderr);
    assert.equal(started.output.stage, "source", "a product promo starts by sourcing the real product");
    assert.equal(runCli(root, "film", "scaffold", "--output", ".").status, 0);

    const cards = runCli(root, "verify", "film-storyboard", "--storyboard", "storyboard.json");
    assert.equal(cards.status, 2, "card-only promo fails the existing storyboard gate");
    assert.deepEqual(codes(cards.output), ["product-source-missing"]);

    const fiction = example();
    fiction.productSource = blockedSource();
    writeBoard(root, fiction);
    const blocked = runCli(root, "next");
    assert.equal(blocked.status, 2, "blocked exits 2");
    assert.equal(blocked.output.type, "blocked");
    assert.equal(blocked.output.stage, "source");
    assert.equal(blocked.output.blocker.kind, "no-repository");
    const premature = runCli(root, "decide", "--stage", "review", "--verdict", "accept");
    assert.equal(premature.status, 1, "a blocked product promo cannot reach review");

    writeBoard(root, sourcedBoard(root));
    const plan = runCli(root, "next");
    assert.equal(plan.status, 0, plan.stderr);
    assert.equal(plan.output.stage, "plan", "an admitted record ends the source stage");
    const admitted = runCli(root, "verify", "film-storyboard", "--storyboard", "storyboard.json");
    assert.equal(admitted.status, 0, JSON.stringify(admitted.output?.findings));
    assert.equal(admitted.output.admission.status, "admitted");
    assert.equal(runCli(root, "next").output.stage, "build");

    // A changed capture is changed upstream evidence: the recorded pass reopens.
    fs.writeFileSync(path.join(root, "source/captures/image-rendered.png"), "re-captured with different pixels");
    const reopened = runCli(root, "next");
    assert.equal(reopened.output.stage, "source", "the record no longer matches its capture");
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

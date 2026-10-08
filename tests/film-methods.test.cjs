"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const vm = require("node:vm");
const { spawnSync } = require("node:child_process");
const test = require("node:test");
const { prepareFilmMethods } = require("../skill/tools/film-methods/prepare.cjs");
const { scaffoldFilm } = require("../skill/scripts/film-project-core.cjs");
const { sha256 } = require("../skill/scripts/contract-utils.cjs");

const repo = path.resolve(__dirname, "..");
const sourceMotion = path.join(repo, "skill/vendor/cinetic/upstream/skills/cinetic/assets/hyperframes-starter/motion.js");
const sourceLibrary = path.join(repo, "skill/vendor/cinetic/upstream/skills/cinetic/assets/library/techniques.json");
const cli = path.join(repo, "skill/scripts/designer-pipeline.cjs");
function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "film-methods-"));
  const project = path.join(root, "film");
  scaffoldFilm(project, { template: "motion-study" });
  fs.writeFileSync(path.join(root, "Product.html"), '<button style="color:orange">保存偏好</button>');
  const request = { task: "product-film", methods: ["cinetic", "product-film"], concept: "An actual preference becomes its saved product state.",
    brand: [{ file: "Product.html", note: "The orange and Chinese labels belong to this product." }],
    components: [{ file: "Product.html", mode: "frame-twin", reason: "Drive the observed button states from the film clock." }],
    techniques: ["cam-isolating-push"] };
  return { root, project, request, clean: () => fs.rmSync(root, { recursive: true, force: true }) };
}

test("explicit film methods retain real source identity and return the selected full recipe without writing", () => {
  const f = fixture();
  try {
    const result = prepareFilmMethods(f.project, f.request, { root: f.root });
    const sourceBytes = fs.readFileSync(path.join(f.root, "Product.html"));
    assert.equal(result.brand[0].sha256, sha256(sourceBytes));
    assert.equal(result.components[0].sha256, sha256(sourceBytes));
    assert.equal(result.components[0].mode, "frame-twin");
    assert.deepEqual(result.techniques, [JSON.parse(fs.readFileSync(sourceLibrary)).techniques.find((item) => item.id === "cam-isolating-push")]);
    assert.equal(result.sources[0].revision, "bee5d7807205d5543472c38312507f9bf366cbbf");
    assert.equal(result.sources[1].revision, "fe11efc429d5903e37274d0b294e1b95745b2881");
    assert.equal(result.fps, 30);
    assert.equal(result.creativeAcceptance, "not-assessed");
    assert.equal(fs.existsSync(path.join(f.project, "film-methods.md")), false);
    fs.writeFileSync(path.join(f.root, "Product.html"), "A changed real component.");
    assert.notEqual(prepareFilmMethods(f.project, f.request, { root: f.root }).components[0].sha256, result.components[0].sha256);
  } finally { f.clean(); }
});

test("UI/CSS and missing or escaping product sources cannot silently enter a film plan", () => {
  const f = fixture();
  try {
    for (const task of ["ui", "css", "web"]) assert.throws(() => prepareFilmMethods(f.project, { ...f.request, task }, { root: f.root }), /task has invalid value/);
    assert.throws(() => prepareFilmMethods(f.project, { ...f.request, components: [] }, { root: f.root }), /real component sources/);
    assert.throws(() => prepareFilmMethods(f.project, { ...f.request, brand: [] }, { root: f.root }), /inspected brand/);
    assert.throws(() => prepareFilmMethods(f.project, { ...f.request, brand: [{ file: "missing.css", note: "missing" }] }, { root: f.root }), /does not exist/);
    assert.throws(() => prepareFilmMethods(f.project, { ...f.request, components: [{ ...f.request.components[0], file: "../outside.css" }] }, { root: f.root }), /must stay inside/);
    assert.throws(() => prepareFilmMethods(f.project, { ...f.request, components: [{ ...f.request.components[0], file: "film" }] }, { root: f.root }), /regular file/);
    assert.throws(() => prepareFilmMethods(f.project, { ...f.request, techniques: ["invented-technique"] }, { root: f.root }), /unknown technique/);
    assert.throws(() => prepareFilmMethods(f.project, { ...f.request, methods: ["cinetic", "cinetic"] }, { root: f.root }), /unique/);
    assert.throws(() => prepareFilmMethods(f.project, { ...f.request, methods: ["product-film"] }, { root: f.root }), /explicit cinetic/);
    assert.throws(() => prepareFilmMethods(f.project, { ...f.request, brand: "fabricated" }, { root: f.root }), /brand must be an array/);
    assert.equal(fs.existsSync(path.join(f.project, "film-methods.md")), false);
  } finally { f.clean(); }
});

test("method preparation invokes the existing storyboard check and never accepts its failed plan", () => {
  const f = fixture();
  try {
    const file = path.join(f.project, "storyboard.json");
    const board = JSON.parse(fs.readFileSync(file));
    board.beats[0].transformation = { kind: "none" };
    fs.writeFileSync(file, JSON.stringify(board));
    assert.throws(() => prepareFilmMethods(f.project, f.request, { root: f.root, write: true }), (error) => error.code === "STORYBOARD_FAILED" && error.details.result.findings.some((finding) => finding.code === "transformation-missing"));
    fs.writeFileSync(path.join(f.root, "plan.json"), JSON.stringify(f.request));
    const run = spawnSync(process.execPath, [cli, "film", "methods", "--root", f.root, "--project-root", "film", "--input", "plan.json", "--write", "--json"], { encoding: "utf8" });
    assert.equal(run.status, 2, run.stdout + run.stderr);
    assert.equal(JSON.parse(run.stdout).status, "failed");
    assert.ok(JSON.parse(run.stdout).findings.some((finding) => finding.code === "transformation-missing"));
    assert.equal(fs.existsSync(path.join(f.project, "lib/film-motion.js")), false);
  } finally { f.clean(); }
});

test("same-length tampering of consumed source bytes fails in an isolated package before writing", () => {
  const f = fixture();
  try {
    const isolated = path.join(f.root, "isolated");
    const sourceFiles = ["LICENSE", "skills/cinetic/SKILL.md", "skills/cinetic/assets/library/techniques.json", "skills/cinetic/assets/hyperframes-starter/motion.js"];
    const files = ["skill/tools/film-methods/prepare.cjs", "skill/scripts/contract-utils.cjs", "skill/scripts/film-core.cjs", "skill/scripts/film-hints.cjs", "skill/references/film-choreography/registry.json", "skill/vendor/cinetic/manifest.json", ...sourceFiles.map((file) => `skill/vendor/cinetic/upstream/${file}`)];
    for (const file of files) {
      fs.mkdirSync(path.dirname(path.join(isolated, file)), { recursive: true });
      fs.copyFileSync(path.join(repo, file), path.join(isolated, file));
    }
    const isolatedPrepare = require(path.join(isolated, "skill/tools/film-methods/prepare.cjs")).prepareFilmMethods;
    const request = { ...f.request, methods: ["cinetic"] };
    for (const file of sourceFiles) {
      const target = path.join(isolated, "skill/vendor/cinetic/upstream", file);
      const original = fs.readFileSync(target);
      const altered = Buffer.from(original);
      altered[0] ^= 1;
      fs.writeFileSync(target, altered);
      assert.throws(() => isolatedPrepare(f.project, request, { root: f.root, write: true }), (error) => error.code === "SOURCE_CHANGED", file);
      assert.equal(fs.existsSync(path.join(f.project, "film-methods.md")), false);
      fs.writeFileSync(target, original);
    }
  } finally { f.clean(); }
});

test("written method assets preserve original bytes and notes while the installed adapter works at 24/30/60 fps", () => {
  const f = fixture();
  try {
    const board = fs.readFileSync(path.join(f.project, "storyboard.json"));
    fs.writeFileSync(path.join(f.project, "qa.md"), "Actual review remains pending.\n");
    const result = prepareFilmMethods(f.project, f.request, { root: f.root, write: true });
    assert.equal(result.files.length, 4);
    assert.deepEqual(fs.readFileSync(path.join(f.project, "lib/cinetic-motion-source.js")), fs.readFileSync(sourceMotion));
    assert.deepEqual(fs.readFileSync(path.join(f.project, "lib/cinetic-LICENSE")), fs.readFileSync(path.join(repo, "skill/vendor/cinetic/upstream/LICENSE")));
    assert.deepEqual(fs.readFileSync(path.join(f.project, "storyboard.json")), board);
    assert.equal(fs.readFileSync(path.join(f.project, "qa.md"), "utf8"), "Actual review remains pending.\n");
    const { create } = require(path.join(f.project, "lib/film-motion.js"));
    const upstream = require(sourceMotion);
    for (const fps of [24, 30, 60]) {
      const motion = create({ fps, bpm: 120 });
      assert.equal(motion.b(2), fps * 2);
      assert.equal(motion.at(2), 2);
      assert.equal(motion.sec(fps), 1);
      assert.equal(motion.E.ui(0.5), upstream.E.ui(0.5));
      const spring = motion.spring(motion.SPR.firm);
      assert.equal(spring.durF, spring.dur * fps);
      assert.equal(spring.ease(0), 0);
      assert.equal(spring.ease(1), 1);
      assert.ok(Math.abs(1 - spring.x(spring.dur)) < 0.001);
      assert.ok(spring.ease(0.25) < spring.ease(0.75));
      const peak = motion.peak(0, fps, motion.E.ui);
      assert.ok(peak > 0 && peak < fps);
      assert.ok(Math.abs(motion.E.ui((fps - motion.startFor(fps, fps, motion.E.ui)) / fps) - 0.97) < 1e-6);
    }
    for (const options of [{}, { fps: 0 }, { fps: 30.5 }, { fps: 30, bpm: -120 }]) assert.throws(() => create(options), /positive/);
    assert.throws(() => create({ fps: 30 }).spring(undefined, 0), /epsilon/);
    for (const config of [{ stiffness: Infinity }, { damping: NaN }, { mass: -1 }, { response: Infinity }, { response: 0.4, dampingFraction: NaN }, null, []]) {
      assert.throws(() => create({ fps: 30 }).spring(config), /spring/);
      assert.throws(() => create({ fps: 30 }).springFn(config), /spring/);
    }
    assert.ok(Number.isFinite(create({ fps: 30 }).spring({ response: 0.4, dampingFraction: 0.8 }).ease(0.5)));
    assert.throws(() => create({ fps: 30 }).spring({ response: 30, dampingFraction: 1 }), /20-second/);
    const context = vm.createContext({ window: {} });
    vm.runInContext(fs.readFileSync(sourceMotion, "utf8"), context);
    vm.runInContext(fs.readFileSync(path.join(f.project, "lib/film-motion.js"), "utf8"), context);
    const browserMotion = context.window.FilmMotion.create({ fps: 30, bpm: 90 });
    const browserSpring = browserMotion.spring();
    const first = [0, 0.2, 0.7, 1].map(browserSpring.ease);
    for (const t of [1, 0.7, 0.2, 0]) browserSpring.ease(t);
    assert.deepEqual([0, 0.2, 0.7, 1].map(browserSpring.ease), first, "cold and reordered seeks agree without a frame accumulator");
    assert.equal(browserMotion.b(2), 80);
    assert.throws(() => prepareFilmMethods(f.project, f.request, { root: f.root, write: true }), /refusing to overwrite/);
    prepareFilmMethods(f.project, f.request, { root: f.root, write: true, replace: true });
    assert.equal(fs.readFileSync(path.join(f.project, "qa.md"), "utf8"), "Actual review remains pending.\n");
  } finally { f.clean(); }
});

test("a conflicting output type fails before method notes or any runtime asset is written", () => {
  const f = fixture();
  try {
    fs.rmSync(path.join(f.project, "lib"), { recursive: true });
    fs.writeFileSync(path.join(f.project, "lib"), "This existing user file must survive.");
    assert.throws(() => prepareFilmMethods(f.project, f.request, { root: f.root, write: true, replace: true }), /parent is not a directory/);
    assert.equal(fs.existsSync(path.join(f.project, "film-methods.md")), false);
    assert.equal(fs.readFileSync(path.join(f.project, "lib"), "utf8"), "This existing user file must survive.");
  } finally { f.clean(); }
});

test("CLI writes consumable assets only for an explicit valid request and preserves all required files on overwrite failure", () => {
  const f = fixture();
  try {
    const input = path.join(f.root, "plan.json");
    fs.writeFileSync(input, JSON.stringify(f.request));
    const args = [cli, "film", "methods", "--root", f.root, "--project-root", "film", "--input", "plan.json", "--write", "--json"];
    const run = spawnSync(process.execPath, args, { encoding: "utf8" });
    assert.equal(run.status, 0, run.stdout + run.stderr);
    assert.equal(JSON.parse(run.stdout).files.length, 4);
    const previous = fs.readFileSync(path.join(f.project, "lib/film-motion.js"));
    const again = spawnSync(process.execPath, args, { encoding: "utf8" });
    assert.equal(again.status, 1);
    assert.deepEqual(fs.readFileSync(path.join(f.project, "lib/film-motion.js")), previous);
    fs.writeFileSync(input, JSON.stringify({ ...f.request, task: "css" }));
    const ui = spawnSync(process.execPath, args, { encoding: "utf8" });
    assert.equal(ui.status, 1);
    assert.match(ui.stdout, /task has invalid value/);
  } finally { f.clean(); }
});

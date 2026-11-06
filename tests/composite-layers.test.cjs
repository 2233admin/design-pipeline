"use strict";

// #311: generated character art joins a template's layers. Task sheets from the layer contract,
// intake of an image model's output against its sheet, the GrabCut cut with defringe and the sticker
// outline, `materials composite` (every declared size, grade, shadows, occluder, safe areas,
// lineage), and the browser check that treats a ground layer as the text's ground. All fixtures are
// tiny synthetic images drawn here; no museum or generated image is committed.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { after, test } = require("node:test");
const { decodePng, encodePng } = require("../skill/scripts/png-core.cjs");
const { cutCollage } = require("../skill/tools/art-motion/assets.cjs");
const matte = require("../skill/tools/art-motion/matte.cjs");
const raster = require("../skill/tools/art-motion/raster.cjs");
const compositor = require("../skill/tools/art-motion/composite.cjs");
const layers = require("../skill/tools/template-bank/layers.cjs");
const bank = require("../skill/tools/template-bank/bank.cjs");
const materials = require("../skill/scripts/material-core.cjs");
const { execute } = require("../skill/scripts/cli-core.cjs");

const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "composite-layers-"));
after(() => fs.rmSync(temporary, { recursive: true, force: true }));
const cli = (args) => { const result = execute([...args, "--json"]); return { ...result.output, exitCode: result.exitCode }; };
let projects = 0;
const project = () => { const dir = path.join(temporary, `p${projects += 1}`); fs.mkdirSync(path.join(dir, "materials"), { recursive: true }); return dir; };

function canvas(width, height, colour) {
  const data = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) data.set([...colour(x, y), 255], (y * width + x) * 4);
  return { width, height, data };
}
// A standing figure on a dark studio gradient: head darker than the backdrop's lower part (the
// stand-in's failure case for the border and paper references), blue jacket, brown trousers.
const head = (x, y) => ((x - 60) / 18) ** 2 + ((y - 30) / 20) ** 2 < 1;
const body = (x, y) => ((x - 60) / 30) ** 2 + ((y - 95) / 60) ** 2 < 1;
const inFigure = (x, y) => head(x, y) || body(x, y);
function figureOnGradient() {
  return canvas(120, 170, (x, y) => {
    if (head(x, y)) return [70, 52, 40];
    if (body(x, y)) return y < 100 ? [50, 95, 150] : [120, 95, 60];
    const v = Math.round(55 + 70 * (y / 170) + 20 * (x / 120));
    return [v, v, v];
  });
}

test("max-flow and GrabCut separate a figure the border reference cannot, and defringe cuts the halo", () => {
  const graph = new matte.Graph(3, 2);
  graph.addTWeights(0, 9, 0); graph.addTWeights(2, 0, 9); graph.addEdge(0, 1, 4, 4); graph.addEdge(1, 2, 3, 3);
  assert.equal(graph.maxflow(), 3);
  assert.ok(graph.isSource(0) && graph.isSource(1) && !graph.isSource(2));

  const input = encodePng(figureOnGradient());
  const border = cutCollage(input, { mode: "border", params: { threshold: 14 } });
  let figurePx = 0;
  for (let y = 0; y < 170; y += 1) for (let x = 0; x < 120; x += 1) if (inFigure(x, y)) figurePx += 1;
  // the border reference keeps backdrop as foreground (the stand-in kept 85% of its frame)
  assert.ok(border.measurements.foregroundFraction > (figurePx / (120 * 170)) * 1.15, `border: ${border.measurements.foregroundFraction}`);
  const cut = cutCollage(input, { mode: "grabcut", finishes: ["cut", "outline"], params: { workPx: 120 } });
  const piece = cut.outputs.find((o) => o.finish === "cut");
  let hit = 0, truth = 0, extra = 0;
  for (let y = 0; y < 170; y += 1) for (let x = 0; x < 120; x += 1) {
    const px = x - piece.placement.x, py = y - piece.placement.y;
    const a = px >= 0 && py >= 0 && px < piece.image.width && py < piece.image.height ? piece.image.data[(py * piece.image.width + px) * 4 + 3] : 0;
    if (inFigure(x, y)) { truth += 1; if (a > 128) hit += 1; } else if (a > 128) extra += 1;
  }
  // (the 1 px choke of defringe costs a few percent on a figure this small)
  assert.ok(hit / truth > 0.94 && extra / truth < 0.05, JSON.stringify({ recall: hit / truth, extra: extra / truth }));
  const { before, after: defringed } = cut.measurements.edge;
  assert.ok(defringed.contaminatedFractionOfBand < before.contaminatedFractionOfBand, JSON.stringify(cut.measurements.edge));
  // the outline finish: black line around a white die-cut edge, padded
  const outline = cut.outputs.find((o) => o.finish === "outline");
  assert.ok(outline.image.width > piece.image.width && outline.padPx > 0);
  assert.throws(() => cutCollage(input, { mode: "border", params: { workPx: 200 } }), /grabcut only/);
  assert.throws(() => cutCollage(input, { mode: "none", finishes: ["outline"] }), /no matte/);
});

test("a layer contract keeps the character between the scene and the type, and the type last", () => {
  const manifest = bank.loadManifest("kv.tape-hero");
  const palette = Object.fromEntries(Object.entries(manifest.palette).map(([role, spec]) => [role, spec.value]));
  const contract = JSON.parse(JSON.stringify(manifest.layers));
  assert.equal(layers.validateContract(contract, { id: "x", palette }), contract);
  const swap = JSON.parse(JSON.stringify(contract));
  swap.stack.push(swap.stack.splice(swap.stack.findIndex((l) => l.role === "type"), 1)[0]);
  swap.stack.splice(swap.stack.length - 1, 0, swap.stack.splice(0, 1)[0]);
  assert.throws(() => layers.validateContract(swap, { id: "x", palette }), /above the character|after the type/);
  const afterType = JSON.parse(JSON.stringify(contract));
  afterType.stack.push({ id: "late", role: "fx" });
  assert.throws(() => layers.validateContract(afterType, { id: "x", palette }), /always painted last/);
  const rim = JSON.parse(JSON.stringify(contract));
  rim.char.light.rimColour = "neon";
  assert.throws(() => layers.validateContract(rim, { id: "x", palette }), /rimColour must be a palette role/);
  assert.throws(() => compositor.validateIntegration({ mode: "glossy", modes: {} }, { palette }), /sticker or painted/);
  // the default render marks the scene slot as the ground layer
  assert.match(bank.render("kv.tape-hero").svg, /data-slot="scene" data-kind="image"[^>]*data-layer="ground"/);
});

test("materials request writes a task sheet from the contract and refuses existing characters", () => {
  const root = project(), base = ["--root", root, "--project-root", "."];
  const sheet = cli(["materials", "request", ...base, "--template", "kv.tape-hero", "--subject", "Original character: a night-shift laundromat clerk", "--tool", "codex", "--name", "clerk"]);
  assert.equal(sheet.exitCode, 0, JSON.stringify(sheet));
  assert.equal(sheet.sheet.minFigureHeightPx, 2600, "2x the 1300 px vertical slot");
  assert.match(sheet.sheet.background.fallback, /flat solid #[0-9A-F]{6}/);
  const md = fs.readFileSync(path.join(root, "materials", "requests", "clerk.md"), "utf8");
  for (const needle of [/Original characters only - never an existing work's character/, /No text of any kind/, /key light from the upper left/, /#D4FF00/, /References: /, /920x430 occluder:fg-boombox/, /--kind generated --tool codex --prompt materials\/requests\/clerk\.md/]) assert.match(md, needle);
  const task = JSON.parse(fs.readFileSync(path.join(root, "materials", "requests", "clerk.json"), "utf8"));
  assert.equal(task.schema, layers.TASK_SCHEMA);
  assert.deepEqual(task.frameBreak, ["bottom"]);
  for (const subject of ["fan art of a famous mascot", "a cosplay of a game character", "同人立绘"]) {
    const refused = cli(["materials", "request", ...base, "--template", "kv.tape-hero", "--subject", subject, "--name", "nope"]);
    assert.equal(refused.exitCode, 2, subject);
    assert.equal(refused.status, "refused");
    assert.match(refused.fix, /original character/);
  }
  assert.equal(fs.existsSync(path.join(root, "materials", "requests", "nope.md")), false);
  const noContract = cli(["materials", "request", ...base, "--template", "kv.tape-cut-carousel"]);
  assert.match(noContract.error.message, /no layer contract.*kv\.tape-hero/);
  assert.match(cli(["materials", "request", ...base, "--template", "kv.tape-hero", "--layer", "type"]).error.message, /type stays live text/);
});

test("a generated image is recorded against its task sheet; check needs the sheet unchanged", () => {
  const root = project(), base = ["--root", root, "--project-root", "."], dir = path.join(root, "materials");
  cli(["materials", "request", ...base, "--template", "kv.tape-hero", "--name", "fig"]);
  fs.mkdirSync(path.join(dir, "generated"));
  fs.writeFileSync(path.join(dir, "generated", "fig.png"), encodePng(figureOnGradient()));
  const add = ["materials", "add", ...base, "--file", "materials/generated/fig.png", "--kind", "generated", "--license", "tool-output-terms", "--by", "Owner"];
  assert.equal(cli(add).error.code, "OPTION_REQUIRED");
  assert.equal(cli([...add, "--tool", "codex", "--prompt", "materials/generated/fig.png"]).error.code, "TASK_SHEET_MISSING");
  assert.equal(cli(["materials", "add", ...base, "--file", "materials/generated/fig.png", "--license", "x", "--by", "y", "--tool", "codex"]).error.code, "OPTION_VALUE_INVALID");
  const landmarks = JSON.stringify({ foot: [60, 155], headTop: 10, face: [44, 12, 76, 48], hands: [[28, 90, 40, 104]] });
  assert.match(cli([...add, "--tool", "codex", "--prompt", "materials/requests/fig.md", "--landmarks", '{"face":[0,0,500,10]}']).error.message, /inside the 120x170 image/);
  const recorded = cli([...add, "--tool", "codex", "--prompt", "materials/requests/fig.md", "--landmarks", landmarks]);
  assert.equal(recorded.status, "recorded", JSON.stringify(recorded));
  assert.equal(recorded.record.source, "image-model:codex");
  assert.equal(recorded.record.generatedBy.task.template, "kv.tape-hero");
  assert.equal(cli(["materials", "check", ...base]).status, "passed");
  // the cut piece carries the landmarks in its own pixels
  const cut = cli(["materials", "cut", ...base, "--file", "materials/generated/fig.png", "--mode", "grabcut", "--params", '{"workPx":120}']);
  assert.equal(cut.exitCode, 0, JSON.stringify(cut));
  const piece = materials.readRecords(dir)["cut/fig/piece-0.png"];
  assert.deepEqual(piece.landmarks.face, [44 - piece.derivedFrom.placement.x, 12 - piece.derivedFrom.placement.y, 76 - piece.derivedFrom.placement.x, 48 - piece.derivedFrom.placement.y]);
  assert.ok(piece.derivedFrom.matte && piece.derivedFrom.matte.haloWidthPx >= 0);
  fs.appendFileSync(path.join(dir, "requests", "fig.md"), "\nedited\n");
  assert.ok(cli(["materials", "check", ...base]).findings.some((f) => f.code === "material-task-changed" && /re-record/.test(f.fix)));
  fs.rmSync(path.join(dir, "requests"), { recursive: true });
  assert.ok(cli(["materials", "check", ...base]).findings.some((f) => f.code === "material-task-missing" && /materials request/.test(f.fix)));
});

// Tiny plates and sprites for kv.tape-hero: flat light street, a dark lower band, a fg block.
function heroProject() {
  const root = project(), dir = path.join(root, "materials"), base = ["--root", root, "--project-root", "."];
  fs.mkdirSync(path.join(dir, "owner"));
  const write = (name, image) => { fs.writeFileSync(path.join(dir, "owner", name), encodePng(image)); assert.equal(cli(["materials", "add", ...base, "--file", `materials/owner/${name}`, "--license", "owner-original", "--by", "Owner"]).status, "recorded"); };
  write("bg.png", canvas(144, 101, () => [200, 204, 206]));
  write("ghost.png", { width: 144, height: 101, data: Buffer.alloc(144 * 101 * 4) });
  write("mid.png", canvas(144, 101, (x, y) => (y > 80 ? [195, 198, 200] : y > 50 ? [40, 40, 44] : [231, 233, 234])));
  write("sprite.png", canvas(16, 16, () => [212, 255, 0]));
  write("fg.png", canvas(16, 16, () => [20, 20, 20]));
  write("fig.png", figureOnGradient());
  assert.equal(cli(["materials", "cut", ...base, "--file", "materials/owner/fig.png", "--mode", "grabcut", "--params", '{"workPx":120}']).exitCode, 0);
  const set = ["bg=materials/owner/bg.png", "ghost=materials/owner/ghost.png", "mid=materials/owner/mid.png", "mid-cassette=materials/owner/sprite.png", "mid-rewind=materials/owner/sprite.png", "char=materials/cut/fig/piece-0.png", "fx-rec=materials/owner/sprite.png", "fx-stars=materials/owner/sprite.png", "fg-boombox=materials/owner/fg.png"].flatMap((v) => ["--set", v]);
  return { root, dir, base, set };
}

test("materials composite renders every declared size from one set of layers, with lineage", () => {
  const { root, dir, base, set } = heroProject();
  const landmarks = JSON.stringify({ landmarks: { face: [12, 0, 52, 40], hands: [[0, 70, 10, 90]] } });
  const missing = cli(["materials", "composite", ...base, "--template", "kv.tape-hero", "--set", "char=materials/cut/fig/piece-0.png"]);
  assert.match(missing.error.message, /--set bg=materials/);
  const run = cli(["materials", "composite", ...base, "--template", "kv.tape-hero", ...set, "--size", "920x430,1080x1920", "--params", landmarks, "--name", "t"]);
  // the stand-in is 158 px tall: the 600 px steam slot and the 1300 px vertical slot enlarge it
  assert.equal(run.exitCode, 2, JSON.stringify(run.findings));
  const upscale = run.findings.filter((f) => f.code === "composite-upscale");
  assert.equal(upscale.length, 2);
  assert.match(upscale[0].fix, /at least \d+ px tall \(2x this slot\)/);
  for (const key of ["920x430", "1080x1920"]) {
    const files = run.sizes[key].files;
    for (const output of ["final", "ground", "upper", "mask"]) {
      const image = decodePng(fs.readFileSync(path.join(root, files[output])));
      assert.deepEqual([image.width, image.height], key.split("x").map(Number), `${key} ${output}`);
    }
    const m = run.sizes[key].measurements;
    assert.ok(Math.abs(m.blackPointDL[1]) <= Math.abs(m.blackPointDL[0]) + 1e-6, JSON.stringify(m));
  }
  const receipt = JSON.parse(fs.readFileSync(path.join(dir, "composite", "t", "composite.json"), "utf8"));
  assert.equal(receipt.outputs["920x430-ground.png"].layer, "ground");
  assert.equal(receipt.outputs["920x430-upper.png"].layer, "char");
  assert.equal(receipt.mode, "sticker", "the style pack's default integration");
  assert.match(receipt.command, /materials composite .*--name t --replace/);
  const record = materials.readRecords(dir)["composite/t/920x430.png"];
  assert.equal(record.license, "owner-original");
  assert.equal(record.derivedFrom.operation, "composite");
  assert.equal(record.derivedFrom.inputs.length, 9);
  assert.equal(cli(["materials", "check", ...base]).status, "passed");
  // an input changes: every output is stale and the fix is the recorded command
  fs.writeFileSync(path.join(dir, "owner", "bg.png"), encodePng(canvas(144, 101, () => [10, 10, 10])));
  assert.equal(cli(["materials", "add", ...base, "--file", "materials/owner/bg.png", "--license", "owner-original", "--by", "Owner", "--replace"]).status, "recorded");
  const stale = cli(["materials", "check", ...base]).findings.filter((f) => f.code === "material-derived-stale");
  assert.equal(stale.length, 8);
  assert.match(stale[0].fix, /^Composite again: materials composite /);
  assert.equal(cli(["materials", "composite", ...base, "--template", "kv.tape-hero", ...set, "--size", "920x430", "--name", "t"]).error.code, "OUTPUT_EXISTS");
  assert.equal(cli(["materials", "composite", ...base, "--template", "kv.tape-hero", ...set, "--set", "nope=materials/owner/bg.png"]).error.code, "OPTION_VALUE_INVALID");
  assert.equal(cli(["materials", "composite", ...base, "--template", "kv.tape-hero", ...set, "--mode", "glossy"]).error.code, "OPTION_VALUE_INVALID");
  // a piece without transparency is not a cut-out
  assert.match(cli(["materials", "composite", ...base, "--template", "kv.tape-hero", ...set.map((v) => v.replace("char=materials/cut/fig/piece-0.png", "char=materials/owner/fig.png"))]).error.message, /not cut out/);
});

test("composite measures safe areas, grade and upscale per size with a fix for each", () => {
  const manifest = bank.loadManifest("kv.tape-hero"), style = bank.loadStyle("street-tape");
  const palette = Object.fromEntries(Object.entries(manifest.palette).map(([role, spec]) => [role, spec.value]));
  const contract = {
    ...manifest.layers,
    sizes: { "400x300": { frame: { rect: [0, 0, 400, 300] }, char: { foot: [200, 290], height: 200 }, boxes: { "fg-boombox": { box: [150, 120, 60, 60] } }, type: { title: [180, 80, 80, 30] }, pxScale: 0.3 } },
  };
  const solid = (w, h, rgb, a = 1) => ({ width: w, height: h, R: new Float32Array(w * h).fill(rgb[0]), G: new Float32Array(w * h).fill(rgb[1]), B: new Float32Array(w * h).fill(rgb[2]), A: new Float32Array(w * h).fill(a) });
  const char = solid(50, 100, [0.4, 0.3, 0.3], 0);
  for (let y = 0; y < 100; y += 1) for (let x = 10; x < 40; x += 1) char.A[y * 50 + x] = 1;
  const layerSet = { bg: solid(144, 101, [0.8, 0.8, 0.8]), mid: solid(144, 101, [0.85, 0.85, 0.85], 0), "fg-boombox": solid(8, 8, [0.1, 0.1, 0.1]) };
  const landmarks = { foot: [25, 100], headTop: 0, face: [15, 0, 35, 20], hands: [[10, 60, 18, 75]], from: "params" };
  const run = (overrides = {}) => compositor.compositeSize({ contract, key: "400x300", size: contract.sizes["400x300"], layers: layerSet, char, landmarks, mode: "sticker", modeSpec: { ...style.integration.modes.sticker, ...overrides }, texture: null, palette, hueHex: palette.acid, charEdge: { haloWidthPx: 0.5 } });
  const r = run();
  const codes = r.findings.map((f) => f.code);
  assert.ok(codes.includes("composite-upscale"), codes.join());
  assert.ok(codes.includes("safe-area-type"), JSON.stringify(r.findings));
  const type = r.findings.find((f) => f.code === "safe-area-type");
  assert.match(type.fix, /Move title in sizes\.400x300\.type off face/);
  assert.equal(r.measurements.halo.outputPx, 1);
  // an occluder over the face is an error with the box to move
  contract.sizes["400x300"].boxes["fg-boombox"].box = [180, 85, 50, 50];
  const covered = run().findings.find((f) => f.code === "safe-area-occluder");
  assert.ok(covered && /Move sizes\.400x300\.boxes\.fg-boombox\.box away from face/.test(covered.fix), JSON.stringify(run().findings));
  // pulling the mean hard is flagged as a wash-out
  assert.ok(run({ grade: { bw: 0.5, meanvar: 0.6, chroma: 0.2 } }).findings.some((f) => f.code === "composite-grade-washout"));
  // the grade pulls the black point toward the scene's
  const graded = r.steps.find((s) => s.step === "grade (OKLab)");
  assert.ok(Math.abs(graded.blackPointDL[1]) < Math.abs(graded.blackPointDL[0]), JSON.stringify(graded.blackPointDL));
});

const BROWSER = (() => {
  try {
    const puppeteerModule = process.env.DESIGN_PIPELINE_PUPPETEER_MODULE || path.dirname(require.resolve("puppeteer-core/package.json"));
    const { resolveBrowser } = require("../skill/scripts/browser-locate.cjs");
    return { puppeteerModule, chrome: resolveBrowser() };
  } catch (error) {
    return { skip: `browser unavailable: ${error.message}` };
  }
})();

test("the browser check reads a composited ground as the text's ground and the face against the ink", { skip: BROWSER.skip }, async () => {
  const { checkPage, launch } = require("../skill/tools/template-bank/page-check.cjs");
  const root = project(), dir = path.join(root, "comp");
  fs.mkdirSync(dir);
  // ground: a light pavement band; upper: a dark figure block whose face box is declared
  fs.writeFileSync(path.join(dir, "400x300-ground.png"), encodePng(canvas(400, 300, () => [200, 200, 200])));
  const upper = canvas(400, 300, () => [0, 0, 0]);
  for (let i = 0; i < 400 * 300; i += 1) upper.data[i * 4 + 3] = 0;
  for (let y = 40; y < 280; y += 1) for (let x = 300; x < 360; x += 1) upper.data.set([60, 40, 40, 255], (y * 400 + x) * 4);
  fs.writeFileSync(path.join(dir, "400x300-upper.png"), encodePng(upper));
  const receipt = { schema: "design-pipeline.composite.v1", outputs: { "400x300-ground.png": { size: "400x300", output: "ground", layer: "ground" }, "400x300-upper.png": { size: "400x300", output: "upper", layer: "char" } }, sizes: { "400x300": { boxes: { face: [300, 40, 360, 90] }, findings: [{ code: "composite-black-point", severity: "warn", message: "black point", fix: "raise grade.bw" }] } }, limits: compositor.LIMITS };
  const page = (name, text, receiptOn) => {
    fs.writeFileSync(path.join(dir, "composite.json"), JSON.stringify(receiptOn ? receipt : { schema: "other" }));
    const file = path.join(root, name);
    fs.writeFileSync(file, `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0}img{position:absolute;left:0;top:0;width:400px;height:300px}p{position:absolute;margin:0;font:700 22px sans-serif;color:#111}</style></head><body><img src="comp/400x300-ground.png" alt=""><img src="comp/400x300-upper.png" alt="">${text}</body></html>`);
    return file;
  };
  const browser = await launch({ chrome: BROWSER.chrome, puppeteerModule: BROWSER.puppeteerModule });
  try {
    const over = '<p style="left:20px;top:250px">PC 启动器下载</p>';
    const plain = await checkPage({ file: page("plain.html", over, false), browser, size: [400, 300] });
    assert.ok(plain.findings.some((f) => f.rule === "collage-cover" && /ground/.test(f.layer)), "without a receipt the ground image is collage over the copy");
    const linked = await checkPage({ file: page("linked.html", over, true), browser, size: [400, 300] });
    assert.deepEqual(linked.findings.map((f) => f.rule), [], JSON.stringify(linked.findings));
    assert.equal(linked.grounds.length, 1);
    assert.ok(linked.notes.some((n) => /composite-black-point .*warn band/.test(n)));
    const onFace = await checkPage({ file: page("face.html", '<p style="left:280px;top:50px">回放街区</p>', true), browser, size: [400, 300] });
    const safe = onFace.findings.find((f) => f.rule === "safe-area-type");
    assert.ok(safe && /face/.test(safe.message) && /Move /.test(safe.fix), JSON.stringify(onFace.findings));
  } finally {
    await browser.close();
  }
});

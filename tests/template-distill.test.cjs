"use strict";

// Reference distillation (`template distill`): a reference board -> a style pack draft whose
// thresholds are the reference distribution. Fixtures are generated here (tiny PNGs drawn in code);
// no reference image is committed. The real-corpus acceptance (Arknights / Endfield study, the
// Nocturne Corridor set) is recorded in openspec/changes/reference-distill/design.md.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { spawnSync } = require("node:child_process");
const { encodePng } = require("../skill/scripts/png-core.cjs");
const bank = require("../skill/tools/template-bank/bank.cjs");
const measure = require("../skill/tools/template-bank/reference-measure.cjs");
const distill = require("../skill/tools/template-bank/distill.cjs");

const CLI = path.join(__dirname, "..", "skill", "scripts", "designer-pipeline.cjs");
const FFMPEG = spawnSync("ffmpeg", ["-version"], { encoding: "utf8" }).status === 0 && spawnSync("ffprobe", ["-version"], { encoding: "utf8" }).status === 0;
const NO_FFMPEG = FFMPEG ? false : "ffmpeg/ffprobe not on PATH";

const BROWSER = (() => {
  try {
    const puppeteerModule = process.env.DESIGN_PIPELINE_PUPPETEER_MODULE || path.dirname(require.resolve("puppeteer-core/package.json"));
    const { resolveBrowser } = require("../skill/scripts/browser-locate.cjs");
    return { puppeteerModule, chrome: resolveBrowser() };
  } catch (error) {
    return { skip: `browser unavailable: ${error.message}` };
  }
})();

function tempRoot(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "distill-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}

function cli(root, ...args) {
  const child = spawnSync(process.execPath, [CLI, ...args, "--root", root, "--json"], { encoding: "utf8", windowsHide: true, timeout: 600000, maxBuffer: 64 << 20 });
  let payload = null;
  try { payload = JSON.parse(child.stdout); } catch { payload = null; }
  return { status: child.status, payload, stderr: child.stderr };
}

// ---- generated pictures ----------------------------------------------------------------------

function canvas(w, h, [r, g, b]) {
  const data = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i += 1) { data[i * 4] = r; data[i * 4 + 1] = g; data[i * 4 + 2] = b; data[i * 4 + 3] = 255; }
  return { width: w, height: h, data };
}

function rect(img, x0, y0, x1, y1, [r, g, b]) {
  for (let y = Math.max(0, Math.round(y0)); y < Math.min(img.height, Math.round(y1)); y += 1) {
    for (let x = Math.max(0, Math.round(x0)); x < Math.min(img.width, Math.round(x1)); x += 1) {
      const i = (y * img.width + x) * 4;
      img.data[i] = r; img.data[i + 1] = g; img.data[i + 2] = b;
    }
  }
}

// A glyph like 王 / 十: vertical stems `stem` wide, horizontal bars `bar` thick, `size` high.
function glyphs(img, x, y, size, count, stem, bar, colour) {
  for (let k = 0; k < count; k += 1) {
    const gx = x + k * size * 1.1;
    rect(img, gx + size * 0.45 - stem / 2, y, gx + size * 0.45 + stem / 2, y + size, colour);
    rect(img, gx + size * 0.12 - stem / 2, y + size * 0.2, gx + size * 0.12 + stem / 2, y + size * 0.8, colour);
    rect(img, gx + size * 0.82 - stem / 2, y + size * 0.2, gx + size * 0.82 + stem / 2, y + size * 0.8, colour);
    for (const f of [0.08, 0.48, 0.9]) rect(img, gx, y + size * f - bar / 2, gx + size * 0.95, y + size * f + bar / 2, colour);
  }
}

function save(file, img) { fs.writeFileSync(file, encodePng(img)); return file; }

// A measured house style: light neutral ground, a title in the left column (mincho-like strokes),
// a grey figure to the right, one small red accent bar.
function kvBoard(dir, { count = 9, square = false } = {}) {
  fs.mkdirSync(dir, { recursive: true });
  const rows = ["id,game,image_url,width,height,category_by_eye"];
  const ann = ["id,category,logo_corner,title_x0,title_y0,title_x1,title_y1,title_orient,fig_x0,fig_x1,notes"];
  for (let i = 0; i < count; i += 1) {
    const [W, H] = square ? [360, 360] : [640, 360];
    const img = canvas(W, H, [236 - (i % 3), 235 - (i % 3), 231 - (i % 2)]);
    const fx0 = W * (0.52 + 0.01 * (i % 4)), fx1 = W * (0.86 + 0.01 * (i % 3));
    rect(img, fx0, H * 0.12, fx1, H, [150, 148, 145]);
    const ty = H * (0.42 + 0.01 * (i % 5));
    glyphs(img, W * 0.05, ty, 40, square ? 2 : 4, 7, 2, [29, 29, 31]);
    rect(img, W * 0.05, H * 0.86, W * 0.05 + (square ? 90 : 160), H * 0.86 + 24, [208, 40, 58]);
    const id = `R${String(i).padStart(2, "0")}`;
    save(path.join(dir, `${id}.png`), img);
    const tx1 = (W * 0.05 + (square ? 2 : 4) * 44) / W;
    rows.push(`${id},T,https://example.org/ref/${id}.png,${W},${H},KV`);
    ann.push(`${id},KV,TL,0.05,${(ty / H - 0.01).toFixed(3)},${tx1.toFixed(3)},${((ty + 40) / H + 0.01).toFixed(3)},H,${(fx0 / W).toFixed(3)},${(fx1 / W).toFixed(3)},generated`);
  }
  fs.writeFileSync(path.join(dir, "provenance.csv"), `${rows.join("\n")}\n`);
  fs.writeFileSync(path.join(dir, "annotations.csv"), `${ann.join("\n")}\n`);
  return dir;
}

// ---- measurement port ------------------------------------------------------------------------

test("pixel features: palette, accent, hue spread, symmetry and whitespace on pictures with known answers", { skip: NO_FFMPEG }, (t) => {
  const dir = tempRoot(t);
  // Left half paper, right half ink: two clusters of half each, mirror-asymmetric, no colour.
  const split = canvas(200, 100, [242, 238, 228]);
  rect(split, 100, 0, 200, 100, [13, 11, 11]);
  const a = measure.measurePixels(measure.decode(save(path.join(dir, "split.png"), split)));
  assert.ok(Math.abs(a.features.main_share - 0.5) < 0.02, `main share ${a.features.main_share}`);
  assert.equal(a.features.accent_share, 0);
  assert.equal(a.features.hue_spread, 0, "too few coloured pixels: no spread");
  assert.ok(a.features.lr_symmetry < 0.2, `split frame is not symmetric (${a.features.lr_symmetry})`);
  // A centred red square on paper: symmetric, accent share = its area, one hue.
  const red = canvas(200, 100, [242, 238, 228]);
  rect(red, 80, 30, 120, 70, [209, 14, 31]);
  const b = measure.measurePixels(measure.decode(save(path.join(dir, "red.png"), red)));
  assert.ok(Math.abs(b.features.accent_share - 0.08) < 0.01, `accent ${b.features.accent_share} vs 0.08 area`);
  assert.ok(b.features.hue_spread < 2, `one hue (${b.features.hue_spread})`);
  assert.ok(b.features.lr_symmetry > 0.99);
  assert.ok(b.features.quiet_share > 0.7, `flat paper is quiet (${b.features.quiet_share})`);
  assert.ok(b.palette.some((p) => p.hex === "#F2EEE4"), "the ground colour comes back exactly");
  // Two hues far apart spread wide.
  const two = canvas(200, 100, [242, 238, 228]);
  rect(two, 20, 20, 80, 80, [209, 14, 31]);
  rect(two, 120, 20, 180, 80, [0, 166, 162]);
  assert.ok(measure.measurePixels(measure.decode(save(path.join(dir, "two.png"), two))).features.hue_spread > 60);
});

test("a black title card is a black ground, not a letterbox; real letterbox bars are cut", { skip: NO_FFMPEG }, (t) => {
  const dir = tempRoot(t);
  const card = canvas(320, 180, [13, 11, 11]);
  glyphs(card, 120, 70, 40, 2, 7, 2, [242, 238, 228]);
  const m = measure.measurePixels(measure.decode(save(path.join(dir, "card.png"), card)));
  assert.deepEqual(m.letterbox, [0, 0]);
  assert.ok(m.features.ground_L < 0.2 && m.features.main_share > 0.8, JSON.stringify(m.features));
  const boxed = canvas(320, 180, [0, 0, 0]);
  rect(boxed, 0, 20, 320, 160, [236, 235, 231]);
  const lb = measure.measurePixels(measure.decode(save(path.join(dir, "boxed.png"), boxed)));
  assert.ok(lb.letterbox[0] > 0.1 && lb.letterbox[1] > 0.1, `bars found: ${lb.letterbox}`);
  assert.ok(lb.features.ground_L > 0.9, "the frame inside the bars is measured");
});

test("stroke contrast separates mincho-like from gothic-like strokes and refuses thumbnails", { skip: NO_FFMPEG }, (t) => {
  const dir = tempRoot(t);
  const make = (name, stem, bar, size = 60) => {
    const img = canvas(Math.round(size * 4.8), size + 24, [242, 238, 228]);
    glyphs(img, 10, 12, size, 4, stem, bar, [13, 11, 11]);
    return measure.decode(save(path.join(dir, `${name}.png`), img), { longEdge: 0 });
  };
  const mincho = measure.classifyStroke(measure.strokeStyle(make("mincho", 8, 2)));
  assert.equal(mincho.style, "mincho");
  assert.equal(mincho.contrast, "high");
  const gothic = measure.classifyStroke(measure.strokeStyle(make("gothic", 7, 7)));
  assert.equal(gothic.style, "gothic");
  assert.equal(gothic.contrast, "low");
  assert.ok(gothic.weight >= 500, "a 7/60 stem asks for at least 500");
  const tiny = measure.strokeStyle(make("tiny", 2, 1, 10));
  assert.equal(tiny.measurable, false);
  assert.match(tiny.reason, /16 px/);
  // An odd-sized crop of a larger picture decodes at exactly its size (RGB before the crop).
  const sheet = canvas(301, 121, [242, 238, 228]);
  glyphs(sheet, 21, 31, 60, 4, 8, 2, [13, 11, 11]);
  const cropped = measure.decode(save(path.join(dir, "sheet.png"), sheet), { longEdge: 0, crop: [11, 21, 279, 81] });
  assert.deepEqual([cropped.width, cropped.height], [279, 81]);
  assert.equal(measure.classifyStroke(measure.strokeStyle(cropped)).style, "mincho");
  // White text on black reads the same as black on white.
  const inv = canvas(300, 84, [13, 11, 11]);
  glyphs(inv, 10, 12, 60, 4, 8, 2, [242, 238, 228]);
  assert.equal(measure.classifyStroke(measure.strokeStyle(measure.decode(save(path.join(dir, "inv.png"), inv), { longEdge: 0 }))).style, "mincho");
});

// ---- board, draft, comparison ----------------------------------------------------------------

test("board errors: missing id column, duplicate ids, nothing to measure, bad annotations", (t) => {
  const dir = tempRoot(t);
  fs.writeFileSync(path.join(dir, "noid.csv"), "name,url\nA,x\n");
  assert.throws(() => distill.readBoard(path.join(dir, "noid.csv")), /needs an id column/);
  fs.writeFileSync(path.join(dir, "dup.csv"), "id,image_url\nA,x\nA,y\n");
  assert.throws(() => distill.readBoard(path.join(dir, "dup.csv")), /lists A twice/);
  fs.writeFileSync(path.join(dir, "none.csv"), "id,image_url\nA,https://example.org/a.png\n");
  assert.throws(() => distill.readBoard(path.join(dir, "none.csv")), (e) => e.code === "OPTION_VALUE_INVALID" && /no reference image/.test(e.message));
  fs.writeFileSync(path.join(dir, "bad.jsonl"), "{\"id\":\"A\"}\nnot json\n");
  assert.throws(() => distill.readAnnotations(path.join(dir, "bad.jsonl")), /line 2 is not JSON/);
  // A measured threshold in a style needs its kind, support and basis.
  const style = { schema: bank.STYLE_SCHEMA, id: "x-y", fonts: { roles: { title: { stack: ["Noto Sans CJK SC"] } } }, layout: {}, materials: {}, checks: { measured: { accent_share: { kind: "max", support: "sure", basis: "p75" } } } };
  assert.throws(() => bank.validateStyle(style, "x-y"), /checks.measured.accent_share needs kind/);
  style.checks.measured.accent_share.support = "measured";
  assert.equal(bank.validateStyle(style, "x-y"), style);
  // Quoted CSV fields with commas and quotes survive.
  assert.deepEqual(distill.parseCsv("id,note\nA,\"x, \"\"y\"\"\"\n"), [{ id: "A", note: "x, \"y\"" }]);
});

test("distill: thresholds are the reference quartiles, archetype finds the left-title template, type reads mincho", { skip: NO_FFMPEG }, (t) => {
  const dir = kvBoard(path.join(tempRoot(t), "board"));
  // An unreadable file and a listed reference without an image are skipped with a reason.
  fs.writeFileSync(path.join(dir, "R98.png"), "not a png");
  fs.appendFileSync(path.join(dir, "provenance.csv"), "R98,T,https://example.org/ref/R98.png,640,360,KV\nR99,T,https://example.org/ref/R99.png,640,360,KV\n");
  const r = distill.distill({ board: path.join(dir, "provenance.csv"), images: dir, annotations: path.join(dir, "annotations.csv"), id: "gen-kv", compare: "arknights-endfield", accessed: "2026-11-05" });
  assert.equal(r.board.measured, 9);
  assert.deepEqual(r.board.skipped.map((s) => s.id).sort(), ["R98", "R99"]);
  const th = r.thresholds;
  // Limits are quartiles of the measured values.
  const values = r.references.map((m) => m.features.accent_share).sort((a, b) => a - b);
  assert.equal(th.accent_share.limit, distill.distribution(values).p75);
  assert.equal(th.accent_share.support, "measured");
  assert.equal(th.margin_x.kind, "min");
  assert.ok(Math.abs(th.margin_x.limit - 0.05) < 0.002, `left margin ${th.margin_x.limit}`);
  assert.equal(th.type_ratio.support, "gap", "a CSV title box carries no other text sizes");
  // The ground comes back as the ground role.
  const ground = measure.hexToOklab(r.draft.palette.bg.value);
  assert.ok(Math.abs(ground[0] - 0.94) < 0.02 && Math.hypot(ground[1], ground[2]) < 0.01, r.draft.palette.bg.value);
  assert.match(r.draft.palette.accent.value, /^#[0-9A-F]{6}$/);
  // Layout: every reference has its title on the left; nearest template is a left-title KV.
  assert.ok(r.archetypes[0].key.startsWith("landscape / title-left-middle"), r.archetypes[0].key);
  assert.ok(["kv.outfit-title-left", "kv.ef-narrative-lowerleft", "kv.operator-nameplate-ll"].includes(r.archetypes[0].nearest[0].id), JSON.stringify(r.archetypes[0].nearest));
  assert.equal(r.archetypes[0].skeleton, undefined);
  assert.ok(r.draft.layout.grammar.some((line) => /Title on the left in 9\/9 annotated references \(a rule\)/.test(line)), r.draft.layout.grammar.join("\n"));
  // Type: the generated strokes are mincho-like.
  assert.equal(r.fonts.title.query.style, "mincho");
  assert.equal(r.fonts.title.query.contrast, "high");
  assert.deepEqual(r.draft.fonts.roles.title.stack, ["Noto Serif CJK SC"]);
  assert.match(r.fonts.title.command, /fonts query --text <your copy> --style mincho --contrast high/);
  // The draft is a style pack in the bank's shape.
  assert.equal(r.draft.schema, bank.STYLE_SCHEMA);
  assert.equal(r.draft.draft, true);
  bank.validateStyle(r.draft, "gen-kv");
  assert.equal(r.draft.checks.measured.accent_share.limit, th.accent_share.limit);
  // Comparison with the hand-made pack: rows for its numbers, palette distances, hand-only parts.
  const rows = Object.fromEntries(r.comparison.rows.map((row) => [row.label, row]));
  assert.equal(rows["accent share max"].hand, 0.03);
  assert.equal(rows["side margin min"].same, true);
  assert.ok(r.comparison.palette.length >= 6);
  // The report names what is supported and what is a gap; it carries no picture.
  const md = distill.reportMarkdown(r);
  for (const head of ["## Supported by data", "## Layout archetypes", "## Font roles", "## Gaps: needs human judgement", "## Against the hand-made pack `arknights-endfield`"]) assert.ok(md.includes(head), head);
  assert.match(md, /type_ratio \(type-size\): no reference carries it/);
  assert.doesNotMatch(JSON.stringify(r), /data:image|base64/);
});

test("an archetype no template is close to gets a skeleton", { skip: NO_FFMPEG }, (t) => {
  const dir = kvBoard(path.join(tempRoot(t), "sq"), { count: 4, square: true });
  const r = distill.distill({ board: path.join(dir, "provenance.csv"), images: dir, annotations: path.join(dir, "annotations.csv"), id: "gen-square" });
  const a = r.archetypes[0];
  assert.ok(a.key.startsWith("square /"), a.key);
  assert.ok(a.skeleton, "no square template in the bank");
  assert.equal(a.skeleton.aspect, "square");
  assert.ok(a.skeleton.boxes.title.length === 4 && a.skeleton.boxes.figureZone.length === 4);
  assert.match(a.skeleton.next, /layouts file/);
  assert.equal(r.thresholds.accent_share.support, "thin", "4 references: a thin threshold");
});

test("the font catalog hook: candidates when a catalog is installed, the command when not", { skip: NO_FFMPEG }, (t) => {
  const dir = kvBoard(path.join(tempRoot(t), "fc"), { count: 3 });
  const calls = [];
  distill.useFontCatalog({
    resolveCatalog: () => ({ catalog: { families: [] } }),
    queryCatalog: (q) => { calls.push(q); return { candidates: [{ family: "Shippori Mincho B1", styles: ["mincho"], contrast: 2.9, weights: [800], license: { id: "OFL" } }] }; },
  });
  t.after(() => distill.useFontCatalog(null));
  const r = distill.distill({ board: path.join(dir, "provenance.csv"), images: dir, annotations: path.join(dir, "annotations.csv"), id: "gen-fc" });
  assert.equal(calls[0].style, "mincho");
  assert.equal(calls[0].contrast, "high");
  assert.ok(calls[0].text.length > 0);
  assert.equal(r.fonts.title.catalog.status, "queried");
  assert.deepEqual(r.draft.fonts.roles.title.stack, ["Shippori Mincho B1"]);
  assert.equal(r.draft.fonts.roles.title.stackSource, "open-font catalog candidates");
  distill.useFontCatalog(null);
  const without = distill.distill({ board: path.join(dir, "provenance.csv"), images: dir, annotations: path.join(dir, "annotations.csv"), id: "gen-fc" });
  assert.ok(["not-installed", "queried", "unavailable"].includes(without.fonts.title.catalog.status));
});

test("CLI: template distill writes the draft, measures and report, never the images; options are checked", { skip: NO_FFMPEG }, (t) => {
  const root = tempRoot(t);
  const dir = kvBoard(path.join(root, "board"), { count: 5 });
  const run = cli(root, "template", "distill", "board/provenance.csv", "--images", "board", "--annotations", "board/annotations.csv", "--compare", "arknights-endfield", "-o", "out");
  assert.equal(run.status, 0, run.stderr || JSON.stringify(run.payload));
  assert.equal(run.payload.status, "drafted");
  assert.equal(run.payload.id, "draft-provenance");
  assert.deepEqual(fs.readdirSync(path.join(root, "out")).sort(), ["distill.json", "report.md", "style.json"]);
  const style = JSON.parse(fs.readFileSync(path.join(root, "out", "style.json"), "utf8"));
  bank.validateStyle(style, "draft-provenance");
  const all = fs.readdirSync(path.join(root, "out")).map((f) => fs.readFileSync(path.join(root, "out", f), "utf8")).join("\n");
  assert.doesNotMatch(all, /base64|\x89PNG/);
  for (const id of ["R00", "R04"]) assert.ok(all.includes(id), "ids and source URLs are kept");
  assert.ok(run.payload.comparison.rows.length >= 7);
  assert.ok(run.payload.gaps.includes("type_ratio"));
  assert.equal(cli(root, "template", "distill", "board/provenance.csv", "--images", "board").payload.error.code, "OPTION_REQUIRED");
  assert.equal(cli(root, "template", "distill", "board/annotations.txt", "-o", "x").status, 1);
  assert.equal(cli(root, "template", "distill", "board/provenance.csv", "--images", "board", "--id", "Bad Id", "-o", "x").payload.error.code, "OPTION_VALUE_INVALID");
  assert.equal(cli(root, "template", "distill", "board/provenance.csv", "--images", "board", "--compare", "no-such-style", "-o", "x").payload.error.code, "OPTION_VALUE_INVALID");
  assert.equal(cli(root, "template", "distill", "board/provenance.csv", "--images", "board", "--category", "NOPE", "-o", "x").payload.error.code, "OPTION_VALUE_INVALID");
  assert.equal(cli(root, "template", "distill", "board/provenance.csv", "--images", "board", "--annotations", "board/provenance.csv", "-o", "x").status, 0, "a CSV with no annotation columns adds nothing");
  // A file column pointing outside --root is skipped, not read.
  const outside = tempRoot(t);
  fs.copyFileSync(path.join(dir, "R00.png"), path.join(outside, "far.png"));
  fs.writeFileSync(path.join(root, "board", "far.csv"), `id,file\nR00,R00.png\nR01,R01.png\nFAR,${path.join(outside, "far.png")}\n`);
  const far = cli(root, "template", "distill", "board/far.csv", "--images", "board", "-o", "far");
  assert.equal(far.status, 0, far.stderr);
  assert.deepEqual(far.payload.skipped.map((s) => [s.id, /outside --root/.test(s.reason)]), [["FAR", true]]);
});

test("CLI: --ablate renders the nearest templates with and without each rule and measures the paired change", { skip: NO_FFMPEG || BROWSER.skip }, (t) => {
  const root = tempRoot(t);
  kvBoard(path.join(root, "board"), { count: 5 });
  const run = cli(root, "template", "distill", "board/provenance.csv", "--images", "board", "--annotations", "board/annotations.csv", "-o", "out", "--ablate", "--chrome", BROWSER.chrome, "--puppeteer-module", BROWSER.puppeteerModule);
  assert.equal(run.status, 0, run.stderr);
  const ab = run.payload.ablation;
  assert.equal(ab.status, "measured", JSON.stringify(ab));
  assert.deepEqual(ab.variants.map((v) => v.variant), ["draft", "no-palette", "no-neutral-ground", "no-single-hue"]);
  const by = Object.fromEntries(ab.variants.map((v) => [v.variant, v]));
  assert.equal(by.draft.delta, 0);
  assert.ok(by["no-neutral-ground"].axis.delta > 1, `a tinted ground moves ground chroma away (${by["no-neutral-ground"].axis.delta})`);
  assert.ok(by["no-neutral-ground"].delta > 0);
  assert.ok(by["no-single-hue"].axis.delta > 0, `a second hue spreads hue (${by["no-single-hue"].axis.delta})`);
  assert.ok(fs.readFileSync(path.join(root, "out", "report.md"), "utf8").includes("## Ablation"));
});

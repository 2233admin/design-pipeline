"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { spawnSync } = require("node:child_process");
const bank = require("../skill/tools/template-bank/bank.cjs");
const lettering = require("../skill/tools/template-bank/lettering.cjs");

const CLI = path.join(__dirname, "..", "skill", "scripts", "designer-pipeline.cjs");
const PACKAGE_RESOURCES = path.join(__dirname, "..", "skill", "references", "package-resources.json");

function tempRoot(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "template-bank-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}

function cli(root, ...args) {
  const child = spawnSync(process.execPath, [CLI, ...args, "--root", root, "--json"], { encoding: "utf8", windowsHide: true });
  let payload = null;
  try { payload = JSON.parse(child.stdout); } catch { payload = null; }
  return { status: child.status, payload, stdout: child.stdout, stderr: child.stderr };
}

function solidPng(r, g, b, w = 64, h = 40) {
  const zlib = require("node:zlib");
  const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = (buf) => { let c = 0xffffffff; for (const byte of buf) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const body = Buffer.concat([Buffer.from(type), data]); const sum = Buffer.alloc(4); sum.writeUInt32BE(crc(body)); return Buffer.concat([len, body, sum]); };
  const header = Buffer.alloc(13); header.writeUInt32BE(w, 0); header.writeUInt32BE(h, 4); header[8] = 8; header[9] = 2;
  const row = Buffer.concat([Buffer.from([0]), Buffer.from(Array.from({ length: w }, () => [r, g, b]).flat())]);
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", header), chunk("IDAT", zlib.deflateSync(Buffer.concat(Array(h).fill(row)))), chunk("IEND", Buffer.alloc(0))]);
}

const rules = (report) => report.findings.map((finding) => `${finding.rule}:${finding.slot || ""}`);

test("every template renders at each listed size with its default slots and passes check", () => {
  const ids = bank.templateIds();
  assert.equal(ids.length, 48);
  for (const id of ids) {
    const manifest = bank.loadManifest(id);
    assert.ok(manifest.sizes.includes(`${manifest.canvas.width}x${manifest.canvas.height}`), `${id} lists its canvas size`);
    for (const size of manifest.sizes) {
      const report = bank.check(bank.render(id, { size }).svg);
      assert.equal(report.status, "passed", `${id} at ${size}: ${JSON.stringify(report.findings, null, 1)}`);
      assert.ok(report.measured.length >= 2, `${id} measures its text slots`);
    }
  }
});

test("manifests are complete and the committed template.svg is the default render", () => {
  const required = new Set(JSON.parse(fs.readFileSync(PACKAGE_RESOURCES, "utf8")).required);
  for (const id of bank.templateIds()) {
    const manifest = bank.loadManifest(id);
    for (const [name, spec] of Object.entries(manifest.params)) {
      assert.ok(bank.PARAM_CLASSES.includes(spec.class), `${id} ${name} has a class`);
      if (!["boolean", "enum"].includes(spec.type || "number")) assert.ok(spec.min <= spec.default && spec.default <= spec.max, `${id} ${name} default inside its range`);
    }
    for (const [name, slot] of Object.entries(manifest.slots)) {
      assert.ok(["text", "lettering", "image"].includes(slot.kind), `${id} ${name} kind`);
      if (slot.kind !== "image") assert.ok(slot.maxChars > 0, `${id} ${name} has a budget`);
    }
    for (const role of manifest.accent.roles) assert.ok(manifest.palette[role], `${id} accent role ${role} is a palette role`);
    assert.ok(manifest.provenance.url || manifest.provenance.gallery || manifest.provenance.experiment, `${id} names its source`);
    assert.ok(manifest.provenance.sampleIds.length > 0 && manifest.provenance.measured.length > 0, `${id} lists samples and measurements`);
    assert.ok(manifest.relations.length && manifest.decoration.length, `${id} separates relations from decoration`);
    const svg = bank.render(id).svg;
    const drawn = new Set([...svg.matchAll(/data-slot="([^"]+)" data-kind="(text|lettering|image)"/g)].map((m) => m[1]));
    for (const name of drawn) assert.ok(bank.slotSpec(manifest, name), `${id} draws declared slot ${name}`);
    for (const key of Object.keys(manifest.slots).filter((name) => !manifest.slots[name].collage)) {
      assert.ok([...drawn].some((name) => bank.slotSpec(manifest, name)?.key === key), `${id} declares ${key}, which the default render draws`);
    }
    const committed = path.join(bank.TEMPLATES_ROOT, id, "template.svg");
    assert.equal(fs.readFileSync(committed, "utf8"), svg, `${id}/template.svg is stale; rewrite it from bank.render("${id}").svg`);
    for (const file of ["manifest.json", "template.svg"]) assert.ok(required.has(`tools/template-bank/templates/${id}/${file}`), `${id}/${file} is a package resource`);
  }
});

test("long text in a slot fails with an overflow finding that says what fits", (t) => {
  const root = tempRoot(t);
  const { status, payload } = cli(root, "template", "render", "kv.outfit-title-left", "--set", "title_cjk=这是一个非常非常长的时装名称标题", "-o", "long.svg");
  assert.equal(status, 2, JSON.stringify(payload));
  assert.equal(payload.status, "rendered-with-findings");
  const overflow = payload.check.findings.find((f) => f.rule === "text-overflow" && f.slot === "title_cjk");
  assert.ok(overflow, JSON.stringify(payload.check.findings));
  assert.ok(overflow.measured.overflowPx.right > 200);
  assert.match(overflow.fix, /Shorten title_cjk to about 8 characters \(now 16\)/);
  assert.match(overflow.fix, /below its measured minimum 0\.042, so shorten the copy/);
  assert.ok(payload.check.findings.some((f) => f.rule === "text-length" && f.slot === "title_cjk" && /Cut title_cjk to 8/.test(f.fix)));
  assert.ok(fs.existsSync(path.join(root, "long.svg")), "the failing render is still written for inspection");
  const recheck = cli(root, "template", "check", "long.svg");
  assert.equal(recheck.status, 2);
  assert.deepEqual(rules(recheck.payload), rules(payload.check));

  const wrapped = bank.check(bank.render("card.dossier-portrait", { set: { talent_body: "说明".repeat(60) } }).svg);
  const lines = wrapped.findings.find((f) => f.rule === "text-overflow" && f.slot === "talent_body");
  assert.ok(lines && lines.measured.lines > 4 && lines.limit.lines === 4, JSON.stringify(wrapped.findings));
});

test("a title over the figure zone fails with a move or shorten fix", (t) => {
  const root = tempRoot(t);
  const { status, payload } = cli(root, "template", "render", "kv.outfit-title-left", "--param", "fig_cx=0.45", "--param", "fig_w=0.46", "-o", "over.svg");
  assert.equal(status, 2, JSON.stringify(payload));
  const finding = payload.check.findings.find((f) => f.rule === "figure-zone" && f.slot === "title_latin_1");
  assert.ok(finding, JSON.stringify(payload.check.findings));
  assert.ok(finding.measured.overlapShare > 0.3);
  assert.match(finding.fix, /Move title_latin_1 left by at least \d+px \(--param title_x0\), or move the figure right by as much \(--param fig_cx\)/);

  // A hand edit after rendering is measured too: push the title into the figure.
  const edited = fs.readFileSync(path.join(root, "over.svg"), "utf8");
  const clean = bank.render("kv.outfit-title-left").svg;
  const moved = clean.replace(/(data-slot="title_cjk"[^>]*?) x="([\d.]+)"/, (m, head) => `${head} x="760.0"`);
  assert.notEqual(moved, clean);
  fs.writeFileSync(path.join(root, "moved.svg"), moved);
  const check = cli(root, "template", "check", "moved.svg");
  assert.equal(check.status, 2);
  assert.ok(rules(check.payload).includes("figure-zone:title_cjk"));
  assert.ok(rules(check.payload).includes("align-line:title_cjk"));
  assert.ok(edited.includes("data-template=\"kv.outfit-title-left\""));
});

test("contrast, type size, accent budget, crop zone and alignment are measured and each finding has a fix", () => {
  const contrast = bank.check(bank.render("kv.outfit-title-left", { params: { "palette.ink2": "#B0B0B0" } }).svg);
  const low = contrast.findings.find((f) => f.rule === "contrast" && f.slot === "item_line");
  assert.ok(low && low.measured.ratio < 4.5 && low.measured.ground === "#ECEBE7", JSON.stringify(contrast.findings));

  const scrimless = bank.check(bank.render("cover.pv-lowerthird", { params: { "palette.bg": "#D8D8D8", scrim: "false" } }).svg);
  assert.ok(scrimless.findings.some((f) => f.rule === "contrast" && f.slot === "title_cjk" && /image slot key_art/.test(f.fix)));
  assert.ok(scrimless.notes.some((note) => /key_art/.test(note)));

  const small = bank.check(bank.render("kv.outfit-title-left", { size: "1280x720" }).svg);
  const size = small.findings.find((f) => f.rule === "type-size");
  assert.ok(size && /larger --size/.test(size.fix), JSON.stringify(small.findings));

  const accent = bank.check(bank.render("kv.ef-narrative-lowerleft", { params: { accent_max_share: "0.005" } }).svg);
  const budget = accent.findings.find((f) => f.rule === "accent-budget");
  assert.ok(budget && budget.measured.share > 0.005 && budget.measured.largest[0].element === "tagline_bar", JSON.stringify(accent.findings));

  const crop = bank.check(bank.render("cover.pv-lowerthird", { params: { band_y0: "0.63", title_h: "0.092", label_h: "0.06" }, set: { title_cjk: "活动" } }).svg);
  assert.equal(crop.status, "passed", JSON.stringify(crop.findings));
  const outside = bank.check(bank.render("cover.pv-lowerthird").svg.replace(/(data-slot="pv_label"[^>]*?) y="([\d.]+)"/, (m, head) => `${head} y="985.0"`));
  assert.ok(outside.findings.some((f) => f.rule === "safe-zone" && f.slot === "pv_label" && /crop/.test(f.fix)), JSON.stringify(outside.findings));

  const aligned = bank.check(bank.render("kv.outfit-title-left", { params: { title_x0: "0.06" } }).svg);
  const line = aligned.findings.find((f) => f.rule === "align-line" && f.slot === "title_latin_1");
  assert.ok(line && line.measured.offsetPx > 9 && /Move title_latin_1 left/.test(line.fix), JSON.stringify(aligned.findings));

  for (const report of [contrast, scrimless, small, accent, outside, aligned]) {
    for (const finding of report.findings) assert.ok(typeof finding.fix === "string" && finding.fix.length > 20, `${finding.rule} has a fix`);
  }
});

test("lettering widths are deterministic and match the original glyph program", () => {
  // Widths from the art-study lettering.py (Python) for the same text and parameters.
  const golden = [
    ["COLLECTION", 77.76, {}, 555.984],
    ["// OPERATOR +", 36.72, { width: 0.62, stroke: 0.17, tracking: 40 }, 328.90104],
    ["12/24", 85, { width: 0.5, stroke: 0.17, chamfer: 0.07 }, 237.32],
    ["OVER THE LINE / INTO THE FIELD", 11.4048, { stroke: 0.2, tracking: 900, width: 0.6 }, 516.295296],
    ["STENCIL 0", 120, { width: 0.44, stencil: 0.07, stroke: 0.15 }, 595.344],
    ["LT.T//[ ]", 100, { chamfer_mode: "all", slant: 0.2 }, 471.8],
  ];
  for (const [text, height, params, width] of golden) {
    const first = lettering.setText(text, 0, 0, height, params);
    const second = lettering.setText(text, 0, 0, height, params);
    assert.ok(Math.abs(first.width - width) < 1e-6, `${text}: ${first.width} vs ${width}`);
    assert.equal(first.svg, second.svg);
  }
  assert.equal(lettering.STUDY_GLYPHS.length, 54, "the study's 53 glyphs plus the space");
  assert.deepEqual(lettering.ADDED_GLYPHS, [",", ";", "\"", "&", "€"]);
  for (const ch of ",.:;!?-'\"/&+%€") assert.ok(lettering.hasGlyph(ch), ch);
  // The study's glyphs are unchanged by the additions.
  const glyphSet = lettering.STUDY_GLYPHS.map((ch) => `${ch}:${lettering.glyphPaths(ch, 1000, 0, 0, {}).paths.map((p) => `${p.d}/${p.rule}`).join("|")}`).join("\n");
  assert.equal(crypto.createHash("sha256").update(glyphSet).digest("hex"), "551b9c56bda3d56de18b1ae613f76c5ac3cc71908fb40e8084f86a8e4cb63cb1");
  assert.throws(() => lettering.setText("A", 0, 0, 10, { stroke: 2 }), /stroke must be a number/);
  // Optical alignment puts the leftmost ink on x.
  const trimmed = lettering.setText("COLLECTION", 100, 0, 80, { trimStart: true });
  assert.ok(Math.abs(trimmed.left - 100) < 1e-9);
});

test("characters the lettering cannot draw are a finding that names them; lowercase is a note", () => {
  const svg = bank.render("kv.outfit-title-left", { set: { title_latin_1: "时装É" } }).svg;
  assert.match(svg, /data-fallback="cjk-font"><text [^>]*font-family="'Source Han Sans SC','Noto Sans CJK SC','Noto Sans SC',sans-serif"/);
  const report = bank.check(svg);
  const finding = report.findings.find((f) => f.rule === "lettering-fallback" && f.slot === "title_latin_1");
  assert.ok(finding, JSON.stringify(report.findings));
  assert.deepEqual(finding.measured.characters, ["时", "装", "É"]);
  assert.match(finding.message, /fallback font and its style changed/);
  assert.match(finding.fix, /move this copy to a text slot/);
  const punctuation = bank.check(bank.render("kv.outfit-title-left", { set: { title_latin_1: "R&D, \"Q\";" } }).svg);
  assert.equal(punctuation.status, "passed", JSON.stringify(punctuation.findings));
  const lower = bank.check(bank.render("kv.outfit-title-left", { set: { title_latin_1: "Epoque" } }).svg);
  assert.equal(lower.status, "passed");
  assert.ok(lower.notes.some((note) => /title_latin_1: lowercase is drawn as capitals/.test(note)));
});

test("geometry the check cannot measure fails as unsupported-geometry", () => {
  const clean = bank.render("kv.outfit-title-left").svg;
  const wrapped = bank.render("card.dossier-portrait", { set: { talent_body: "说明".repeat(30) } }).svg;
  assert.equal(bank.check(wrapped).findings.filter((f) => f.rule === "unsupported-geometry").length, 0, "the renderer's own dy-only tspans are supported");
  const cases = {
    use: clean.replace("</svg>\n", "<use href=\"#guides\"/></svg>\n"),
    nested: clean.replace("</svg>\n", "<svg width=\"10\" height=\"10\"><rect width=\"5\" height=\"5\" fill=\"#000\"/></svg></svg>\n"),
    style: clean.replace(/data-slot="title_cjk"/, "style=\"transform: translate(800px,0)\" data-slot=\"title_cjk\""),
    skew: clean.replace(/(<g data-slot="title_latin_1"[^>]*?)>/, "$1 transform=\"skewX(20)\">"),
    dx: wrapped.replace(/<tspan x="([\d.]+)" dy="([\d.]+)">/, "<tspan dx=\"40\" dy=\"$2\">"),
    tspanX: wrapped.replace(/<tspan x="([\d.]+)" dy="([\d.]+)">/, "<tspan x=\"900\" dy=\"$2\">"),
  };
  for (const [name, svg] of Object.entries(cases)) {
    assert.notEqual(svg, name === "dx" || name === "tspanX" ? wrapped : clean, `${name} edit applied`);
    const report = bank.check(svg);
    const finding = report.findings.find((f) => f.rule === "unsupported-geometry");
    assert.equal(report.status, "failed", name);
    assert.ok(finding && /Flatten it/.test(finding.fix), `${name}: ${JSON.stringify(report.findings)}`);
  }
});

test("path data is read as SVG defines it: glued arc flags, compact numbers, nothing skipped silently", () => {
  const measure = require("../skill/tools/template-bank/measure.cjs");
  const rings = (d) => { const parsed = measure.parsePath(d); assert.equal(parsed.error, null, d); return parsed.subpaths; };
  // svgo-style: flags 0 and 1 glued to x (10), then y 10, then l 5 5
  assert.deepEqual(rings("M0 0a10 10 0 0110 10l5 5"), [[[0, 0], [10, 10], [15, 15]]]);
  assert.deepEqual(rings("M0 0a10 10 0 0110 10l5 5"), rings("M0 0A10 10 0 0 1 10 10l5 5".replace("A", "a")));
  assert.deepEqual(rings("M10 10a5 5 0 00-5 5"), [[[10, 10], [5, 15]]]);
  assert.deepEqual(rings("M0,0A4,4,0,1,1,8,0Z"), [[[0, 0], [8, 0]]]);
  // repeated arc groups with glued flags, and numbers that touch
  assert.deepEqual(rings("M0 0a2 2 0 0010 0 2 2 0 1110 0"), [[[0, 0], [10, 0], [20, 0]]]);
  assert.deepEqual(rings("M0 0l1-2.5.5.5h-.5v1z"), [[[0, 0], [1, -2.5], [1.5, -2], [1, -2], [1, -1]]]);
  // an implicit lineto after a moveto, and a new subpath after Z
  assert.deepEqual(rings("M0 0 5 0 5 5zm1 1l2 2"), [[[0, 0], [5, 0], [5, 5]], [[1, 1], [3, 3]]]);
  for (const d of ["M0 0a10 10 0 2 1 5 5", "M0 0a10 10 0 0 1 5", "M0 0L1", "M0 0 L", "L1 1", "M0 0 5", "M0 0 x 5 5"]) {
    const parsed = measure.parsePath(d);
    assert.ok(parsed.error, `${d} is unmeasured`);
  }
  // the check reports an unreadable path as unmeasured instead of measuring part of it
  const clean = bank.render("kv.outfit-title-left").svg;
  const bad = clean.replace("</svg>\n", "<path d=\"M0 0a10 10 0 2 1 5 5\" fill=\"#000\"/></svg>\n");
  assert.notEqual(bad, clean);
  const report = bank.check(bad);
  const finding = report.findings.find((f) => f.rule === "unsupported-geometry");
  assert.equal(report.status, "failed");
  assert.match(finding.measured.found, /path data that cannot be read in full.*unmeasured/);
  assert.match(finding.fix, /valid SVG path data/);
  const compact = clean.replace("</svg>\n", "<path d=\"M0 0a10 10 0 0110 10l5 5z\" fill=\"none\" stroke=\"#000\"/></svg>\n");
  assert.equal(bank.check(compact).findings.filter((f) => f.rule === "unsupported-geometry").length, 0);
});

test("text on a real image needs sampled pixels or a declared tone", (t) => {
  const root = tempRoot(t);
  fs.writeFileSync(path.join(root, "white.png"), solidPng(250, 250, 250));
  const noBrowser = ["--chrome", path.join(root, "no-such-chrome")];
  const rendered = cli(root, "template", "render", "cover.pv-lowerthird", "--set", "key_art=white.png", "-o", "w.svg", ...noBrowser);
  assert.equal(rendered.status, 2, JSON.stringify(rendered.payload));
  const unverified = rendered.payload.check.findings.filter((f) => f.rule === "contrast-unverified");
  assert.deepEqual(unverified.map((f) => f.slot).sort(), ["copyright", "title_cjk", "title_latin"], "the plated label is not on the image");
  assert.match(unverified[0].fix, /headless Chrome and puppeteer-core/);
  assert.match(unverified[0].fix, /--tone key_art=#RRGGBB/);
  assert.ok(rendered.payload.warnings.some((w) => /pixel sampling unavailable/.test(w)));
  const declared = cli(root, "template", "check", "w.svg", "--tone", "key_art=#1A1A1A", ...noBrowser);
  assert.equal(declared.status, 0, JSON.stringify(declared.payload));
  assert.ok(declared.payload.notes.some((note) => /tone declared with --tone/.test(note)));
  const bright = cli(root, "template", "check", "w.svg", "--tone", "key_art=#F5F5F5", ...noBrowser);
  assert.equal(bright.status, 2);
  assert.ok(bright.payload.findings.some((f) => f.rule === "contrast" && f.slot === "title_cjk"));
  assert.equal(cli(root, "template", "check", "w.svg", "--tone", "title_cjk=#000000").payload.error.code, "OPTION_VALUE_INVALID");
  // Bank API: sampled pixels decide when given.
  const svg = fs.readFileSync(path.join(root, "w.svg"), "utf8");
  const request = bank.pixelRequests(svg);
  assert.deepEqual(Object.keys(request.points).sort(), ["copyright", "title_cjk", "title_latin"]);
  const white = Object.fromEntries(Object.entries(request.points).map(([slot, points]) => [slot, points.map(() => [250, 250, 250])]));
  const report = bank.check(svg, { pixels: white });
  assert.ok(report.findings.some((f) => f.rule === "contrast" && f.slot === "title_cjk" && f.measured.from === "pixels"));
});

test("a placeholder image slot keeps its declared ground tone", () => {
  const report = bank.check(bank.render("cover.pv-lowerthird").svg);
  assert.equal(report.status, "passed");
  assert.ok(report.notes.some((note) => /declared tone #/.test(note) && /no image in the slot yet/.test(note)));
});

test("a failed --png capture still returns the check", (t) => {
  const root = tempRoot(t);
  const { status, payload } = cli(root, "template", "render", "kv.outfit-title-left", "-o", "a.svg", "--png", "a.png", "--chrome", path.join(root, "no-such-chrome"));
  assert.equal(status, 0, JSON.stringify(payload));
  assert.equal(payload.check.status, "passed");
  assert.ok(!payload.png);
  assert.ok(payload.warnings.some((w) => /--png capture failed/.test(w)));
  assert.ok(fs.existsSync(path.join(root, "a.svg")));
});

test("seeds vary rhythm knobs only, inside their ranges, and repeat", () => {
  const manifest = bank.loadManifest("kv.ef-narrative-lowerleft");
  const a = bank.render("kv.ef-narrative-lowerleft", { seed: 7 });
  const b = bank.render("kv.ef-narrative-lowerleft", { seed: 7 });
  const c = bank.render("kv.ef-narrative-lowerleft", { seed: 8 });
  assert.equal(a.svg, b.svg);
  assert.notEqual(a.svg, c.svg);
  for (const name of a.varied) {
    const spec = manifest.params[name];
    assert.equal(spec.class, "rhythm");
    assert.ok(a.params[name] >= spec.min && a.params[name] <= spec.max);
  }
  for (const [name, spec] of Object.entries(manifest.params)) if (spec.class !== "rhythm") assert.equal(a.params[name], spec.default, name);
  const pinned = bank.render("kv.ef-narrative-lowerleft", { seed: 7, params: { title_h: "0.12" } });
  assert.equal(pinned.params.title_h, 0.12);
  assert.ok(!pinned.varied.includes("title_h"));
});

test("template list filters by family and image slots embed files", (t) => {
  const root = tempRoot(t);
  const listed = cli(root, "template", "list", "--family", "kv");
  assert.equal(listed.status, 0);
  assert.deepEqual(listed.payload.templates.map((item) => item.family), Array(8).fill("kv"));
  assert.ok(listed.payload.templates.every((item) => item.slots.length && item.sizes.length));
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
  fs.writeFileSync(path.join(root, "figure.png"), png);
  const rendered = cli(root, "template", "render", "kv.outfit-title-left", "--set", "figure=figure.png", "--set", "title_latin_1=EPOQUE", "-o", "out/with-figure.svg");
  assert.equal(rendered.status, 0, JSON.stringify(rendered.payload));
  const svg = fs.readFileSync(path.join(root, "out", "with-figure.svg"), "utf8");
  assert.match(svg, /<image href="data:image\/png;base64,/);
  assert.match(svg, /data-text="EPOQUE"/);
});

test("CLI usage errors exit 1", (t) => {
  const root = tempRoot(t);
  fs.writeFileSync(path.join(root, "broken.svg"), "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"10\" height=\"10\"><metadata id=\"template-check\">{not json</metadata></svg>");
  fs.writeFileSync(path.join(root, "notes.txt"), "x");
  const cases = [
    [["template", "render", "no.such-template", "-o", "a.svg"], "TEMPLATE_NOT_FOUND"],
    [["template", "render", "kv.outfit-title-left"], "OPTION_REQUIRED"],
    [["template", "render", "-o", "a.svg"], "OPTION_REQUIRED"],
    [["template", "render", "kv.outfit-title-left", "-o", "a.png"], "OPTION_VALUE_INVALID"],
    [["template", "render", "kv.outfit-title-left", "--set", "nope=1", "-o", "a.svg"], "OPTION_VALUE_INVALID"],
    [["template", "render", "kv.outfit-title-left", "--set", "title_cjk", "-o", "a.svg"], "OPTION_VALUE_INVALID"],
    [["template", "render", "kv.outfit-title-left", "--set", "figure=notes.txt", "-o", "a.svg"], "OPTION_VALUE_INVALID"],
    [["template", "render", "kv.outfit-title-left", "--param", "latin_h=0.5", "-o", "a.svg"], "OPTION_VALUE_INVALID"],
    [["template", "render", "kv.outfit-title-left", "--param", "palette.accent=red", "-o", "a.svg"], "OPTION_VALUE_INVALID"],
    [["template", "render", "kv.outfit-title-left", "--size", "1000x1000", "-o", "a.svg"], "OPTION_VALUE_INVALID"],
    [["template", "render", "kv.outfit-title-left", "--seed", "x", "-o", "a.svg"], "OPTION_VALUE_INVALID"],
    [["template", "render", "kv.outfit-title-left", "--frobnicate", "-o", "a.svg"], "UNKNOWN_OPTION"],
    [["template", "check"], "OPTION_REQUIRED"],
    [["template", "check", "broken.svg"], "CONTRACT_INVALID"],
    [["template", "check", "notes.txt"], "OPTION_VALUE_INVALID"],
    [["template", "check", "missing.svg"], "CONTRACT_INVALID"],
    [["template", "list", "--style", "nope"], "OPTION_VALUE_INVALID"],
    [["template", "render", "motion.title-card-cut", "--set", "summary=x", "-o", "a.svg"], "OPTION_VALUE_INVALID"],
    [["template", "list", "extra"], "UNKNOWN_ARGUMENT"],
    [["template", "list", "--family", "zine"], "OPTION_VALUE_INVALID"],
    [["template", "inventory", "a", "b"], "UNKNOWN_ARGUMENT"],
  ];
  for (const [args, code] of cases) {
    const { status, payload } = cli(root, ...args);
    assert.equal(status, 1, `${args.join(" ")} -> ${status} ${JSON.stringify(payload)}`);
    assert.equal(payload.ok, false);
    assert.equal(payload.error.code, code, `${args.join(" ")}: ${payload.error.message}`);
  }
  assert.ok(!fs.existsSync(path.join(root, "a.svg")), "no output on a usage error");
});

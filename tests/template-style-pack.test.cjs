"use strict";

// Style packs (template bank) and the browser half of `template check`: ink overlap, off-canvas,
// collage alpha over copy, contrast with the text hidden and whole-string glyph coverage. The
// acceptance fixtures are the Nocturne Corridor (shinbo style) experiment's first pass and final.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { spawnSync } = require("node:child_process");
const { pathToFileURL } = require("node:url");
const bank = require("../skill/tools/template-bank/bank.cjs");
const coverage = require("../skill/tools/template-bank/coverage.cjs");
const pageCheck = require("../skill/tools/template-bank/page-check.cjs");

const CLI = path.join(__dirname, "..", "skill", "scripts", "designer-pipeline.cjs");
const FIXTURES = path.join(__dirname, "fixtures", "style-pack-shinbo");
const ASSETS = path.join(FIXTURES, "assets");
const FONTS = path.join(ASSETS, "fonts");

function tempRoot(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "style-pack-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}

function cli(root, ...args) {
  const child = spawnSync(process.execPath, [CLI, ...args, "--root", root, "--json"], { encoding: "utf8", windowsHide: true, timeout: 600000, maxBuffer: 64 << 20 });
  let payload = null;
  try { payload = JSON.parse(child.stdout); } catch { payload = null; }
  return { status: child.status, payload, stderr: child.stderr };
}

const BROWSER = (() => {
  try {
    const puppeteerModule = process.env.DESIGN_PIPELINE_PUPPETEER_MODULE || path.dirname(require.resolve("puppeteer-core/package.json"));
    const { resolveBrowser } = require("../skill/scripts/browser-locate.cjs");
    return { puppeteerModule, chrome: resolveBrowser() };
  } catch (error) {
    return { skip: `browser unavailable: ${error.message}` };
  }
})();

const byRule = (report) => report.findings.map((f) => `${f.rule}:${f.slot}`).sort();

// ---- style packs ----------------------------------------------------------------------------

test("every template belongs to a style pack with font roles, grammar, materials, motion and checks", () => {
  assert.deepEqual(bank.styleIds(), ["acid-print-hud", "arknights-endfield", "cassandre-litho", "citypop-sleeve", "cyanotype-specimen", "frontier-survey", "shinbo", "street-tape", "woodblock-pixel", "xerox-flyer"]);
  for (const id of bank.styleIds()) {
    const style = bank.loadStyle(id);
    for (const key of ["fonts", "layout", "materials", "checks"]) assert.ok(style[key], `${id} has ${key}`);
    assert.ok(Object.keys(style.fonts.roles).length >= 2, `${id} names font roles`);
    assert.ok(style.motion || style.motionNote, `${id} states its motion grammar or why there is none`);
  }
  const shinbo = bank.templateIds().filter((id) => bank.loadManifest(id).style === "shinbo");
  assert.deepEqual(shinbo, ["card.bracket-quote", "card.collide", "card.episode-number", "card.giant-crop", "card.onechar-bleed", "card.vertical-sentence", "card.void-line", "kv.vertical-band-corridor", "motion.title-card-cut", "ui.door-grid", "ui.specimen-codex"]);
  for (const id of bank.templateIds()) assert.ok(bank.styleIds().includes(bank.loadManifest(id).style), `${id} names a style`);
  const style = bank.loadStyle("shinbo");
  assert.deepEqual(style.fonts.roles.display.stack, ["Shippori Mincho B1", "Noto Serif CJK SC"]);
  assert.equal(style.checks.browserOnRender, true);
  assert.deepEqual(style.motion.flashFrames, [2, 6]);
});

test("template list --style shows a style pack and its templates", (t) => {
  const root = tempRoot(t);
  const listed = cli(root, "template", "list", "--style", "shinbo");
  assert.equal(listed.status, 0, JSON.stringify(listed.payload));
  assert.equal(listed.payload.templates.length, 11);
  const [summary] = listed.payload.styles;
  assert.equal(summary.id, "shinbo");
  assert.match(summary.fontRoles.display, /Shippori Mincho B1 > Noto Serif CJK SC/);
  assert.ok(summary.grammar.length >= 5 && summary.materials.collage.length && summary.motion.fps === 30);
  assert.ok(summary.checks.browser.includes("collage-cover"));
  const all = cli(root, "template", "list");
  assert.deepEqual(all.payload.styles.map((s) => [s.id, s.templates]), [["acid-print-hud", 1], ["arknights-endfield", 9], ["cassandre-litho", 7], ["citypop-sleeve", 3], ["cyanotype-specimen", 2], ["frontier-survey", 5], ["shinbo", 11], ["street-tape", 5], ["woodblock-pixel", 2], ["xerox-flyer", 3]]);
});

test("shinbo templates pass the static check at every size and for 100 seeds", () => {
  for (const id of bank.templateIds().filter((name) => bank.loadManifest(name).style === "shinbo")) {
    for (const size of bank.loadManifest(id).sizes) {
      const report = bank.check(bank.render(id, { size }).svg);
      assert.equal(report.status, "passed", `${id} ${size}: ${JSON.stringify(report.findings)}`);
    }
    for (let seed = 1; seed <= 100; seed += 1) {
      const report = bank.check(bank.render(id, { seed }).svg);
      assert.equal(report.status, "passed", `${id} seed ${seed}: ${JSON.stringify(report.findings)}`);
    }
  }
});

// ---- glyph coverage ---------------------------------------------------------------------------

test("coverage reads cmaps, chooses one font per string and accepts a catalog provider", (t) => {
  const faces = [
    { family: "Shippori Mincho B1", weight: 800, file: path.join(FONTS, "ShipporiMinchoB1-ExtraBold.woff") },
    { family: "Noto Serif CJK SC", weight: 900, file: path.join(FONTS, "NotoSerifCJK-Black.woff") },
  ];
  // Shippori Mincho B1 has no simplified-only 钥 (the experiment's finding); Noto Serif CJK SC has.
  assert.deepEqual(coverage.missingGlyphs("Shippori Mincho B1", "夜想回廊", { faces }).missing, "");
  assert.equal(coverage.missingGlyphs("Shippori Mincho B1", "钥匙", { faces }).missing, "钥匙");
  assert.equal(coverage.chooseFamily(["Shippori Mincho B1", "Noto Serif CJK SC"], "钥匙夜", { faces }).family, "Noto Serif CJK SC");
  assert.equal(coverage.missingGlyphs("Unknown Font", "夜", { faces }).known, false);
  // a registered provider (the font catalog, #286) answers first
  const off = coverage.registerProvider((family) => (family === "Catalog Serif" ? new Set([..."钥匙"].map((c) => c.codePointAt(0))) : null));
  t.after(off);
  assert.equal(coverage.missingGlyphs("Catalog Serif", "钥匙", {}).missing, "");
  assert.equal(coverage.missingGlyphs("Catalog Serif", "钥匙夜", {}).missing, "夜");
  assert.throws(() => coverage.registerProvider("nope"), /function/);
});

test("render switches a whole string to the role's next font when a glyph is missing", () => {
  const rendered = bank.render("card.onechar-bleed", { set: { char: "钥" }, fontDir: FONTS });
  assert.deepEqual(rendered.fontSwitches, [{ role: "display", text: "钥", missing: "钥", from: "Shippori Mincho B1", to: "Noto Serif CJK SC" }]);
  assert.match(rendered.svg, /data-slot="char"[^>]*font-family="'Noto Serif CJK SC',serif"[^>]*data-font-switch="Shippori Mincho B1&gt;Noto Serif CJK SC"/);
  assert.match(rendered.svg, /@font-face\{font-family:'Shippori Mincho B1';font-weight:800;src:url\("file:/);
  const kept = bank.render("card.onechar-bleed", { set: { char: "夜" }, fontDir: FONTS });
  assert.equal(kept.fontSwitches.length, 0);
  assert.match(kept.svg, /data-slot="char"[^>]*font-family="'Shippori Mincho B1','Noto Serif CJK SC',serif"/);
  // without fonts the stack is written as named: coverage unknown, nothing switched
  assert.equal(bank.render("card.onechar-bleed", { set: { char: "钥" } }).fontSwitches.length, 0);
  assert.throws(() => bank.render("card.onechar-bleed", { fontDir: path.join(FONTS, "missing") }), /--font-dir/);
  // the preferred font's coverage unknown (not in --font-dir): the stack stays, nothing switches
  const onlyNoto = fs.mkdtempSync(path.join(os.tmpdir(), "style-pack-fonts-"));
  try {
    fs.copyFileSync(path.join(FONTS, "NotoSerifCJK-Black.woff"), path.join(onlyNoto, "NotoSerifCJK-Black.woff"));
    const unknown = bank.render("card.onechar-bleed", { set: { char: "钥" }, fontDir: onlyNoto });
    assert.equal(unknown.fontSwitches.length, 0);
    assert.match(unknown.svg, /data-slot="char"[^>]*font-family="'Shippori Mincho B1','Noto Serif CJK SC',serif"/);
  } finally {
    fs.rmSync(onlyNoto, { recursive: true, force: true });
  }
});

// ---- templates: collage slots, derived slots, rhythm ------------------------------------------

test("collage slots draw only when filled, at the image's own aspect", () => {
  const empty = bank.render("kv.vertical-band-corridor").svg;
  assert.ok(!/data-slot="collage0"/.test(empty));
  const webp = `data:image/webp;base64,${fs.readFileSync(path.join(ASSETS, "collage", "sticker-met-key-b-0.webp")).toString("base64")}`;
  const aspect = bank.imageAspect(webp);
  assert.ok(aspect > 2.5 && aspect < 3.5, `key aspect ${aspect}`);
  const filled = bank.render("kv.vertical-band-corridor", { set: { collage1: webp } }).svg;
  assert.match(filled, /data-slot="collage1"[^>]*data-collage="collage1" transform="rotate\(-24/);
  assert.equal(bank.check(filled).status, "passed");
  assert.throws(() => bank.render("motion.title-card-cut", { set: { summary: "x" } }), /derived/);
  assert.throws(() => bank.render("motion.title-card-cut", { set: { shot0: "blue:夜" } }), /ground black\|paper\|red/);
});

test("the title-card cut keeps the motion grammar and the rhythm check fails the experiment's own edit where it broke it", () => {
  const rendered = bank.render("motion.title-card-cut");
  assert.ok(rendered.edl.seconds >= 10 && rendered.edl.seconds <= 15, `${rendered.edl.seconds}`);
  for (const seed of [1, 2, 3, 4, 5]) assert.equal(bank.check(bank.render("motion.title-card-cut", { seed }).svg).status, "passed");
  const groups = new Map();
  for (const seg of rendered.edl.segments.filter((s) => s.kind === "flash")) groups.set(seg.group, new Set([...(groups.get(seg.group) || []), seg.ground]));
  for (const tones of groups.values()) assert.equal(tones.size, 1, "one ground per flash group");

  const long = bank.check(bank.render("motion.title-card-cut", { params: { groups: "8", hold_frames: "32" } }).svg);
  const duration = long.findings.find((f) => f.rule === "rhythm" && f.slot === "duration");
  assert.ok(duration && /Remove \d+ frames/.test(duration.fix), JSON.stringify(long.findings));

  // The experiment's whole final cut, with each card's mean luminance measured from its render.
  const style = bank.loadStyle("shinbo");
  const pal = Object.fromEntries(Object.entries(style.palette).map(([k, v]) => [k, v.value]));
  const grounds = { black: pal.black, paper: pal.paper, red: pal.red };
  const film = JSON.parse(fs.readFileSync(path.join(FIXTURES, "final", "film-edl.json"), "utf8"));
  assert.equal(film.frames, 394);
  const findings = bank.checkRhythm({ fps: 30, limits: style.motion, edl: film.segments, grounds });
  // its 2-frame black between two flashes of c01 is a black flash, legitimately inside the group
  assert.ok(!findings.some((f) => /black/.test(f.measured.kind || "") && f.measured.frames === 2), JSON.stringify(findings));
  assert.deepEqual(findings.map((f) => f.message.replace(/ \(.*$/, "").replace(/;.*$/, "")).sort(), [
    "flash group at segment 18 mixes grounds paper, red, black",
    "flash group at segment 31 mixes grounds red, paper, black",
    "flash group at segment 37 has 2 flashes",
    "flash group at segment 37 mixes grounds red, black",
    "flash group at segment 7 mixes grounds black, red",
    "segment 17",
  ]);
  for (const f of findings) assert.ok(f.fix.length > 30);
  // a short black outside a group is a separator below its 4 frames
  const lone = bank.checkRhythm({ fps: 30, limits: style.motion, grounds, edl: [{ kind: "hold", frames: 20, shot: "a", ground: "black" }, { kind: "black", frames: 2, ground: "black" }, { kind: "hold", frames: 20, shot: "b", ground: "black" }] });
  assert.ok(lone.some((f) => /lasts 2 frames; black cuts last 4-14/.test(f.message)));
  // a paper giant glyph on black alternating with black every two frames: one ground, but the
  // per-card luminance flashes; reported as a cut-list approximation, not a verdict
  const strobe = Array.from({ length: 14 }, (_, i) => ({ kind: "flash", frames: 2, shot: i % 2 ? "black" : "c01", ground: "black", luminance: i % 2 ? 0.0035 : 0.2 }));
  const rate = bank.checkRhythm({ fps: 30, limits: style.motion, edl: strobe, grounds });
  const flash = rate.find((f) => f.slot === "flash-rate");
  assert.ok(flash && flash.measured.flashesInOneSecond > 3, JSON.stringify(rate));
  assert.match(flash.message, /approximation/);
  assert.match(flash.message, /encoded-film check is authoritative/);
  assert.doesNotMatch(flash.message, /WCAG/);
  assert.ok(!bank.checkRhythm({ fps: 30, limits: style.motion, edl: strobe.map((seg) => ({ ...seg, luminance: undefined })), grounds }).some((f) => f.slot === "flash-rate"), "ground tones alone do not see it");
});

// ---- browser check: acceptance on the experiment ---------------------------------------------

// On the GitHub Ubuntu runner text-occluded reads ~15% of some texts hidden that read under 1%
// locally (with the same headless shell); tracked in #305. Skipped there until that is understood.
const CI_SKIP = process.env.GITHUB_ACTIONS === "true" && "text-occluded differs on the CI runner (#305)";

test("browser check: the first pass's known problems are found, the final passes, and f03 is not a false collage hit", { skip: BROWSER.skip || CI_SKIP, timeout: 900000 }, async () => {
  const browser = await pageCheck.launch({ puppeteerModule: BROWSER.puppeteerModule, chrome: BROWSER.chrome });
  const run = (file) => pageCheck.checkPage({ file: path.join(FIXTURES, file), browser });
  try {
    const first = {};
    for (const name of ["poster", "card-c04-black-vertical", "card-c11-teal-repeat", "game-codex", "web-home", "web-nights"]) first[name] = await run(`first-pass/${name}.html`);
    // c04: the long vertical line ran off the bottom
    assert.deepEqual(byRule(first["card-c04-black-vertical"]), ["off-canvas:l2"]);
    assert.match(first["card-c04-black-vertical"].findings[0].fix, /Move l2 up by 400px|split it into another line or column/);
    // poster: the key sticker over the tagline, the reading and the title; credits on the screentone
    assert.deepEqual(byRule(first.poster), ["collage-cover:ruby", "collage-cover:tag1", "collage-cover:tag2", "collage-cover:title", "contrast:cr"]);
    assert.ok(first.poster.findings.every((f) => f.rule !== "collage-cover" || /met-key-b/.test(f.layer)));
    // the 13 contrast findings: 12 measured as contrast, the poster tagline's as the key on it
    const contrast = Object.values(first).flatMap((r) => r.findings.filter((f) => f.rule === "contrast").map((f) => f.slot));
    assert.deepEqual(contrast.sort(), ["cr", "h1r", "r1st", "r2st", "r3", "r3st", "r4st", "r5st", "r6st", "r7st", "sid", "span:故事简介"]);
    const h1r = first["web-nights"].findings.find((f) => f.slot === "h1r");
    assert.ok(h1r.measured.ratio < 4.5 && h1r.measured.ratio > 4.4, JSON.stringify(h1r.measured));
    assert.match(h1r.fix, /24px or more/);
    for (const report of Object.values(first)) for (const f of report.findings) assert.ok(f.fix && f.fix.length > 30, `${f.rule} ${f.slot} has a fix`);

    // final: passes every rule the experiment knew; the new glyph rule finds the codex's per-glyph fallback
    const finals = ["poster", "card-c01-black-onechar", "card-c03-red-onechar", "card-c04-black-vertical", "card-c07-black-crop", "card-c08-white-vertical-ja", "card-c11-teal-repeat", "film-f03-key-red", "web-home", "web-nights", "game-codex"];
    const final = {};
    for (const name of finals) final[name] = await run(`final/${name}.html`);
    for (const name of finals.filter((n) => n !== "game-codex")) assert.equal(final[name].status, "passed", `${name}: ${JSON.stringify(final[name].findings)}`);
    assert.deepEqual(byRule(final["game-codex"]), ["glyph-coverage:k1", "glyph-coverage:k1x", "glyph-coverage:k2", "glyph-coverage:k3x"]);
    assert.ok(final["game-codex"].findings.every((f) => f.measured.family === "Zen Kaku"));
    // c01, c03, c07: em boxes meet (the old check's overlaps), ink does not
    for (const [name, a, b] of [["card-c01-black-onechar", "big", "ruby"], ["card-c03-red-onechar", "big", "s"], ["card-c07-black-crop", "big", "no"]]) {
      const rows = Object.fromEntries(final[name].measured.map((m) => [m.slot, m]));
      const [p, q] = [rows[a].layoutBox, rows[b].layoutBox];
      assert.ok(Math.min(p[2], q[2]) > Math.max(p[0], q[0]) && Math.min(p[3], q[3]) > Math.max(p[1], q[1]), `${name}: ${a} and ${b} em boxes intersect`);
    }
    // f03: the key's rotated frame crosses the line; its painted pixels do not
    const f03 = final["film-f03-key-red"];
    const key = f03.collage.find((l) => /met-key-b/.test(l.id));
    const line = f03.measured.find((m) => m.slot === "s");
    assert.ok(key.frame[0] < line.inkBox[2] && key.frame[3] > line.inkBox[1], "frame overlaps the text");
    assert.equal(f03.status, "passed");

    // the codex with the four strings switched whole to Noto Sans CJK SC passes
    const fixedDir = fs.mkdtempSync(path.join(os.tmpdir(), "style-pack-codex-"));
    try {
      const html = fs.readFileSync(path.join(FIXTURES, "final", "game-codex.html"), "utf8")
        .replaceAll("../assets/", `${pathToFileURL(ASSETS).href}/`)
        .replace("</style>", "[data-chk=k1],[data-chk=k2],[data-chk=k1x],[data-chk=k2x],[data-chk=k3x]{font-family:'Noto Sans CJK SC',sans-serif!important}</style>");
      fs.writeFileSync(path.join(fixedDir, "codex.html"), html);
      const fixed = await pageCheck.checkPage({ file: path.join(fixedDir, "codex.html"), browser });
      assert.equal(fixed.status, "passed", JSON.stringify(fixed.findings));
    } finally {
      fs.rmSync(fixedDir, { recursive: true, force: true });
    }
  } finally {
    await browser.close();
  }
});

// ---- browser check: adversarial pages ---------------------------------------------------------

const assetUrl = (rel) => pathToFileURL(path.join(ASSETS, rel)).href;
const ADVERSARIAL = () => `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:"Noto Serif CJK SC";font-weight:900;src:url("${assetUrl("fonts/NotoSerifCJK-Black.woff")}")}
@font-face{font-family:"Shippori B1";font-weight:800;src:url("${assetUrl("fonts/ShipporiMinchoB1-ExtraBold.woff")}")}
html,body{margin:0;width:1200px;height:800px;background:#F2EEE4;overflow:hidden}
.t{position:absolute;white-space:nowrap;line-height:1;font-family:'Noto Serif CJK SC';font-weight:900;color:#0D0B0B}
</style></head><body>
<div class="t" data-chk="big" style="left:40px;top:40px;font-size:300px">门</div>
<div class="t" data-chk="near" style="left:300px;top:300px;font-size:40px">走廊</div>
<div class="t" data-chk="hit" style="left:80px;top:420px;font-size:200px">夜</div>
<div class="t" data-chk="hit2" style="left:200px;top:500px;font-size:120px">回</div>
<div class="t" data-chk="apart" style="left:420px;top:60px;font-size:40px">回廊</div>
<img src="${assetUrl("collage/sticker-met-key-b-0.webp")}" style="position:absolute;left:760px;top:60px;width:190px;transform:rotate(45deg)">
<div class="t" data-chk="corner" style="left:690px;top:110px;font-size:40px">钥匙</div>
<img src="${assetUrl("collage/sticker-met-key-b-0.webp")}" style="position:absolute;left:820px;top:400px;width:190px;transform:rotate(90deg)">
<div class="t" data-chk="under" style="left:760px;top:600px;font-size:60px">门在身后</div>
<div class="t" data-chk="cov" style="left:20px;top:720px;font-family:'Shippori B1';font-weight:800;font-size:40px">钥匙夜</div>
<script>const d=document.createElement('div');d.className='t';d.setAttribute('data-chk','injected');d.textContent='回廊';d.style.cssText='left:1130px;top:700px;font-size:60px';document.body.appendChild(d);</script>
</body></html>`;

test("browser check measures ink, alpha, injected layers and per-glyph fallback, each with a fix", { skip: BROWSER.skip, timeout: 300000 }, async (t) => {
  const root = tempRoot(t);
  fs.writeFileSync(path.join(root, "adv.html"), ADVERSARIAL());
  const report = await pageCheck.checkPage({ file: path.join(root, "adv.html"), puppeteerModule: BROWSER.puppeteerModule, chrome: BROWSER.chrome });
  const rules = byRule(report);
  // ink touching ink fails; text near a big glyph but clear of its ink passes
  assert.ok(rules.includes("text-overlap:near") && rules.includes("text-overlap:hit2"), rules.join(" "));
  assert.ok(!rules.some((r) => r.endsWith(":apart")), rules.join(" "));
  const near = report.findings.find((f) => f.slot === "near");
  assert.match(near.fix, /Move near right by \d+px/);
  // a collage piece's frame over text is not a hit; its painted pixels are, above or under the text
  assert.ok(!rules.some((r) => r.endsWith(":corner")), rules.join(" "));
  assert.ok(rules.includes("collage-cover:under"), rules.join(" "));
  // the layer injected by script after load is checked
  assert.ok(rules.includes("off-canvas:injected") && rules.includes("collage-cover:injected"), rules.join(" "));
  // a string the first font cannot set whole
  const cov = report.findings.find((f) => f.rule === "glyph-coverage" && f.slot === "cov");
  assert.ok(cov && cov.measured.missing === "钥匙" && cov.measured.family === "Shippori B1", JSON.stringify(cov));
  for (const f of report.findings) assert.ok(f.fix.length > 30, `${f.rule} has a fix`);
});

test("template check takes hand-written SVG and HTML through the CLI", { skip: BROWSER.skip, timeout: 300000 }, (t) => {
  const root = tempRoot(t);
  fs.writeFileSync(path.join(root, "hand.svg"), `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="400" viewBox="0 0 800 400">
<rect width="800" height="400" fill="#0D0B0B"/>
<g data-chk="title"><text x="40" y="200" font-family="sans-serif" font-size="120" fill="#F2EEE4">ABC</text></g>
<text data-chk="sub" x="60" y="230" font-family="sans-serif" font-size="80" fill="#F2EEE4">XYZ</text>
<text data-chk="edge" x="700" y="380" font-family="sans-serif" font-size="60" fill="#8E0A16">WIDE</text>
</svg>`);
  const checked = cli(root, "template", "check", "hand.svg", "--chrome", BROWSER.chrome, "--puppeteer-module", BROWSER.puppeteerModule);
  assert.equal(checked.status, 2, JSON.stringify(checked.payload));
  const rules = checked.payload.findings.map((f) => `${f.rule}:${f.slot}`);
  assert.ok(rules.includes("text-overlap:sub") || rules.includes("text-overlap:title"), rules.join(" "));
  assert.ok(rules.includes("off-canvas:edge") && rules.includes("contrast:edge"), rules.join(" "));
  assert.equal(checked.payload.browser.status, "failed");

  fs.cpSync(FIXTURES, path.join(root, "fx"), { recursive: true });
  const html = cli(root, "template", "check", "fx/final/card-c07-black-crop.html", "--chrome", BROWSER.chrome, "--puppeteer-module", BROWSER.puppeteerModule);
  assert.equal(html.status, 0, JSON.stringify(html.payload));
  assert.deepEqual(html.payload.canvas, [1920, 1080]);
});

// ---- from zero: a set of cards and a poster in one round --------------------------------------

test("a new set of title cards, a poster and two UI screens rendered from the style pack pass in one round", { skip: BROWSER.skip, timeout: 900000 }, (t) => {
  const root = tempRoot(t);
  fs.cpSync(FONTS, path.join(root, "fonts"), { recursive: true });
  for (const piece of ["sticker-hollar-insects-0", "sticker-met-key-b-0", "sticker-redoute-rose-0", "sticker-met-watch-movement-0"]) fs.copyFileSync(path.join(ASSETS, "collage", `${piece}.webp`), path.join(root, `${piece}.webp`));
  const jobs = [
    ["card.onechar-bleed", { char: "门", ruby: "とびら", label: "第五夜" }, { ground: "red" }],
    ["card.episode-number", { number: "第三夜", title: "「蝴蝶标本的证词」", ja: "『蝶の標本』", en: "NOCTURNE CORRIDOR — 03" }, { ground: "black" }],
    ["card.vertical-sentence", { line0: "窗外是", line1: "另一扇", line2: "窗。", mark_char: "五", label: "第五夜" }, {}],
    ["card.bracket-quote", { quote: "门的另一边，还有门。", label: "第六夜" }, { ground: "black" }],
    ["card.giant-crop", { word: "标本", label: "第三夜" }, { ground: "paper" }],
    ["card.collide", { big: "钥匙", block: "机械植物", sub: "灰眼蝶标本的证词", ruby: "とびら" }, {}],
    ["card.void-line", { line: "——门在身后关上。", number: "05" }, {}],
    ["kv.vertical-band-corridor", { title: "蝶番馆", ruby: "よる", tag1: "窗外是另一扇窗。", tag2: "钥匙不是用来开门的。", tag_ja: "『扉の向こうに、もうひとつの扉。』", credit: "原创动画　©蝶番馆制作委员会", number: "第五夜",
      collage0: "sticker-hollar-insects-0.webp", collage1: "sticker-met-key-b-0.webp", collage2: "sticker-redoute-rose-0.webp", collage3: "sticker-met-watch-movement-0.webp" }, {}],
    ["ui.specimen-codex", { specimen: "sticker-met-key-b-0.webp", row6_state: "★", plate_id: "K-07" }, { selected: "2" }],
    ["motion.title-card-cut", {}, {}],
  ];
  for (const [id, set, params] of jobs) {
    const args = ["template", "render", id, "-o", `out/${id}.svg`, "--font-dir", "fonts", "--chrome", BROWSER.chrome, "--puppeteer-module", BROWSER.puppeteerModule];
    for (const [k, v] of Object.entries(set)) args.push("--set", `${k}=${v}`);
    for (const [k, v] of Object.entries(params)) args.push("--param", `${k}=${v}`);
    const { status, payload } = cli(root, ...args);
    assert.equal(status, 0, `${id}: ${JSON.stringify(payload?.check?.findings || payload)}`);
    assert.equal(payload.check.browser, "passed", id);
    assert.ok(payload.check.summary.browser.textUnits >= 2, id);
  }
  const poster = fs.readFileSync(path.join(root, "out", "kv.vertical-band-corridor.svg"), "utf8");
  assert.equal((poster.match(/data-collage="collage\d"/g) || []).length, 4);
});

// ---- review fixes: ground per text, occlusion, background layers, rgba, missing assets ---------

test("contrast is measured against the page with only that text hidden; covers, background images, rgba and missing files are findings", { skip: BROWSER.skip, timeout: 300000 }, async (t) => {
  const root = tempRoot(t);
  const page = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:"Noto Serif CJK SC";font-weight:900;src:url("${assetUrl("fonts/NotoSerifCJK-Black.woff")}")}
@font-face{font-family:"Collection";src:url("fonts/missing.ttc")}
html,body{margin:0;width:1200px;height:800px;background:#0D0B0B;overflow:hidden}
.t{position:absolute;white-space:nowrap;line-height:1;font-family:'Noto Serif CJK SC';font-weight:900}
</style></head><body>
<div class="t" data-chk="giant" data-grp="lock/0" data-bleed style="left:20px;top:-150px;font-size:1000px;color:#F2EEE4">I</div>
<div class="t" data-chk="pale" data-grp="lock/1" style="left:200px;top:200px;font-size:16px;color:#F2EEE4">门在</div>
<div class="t" data-chk="dark" data-grp="lock/2" style="left:200px;top:300px;font-size:16px;color:#0D0B0B">门在</div>
<div class="t" data-chk="covered" style="left:640px;top:60px;font-size:60px;color:#F2EEE4">门在身后</div>
<div style="position:absolute;left:640px;top:40px;width:150px;height:120px;background:#8E0A16" class="plate"></div>
<div class="t" data-chk="onbg" style="left:640px;top:300px;font-size:60px;color:#F2EEE4">门在身后</div>
<div style="position:absolute;left:600px;top:250px;width:200px;height:200px;background:url('${assetUrl("collage/sticker-met-key-b-0.webp")}') center/contain no-repeat"></div>
<div class="t" data-chk="faint" style="left:640px;top:600px;font-size:30px;color:rgba(242,238,228,0.3)">门在身后</div>
<div class="t" data-chk="solid" style="left:640px;top:680px;font-size:30px;color:rgb(242,238,228)">门在身后</div>
<img src="missing-piece.png" style="position:absolute;left:1000px;top:600px;width:50px;height:50px">
</body></html>`;
  fs.writeFileSync(path.join(root, "review.html"), page);
  const report = await pageCheck.checkPage({ file: path.join(root, "review.html"), puppeteerModule: BROWSER.puppeteerModule, chrome: BROWSER.chrome });
  const rules = byRule(report);
  // paper text on the paper stroke of a giant glyph fails; black text on that stroke passes
  const pale = report.findings.find((f) => f.rule === "contrast" && f.slot === "pale");
  assert.ok(pale && pale.measured.ratio < 1.5, rules.join(" "));
  assert.ok(!rules.includes("contrast:dark"), rules.join(" "));
  // a plain plate painted above text
  const covered = report.findings.find((f) => f.rule === "text-occluded" && f.slot === "covered");
  assert.ok(covered && /plate/.test(covered.measured.coveredBy) && /paint order/.test(covered.fix), rules.join(" "));
  // a background image is a collage layer
  assert.ok(report.findings.some((f) => f.rule === "collage-cover" && f.slot === "onbg" && /^bg:/.test(f.layer)), rules.join(" "));
  // translucent text is composited before the ratio is taken
  const faint = report.findings.find((f) => f.rule === "contrast" && f.slot === "faint");
  assert.ok(faint && faint.measured.alpha === 0.3, rules.join(" "));
  assert.ok(!rules.includes("contrast:solid"), rules.join(" "));
  // a missing image and a font collection in @font-face
  assert.ok(report.findings.some((f) => f.rule === "asset-missing" && f.slot === "missing-piece.png"), rules.join(" "));
  assert.ok(report.findings.some((f) => f.rule === "font-collection" && /local\('Collection'\)/.test(f.fix)), rules.join(" "));
  assert.equal(report.status, "failed");
});

test("a needed browser check that cannot run or breaks is never a pass", { skip: BROWSER.skip, timeout: 300000 }, (t) => {
  const root = tempRoot(t);
  // shinbo renders need the browser: without one the render is unverified, exit 1, the SVG still written
  const render = cli(root, "template", "render", "card.void-line", "-o", "out/v.svg", "--chrome", path.join(root, "no-chrome"), "--puppeteer-module", BROWSER.puppeteerModule);
  assert.equal(render.status, 1, JSON.stringify(render.payload));
  assert.equal(render.payload.error.code, "TOOL_MISSING");
  assert.equal(render.payload.error.details.status, "unverified");
  assert.ok(fs.existsSync(path.join(root, "out", "v.svg")));
  const check = cli(root, "template", "check", "out/v.svg", "--chrome", path.join(root, "no-chrome"), "--puppeteer-module", BROWSER.puppeteerModule);
  assert.equal(check.status, 1);
  assert.equal(check.payload.error.code, "TOOL_MISSING");
  // an Arknights render without --browser still has only the static check
  assert.equal(cli(root, "template", "render", "kv.outfit-title-left", "-o", "out/k.svg", "--chrome", path.join(root, "no-chrome")).status, 0);
  // the kernel separates "no browser" from "the check broke"
  const kernel = path.join(__dirname, "..", "skill", "tools", "template-bank", "page-check.cjs");
  const broke = spawnSync(process.execPath, [kernel, path.join(root, "absent.html"), "--chrome", BROWSER.chrome, "--puppeteer-module", BROWSER.puppeteerModule], { encoding: "utf8", timeout: 120000 });
  assert.equal(broke.status, 1);
  assert.match(broke.stderr, /^CHECK_FAILED: /);
  const none = spawnSync(process.execPath, [kernel, path.join(root, "absent.html"), "--chrome", path.join(root, "no-chrome"), "--puppeteer-module", BROWSER.puppeteerModule], { encoding: "utf8", timeout: 120000 });
  assert.match(none.stderr, /^TOOL_MISSING: /);
});

test("a system font collection is selected by family name, not embedded", { skip: fs.existsSync("/usr/share/fonts/opentype/noto/NotoSerifCJK-Black.ttc") ? false : "no Noto CJK collection installed" }, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "style-pack-ttc-"));
  try {
    fs.symlinkSync("/usr/share/fonts/opentype/noto/NotoSerifCJK-Black.ttc", path.join(dir, "NotoSerifCJK-Black.ttc"));
    fs.copyFileSync(path.join(FONTS, "ShipporiMinchoB1-ExtraBold.woff"), path.join(dir, "ShipporiMinchoB1-ExtraBold.woff"));
    const rendered = bank.render("card.onechar-bleed", { set: { char: "直" }, fontDir: dir });
    assert.doesNotMatch(rendered.svg, /@font-face[^}]*\.ttc/);
    assert.match(rendered.svg, /@font-face\{font-family:'Shippori Mincho B1'/);
    // coverage reads the collection's SC face (index 2)
    assert.equal(coverage.missingGlyphs("Noto Serif CJK SC", "直钥", { faces: rendered.fontFaces }).missing, "");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("each text run's own colour is measured, page errors and empty pages are findings, navigation away breaks the check", { skip: BROWSER.skip, timeout: 300000 }, async (t) => {
  const root = tempRoot(t);
  const opts = { puppeteerModule: BROWSER.puppeteerModule, chrome: BROWSER.chrome };
  // a marked <g> with a black fill holding white <text> on black: the text's own fill counts
  fs.writeFileSync(path.join(root, "group.svg"), `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="300">
<rect width="600" height="300" fill="#0D0B0B"/>
<g data-chk="title" fill="#0D0B0B"><text x="40" y="150" font-family="sans-serif" font-size="80" fill="#F2EEE4">ABCD</text></g>
<g data-chk="dim" fill="#F2EEE4"><text x="40" y="260" font-family="sans-serif" font-size="40" fill="#262222">EFGH</text></g></svg>`);
  const group = await pageCheck.checkPage({ file: path.join(root, "group.svg"), ...opts });
  assert.ok(!byRule(group).includes("contrast:title"), byRule(group).join(" "));
  assert.ok(byRule(group).includes("contrast:dim"), byRule(group).join(" "));
  // mixed-colour spans: the worst span decides
  fs.writeFileSync(path.join(root, "spans.html"), `<!doctype html><html><body style="margin:0;width:600px;height:200px;background:#0D0B0B">
<div data-chk="mix" style="position:absolute;left:20px;top:40px;font:700 40px sans-serif;color:#F2EEE4">ABC<span style="color:#2A2626">DEF</span></div>
<div data-chk="even" style="position:absolute;left:20px;top:120px;font:700 40px sans-serif;color:#F2EEE4">ABC<span style="color:#FFFFFF">DEF</span></div></body></html>`);
  const spans = await pageCheck.checkPage({ file: path.join(root, "spans.html"), ...opts });
  const mix = spans.findings.find((f) => f.rule === "contrast" && f.slot === "mix");
  assert.ok(mix && mix.measured.text === "#2A2626", JSON.stringify(spans.findings));
  assert.ok(!byRule(spans).includes("contrast:even"));
  // an uncaught exception
  fs.writeFileSync(path.join(root, "throws.html"), `<!doctype html><html><body style="margin:0;width:400px;height:200px"><div data-chk="t" style="font:40px sans-serif">OK</div><script>throw new Error("boom in layout")</script></body></html>`);
  const thrown = await pageCheck.checkPage({ file: path.join(root, "throws.html"), ...opts });
  const error = thrown.findings.find((f) => f.rule === "page-error");
  assert.ok(error && /boom in layout/.test(error.message) && error.fix.length > 30, JSON.stringify(thrown.findings));
  assert.equal(thrown.status, "failed");
  // no text at all fails, unless the page says it has none
  fs.writeFileSync(path.join(root, "empty.html"), `<!doctype html><html><body style="margin:0;width:400px;height:200px;background:#D10E1F"></body></html>`);
  const empty = await pageCheck.checkPage({ file: path.join(root, "empty.html"), ...opts });
  assert.deepEqual(byRule(empty), ["no-text-measured:page"]);
  fs.writeFileSync(path.join(root, "blank.html"), `<!doctype html><html data-no-text><body style="margin:0;width:400px;height:200px;background:#D10E1F"></body></html>`);
  assert.equal((await pageCheck.checkPage({ file: path.join(root, "blank.html"), ...opts })).status, "passed");
  // a page that navigates away is not measured: the kernel reports CHECK_FAILED (KERNEL_FAILED in the CLI)
  fs.writeFileSync(path.join(root, "away.html"), `<!doctype html><html><body style="margin:0;width:400px;height:200px"><div data-chk="t" style="font:40px sans-serif">OK</div><script>setTimeout(() => { location.href = "about:blank"; }, 300)</script></body></html>`);
  const away = cli(root, "template", "check", "away.html", "--chrome", BROWSER.chrome, "--puppeteer-module", BROWSER.puppeteerModule);
  assert.equal(away.status, 1, JSON.stringify(away.payload));
  assert.equal(away.payload.error.code, "KERNEL_FAILED");
});

"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const { execFile, spawnSync } = require("node:child_process");
const { pathToFileURL } = require("node:url");
const { resolvePuppeteer, resolveChrome } = require("../skill/scripts/film-capture-core.cjs");
const { decodePng } = require("../skill/scripts/png-core.cjs");
const { piecesScript } = require("../skill/tools/ascii-art/scaffold.cjs");
const AsciiArt = require("../skill/tools/ascii-art/ascii-art.js");
const PRESETS = require("../skill/tools/ascii-art/presets.js");

const repo = path.resolve(__dirname, "..");
const cli = path.join(repo, "skill/scripts/designer-pipeline.cjs");
const tool = path.join(repo, "skill/tools/ascii-art");
const vendor = path.join(repo, "skill/vendor/ascii-rest");
const manifest = JSON.parse(fs.readFileSync(path.join(vendor, "manifest.json"), "utf8"));
const upstream = path.join(vendor, manifest.snapshot.root);
const SCAFFOLD_FILES = ["LICENSE.ascii-rest", "LICENSE.font", "ascii-art.js", "font.js", "index.html", "pieces.js", "presets.js"];

const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const walk = (directory, base = "") => fs.readdirSync(directory, { withFileTypes: true })
  .flatMap((entry) => entry.isDirectory() ? walk(path.join(directory, entry.name), `${base}${entry.name}/`) : [`${base}${entry.name}`]);
const vendoredPiece = (slug) => ({ source: fs.readFileSync(path.join(upstream, `dist/pieces/${slug}.js`), "utf8") });
// One frame as the reader sees it: the text and, for a coloured frame, every cell's palette index.
const fingerprint = (frame) => sha256(Buffer.concat([Buffer.from(frame.text), Buffer.from(frame.color || [])]));
// How many drawn (non-space) cells each colour covers in a frame: a cell's palette entry when the
// frame carries colour, or else the preset's ink, the one colour a <pre> draws text in.
function drawnColours(frame, palette, ink) {
  const counts = new Map();
  let drawn = 0;
  for (let k = 0, cell = 0; k < frame.text.length; k++) {
    const char = frame.text[k];
    if (char === "\n") continue;
    if (char !== " ") {
      const colour = frame.color ? palette[frame.color[cell]] : ink;
      counts.set(colour, (counts.get(colour) || 0) + 1);
      drawn++;
    }
    cell++;
  }
  return { drawn, counts };
}
const isScene = (slug) => manifest.pieces.find((entry) => entry.slug === slug).coloured;

function scaffold(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ascii-art-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const project = path.join(root, "project");
  fs.mkdirSync(project);
  const args = [cli, "composition", "scaffold", "--root", project, "--template", "ascii-art", "--output", "ascii", "--json"];
  const result = spawnSync(process.execPath, args, { cwd: root, encoding: "utf8", windowsHide: true });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  return { root, project, directory: path.join(project, "ascii"), args, output: JSON.parse(result.stdout) };
}

function browserTools() {
  try {
    resolvePuppeteer(repo, process.env.DESIGN_PIPELINE_PUPPETEER_MODULE);
    const puppeteerModule = process.env.DESIGN_PIPELINE_PUPPETEER_MODULE ? path.resolve(process.env.DESIGN_PIPELINE_PUPPETEER_MODULE) : require.resolve("puppeteer-core", { paths: [repo] });
    return { chrome: resolveChrome(), puppeteerModule };
  } catch (error) {
    if (error.code !== "TOOL_MISSING") throw error;
    return { skip: `browser is unavailable: ${error.message}` };
  }
}
const BROWSER = browserTools();

test("vendored ascii.rest 0.4.0 bytes match manifest.json and keep the MIT notice", () => {
  const files = walk(upstream).sort((left, right) => left.localeCompare(right, "en"));
  const records = files.map((file) => {
    const bytes = fs.readFileSync(path.join(upstream, file));
    return { path: file, bytes: bytes.length, sha256: sha256(bytes) };
  });
  assert.deepEqual(records, manifest.files, "every vendored file is listed with its exact size and hash, and nothing else is vendored");
  assert.equal(records.length, manifest.snapshot.fileCount);
  assert.equal(records.reduce((sum, record) => sum + record.bytes, 0), manifest.snapshot.byteCount);
  assert.equal(sha256(records.map((record) => `${record.path}\0${record.sha256}\n`).join("")), manifest.snapshot.treeSha256);

  const pkg = JSON.parse(fs.readFileSync(path.join(upstream, "package.json"), "utf8"));
  assert.deepEqual([pkg.name, pkg.version, pkg.license], [manifest.source.package, manifest.source.version, manifest.source.license]);
  assert.equal(manifest.source.version, "0.4.0");
  assert.match(manifest.source.revision, /^1848fa5[0-9a-f]{33}$/);
  assert.ok(manifest.source.aliases.some((alias) => alias.repository === "https://github.com/2233admin/ascii" && alias.revision === manifest.source.revision), "the fork is recorded at the same revision");
  const license = fs.readFileSync(path.join(upstream, "LICENSE"), "utf8");
  assert.match(license, /^MIT License/);
  assert.match(license, /Copyright \(c\) 2026 bas3line/);
  assert.match(license, /The above copyright notice and this permission notice shall be included in all\s+copies or substantial portions of the Software\./);
  for (const { slug } of manifest.pieces) assert.ok(files.includes(`dist/pieces/${slug}.js`), `${slug} is vendored`);
});

test("manifest piece records match each module and its call-history behaviour", async () => {
  for (const entry of manifest.pieces) {
    const piece = await AsciiArt.loadPiece(vendoredPiece(entry.slug), entry.slug);
    const { meta } = piece;
    assert.deepEqual([meta.category, Boolean(meta.palette)], [entry.category, entry.coloured], entry.slug);
    // Played call by call at its own rate, versus a fresh piece asked for the same moment.
    const frameAt = (frame, time, color) => fingerprint({ text: frame(time, { color }), color });
    const played = piece.default({}), color = meta.palette ? new Uint8Array(meta.cols * meta.rows) : undefined;
    let sequential;
    for (let k = 0; k <= 2 * meta.fps; k++) sequential = frameAt(played, k / meta.fps, color);
    const fresh = frameAt(piece.default({}), 2, meta.palette ? new Uint8Array(meta.cols * meta.rows) : undefined);
    assert.equal(sequential === fresh, entry.history === "none", `${entry.slug} history is ${entry.history}`);
  }
  assert.deepEqual(new Set(manifest.pieces.map((entry) => entry.history)), new Set(Object.keys(manifest.history)));
});

test("ascii-art scaffold writes a self-contained project with the exact vendored pieces", (t) => {
  const { directory, args, output } = scaffold(t);
  assert.equal(output.status, "scaffolded");
  assert.equal(output.template, "ascii-art");
  assert.deepEqual(fs.readdirSync(directory).sort(), SCAFFOLD_FILES);
  for (const [source, destination] of [["study.html", "index.html"], ["ascii-art.js", "ascii-art.js"], ["presets.js", "presets.js"]]) {
    assert.equal(sha256(fs.readFileSync(path.join(directory, destination))), sha256(fs.readFileSync(path.join(tool, source))), destination);
  }
  assert.equal(sha256(fs.readFileSync(path.join(directory, "LICENSE.ascii-rest"))), manifest.files.find((file) => file.path === "LICENSE").sha256);
  assert.equal(sha256(fs.readFileSync(path.join(directory, "LICENSE.font"))), sha256(fs.readFileSync(path.join(tool, "fonts/OFL.txt"))));
  assert.ok(fs.readFileSync(path.join(directory, "font.js")).every((byte) => byte < 0x80), "font.js is ASCII");
  const font = require(path.join(directory, "font.js"));
  const woff = fs.readFileSync(path.join(tool, "fonts/JetBrainsMono-ascii-art.woff"));
  assert.deepEqual(Buffer.from(font.source.replace(/^data:font\/woff;base64,/, ""), "base64"), woff, "font.js embeds the bundled subset");
  assert.equal(font.sha256, sha256(woff));

  const bundle = fs.readFileSync(path.join(directory, "pieces.js"));
  assert.ok(bundle.every((byte) => byte < 0x80), "pieces.js is ASCII, so a file:// page decodes it under any charset");
  const pieces = require(path.join(directory, "pieces.js"));
  assert.deepEqual(Object.keys(pieces), manifest.pieces.map((entry) => entry.slug));
  for (const [slug, entry] of Object.entries(pieces)) {
    const record = manifest.files.find((file) => file.path === `dist/pieces/${slug}.js`);
    assert.equal(sha256(Buffer.from(entry.source, "utf8")), record.sha256, `${slug} source is the vendored file`);
    assert.equal(entry.sha256, record.sha256);
  }
  for (const preset of require(path.join(directory, "presets.js"))) assert.ok(pieces[preset.piece], `${preset.name} plays a copied piece`);

  fs.writeFileSync(path.join(directory, "index.html"), "authored work");
  assert.equal(spawnSync(process.execPath, args, { encoding: "utf8", windowsHide: true }).status, 1);
  assert.equal(fs.readFileSync(path.join(directory, "index.html"), "utf8"), "authored work");
});

test("a changed vendored piece stops the scaffold instead of shipping altered art", (t) => {
  const copy = fs.mkdtempSync(path.join(os.tmpdir(), "ascii-rest-vendor-"));
  t.after(() => fs.rmSync(copy, { recursive: true, force: true }));
  fs.cpSync(vendor, copy, { recursive: true });
  assert.match(piecesScript(copy), /"donut": \{ file: "dist\/pieces\/donut\.js"/);
  const donut = path.join(copy, "upstream/dist/pieces/donut.js");
  fs.writeFileSync(donut, fs.readFileSync(donut, "utf8").replace(".,-~:;=!*#$@", "@$#*!=;:~-,."));
  assert.throws(() => piecesScript(copy), /dist\/pieces\/donut\.js does not match manifest\.json/);
});

test("every preset gives the same frame for the same time after cold, repeated and reordered seeks", async (t) => {
  const { directory } = scaffold(t);
  const player = require(path.join(directory, "ascii-art.js"));
  const presets = player.checkPresets(require(path.join(directory, "presets.js")));
  const pieces = require(path.join(directory, "pieces.js"));
  for (const preset of presets) {
    const piece = await player.loadPiece(pieces[preset.piece], preset.piece);
    const times = [0, 1, 2.5, 4];
    const cold = times.map((time) => fingerprint(player.createFrames(piece, preset).at(time)));
    assert.equal(new Set(cold).size, times.length, `${preset.name} moves between ${times.join(", ")} s`);
    const frames = player.createFrames(piece, preset);
    for (const time of [4, 1, 1, 0, 2.5, 1, 4]) {
      assert.equal(fingerprint(frames.at(time)), cold[times.indexOf(time)], `${preset.name} at ${time} s after other seeks`);
    }
  }
});

test("a seek into doom fire shows the fire as played, not a fresh piece's frozen first moment", async () => {
  const preset = PRESETS.find((item) => item.name === "doom-fire");
  const piece = await AsciiArt.loadPiece(vendoredPiece("doom-fire"), "doom-fire");
  const fresh = (time) => piece.default({})(time, {});
  assert.equal(fresh(1), fresh(2), "upstream doom fire advances only by the clamped time since its previous call");

  const played = piece.default({});
  let text;
  for (let k = 0; k <= 2 * preset.fps; k++) text = played(k / preset.fps, {});
  const seeked = AsciiArt.createFrames(piece, preset);
  assert.equal(seeked.at(2).text, text, "a cold seek equals live playback at the preset's rate");
  assert.notEqual(seeked.at(1).text, text, "a backward seek shows the earlier fire");
  assert.equal(seeked.at(2).text, text);
});

// The default look is coloured glyphs: a scene in its own palette, a text piece in its preset's
// paint. Two colours on stray cells would pass a bare count, so each colour counted covers at least
// 2% of the drawn cells.
test("in colour, the default, every preset draws at least three palette colours among its drawn cells mid-sequence", async () => {
  const flat = [], unpainted = new Map();
  for (const preset of PRESETS) {
    const piece = await AsciiArt.loadPiece(vendoredPiece(preset.piece), preset.piece);
    const frames = AsciiArt.createFrames(piece, preset);
    const palette = frames.palette || piece.meta.palette;
    const time = preset.duration / 2;
    const { drawn, counts } = drawnColours(frames.at(time), palette, preset.ink);
    const shown = [...counts].filter(([, cells]) => cells >= 0.02 * drawn);
    if (shown.length < 3) flat.push(`${preset.name} at ${time}s: ${shown.length} colour(s) on 2% or more of ${drawn} drawn cells (${[...counts].map(([colour, cells]) => `${colour} ×${cells}`).join(", ")})`);
    // A text preset's palette starts with its ink, the colour of a cell no paint rule holds; every
    // glyph a shipped preset draws in its duration is held by a rule.
    if (isScene(preset.piece) || !frames.palette) continue;
    for (let k = 0; k < preset.duration * preset.fps; k++) {
      const frame = frames.at(k / preset.fps);
      for (let i = 0, cell = 0; i < frame.text.length; i++) {
        if (frame.text[i] === "\n") continue;
        const char = frame.text[i];
        if (char !== " " && frame.color[cell] === 0 && !unpainted.has(preset.name + char)) unpainted.set(preset.name + char, `${preset.name} draws ${JSON.stringify(char)} at ${frame.time}s`);
        cell++;
      }
    }
  }
  assert.deepEqual(flat, []);
  assert.deepEqual([...unpainted.values()], [], "no drawn glyph falls back to the ink");
});

test("mono draws a text preset as the same text in one ink, by preset field or by option, and a scene refuses it", async () => {
  for (const preset of PRESETS) {
    const piece = await AsciiArt.loadPiece(vendoredPiece(preset.piece), preset.piece);
    if (isScene(preset.piece)) {
      assert.throws(() => AsciiArt.createFrames(piece, preset, { mono: true }), /coloured scene with no one-ink form/, preset.name);
      assert.throws(() => AsciiArt.createFrames(piece, { ...preset, mono: true }), /coloured scene with no one-ink form/, preset.name);
      continue;
    }
    const colour = AsciiArt.createFrames(piece, preset);
    assert.equal(colour.coloured, true, `${preset.name} is coloured by default`);
    for (const mono of [AsciiArt.createFrames(piece, preset, { mono: true }), AsciiArt.createFrames(piece, AsciiArt.checkPreset({ ...preset, mono: true }))]) {
      assert.deepEqual([mono.coloured, mono.palette], [false, null], `${preset.name} mono has no palette`);
      for (const time of [1, preset.duration / 2]) {
        const frame = mono.at(time);
        assert.equal(frame.color, undefined, `${preset.name} at ${time}s carries no colour`);
        assert.deepEqual([...drawnColours(frame, null, preset.ink).counts.keys()], [preset.ink], `${preset.name} at ${time}s draws one ink`);
        assert.equal(frame.text, colour.at(time).text, `${preset.name} at ${time}s draws the same text in both modes`);
      }
    }
    assert.equal(AsciiArt.createFrames(piece, { ...preset, mono: true }, { mono: false }).coloured, true, "the option overrides the preset field");
  }
});

test("presets that disagree with the table's fields or with their piece are refused", async () => {
  const donut = PRESETS.find((preset) => preset.name === "donut");
  assert.throws(() => AsciiArt.checkPresets([donut, { ...donut }]), /preset name "donut" is used twice/);
  assert.throws(() => AsciiArt.checkPreset({ ...donut, foreground: "#ffffff" }), /unknown field "foreground"/);
  assert.throws(() => AsciiArt.checkPreset({ ...donut, ink: "white" }), /ink must be a #rrggbb colour/);
  assert.throws(() => AsciiArt.checkPreset({ ...donut, fps: 0 }), /fps must be more than 0/);
  assert.throws(() => AsciiArt.checkPreset({ ...donut, duration: 600 }), /replays at most 3600 frames/);
  assert.throws(() => AsciiArt.checkPreset({ ...donut, mono: "yes" }), /mono must be true or false/);
  const rule = donut.paint[0];
  for (const [paint, message] of [
    [[], /paint must be a non-empty array/],
    [[{ ...rule, shade: 1 }], /paint rule 1 has an unknown field "shade"/],
    [[{ ...rule, colours: ["red"] }], /colours must be a non-empty array of #rrggbb/],
    [[{ ...rule, glyphs: ".,-~:;=!*#$@" }], /glyphs must be a non-empty array of non-empty strings/],
    [[{ ...rule, glyphs: [".,", ",-", ":;", "=!", "*#", "$@"] }], /glyph "," is listed twice/],
    [[{ ...rule, glyphs: rule.glyphs.slice(1) }], /glyphs and colours need the same length/],
    [[{ colours: ["#ffffff", "#000000"] }], /2 colours need by/],
    [[{ by: "depth", colours: ["#ffffff", "#000000"] }], /by must be "glyph", "row", "column"/],
    [[{ rows: [0, 22], colours: ["#ffffff"] }], /rows must be \[first, last\] with 0 ≤ first ≤ last < 22/],
  ]) assert.throws(() => AsciiArt.checkPreset({ ...donut, paint }), message);
  const piece = await AsciiArt.loadPiece(vendoredPiece("donut"), "donut");
  assert.throws(() => AsciiArt.createFrames(piece, { ...donut, cols: 41 }), /says 41x22 but piece "donut" draws 40x22/);
  assert.throws(() => AsciiArt.createFrames(piece, donut).at(-1), /finite number of seconds/);
  const { paint, ...unpainted } = donut;
  assert.throws(() => AsciiArt.createFrames(piece, unpainted), /preset "donut" has no paint rules for text piece "donut"; add paint, or mono: true/);
  assert.equal(AsciiArt.createFrames(piece, { ...unpainted, mono: true }).coloured, false, "an unpainted text preset may be mono");
  const many = Array.from({ length: 64 }, (_, i) => `#0000${i.toString(16).padStart(2, "0")}`);
  assert.throws(() => AsciiArt.createFrames(piece, { ...donut, paint: [{ by: "row", colours: many }] }), /paints in 65 colours with its ink; at most 64/);
  const coast = PRESETS.find((preset) => preset.name === "night-coast");
  const scene = await AsciiArt.loadPiece(vendoredPiece("night-coast"), "night-coast");
  assert.throws(() => AsciiArt.createFrames(scene, { ...coast, paint }), /piece "night-coast" colours its own cells; remove paint/);
});

test("the scaffolded page plays offline from file:// and redraws the same frame for the same time", { skip: BROWSER.skip }, async (t) => {
  const { directory } = scaffold(t);
  const puppeteer = require(BROWSER.puppeteerModule);
  // No --allow-file-access-from-files: the page must work as a person opening index.html gets it.
  const browser = await puppeteer.launch({ executablePath: BROWSER.chrome, headless: true });
  const errors = [], remote = [];
  try {
    const open = async (suffix, motion = "reduce") => {
      const page = await browser.newPage();
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
      page.on("request", (request) => { if (!/^(file|data):/.test(request.url())) remote.push(request.url()); });
      await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: motion }]);
      await page.setViewport({ width: 960, height: 540 });
      await page.goto(`${pathToFileURL(path.join(directory, "index.html")).href}${suffix}`, { waitUntil: "load" });
      return page;
    };
    const ready = (page) => page.evaluate(() => window.asciiArt.ready.then((state) => state, (error) => ({ error: error.message })));
    const sample = (page, progress) => page.evaluate((value) => {
      const state = window.renderStudy(value);
      const picture = state.renderer === "canvas" ? document.querySelector("canvas").toDataURL() : document.querySelector("pre").textContent;
      return { state, picture, controls: getComputedStyle(document.querySelector("form")).display, playing: window.asciiArt.playing };
    }, progress);

    const donut = await open("");
    assert.equal((await ready(donut)).preset, "donut", "data-preset chooses the default");
    const forward = await sample(donut, 0.25);
    assert.deepEqual([forward.state.renderer, forward.state.time, forward.controls, forward.playing], ["canvas", 2, "none", false], "the default is coloured glyphs on the canvas");
    await sample(donut, 0.9);
    await sample(donut, 0.1);
    assert.deepEqual(await sample(donut, 0.25), forward);
    assert.notEqual((await sample(donut, 0.5)).picture, forward.picture);
    const coldDonut = await open("");
    await ready(coldDonut);
    assert.deepEqual(await sample(coldDonut, 0.25), forward);

    const mono = await open("?mono");
    assert.equal((await ready(mono)).renderer, "pre", "?mono draws the text in a <pre>");
    const text = await sample(mono, 0.25);
    const lines = text.picture.split("\n");
    assert.equal(lines.length, 22);
    assert.ok(lines.every((line) => line.length === 40));
    await sample(mono, 0.9);
    assert.deepEqual(await sample(mono, 0.25), text);
    assert.equal((await ready(await open("?mono=1#doom-fire"))).renderer, "pre", "?mono holds for a preset named by hash");
    assert.match((await ready(await open("?mono#night-coast"))).error, /coloured scene with no one-ink form/);
    assert.match((await ready(await open("?mono=no"))).error, /\?mono=no is not understood/);

    const colour = await open("#night-coast");
    assert.equal((await ready(colour)).renderer, "canvas");
    const night = await sample(colour, 0.25);
    await sample(colour, 1);
    await sample(colour, 0);
    assert.deepEqual(await sample(colour, 0.25), night);
    assert.notEqual((await sample(colour, 0.75)).picture, night.picture);
    const coldColour = await open("#night-coast");
    await ready(coldColour);
    assert.equal((await sample(coldColour, 0.25)).picture, night.picture);

    const query = await open("?preset=doom-fire");
    assert.equal((await ready(query)).preset, "doom-fire");

    const unknown = await open("#nope");
    assert.match((await ready(unknown)).error, /unknown preset "nope"/);
    assert.match(await unknown.evaluate(() => document.querySelector("[data-ascii-status]").hidden ? "" : document.querySelector("[data-ascii-status]").textContent), /unknown preset "nope"/);
    await assert.rejects(unknown.evaluate(() => window.renderStudy(0.5)), /unknown preset "nope"/);

    const live = await open("", "no-preference");
    await ready(live);
    await live.evaluate(() => new Promise((resolve) => setTimeout(resolve, 400)));
    assert.equal(await live.evaluate(() => window.asciiArt.playing), true, "the live preview plays for a viewer without a reduced-motion preference");
    assert.ok(await live.evaluate(() => window.__timelines["ascii-art"].time()) > 0);
    const still = await open("");
    await ready(still);
    await still.evaluate(() => new Promise((resolve) => setTimeout(resolve, 400)));
    assert.deepEqual(await still.evaluate(() => [window.asciiArt.playing, window.__timelines["ascii-art"].time(), document.querySelector("button[name=play]").textContent]), [false, 0, "Play anyway"]);
    assert.equal((await sample(live, 0.25)).picture, forward.picture, "a capture hook stops the live loop and draws the asked time");

    assert.deepEqual(remote, [], "no request leaves the project directory");
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
});

// Every row of a text preset drawn mono must be exactly cols cells wide. A host monospace font without
// a box-drawing glyph falls back to a wider face for that glyph and pushes the row past the grid.
// In colour, the default, each glyph is copied into a whole-pixel canvas cell. Each mode is checked
// to have drawn with its own renderer, so a mode that silently fell back cannot pass on nothing.
test("every preset draws each row on the cell grid, whatever monospace fonts the host has", { skip: BROWSER.skip }, async (t) => {
  const { directory } = scaffold(t);
  const puppeteer = require(BROWSER.puppeteerModule);
  const browser = await puppeteer.launch({ executablePath: BROWSER.chrome, headless: true });
  const offGrid = [];
  try {
    const page = await browser.newPage();
    await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
    await page.setViewport({ width: 1280, height: 720 });
    for (const [preset, mode] of PRESETS.flatMap((preset) => isScene(preset.piece) ? [[preset, "colour"]] : [[preset, "colour"], [preset, "mono"]])) {
      await page.goto(`${pathToFileURL(path.join(directory, "index.html")).href}?preset=${preset.name}${mode === "mono" ? "&mono" : ""}`, { waitUntil: "load" });
      const samples = await page.evaluate(async (progresses) => {
        await window.asciiArt.ready;
        return progresses.map((progress) => {
          const state = window.renderStudy(progress);
          if (state.renderer === "canvas") {
            // Coloured pieces copy each glyph into a whole-pixel cell, so the canvas is cols × rows cells.
            const canvas = document.querySelector("canvas");
            return { state, cells: [canvas.width / state.cols, canvas.height / state.rows] };
          }
          const pre = document.querySelector("pre");
          const style = getComputedStyle(pre);
          const probe = document.createElement("span");
          Object.assign(probe.style, { position: "absolute", whiteSpace: "pre", fontFamily: style.fontFamily, fontSize: style.fontSize, fontKerning: "none", fontVariantLigatures: "none" });
          probe.textContent = "0".repeat(state.cols);
          document.body.append(probe);
          const grid = probe.getBoundingClientRect().width;
          probe.remove();
          const node = pre.firstChild, range = document.createRange(), rows = [];
          let start = 0;
          for (const line of node.data.split("\n")) {
            range.setStart(node, start);
            range.setEnd(node, start + line.length);
            rows.push({ line, width: range.getBoundingClientRect().width });
            start += line.length + 1;
          }
          return { state, grid, rows };
        });
      }, [0.1, 0.45, 0.8]);
      for (const { state, grid, rows, cells } of samples) {
        const at = `${preset.name} (${mode}) at ${state.time}s`;
        if (state.renderer !== (mode === "mono" ? "pre" : "canvas")) offGrid.push(`${at}: drawn on the ${state.renderer}`);
        if (cells) {
          if (!cells.every(Number.isInteger)) offGrid.push(`${at}: canvas cell ${cells.join(" x ")} is not whole pixels`);
          continue;
        }
        if (rows.length !== preset.rows) offGrid.push(`${at}: ${rows.length} rows, expected ${preset.rows}`);
        rows.forEach(({ line, width }, row) => {
          if (Math.abs(width - grid) > 0.1) offGrid.push(`${at}: row ${row} is ${width.toFixed(2)}px, the ${preset.cols}-cell grid is ${grid.toFixed(2)}px (${JSON.stringify(line.replace(/[\x20-\x7e]/g, ""))})`);
        });
      }
    }
  } finally {
    await browser.close();
  }
  assert.deepEqual(offGrid, []);
});

// What the page puts on screen. In colour, a glyph is one palette colour over the ground, so a pixel
// it half covers or more is that colour blended toward the ground: the canvas must hold such pixels
// of at least three palette colours (shade glyphs are dithers that seldom cover a whole pixel, so an
// exact-colour count would undercount them). With ?mono, a text preset is one text node in a <pre>
// whose colour is the ink.
test("the page draws every preset in its palette colours, and a text preset with ?mono in its ink alone", { skip: BROWSER.skip }, async (t) => {
  const { directory } = scaffold(t);
  const puppeteer = require(BROWSER.puppeteerModule);
  const browser = await puppeteer.launch({ executablePath: BROWSER.chrome, headless: true });
  const wrong = [];
  const rgb = (hex) => `rgb(${[1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(", ")})`;
  try {
    const page = await browser.newPage();
    await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
    await page.setViewport({ width: 1280, height: 720 });
    const href = pathToFileURL(path.join(directory, "index.html")).href;
    for (const preset of PRESETS) {
      const piece = await AsciiArt.loadPiece(vendoredPiece(preset.piece), preset.piece);
      const palette = AsciiArt.createFrames(piece, preset).palette || piece.meta.palette || [];
      await page.goto(`${href}?preset=${preset.name}`, { waitUntil: "load" });
      const colour = await page.evaluate(async (colours, ground) => {
        await window.asciiArt.ready;
        const state = window.renderStudy(0.5);
        const canvas = document.querySelector("canvas");
        const data = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
        const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
        const g = rgb(ground);
        const inks = colours.map((hex) => {
          const c = rgb(hex), d = c.map((v, ch) => v - g[ch]);
          const ch = [0, 1, 2].reduce((best, k) => (Math.abs(d[k]) > Math.abs(d[best]) ? k : best), 0);
          return { hex, d, ch, pixels: 0 };
        });
        // Each pixel counts for the one colour it is nearest to being, blended toward the ground by
        // its coverage a (fixed by the channel that colour moves most): colours in line with the
        // ground, as a grey ramp is, would otherwise all claim the same pixel.
        for (let i = 0; i < data.length; i += 4) {
          if (data[i] === g[0] && data[i + 1] === g[1] && data[i + 2] === g[2]) continue;
          let best = null, score = Infinity;
          for (const ink of inks) {
            const a = ink.d[ink.ch] ? (data[i + ink.ch] - g[ink.ch]) / ink.d[ink.ch] : 0;
            if (a < 0.5 || a > 1.02) continue;
            const off = Math.max(Math.abs(data[i] - g[0] - a * ink.d[0]), Math.abs(data[i + 1] - g[1] - a * ink.d[1]), Math.abs(data[i + 2] - g[2] - a * ink.d[2]));
            if (off <= 3 && off + 10 * Math.abs(1 - a) < score) (best = ink), (score = off + 10 * Math.abs(1 - a));
          }
          if (best) best.pixels++;
        }
        return { state, shown: inks.filter((ink) => ink.pixels >= 20).map((ink) => ink.hex) };
      }, palette, preset.ground);
      if (colour.state.renderer !== "canvas" || colour.shown.length < 3) wrong.push(`${preset.name} at ${colour.state.time}s: drawn on the ${colour.state.renderer}, ${colour.shown.length} palette colour(s) on the canvas`);
      if (isScene(preset.piece)) continue;
      await page.goto(`${href}?preset=${preset.name}&mono`, { waitUntil: "load" });
      const mono = await page.evaluate(async () => {
        await window.asciiArt.ready;
        const state = window.renderStudy(0.5);
        const pre = document.querySelector("pre");
        return { state, ink: getComputedStyle(pre).color, nodes: [...pre.childNodes].map((node) => node.nodeName), canvas: document.querySelector("canvas").hidden };
      });
      if (mono.state.renderer !== "pre" || mono.ink !== rgb(preset.ink) || mono.nodes.join() !== "#text" || !mono.canvas) wrong.push(`${preset.name} with ?mono: drawn on the ${mono.state.renderer} in ${mono.ink} as ${mono.nodes.join(", ")}`);
    }
  } finally {
    await browser.close();
  }
  assert.deepEqual(wrong, []);
});

test("the bundled font covers every character the pieces contain or draw, at one cell wide", { skip: BROWSER.skip }, async (t) => {
  const { project, directory } = scaffold(t);
  // A copy that lost its font fails rather than drawing in a host font.
  fs.cpSync(directory, path.join(project, "fontless"), { recursive: true });
  fs.rmSync(path.join(project, "fontless/font.js"));
  const characters = new Set();
  for (let code = 0x20; code < 0x7f; code++) characters.add(String.fromCharCode(code));
  for (const { slug } of manifest.pieces) for (const char of vendoredPiece(slug).source) if (char.charCodeAt(0) > 0x7e) characters.add(char);
  for (const preset of PRESETS) {
    const frames = AsciiArt.createFrames(await AsciiArt.loadPiece(vendoredPiece(preset.piece), preset.piece), preset);
    for (let k = 0; k < preset.duration * preset.fps; k++) for (const char of frames.at(k / preset.fps).text) if (char !== "\n") characters.add(char);
  }
  const puppeteer = require(BROWSER.puppeteerModule);
  const browser = await puppeteer.launch({ executablePath: BROWSER.chrome, headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(pathToFileURL(path.join(directory, "index.html")).href, { waitUntil: "load" });
    const result = await page.evaluate(async (list) => {
      await window.asciiArt.ready;
      const face = [...document.fonts].find((item) => item.family.replace(/"/g, "") === window.ASCII_ART_FONT.family);
      const context = document.createElement("canvas").getContext("2d");
      // A character the face lacks falls back to serif or sans-serif; only the face draws it 60px wide in both.
      const wide = list.filter((char) => ["serif", "sans-serif"].some((fallback) => {
        context.font = `100px "${window.ASCII_ART_FONT.family}", ${fallback}`;
        return Math.abs(context.measureText(char).width - 60) > 0.01;
      }));
      return { status: face && face.status, pre: getComputedStyle(document.querySelector("pre")).fontFamily, wide };
    }, [...characters]);
    assert.equal(result.status, "loaded");
    assert.equal(result.pre, "\"ascii-art mono\", monospace");
    assert.deepEqual(result.wide, []);

    const fontless = await browser.newPage();
    await fontless.goto(pathToFileURL(path.join(project, "fontless/index.html")).href, { waitUntil: "load" });
    assert.match(await fontless.evaluate(() => window.asciiArt.ready.then(() => "drew", (error) => error.message)), /font\.js is missing/);
    await assert.rejects(fontless.evaluate(() => window.renderStudy(0.5)), /font\.js is missing/);
  } finally {
    await browser.close();
  }
});

function runCli(args) {
  return new Promise((resolve) => {
    execFile(process.execPath, [cli, ...args, "--json"], { encoding: "utf8", windowsHide: true }, (error, stdout, stderr) => {
      let output;
      try { output = JSON.parse(stdout || stderr); } catch { output = { stdout, stderr }; }
      resolve({ status: error ? error.code : 0, output });
    });
  });
}

function serve(directory) {
  const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8" };
  const server = http.createServer((request, response) => {
    const file = path.resolve(directory, `.${decodeURIComponent(new URL(request.url, "http://127.0.0.1").pathname)}`);
    if (!file.startsWith(directory + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      response.writeHead(404);
      response.end();
      return;
    }
    response.writeHead(200, { "content-type": types[path.extname(file)] || "application/octet-stream" });
    response.end(fs.readFileSync(file));
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server)));
}

function pixels(file) {
  const png = decodePng(fs.readFileSync(file), file);
  const colours = new Map();
  for (let i = 0; i < png.data.length; i += 4) {
    const key = `#${[0, 1, 2].map((channel) => png.data[i + channel].toString(16).padStart(2, "0")).join("")}`;
    colours.set(key, (colours.get(key) || 0) + 1);
  }
  return { png, colours, total: png.width * png.height };
}

test("composition capture --seek photographs the seeked frame of the coloured default, a mono and a scene preset", { skip: BROWSER.skip }, async (t) => {
  const { project, directory } = scaffold(t);
  const capture = (target, seek, output) => runCli(["composition", "capture", "--root", project, ...target, "--seek", String(seek), "--width", "960", "--height", "540", "--output", output, "--chrome", BROWSER.chrome, "--puppeteer-module", BROWSER.puppeteerModule]);
  const shot = (output) => path.join(project, output, "screenshot.png");

  // The default preset, captured from the file as composition capture --composition opens it.
  const file = ["--composition", "ascii/index.html"];
  for (const [seek, output] of [[1, "captures/donut-1"], [2, "captures/donut-2"], [1, "captures/donut-1-again"]]) {
    const result = await capture(file, seek, output);
    assert.equal(result.status, 0, JSON.stringify(result.output));
  }
  const donut = pixels(shot("captures/donut-1"));
  const donutPreset = PRESETS.find((preset) => preset.name === "donut");
  const paint = (AsciiArt.createFrames(await AsciiArt.loadPiece(vendoredPiece("donut"), "donut"), donutPreset).palette || []).slice(1); // past the ink
  assert.ok((donut.colours.get("#101010") || 0) / donut.total < 0.97, "the ground is not the whole frame");
  assert.ok(paint.filter((colour) => (donut.colours.get(colour) || 0) > 50).length >= 3, "glyphs are drawn in at least three of the preset's paint colours");
  assert.notDeepEqual(pixels(shot("captures/donut-2")).png.data, donut.png.data, "--seek reaches the page: another time is another frame");
  assert.deepEqual(pixels(shot("captures/donut-1-again")).png.data, donut.png.data, "the same --seek gives the same pixels in a fresh browser");

  // The same preset in one ink, and a coloured scene, selected by URL from a local static server.
  const server = await serve(directory);
  t.after(() => server.close());
  const url = (query) => ["--url", `http://127.0.0.1:${server.address().port}/index.html${query}`];
  const mono = await capture(url("?preset=donut&mono"), 1, "captures/donut-mono-1");
  assert.equal(mono.status, 0, JSON.stringify(mono.output));
  const ink = pixels(shot("captures/donut-mono-1"));
  assert.ok((ink.colours.get(donutPreset.ink) || 0) > 200, "with ?mono the glyphs are drawn in the preset ink");
  assert.deepEqual(paint.filter((colour) => ink.colours.has(colour)), [], "and in none of its paint colours");

  const night = await capture(url("?preset=night-coast"), 2, "captures/night-coast-2");
  assert.equal(night.status, 0, JSON.stringify(night.output));
  const coast = pixels(shot("captures/night-coast-2"));
  const palette = (await AsciiArt.loadPiece(vendoredPiece("night-coast"), "night-coast")).meta.palette;
  const ground = (coast.colours.get("#080b12") || 0) / coast.total;
  assert.ok(ground > 0.5 && ground < 0.97, `night coast fills its ground around coloured cells (${ground})`);
  assert.ok(palette.filter((colour) => coast.colours.has(colour)).length >= 8, "cells carry the piece's own palette");

  const unknown = await capture(url("?preset=nope"), 2, "captures/nope");
  assert.equal(unknown.status, 1, "a capture of a page that cannot draw fails");
  assert.match(unknown.output.error.message, /unknown preset "nope"/);
  assert.equal(fs.existsSync(shot("captures/nope")), false);

  // A copy that lost its player still fails rather than photographing an empty page.
  fs.cpSync(directory, path.join(project, "incomplete"), { recursive: true });
  fs.rmSync(path.join(project, "incomplete/ascii-art.js"));
  const incomplete = await capture(["--composition", "incomplete/index.html"], 1, "captures/incomplete");
  assert.equal(incomplete.status, 1);
  assert.match(incomplete.output.error.message, /ascii-art did not start/);
  assert.equal(fs.existsSync(shot("captures/incomplete")), false);
});

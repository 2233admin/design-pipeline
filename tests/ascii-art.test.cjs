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
// One frame as the reader sees it: the text and, for a coloured piece, every cell's palette index.
const fingerprint = (frame) => sha256(Buffer.concat([Buffer.from(frame.text), Buffer.from(frame.color || [])]));

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

test("presets that disagree with the table's fields or with their piece are refused", async () => {
  const donut = PRESETS.find((preset) => preset.name === "donut");
  assert.throws(() => AsciiArt.checkPresets([donut, { ...donut }]), /preset name "donut" is used twice/);
  assert.throws(() => AsciiArt.checkPreset({ ...donut, foreground: "#ffffff" }), /unknown field "foreground"/);
  assert.throws(() => AsciiArt.checkPreset({ ...donut, ink: "white" }), /ink must be a #rrggbb colour/);
  assert.throws(() => AsciiArt.checkPreset({ ...donut, fps: 0 }), /fps must be more than 0/);
  assert.throws(() => AsciiArt.checkPreset({ ...donut, duration: 600 }), /replays at most 3600 frames/);
  const piece = await AsciiArt.loadPiece(vendoredPiece("donut"), "donut");
  assert.throws(() => AsciiArt.createFrames(piece, { ...donut, cols: 41 }), /says 41x22 but piece "donut" draws 40x22/);
  assert.throws(() => AsciiArt.createFrames(piece, donut).at(-1), /finite number of seconds/);
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

    const mono = await open("");
    assert.equal((await ready(mono)).preset, "donut", "data-preset chooses the default");
    const forward = await sample(mono, 0.25);
    assert.deepEqual([forward.state.renderer, forward.state.time, forward.controls, forward.playing], ["pre", 2, "none", false]);
    const lines = forward.picture.split("\n");
    assert.equal(lines.length, 22);
    assert.ok(lines.every((line) => line.length === 40));
    await sample(mono, 0.9);
    await sample(mono, 0.1);
    assert.deepEqual(await sample(mono, 0.25), forward);
    assert.notEqual((await sample(mono, 0.5)).picture, forward.picture);
    const coldMono = await open("");
    await ready(coldMono);
    assert.deepEqual(await sample(coldMono, 0.25), forward);

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

// Every row of a mono piece must be exactly cols cells wide. A host monospace font without a
// box-drawing glyph falls back to a wider face for that glyph and pushes the row past the grid.
test("every preset draws each row on the cell grid, whatever monospace fonts the host has", { skip: BROWSER.skip }, async (t) => {
  const { directory } = scaffold(t);
  const puppeteer = require(BROWSER.puppeteerModule);
  const browser = await puppeteer.launch({ executablePath: BROWSER.chrome, headless: true });
  const offGrid = [];
  try {
    const page = await browser.newPage();
    await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
    await page.setViewport({ width: 1280, height: 720 });
    for (const preset of PRESETS) {
      await page.goto(`${pathToFileURL(path.join(directory, "index.html")).href}?preset=${preset.name}`, { waitUntil: "load" });
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
        const at = `${preset.name} at ${state.time}s`;
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

test("composition capture --seek photographs the seeked frame of a mono and a coloured preset", { skip: BROWSER.skip }, async (t) => {
  const { project, directory } = scaffold(t);
  const capture = (target, seek, output) => runCli(["composition", "capture", "--root", project, ...target, "--seek", String(seek), "--width", "960", "--height", "540", "--output", output, "--chrome", BROWSER.chrome, "--puppeteer-module", BROWSER.puppeteerModule]);
  const shot = (output) => path.join(project, output, "screenshot.png");

  // The default mono preset, captured from the file as composition capture --composition opens it.
  const file = ["--composition", "ascii/index.html"];
  for (const [seek, output] of [[1, "captures/donut-1"], [2, "captures/donut-2"], [1, "captures/donut-1-again"]]) {
    const result = await capture(file, seek, output);
    assert.equal(result.status, 0, JSON.stringify(result.output));
  }
  const donut = pixels(shot("captures/donut-1"));
  const donutInk = PRESETS.find((preset) => preset.name === "donut").ink;
  assert.ok((donut.colours.get("#101010") || 0) / donut.total < 0.97, "the ground is not the whole frame");
  assert.ok((donut.colours.get(donutInk) || 0) > 200, "glyphs are drawn in the preset ink");
  assert.notDeepEqual(pixels(shot("captures/donut-2")).png.data, donut.png.data, "--seek reaches the page: another time is another frame");
  assert.deepEqual(pixels(shot("captures/donut-1-again")).png.data, donut.png.data, "the same --seek gives the same pixels in a fresh browser");

  // A coloured preset selected by URL from a local static server.
  const server = await serve(directory);
  t.after(() => server.close());
  const url = (query) => ["--url", `http://127.0.0.1:${server.address().port}/index.html${query}`];
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

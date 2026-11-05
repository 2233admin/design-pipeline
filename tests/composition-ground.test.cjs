"use strict";

// Text on an image, gradient or texture is judged on the pixels under it (captured with text
// hidden) at the worst 5% of its ground; text whose ground was not sampled is reported, never
// skipped.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { after, test } = require("node:test");
const { encodePng } = require("../skill/scripts/png-core.cjs");
const { resolvePuppeteer } = require("../skill/scripts/film-capture-core.cjs");
const { resolveBrowser } = require("../skill/scripts/browser-locate.cjs");
const { checkTextLegibility } = require("../skill/scripts/composition-core.cjs");
const procedural = require("../skill/tools/art-motion/procedural.cjs");

const ROOT = path.resolve(__dirname, "..");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "composition-ground-"));
after(() => fs.rmSync(tmp, { recursive: true, force: true }));

function browser() {
  try { resolvePuppeteer(ROOT, process.env.DESIGN_PIPELINE_PUPPETEER_MODULE); resolveBrowser(); return null; }
  catch (error) { if (error.code !== "TOOL_MISSING") throw error; return `browser is unavailable: ${error.message}`; }
}
const SKIP = browser();

function capture(name, body) {
  const dir = path.join(tmp, name);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "index.html"), `<!doctype html><html><head><style>html,body{margin:0;width:400px;height:240px} .t{position:absolute;font:700 40px sans-serif}</style></head><body>${body}</body></html>`);
  const args = [path.join(ROOT, "skill/scripts/capture-composition.cjs"), "--composition", path.join(dir, "index.html"), "--output", path.join(dir, "out"), "--width", "400", "--height", "240"];
  if (process.env.DESIGN_PIPELINE_PUPPETEER_MODULE) args.push("--puppeteer-module", process.env.DESIGN_PIPELINE_PUPPETEER_MODULE);
  const run = spawnSync(process.execPath, args, { cwd: ROOT, encoding: "utf8", timeout: 120000 });
  assert.equal(run.status, 0, run.stderr);
  return { dir: path.join(dir, "out"), elements: JSON.parse(fs.readFileSync(path.join(dir, "out", "elements.json"), "utf8")) };
}

// A red litho flat at three times its scan's grain: light specks under white text.
const grainy = `data:image/png;base64,${encodePng(procedural.generate("print", { profile: "litho-red", ink: "#d10e1f", paper: "none", margin: 0, edgeRoughMm: 0, pile: 0, strength: 3, width: 400, height: 240 }, 1).image).toString("base64")}`;
const flatRed = `data:image/png;base64,${encodePng({ width: 4, height: 4, data: Buffer.from(Array.from({ length: 16 }, () => [209, 14, 31, 255]).flat()) }).toString("base64")}`;

test("text on a textured image ground is judged on its worst 5%, and passes on a flat one", { skip: SKIP || false }, () => {
  const textured = capture("grainy", `<div style="position:absolute;inset:0;background:url(${grainy})"><span id="line" class="t" style="left:20px;top:90px;color:#ffffff">WHITE LINE</span></div>`);
  const item = textured.elements.items.find((i) => i.id === "#line");
  assert.equal(item.background, null);
  assert.ok(item.ground && item.ground.pixels > 1000, JSON.stringify(item.ground));
  assert.ok(fs.existsSync(path.join(textured.dir, "ground.png")));
  const findings = checkTextLegibility(textured.elements);
  const contrast = findings.find((f) => f.code === "text-contrast" && f.target === "#line");
  assert.ok(contrast, JSON.stringify(findings));
  assert.match(contrast.message, /worst 5% of its ground .* at the mean\), needs 3:1/);
  // The hidden-text screenshot shows the ground only: no white glyph pixels brighter than the specks.
  const flat = capture("flat", `<div style="position:absolute;inset:0;background:url(${flatRed}) repeat"><span id="line" class="t" style="left:20px;top:90px;color:#ffffff">WHITE LINE</span></div>`);
  const flatGround = flat.elements.items.find((i) => i.id === "#line").ground;
  assert.deepEqual(flatGround.mean, [209, 14, 31]);
  assert.equal(flatGround.luminancePercentiles[100], flatGround.luminancePercentiles[0], "glyphs are hidden from the ground");
  assert.deepEqual(checkTextLegibility(flat.elements).filter((f) => f.target === "#line"), []);
});

test("a gradient ground is sampled too; elements without a ground sample report contrast-unmeasured", { skip: SKIP || false }, () => {
  const gradient = capture("gradient", `<div style="position:absolute;inset:0;background:linear-gradient(90deg,#ffffff,#000000)"><span id="g" class="t" style="left:10px;top:90px;color:#777777">MIDGREY ON A RAMP</span></div>`);
  const item = gradient.elements.items.find((i) => i.id === "#g");
  assert.ok(item.ground, "gradient-backed text is sampled");
  assert.ok(checkTextLegibility(gradient.elements).some((f) => f.code === "text-contrast" && f.target === "#g"));
  delete item.ground;
  const unmeasured = checkTextLegibility(gradient.elements).find((f) => f.target === "#g");
  assert.deepEqual([unmeasured.code, unmeasured.severity], ["contrast-unmeasured", "warn"]);
  assert.match(unmeasured.fix, /composition capture/);
});

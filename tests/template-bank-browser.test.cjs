"use strict";

// Browser checks for the template bank. They run only where headless Chrome, puppeteer-core and
// Noto Sans / Serif CJK SC are installed, and skip otherwise.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { spawnSync } = require("node:child_process");
const measure = require("../skill/tools/template-bank/measure.cjs");
const bank = require("../skill/tools/template-bank/bank.cjs");

const REPO = path.join(__dirname, "..");
const CLI = path.join(REPO, "skill", "scripts", "designer-pipeline.cjs");
const SAMPLER = path.join(REPO, "skill", "scripts", "template-sample.cjs");

function environment() {
  let puppeteerModule = null;
  try { puppeteerModule = path.dirname(require.resolve("puppeteer-core/package.json", { paths: [REPO] })); } catch { return { skip: "puppeteer-core is not installed" }; }
  try { require("../skill/scripts/browser-locate.cjs").resolveBrowser(); } catch { return { skip: "no headless Chrome, Edge or Chromium" }; }
  const fonts = spawnSync("fc-list", [":", "family"], { encoding: "utf8" });
  if (fonts.status !== 0) return { skip: "fc-list is not available to confirm the CJK fonts" };
  for (const family of ["Noto Sans CJK SC", "Noto Serif CJK SC"]) if (!fonts.stdout.includes(family)) return { skip: `${family} is not installed` };
  return { puppeteerModule };
}
function solidPng(r, g, b, w = 64, h = 40) {
  const zlib = require("node:zlib");
  const table = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = (buf) => { let c = 0xffffffff; for (const byte of buf) c = table[(c ^ byte) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const body = Buffer.concat([Buffer.from(type), data]); const sum = Buffer.alloc(4); sum.writeUInt32BE(crc(body)); return Buffer.concat([len, body, sum]); };
  const header = Buffer.alloc(13); header.writeUInt32BE(w, 0); header.writeUInt32BE(h, 4); header[8] = 8; header[9] = 2;
  const row = Buffer.concat([Buffer.from([0]), Buffer.from(Array.from({ length: w }, () => [r, g, b]).flat())]);
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", header), chunk("IDAT", zlib.deflateSync(Buffer.concat(Array(h).fill(row)))), chunk("IEND", Buffer.alloc(0))]);
}

const env = environment();
const skip = env.skip || false;

const STRINGS = [
  "WWWW", "MMMM", "mmmmmmmm", "wwww", "iiii", "llll", "IIII", "JJJJ", "QQQQ", "ABCDEFGHIJKLMNOPQRSTUVWXYZ", "abcdefghijklmnopqrstuvwxyz",
  "0123456789", "2026.11.04", "!!!!", "@@@@", "####", "$$$$", "%%%%", "&&&&", "****", "????", "____", "~~~~", "\"\"\"\"", "''''", "````",
  "....", ",,,,", "::::", ";;;;", "||||", "////", "()[]{}", "<<<<", ">>>>", "====", "++++", "----", "€€€€", "😀😀😀😀", "👨‍👩‍👧",
  "ÄÖÜÅÉÑ", "ΩΣΦΨ", "ЖШЩЮ", "½¼¾", "™®©", "——", "···", "。。。。", "「」『』", "①②③④", "★☆★☆", "→→→→", "ｱｲｳｴ", "ＡＢＣ１２３",
  "终末之线:回声", "COLLECTION", "The Quick Brown Fox", "FEAT. <designer>", "<kw / kw / kw, ≤32>", "© <owner>", "◷ 00天00小时", "✓ 领取",
];
const SANS = "'Source Han Sans SC','Noto Sans CJK SC','Noto Sans SC',sans-serif";
const SERIF = "'Source Han Serif SC','Noto Serif CJK SC','Noto Serif SC',serif";
// Every family and weight the layouts set text in.
const FONTS = [[SANS, 400], [SANS, 500], [SANS, 700], [SANS, 900], [SERIF, 600], [SERIF, 900]].map(([family, weight]) => ({ family, weight }));

test("the width model is at least Chrome's width for every calibration string in every slot font", { skip }, () => {
  const child = spawnSync(process.execPath, [SAMPLER], { input: JSON.stringify({ mode: "widths", fonts: FONTS, strings: STRINGS, puppeteerModule: env.puppeteerModule }), encoding: "utf8", timeout: 120000 });
  assert.equal(child.status, 0, child.stderr);
  const rows = JSON.parse(child.stdout).result.rows;
  assert.equal(rows.length, FONTS.length * STRINGS.length);
  const under = rows.filter((row) => {
    const model = measure.textWidth(row.text, 100, 0, { serif: row.family === SERIF, weight: row.weight });
    return model + 0.5 < row.width;
  }).map((row) => `${row.weight} ${row.family === SERIF ? "serif" : "sans"} ${JSON.stringify(row.text)}: Chrome ${row.width.toFixed(1)} > model ${measure.textWidth(row.text, 100, 0, { serif: row.family === SERIF, weight: row.weight }).toFixed(1)}`);
  assert.deepEqual(under, []);
});

test("white text on a bright image fails contrast on sampled pixels", { skip }, (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "template-bank-browser-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.writeFileSync(path.join(root, "white.png"), solidPng(250, 250, 250));
  const run = (...args) => {
    const child = spawnSync(process.execPath, [CLI, ...args, "--root", root, "--json"], { encoding: "utf8", timeout: 180000 });
    return { status: child.status, payload: JSON.parse(child.stdout) };
  };
  const bright = run("template", "render", "cover.pv-lowerthird", "--set", "key_art=white.png", "--param", "scrim=false", "-o", "bright.svg");
  assert.equal(bright.status, 2, JSON.stringify(bright.payload));
  const finding = bright.payload.check.findings.find((f) => f.rule === "contrast" && f.slot === "title_cjk");
  assert.ok(finding && finding.measured.from === "pixels" && finding.measured.ratio < 1.5, JSON.stringify(bright.payload.check.findings));
  assert.ok(!bright.payload.check.findings.some((f) => f.rule === "contrast-unverified"));
  const scrim = bank.check(fs.readFileSync(path.join(root, "bright.svg"), "utf8"));
  assert.ok(scrim.findings.some((f) => f.rule === "contrast-unverified"), "without sampled pixels the bank API reports it unverified");
});

"use strict";

// README header: a vector80 `panel` plate whose readouts are read from the repository, so the numbers
// on the header never drift from the code. Rebuild (from this folder):
//   node readme-hero.cjs readme-hero.json
//   CHROME_PATH=... node ../../../skill/tools/template-bank/vector80.cjs readme-hero.json hero.html --png hero.png
//   python3 ../../../skill/tools/template-bank/vector80-glow.py hero.png vector80-hero.jpg --tear 720,830 --width 2400
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const ROOT = path.join(__dirname, "..", "..", "..");
const out = process.argv[2] || path.join(__dirname, "readme-hero.json");

const dirs = (d) => fs.readdirSync(path.join(ROOT, d), { withFileTypes: true }).filter((e) => e.isDirectory()).length;
const VERSION = fs.readFileSync(path.join(ROOT, "VERSION"), "utf8").trim();
const STYLES = dirs("skill/tools/template-bank/styles");
const TEMPLATES = dirs("skill/tools/template-bank/templates");
const STAGES = (fs.readFileSync(path.join(ROOT, "skill/references/stages.md"), "utf8").match(/^## Stage \d+:/gm) || []).length;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "kit-"));
const PIECES = JSON.parse(execFileSync(process.execPath, [path.join(ROOT, "examples/computed-sheets-kit/build/all.cjs")], { env: { ...process.env, COMPUTED_SHEETS_OUT: tmp } }).toString().trim().split("\n").pop()).pieces;
fs.rmSync(tmp, { recursive: true, force: true });

const spec = {
  layout: "panel",
  size: [2400, 1000],
  phosphor: { frame: "blue", text: "teal", primary: "green", secondary: "red", accent: "yellow" },
  title: "DESIGN-PIPELINE",
  panel: {
    status: ["SAY WHAT TO MAKE", "GET BACK CHECKED WORK"],
    readout: [["STYLE PACKS", String(STYLES)], ["TEMPLATES", String(TEMPLATES)], ["STAGES", `0-${STAGES - 1}`], ["KIT PIECES", String(PIECES)], ["VERSION", VERSION], ["", ""], ["LICENSE MIT", ""]],
    view: {
      type: "globe", tilt: 22, rotate: -40, unit: 40,
      traces: [
        { type: "pencil", at: [-12.5, 0], radii: [1, 1.8, 2.5, 3.1, 3.6, 4, 4.3, 4.55], phosphor: "red" },
        { type: "lissajous", A: 4.6, B: 4.6, a: 3, b: 2, phosphor: "green" },
        { type: "circle", c: [0, 0], r: 5.8, phosphor: "yellow" },
        { type: "circle", c: [9.6, 0], r: 2.4, phosphor: "teal" },
        { type: "circle", c: [9.6, 0], r: 1.2, phosphor: "yellow" },
        { type: "line", a: [7.2, 2.4], b: [12, -2.4], phosphor: "teal" },
      ],
    },
  },
  tearZone: [720, 830],
};
fs.writeFileSync(out, JSON.stringify(spec, null, 2) + "\n");
console.log(JSON.stringify({ out, STYLES, TEMPLATES, STAGES, PIECES, VERSION }));

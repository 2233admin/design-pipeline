"use strict";

// A complete direction set for tests: a small design direction library (so no test depends on the
// vendored bundle), an isolated appearance ledger, and a valid direction-preview.json with six cards,
// the thumbnail board and three full versions. Tests damage one part of it to see the matching finding.

const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { pngBytes } = require("./reference-fixtures.cjs");

const hash = (value) => crypto.createHash("sha256").update(value).digest("hex");
const COUNTS = { web: 20, ppt: 20, info: 20, app: 12, east: 12 };
const TITLES = { web: "网页风格库(20种)", ppt: "PPT风格库(20种)", info: "信息图风格库(20种)", app: "App风格库(12种)", east: "中文与东亚设计(12种)" };

// The library root with references/design-styles.md and one specimen page per style. Web style 3 is a
// 65% fidelity style; the others are 90%.
function libraryFixture(parent) {
  const root = fs.mkdtempSync(path.join(parent || os.tmpdir(), "direction-library-"));
  const lines = ["# styles", ""];
  for (const [section, count] of Object.entries(COUNTS)) {
    lines.push(`## ${TITLES[section]}`, "");
    for (let n = 1; n <= count; n += 1) {
      const slug = `${section}-style-${n}`;
      lines.push(`**Style ${section}${n} Name** \`大胆·还原${section === "web" && n === 3 ? 65 : 90}%\``, `- 样张:assets/style-specimens/${section}/${String(n).padStart(2, "0")}-${slug}.jpg`, "");
      const specimen = path.join(root, "assets", "style-specimens", section, `${String(n).padStart(2, "0")}-${slug}.html`);
      fs.mkdirSync(path.dirname(specimen), { recursive: true });
      fs.writeFileSync(specimen, `<!doctype html><title>${slug}</title>`);
    }
  }
  fs.mkdirSync(path.join(root, "references"), { recursive: true });
  fs.writeFileSync(path.join(root, "references", "design-styles.md"), lines.join("\n"));
  return root;
}

// Points the process at a fixture library and a private ledger; returns the paths and a restore.
function isolate(parent) {
  const library = libraryFixture(parent);
  const ledger = path.join(fs.mkdtempSync(path.join(parent || os.tmpdir(), "direction-ledger-")), "ledger.json");
  const before = { library: process.env.DESIGN_PIPELINE_DIRECTION_LIBRARY, ledger: process.env.DESIGN_PIPELINE_LEDGER };
  process.env.DESIGN_PIPELINE_DIRECTION_LIBRARY = library;
  process.env.DESIGN_PIPELINE_LEDGER = ledger;
  const restore = () => {
    for (const [key, value] of [["DESIGN_PIPELINE_DIRECTION_LIBRARY", before.library], ["DESIGN_PIPELINE_LEDGER", before.ledger]]) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    fs.rmSync(library, { recursive: true, force: true });
    fs.rmSync(path.dirname(ledger), { recursive: true, force: true });
  };
  return { library, ledger, restore };
}

function write(root, rel, content) {
  const file = path.join(root, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
  return { path: rel, sha256: hash(content) };
}

const AXES = [
  { luminance: "light", typeFamily: "serif", color: "warm", layout: "column", density: "low", era: "classic", material: "paper" },
  { luminance: "dark", typeFamily: "mono", color: "signal", layout: "panes", density: "high", era: "terminal", material: "screen" },
  { luminance: "mid", typeFamily: "grotesk", color: "primary", layout: "grid", density: "medium", era: "modernist", material: "print" },
];

const CARD_TEXT = { borrowed: "a 12-column grid, a 6:1 headline-to-body ratio, one accent at 5% of the area", hero: "giant type", skeleton: "split screen with the headline left", boldness: "the headline crops at the edge", contentForm: "the product's single number" };

// ids: the three full versions (ui picks free-form ids; web uses a, b, c).
function writeDirectionSet(root, { ids = ["notebook", "desk", "atlas"], medium = "web", second = 37, context = null, decision = null, names = {}, overrides = {} } = {}) {
  const roulette = (section, number, style, fidelity, extra = {}) => ({ second, section, number, style, specimen: `assets/style-specimens/${section}/${String(number).padStart(2, "0")}-${section}-style-${number}.html`, fidelity, skipped: [], ...extra });
  const board = write(root, "refs/reference-1.png", Buffer.concat([pngBytes({ width: 1200, height: 800 }), Buffer.from("board")]));
  const cards = [
    { id: "designer-1", logic: "designer", source: { name: "Experimental Jetset" }, ...CARD_TEXT },
    { id: "designer-2", logic: "designer", source: { name: "Irma Boom" }, ...CARD_TEXT },
    { id: "reference-1", logic: "reference", source: { name: "A prize-winning site", url: "https://example.com/work", seen: true, board }, ...CARD_TEXT },
    { id: "reference-2", logic: "reference", source: { name: "A second site", url: "https://example.org/other", seen: false, unseenReason: "the site blocks headless browsers" }, ...CARD_TEXT },
    { id: "roulette-1", logic: "roulette", source: roulette(medium, second % COUNTS[medium] + 1, `Style ${medium}${second % COUNTS[medium] + 1} Name`, second % COUNTS[medium] + 1 === 3 ? 65 : 90, second % COUNTS[medium] + 1 === 3 ? { degrades: "the grain becomes flat colour blocks" } : {}), ...CARD_TEXT },
    { id: "roulette-2", logic: "roulette", source: roulette("east", second % COUNTS.east + 1, `Style east${second % COUNTS.east + 1} Name`, 90), ...CARD_TEXT },
  ];
  const thumbsHtml = `<main>${cards.map((card) => `<section data-card-id="${card.id}"><h1>${card.id}</h1></section>`).join("")}</main>`;
  const thumbs = { html: write(root, "direction-previews/thumbs.html", thumbsHtml), png: write(root, "direction-previews/thumbs/screenshot.png", Buffer.concat([pngBytes({ width: 1500, height: 700 }), Buffer.from(`thumbs${second}`)])) };
  const picks = ["designer-1", "reference-1", "roulette-1"];
  const directions = ids.map((id, index) => {
    const html = `<!doctype html><title>${id}</title><style>body{background:#${["f4efe4", "101418", "e8ecf2"][index]};font-family:"${["Fraunces", "IBM Plex Mono", "Inter"][index]}",serif;color:#${["222222", "dddddd", "111111"][index]}}h1{font-size:96px}</style><h1>${id}</h1>`;
    return {
      id,
      name: names[id] || id[0].toUpperCase() + id.slice(1),
      thesis: `Thesis ${id}`,
      signature: `Signature ${id}`,
      axes: AXES[index],
      screenshot: write(root, `direction-previews/dir-${index + 1}/screenshot.png`, Buffer.concat([pngBytes({ width: 1440, height: 900 }), Buffer.from(id)])),
      html: write(root, `direction-previews/dir-${index + 1}.html`, html),
      card: picks[index],
      overdone: false,
      reasons: { alone: "holds up alone", distinct: "different skeleton and temperature", ledger: "no recent collision", restraint: "no prop or metaphor" },
    };
  });
  const receipt = {
    schema: "design-pipeline.direction-preview.v1",
    changeId: path.basename(root),
    applicability: { status: "required", reason: "open-surface" },
    medium,
    context,
    comparison: {
      brief: write(root, "direction-previews/brief.md", "# Console\n"),
      index: write(root, "direction-previews/index.html", `<main data-direction-preview>${ids.map((id) => `<section data-direction-id="${id}"></section>`).join("")}</main>`),
      viewport: { width: 1440, height: 900 },
      contentFixtureSha256: hash("fixture"),
      stateCoverage: ["default", "empty"],
    },
    cards,
    thumbs,
    directions,
    decision: decision || { status: "pending", selectedDirectionId: null, rationale: null },
  };
  const merged = { ...receipt, ...overrides };
  fs.writeFileSync(path.join(root, "direction-preview.json"), JSON.stringify(merged, null, 2));
  return merged;
}

function readReceipt(root) {
  return JSON.parse(fs.readFileSync(path.join(root, "direction-preview.json"), "utf8"));
}

function saveReceipt(root, receipt) {
  fs.writeFileSync(path.join(root, "direction-preview.json"), JSON.stringify(receipt, null, 2));
}

module.exports = { COUNTS, hash, isolate, libraryFixture, readReceipt, saveReceipt, write, writeDirectionSet };

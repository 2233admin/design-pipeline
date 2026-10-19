"use strict";

// The directions method (OpenSpec change directions-from-three-sources): six direction cards from
// three logics (a named designer, a real same-medium work seen as a captured board, a style drawn by
// the current second from the design direction library), six thumbnails, three full versions.
// direction-preview-core.cjs owns the receipt; this module owns what the cards must show:
// the library catalog, the roulette arithmetic and the findings a card set can produce.
// Every finding carries the fix that clears it.

const fs = require("node:fs");
const path = require("node:path");
const { resolveInside, sha256 } = require("./contract-utils.cjs");
const { collides, recentSources, summarizeAppearance } = require("./appearance-ledger-core.cjs");

const SCOPE = "direction preview";
const MEDIA = ["web", "ppt", "info", "app"];
const SECTIONS = [["web", /^## 网页风格库/], ["ppt", /^## PPT风格库/], ["info", /^## 信息图风格库/], ["app", /^## App风格库/], ["east", /^## 中文与东亚设计/]];
const LOGICS = ["designer", "reference", "roulette"];
const TEXT_COLUMNS = {
  borrowed: "what is borrowed, as concrete rules: the grid, the type-size ratio, the colour proportion, the image/text relation",
  hero: "the hero material: the real image, generated image, procedural texture, data picture or giant type the screen is built around",
  skeleton: "the layout skeleton in one sentence",
  boldness: "the one place the boldness goes; everything else serves the content",
  contentForm: "which part of this content the form comes from, in one sentence",
};
const REASONS = {
  alone: "good on its own: shown alone it holds up",
  distinct: "different from the other two in skeleton, temperature and appearance family",
  ledger: "not colliding with the recent deliveries in the appearance ledger",
  restraint: "not overdone: removing the prop, metaphor or maximised setting would not make the information clearer",
};
const FIDELITY_FLOOR = 70;
const SECOND_RANGE = 60;

// The vendored library's directory (PR #172): upstream layout with references/ and assets/style-specimens/.
// JPG sheets are fetched on demand with `sources fetch --bundle design-direction-library`.
const LIBRARY_DIR = "design-direction-library";
const STYLES = path.join("references", "design-styles.md");

// DESIGN_PIPELINE_DIRECTION_LIBRARY names another library root (tests, a local checkout).
function libraryRoot() {
  return process.env.DESIGN_PIPELINE_DIRECTION_LIBRARY ? path.resolve(process.env.DESIGN_PIPELINE_DIRECTION_LIBRARY) : path.resolve(__dirname, "..", "vendor", LIBRARY_DIR, "upstream");
}

const pad = (number) => String(number).padStart(2, "0");
const styleKey = (section, number) => `style:${section}/${pad(number)}`;

function parseCatalog(text) {
  const catalog = Object.fromEntries(SECTIONS.map(([id]) => [id, []]));
  let section = null;
  let entry = null;
  for (const line of text.split(/\r?\n/)) {
    if (/^## /.test(line)) {
      section = SECTIONS.find(([, pattern]) => pattern.test(line))?.[0] ?? null;
      entry = null;
      continue;
    }
    if (!section) continue;
    const head = line.match(/^\*\*(.+?)\*\*\s*`([^`]*)`/);
    if (head) {
      const fidelity = head[2].match(/还原\s*(\d+)\s*%/);
      entry = { number: catalog[section].length + 1, name: head[1].trim(), temperature: head[2].split("·")[0].trim(), fidelity: fidelity ? Number(fidelity[1]) : null, specimen: null };
      catalog[section].push(entry);
      continue;
    }
    const specimen = entry && line.match(/样张\s*[:：]\s*(\S+?)\.(?:jpg|html)\b/);
    if (specimen) entry.specimen = `${specimen[1]}.html`;
  }
  return catalog;
}

// The catalog, or null when the library is not installed.
function loadCatalog(root = libraryRoot()) {
  try {
    const catalog = parseCatalog(fs.readFileSync(path.join(root, STYLES), "utf8"));
    return SECTIONS.every(([id]) => catalog[id].length) ? catalog : null;
  } catch {
    return null;
  }
}

// The roulette: `second % count + 1` in the section, advancing past styles the ledger's recent
// deliveries used. A context-compatible pool replaces the section's whole numbering.
function draw(catalog, section, second, { pool, avoid = new Set() } = {}) {
  const entries = catalog[section];
  const unknown = (pool || []).filter((number) => !entries.some((entry) => entry.number === number));
  if (unknown.length) throw new Error(`section ${section} has no style ${unknown.join(", ")}; it numbers 1 to ${entries.length}`);
  const numbers = pool?.length ? pool : entries.map((entry) => entry.number);
  const start = second % numbers.length;
  const skipped = [];
  while (avoid.has(styleKey(section, numbers[(start + skipped.length) % numbers.length])) && skipped.length < numbers.length - 1) skipped.push(numbers[(start + skipped.length) % numbers.length]);
  const number = numbers[(start + skipped.length) % numbers.length];
  const entry = entries.find((item) => item.number === number);
  return {
    second, section, number, style: entry.name, specimen: entry.specimen, fidelity: entry.fidelity, skipped,
    ...(pool?.length ? { pool } : {}),
    ...(entry.fidelity !== null && entry.fidelity < FIDELITY_FLOOR ? { degrades: "<name which parts degrade in plain HTML/CSS>" } : {}),
  };
}

function artifactProblem(root, artifact, label, extensions) {
  if (!artifact || typeof artifact !== "object" || typeof artifact.path !== "string" || !/^[a-f0-9]{64}$/.test(String(artifact.sha256))) return `${label} must be {path, sha256}`;
  if (extensions && !extensions.includes(path.extname(artifact.path).toLowerCase())) return `${label} must be a ${extensions.join(" or ")} file: ${artifact.path}`;
  let file;
  try { file = resolveInside(root, artifact.path, label, { scope: SCOPE }); } catch (error) { return error.message; }
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return `${label} does not exist: ${artifact.path}`;
  return sha256(fs.readFileSync(file)) === artifact.sha256 ? null : `${label} hash does not match ${artifact.path}`;
}

const text = (value) => typeof value === "string" && value.trim().length > 0;

function sourceKey(card) {
  const source = card.source || {};
  if (card.logic === "designer" && text(source.name)) return `designer:${source.name.trim().toLowerCase()}`;
  if (card.logic === "reference" && text(source.url)) return `reference:${source.url.trim().toLowerCase().replace(/[?#].*$/, "").replace(/\/+$/, "")}`;
  if (card.logic === "roulette" && text(source.section) && Number.isInteger(source.number)) return styleKey(source.section, source.number);
  return null;
}

function cardFindings(card, context) {
  const { root, medium, catalog, findings } = context;
  const add = (code, message, fix) => findings.push({ code, message, fix });
  const label = `card ${card.id}`;
  for (const [column, help] of Object.entries(TEXT_COLUMNS)) {
    if (!text(card[column])) add("card-field-missing", `${label} has no ${column}.`, `Write ${column} for ${card.id}: ${help}.`);
  }
  const source = card.source;
  if (!source || typeof source !== "object") {
    add("card-source-missing", `${label} has no source.`, `Give ${card.id} a source object for its ${card.logic} logic (designer: name; reference: name, url, seen, board; roulette: the direction draw output).`);
    return;
  }
  if (card.logic === "designer") {
    if (!text(source.name)) add("designer-name-missing", `${label} names no studio or designer.`, `Name the studio or designer whose thinking ${card.id} uses (source.name); borrow how they think, not how their work looks.`);
  } else if (card.logic === "reference") {
    if (!text(source.name) || !/^https?:\/\/\S+$/.test(String(source.url))) add("reference-url-invalid", `${label} names no real work with an http(s) URL.`, `Give ${card.id} the work's name and its URL (source.name, source.url): a real work in the same medium as the brief.`);
    if (source.seen === true) {
      const problem = artifactProblem(root, source.board, `${label} reference board`, [".png", ".jpg", ".jpeg"]);
      if (problem) add("reference-board-missing", `${problem}.`, `Capture the work (composition capture --url <url> --output <dir>), save the board image in the project and bind it as source.board {path, sha256}; if it cannot be captured set seen to false with source.unseenReason.`);
    } else if (source.seen === false) {
      if (!text(source.unseenReason)) add("reference-unseen-reason", `${label} says the work was not seen but gives no reason.`, `Write source.unseenReason for ${card.id}: why the capture failed (anti-bot, black WebGL, offline). A card never pretends to have seen a work.`);
    } else {
      add("reference-seen-missing", `${label} does not say whether the work was seen.`, `Set source.seen to true with a board, or to false with source.unseenReason.`);
    }
  } else {
    rouletteFindings(card, context, add);
  }
}

function rouletteFindings(card, context, add) {
  const { catalog, medium, recent, libraryDir, context: orientation } = context;
  const source = card.source;
  const label = `card ${card.id}`;
  if (!catalog) {
    add("library-missing", `${label} is a roulette draw but the design direction library is not installed.`, "Install the design direction library (skill/references/design-direction-library.md) so the draw can be checked against its catalog.");
    return;
  }
  if (!Number.isInteger(source.second) || source.second < 0 || source.second >= SECOND_RANGE) add("roulette-second-invalid", `${label} records second ${JSON.stringify(source.second)}, not a second from 0 to 59.`, "Draw with `direction draw` and copy its output into the card.");
  const entries = catalog[source.section];
  if (!entries) {
    add("roulette-section-invalid", `${label} draws from section ${JSON.stringify(source.section)}.`, `Draw from ${medium} (the brief's medium) and east: run \`direction draw --medium ${medium}\`.`);
    return;
  }
  const pool = Array.isArray(source.pool) && source.pool.length ? source.pool : null;
  if (orientation && !pool) add("roulette-pool-missing", `The owner named "${orientation}", so ${label} must draw only from styles compatible with it, but records no pool.`, `Run \`direction draw --medium ${medium} --pool <compatible numbers> --east-pool <compatible numbers>\` and copy the draw.`);
  if (pool && pool.some((number) => !entries.some((entry) => entry.number === number))) add("roulette-pool-invalid", `${label} pool lists a number that is not in section ${source.section}.`, "List only catalog numbers of that section.");
  const numbers = pool || entries.map((entry) => entry.number);
  const skipped = Array.isArray(source.skipped) ? source.skipped : null;
  const start = Number.isInteger(source.second) ? source.second % numbers.length : 0;
  const expectedNumber = skipped ? numbers[(start + skipped.length) % numbers.length] : null;
  const prefix = skipped ? skipped.every((number, index) => number === numbers[(start + index) % numbers.length]) : false;
  // A skip is legitimate only past a style the ledger's recent deliveries used.
  const unearned = (skipped || []).filter((number) => !recent.has(styleKey(source.section, number)));
  if (unearned.length) add("roulette-skip-unearned", `${label} skips ${unearned.join(", ")}, which no recent delivery in the ledger used.`, `Redo the draw with \`direction draw --medium ${medium} --second ${source.second}\` and copy its output; it skips only ledger collisions.`);
  if (!skipped || !prefix || source.number !== expectedNumber) {
    add("roulette-number-mismatch", `${label} records number ${source.number} but second ${source.second} in ${source.section} gives ${expectedNumber ?? "?"}${skipped?.length ? ` after skipping ${skipped.join(", ")}` : ""}.`, `Redo the draw with \`direction draw --medium ${medium} --second ${source.second}\` and copy its output; the number is S % count + 1, advancing only past ledger collisions listed in skipped.`);
  }
  const entry = entries.find((item) => item.number === source.number);
  if (!entry) {
    add("roulette-style-mismatch", `${label} names no style ${source.section}/${source.number} in the catalog.`, "Copy style, number and specimen from `direction draw`.");
    return;
  }
  if (source.style !== entry.name) add("roulette-style-mismatch", `${label} names "${source.style}" but ${source.section}/${pad(entry.number)} is "${entry.name}".`, "Copy style, number and specimen from `direction draw`.");
  if (source.specimen !== entry.specimen || !entry.specimen || !fs.existsSync(path.join(libraryDir, entry.specimen))) add("roulette-specimen-missing", `${label} records specimen ${JSON.stringify(source.specimen)}, but the catalog's is ${entry.specimen ?? "none"}${entry.specimen && !fs.existsSync(path.join(libraryDir, entry.specimen)) ? " and it is not in the library" : ""}.`, "Open the specimen, then record the path `direction draw` printed.");
  if (source.fidelity !== entry.fidelity) add("roulette-fidelity-mismatch", `${label} records fidelity ${source.fidelity} where the catalog says ${entry.fidelity}.`, "Copy fidelity from `direction draw`.");
  if (entry.fidelity !== null && entry.fidelity < FIDELITY_FLOOR && !text(source.degrades)) add("roulette-degrades-missing", `${label} draws a style with ${entry.fidelity}% fidelity but says nothing about what degrades.`, `Write source.degrades: which parts of ${entry.name} become flat colour blocks in plain HTML/CSS.`);
  if (recent.has(styleKey(source.section, source.number))) add("ledger-roulette-collision", `${label} draws ${source.section}/${pad(source.number)} (${entry.name}), which one of the last three deliveries used.`, `Redraw with \`direction draw --medium ${medium} --second ${source.second}\`; it skips styles the ledger's last three deliveries used.`);
}

// All findings of the card set, thumbs and full versions. `receipt` has passed the shape checks.
function directionFindings(root, receipt, options = {}) {
  const findings = [];
  const add = (code, message, fix) => findings.push({ code, message, fix });
  const recentEntries = options.recentEntries || [];
  const recent = recentSources(recentEntries);
  const libraryDir = options.libraryRoot || libraryRoot();
  const catalog = options.catalog === undefined ? loadCatalog(libraryDir) : options.catalog;
  const medium = receipt.medium;
  if (!MEDIA.includes(medium)) add("medium-missing", `medium ${JSON.stringify(medium)} is not one of ${MEDIA.join(", ")}.`, "Set medium to the brief's output form: web, ppt, info or app.");
  const cards = Array.isArray(receipt.cards) ? receipt.cards : [];
  if (cards.length !== 6) add("cards-count", `${cards.length} direction cards, expected six: two per logic.`, "Write six cards in direction-preview.json `cards`: two designer, two reference, two roulette (see references/direction-preview.md).");
  const ids = cards.map((card) => card?.id);
  if (new Set(ids).size !== ids.length || ids.some((id) => !/^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/.test(String(id)))) add("card-id-invalid", "Card ids must be unique lowercase path-safe identifiers.", "Give each card an id such as designer-1, reference-2, roulette-1.");
  for (const logic of LOGICS) {
    const count = cards.filter((card) => card?.logic === logic).length;
    if (cards.length === 6 && count !== 2) add("cards-logic-count", `${count} ${logic} cards, expected two.`, `Make exactly two ${logic} cards.`);
  }
  const context = { root, medium, catalog, recent, libraryDir, context: receipt.context ?? null, findings };
  for (const card of cards) if (card && typeof card === "object") cardFindings(card, context);

  const roulettes = cards.filter((card) => card?.logic === "roulette" && card.source);
  if (roulettes.length === 2) {
    const sections = roulettes.map((card) => card.source.section).sort();
    if (sections.join() !== [medium, "east"].sort().join()) add("roulette-sections", `Roulette cards draw from ${sections.join(" and ")}; they must draw one from ${medium} and one from east.`, `Run \`direction draw --medium ${medium}\` and use both draws.`);
    if (roulettes[0].source.second !== roulettes[1].source.second) add("roulette-second-differs", "The two roulette cards record different seconds.", "Both draws use the same second S; run `direction draw` once and copy both.");
  }

  thumbsFindings(root, receipt, cards, add);
  versionFindings(root, receipt, cards, { add, recent, recentEntries });
  return findings;
}

function thumbsFindings(root, receipt, cards, add) {
  const thumbs = receipt.thumbs;
  if (!thumbs || typeof thumbs !== "object") {
    add("thumbs-missing", "No thumbnail board is recorded.", "Write direction-previews/thumbs.html with six cells (one data-card-id per card, about 480x300 each), capture it with `composition capture`, and record thumbs {html, png} with their sha256.");
    return;
  }
  const html = artifactProblem(root, thumbs.html, "thumbs.html", [".html"]);
  const png = artifactProblem(root, thumbs.png, "thumbs capture", [".png"]);
  if (html) add("thumbs-file-missing", `${html}.`, "Write direction-previews/thumbs.html and record its sha256.");
  if (png) add("thumbs-capture-missing", `${png}.`, "Capture thumbs.html with `composition capture --composition direction-previews/thumbs.html --output direction-previews/thumbs --width 1500 --height 700` and record direction-previews/thumbs/screenshot.png.");
  if (!html) {
    const markup = fs.readFileSync(resolveInside(root, thumbs.html.path, "thumbs.html", { scope: SCOPE }), "utf8");
    const missing = cards.map((card) => card?.id).filter((id) => text(id) && !new RegExp(`data-card-id\\s*=\\s*["']${id}["']`).test(markup));
    if (missing.length) add("thumbs-cells-missing", `thumbs.html has no cell for ${missing.join(", ")}.`, `Give every card one cell marked data-card-id="<card id>" in thumbs.html, with its real type, colour, skeleton and headline.`);
  }
}

const VERSION_NAME = /^direction-previews\/dir-[1-3]\.html$/;

function versionFindings(root, receipt, cards, { add, recent, recentEntries }) {
  const directions = Array.isArray(receipt.directions) ? receipt.directions : [];
  if (directions.length !== 3) add("versions-count", `${directions.length} full versions, expected exactly three.`, "Pick three cards and build direction-previews/dir-1.html, dir-2.html and dir-3.html; the other three stay alternates.");
  const names = directions.map((direction) => direction.html?.path);
  if (new Set(names).size !== names.length) add("version-file-duplicate", "Two full versions use the same file.", "Give the versions dir-1.html, dir-2.html and dir-3.html.");
  const cardIds = new Set(cards.map((card) => card?.id));
  const used = new Set();
  let overdone = 0;
  for (const direction of directions) {
    const label = `version ${direction.id}`;
    const problem = artifactProblem(root, direction.html, `${label} html`, [".html"]);
    if (problem) add("version-file-missing", `${problem}.`, `Build the full version as direction-previews/dir-<1-3>.html, capture it with \`composition capture --composition <file> --output direction-previews/dir-<n> --width ${receipt.comparison?.viewport?.width ?? 1440} --height ${receipt.comparison?.viewport?.height ?? 900}\` and record the html and screenshot with their sha256.`);
    else if (!VERSION_NAME.test(direction.html.path)) add("version-file-name", `${label} is ${direction.html.path}, not direction-previews/dir-1.html to dir-3.html.`, "Name the full versions direction-previews/dir-1.html, dir-2.html, dir-3.html.");
    if (!text(direction.card) || !cardIds.has(direction.card)) add("version-card-unknown", `${label} names card ${JSON.stringify(direction.card)}, which is not one of the six.`, "Set `card` to the id of the card the version was built from.");
    else if (used.has(direction.card)) add("version-card-duplicate", `Two full versions come from card ${direction.card}.`, "Build the three versions from three different cards.");
    used.add(direction.card);
    const reasons = direction.reasons;
    const missing = Object.keys(REASONS).filter((key) => !text(reasons?.[key]));
    if (missing.length) add("version-reasons-missing", `${label} records no reason for: ${missing.join(", ")}.`, `Record reasons {${Object.entries(REASONS).map(([key, help]) => `${key}: ${help}`).join("; ")}} for ${direction.id}.`);
    if (typeof direction.overdone !== "boolean") add("version-overdone-missing", `${label} does not say whether it is a prop/metaphor/everything-maxed version.`, "Set overdone to true or false; at most one of the three may be true.");
    if (direction.overdone === true) overdone += 1;
    const card = cards.find((item) => item?.id === direction.card);
    const key = card ? sourceKey(card) : null;
    if (key && recent.has(key)) add("ledger-source-collision", `${label} comes from ${key.replace(/^[a-z]+:/, "")}, which one of the last three deliveries used.`, `Replace ${direction.id} with one of the three alternate cards, or draw a different source.`);
    appearanceFindings(root, direction, recentEntries, add);
  }
  if (overdone > 1) add("versions-overdone", `${overdone} versions are marked overdone; at most one may be.`, "Replace the extra prop/metaphor/maximised version with an alternate card.");
}

// Readability and the ledger's appearance collision for one full version, from its captured elements.json
// when there is one (beside the screenshot), else from the page's own CSS.
function appearanceFindings(root, direction, recentEntries, add) {
  if (!direction.html || artifactProblem(root, direction.html, "html", [".html"])) return;
  const htmlFile = resolveInside(root, direction.html.path, "html", { scope: SCOPE });
  // `composition capture` writes elements.json beside the screenshot; without it readability is unmeasured.
  let elements = null;
  try {
    elements = JSON.parse(fs.readFileSync(path.join(path.dirname(resolveInside(root, direction.screenshot.path, "screenshot", { scope: SCOPE })), "elements.json"), "utf8"));
    if (!Array.isArray(elements?.items) || !elements.viewport) elements = null;
  } catch { /* reported below */ }
  if (elements) {
    const { checkTextLegibility } = require("./composition-core.cjs");
    for (const finding of checkTextLegibility(elements)) add(finding.code, `version ${direction.id}: ${finding.message}.`, finding.fix);
  } else {
    add("version-elements-missing", `version ${direction.id} has no readable elements.json beside its screenshot, so its text readability is unmeasured.`, `Capture it with \`composition capture --composition ${direction.html.path} --output <the screenshot's folder>\`, which writes screenshot.png and elements.json together.`);
  }
  const appearance = summarizeAppearance({ elements, source: fs.readFileSync(htmlFile, "utf8") });
  for (const entry of recentEntries) {
    const shared = collides(appearance, entry.appearance);
    if (shared) add("ledger-appearance-collision", `version ${direction.id} shares its ${shared.join(", ")} with the delivery of ${entry.date}.`, `Replace ${direction.id} with an alternate card, or change its skeleton and type; changing only the colour does not clear it.`);
  }
}

module.exports = { LOGICS, MEDIA, REASONS, TEXT_COLUMNS, VERSION_NAME, draw, directionFindings, libraryRoot, loadCatalog, parseCatalog, sourceKey, styleKey };

"use strict";

// The direction stage shared by the ui and web workflows (OpenSpec change directions-from-three-sources):
// the agent makes six direction cards from three sources, one thumbnail board and three full versions
// (references/direction-preview.md); `direction check` gates them; the owner then sees three full
// captures with their cards and the thumbnail board, and picks, mixes or promotes an alternate.
// The receipt is direction-preview.json; nothing here is a second artifact.

const fs = require("node:fs");
const path = require("node:path");
const { fail, readJson } = require("../contract-utils.cjs");
const { checkDirectionPreview } = require("../direction-preview-core.cjs");
const { sourceKey } = require("../directions-core.cjs");
const { cliCommand, shellPath } = require("./shared.cjs");

const RECEIPT = "direction-preview.json";
const CLOSING_LINE = "I'll make several real directions for you to see.";
const GUIDE = "references/direction-preview.md";

const receiptPath = (root) => path.join(path.resolve(root), RECEIPT);
const checkCommand = (root) => `${cliCommand()} direction check --stage preview --change-root ${shellPath(path.resolve(root))} --json`;

const MAKE = (root, waiver) => [
  `Make the directions from three sources (${GUIDE}, references/design-direction-library.md).`,
  "1. Restate the need from the confirmed playback in your own words. Take `medium` from the output form (web, ppt, info or app). If the owner named a style or a brand, record it as `context`: all six cards then interpret that context.",
  `2. Run \`${cliCommand()} direction draw --root ${shellPath(path.resolve(root))} --medium <medium>\` (add --pool and --east-pool, the numbers compatible with a named context) and open both specimens it names. It takes the current second S and draws S % count + 1 in the medium's section and S % 12 + 1 in east, skipping what the appearance ledger's last three deliveries used.`,
  "3. Write six cards in `cards`, two per logic. designer: a named studio or designer whose thinking (not appearance) fits this brief, one bold and one restrained or one western and one east asian. reference: a real work in the same medium (verify it exists with a search), captured with `composition capture --url <url> --output <dir>`, the board image kept in the project and bound as source.board; if it cannot be captured set seen to false with source.unseenReason, never claim a view you did not have. roulette: the two draws, copied as printed, with source.degrades when fidelity is under 70. Every card has the six columns: logic and source, borrowed (concrete rules: grid, type ratio, colour proportion, image/text relation), hero material, skeleton (one sentence), boldness (the one bold place), contentForm (which part of the content the form comes from).",
  "4. Write direction-previews/thumbs.html: six cells about 480x300, one data-card-id per card, each the key screen of that card with real type, colour, skeleton and headline. Capture it with `composition capture --composition direction-previews/thumbs.html --output direction-previews/thumbs --width 1500 --height 700` and look at it; redraw a cell whose source is wrong before building anything larger.",
  "5. Pick three cards for full versions: each good on its own; different from the other two in skeleton, temperature and appearance family; not colliding with the recent deliveries; at most one prop, metaphor or everything-maxed version. Build direction-previews/dir-1.html to dir-3.html with the same real content, capture each with `composition capture --composition <file> --output direction-previews/dir-<n> --width 1440 --height 900`, and write direction-previews/index.html (a data-direction-preview page with one data-direction-id stage per version) and the brief it compares. Record each version's `card`, `overdone` and `reasons` (alone, distinct, ledger, restraint).",
  `6. Write ${RECEIPT} at the project root with changeId "${path.basename(path.resolve(root))}" (cards, thumbs, directions, comparison), then run ${checkCommand(root)}.${waiver ? " For a narrow repair or an extension of an established surface, write a waiver with its reason instead." : ""}`,
].join(" ");

function cardLine(card) {
  const source = card.source || {};
  const from = card.logic === "designer" ? source.name : card.logic === "reference" ? `${source.name} (${source.seen ? "board captured" : `not seen: ${source.unseenReason}`})` : `${source.style} (${source.section}/${String(source.number).padStart(2, "0")}, drawn at second ${source.second})`;
  return `${card.logic}: ${from}; borrows ${card.borrowed}; hero ${card.hero}; form from ${card.contentForm}`;
}

// The ask shown to the owner: three full captures with their cards, the thumbnail board, the alternates.
function ownerAsk(receipt, root, cfg) {
  const cards = new Map(receipt.cards.map((card) => [card.id, card]));
  const chosen = new Set(receipt.directions.map((direction) => direction.card));
  const abs = (rel) => path.join(path.resolve(root), rel);
  return {
    type: "ask",
    question: `Here are three full directions, each with the card it came from, and the thumbnail board of all six. The other three are alternates: say which one to promote and I will build it. Which direction should I take, or what should I mix (for example A's layout with C's colour)?`,
    directions: receipt.directions.map((direction) => ({ id: direction.id, name: direction.name, thesis: direction.thesis, card: cardLine(cards.get(direction.card)), whyChosen: direction.reasons })),
    alternates: receipt.cards.filter((card) => !chosen.has(card.id)).map((card) => ({ id: card.id, summary: cardLine(card) })),
    show: [abs(receipt.thumbs.png.path), ...receipt.directions.map((direction) => abs(direction.screenshot.path))],
    recommended: "Say which one and why in your own words; a mix names which part comes from which version. An explicit taste statement (\"too plain\", \"nothing like AI\") can be recorded as it was said.",
    instruction: "Show the thumbnail board and the three captures with each card's summary. Record the owner's exact words, not a paraphrase; a mix is recorded with one --mix <part>=<id> per part; an explicit taste statement is recorded with --taste \"<their words>\" (add --scope project when they say it holds from now on).",
    record: cfg.record,
    ...(cfg.correction ? { correction: cfg.correction } : {}),
    why: "The direction is the owner's pick; a recommended version is not a selection.",
  };
}

// run, run-with-findings or ask, from what exists on disk. `cfg.waiver` offers the ui waiver ask.
function directionAction(state, root, cfg) {
  if (!fs.existsSync(receiptPath(root))) {
    return {
      type: "run",
      instruction: `${cfg.stage0 ? "Run Stage 0 first (references/stages.md: route, check-deps, toolchain, project inspect). " : ""}${MAKE(root, cfg.waiver)}`,
      ...(state.decisions?.playback ? { playback: state.decisions.playback } : {}),
      guide: GUIDE,
      why: "The owner picks from real directions drawn from three sources, not from the model's own taste.",
    };
  }
  const preview = checkDirectionPreview(path.resolve(root), { stage: "preview" });
  if (preview.status !== "ready") {
    return { type: "run", instruction: `Fix ${RECEIPT}, then run ${checkCommand(root)}.`, findings: preview.findings?.length ? preview.findings : undefined, blockers: preview.blockers, guide: GUIDE, why: "Only directions that pass the check can be shown to the owner." };
  }
  if (!preview.applicable) {
    if (!cfg.waiver) return { type: "run", instruction: `${RECEIPT} is a waiver, which this deliverable does not take: it makes its directions from the three sources. Replace it with the six cards and the three full versions.`, guide: GUIDE, why: "Open whole-page design always shows directions." };
    return {
      type: "ask",
      question: `No direction preview was made (${preview.waiver}). Does the owner agree to build without choosing between directions?`,
      recommended: "Agree only for a repair or an extension of an interface that already has its direction.",
      record: `${cfg.decide} --choice waived --answer "<the owner's words>"`,
      why: "Skipping the comparison is the owner's call.",
    };
  }
  return ownerAsk(readJson(receiptPath(root), "direction preview"), root, cfg);
}

// The ids a pick names, one or several (a combination), each a candidate of the receipt.
function pickedIds(choice) {
  const ids = String(choice ?? "").split(",").map((value) => value.trim()).filter(Boolean);
  if (!ids.length || new Set(ids).size !== ids.length) fail("workflow", "--choice names one direction id, or several comma-separated ids to combine, without repeats");
  return ids;
}

// "layout=a" pairs: which part of the result comes from which version.
function pickedMix(values) {
  const mix = {};
  for (const value of [].concat(values ?? [])) {
    const [part, id, ...extra] = String(value).split("=").map((piece) => piece.trim());
    if (!part || !id || extra.length) fail("workflow", `--mix takes <part>=<direction id> (for example layout=a), not ${JSON.stringify(value)}`);
    if (Object.hasOwn(mix, part)) fail("workflow", `--mix names ${part} twice`);
    mix[part] = id;
  }
  return mix;
}

// The sources the chosen directions came from, as the appearance ledger records them.
function selectedSources(root, ids) {
  try {
    const receipt = readJson(receiptPath(root), "direction preview");
    const cards = new Map((receipt.cards || []).map((card) => [card.id, card]));
    return (receipt.directions || []).filter((direction) => ids.includes(direction.id)).map((direction) => cards.get(direction.card)).filter(Boolean).map(sourceKey).filter(Boolean);
  } catch {
    return [];
  }
}

module.exports = { CLOSING_LINE, RECEIPT, directionAction, pickedIds, pickedMix, receiptPath, selectedSources };

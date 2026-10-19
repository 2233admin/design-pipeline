"use strict";

// Walks a web project through the conversational stages in process, recording what an agent records
// from the owner's replies, so a test about a later stage can start where it needs to. Every step goes
// through the public decide/next functions and their gates; nothing writes state directly.

const fs = require("node:fs");
const path = require("node:path");
const { decide, nextAction, readState } = require("../../skill/scripts/workflow-core.cjs");

// The playback card: three intent lines, the open uncertainty and the delegation line, one per line.
const PLAYBACK = [
  "Expresses: a landing page for small bakeries that take preorders, warm and unhurried (you said), never like a delivery app (you said).",
  "Connects with: regulars on their phones who want to reserve tomorrow's bread in under a minute (you said).",
  "Unlike others: today's bakes and a reserve button on the first screen, then how pickup works, then the shop's story (my guess).",
  "Still open: whether pickup runs on weekends.",
  "I decide the layout, components and each section's details; the variants and the final page stay yours.",
].join("\n");
const STATED = "I will build a one-screen pricing card for the existing site, in its current type and colours, from the project's own components.";
const SECTIONS = ["first-screen"];
const { isolate, writeDirectionSet } = require("./direction-fixture.cjs");

// Every web flow reads a private design direction library and appearance ledger, never the user's own.
const directionEnv = isolate();
process.on("exit", directionEnv.restore);

const write = (root, rel, text) => fs.writeFileSync(path.join(root, rel), text);

// `keep` keeps checkpoints with the owner, as the owner's reply to the playback's delegation line.
function confirmPlayback(root, answer = PLAYBACK, keep = []) {
  return decide(root, { by: "owner", stage: "intake", verdict: "accept", answer, ...(keep.length ? { keep } : {}) });
}

function statedSkip(root, answer = STATED) {
  return decide(root, { by: "owner", stage: "intake", choice: "skip", answer });
}

function writeVariants(root) {
  writeDirectionSet(root, { ids: ["a", "b", "c"] });
}

function pickVariant(root, choice = "A", answer) {
  return decide(root, { by: "owner", stage: "concept", choice, ...(answer ? { answer } : {}) });
}

function writeReference(root) {
  write(root, "reference.md", "# Observed reference\nStructure and timing");
}

// Everything before the components decision for the project's tier and mode.
function toComponents(root, { keep = [] } = {}) {
  const { tier, mode } = readState(root);
  if (tier === "quick") statedSkip(root);
  else confirmPlayback(root, PLAYBACK, keep);
  if (mode === "replicate") require("./replicate-flow.cjs").extractReplicate(root);
  else if (tier !== "quick") decide(root, { by: "owner", stage: "reference", answer: "none" });
  if (tier !== "quick" && mode !== "replicate") {
    writeVariants(root);
    pickVariant(root);
  }
}

// brief.md as the description, with its `## Sections` list naming every section in build order.
function writeDescription(root, sections = SECTIONS) {
  write(root, "brief.md", `# Brief\n\nA one-page description of the page.\n\n## Sections\n\n${sections.map(id => `- ${id}: what this section is for`).join("\n")}\n`);
}

// `revision` (with `affects`) is the change tier a re-approval of a changed description takes.
function approveDescription(root, sections = SECTIONS, revision = {}) {
  writeDescription(root, sections);
  return decide(root, { by: "owner", stage: "description", verdict: "accept", choice: sections.join(","), ...revision });
}

// After the components decision: approve the description at standard and full (quick has none).
function toBuild(root, sections = SECTIONS) {
  if (readState(root).tier !== "quick") approveDescription(root, sections);
}

// Accept each approved section in build order, as the owner reviewing the built page would, or as the
// agent's self-check records it when the section checkpoint is delegated (the default). A section
// whose marker is missing from index.html gets one appended; anything else that keeps build unfinished
// (no page, an invalid manifest) is left for the test to see.
function acceptSections(root) {
  for (let action = nextAction(root); action.stage === "build" && action.section; action = nextAction(root)) {
    if (action.type === "ask" || action.selfCheck) {
      decide(root, { by: action.selfCheck ? "agent" : "owner", stage: "section", choice: action.section, verdict: "accept" });
      continue;
    }
    const file = path.join(root, "index.html");
    const marker = `data-section="${action.section}"`;
    if (!fs.existsSync(file) || fs.readFileSync(file, "utf8").includes(marker)) break;
    fs.appendFileSync(file, `\n<section ${marker}></section>\n`);
  }
  return nextAction(root);
}

module.exports = { PLAYBACK, SECTIONS, STATED, acceptSections, approveDescription, confirmPlayback, pickVariant, statedSkip, toBuild, toComponents, writeDescription, writeReference, writeVariants };

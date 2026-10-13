"use strict";

// Walks a web project through the conversational stages in process, recording what an agent records
// from the owner's replies, so a test about a later stage can start where it needs to. Every step goes
// through the public decide/next functions and their gates; nothing writes state directly.

const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { execute } = require("../../skill/scripts/cli-core.cjs");
const { normalizeSnapshot } = require("../../skill/scripts/design-system-catalog-core.cjs");
const { decide, nextAction, readState } = require("../../skill/scripts/workflow-core.cjs");

const PLAYBACK = "A landing page for small bakeries that take preorders. You said: visitors are regulars on their phones who want to reserve tomorrow's bread in under a minute, and it should feel warm and unhurried, never like a delivery app. My guess: one first screen with today's bakes and a reserve button, then how pickup works, then the shop's story.";
const STATED = "I will build a one-screen pricing card for the existing site, in its current type and colours, from the project's own components.";
const SECTIONS = ["first-screen"];
const SWITCHER_SCRIPT = path.resolve(__dirname, "../../skill/tools/variant-switcher/variant-switcher.js");
const REFERENCES = path.resolve(__dirname, "../../skill/references");
const SCRATCH_REPLY = "Build this frontend from scratch with a project-owned custom design system.";
const json = (root, rel, value) => write(root, rel, JSON.stringify(value, null, 2) + "\n");

function cli(root, args) {
  const result = execute([...args, "--root", root, "--project-root", root, "--json"]);
  assert.equal(result.exitCode, 0, JSON.stringify(result.output));
  return result.output;
}

// Observation is a delivered summary, not an approval. Entry/interview tests call this explicitly;
// only fixtures for downstream stages combine it with the remaining prerequisites.
function finishFrontendObservation(root, options = {}) {
  if (nextAction(root).stage === "observe") {
    decide(root, { stage: "observe", answer: options.answer || "The bounded source inspection and its exclusions were delivered; no rendered visual acceptance is claimed.", ...(options.artifact ? { artifact: options.artifact } : {}) });
  }
  if (nextAction(root).stage === "purpose") {
    decide(root, { stage: "purpose", choice: options.purpose || "new", answer: options.purposeAnswer || "Build a new frontend rather than reproducing or optimizing the supplied starting point." });
  }
  return nextAction(root);
}

// Publish through the real CLI dispatcher: it resolves the stack and binds the actual request,
// catalog and optional capability search bytes. No fixture invents a ready flag or registry hash.
function publishFrontendDecision(root, options = {}) {
  const mode = options.mode || "custom";
  const text = options.authorityText || SCRATCH_REPLY;
  json(root, "frontend-stack-request.json", {
    schema: "design-pipeline.frontend-stack-request.v1", framework: "react",
    brief: options.stackBrief || "Build a frontend with a project-owned custom system.",
    requested: { styling: "none", uiLibrary: "none" },
  });
  cli(root, ["design-system", "resolve-stack", "--artifact", "frontend-stack-request.json", "--write", "--output", "frontend-stack-decision.json"]);
  const catalog = options.catalog || normalizeSnapshot(JSON.parse(fs.readFileSync(path.join(REFERENCES, "astryx-design-system-snapshot.json"), "utf8")));
  json(root, "design-system-catalog.json", catalog);
  const selection = options.selection || {
    basis: "owner-scratch",
    authority: { actor: "owner", source: options.authoritySource || "reply", text, choice: "custom" },
    rationale: "The owner explicitly chose a project-owned system from scratch.",
    compared: [],
  };
  const request = {
    schema: "design-pipeline.design-system-decision-request.v1", version: "1", mode,
    project: options.project || {}, selection, frontendStackDecisionPath: "frontend-stack-decision.json",
    ...(options.candidateId ? { candidateId: options.candidateId } : {}),
  };
  if (options.searchQuery) {
    cli(root, ["design-system", "decompose", "--query", options.searchQuery, "--catalog", "design-system-catalog.json", "--write", "--output", "capability-inventory.json"]);
    request.capabilityInventoryPath = "capability-inventory.json";
  }
  json(root, "design-system-request.json", request);
  const result = cli(root, ["design-system", "decide", "--artifact", "design-system-request.json", "--catalog", "design-system-catalog.json", "--write", "--output", "design-system-decision.json"]);
  return result.decision;
}

function consumeScratchDecision(root, options = {}) {
  const decision = publishFrontendDecision(root, options);
  decide(root, { stage: "design-system", artifact: "design-system-decision.json", ...(decision.selection.authority.source === "reply" ? { answer: decision.selection.authority.text } : {}) });
  return decision;
}

function prepareFrontend(root, options = {}) {
  finishFrontendObservation(root, options);
  return consumeScratchDecision(root, options);
}

const write = (root, rel, text) => fs.writeFileSync(path.join(root, rel), text);

// A variants page the concepts stage accepts: three marked first screens and the inlined switcher.
function variantsPage(keys = ["A", "B", "C"]) {
  const screens = keys.map(key => `<section data-variant="${key}" data-variant-name="Layout ${key}"><h1>Variant ${key}</h1></section>`).join("\n");
  return `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><title>Variants</title></head><body>\n${screens}\n<script>\n${fs.readFileSync(SWITCHER_SCRIPT, "utf8")}\n</script>\n</body></html>\n`;
}

function confirmPlayback(root, answer = PLAYBACK) {
  return decide(root, { stage: "intake", verdict: "accept", answer });
}

function statedSkip(root, answer = STATED) {
  return decide(root, { stage: "intake", choice: "skip", answer });
}

function writeVariants(root) {
  write(root, "concepts.md", "# Concepts\n\n## A\nSkeleton: split, product focal, type left, image right.\n\n## B\nSkeleton: stacked, headline focal, type centre, no image.\n\n## C\nSkeleton: grid, proof focal, type top, image as background.\n");
  write(root, "concepts.html", variantsPage());
}

function pickVariant(root, choice = "A", answer) {
  return decide(root, { stage: "concept", choice, ...(answer ? { answer } : {}) });
}

function writeReference(root) {
  write(root, "reference.md", "# Observed reference\nStructure and timing");
}

// Everything before the components decision for the project's tier and mode.
function toComponents(root) {
  finishFrontendObservation(root);
  const { tier, mode } = readState(root);
  if (tier === "quick") statedSkip(root);
  else confirmPlayback(root);
  if (mode === "replicate") writeReference(root);
  else if (tier !== "quick") decide(root, { stage: "reference", answer: "none" });
  consumeScratchDecision(root);
  if (tier !== "quick" && mode !== "replicate") {
    writeVariants(root);
    pickVariant(root);
  }
}

// brief.md as the description, with its `## Sections` list naming every section in build order.
function writeDescription(root, sections = SECTIONS) {
  write(root, "brief.md", `# Brief\n\nA one-page description of the page.\n\n## Sections\n\n${sections.map(id => `- ${id}: what this section is for`).join("\n")}\n`);
}

function approveDescription(root, sections = SECTIONS) {
  writeDescription(root, sections);
  return decide(root, { stage: "description", verdict: "accept", choice: sections.join(",") });
}

// After the components decision: approve the description at standard and full (quick has none).
function toBuild(root, sections = SECTIONS) {
  if (readState(root).tier !== "quick") approveDescription(root, sections);
}

// Accept each approved section in build order, as the owner reviewing the built page would. A section
// whose marker is missing from index.html gets one appended; anything else that keeps build unfinished
// (no page, an invalid manifest) is left for the test to see.
function acceptSections(root) {
  for (let action = nextAction(root); action.stage === "build" && action.section; action = nextAction(root)) {
    if (action.type === "ask") {
      decide(root, { stage: "section", choice: action.section, verdict: "accept" });
      continue;
    }
    const file = path.join(root, "index.html");
    const marker = `data-section="${action.section}"`;
    if (!fs.existsSync(file) || fs.readFileSync(file, "utf8").includes(marker)) break;
    fs.appendFileSync(file, `\n<section ${marker}></section>\n`);
  }
  return nextAction(root);
}

module.exports = { PLAYBACK, SCRATCH_REPLY, SECTIONS, STATED, acceptSections, approveDescription, confirmPlayback, consumeScratchDecision, finishFrontendObservation, pickVariant, prepareFrontend, publishFrontendDecision, statedSkip, toBuild, toComponents, variantsPage, writeDescription, writeReference, writeVariants };

"use strict";

// The ui deliverable's own intake and direction stages. Intake asks what changes an interface
// (not a film's duration); direction makes the owner pick from a rendered direction preview
// (references/direction-preview.md) before the work stage builds anything.

const fs = require("node:fs");
const path = require("node:path");
const { fail, readJson } = require("../contract-utils.cjs");
const { checkDirectionPreview } = require("../direction-preview-core.cjs");
const { cliCommand, shellPath, INTAKE, reason } = require("./shared.cjs");

const RECEIPT = "direction-preview.json";

const UI_INTAKE = {
  ...INTAKE,
  action: (state, root) => ({
    ...INTAKE.action(state, root),
    questions: [
      { id: "product", ask: "What is the product, and the one job a person does on this interface?", recommended: "Take it from the conversation so far." },
      { id: "audience", ask: "Who uses it, on which devices, and is it shared with people outside the team?", recommended: "The owner on a desktop browser; phones must stay readable." },
      { id: "content", ask: "Where does the real content come from, and which states must it show (empty, loading, error, long values)?", recommended: "Real project data; every state the data can reach." },
      { id: "assets", ask: "Which logos, fonts, icons or images can be used, and are they licensed for this use?", recommended: "Only material you own; system fonts and no logo otherwise." },
    ],
  }),
};

function decideCommand(root) {
  return `${cliCommand()} decide --root ${shellPath(path.resolve(root))} --project-root ${shellPath(path.resolve(root))} --stage concept --by owner`;
}

function receiptPath(root) {
  return path.join(path.resolve(root), RECEIPT);
}

// Stage 0 and the direction preview come before any ui work at standard and full tiers.
const DIRECTION = {
  id: "concepts",
  finished: (state) => Boolean(state.decisions?.concept),
  action: (_state, root) => {
    const check = `${cliCommand()} direction check --stage preview --change-root ${shellPath(path.resolve(root))} --json`;
    if (!fs.existsSync(receiptPath(root))) {
      return {
        type: "run",
        instruction: `Run Stage 0 first (references/stages.md: route, check-deps, toolchain, project inspect). Then write ${RECEIPT} at the project root with changeId "${path.basename(path.resolve(root))}" (references/direction-preview.md): for an open whole-surface design, two to four rendered candidates in direction-previews/ that differ on at least four axes, using the same real content; for a narrow repair or an extension of an established surface, a waiver with its reason. Then run ${check}.`,
        guide: "references/direction-preview.md",
        why: "The owner picks a direction from rendered candidates before anything is built.",
      };
    }
    const preview = checkDirectionPreview(path.resolve(root), { stage: "preview" });
    if (preview.status !== "ready") {
      return { type: "run", instruction: `Fix ${RECEIPT}: ${preview.blockers.join("; ")}. Then run ${check}.`, guide: "references/direction-preview.md", why: "Only a preview that passes its check can be shown to the owner." };
    }
    if (!preview.applicable) {
      return {
        type: "ask",
        question: `No direction preview was made (${preview.waiver}). Does the owner agree to build without choosing between directions?`,
        recommended: "Agree only for a repair or an extension of an interface that already has its direction.",
        record: `${decideCommand(root)} --choice waived --answer "<the owner's words>"`,
        why: "Skipping the comparison is the owner's call.",
      };
    }
    const receipt = readJson(receiptPath(root), "direction preview");
    return {
      type: "ask",
      question: `Which direction should the interface take: ${receipt.directions.map((d) => `${d.id} (${d.name})`).join(", ")}?`,
      show: [receipt.comparison.index.path, ...receipt.directions.map((d) => d.screenshot.path)].map((rel) => path.join(path.resolve(root), rel)),
      recommended: "Say which one and why in a sentence; a combination names what to take from each.",
      record: `${decideCommand(root)} --choice <direction id> --answer "<why, in the owner's words>"`,
      why: "The direction is the owner's pick; a recommended candidate is not a selection.",
    };
  },
};

// Records the owner's pick, refusing anything the selection check refuses. Returns the receipt write
// for the caller to apply after the state is saved, so a refused decide call changes nothing.
function decideDirection(state, root, options, role) {
  if (role.by !== "owner") fail("workflow", "the ui direction is the owner's pick. Fix: ask the owner and record their answer with --by owner");
  reason(options.answer, "say in a sentence why, in the owner's words");
  const file = receiptPath(root);
  if (!fs.existsSync(file)) fail("workflow", `${RECEIPT} does not exist yet. Fix: follow next`, { code: "WORKFLOW_NOT_READY" });
  const receipt = readJson(file, "direction preview");
  const preview = checkDirectionPreview(path.resolve(root), { stage: "preview" });
  if (preview.status !== "ready") fail("workflow", `${RECEIPT} does not pass its preview check: ${preview.blockers.join("; ")}`, { code: "WORKFLOW_NOT_READY" });
  const choice = String(options.choice ?? "");
  if (!preview.applicable) {
    if (choice !== "waived") fail("workflow", "the preview is waived, so the only choice is --choice waived");
    state.decisions.concept = "waived";
    state.decisions.conceptNotes = options.answer;
    return null;
  }
  const updated = { ...receipt, decision: { status: "selected", selectedDirectionId: choice, rationale: options.answer, by: "owner" } };
  const selection = checkDirectionPreview(path.resolve(root), { stage: "selection", receipt: updated });
  if (selection.status !== "ready") fail("workflow", `the selection is refused: ${selection.blockers.join("; ")}`);
  state.decisions.concept = choice;
  state.decisions.conceptNotes = options.answer;
  return () => fs.writeFileSync(file, `${JSON.stringify(updated, null, 2)}\n`);
}

module.exports = { DIRECTION, RECEIPT, UI_INTAKE, decideDirection };

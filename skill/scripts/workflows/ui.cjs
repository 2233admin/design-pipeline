"use strict";

// The ui deliverable's own intake and direction stages. Intake asks what changes an interface
// (not a film's duration); direction makes the owner pick from a rendered direction preview
// (references/direction-preview.md) before the work stage builds anything.

const crypto = require("node:crypto");
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

// Under --director the concept pick is the art director's (its delegation map says so); otherwise the owner's.
function directed(state) {
  return Boolean(state.director) && state.delegation?.concept?.to === "agent";
}

function decideCommand(state, root) {
  return `${cliCommand()} decide --root ${shellPath(path.resolve(root))} --project-root ${shellPath(path.resolve(root))} --stage concept --by ${directed(state) ? "agent" : "owner"}`;
}

function stateFile(root) {
  return path.join(path.resolve(root), ".design-pipeline", "state.json");
}

// A recorded direction holds only while the receipt still shows it: a missing, rewritten or drifted
// receipt (or one whose write never landed) reopens the stage.
function directionHolds(state, root) {
  const concept = state.decisions?.concept;
  if (!concept) return false;
  if (!root) return true;
  try {
    if (!fs.existsSync(receiptPath(root))) return false;
    if (concept === "waived") {
      const preview = checkDirectionPreview(path.resolve(root), { stage: "preview" });
      return preview.status === "ready" && !preview.applicable;
    }
    const selection = checkDirectionPreview(path.resolve(root), { stage: "selection", projectRoot: path.resolve(root) });
    return selection.status === "ready" && selection.decision.selectedDirectionId === concept;
  } catch {
    return false;
  }
}

function receiptPath(root) {
  return path.join(path.resolve(root), RECEIPT);
}

// Stage 0 and the direction preview come before any ui work at standard and full tiers.
const DIRECTION = {
  id: "concepts",
  finished: directionHolds,
  action: (state, root) => {
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
        record: `${decideCommand(state, root)} --choice waived --answer "<the owner's words>"`,
        why: "Skipping the comparison is the owner's call.",
      };
    }
    const receipt = readJson(receiptPath(root), "direction preview");
    return {
      type: "ask",
      question: `Which direction should the interface take: ${receipt.directions.map((d) => `${d.id} (${d.name})`).join(", ")}?`,
      show: [receipt.comparison.index.path, ...receipt.directions.map((d) => d.screenshot.path)].map((rel) => path.join(path.resolve(root), rel)),
      recommended: "Say which one and why in a sentence; a combination names what to take from each.",
      record: `${decideCommand(state, root)} --choice <direction id> --answer "<why, in the owner's words>"`,
      why: "The direction is the owner's pick; a recommended candidate is not a selection.",
    };
  },
};

// Records the owner's pick, refusing anything the selection check refuses. Returns the receipt write
// for the caller to apply after the state is saved, so a refused decide call changes nothing.
function decideDirection(state, root, options, role) {
  const byDirector = role.by === "agent" && directed(state);
  if (role.by !== "owner" && !byDirector) fail("workflow", "the ui direction is the owner's pick (or the art director's under --director). Fix: ask the owner and record their answer with --by owner");
  reason(options.answer, byDirector ? "say in a sentence why this direction" : "say in a sentence why, in the owner's words");
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
  const pick = (stateSha256) => ({ status: "selected", selectedDirectionId: choice, rationale: options.answer, ...(byDirector ? { by: "agent", agent: state.director, delegation: { source: "workflow-state", stateSha256 } } : { by: "owner" }) });
  const updated = { ...receipt, decision: pick("0".repeat(64)) };
  const selection = checkDirectionPreview(path.resolve(root), { stage: "selection", receipt: updated });
  if (selection.status !== "ready") fail("workflow", `the selection is refused: ${selection.blockers.join("; ")}`);
  state.decisions.concept = choice;
  state.decisions.conceptNotes = options.answer;
  // The director's delegation names the state it was read from: the state just saved.
  return () => {
    const saved = byDirector ? crypto.createHash("sha256").update(fs.readFileSync(stateFile(root))).digest("hex") : null;
    fs.writeFileSync(file, `${JSON.stringify({ ...receipt, decision: byDirector ? pick(saved) : updated.decision }, null, 2)}\n`);
  };
}

module.exports = { DIRECTION, RECEIPT, UI_INTAKE, decideDirection };

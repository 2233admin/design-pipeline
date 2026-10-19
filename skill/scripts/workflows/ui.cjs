"use strict";

// The ui deliverable's own intake and direction stages. Intake asks what changes an interface
// (not a film's duration) and, at standard and full, plays back what it understood for the owner to
// confirm; direction makes the owner pick from rendered directions drawn from three sources
// (references/direction-preview.md, workflows/directions.cjs) before the work stage builds anything.

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { fail, readJson } = require("../contract-utils.cjs");
const { checkDirectionPreview } = require("../direction-preview-core.cjs");
const { cliCommand, shellPath, INTAKE, reason, statement } = require("./shared.cjs");
const { CLOSING_LINE, RECEIPT, directionAction, pickedIds, pickedMix } = require("./directions.cjs");
const { addRule } = require("./rules.cjs");

// The playback: at standard and full (not replicate, which keeps its reference) the owner confirms
// what the agent understood before any direction is made; the history is the web intake's.
const playbackApplies = (state) => state.tier !== "quick" && state.mode !== "replicate";
const playbacks = (state) => (Array.isArray(state.decisions?.playbacks) ? state.decisions.playbacks : []);
const PLAYBACK = `Play back the owner's reply as a short card, one line each: the need, the audience, the scene (where and when it is used), the tone, and the expectations they did not say but probably have (mark each guess as your guess). End the card with: "${CLOSING_LINE}" Do not ask the owner to name or pick a style in words: they choose among rendered directions next.`;

const UI_INTAKE = {
  ...INTAKE,
  finished: (state) => Boolean(state.decisions?.intake) && (!playbackApplies(state) || playbacks(state).at(-1)?.verdict === "accept"),
  action: (state, root) => {
    if (state.decisions?.intake && playbackApplies(state)) {
      const rejected = playbacks(state).at(-1)?.verdict === "reject";
      const decide = `${cliCommand()} decide --root ${shellPath(path.resolve(root))} --project-root ${shellPath(path.resolve(root))} --stage intake`;
      return {
        type: "ask",
        ...(rejected ? { first: `The owner corrected the playback ("${playbacks(state).at(-1).reason}"); each correction is now a rule. Play it back again with the corrections applied, then ask:` } : {}),
        question: rejected ? "What is wrong or missing in this?" : "Here is what I understood. What is wrong or missing?",
        instruction: PLAYBACK,
        record: `${decide} --verdict accept --answer "<the playback card the owner confirmed>"`,
        correction: `${decide} --verdict reject --answer "<what the owner said is wrong or missing>"`,
        why: "The directions are made from this restatement, so the owner confirms it first; they pick among real directions, not by naming a style.",
      };
    }
    return {
    ...INTAKE.action(state, root),
    ...(playbackApplies(state) ? { then: "After the reply, next asks you to play back what you understood for the owner to confirm." } : {}),
    questions: [
      { id: "product", ask: "What is the product, and the one job a person does on this interface?", recommended: "Take it from the conversation so far." },
      { id: "audience", ask: "Who uses it, on which devices, and is it shared with people outside the team?", recommended: "The owner on a desktop browser; phones must stay readable." },
      { id: "content", ask: "Where does the real content come from, and which states must it show (empty, loading, error, long values)?", recommended: "Real project data; every state the data can reach." },
      { id: "assets", ask: "Which logos, fonts, icons or images can be used, and are they licensed for this use?", recommended: "Only material you own; system fonts and no logo otherwise." },
    ],
    };
  },
};

// Records the owner's answer to the playback: the confirmed card, or what is wrong with it (a rule).
function recordPlayback(state, options) {
  if (!playbackApplies(state)) fail("workflow", "this ui run has no playback (quick tier or replicate mode). Fix: record the intake reply with --answer");
  if (!state.decisions.intake) fail("workflow", "record the intake reply before its playback. Fix: follow next", { code: "WORKFLOW_NOT_READY" });
  const at = new Date().toISOString();
  if (options.verdict === "reject") {
    const text = reason(options.answer, "say in one sentence what the owner corrected in the playback; it becomes a rule");
    state.decisions.playbacks = [...playbacks(state), { verdict: "reject", reason: text, at }];
    addRule(state, text, `playback ${playbacks(state).filter((item) => item.verdict === "reject").length}`);
    return;
  }
  if (options.verdict !== "accept") fail("workflow", "ui intake records the reply with --answer, then the confirmed playback (--verdict accept --answer \"<card>\") or a correction (--verdict reject). Fix: follow next");
  const card = statement(options.answer, "be the playback card the owner confirmed, not their reply to it");
  if (card.split(/\r?\n/).filter((line) => line.trim()).length < 5) fail("workflow", "the playback card puts the need, audience, scene, tone and unstated expectations each on its own line, then the closing line. Fix: play it back as that card and record the version the owner confirmed");
  state.decisions.playback = card;
  state.decisions.playbacks = [...playbacks(state), { verdict: "accept", at }];
}

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
    return selection.status === "ready" && (selection.decision.selectedDirectionIds ?? [selection.decision.selectedDirectionId]).join(",") === concept;
  } catch {
    return false;
  }
}

function receiptPath(root) {
  return path.join(path.resolve(root), RECEIPT);
}

// Stage 0 and the directions come before any ui work at standard and full tiers.
const DIRECTION = {
  id: "concepts",
  finished: directionHolds,
  action: (state, root) => {
    const decide = decideCommand(state, root);
    return directionAction(state, root, {
      stage0: true,
      waiver: true,
      decide,
      record: `${decide} --choice <direction id, or several comma-separated to combine> --answer "<the owner's exact words>" [--mix <part>=<id> ...] [--taste "<an explicit taste statement, in their words>" ...] [--scope project]`,
    });
  },
};

// Records the owner's pick, refusing anything the selection check refuses. Returns the receipt write
// for the caller to apply after the state is saved, so a refused decide call changes nothing.
function decideDirection(state, root, options, role) {
  const byDirector = role.by === "agent" && directed(state);
  if (role.by !== "owner" && !byDirector) fail("workflow", "the ui direction is the owner's pick (or the art director's under --director). Fix: ask the owner and record their answer with --by owner");
  reason(options.answer, byDirector ? "say in a sentence why this direction" : "give the owner's exact words about the pick");
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
  const ids = pickedIds(choice);
  const mix = pickedMix(options.mix);
  if (Object.keys(mix).length && ids.length < 2) fail("workflow", "--mix combines parts of several versions, so --choice names each version it takes from. Fix: name them, for example --choice a,c --mix layout=a --mix colour=c");
  if (Object.values(mix).some((id) => !ids.includes(id))) fail("workflow", "--mix may take parts only from the versions --choice names");
  const pick = (stateSha256) => ({
    status: "selected",
    selectedDirectionId: ids[0],
    ...(ids.length > 1 ? { selectedDirectionIds: ids } : {}),
    ...(Object.keys(mix).length ? { mix } : {}),
    rationale: options.answer,
    ...(byDirector ? { by: "agent", agent: state.director, delegation: { source: "workflow-state", stateSha256 } } : { by: "owner" }),
  });
  const updated = { ...receipt, decision: pick("0".repeat(64)) };
  const selection = checkDirectionPreview(path.resolve(root), { stage: "selection", receipt: updated });
  if (selection.status !== "ready") fail("workflow", `the selection is refused: ${selection.blockers.join("; ")}`);
  state.decisions.concept = ids.join(",");
  state.decisions.conceptNotes = options.answer;
  if (Object.keys(mix).length) state.decisions.conceptMix = mix;
  else delete state.decisions.conceptMix;
  // The director's delegation names the state it was read from: the state just saved.
  return () => {
    const saved = byDirector ? crypto.createHash("sha256").update(fs.readFileSync(stateFile(root))).digest("hex") : null;
    fs.writeFileSync(file, `${JSON.stringify({ ...receipt, decision: byDirector ? pick(saved) : updated.decision }, null, 2)}\n`);
  };
}

module.exports = { DIRECTION, RECEIPT, UI_INTAKE, decideDirection, playbackApplies, recordPlayback };

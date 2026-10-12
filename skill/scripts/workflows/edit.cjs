"use strict";

// Edit sub-workflow: PV, MAD and beat montages cut from existing footage and music.
// Guide: references/workflow-edit.md (one section per stage id).

const path = require("node:path");
const { CLI, shellPath, INTAKE, REVIEW, deliveryRecorded, exists, reference } = require("./shared.cjs");

const DRAFT = path.join("renders", "edit.mp4");

const ANALYZE = {
  id: "analyze",
  finished: (state, root) => exists(root, path.join("edit", "analysis.json")),
  action: (state, root) => (exists(root, "sources")
    ? { type: "run", command: `${CLI} film-edit analyze --root ${shellPath(path.resolve(root))} --project-root ${shellPath(path.resolve(root))} --audio <music file>`, why: "Beat grid and footage shots first; record footage licenses in sources/licenses.json." }
    : { type: "run", instruction: "Put the footage in sources/ and the music in assets/, with sources/licenses.json", why: "An edit starts from real footage and music." }),
};

// Replicate mode only: measure the reference edit before cutting.
const REFERENCE = reference("Watch the reference edit and write reference.md: shot lengths per section, where cuts land (beat, bar, accent), speed ramps, repeats and text moments; what to transfer.");

const STYLE = {
  id: "style",
  finished: (state) => state.tier === "quick" || Boolean(state.decisions?.concept),
  action: (_state, root) => ({ type: "ask", question: "Which rough-cut starting point fits the direction: MAD or PV?", recommended: "Use the agreed direction; mad starts with shorter cuts, pv with longer shots. These presets do not define the finished visual language.", record: `${CLI} decide --root ${shellPath(path.resolve(root))} --project-root ${shellPath(path.resolve(root))} --stage concept --choice mad|pv`, why: "The first of two human decisions for an edit; preserve an already supplied choice." }),
};

const CUT = {
  id: "cut",
  finished: (state, root) => exists(root, "edit.json"),
  action: (state, root) => ({ type: "run", command: `${CLI} film-edit auto --root ${shellPath(path.resolve(root))} --project-root ${shellPath(path.resolve(root))} --style ${state.decisions?.concept || "mad"}`, why: "Rough assembly only. Use references/animation-thinking.md to judge the first phrase's action, motif and sound relationship, then reshape edit.json; the beat grid is not a creative rule." }),
};

const RENDER = {
  id: "render",
  finished: (state, root) => exists(root, DRAFT),
  action: (_state, root) => ({ type: "run", command: `${CLI} film-edit render --root ${shellPath(path.resolve(root))} --project-root ${shellPath(path.resolve(root))}`, why: "Assemble the draft." }),
};

const CHECK = {
  id: "check",
  gate: { name: "edit", inputs: () => ["edit.json", "edit/analysis.json", DRAFT.split(path.sep).join("/")] },
  action: (_state, root) => ({ type: "run", command: `${CLI} film-edit check --root ${shellPath(path.resolve(root))} --project-root ${shellPath(path.resolve(root))}`, why: "Every error gate must pass before anyone sees the draft." }),
};

const DELIVER = {
  id: "deliver",
  finished: deliveryRecorded,
  action: (_state, root) => ({ type: "run", command: `${CLI} decide --root ${shellPath(path.resolve(root))} --project-root ${shellPath(path.resolve(root))} --stage deliver --answer renders/edit.mp4`, why: "Record the delivered file." }),
};

function stages(state) {
  const study = state.mode === "replicate" ? [REFERENCE] : [];
  if (state.tier === "quick") return [ANALYZE, ...study, CUT, RENDER, CHECK];
  return [INTAKE, ANALYZE, ...study, STYLE, CUT, RENDER, CHECK, REVIEW, DELIVER];
}

module.exports = { stages };

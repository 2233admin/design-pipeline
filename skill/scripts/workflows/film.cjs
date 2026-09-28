"use strict";

// Film sub-workflow: generated promo, explainer, logo sting, feature demo, 3D product shot.
// Guide: references/workflow-film.md (one section per stage id).

const fs = require("node:fs");
const path = require("node:path");
const { CLI, CONCEPTS, INTAKE, REVIEW, exists, gatePassed, reference } = require("./shared.cjs");

// The draft render: out.mp4, or the first .mp4 under renders/.
function draftRender(root) {
  if (exists(root, "out.mp4")) return "out.mp4";
  if (!exists(root, "renders")) return null;
  const name = fs.readdirSync(path.join(root, "renders")).find((file) => file.endsWith(".mp4"));
  return name ? path.join("renders", name) : null;
}

const REFERENCE = reference("Study 1-3 moving references and write reference.md (observed timings, cuts, rests, sound; what to transfer).");

const PLAN = {
  id: "plan",
  finished: (state, root) => exists(root, "storyboard.json") && gatePassed(state, root, "storyboard", ["storyboard.json"]),
  action: (state, root) => (exists(root, "storyboard.json")
    ? { type: "run", command: `${CLI} verify film-storyboard --storyboard storyboard.json`, why: "The storyboard gate must pass before building.", record: "fix each finding, then run next again" }
    : { type: "run", command: `${CLI} film scaffold --output .`, why: "Start from a passing storyboard and a composition with one call per beat." }),
};

const BUILD = {
  id: "build",
  finished: (state, root) => Boolean(draftRender(root)),
  action: () => ({ type: "run", command: "Build index.html from the storyboard beats, then: npx hyperframes render --output out.mp4", why: "Pick the lowest-rung tool that reaches each beat." }),
};

const CHECK = {
  id: "check",
  finished: (state, root) => gatePassed(state, root, "film", ["storyboard.json", draftRender(root)]),
  action: () => ({ type: "run", command: `${CLI} film check --project-root .`, why: "Every error gate must pass before anyone sees the draft; apply each finding's fix and rerun." }),
};

const DELIVER = {
  id: "deliver",
  finished: (state) => Boolean(state.decisions?.delivered),
  action: () => ({ type: "run", command: `Render the final quality (npx hyperframes render --quality high --output final.mp4), then: ${CLI} decide --project-root . --stage deliver --answer final.mp4`, why: "Drafts are cheap; the final render happens once, after acceptance." }),
};

function stages(state) {
  if (state.tier === "quick") return state.mode === "replicate" ? [REFERENCE, PLAN, BUILD, CHECK] : [PLAN, BUILD, CHECK];
  return [INTAKE, REFERENCE, CONCEPTS, PLAN, BUILD, CHECK, REVIEW, DELIVER];
}

module.exports = { stages };

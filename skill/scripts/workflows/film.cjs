"use strict";

// Film sub-workflow: generated promo, explainer, logo sting, feature demo, 3D product shot.
// Guide: references/workflow-film.md (one section per stage id).

const fs = require("node:fs");
const path = require("node:path");
const { canonicalJson } = require("../contract-utils.cjs");
const { CLI, CONCEPTS, INTAKE, REVIEW, exists, gatePassed, reference } = require("./shared.cjs");

// The draft render: out.mp4, or the first .mp4 under renders/.
function draftRender(root) {
  if (exists(root, "out.mp4")) return "out.mp4";
  if (!exists(root, "renders")) return null;
  const name = fs.readdirSync(path.join(root, "renders")).find((file) => file.endsWith(".mp4"));
  return name ? path.join("renders", name) : null;
}

const SHOT_GUIDE = "references/product-film-direction.md#from-reference-to-producible-shots";
const REFERENCE = reference("Study 1-3 moving references and write reference.md (observed timings, cuts, rests, sound; geometry, material effects and angle response to transfer).", {
  guides: [SHOT_GUIDE, "references/animation-thinking.md#study-a-reference-and-test-a-decision"],
  instruction: "For the current inspected passage, confirm the source shot boundaries before decomposing one shot; 2-second sampling windows are not confirmed shots. In reference.md separate observed facts (source times/frame ids, visible objects, occlusion, key poses and whether motion belongs to subject, camera, composite or edit) from proposed production (layer order, replacement assets with actual paths, missing poses/expressions, and applicable existing choreography). Keep hidden layers and unavailable assets unknown; an MP4 is not automatically separated artwork. Use project inspect for source code and asset references, then inspect the actual asset directories/files before choosing a production mechanism; the code index excludes binary media. Continue through source shots without requiring the final storyboard in this stage.",
});

function renderingPlan(root) {
  if (!exists(root, "storyboard.json")) return null;
  try { return JSON.parse(fs.readFileSync(path.join(root, "storyboard.json"), "utf8")).rendering || null; }
  catch { return null; } // The storyboard verifier supplies the JSON diagnostic.
}

function usesExampleBeats(root) {
  if (!exists(root, "storyboard.json")) return false;
  try {
    // ponytail: only unchanged shipped beats are detected; adaptation quality still needs visual review.
    const board = JSON.parse(fs.readFileSync(path.join(root, "storyboard.json"), "utf8"));
    const example = require("../../references/film-choreography/storyboard.example.json");
    return canonicalJson(board.beats) === canonicalJson(example.beats);
  } catch { return false; } // The existing verifier diagnoses malformed storyboards.
}

const SHOT_HANDOFF = "Read reference.md's observed shots and proposed production. Rewrite storyboard.json using its existing subject, productAction, transformation, motion, choreography, carrier and note fields; note binds source times/frame ids, layer order, real asset paths and unresolved dependencies. Set reference to the source notes. Read references/product-film-direction.md#from-reference-to-producible-shots; the scaffold is an example, not the supplied reference's storyboard. ";
const usesReference = (state, root) => state.mode === "replicate" || (state.tier !== "quick" && state.decisions?.reference !== "none" && exists(root, "reference.md"));

const PLAN = {
  id: "plan",
  finished: (state, root) => exists(root, "storyboard.json") && (state.mode !== "replicate" || (Boolean(renderingPlan(root)) && !usesExampleBeats(root))) && gatePassed(state, root, "storyboard", ["storyboard.json", ...(usesReference(state, root) ? ["reference.md"] : [])]),
  action: (state, root) => {
    const fromReference = usesReference(state, root);
    const handoff = fromReference ? SHOT_HANDOFF : "Author storyboard.json from the brief or chosen direction using references/product-film-direction.md and the existing choreography. ";
    const guides = [fromReference ? SHOT_GUIDE : "references/product-film-direction.md#3-write-an-audiovisual-storyboard", "references/film-choreography/registry.json"];
    return exists(root, "storyboard.json")
      ? { type: "run", command: `${handoff}${state.mode === "replicate" && !renderingPlan(root) ? "Record storyboard.json.rendering (route, requirements, reason, samples) from the reference using references/film-materials.md, then: " : ""}${CLI} verify film-storyboard --storyboard storyboard.json`, guides, why: "Author the actual direction before checking its structure and material route; a passing example does not prove reference reconstruction.", record: "fix each finding, then run next again" }
      : { type: "run", command: `${CLI} film scaffold --output .; then ${handoff}`, guides, why: "Create editable files, then author the actual storyboard." };
  },
};

const BUILD = {
  id: "build",
  finished: (state, root) => Boolean(draftRender(root)),
  action: (state, root) => {
    const rendering = renderingPlan(root);
    const material = rendering?.requirements.length
      ? `Implement ${rendering.requirements.join(", ")} using the recorded ${rendering.route} route. Read references/film-materials.md${rendering.route === "webgl" ? " and reuse references/film-materials/enamel.mjs for enamel" : ""}; inspect the planned material samples before full rendering. ` : "";
    return { type: "run", command: `${material}Use references/animation-thinking.md to define the action's key poses and timing/spacing; test an uncertain movement as a short study before extending it. Build index.html from the storyboard beats, then: npx hyperframes render --output out.mp4`, why: "The subject's action, camera and edit each need an intended effect; choose the simplest route that preserves it and the required material response." };
  },
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

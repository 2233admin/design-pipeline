"use strict";

// Film sub-workflow: generated promo, explainer, logo sting, feature demo, 3D product shot.
// Guide: references/workflow-film.md (one section per stage id).
// A film bound to a Stage 0 product-launch-video plan (state.jobPlan, verified by next before any
// stage is walked) is built from the real product: the source stage admits its recorded run and
// captures first, and standard/full tiers add an owner-viewed sample cut from those captures.

const fs = require("node:fs");
const path = require("node:path");
const { canonicalJson, isObject, resolveInside, sha256 } = require("../contract-utils.cjs");
const { CLI, CONCEPTS, INTAKE, REVIEW, deliveryRecorded, exists, reference } = require("./shared.cjs");
const { newestRender } = require("../film-project-core.cjs");
const { PRODUCT_PROMO_FORM, probe, productSourceAdmission, productSourceFiles, run } = require("../film-core.cjs");

function draftRender(root) {
  const video = newestRender(root);
  return video ? path.relative(root, video).split(path.sep).join("/") : null;
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

const productPromo = (state) => state.jobPlan?.deliverableForm === PRODUCT_PROMO_FORM;

function storyboard(root) {
  if (!exists(root, "storyboard.json")) return null;
  try { return JSON.parse(fs.readFileSync(path.join(root, "storyboard.json"), "utf8")); }
  catch { return null; } // The storyboard verifier supplies the JSON diagnostic.
}

// Checks also bind the admitted product material and the Stage 0 plan they ran under, so a changed
// capture or run log, or a rebound plan, reopens every pass that relied on them. Paths are spelled
// the way recordGate binds them.
const sourceInputs = (state, root) => [
  ...productSourceFiles(storyboard(root)).map(file => path.relative(root, path.resolve(root, file)).split(path.sep).join("/")),
  ...(state.jobPlan ? [state.jobPlan.jobPlanPath] : []),
];

// Record-level admission of storyboard.productSource; the storyboard gate admits the shots once
// beats exist. A malformed storyboard or record becomes one finding, so next still names the repair.
function sourceAdmission(root) {
  const invalid = message => ({ status: "failed", findings: [{ code: "product-source-invalid", severity: "error", message, fix: "Repair storyboard.json.productSource to the record shape in references/workflow-film.md#source, then run next again." }] });
  let board = {};
  if (exists(root, "storyboard.json")) {
    try { board = JSON.parse(fs.readFileSync(path.join(root, "storyboard.json"), "utf8")); }
    catch (error) { return invalid(`storyboard.json is not readable JSON: ${error.message}`); }
    if (!isObject(board)) return invalid("storyboard.json must hold one JSON object");
  }
  try { return productSourceAdmission(board, { deliverableForm: PRODUCT_PROMO_FORM, projectRoot: root, shots: false }); }
  catch (error) { return invalid(error.message); }
}

const SOURCE_STEPS = "Source the real product: clone its repository and check out one full commit SHA; start the run log inside the project with the output of `git -C <checkout> rev-parse HEAD`, then the start command and its output; run the product from that checkout in demo or seeded mode; capture at least one UI state and one user operation with its visible response and result as image or video files inside the project; record storyboard.json.productSource with the repository, commit, run, captures (each file's sha256 and capture time) and flow (action, response and result capture ids). If it cannot be cloned, built, run or captured, record productSource.status \"blocked\" with the blocker's kind, reason and needs instead, and stop. Never invent screens, mock UI or cards in its place.";

const SOURCE = {
  id: "source",
  finished: (state, root) => sourceAdmission(root).status === "admitted",
  action: (state, root) => {
    const admission = sourceAdmission(root);
    if (admission.status === "blocked") {
      const { kind, reason, needs } = storyboard(root).productSource.blocker;
      return { type: "blocked", blocker: { kind, reason, needs }, why: "The product could not be sourced, so this film is not planned, built or evaluated; invented screens or cards would misrepresent it.", instruction: "Resolve what the blocker needs with the user, replace storyboard.json.productSource with the admitted record, then run next again." };
    }
    const scaffold = !exists(root, "storyboard.json");
    return { type: "run", ...(scaffold ? { command: `${CLI} film scaffold --output .` } : {}), instruction: `${scaffold ? "Run the command first, then: " : ""}${SOURCE_STEPS} Fix each finding, then run next again.`, findings: admission.findings, why: "A product promo is evaluated only when it is built from the real product, run at a pinned commit and captured; text, cards or invented screens cannot stand in for it." };
  },
};

const SHOT_HANDOFF = "Read reference.md's observed shots and proposed production. Rewrite storyboard.json using its existing subject, productAction, transformation, motion, choreography, carrier and note fields; note binds source times/frame ids, layer order, real asset paths and unresolved dependencies. Set reference to the source notes. Read references/product-film-direction.md#from-reference-to-producible-shots; the scaffold is an example, not the supplied reference's storyboard. ";
const usesReference = (state, root) => state.mode === "replicate" || (state.tier !== "quick" && state.decisions?.reference !== "none" && exists(root, "reference.md"));
const PRODUCT_PLAN = "Build the beats from the admitted captures: list the capture ids each beat shows in beats[].source (titles, captions and claims sit on real captures; only a pure brand card, a brand-hold with transformation none, may stay unsourced, within a quarter of the film), and show the recorded flow's action, response and result in that order with action beats that cite them. ";
const PRODUCT_BUILD = "Build from the admitted captures each beat cites in beats[].source: the product's own UI states and operations carry the film, never invented screens, mock UI or stand-in cards. ";

const PLAN = {
  id: "plan",
  finished: (state, root) => exists(root, "storyboard.json") && (state.mode !== "replicate" || (Boolean(renderingPlan(root)) && !usesExampleBeats(root))),
  gate: { name: "storyboard", inputs: (state, root) => ["storyboard.json", ...(usesReference(state, root) ? ["reference.md"] : []), ...sourceInputs(state, root)] },
  action: (state, root) => {
    const fromReference = usesReference(state, root);
    const handoff = `${fromReference ? SHOT_HANDOFF : "Author storyboard.json from the brief or chosen direction using references/product-film-direction.md and the existing choreography. "}${productPromo(state) ? PRODUCT_PLAN : ""}`;
    const guides = [fromReference ? SHOT_GUIDE : "references/product-film-direction.md#3-write-an-audiovisual-storyboard", "references/film-choreography/registry.json"];
    return exists(root, "storyboard.json")
      ? { type: "run", command: `${CLI} verify film-storyboard --storyboard storyboard.json`, instruction: `${handoff}${state.mode === "replicate" && !renderingPlan(root) ? "Record storyboard.json.rendering (route, requirements, reason, samples) from the reference using references/film-materials.md. " : ""}Then run the command; fix each finding, then run next again.`, guides, why: "Author the actual direction before checking its structure and material route; a passing example does not prove reference reconstruction." }
      : { type: "run", command: `${CLI} film scaffold --output .`, instruction: `Run the command first, then: ${handoff}`, guides, why: "Create editable files, then author the actual storyboard." };
  },
};

const BUILD = {
  id: "build",
  finished: (state, root) => Boolean(draftRender(root)),
  action: (state, root) => {
    const rendering = renderingPlan(root);
    const material = rendering?.requirements.length
      ? `Implement ${rendering.requirements.join(", ")} using the recorded ${rendering.route} route. Read references/film-materials.md${rendering.route === "webgl" ? " and reuse references/film-materials/enamel.mjs for enamel" : ""}; inspect the planned material samples before full rendering. ` : "";
    return { type: "run", instruction: `${material}${productPromo(state) ? PRODUCT_BUILD : ""}Use references/animation-thinking.md to define the action's key poses and timing/spacing; test an uncertain movement as a short study before extending it. Build index.html from the storyboard beats, then: npx --no-install hyperframes render --output out.mp4`, why: "The subject's action, camera and edit each need an intended effect; choose the simplest route that preserves it and the required material response." };
  },
};

const CHECK = {
  id: "check",
  gate: { name: "film", inputs: (state, root) => ["storyboard.json", draftRender(root), ...["index.html", "timeline.json", "score-grid.json"].filter(file => exists(root, file)), ...sourceInputs(state, root)] },
  action: () => ({ type: "run", command: `${CLI} film check --project-root .`, why: "Every error gate must pass before anyone sees the draft; apply each finding's fix and rerun." }),
};

// Every film tier ends in the owner's verdict on the checked draft. Before asking, the agent
// reviews the draft one frame per second: the gates sample beats and text layout, not every
// frame, and they never grant acceptance.
const frameReview = (root) => `Review the checked draft frame by frame first: ffmpeg -i ${draftRender(root) || "out.mp4"} -vf fps=1 evidence/second-%03d.png, then open every frame at full size and look for text overlap, clipping, empty transitional frames, edge crowding, too-small text and wrong values. Fix what you find, re-render and rerun film check; write the frame and creative review in qa.md. Then ask the owner:`;
const FILM_REVIEW = { ...REVIEW, action: (state, root) => ({ first: frameReview(root), ...REVIEW.action(state, root) }) };

const DELIVER = {
  id: "deliver",
  finished: deliveryRecorded,
  action: () => ({ type: "run", command: `${CLI} decide --project-root . --stage deliver --answer final.mp4`, instruction: "Render the final quality first (npx --no-install hyperframes render --quality high --output final.mp4), then run the command to record it.", why: "Drafts are cheap; the final render happens once, after acceptance." }),
};

// A product promo's first owner-viewed cut is a short sample from the real captures. A verdict binds
// the sample bytes and the productSource record it was cut from; replacing either asks again.
const SAMPLE_FILE = "sample.mp4";

function sampleBinding(root) {
  const source = storyboard(root)?.productSource;
  if (!isObject(source)) return null;
  try {
    const file = resolveInside(root, SAMPLE_FILE, "sample", { scope: "workflow", mustExist: true });
    if (!fs.statSync(file).isFile()) return null;
    return { sha256: "sha256:" + sha256(fs.readFileSync(file)), sourceSha256: "sha256:" + sha256(canonicalJson(source)) };
  } catch { return null; }
}

// The sample is the owner's first look at the real material, so it must decode and run 5–8 s; an
// unreadable or off-length file never reaches the verdict. Findings carry the fix, like the gates'.
// ffprobe reads only metadata, so a full video decode proves the frames; the decode fails when ffmpeg exits non-zero.
const SAMPLE_SECONDS = [5, 8];
function inspectSample(root) {
  const finding = (code, message, fix) => ({ code, severity: "error", message, fix });
  const recut = `Recut ${SAMPLE_FILE} as a decodable video of ${SAMPLE_SECONDS[0]}–${SAMPLE_SECONDS[1]} s at the project root, then run next again.`;
  const notVideo = detail => ({ findings: [finding("sample-not-video", `${SAMPLE_FILE} cannot be decoded as video: ${detail}`, recut)] });
  const tools = { ffmpeg: "ffmpeg", ffprobe: "ffprobe" };
  let file;
  try { file = resolveInside(root, SAMPLE_FILE, "sample", { scope: "workflow", mustExist: true }); } catch (error) { return notVideo(error.message); }
  try {
    const media = probe(file, tools);
    const [min, max] = SAMPLE_SECONDS;
    if (!(media.durationSec >= min && media.durationSec <= max)) return { findings: [finding("sample-duration", `${SAMPLE_FILE} runs ${Number(media.durationSec.toFixed(2))} s; the sample must run ${min}–${max} s.`, recut)] };
    run(tools.ffmpeg, ["-v", "error", "-xerror", "-i", file, "-map", "0:v:0", "-f", "null", "-"]);
    return { findings: [] };
  } catch (error) {
    if (error.code === "TOOL_MISSING") return { findings: [finding("sample-probe-unavailable", error.message, "Install ffmpeg and ffprobe on PATH so the sample can be checked, then run next again.")] };
    return notVideo(String(error.message).split(/\r?\n/)[0].slice(0, 300));
  }
}

const SAMPLE = {
  id: "sample",
  finished: (state, root) => {
    const latest = state.decisions?.samples?.at(-1), current = sampleBinding(root);
    return latest?.verdict === "accept" && Boolean(current) && latest.sha256 === current.sha256 && latest.sourceSha256 === current.sourceSha256 && inspectSample(root).findings.length === 0;
  },
  action: (state, root) => {
    const current = sampleBinding(root);
    if (!current) return { type: "run", instruction: `Cut a ${SAMPLE_SECONDS[0]}–${SAMPLE_SECONDS[1]} s sample from the real captures cited in beats[].source that shows the recorded action, then its response, then the result; crop, zoom, mask and caption the captures, but add no invented cards or redrawn UI. Save it as ${SAMPLE_FILE} at the project root, then run next again.`, why: "The owner judges the real material on a short cut before the whole film is built from it." };
    const { findings } = inspectSample(root);
    if (findings.length) return { type: "run", instruction: `${findings[0].fix} Apply each finding's fix, then run next again.`, findings, why: `The owner is shown ${SAMPLE_FILE} only once it decodes and runs ${SAMPLE_SECONDS[0]}–${SAMPLE_SECONDS[1]} s.` };
    const latest = state.decisions?.samples?.at(-1);
    const captures = storyboard(root).productSource.captures;
    const show = [SAMPLE_FILE, ...(Array.isArray(captures) ? captures.map(capture => capture?.path) : [])].flatMap(rel => {
      try {
        const file = resolveInside(root, rel, "sample file", { scope: "workflow", mustExist: true });
        return fs.statSync(file).isFile() ? [file] : [];
      } catch { return []; }
    });
    return {
      type: "ask",
      // The owner already rejected these exact bytes: recut before asking again.
      ...(latest?.verdict === "reject" && latest.sha256 === current.sha256 ? { first: `The owner rejected this exact ${SAMPLE_FILE} ("${latest.reason}"). Recut it from the cited captures under the project rules, then ask the owner:` } : {}),
      question: "Does this sample, cut only from the real captures, show the product the way the film should? Accept it, or reject it with one sentence on what is wrong?",
      show,
      recommended: `Watch ${SAMPLE_FILE} at full speed beside its capture files; accept only if every frame is the product's own material.`,
      record: `${CLI} decide --project-root . --stage sample --verdict accept|reject [--answer "<reason>"]`,
      why: "The owner sees the real material before the full build. This verdict settles the material direction only; it is not a gate result or the film's Visual Acceptance.",
    };
  },
};

// A product promo's intake asks where the product lives and how it runs; the other questions are shared.
const PRODUCT_ASSETS = { id: "assets", ask: "Where is the product's repository, and how is it run in a demo or seeded mode (install and start commands, fixture data)? Which logos or music can be used, and are they licensed for this use?", recommended: "The product's own repository, run at a pinned commit; its real UI is captured — nothing invented." };
const PRODUCT_INTAKE = {
  ...INTAKE,
  action: (state, root) => {
    const action = INTAKE.action(state, root);
    return { ...action, questions: action.questions.map(question => (question.id === "assets" ? PRODUCT_ASSETS : question)) };
  },
};

// quick ends at the owner's review (no delivery render); standard and full also deliver. A product
// promo first admits its real source; standard and full show the owner a sample cut from it.
function stages(state) {
  if (productPromo(state)) {
    if (state.tier === "quick") return state.mode === "replicate" ? [REFERENCE, SOURCE, PLAN, BUILD, CHECK, FILM_REVIEW] : [SOURCE, PLAN, BUILD, CHECK, FILM_REVIEW];
    return [PRODUCT_INTAKE, SOURCE, REFERENCE, CONCEPTS, PLAN, SAMPLE, BUILD, CHECK, FILM_REVIEW, DELIVER];
  }
  if (state.tier === "quick") return state.mode === "replicate" ? [REFERENCE, PLAN, BUILD, CHECK, FILM_REVIEW] : [PLAN, BUILD, CHECK, FILM_REVIEW];
  return [INTAKE, REFERENCE, CONCEPTS, PLAN, BUILD, CHECK, FILM_REVIEW, DELIVER];
}

// A finished product promo reports the admission its checked storyboard was evaluated under.
function doneFields(state, root) {
  if (!productPromo(state)) return {};
  const { findings, ...admission } = productSourceAdmission(storyboard(root) || {}, { deliverableForm: PRODUCT_PROMO_FORM, projectRoot: root });
  return { admission: findings.length ? { ...admission, findings } : admission };
}

module.exports = { doneFields, sampleBinding, stages };

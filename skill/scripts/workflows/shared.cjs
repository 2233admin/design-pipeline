"use strict";

// Stages and helpers shared by the deliverable sub-workflows (film, edit).
// A stage is { id, finished(state, root), action(state, root) }; `next` walks a sub-workflow's
// stages and returns the first unfinished one's action.

const fs = require("node:fs");
const path = require("node:path");

const CLI = "designer-pipeline";

const exists = (root, rel) => fs.existsSync(path.join(root, rel));
const mtime = (root, rel) => (exists(root, rel) ? fs.statSync(path.join(root, rel)).mtimeMs : 0);

function referenceObserved(state, root) {
  if (state.mode !== "replicate" && state.decisions?.reference === "none") return true;
  if (!exists(root, "reference.md")) return false;
  if (!exists(root, "reference-evidence.json")) return true; // Legacy notes have no media binding.
  const { readJson } = require("../contract-utils.cjs");
  const ref = readJson(path.join(root, "reference-evidence.json"), "reference evidence");
  if (ref.source?.kind !== "video" && !ref.videoAnalysis) return true;
  if (!ref.videoAnalysis) return false;
  const video = require("../reference-video-core.cjs").checkVideoAnalysis(root, ref.videoAnalysis, ref.source, { requireProduction: true });
  return video.status === "ready" && video.coverage.fullSource;
}

// A gate result counts only when it passed and is not older than the files it checked, so an
// edited storyboard or a re-rendered draft reopens its stage. File times and Date.now() come from
// different clocks; on a loaded Windows host a file written just before the gate was recorded can
// carry a time a few milliseconds after it, so the comparison allows CLOCK_SKEW_MS. A real edit
// comes seconds later and still reopens the stage.
const CLOCK_SKEW_MS = 50;
function gatePassed(state, root, gate, inputs = []) {
  const result = state.gates && state.gates[gate];
  if (!result || result.status !== "passed") return false;
  const newest = Math.max(0, ...inputs.filter(Boolean).map((rel) => mtime(root, rel)));
  return result.at + CLOCK_SKEW_MS >= newest;
}

const INTAKE = {
  id: "intake",
  finished: (state, root) => exists(root, "brief.md"),
  action: () => ({
    type: "ask",
    question: "Answer in one reply; \"default\" accepts every recommendation.",
    questions: [
      { id: "product", ask: "What is the product and the one thing the viewer should understand?", recommended: "Take it from the conversation so far." },
      { id: "audience", ask: "Who watches it and where (site hero, social, launch event)?", recommended: "Product website hero, general audience." },
      { id: "duration", ask: "How long?", recommended: "15-30 s for a promo, 30-60 s for an edit." },
      { id: "assets", ask: "Which footage, screenshots, models, logos or music can be used, and are they licensed for this use?", recommended: "Only material you own; missing pieces are generated." },
    ],
    record: `${CLI} decide --project-root . --stage intake --answer "<the user's reply>"`,
    why: "Only facts that change the result are asked; style comes from references and judgment.",
  }),
};

// In replicate mode the reference is the job, so it cannot be waived.
function reference(study, context = {}) {
  return {
    id: "reference",
    finished: referenceObserved,
    action: (state, root) => {
      let observation;
      if (root && exists(root, "reference-evidence.json")) {
        const ref = require("../contract-utils.cjs").readJson(path.join(root, "reference-evidence.json"), "reference evidence");
        if (ref.videoAnalysis) observation = require("../reference-video-core.cjs").checkVideoAnalysis(root, ref.videoAnalysis, ref.source, { requireProduction: true }).nextActions[0];
      }
      const guides = [...new Set([observation ? "references/reference-spec.md#video-content-and-project-analysis" : "references/reference-spec.md", ...(context.guides || [])])];
      const images = (observation?.images || []).map(image => ({ ...image, relativePath: image.path, path: require("../contract-utils.cjs").resolveInside(root, image.path, "reference image", { scope: "workflow", mustExist: true }) }));
      const work = observation
        ? observation.kind === "observe-window"
          ? `Inspect ${observation.windowId} (${observation.startSec}–${observation.endSec}s) in ${observation.viewerPath || observation.reportPath}, using frames ${observation.frameIds.join(", ")}. ${observation.instruction} Update observations in ${observation.reportPath}, refresh videoAnalysis.sha256 in reference-evidence.json, and record actual findings in reference.md. Use the attached resample arguments if needed.`
          : `${observation.instruction}${observation.resample ? " Use the attached resample arguments." : ""} Current report: ${observation.reportPath}.`
        : `For a local video first run ${CLI} reference analyze-video --path <contained-video> --output <new-evidence-dir>; inspect the ordered timed windows, confirm shot bounds and applicable target properties, and fill observations in its report, then bind videoAnalysis.path/sha256 in reference-evidence.json. Resample uncertain intervals with --start <sec> --end <sec> --fps 24 into a new directory. In an existing project run ${CLI} project inspect --project-root . --write --output .design-pipeline/project-analysis-v1.json and read the relevant source lines before proposing changes.`;
      return {
        type: "run",
        study, images, guides,
        command: `${study} ${work}${context.instruction ? ` ${context.instruction}` : ""} Read the applicable guides: ${guides.join(", ")}.`,
        why: state.mode === "replicate" ? "Replicate mode: the reference is what we reproduce, so it is measured first." : "Direction comes from watched references, not from a familiar template.",
        ...(observation ? { observation, ...(observation.viewerPath ? { show: [observation.viewerPath] } : {}) } : {}),
        ...(state.mode === "replicate" ? {} : { then: `Or, if the user gave no references and wants none: ${CLI} decide --project-root . --stage reference --answer none` }),
      };
    },
  };
}

const CONCEPTS = {
  id: "concepts",
  finished: (state) => Boolean(state.decisions?.concept),
  action: (state, root) => (exists(root, "concepts.md")
    ? { type: "ask", question: "Which concept should we make?", options: "the three cards in concepts.md", recommended: "Recommend the concept whose carrier best demonstrates the product action.", record: `${CLI} decide --project-root . --stage concept --choice <1|2|3> [--answer "<changes>"]`, why: "The first of two human decisions." }
    : { type: "run", command: "Write concepts.md: three cards whose central ideas differ; not the same scenes retold three ways. Each card starts with the central idea as one sentence about the picture (for example 'one dot becomes every screen of the app'), then what carries attention between beats, look, tools (one line), and any missing license. Render one key frame per card.", why: "Divergence before convergence; the user picks one." }),
};

const REVIEW = {
  id: "review",
  finished: (state) => (state.decisions?.drafts || []).some((draft) => draft.verdict === "accept"),
  action: (state) => ({ type: "ask", question: "Accept this draft, or reject it with one sentence on what is wrong?", show: ["the draft video", "evidence/contact-sheet.png", "the gate summary"], recommended: "Accept if nothing reads wrong at full speed.", record: `${CLI} decide --project-root . --stage review --verdict accept|reject [--answer "<reason>"]`, why: `The second human decision${(state.decisions?.drafts || []).length ? `; ${(state.decisions.drafts).length} earlier draft(s) were rejected and their reasons are project rules` : ""}.` }),
};

module.exports = { CLI, CONCEPTS, INTAKE, REVIEW, exists, gatePassed, reference };

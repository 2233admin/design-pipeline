"use strict";

// Stages and helpers shared by the deliverable sub-workflows (film, edit).
// Stages declare finished(state, root) and/or the existing gate with its required inputs.
// `next` checks that gate once and returns the first unfinished action with recovery context.

const fs = require("node:fs");
const path = require("node:path");
const { canonicalJson, resolveInside, sha256 } = require("../contract-utils.cjs");

const CLI = "designer-pipeline";

const exists = (root, rel) => fs.existsSync(path.join(root, rel));

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

function gateStatus(state, root, gate, inputs = []) {
  const result = state.gates && state.gates[gate];
  const context = { gate, recordedStatus: result?.status || null };
  const finding = (code, message, fix, file) => ({ code, severity: "error", message, fix, ...(file ? { path: file } : {}) });
  if (result?.status !== "passed") return {
    ...context, status: result?.status === "failed" ? "failed" : "incomplete",
    findings: result?.findings?.length ? result.findings : [finding("workflow-check-required", `No current passed ${gate} check is recorded.`, "Run the returned check and apply its findings before continuing.")],
    next: result?.next || "Run the returned verification command and apply its reported fixes.",
  };
  if (!result.inputHashes || !Object.keys(result.inputHashes).length) return {
    ...context, status: "stale", findings: [finding("workflow-pass-unbound", "The recorded pass has no checked-file bindings.", "Rerun the returned check; do not edit cached state to mark it passed.")],
  };
  const key = rel => process.platform === "win32" ? rel.toLowerCase() : rel;
  const inputHashes = Object.fromEntries(Object.entries(result.inputHashes).map(([rel, hash]) => [key(rel), hash]));
  const files = new Map([...Object.keys(result.inputHashes), ...inputs.filter(Boolean)].map(rel => [key(rel), rel]));
  const findings = [];
  for (const rel of files.values()) {
    try {
      const file = resolveInside(root, rel, "checked input", { scope: "workflow" });
      if (!fs.existsSync(file)) findings.push(finding("workflow-input-missing", `Checked input is missing: ${rel}`, "Restore or rebuild this input, then rerun the returned check.", rel));
      else if (!inputHashes[key(rel)]) findings.push(finding("workflow-input-unbound", `The recorded check did not bind required input: ${rel}`, gate === "interaction" && key(rel) === "index.html" ? "Point interaction.json.url at the local index.html, then rerun the returned check." : "Verify this required input with the returned check; do not edit the stored pass.", rel));
      else if (inputHashes[key(rel)] !== "sha256:" + sha256(fs.readFileSync(file))) findings.push(finding("workflow-input-changed", `Checked input changed: ${rel}`, "Rerun the returned check against the current input, then review the new draft when requested.", rel));
    } catch {
      findings.push(finding("workflow-input-unavailable", `Checked input is unreadable or outside the project: ${rel}`, "Repair the contained input path, then rerun the returned check.", rel));
    }
  }
  return { ...context, status: findings.length ? "stale" : "passed", findings, ...(result.findings?.length ? { previousFindings: result.findings } : {}) };
}

const gatePassed = (...args) => gateStatus(...args).status === "passed";

function reviewInputHashes(state) {
  const gate = { film: "film", edit: "edit", web: "interaction" }[state.deliverable];
  return state.gates?.[gate]?.inputHashes || null;
}

function deliveryRecorded(state, root) {
  if (!state.decisions?.delivered || !state.decisions.deliveryInputHashes
      || canonicalJson(state.decisions.deliveryInputHashes) !== canonicalJson(reviewInputHashes(state))) return false;
  if (state.deliverable === "web") return true;
  try {
    const file = resolveInside(root, state.decisions.delivered, "delivery file", { scope: "workflow", mustExist: true });
    return state.decisions.deliveredSha256 === "sha256:" + sha256(fs.readFileSync(file));
  } catch { return false; }
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
  finished: (state) => {
    const draft = state.decisions?.drafts?.at(-1);
    return draft?.verdict === "accept" && Boolean(draft.inputHashes)
      && canonicalJson(draft.inputHashes) === canonicalJson(reviewInputHashes(state));
  },
  action: (state, root) => {
    const web = state.deliverable === "web";
    const outputs = Object.keys(reviewInputHashes(state) || {}).filter(file => (web ? /\.html?$/i : /\.mp4$/i).test(file));
    const show = [...outputs, "evidence/contact-sheet.png", ...(web ? ["evidence/interaction.json"] : [])].flatMap(rel => {
      try {
        const file = resolveInside(root, rel, "review file", { scope: "workflow", mustExist: true });
        return fs.statSync(file).isFile() ? [file] : [];
      } catch { return []; }
    });
    return { type: "ask", question: web ? "Inspect the checked page and its key interactions. Accept it, or reject it with one sentence on what is wrong?" : "Accept this checked draft, or reject it with one sentence on what is wrong?", show, recommended: web ? "Inspect the checked page and its key interactions before accepting." : "Watch the checked draft at full speed with its audio before accepting.", record: `${CLI} decide --project-root . --stage review --verdict accept|reject [--answer "<reason>"]`, why: `The second human decision${(state.decisions?.drafts || []).length ? `; ${(state.decisions.drafts).length} earlier draft(s) were rejected and their reasons are project rules` : ""}.` };
  },
};

module.exports = { CLI, CONCEPTS, INTAKE, REVIEW, deliveryRecorded, exists, gatePassed, gateStatus, reference, reviewInputHashes };

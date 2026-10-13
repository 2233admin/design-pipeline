"use strict";

// Stages and helpers shared by the deliverable sub-workflows (film, edit).
// Stages declare finished(state, root) and/or the existing gate with its required inputs.
// `next` checks that gate once and returns the first unfinished action with recovery context.

const fs = require("node:fs");
const path = require("node:path");
const { canonicalJson, fail, resolveInside, sha256 } = require("../contract-utils.cjs");

// designer-pipeline is not on PATH, so every command a next action returns is the runnable
// `node <absolute path of designer-pipeline.cjs> ...`, derived from this file's location. Forward
// slashes keep the path valid in cmd, PowerShell and POSIX shells. Windows expansion characters
// cannot be made safe for both cmd and PowerShell by double quotes, so command generation refuses them.
function shellPath(file, platform = process.platform) {
  if (platform === "win32" && /[$`"%!\p{Cc}]/u.test(file)) {
    fail("shell command", `unsafe Windows path: ${file}. Fix: move or rename the project or installation directory to a path without $, backtick, double quote, %, ! or control characters`);
  }
  const slashed = file.split(path.sep).join("/");
  if (/^[\w@%+=:,./-]+$/.test(slashed)) return slashed;
  return `"${platform === "win32" ? slashed : slashed.replace(/(["$`\\])/g, "\\$1")}"`;
}
function cliCommand(file = path.resolve(__dirname, "..", "designer-pipeline.cjs"), platform = process.platform) {
  return `node ${shellPath(file, platform)}`;
}

const exists = (root, rel) => fs.existsSync(path.join(root, rel));

function referenceObserved(state, root) {
  if (state.mode !== "replicate" && state.decisions?.reference === "none") return true;
  if (!exists(root, "reference.md")) return false;
  // `film scaffold` writes an empty reference.md template; it records no observed reference.
  if (require("../scaffold-notes.cjs").isUnfilledScaffoldNote("reference.md", fs.readFileSync(path.join(root, "reference.md"), "utf8"))) return false;
  if (!exists(root, "reference-evidence.json")) return true; // Legacy notes have no media binding.
  const { readJson } = require("../contract-utils.cjs");
  const ref = readJson(path.join(root, "reference-evidence.json"), "reference evidence");
  if (ref.source?.kind !== "video" && !ref.videoAnalysis) return true;
  if (!ref.videoAnalysis) return false;
  const video = require("../reference-video-core.cjs").checkVideoAnalysis(root, ref.videoAnalysis, ref.source, { requireProduction: true });
  return video.status === "ready" && video.coverage.fullSource;
}

// The project's design-token sources. An interaction pass binds the ones present; one that appears
// after the pass reopens the gate.
const TOKEN_SOURCES = ["DESIGN.md", "MOTION.md"];
const LINEAGE_FIELDS = ["files", "tokens", "absent", "remote"];
const validLineage = lineage => lineage !== null && typeof lineage === "object" && LINEAGE_FIELDS.every(field => Array.isArray(lineage[field]) && lineage[field].every(item => typeof item === "string"));

// Bind legacy catalog recovery commands only in the returned projection, not cached evidence.
function projectGateCommand(text, root) {
  return typeof text === "string" && text.includes("designer-pipeline film blocks")
    ? text.replaceAll("designer-pipeline film blocks", `${cliCommand()} film blocks --root ${shellPath(path.resolve(root))} --project-root ${shellPath(path.resolve(root))}`)
    : text;
}

function gateStatus(state, root, gate, inputs = []) {
  const result = state.gates && state.gates[gate];
  const context = { gate, recordedStatus: result?.status || null };
  const recordedFindings = result?.findings?.map(item => typeof item.fix === "string"
    ? { ...item, fix: projectGateCommand(item.fix, root) } : item);
  const finding = (code, message, fix, file) => ({ code, severity: "error", message, fix, ...(file ? { path: file } : {}) });
  if (result?.status !== "passed") return {
    ...context, status: ["failed", "blocked"].includes(result?.status) ? result.status : "incomplete",
    findings: recordedFindings?.length ? recordedFindings : [finding("workflow-check-required", `No current passed ${gate} check is recorded.`, "Run the returned check and apply its findings before continuing.")],
    next: projectGateCommand(result?.next, root) || "Run the returned verification command and apply its reported fixes.",
  };
  if (!result.inputHashes || !Object.keys(result.inputHashes).length) return {
    ...context, status: "stale", findings: [finding("workflow-pass-unbound", "The recorded pass has no checked-file bindings.", "Rerun the returned check; do not edit cached state to mark it passed.")],
  };
  // An interaction pass also binds what the page loaded and the design tokens. A record without that
  // lineage predates it; a token source or a page file that was missing and has since appeared is
  // an input the pass never checked.
  let lineageInputs = [];
  if (gate === "interaction") {
    if (!validLineage(result.lineage)) return {
      ...context, status: "stale", findings: [finding("workflow-lineage-missing", "The recorded interaction pass does not bind the files the page loaded or the project's DESIGN.md and MOTION.md.", "Rerun the returned verify interaction command; it binds the page's stylesheets, scripts, fonts, images and design tokens. Do not edit cached state.")],
    };
    lineageInputs = [...TOKEN_SOURCES, ...result.lineage.absent].filter(rel => exists(root, rel));
  }
  const key = rel => process.platform === "win32" ? rel.toLowerCase() : rel;
  const inputHashes = Object.fromEntries(Object.entries(result.inputHashes).map(([rel, hash]) => [key(rel), hash]));
  const files = new Map([...Object.keys(result.inputHashes), ...inputs.filter(Boolean), ...lineageInputs].map(rel => [key(rel), rel]));
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
  return { ...context, status: findings.length ? "stale" : "passed", findings, ...(recordedFindings?.length ? { previousFindings: recordedFindings } : {}) };
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
  finished: (state) => Boolean(state.decisions?.intake),
  action: (_state, root) => ({
    type: "ask",
    question: "Answer in one reply; \"default\" accepts every recommendation.",
    questions: [
      { id: "product", ask: "What is the product and the one thing the viewer should understand?", recommended: "Take it from the conversation so far." },
      { id: "audience", ask: "Who watches it and where (site hero, social, launch event)?", recommended: "Product website hero, general audience." },
      { id: "duration", ask: "How long?", recommended: "15-30 s for a promo, 30-60 s for an edit." },
      { id: "assets", ask: "Which footage, screenshots, models, logos or music can be used, and are they licensed for this use?", recommended: "Only material you own; missing pieces are generated." },
    ],
    record: `${cliCommand()} decide --root ${shellPath(path.resolve(root))} --project-root ${shellPath(path.resolve(root))} --stage intake --answer "<the user's reply>"`,
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
        : `For a local video first run ${cliCommand()} reference analyze-video --root ${shellPath(path.resolve(root))} --path <contained-video> --output <new-evidence-dir>; inspect the ordered timed windows, confirm shot bounds and applicable target properties, and fill observations in its report, then bind videoAnalysis.path/sha256 in reference-evidence.json. Resample uncertain intervals with --start <sec> --end <sec> --fps 24 into a new directory. In an existing project run ${cliCommand()} project inspect --root ${shellPath(path.resolve(root))} --project-root ${shellPath(path.resolve(root))} --write --output .design-pipeline/project-analysis-v1.json and read the relevant source lines before proposing changes.`;
      return {
        type: "run",
        study, images, guides,
        instruction: `${study} ${work}${context.instruction ? ` ${context.instruction}` : ""} Read the applicable guides: ${guides.join(", ")}.`,
        why: state.mode === "replicate" ? "Replicate mode: the reference is what we reproduce, so it is measured first." : "Direction comes from watched references, not from a familiar template.",
        ...(observation ? { observation, ...(observation.viewerPath ? { show: [observation.viewerPath] } : {}) } : {}),
        ...(state.mode === "replicate" ? {} : { then: `Or, if the user gave no references and wants none: ${cliCommand()} decide --root ${shellPath(path.resolve(root))} --project-root ${shellPath(path.resolve(root))} --stage reference --answer none` }),
      };
    },
  };
}

const CONCEPTS = {
  id: "concepts",
  finished: (state) => Boolean(state.decisions?.concept),
  action: (state, root) => (exists(root, "concepts.md")
    ? { type: "ask", question: "Which concept should we make?", options: "the three cards in concepts.md", recommended: "Recommend the concept whose carrier best demonstrates the product action.", record: `${cliCommand()} decide --root ${shellPath(path.resolve(root))} --project-root ${shellPath(path.resolve(root))} --stage concept --choice <1|2|3> [--answer "<changes>"]`, why: "The first of two human decisions." }
    : { type: "run", instruction: "Write concepts.md: three cards whose central ideas differ; not the same scenes retold three ways. Each card starts with the central idea as one sentence about the picture (for example 'one dot becomes every screen of the app'), then what carries attention between beats, look, tools (one line), and any missing license. Render one key frame per card.", why: "Divergence before convergence; the user picks one." }),
};

// A web review verdict binds the components decision it judged; a changed decision needs a fresh review.
function componentDecisionDigest(state) {
  return state.deliverable === "web" && typeof state.decisions?.components === "string"
    ? "sha256:" + sha256(canonicalJson({ answer: state.decisions.components, sources: state.decisions.componentSources ?? null }))
    : null;
}

const REVIEW = {
  id: "review",
  finished: (state) => {
    const draft = state.decisions?.drafts?.at(-1);
    return draft?.verdict === "accept" && Boolean(draft.inputHashes)
      && canonicalJson(draft.inputHashes) === canonicalJson(reviewInputHashes(state))
      && (draft.componentDecision ?? null) === componentDecisionDigest(state);
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
    const rejected = (state.decisions?.drafts || []).length ? `; ${(state.decisions.drafts).length} earlier draft(s) were rejected and their reasons are project rules` : "";
    return { type: "ask", question: web ? "Inspect the checked page and its key interactions. Accept it, or reject it with one sentence on what is wrong?" : "Accept this checked draft, or reject it with one sentence on what is wrong?", show, recommended: web ? "Inspect the checked page and its key interactions before accepting." : "Watch the checked draft at full speed with its audio before accepting.", record: `${cliCommand()} decide --root ${shellPath(path.resolve(root))} --project-root ${shellPath(path.resolve(root))} --stage review --verdict accept|reject [--answer "<reason>"]`, why: web ? `Final acceptance of the whole checked page, after each section was reviewed${rejected}.` : `The second human decision${rejected}.` };
  },
};

module.exports = { cliCommand, CONCEPTS, INTAKE, REVIEW, TOKEN_SOURCES, componentDecisionDigest, deliveryRecorded, exists, shellPath, gatePassed, gateStatus, reference, reviewInputHashes };

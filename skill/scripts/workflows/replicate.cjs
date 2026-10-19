"use strict";

// Replicate mode for ui and web (OpenSpec change replicate-extract-first): the reference is extracted
// into a draft DESIGN.md and MOTION.md (and, at standard and full, the design-system package) before
// anything is built, `next` runs the existing foundation and reference checks itself, and the owner
// confirms what is borrowed. The confirmation stores the hashes of what it judged; the web description
// approval, the web probe and delivery, and the ui delivery and review bind to them, so a later edit
// reopens the confirmation instead of drifting past it. No new gate or receipt: this reuses
// `foundation check`, `reference check`, the decision history and the evaluate-website-clone verdict.

const fs = require("node:fs");
const path = require("node:path");
const { fail, readJson, sha256 } = require("../contract-utils.cjs");
const { checkDesignFoundation } = require("../design-synthesis-core.cjs");
const { checkMotionFoundation } = require("../motion-foundation-core.cjs");
const { DEFAULT_DIR: DESIGN_SYSTEM_DIR, checkDesignSystemPackage } = require("../design-system-package-core.cjs");
const { checkReferenceEvidence } = require("../reference-evidence-core.cjs");
const { cliCommand, shellPath, exists, reference, reason } = require("./shared.cjs");
const { addRule } = require("./rules.cjs");

const EVIDENCE = "reference-evidence.json";
// What a confirmation judges and what later stages bind to.
const BOUND = ["DESIGN.md", "MOTION.md", "reference.md", EVIDENCE];
// A reference check that is only waiting for the graybox, the geometry or a pending source is
// work-stage business; these block leaving the extract step.
const EXTRACT_BLOCKERS = ["approval-pending", "approval-rejected", "video-analysis-incomplete"];
const GUIDES = ["references/reference-spec.md", "references/design-synthesis.md", "references/design-system-package.md"];
const PREVIEWS = path.join(".design-pipeline", "design-system", "previews");
const MANIFEST = "website-cloning.json";
const CLONE_ROOTS = [["openspec", "changes"], [".openspec", "changes"], ["spec", "changes"], ["docs", "design"], ["design", "changes"]];

const fileHash = (root, rel) => {
  try { return "sha256:" + sha256(fs.readFileSync(path.join(root, rel))); } catch { return null; }
};
const attempt = check => {
  try { return { result: check() }; } catch (error) { return { error: String(error?.message ?? error) }; }
};
const decideBase = root => `${cliCommand()} decide --root ${shellPath(path.resolve(root))} --project-root ${shellPath(path.resolve(root))} --stage extract`;

// --- the reference stage: web-appropriate, not the film one -----------------------------------------

const REFERENCE = reference("Register the page or screenshot you are reproducing as evidence, then record what you observed in it.", {
  guides: ["references/feature-routes.md"],
  work: `Keep the reference (a screenshot, or a capture of the page) inside the project. Write reference-evidence.json (schema design-pipeline.reference-evidence.v2, intent.role primary-target, source kind image or live-page, requiredArtifacts including graybox.png; references/reference-spec.md and the Static Reference Reconstruction steps in references/feature-routes.md) and reference.md with the observed structure, layout rhythm, type scale, colour, motion parameters, invariants and uncertainties. Do not build yet: the next step extracts DESIGN.md and MOTION.md from this evidence.`,
});

// --- what `next` checks before the replicate flow leaves the extract step ---------------------------

// The text of DESIGN.md's Source Decisions section, or null.
function sourceDecisions(text) {
  const heading = /^##\s+(?:source decisions|evidence and adaptation)\s*$/im.exec(text);
  if (!heading) return null;
  const rest = text.slice(heading.index + heading[0].length);
  const next = /^##\s+/m.exec(rest);
  return (next ? rest.slice(0, next.index) : rest).trim();
}

// Group sizes of the DESIGN.md front matter (colors: 8, typography: 6, ...), for the owner's summary.
function tokenSummary(text) {
  const front = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text)?.[1] ?? "";
  const groups = {};
  let group = null, indent = null;
  for (const line of front.split(/\r?\n/)) {
    const top = /^([A-Za-z][\w-]*):\s*$/.exec(line);
    if (top) { group = top[1]; groups[group] = 0; indent = null; continue; }
    const child = group && /^( +)[^\s#-][^:]*:/.exec(line);
    if (!child) continue;
    indent ??= child[1].length;
    if (child[1].length === indent) groups[group] += 1;
  }
  return groups;
}

// Everything still missing, each with its fix: the existing reference check, DESIGN.md and MOTION.md
// foundation checks, and at standard and full the design-system package (kind all, as `foundation check`).
function findings(state, root) {
  const project = path.resolve(root);
  const out = [];
  const add = (code, message, fix) => out.push({ code, severity: "error", message, fix });
  if (!exists(root, EVIDENCE)) {
    add("reference-evidence-missing", `${EVIDENCE} does not exist: the reference is not registered as evidence.`, `Write ${EVIDENCE} (schema design-pipeline.reference-evidence.v2, intent.role primary-target; references/reference-spec.md), then run ${cliCommand()} reference check --root ${shellPath(project)} --project-root ${shellPath(project)}.`);
  } else {
    const check = attempt(() => checkReferenceEvidence(project));
    if (check.error) add("reference-evidence-invalid", `${EVIDENCE} is invalid: ${check.error}`, `Repair ${EVIDENCE} to the v2 shape in references/reference-spec.md, then run next again.`);
    else if (EXTRACT_BLOCKERS.includes(check.result.reason)) add(`reference-${check.result.reason}`, `reference check is blocked (${check.result.reason}): ${check.result.blockers.join("; ")}`, check.result.reason === "video-analysis-incomplete" ? "Finish the video observations (the reference step lists the missing window), then run next again." : "Record the reference approval (approval.status approved, with the evidence of what the owner said) in the reference evidence, then run next again.");
  }
  const design = attempt(() => checkDesignFoundation({ projectRoot: project }));
  if (design.error) add("design-invalid", `DESIGN.md is invalid: ${design.error}`, "Repair DESIGN.md to the Google DESIGN.md format (references/design-synthesis.md), then run next again.");
  else if (design.result.status !== "ready") add("design-missing", "DESIGN.md does not exist.", `Write the draft DESIGN.md from the reference: ${design.result.nextCommand}`);
  else {
    // The borrowed list is the Source Decisions section; replicate also names what is never borrowed.
    const section = sourceDecisions(fs.readFileSync(path.join(project, "DESIGN.md"), "utf8")) ?? "";
    if (!/(?:\bcontent\b|\bcopy\b|\bbrand\b|\blogos?\b|内容|文案|品牌)/i.test(section)) add("design-source-decisions-incomplete", "DESIGN.md Source Decisions does not say that the reference's content, copy, brand marks and logos are not borrowed.", "In Source Decisions list what is adopted (structure, layout rhythm, type scale, colour, motion parameters) and what is rejected (the reference's content, copy, brand marks and logos), then run next again.");
  }
  const motion = attempt(() => checkMotionFoundation({ projectRoot: project }));
  if (motion.error) add("motion-invalid", `MOTION.md is invalid: ${motion.error}`, "Repair MOTION.md (references/motion-foundation.md), then run next again.");
  else if (motion.result.status !== "ready") add("motion-missing", "MOTION.md does not exist.", `${motion.result.nextAction}, taking the reference's motion parameters (or a static posture when it has none).`);
  if (state.tier !== "quick" || exists(root, path.join(DESIGN_SYSTEM_DIR, "tokens.json"))) {
    const system = attempt(() => checkDesignSystemPackage({ projectRoot: project }));
    if (system.error) add("design-system-invalid", `The design-system package is invalid: ${system.error}`, "Repair the package (references/design-system-package.md), then run next again.");
    else if (system.result.status !== "ready") add(system.result.status === "synthesis-required" ? "design-system-missing" : "design-system-invalid", `The design-system package is ${system.result.status}: ${(system.result.findings || []).map(item => `${item.file}: ${item.message}`).join("; ")}`, `Write or repair the package from the reference (references/design-system-package.md), then run ${cliCommand()} design-system check --project-root ${shellPath(project)}.`);
  }
  return out;
}

// --- the confirmation ------------------------------------------------------------------------------

const extractions = state => (Array.isArray(state.decisions?.extractions) ? state.decisions.extractions : []);
const currentInputs = root => Object.fromEntries(BOUND.map(rel => [rel, fileHash(root, rel)]));
const changedFiles = (was, now) => BOUND.filter(rel => (was?.[rel] ?? null) !== (now[rel] ?? null));

const extractFinished = (state, root) => {
  const latest = extractions(state).at(-1);
  return latest?.verdict === "accept" && !changedFiles(latest.inputs, currentInputs(root)).length && !findings(state, root).length;
};

function previews(root) {
  const dir = path.join(path.resolve(root), PREVIEWS);
  if (!fs.existsSync(dir)) return [];
  const names = fs.readdirSync(dir).filter(name => name.endsWith(".html")).sort((a, b) => (a === "Cover.html" ? -1 : b === "Cover.html" ? 1 : a.localeCompare(b)));
  return names.map(name => path.join(dir, name));
}

const EXTRACT = {
  id: "extract",
  finished: extractFinished,
  action: (state, root) => {
    const project = path.resolve(root);
    const missing = findings(state, root);
    const web = state.deliverable === "web";
    if (missing.length) {
      const clone = web ? ` If the reference is a live page, also initialize its website-clone change: node ${shellPath(path.resolve(__dirname, "..", "init-website-clone.cjs"))} --change-id <id> --url <page url> --project-root ${shellPath(project)} (it writes website-cloning.json with the protected invariants and allowed differences; next then consults the evaluator's verdict at probe and delivery; references/website-cloning.md).` : "";
      return {
        type: "run",
        instruction: `Extract the reference into a draft design foundation before anything is built: DESIGN.md (the Google format; Source Decisions lists what you borrow as adopted, such as structure, layout rhythm, type scale, colour and motion parameters, and what you do not as rejected: the reference's content, copy, brand marks and logos)${state.tier === "quick" ? " and MOTION.md" : `, MOTION.md and the design-system package (${DESIGN_SYSTEM_DIR}/, then ${cliCommand()} design-system compile --project-root ${shellPath(project)} so the owner can see its previews)`}. Still missing: ${missing.map((item, index) => `(${index + 1}) ${item.message} Fix: ${item.fix}`).join(" ")}${clone} next re-runs these checks itself; the owner confirms the extraction once they pass.`,
        findings: missing,
        command: `${cliCommand()} foundation check --root ${shellPath(project)} --project-root ${shellPath(project)} --kind all`,
        guides: GUIDES,
        why: "The reference is extracted into DESIGN.md and MOTION.md first; the build follows them, not a template.",
      };
    }
    const latest = extractions(state).at(-1);
    const now = currentInputs(root);
    if (latest?.verdict === "reject" && !changedFiles(latest.inputs, now).length) {
      return {
        type: "run",
        instruction: `The owner rejected this extraction ("${latest.reason}"); it is now a rule. Revise DESIGN.md, MOTION.md and the design-system package for it, then run next again.`,
        guides: GUIDES,
        why: "Nothing is built from an extraction the owner has not confirmed.",
      };
    }
    const design = fs.readFileSync(path.join(project, "DESIGN.md"), "utf8");
    const stale = latest?.verdict === "accept" ? changedFiles(latest.inputs, now) : [];
    return {
      type: "ask",
      ...(stale.length ? { first: `The owner confirmed an extraction at ${latest.at}, but ${stale.join(", ")} changed since; show them the current one and ask again:` } : latest?.verdict === "reject" ? { first: `The owner rejected the earlier extraction ("${latest.reason}"); it changed since. Show them the revision and ask again:` } : {}),
      question: "Here is what I extracted from the reference: the design tokens, the motion language, and what is borrowed and what is not. Confirm it, or tell me what to change?",
      show: [...["DESIGN.md", "MOTION.md", "reference.md"].map(rel => path.join(project, rel)), ...previews(root)],
      tokens: tokenSummary(design),
      borrowed: sourceDecisions(design),
      recommended: "Confirm only when the borrowed list is what you want carried over and the not-borrowed list keeps the reference's content and brand out; the tokens and previews are a draft to correct now, not later.",
      instruction: "Show the design-system cover and previews when `show` lists them, summarise `tokens`, and read out `borrowed` (the Source Decisions section) as two lists: what is borrowed and what is not. Record only the owner's own words.",
      record: `${decideBase(root)} --verdict accept --answer "<the owner's words confirming the extraction>"`,
      correction: `${decideBase(root)} --verdict reject --answer "<what to change, in the owner's words>"`,
      why: "The extraction fixes what the build reproduces; the confirmation binds DESIGN.md, MOTION.md, reference.md and the reference evidence, so a later edit asks again.",
    };
  },
};

// Records the owner's verdict on the extraction `next` asked about. Returns nothing; a refused call changes nothing.
function recordExtraction(state, root, options) {
  if (!["accept", "reject"].includes(options.verdict)) fail("workflow", "--verdict accept|reject is required for the extraction");
  const words = reason(options.answer, options.verdict === "accept" ? "quote the owner's words confirming the extraction; record only words they gave" : "say in one sentence what the owner wants changed; it becomes a rule");
  if (/<[^<>]*>/.test(words)) fail("workflow", "--answer still holds the placeholder. Fix: replace it with the owner's own words from the conversation");
  const at = new Date().toISOString();
  const history = extractions(state);
  state.decisions.extractions = [...history, { verdict: options.verdict, inputs: currentInputs(root), ...(options.verdict === "reject" ? { reason: words } : { note: words }), at }];
  if (options.verdict === "reject") addRule(state, words, `extraction ${history.filter(item => item.verdict === "reject").length + 1}`, { stage: "extract" });
}

// The reference files a web probe pass also binds in replicate mode (DESIGN.md and MOTION.md are
// already bound by the interaction lineage).
const boundReferenceFiles = (state, root) => (state.mode === "replicate" ? ["reference.md", EVIDENCE].filter(rel => exists(root, rel)) : []);

// --- website-clone fidelity, consulted at probe and delivery ----------------------------------------

// Every website-cloning.json of the project, at its root or in a change directory beside it.
function findManifests(root) {
  const project = path.resolve(root);
  const dirs = [project];
  for (const parts of CLONE_ROOTS) {
    const base = path.join(project, ...parts);
    if (fs.existsSync(base) && fs.statSync(base).isDirectory()) dirs.push(...fs.readdirSync(base).filter(name => name !== "archive").map(name => path.join(base, name)));
  }
  return dirs.filter(dir => fs.existsSync(path.join(dir, MANIFEST)));
}

// null when the project has no clone manifest; else the evaluator's last verdict as the manifest records it.
function cloneFidelity(state, root) {
  if (state.deliverable !== "web" || state.mode !== "replicate") return null;
  const dirs = findManifests(root);
  if (!dirs.length) return null;
  // Two live clone changes: never judge this page by whichever directory is listed first.
  if (dirs.length > 1) return { ambiguous: true, dirs, complete: false };
  const [dir] = dirs;
  const read = attempt(() => readJson(path.join(dir, MANIFEST), "website-cloning manifest"));
  const manifest = read.result ?? {};
  return {
    dir,
    complete: manifest.status === "complete" && manifest.verification?.status === "passed",
    status: read.error ? "unreadable" : manifest.status ?? "unknown",
    reasons: read.error ? [read.error] : manifest.verification?.reasons ?? [],
    protectedInvariants: manifest.implementationAuthority?.protectedInvariants ?? [],
    allowedDifferences: manifest.implementationAuthority?.allowedDifferences ?? [],
  };
}

const cloneComplete = (state, root) => cloneFidelity(state, root)?.complete ?? true;

function cloneAction(state, root) {
  const clone = cloneFidelity(state, root);
  const rel = dir => path.relative(path.resolve(root), dir).split(path.sep).join("/") || ".";
  if (clone.ambiguous) {
    return {
      type: "blocked",
      blocker: `More than one website-clone manifest: ${clone.dirs.map(rel).join(", ")}.`,
      instruction: "Keep only the clone change for this page (archive the others under their changes directory's archive/), then run next again.",
      why: "The fidelity verdict must come from this page's own clone change.",
    };
  }
  const where = path.relative(path.resolve(root), clone.dir).split(path.sep).join("/") || ".";
  return {
    type: "run",
    instruction: `The website-clone manifest in ${where} reports ${clone.status}${clone.reasons.length ? `: ${clone.reasons.join("; ")}` : ""}. Produce the EvidencePort report for the built page (references/website-cloning.md), then run the evaluator; it is the only path that may move the manifest to complete. Protected invariants: ${clone.protectedInvariants.join("; ") || "none declared"}. Allowed differences: ${clone.allowedDifferences.join("; ") || "none declared"}. Repair the page or the evidence for each reason, rerun the evaluator, then run next again.`,
    command: `node ${shellPath(path.resolve(__dirname, "..", "evaluate-website-clone.cjs"))} --change-root ${shellPath(clone.dir)} --evidence <report>`,
    guide: "references/website-cloning.md",
    why: "A replicated page passes the clone fidelity verdict (protected invariants, allowed differences) before it is checked and delivered.",
  };
}

module.exports = { EXTRACT, REFERENCE, boundReferenceFiles, cloneAction, cloneComplete, recordExtraction, sourceDecisions, tokenSummary };

"use strict";

// Web sub-workflow: motion-first websites and pages.
// Guide: references/workflow-web.md (one section per stage id).

const fs = require("node:fs");
const path = require("node:path");
const { cliCommand, shellPath, REVIEW, deliveryRecorded, exists, reference } = require("./shared.cjs");

const REFERENCE = reference("Watch the supplied reference at full speed and inspect timed frames, or study 1-3 moving web references; write reference.md with observed structure, motion, timing, easing, invariants and uncertainties using references/reference-spec.md. For replication, follow references/reconstruction-spec.md and applicable references/3d-spec.md; the next build starts a bounded graybox. reference.md marks document delivery, not verified observation; do not require aggregate reference readiness before the graybox exists.");

// Web intake and concepts: same stage ids, finished predicates and record strings as the shared
// ones (film, edit and ui keep those), with prompts about a page instead of a picture.
const INTAKE = {
  id: "intake",
  finished: (state) => Boolean(state.decisions?.intake),
  action: (_state, root) => ({
    type: "ask",
    question: "Answer in one reply; \"default\" accepts every recommendation.",
    questions: [
      { id: "product", ask: "What is the product, and the one thing a visitor should do or understand?", recommended: "Take it from the conversation so far." },
      { id: "audience", ask: "Who visits, from where, and on which devices?", recommended: "General audience arriving from search or a link, on phone and desktop." },
      { id: "scope", ask: "Which pages or sections does the page need, and what should the visitor be able to do first?", recommended: "One landing page: a first screen that shows the product, proof, one call to action." },
      { id: "assets", ask: "Which copy, screenshots, product UI, logos, fonts and brand rules can be used, and are they licensed for this use?", recommended: "Only material you own; missing pieces are generated." },
    ],
    record: `${cliCommand()} decide --root ${shellPath(path.resolve(root))} --project-root ${shellPath(path.resolve(root))} --stage intake --answer "<the user's reply>"`,
    why: "Only facts that change the result are asked; style comes from references and judgment.",
  }),
};

const CONCEPTS = {
  id: "concepts",
  finished: (state) => Boolean(state.decisions?.concept),
  action: (state, root) => (exists(root, "concepts.md")
    ? { type: "ask", question: "Which concept should we make?", options: "the three cards in concepts.md", recommended: "Recommend the concept whose section arc best serves what the visitor should do first.", record: `${cliCommand()} decide --root ${shellPath(path.resolve(root))} --project-root ${shellPath(path.resolve(root))} --stage concept --choice <1|2|3> [--answer "<changes>"]`, why: "Before asking the user, agent-pre-screen the three same-size first screens on one contact sheet. Require genuinely different layout skeletons, focal elements, type positions and image roles, each declared in a one-line skeleton. Redo any card with the same skeleton, a common template or hierarchy that collapses without showing it to the user. A pre-screen is not Visual Acceptance; the user selects the direction." }
    : { type: "run", instruction: "Write concepts.md: three cards with genuinely different first-screen structures (layout skeleton, focal element, type position and image role, including no image), not just copy or colour. Each card starts with its central idea in one sentence and a one-line skeleton declaring those choices, then the section arc in one line per section (what it is for and its dominant element), what carries the eye down the page, look, tools (one line), and any missing license. Render all three first viewports at the same size and combine them into one contact sheet. Agent-pre-screen before asking the user; redo cards with the same skeleton, a common template or hierarchy that collapses, rerender and compare without showing failed cards to the user. A pre-screen is not Visual Acceptance. After the pick, extend the chosen card with `## Treatment` (references/web-direction.md).", why: "Structural divergence and agent screening before convergence; only the user picks a direction." }),
};

const COMPONENTS = {
  id: "components",
  finished: (state) => typeof state.decisions?.components === "string" && Boolean(state.decisions.components.trim()),
  action: (_state, root) => ({
    type: "ask",
    question: "Where should the components come from?",
    options: [
      "The project's existing components (specify paths)",
      "A GitHub component library you name",
      "Search this skill's component source index",
      "Write from scratch",
    ],
    recommended: "The project's own components first, then search the index.",
    record: `${cliCommand()} decide --root ${shellPath(path.resolve(root))} --project-root ${shellPath(path.resolve(root))} --stage components --answer "<the user's reply>"`,
    why: "Record the user's component source choice immediately before building; discovery is not permission to copy.",
  }),
};

const AVAILABILITIES = ["bundled-implementation", "reference-link", "metadata-only", "project-owned"];
const LICENSE_STATES = ["verified", "unverified", "commercial", "project-owned", "platform"];
const nonempty = (value) => typeof value === "string" && Boolean(value.trim());

function buildFinished(state, root) {
  if (!COMPONENTS.finished(state)) return false;
  try {
    if (!fs.statSync(path.join(root, "index.html")).isFile()) return false;
    const manifest = JSON.parse(fs.readFileSync(path.join(root, "component-manifest.json"), "utf8"));
    if (Array.isArray(manifest?.entries) && manifest.entries.length === 0) {
      return state.decisions.components.trim().toLowerCase() === "write from scratch";
    }
    return Array.isArray(manifest?.entries) && manifest.entries.every(entry =>
      entry && nonempty(entry.name) && (nonempty(entry.sourceId) || nonempty(entry.url))
      && AVAILABILITIES.includes(entry.availability) && LICENSE_STATES.includes(entry.license?.state)
      && Array.isArray(entry.usedIn) && entry.usedIn.length > 0
      && entry.usedIn.every(use => use && nonempty(use.file) && nonempty(use.how)));
  } catch (error) {
    if (error instanceof SyntaxError || ["ENOENT", "ENOTDIR", "EISDIR"].includes(error.code)) return false;
    throw error;
  }
}

function componentInstruction(state, root) {
  const skillRoot = path.resolve(__dirname, "../..");
  const index = path.join(skillRoot, "references/component-source-catalog.json");
  return `Follow the recorded component decision exactly: ${JSON.stringify(state.decisions.components)}. Reuse the specified project paths, inspect the named GitHub library, search the index, or write from scratch as requested; do not silently substitute another source. When searching, the single discovery index is references/component-source-catalog.json: run \`${cliCommand()} design-system route --root ${shellPath(path.resolve(root))} --query "<page brief>" --platform web\`, then \`${cliCommand()} design-system search --root ${shellPath(skillRoot)} --snapshot ${shellPath(index)} --query "<page brief>"\`. Read only the returned source entries and their pointed guides/manifests/implementations. Before building index.html, write component-manifest.json with an entries array: each entry needs name, sourceId or url, availability (${AVAILABILITIES.join("|")}), license: {state: ${LICENSE_STATES.join("|")}}, and usedIn: [{file, how}] identifying the consuming file and usage. Entries may be empty only when the recorded components answer is "Write from scratch" (case-insensitive, surrounding whitespace ignored); all other decisions require at least one entry. Components with unverified or commercial licenses may only be studied and reimplemented, never copied. Build is unfinished until both index.html and a valid component-manifest.json exist.`;
}

const BUILD = {
  id: "build",
  finished: buildFinished,
  action: (state, root) => ({
    type: "run",
    // Quick and replicate have no concepts stage, so there is no chosen card to extend.
    // Keep source selection ahead of implementation and retain the user's exact answer.
    instruction: `${componentInstruction(state, root)} ${state.tier === "full" ? "Open an OpenSpec change under openspec/changes/<id>/ and " : ""}${state.tier !== "quick" && state.mode !== "replicate" ? "extend the chosen card in concepts.md with `## Treatment` and write the section briefs (references/web-direction.md) before you " : ""}build index.html from ${state.mode === "replicate" ? "the reference and its invariants" : "the chosen concept"}; motion follows references/web-motion.md, design tokens and components from references/pipeline-reference.md. In tasks.md isolate one visual goal per task: source/reference region or applicable scene node, goal and invariants, inputs, literal modification scope, outputs, runtime/comparison checks and failure return step. For references, start a bounded graybox for structure and occlusion; once it exists, read the complete results of reference check, reconstruction check and applicable scene check. If required prerequisite stages are not ready, repair their findings before material, polish or motion that depends on them; follow the stage-specific permissions in references/reconstruction-spec.md, including optical work when graybox is ready but geometry is blocked. File delivery and engineering checks do not grant visual acceptance.`,
    why: state.tier === "full" ? "Full tier keeps OpenSpec lineage." : "Lighter tiers skip specification ceremony but keep the motion and token conventions.",
  }),
};

const PROBE = {
  id: "probe",
  gate: { name: "interaction", inputs: () => ["interaction.json", "index.html"] },
  action: (state, root) => (exists(root, "interaction.json")
    ? { type: "run", command: `${cliCommand()} verify interaction --root ${shellPath(path.resolve(root))} --probe interaction.json`, why: "Apply each finding's fix, then run next again." }
    : { type: "run", instruction: "Write interaction.json: one probe per key interaction (schema in references/workflow-web.md)", why: "Every key interaction is verified against the real page, not eyeballed." }),
};

const DELIVER = {
  id: "deliver",
  finished: deliveryRecorded,
  action: (_state, root) => ({ type: "run", command: `${cliCommand()} decide --root ${shellPath(path.resolve(root))} --project-root ${shellPath(path.resolve(root))} --stage deliver --answer <url or path>`, why: "Record where the page is delivered." }),
};

function stages(state) {
  if (state.mode === "replicate") return state.tier === "quick"
    ? [REFERENCE, COMPONENTS, BUILD, PROBE]
    : [INTAKE, REFERENCE, COMPONENTS, BUILD, PROBE, REVIEW, DELIVER];
  if (state.tier === "quick") return [COMPONENTS, BUILD, PROBE];
  return [INTAKE, REFERENCE, CONCEPTS, COMPONENTS, BUILD, PROBE, REVIEW, DELIVER];
}

module.exports = { stages };

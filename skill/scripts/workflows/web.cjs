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

const BUILD = {
  id: "build",
  finished: (state, root) => exists(root, "index.html"),
  action: (state) => ({
    type: "run",
    // Quick and replicate have no concepts stage, so there is no chosen card to extend.
    instruction: `${state.tier === "full" ? "Open an OpenSpec change under openspec/changes/<id>/ and " : ""}${state.tier !== "quick" && state.mode !== "replicate" ? "extend the chosen card in concepts.md with `## Treatment` and write the section briefs (references/web-direction.md) before you " : ""}build index.html from ${state.mode === "replicate" ? "the reference and its invariants" : "the chosen concept"}; motion follows references/web-motion.md, design tokens and components from references/pipeline-reference.md. In tasks.md isolate one visual goal per task: source/reference region or applicable scene node, goal and invariants, inputs, literal modification scope, outputs, runtime/comparison checks and failure return step. For references, start a bounded graybox for structure and occlusion; once it exists, read the complete results of reference check, reconstruction check and applicable scene check. If required prerequisite stages are not ready, repair their findings before material, polish or motion that depends on them; follow the stage-specific permissions in references/reconstruction-spec.md, including optical work when graybox is ready but geometry is blocked. File delivery and engineering checks do not grant visual acceptance.`,
    why: state.tier === "full" ? "Full tier keeps OpenSpec lineage." : "Lighter tiers skip specification ceremony but keep the motion and token conventions.",
  }),
};

// Whether interaction.json declares a page audit (`"kind": "audit"`); null when it is not readable
// JSON, which the verify command reports with its own fix.
function declaresAudit(root) {
  try {
    const doc = JSON.parse(fs.readFileSync(path.join(root, "interaction.json"), "utf8"));
    return Array.isArray(doc?.probes) && doc.probes.some((probe) => probe?.kind === "audit");
  } catch {
    return null;
  }
}

// Probe finishes only with a passed gate over a probe file that audits the page, at every tier.
const PROBE = {
  id: "probe",
  finished: (_state, root) => declaresAudit(root) === true,
  gate: { name: "interaction", inputs: () => ["interaction.json", "index.html"] },
  action: (_state, root) => {
    if (!exists(root, "interaction.json")) return { type: "run", instruction: "Write interaction.json: one probe per key interaction plus one audit probe (\"kind\": \"audit\") that measures the local index.html at a desktop and a mobile viewport, with thresholds copied from DESIGN.md, the font families required (schema in references/workflow-web.md#probe)", why: "Every key interaction and the page's measurable craft are verified against the real page, not eyeballed." };
    if (declaresAudit(root) === false) return { type: "run", instruction: "Add an audit probe to interaction.json: one probes entry with \"kind\": \"audit\", a desktop and a mobile viewport, thresholds copied from DESIGN.md with the required font families, and the selectors to declare (references/workflow-web.md#probe); then run next again", why: "The probe stage passes only with a page audit at every tier; without one the verify command cannot finish this stage." };
    return { type: "run", command: `${cliCommand()} verify interaction --root ${shellPath(path.resolve(root))} --project-root ${shellPath(path.resolve(root))} --probe interaction.json`, why: "Apply each finding's fix, then run next again." };
  },
};

const DELIVER = {
  id: "deliver",
  finished: deliveryRecorded,
  action: (_state, root) => ({ type: "run", command: `${cliCommand()} decide --root ${shellPath(path.resolve(root))} --project-root ${shellPath(path.resolve(root))} --stage deliver --answer <url or path>`, why: "Record where the page is delivered." }),
};

function stages(state) {
  if (state.mode === "replicate") return state.tier === "quick"
    ? [REFERENCE, BUILD, PROBE]
    : [INTAKE, REFERENCE, BUILD, PROBE, REVIEW, DELIVER];
  if (state.tier === "quick") return [BUILD, PROBE];
  return [INTAKE, REFERENCE, CONCEPTS, BUILD, PROBE, REVIEW, DELIVER];
}

module.exports = { stages };

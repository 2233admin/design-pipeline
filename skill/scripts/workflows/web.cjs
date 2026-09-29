"use strict";

// Web sub-workflow: motion-first websites and pages.
// Guide: references/workflow-web.md (one section per stage id).

const { CLI, REVIEW: SHARED_REVIEW, exists, gatePassed, reference } = require("./shared.cjs");

const REFERENCE = reference("Study 1-3 moving web references and write reference.md (observed motion, timing, easing, structure; what to transfer).");

// Web intake and concepts: same stage ids, finished predicates and record strings as the shared
// ones (film, edit and ui keep those), with prompts about a page instead of a picture.
const INTAKE = {
  id: "intake",
  finished: (state, root) => exists(root, "brief.md"),
  action: () => ({
    type: "ask",
    question: "Answer in one reply; \"default\" accepts every recommendation.",
    questions: [
      { id: "product", ask: "What is the product, and the one thing a visitor should do or understand?", recommended: "Take it from the conversation so far." },
      { id: "audience", ask: "Who visits, from where, and on which devices?", recommended: "General audience arriving from search or a link, on phone and desktop." },
      { id: "scope", ask: "Which pages or sections does the page need, and what should the visitor be able to do first?", recommended: "One landing page: a first screen that shows the product, proof, one call to action." },
      { id: "assets", ask: "Which copy, screenshots, product UI, logos, fonts and brand rules can be used, and are they licensed for this use?", recommended: "Only material you own; missing pieces are generated." },
    ],
    record: `${CLI} decide --project-root . --stage intake --answer "<the user's reply>"`,
    why: "Only facts that change the result are asked; style comes from references and judgment.",
  }),
};

const CONCEPTS = {
  id: "concepts",
  finished: (state) => Boolean(state.decisions?.concept),
  action: (state, root) => (exists(root, "concepts.md")
    ? { type: "ask", question: "Which concept should we make?", options: "the three cards in concepts.md", recommended: "Recommend the concept whose section arc best serves what the visitor should do first.", record: `${CLI} decide --project-root . --stage concept --choice <1|2|3> [--answer "<changes>"]`, why: "The first of two human decisions." }
    : { type: "run", command: "Write concepts.md: three cards whose central ideas differ; not the same layout restyled. Each card starts with the central idea as one sentence about the page (for example 'one cursor becomes the whole product tour'), then the section arc in one line per section (what it is for and its dominant element), what carries the eye down the page, look, tools (one line), and any missing license. Render the first viewport of each card. After the pick, extend the chosen card with `## Treatment` (references/web-direction.md).", why: "Divergence before convergence; the user picks one." }),
};

// The shared review asks about a draft video and a contact sheet; a page is judged in a browser.
const REVIEW = {
  id: SHARED_REVIEW.id,
  finished: SHARED_REVIEW.finished,
  action: (state) => ({
    type: "ask",
    question: "Accept this page, or reject it with one sentence on what is wrong?",
    show: ["the page, scrolled at full speed", "screenshots at 375x812, 768x1024 and 1440x900", "the gate summary"],
    recommended: "Accept if nothing reads wrong at full speed and at all three sizes; the reviewer reads W1 to W7 in references/web-direction.md for Visual Acceptance.",
    record: SHARED_REVIEW.action(state).record,
    why: `The second human decision${(state.decisions?.drafts || []).length ? `; ${state.decisions.drafts.length} earlier draft(s) were rejected and their reasons are project rules` : ""}.`,
  }),
};

const BUILD = {
  id: "build",
  finished: (state, root) => exists(root, "index.html"),
  action: (state) => {
    const command = state.tier === "full"
      ? "Open an OpenSpec change under openspec/changes/<id>/ and build index.html from the chosen concept; motion follows references/web-motion.md, design tokens and components from references/pipeline-reference.md"
      : "Build index.html from the chosen concept; motion follows references/web-motion.md, design tokens and components from references/pipeline-reference.md";
    // Quick has no concepts stage, so no card to extend; its text stays as it was.
    return {
      type: "run",
      command: state.tier === "quick" ? command : `First extend the chosen card in concepts.md with \`## Treatment\` and write the section briefs (references/web-direction.md), before writing index.html. ${command}`,
      why: state.tier === "full" ? "Full tier keeps OpenSpec lineage." : "Lighter tiers skip specification ceremony but keep the motion and token conventions.",
    };
  },
};

const PROBE = {
  id: "probe",
  finished: (state, root) => gatePassed(state, root, "interaction", ["interaction.json", "index.html"]),
  action: (state, root) => (exists(root, "interaction.json")
    ? { type: "run", command: `${CLI} verify interaction --probe interaction.json`, why: "Apply each finding's fix, then run next again." }
    : { type: "run", command: "Write interaction.json: one probe per key interaction (schema in references/workflow-web.md)", why: "Every key interaction is verified against the real page, not eyeballed." }),
};

const DELIVER = {
  id: "deliver",
  finished: (state) => Boolean(state.decisions?.delivered),
  action: () => ({ type: "run", command: `${CLI} decide --project-root . --stage deliver --answer <url or path>`, why: "Record where the page is delivered." }),
};

function stages(state) {
  if (state.tier === "quick") return [BUILD, PROBE];
  return [INTAKE, REFERENCE, CONCEPTS, BUILD, PROBE, REVIEW, DELIVER];
}

module.exports = { stages };

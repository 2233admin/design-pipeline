"use strict";

// Web sub-workflow: motion-first websites and pages.
// Guide: references/workflow-web.md (one section per stage id).

const { CLI, CONCEPTS, INTAKE, REVIEW, exists, gatePassed, reference } = require("./shared.cjs");

const REFERENCE = reference("Study 1-3 moving web references and write reference.md (observed motion, timing, easing, structure; what to transfer).");

const BUILD = {
  id: "build",
  finished: (state, root) => exists(root, "index.html"),
  action: (state) => ({
    type: "run",
    command: state.tier === "full"
      ? "Open an OpenSpec change under openspec/changes/<id>/ and build index.html from the chosen concept; motion follows references/web-motion.md, design tokens and components from references/pipeline-reference.md"
      : "Build index.html from the chosen concept; motion follows references/web-motion.md, design tokens and components from references/pipeline-reference.md",
    why: state.tier === "full" ? "Full tier keeps OpenSpec lineage." : "Lighter tiers skip specification ceremony but keep the motion and token conventions.",
  }),
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

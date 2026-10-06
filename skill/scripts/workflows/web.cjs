"use strict";

// Web sub-workflow: motion-first websites and pages.
// Guide: references/workflow-web.md (one section per stage id).

const { CLI, CONCEPTS, INTAKE, REVIEW, exists, gatePassed, reference } = require("./shared.cjs");

const REFERENCE = reference("Watch the supplied reference at full speed and inspect timed frames, or study 1-3 moving web references; write reference.md with observed structure, motion, timing, easing, invariants and uncertainties using references/reference-spec.md. For replication, follow references/reconstruction-spec.md and applicable references/3d-spec.md; the next build starts a bounded graybox. reference.md marks document delivery, not verified observation; do not require aggregate reference readiness before the graybox exists.");

const BUILD = {
  id: "build",
  finished: (state, root) => exists(root, "index.html"),
  action: (state) => ({
    type: "run",
    command: `${state.tier === "full" ? "Open an OpenSpec change under openspec/changes/<id>/ and " : ""}build index.html from ${state.mode === "replicate" ? "the reference and its invariants" : "the chosen concept"}; motion follows references/web-motion.md, design tokens and components from references/pipeline-reference.md. In tasks.md isolate one visual goal per task: source/reference region or applicable scene node, goal and invariants, inputs, literal modification scope, outputs, runtime/comparison checks and failure return step. For references, start a bounded graybox for structure and occlusion; once it exists, read the complete results of reference check, reconstruction check and applicable scene check. If required prerequisite stages are not ready, repair their findings before material, polish or motion that depends on them; follow the stage-specific permissions in references/reconstruction-spec.md, including optical work when graybox is ready but geometry is blocked. File delivery and engineering checks do not grant visual acceptance.`,
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
  if (state.mode === "replicate") return state.tier === "quick"
    ? [REFERENCE, BUILD, PROBE]
    : [INTAKE, REFERENCE, BUILD, PROBE, REVIEW, DELIVER];
  if (state.tier === "quick") return [BUILD, PROBE];
  return [INTAKE, REFERENCE, CONCEPTS, BUILD, PROBE, REVIEW, DELIVER];
}

module.exports = { stages };

"use strict";

// Web sub-workflow: motion-first websites and pages.
// Guide: references/workflow-web.md (one section per stage id).

const fs = require("node:fs");
const path = require("node:path");
const { COMPONENT_SOURCES, PERMISSIVE_LIST, validateComponentManifest } = require("../design-system-catalog-core.cjs");
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
  finished: (state) => typeof state.decisions?.components === "string" && Boolean(state.decisions.components.trim())
    && Array.isArray(state.decisions.componentSources) && state.decisions.componentSources.length > 0,
  action: (_state, root) => ({
    type: "ask",
    question: "Where should the components come from?",
    options: [
      "The project's existing components (specify paths)",
      "A GitHub component library you name",
      "Search this skill's component source index",
      "Let the agent find maintained open-source component libraries and icon sets on GitHub beyond the index",
      "Write from scratch",
    ],
    recommended: "The project's own components first, then search the index, then let the agent find more: project,index,discover.",
    record: `${cliCommand()} decide --root ${shellPath(path.resolve(root))} --project-root ${shellPath(path.resolve(root))} --stage components --choice <${COMPONENT_SOURCES.join("|")}, comma-separated> --answer "<the user's reply>"`,
    why: "Record the user's component source choice immediately before building; scratch cannot be combined with another choice, github requires a https://github.com/<owner>/<repo> URL in --answer, and discover lets the agent find open-source GitHub repositories itself and record each with its pinned license. Discovery is not permission to copy.",
  }),
};

function buildStatus(state, root) {
  if (!COMPONENTS.finished(state)) return { finished: false };
  try {
    if (!fs.statSync(path.join(root, "index.html")).isFile()) return { finished: false };
    validateComponentManifest(JSON.parse(fs.readFileSync(path.join(root, "component-manifest.json"), "utf8")), {
      root, decision: state.decisions.components, componentSources: state.decisions.componentSources,
    });
    return { finished: true };
  } catch (error) {
    if (error.code === "CONTRACT_INVALID" || error instanceof SyntaxError) {
      return { finished: false, findings: [{
        code: "CONTRACT_INVALID", severity: "error", message: error.message,
        fix: "Correct component-manifest.json to match the recorded componentSources and valid source/usage evidence, then run next again.",
      }] };
    }
    if (["ENOENT", "ENOTDIR", "EISDIR"].includes(error.code)) return { finished: false };
    throw error;
  }
}

function buildFinished(state, root) {
  return buildStatus(state, root).finished;
}

function componentInstruction(state, root) {
  const skillRoot = path.resolve(__dirname, "../..");
  const index = path.join(skillRoot, "references/component-source-catalog.json");
  // Only a decision that selects discover lets the agent look for components beyond the index.
  const discover = Array.isArray(state.decisions.componentSources) && state.decisions.componentSources.includes("discover")
    ? " When nothing indexed fits, find maintained open-source component libraries or icon sets on GitHub yourself (method in tools/open-source-design.md): check each license at a pinned revision and record its entry before using it, and prefer genuinely reusing a fitting source over hand-writing it."
    : "";
  // Quick and replicate builds have no treatment to call for the system stack.
  const direction = state.tier !== "quick" && state.mode !== "replicate" ? "the treatment" : "the page's direction";
  return `Follow the recorded component decision exactly: ${JSON.stringify(state.decisions.components)}; componentSources: ${JSON.stringify(state.decisions.componentSources)}. Reuse the specified project paths, inspect the named GitHub library, search the index, find open-source sources, or write from scratch as requested; do not silently substitute another source. When searching, search the index first: the single discovery index is references/component-source-catalog.json; run \`${cliCommand()} design-system route --root ${shellPath(path.resolve(root))} --query "<page brief>" --platform web\`, then \`${cliCommand()} design-system search --root ${shellPath(skillRoot)} --snapshot ${shellPath(index)} --query "<page brief>" --platform web\`. Read only the returned source entries and their pointed guides/manifests/implementations.${discover} Choose fonts through tools/fonts.md rather than silently defaulting to the system stack, and record the chosen family under Typography in DESIGN.md, where the audit probe's thresholds.fonts reads the approved families; use the system stack only when ${direction} deliberately calls for it. Bundle or self-host discovered code and fonts inside the project with their license notices: no CDN scripts or remote fonts at runtime (references/web-motion.md#self-contained-pages). Before building index.html, write component-manifest.json with an entries array: each entry needs name, sourceId or url, availability (bundled-implementation|reference-link|metadata-only|project-owned), license: {state: verified|unverified|commercial|project-owned|platform}, and usedIn: [{file, marker, how}]. sourceId must resolve in the index or name an existing contained project-owned file; a GitHub repository url must appear in the components decision, and an indexed source is cited by sourceId, not by one of its URLs. Any other url must be a GitHub repository https://github.com/<owner>/<repo>: a discovered source, which needs discover in componentSources, availability bundled-implementation, reference-link or metadata-only, revision (commit SHA or tag, not HEAD, main or master) and license.evidence (https URLs, at least one on that repository whose blob, tree, raw, commit, releases/tag or archive ref is the revision, such as https://github.com/<owner>/<repo>/blob/<revision>/LICENSE), with license.state verified, unverified or commercial, plus license.id (SPDX expression) when known. Indexed license.state must match the index. Every usedIn.file must exist inside the project, and marker (import path/class/custom element/component identifier) must actually appear in it. For verified imports/copies, how records attribution/license-notice handling; a how that bundles, vendors, self-hosts or downloads the source counts as copying. Copy or import a discovered source only when its license.state is verified, its license.id is ${PERMISSIVE_LIST}, and license.file names the non-empty project file that holds its license text; otherwise only study and reimplement it. The scratch source set requires fromScratch: true and permits empty or project-owned-only entries; every other source set forbids fromScratch: true and requires non-empty entries. Components with unverified or commercial licenses may only be studied and reimplemented, never copied. Build is unfinished until both index.html and a valid component-manifest.json exist.`;
}

const BUILD = {
  id: "build",
  finished: buildFinished,
  action: (state, root) => {
    const { findings } = buildStatus(state, root);
    const action = {
      type: "run",
      // Quick and replicate have no concepts stage, so there is no chosen card to extend.
      // Keep source selection ahead of implementation and retain the user's exact answer.
    instruction: `${componentInstruction(state, root)} ${state.tier === "full" ? "Open an OpenSpec change under openspec/changes/<id>/ and " : ""}${state.tier !== "quick" && state.mode !== "replicate" ? "extend the chosen card in concepts.md with `## Treatment` and write the section briefs (references/web-direction.md) before you " : ""}build index.html from ${state.mode === "replicate" ? "the reference and its invariants" : "the chosen concept"}; motion follows references/web-motion.md, design tokens and components from references/pipeline-reference.md. In tasks.md isolate one visual goal per task: source/reference region or applicable scene node, goal and invariants, inputs, literal modification scope, outputs, runtime/comparison checks and failure return step. For references, start a bounded graybox for structure and occlusion; once it exists, read the complete results of reference check, reconstruction check and applicable scene check. If required prerequisite stages are not ready, repair their findings before material, polish or motion that depends on them; follow the stage-specific permissions in references/reconstruction-spec.md, including optical work when graybox is ready but geometry is blocked. File delivery and engineering checks do not grant visual acceptance.`,
    why: state.tier === "full" ? "Full tier keeps OpenSpec lineage." : "Lighter tiers skip specification ceremony but keep the motion and token conventions.",
    ...(findings ? { findings } : {}),
    };
    if (findings) action.instruction = `${findings.map(finding => `${finding.message} Fix: ${finding.fix}`).join(" ")} ${action.instruction}`;
    return action;
  },
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
    ? [REFERENCE, COMPONENTS, BUILD, PROBE]
    : [INTAKE, REFERENCE, COMPONENTS, BUILD, PROBE, REVIEW, DELIVER];
  if (state.tier === "quick") return [COMPONENTS, BUILD, PROBE];
  return [INTAKE, REFERENCE, CONCEPTS, COMPONENTS, BUILD, PROBE, REVIEW, DELIVER];
}

module.exports = { stages };

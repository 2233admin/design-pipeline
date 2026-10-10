---
name: design-pipeline
description: Design and visual workflow guidance for tasks involving graphics, images, typography, layout, frontend UI, rendering, animation, reference studies, design reviews, motion websites, product films, and edits. Use this skill to choose the relevant method or tool while preserving the user's project workflow and acceptance decisions.
---

# design-pipeline

Use this entry for the current task only. Resolve `<skill-root>` from this loaded `SKILL.md` path.
The CLI is `node "<skill-root>/scripts/designer-pipeline.cjs"` (below: `designer-pipeline`). Run
it from the user's project, or pass `--root <project>` for project files. Skill scripts and
resources stay relative to `<skill-root>` regardless of the working directory.

## Choose the work path

- **Supporting tool task:** start at `tools/README.md`, load one relevant tool guide and its
  implementation, then finish inside the task's existing workflow and renderer. These tools do
  not require a film project, narration, a fixed canvas, or a particular subject or style.
- **Complete deliverable:** start with `designer-pipeline next --project-root <project>`. It returns
  one action at a time: do the returned `run`, ask the returned `ask` question and record the reply
  with its `record` command, or report the returned `done` evidence. Obey prior user rejections in
  `rules`; apply each gate finding's `fix` and rerun its check before showing a draft.

For a new complete deliverable, choose its kind and tier from the request; let the user override.
Use `--mode replicate` when reproducing a supplied reference, and `--mode freeform` when the user
gave no direction. `quick` covers one motion, shot, component or fix; `standard` covers one whole
deliverable with its applicable brief, concept and draft decisions; `full` adds the expanded
planning and evidence workflow, including the OpenSpec change required by `next`. In this repository,
behavior changes always use an OpenSpec change. Preserve any stronger change process required by a
user project. If a new project needs a deliverable or tier, answer the `next` question and use the
`record` command it returns to initialize the existing workflow.

For a supporting task, stop when the requested support is complete in its current workflow. For a
complete deliverable, keep using `next` and `decide` as returned. Native implementation subtasks
use `next --change-root <change> --plan <tasks-plan>` and the matching `decide`; technical task
completion remains separate from the owner's visual acceptance. See
`references/stages.md#stage-4-tasks` for task inputs, output snapshots, checks, and receipt lineage.

During planning, production and rendered review, identify unmet visual goals and missing methods.
Use the project and bundled tools first; when they do not cover the need, proactively follow
[design capability discovery](tools/open-source-design.md) to find and inspect relevant open-source
implementations, test a bounded study and integrate the useful part. Do not wait for the user to
name a repository. This is triggered by the work's needs, not a required search for every edit.

## Keep evidence and acceptance honest

- Follow the [QA verification method](references/qa-checklist.md#run-verification) before completion.
- Inspect the actual requested surface and relevant evidence. Motion also needs playback; a
  screenshot alone does not verify it.
- Gates report technical checks such as component conformance and fidelity evidence. They never
  grant creative or visual acceptance. Ask the owner about the actual output at the workflow's
  review points and record accept/reject only from their reply.
- Preserve source, snapshot, policy digest, receipt and downstream evidence lineage. Changed or
  failed evidence stays open or invalidates dependent evidence under the existing workflow.
- Record asset licenses; non-commercial material does not ship in commercial work.

## Open only what this task needs

- Workflow stages, UI, references, implementation and review: `references/stages.md`.
- **Built-in Taste suite:** `references/taste-skill.md` selects from thirteen complete local
  methods for new websites, existing-project redesign, visual critique, style, Stitch design
  rules, image-to-code, web/mobile concept images, brand boards and complete output. Read the
  selected original source; no external Taste installation is required. Project/user design,
  accessibility and CJK rules govern adaptation; image-only methods need an available provider.
- CSS authoring or review in any stack: `references/good-css.md` for the complete built-in
  practice library, project adaptations and offline specimens; load its matched source entries.
- Explicit offline improvement of a design prompt or skill instruction: `references/gepa.md`
  for the independent native optimizer, frozen cases, diagnostic feedback and reviewable candidates.
- Detailed route, CLI, gate and receipt contracts: `references/pipeline-reference.md`.
- `film`, `edit`, and `web` workflow selected by `next`: the matching `references/workflow-*.md`.
- Web treatment, section briefs and review rules W1-W7: `references/web-direction.md`.
- Supporting drawing, image placement, text fitting, comparison, motion maps and advanced
  technique sources: `tools/README.md` → one selected guide → its implementation/example.
- Upstream bundles: follow the selected route in
  `references/pipeline-reference.md#companion-skills` and the capability registry; load only the
  returned source needed for this task. Bundled source remains reference material unless an
  existing governed route permits adaptation or execution.
- Installation, upgrade and skill location: `references/installation.md`.
- Animation decisions: `references/animation-thinking.md` and, when required by the route,
  `references/animation-opportunity-and-review.md`.
- Film direction and storyboards: `references/product-film-direction.md` and
  `references/film-choreography/`.
- Built-in Cinetic/Product Film methods: `references/film-methods.md` for explicit film/loop
  selection, real brand/component discovery, full technique recipes and the maintained
  `film methods` preparation/motion adapter. Keep ordinary UI/CSS on its existing route.
- Prompt Motion template library: `references/prompt-motion/README.md` for indexed cases,
  curated recipe inputs and invariants; `film templates` provides offline read-only search/detail.
- Film runtime and audio: `references/hyperframes.md`, `references/film-blender.md`,
  `references/film-score.md`, `references/audio-gate.md`, `references/composition-gate.md`.
- PV/MAD edits: `references/film-edit.md`.
- Reference analysis, project inspection, reconstruction, and scene/runtime contracts:
  `references/reference-spec.md`, `references/reconstruction-spec.md`,
  `references/scene-runtime-spec.md`.
- Every command: `designer-pipeline --help`.

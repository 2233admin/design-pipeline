---
name: design-pipeline
description: Design and visual workflow guidance for tasks involving graphics, images, typography, layout, frontend UI, rendering, animation, reference studies, design reviews, motion websites, product films, and edits. Use this skill to choose the relevant method or tool while preserving the user's project workflow and acceptance decisions.
compatibility: Requires Node.js 22.12+. Evidence gates and captures need a Chromium-based browser; film, edit and audio work needs ffmpeg and ffprobe; 3D film templates need Blender 4.2+; the large MengTo and iart skill libraries download on first use over the network. Run `designer-pipeline doctor` to see what is present.
---

# design-pipeline

Use this entry for the current task only. Resolve `<skill-root>` from this loaded `SKILL.md` path.
The CLI is `node "<skill-root>/scripts/designer-pipeline.cjs"` (below: `designer-pipeline`). Run
it from the user's project, or pass `--root <project>` for project files. Skill scripts and
resources stay relative to `<skill-root>` regardless of the working directory.

## Route the task

Pick one row, open what it names, and open nothing else until the task needs it.

| The task | Start here | Then |
| --- | --- | --- |
| A complete deliverable (UI, web page, film, edit) | `designer-pipeline next --project-root <project>` | [Follow `next`](#follow-next-for-a-complete-deliverable) |
| The user gave a reference page or screenshot to follow | `designer-pipeline next --project-root <project> --deliverable web\|ui --mode replicate` | [Follow `next`](#follow-next-for-a-complete-deliverable) |
| One supporting job: drawing, image placement, text fitting, comparison, motion maps | `tools/README.md` | one selected guide → its implementation/example |
| Workflow stages, UI, references, implementation and review | `references/stages.md` | the stage the task is in |
| New website, redesign, visual critique, style, image-to-code, brand board | `references/taste-skill.md` | the selected original source |
| CSS authoring or review in any stack | `references/good-css.md` | its matched source entries |
| UI polish, accessibility, motion principles, shadcn/ui, browser driving | `references/ui-craft-sources.md` | a source only when a rule needs it |
| Web treatment, section briefs, review rules W1-W7 | `references/web-direction.md` | `references/workflow-web.md` |
| Animation decisions | `references/animation-thinking.md` | see [Animation](#animation) |
| Film direction, storyboards and runtime | `references/product-film-direction.md` | see [Film and edit](#film-and-edit) |
| Reference analysis, reconstruction, scene/runtime contracts | `references/reference-spec.md` | `references/reconstruction-spec.md`, `references/scene-runtime-spec.md` |
| Captured runtime review and developer handoff | `references/runtime-review.md` | its schemas |
| Improving a design prompt or skill instruction offline | `references/gepa.md` | frozen cases and reviewable candidates |
| Installation, upgrade and skill location | `references/installation.md` | |
| Route, CLI, gate and receipt contracts | `references/pipeline-reference.md` | `designer-pipeline --help` |

## Follow `next` for a complete deliverable

Start with `designer-pipeline next --project-root <project>`. It returns one action at a time: do
the returned `run`, ask the returned `ask` question and record the reply with its `record` command,
or report the returned `done` evidence. An ask's `first`, when present, is a step to do before
asking `question`; its `correction` command records the owner's "no" (it becomes a rule) and its
`skip` command records a skip you stated. A `run` action's `command` is only an executable command,
already spelled `node <absolute path>/designer-pipeline.cjs ...` (the CLI is not on PATH); its
`instruction` is the prose to follow, and a `run` with no `command` is an instruction alone. Obey
prior user rejections in `rules`; apply each gate finding's `fix` and rerun its check before
showing a draft. A returned `blocked` action (exit 2) names what is missing in `blocker` and
`instruction`; ask the user for it and never work around it.

For a new complete deliverable, choose its kind and tier from the request; let the user override.
Use `--mode replicate` when reproducing a supplied reference: for ui and web, `next` first has you
extract the reference into DESIGN.md and MOTION.md (and the design-system package), checks them
itself, and asks the owner to confirm what is borrowed before anything is built. `quick` covers one
motion, shot, component or fix; `standard` covers one whole deliverable with its applicable brief,
concept and draft decisions; `full` adds the expanded planning and evidence workflow, including the
OpenSpec change required by `next`. In this repository,
behavior changes always use an OpenSpec change. Preserve any stronger change process required by a
user project. If a new project needs a deliverable or tier, answer the `next` question and use the
`record` command it returns to initialize the existing workflow.

Keep using `next` and `decide` as returned. Native implementation subtasks use
`next --change-root <change> --plan <tasks-plan>` and the matching `decide`; technical task
completion remains separate from the owner's visual acceptance. See
`references/stages.md#stage-4-tasks` for task inputs, output snapshots, checks, and receipt lineage.
The `film`, `edit` and `web` workflows selected by `next` each have a matching
`references/workflow-*.md`.

For a supporting task, stop when the requested support is complete in its current workflow. These
tools do not require a film project, narration, a fixed canvas, or a particular subject or style.

## Keep evidence and acceptance honest

- Follow the [QA verification method](references/qa-checklist.md#run-verification) before completion.
- Inspect the actual requested surface and relevant evidence. Motion also needs playback; a
  screenshot alone does not verify it.
- Gates report technical checks such as component conformance and fidelity evidence. They never
  grant creative or visual acceptance. Ask the owner about the actual output at the workflow's
  review points and record accept/reject only from their reply.
- Every `decide` names its recorder: `--by owner` only for the owner's own words in this
  conversation, `--by agent` only where the delegation `next` shows hands you that checkpoint.
  A `selfCheck` run is yours to check and record; ask the owner during it only about a trade-off
  they have not settled, and record their answer with `--by owner --tradeoff`. Never record a
  "no" yourself. Speak to the owner in the action's `language`. Final acceptance is always the
  owner's, at every tier. Start a deliverable with
  `next ... --assisted-by <your tool and model>`; reaching done renders
  `.design-pipeline/diligence.md`, the record of who decided what (`designer-pipeline diligence`).
- Preserve source, snapshot, policy digest, receipt and downstream evidence lineage. Changed or
  failed evidence stays open or invalidates dependent evidence under the existing workflow.
- Record asset licenses; non-commercial material does not ship in commercial work.

## Find a missing method

During planning, production and rendered review, identify unmet visual goals and missing methods.
Use the project and bundled tools first; when they do not cover the need, proactively follow
[design capability discovery](tools/open-source-design.md) to find and inspect relevant open-source
implementations, test a bounded study and integrate the useful part. Do not wait for the user to
name a repository. This is triggered by the work's needs, not a required search for every edit.

## Route details

### Taste, CSS and UI craft

- **Built-in Taste suite:** `references/taste-skill.md` selects from thirteen complete local
  methods for new websites, existing-project redesign, visual critique, style, Stitch design
  rules, image-to-code, web/mobile concept images, brand boards and complete output. Read the
  selected original source; no external Taste installation is required. Project/user design,
  accessibility and CJK rules govern adaptation; image-only methods need an available provider.
- `references/good-css.md` is the complete built-in CSS practice library, with project adaptations
  and offline specimens.
- `references/ui-craft-sources.md` is the project rule index: the measured page audit
  (`verify interaction`, required in web `probe`), the `UC-` review checklist and the six pinned
  sources plus React Doctor as provenance.

### Web components

Web component-source choice before build and source manifest: `references/workflow-web.md#components`
and `#build`; index routing/search: `references/pipeline-reference.md#design-system-knowledge-and-adoption`.
Load only returned component-source entries and their needed pointers, not the whole catalog.

### Animation

Start with `references/animation-thinking.md` and, when required by the route,
`references/animation-opportunity-and-review.md`. For ordinary UI state changes, also read
`references/ui-transition-rules.md` before selecting effects and during rendered review.

### Film and edit

- Direction and storyboards: `references/product-film-direction.md` and
  `references/film-choreography/`.
- Built-in Cinetic/Product Film methods: `references/film-methods.md` for explicit film/loop
  selection, real brand/component discovery, full technique recipes and the maintained
  `film methods` preparation/motion adapter. Keep ordinary UI/CSS on its existing route.
- Prompt Motion template library: `references/prompt-motion/README.md` for indexed cases,
  curated recipe inputs and invariants; `film templates` provides offline read-only search/detail.
- Runtime and audio: `references/hyperframes.md`, `references/film-blender.md`,
  `references/film-score.md`, `references/audio-gate.md`, `references/composition-gate.md`.
- PV/MAD edits: `references/film-edit.md`.

### Captured runtime review

`runtime-review build|check|record` uses `references/runtime-review.md` with
`references/runtime-review.schema.json` and `references/runtime-review-feedback.schema.json`.
A captured review is not live verification, a hash match does not certify the producer, and a
recorded Feedback is not resolved.

### Upstream bundles

Follow the selected route in `references/pipeline-reference.md#companion-skills` and the capability
registry; load only the returned source needed for this task. Bundled source remains reference
material unless an existing governed route permits adaptation or execution.

Every command: `designer-pipeline --help`.

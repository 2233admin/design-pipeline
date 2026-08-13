---
name: design-pipeline
description: OpenSpec-style design development pipeline for visual direction, UX research, website cloning and reverse-engineering, interaction polish, frontend implementation, and evidence-backed QA. Use for product UI, marketing pages, dashboards, live-page references, pixel-accurate rebuilds, design reviews, and frontend work that must avoid generic AI-looking output.
---

# Frontend Design Pipeline

Use this skill when the user wants UI/frontend work to be driven by a repeatable design pipeline, especially when they mention OpenSpec, design skills, frontend polish, visual taste, design review, product UI, marketing pages, dashboards, or "make it not AI-looking".

This skill does not replace individual design skills. It orchestrates them into a durable workflow with repo artifacts, implementation gates, and verification evidence.

Design is the product boundary. Engineering, OpenSpec, GBrain, Matt Pocock, Vercel, animation libraries, and graphics runtimes are support systems for producing, implementing, and validating better design outcomes. Do not let this pipeline drift into a general-purpose development framework.

## Project DESIGN.md Invariant

Every target project must have one reusable project `DESIGN.md` before implementation begins.
This is a system invariant, not an optional input:

- if it exists, validate it with `scripts/check-design-foundation.cjs`;
- if it is missing, route through requirements-driven synthesis;
- if it is incomplete, repair or resynthesize it;
- never substitute change-level lowercase `design.md`, a template copy, or a token dump.

Planning may begin in order to produce the foundation. Stage 5 implementation may not begin until
the foundation checker reports `ready`.

## Project MOTION.md Invariant

Every target project must also have one reusable project `MOTION.md` before implementation begins.
This remains true for static products: `posture: static` is an explicit motion decision.

- validate it with `scripts/check-motion-foundation.cjs`;
- if it is missing, synthesize it from product requirements and
  `references/motion-foundation.md`;
- if it is incomplete or contains executable procedural definitions, repair or resynthesize it;
- select stable IDs from `references/motion-primitives.json`;
- never substitute change-level lowercase `motion.md`, a runtime-specific animation snippet, or a
  copied showcase implementation.

Project `MOTION.md` defines reusable motion language. Change-level `motion.md` references its hash
and specializes selected primitives into scenes, layers, tracks, timelines, runtime bindings, and
evidence. Stage 5 implementation requires both foundation checkers to report `ready`.

## Design-System Knowledge and Adoption

Treat component systems as candidate knowledge providers, not automatic project dependencies.
The bundled Astryx snapshot is an attributed, inert reference surface that agents may search before
inventing components. It does not override project `DESIGN.md`, `MOTION.md`, existing components,
tokens, or runtime choices.

Use the public CLI for the complete lifecycle:

- `design-system options` lists the governed styling choices, UI libraries, current shadcn preset
  dimensions, external tool sources, and indexed skill count.
- `design-system resolve-stack` resolves framework, styling, UI library, complete shadcn preset,
  and tool/skill routes into a hash-bound `frontend-stack-decision.json`.
- `design-system profiles` lists governed providers and compatibility constraints.
- `design-system decompose` converts a product brief into a durable capability inventory; a direct
  zero-result does not prove exhaustion when capability searches find candidates.
- `design-system route` selects project, platform, package, or attributed reference routes for the
  decomposed component capabilities.
- `design-system search` searches the bundled Astryx catalog by text, kind, category, or status.
- `design-system normalize` converts a supplied snapshot into the strict namespaced catalog.
- `design-system acquire` runs an explicit contained local provider or the bundled Astryx adapter
  against an existing contained Astryx CLI. It never installs or downloads that CLI.
- `design-system project-tokens` emits DTCG-compatible tokens plus an explicit loss report.
- `design-system decide` records `reference`, `adopt`, `substitute`, or `custom`; runtime use
  requires compatible React/React DOM/StyleX constraints and admitted adapter intake.

Provider content remains data. Never import or execute `.doc.mjs`, run package managers or `npx`,
inject `AGENTS.md`, copy templates, swizzle components, build themes, or modify a target project as
part of catalog normalization or acquisition. Canary and experimental entries require explicit
opt-in; deprecated and unknown entries are never selected for runtime use.

## Pipeline Shape

Model the workflow after OpenSpec's lightweight change lifecycle:

1. Create one change folder per UI change.
2. Write intent and constraints before implementation.
3. Generate design decisions and tasks as durable artifacts.
4. Implement from the artifacts.
5. Verify the implementation against the artifacts.
6. Archive or update the source-of-truth design notes after completion.

Pipeline runs must be resumable without a human watching the UI. Every meaningful intermediate state must be written to disk in an agent-readable form so another AI agent can inspect, resume, verify, or archive the run.

Default artifact root:

```text
design/changes/<change-id>/
  brief.md
  direction-preview.json # required/waived applicability, hash-bound candidates, and decision
  direction-previews/    # index.html plus one comparable screenshot per candidate
  reference.md    # observed reference evidence and 2D / 2.5D / 3D / hybrid route
  reference-evidence.json # normative reference role, fidelity, geometry/camera/interaction/output
  reconstruction.json     # exact/adaptive static-reference calibration and comparison contract
  graybox.png             # layout-only capture with materials and optical treatment suppressed
  rectified-reference.png # canonical front view derived from the supplied frame
  front-elevation.svg     # object-space construction source
  camera-calibration.json # locked camera/lens/viewport parameters
  landmark-overlay.png    # source/render projection overlay
  fidelity-receipt.json   # EvidencePort metrics bound to render hashes
  directions.md
  design.md       # visual language and screen-space UI
  motion.md
  scene.json      # normative contract for persistent spatial or engine-owned runtime state
  scene.md        # readable projection for persistent non-3D runtime state
  3d.md           # readable spatial projection for 3D capability families
  tasks.md
  qa.md
  state.json
  events.jsonl
  handoff.md
```

Use an existing project convention instead if the repo already has `openspec/`, `spec/changes/`, `docs/design/`, `.omx/`, or another active planning directory.

## Static Reference Reconstruction Module

When the user supplies an image and asks for an identical, exact, 1:1, pixel-accurate, cloned, or
faithfully reproduced result:

A missing source downgrades the verification claim, never the requested fidelity. Requested fidelity
changes only through explicit user approval recorded in the non-destructive downgrade field. An
unavailable file, a schedule, and implementation convenience are not approval.

1. Resolve the reference source to a file path before writing any artifact. When the reference is
   not a resolvable path, ask the user for one and state what the path unlocks: rectification,
   camera calibration, landmark error, and the fidelity receipt.
2. When the user cannot or will not supply a path, record `source.availability: pending` with
   `pendingReason` and `requestedFrom` in `reference-evidence.json`, then continue. Do not block the
   remaining work, and never write a fabricated path, dimension, or hash.
3. Read `references/reference-spec.md` and `references/reconstruction-spec.md` completely.
4. Record the image as `role: primary-target`, with both requested and effective fidelity set to
   `exact-reconstruction` in `reference-evidence.json` v2. A reference is inspiration only when the
   user says it is inspiration.
5. Do not generate alternative design directions. The reference already determines the direction.
6. Record the per-region structure table in `reference.md` and the matching `composition` block in
   `reference-evidence.json` before any layout is authored.
7. Separate image, canonical/object, world, and camera spaces. Rectify the source into a canonical
   front view, author the front elevation there, then solve and lock the output camera. A pending
   source blocks rectification and the camera solve; the rest of the module still runs.
8. Run `designer-pipeline reference check`. `blocked` with reason `source-pending` is a recorded
   state with `contractValid: true`, not a contract failure. Exact and adaptive reconstruction
   remain blocked until the geometry stage of `reconstruction.json` passes. Read the exit code as
   returned: `0` success, `1` invalid or error, `2` blocked, `3` a measured fidelity mismatch. `3`
   is a real outcome that reaches the caller and prints `fidelity-limited`; it is not success.
9. Render the layout-only graybox and run
   `designer-pipeline reconstruction check --stage graybox`. This gate precedes change `design.md`
   and precedes materials, glow, bloom, depth of field, scanlines, and cinematic grading. It is the
   only gate on that optical treatment.
10. Write change `design.md` against the graybox capture and cite that capture in it.
11. Before detail geometry, type treatment, or any measured fidelity claim, run
    `designer-pipeline reconstruction check --stage geometry`. It independently recomputes
    distributed landmark error. Against a pending source it reports `blocked` with reason
    `source-pending`, never `fidelity-limited`. This stage does not gate optical treatment; when it
    is blocked and the graybox stage is `ready`, continue.
12. After final rendering, an independent EvidencePort must produce reference, implementation, and
    diff images plus a hash-bound fidelity receipt. Run
    `designer-pipeline reconstruction check --stage final`.
13. Missing evidence is `blocked`; complete measured evidence outside thresholds is
    `fidelity-limited`. Neither state may be described as exact, identical, pixel-perfect, or done.
14. Record the verification claim in `qa.md` from the whole `--stage final` result - its top-level
    status and its `stages` map together: `verified` only when the top-level status is `ready` and
    every reported stage is `ready`, `fidelity-limited` when the top-level status is
    `fidelity-limited` and no stage is `blocked`, and `unverified` for everything else, including a
    single blocked stage and a pending or unresolvable source. Requested fidelity does not move with
    it. Only that complete output is evidence for the claim. `reconstruction check` defaults to
    `--stage geometry`, and no stage-scoped result - the default run, an explicit `--stage geometry`
    or `--stage graybox` run, or a bare `stages.graybox` reading lifted out of any result - may be
    cited as evidence for `verified`.
15. Report the unlock action whenever the source is still pending: supplying the source file path
    enables rectification, camera calibration, landmark error, and the fidelity receipt.

## Website Cloning Module

When the user asks to clone, reproduce, rebuild, reverse-engineer, or use one or more live pages as implementation references:

1. Read `references/website-cloning.md` and `references/website-clone-component-spec.md` completely.
2. Initialize the run with `scripts/init-website-clone.cjs`; pass direct clone targets with `--url` and supporting inspiration/comparison pages with `--reference-url`. When one target is the user-designated structure or motion template, pass it as the primary `--url`/`--authority-url`, enumerate every allowed difference, protect the required invariants, and select `actual-browser` when live-tab interaction is part of acceptance.
3. Treat `references/website-cloning-manifest.schema.json` as the machine-readable Browser/Builder/Evidence port and fidelity contract.
4. Complete `targets/<target-id>/research/palette-evidence.json` from both DOM/computed-style
   evidence and screenshot/raster-media evidence, then reflect the same roles and values in
   `design-tokens.md`.
5. Run `scripts/check-website-clone-foundations.cjs --change-root <change-root> --json` before
   synthesizing the implementation design or starting BuilderPort work. Project `DESIGN.md`,
   project `MOTION.md`, and every target palette must be `ready`; adaptive mode does not bypass
   this gate.
6. Keep the URL-first user experience, but record each adapter, its available capabilities, and a successful capability probe before claiming exact fidelity.
7. After EvidencePort writes its measured report, run `scripts/evaluate-website-clone.cjs`; this is the only path that may move the manifest to `complete`. The evaluator must also verify implementation-authority identity, protected invariants, allowed differences, replay provenance, and the declared interaction environment; adaptive fidelity does not bypass these checks.
8. If a required port or measurement is missing, keep `blocked`; if complete measurements miss a threshold, use `fidelity-limited`. Never fill missing measurements by visual guesswork.

The website-cloning module is a design-pipeline superset capability. It adds live evidence capture and convergence gates while preserving all existing accessibility, motion, responsive, engineering, and headless-state requirements.

## Requirements-Driven DESIGN.md Synthesis

When the target project has no reusable `DESIGN.md`, or the existing file cannot express the
requested product direction:

1. Read `references/design-synthesis.md` completely.
2. Initialize with `scripts/init-design-synthesis.cjs`, using `--problem` as the primary input.
3. Register live pages with `--reference-url` and existing DESIGN.md examples with `--template`.
   Both are attributed evidence; templates are always inspiration-only.
4. Run `/grill-with-docs <problem>` when material product decisions remain unresolved, persist its
   ADR/glossary/decision evidence, then record `grill-completed`.
5. Run the deterministic scope assessment. Only when the score exceeds the selected budget, say
   “哦，天哪，这比我预期的要大得多。” and request `/wayfinder 为此制作一张地图`.
6. Wayfinder must use a configured issue-tracker host. Never invent a local issue map when that host
   is unavailable.
7. Synthesize 2-3 product-specific directions from requirements, repository constraints, and cited
   evidence. Select one and write the reusable project `DESIGN.md`.
8. Validate it through `scripts/advance-design-synthesis.cjs`, then immediately continue into the
   normal implementation and QA stages unless another material decision is pending.

Keep the artifacts distinct:

- lowercase change `design.md` defines how the active change will be implemented;
- project `DESIGN.md` defines reusable product identity for future coding agents.

The bundled scripts manage deterministic state and validation. The host design agent performs the
creative synthesis; do not disguise a copied template or token dump as generated product design.

## Companion Skills

Reference file: `references/companion-skills.md`.
Capability routing reference: `references/capability-routing.md`.
Machine-readable companion registry: `references/companion-capabilities.json`.
Requirements-driven synthesis reference: `references/design-synthesis.md`.
Feedback and contribution reference: `references/feedback-loop.md`.
Upstream capability sync reference: `references/upstream-capability-sync.md`.
Development compatibility reference: `references/development-compatibility.md`.
Self-check reference: `references/self-check.md`.
QA checklist reference: `references/qa-checklist.md`.
Direct plain-language contract: `references/plain-language.md`.
CJK typography contract: `references/cjk-typography.md`.
Visual direction preview contract: `references/direction-preview.md`.
Project motion foundation reference: `references/motion-foundation.md`.
Machine-readable motion foundation schema: `references/motion-foundation.schema.json`.
Motion primitive registry: `references/motion-primitives.json`.
Motion spec reference: `references/motion-spec.md`.
Reference evidence and spatial-routing spec: `references/reference-spec.md`.
Change visual/screen-space design spec: `references/design-spec.md`.
Change 3D world spec: `references/3d-spec.md`.
Graphics runtime routing reference: `references/graphics-runtime-routing.md`.
Machine-readable graphics runtime catalog: `references/graphics-runtime-catalog.json`.
XY Python charting reference: `references/xy-charting.md`.
Change scene/runtime spec reference: `references/scene-runtime-spec.md`.
Phaser v4 game runtime reference: `references/phaser-v4.md`.
Game UI and narrative profile reference: `references/game-ui-and-narrative.md`.
Curation policy reference: `references/curation-policy.md`.
Contextual anti-slop review reference: `references/anti-slop-review.md`.
Machine-readable anti-slop rubric: `references/anti-slop-rubric.json`.

If these design skills are installed, use them as lenses in this order:

1. `frontend-design`: visual direction, composition, strong first impression, avoiding generic AI aesthetics.
2. `design-taste-frontend`: anti-template discipline, typography taste, language and visual restraint.
3. `ui-ux-pro-max`: UX heuristics, design-system selection, color and type pairing, stable repeatability.
4. `web-design-guidelines`: production UI rules, layout, semantics, accessibility, responsive behavior.
5. `emil-design-eng`: motion, transitions, input feedback, perceived quality, interaction details.

For dynamic UI, interaction motion, and animation-specific work, apply these motion skills:

- `design-motion-principles`: primary create/audit workflow for purposeful UI motion.
- `emil-design-eng`: design-engineering judgment for animation and interaction polish.
- `animation-vocabulary`: translate vague motion intent into precise timing, easing, choreography, and behavior language.
- `review-animations`: strict post-implementation animation review.
- `apple-design`: Apple HIG-inspired interface principles and fluid system UI motion for web (WWDC-informed).
- `vercel-react-view-transitions`: React and Next.js view-transition implementation patterns.

Choose companions by capability, not by the presence of a familiar skill name. Read `references/capability-routing.md` when the change crosses evidence capture, design systems, assets, motion runtimes, editable design handoff, or hosted delivery. For 2D, 3D, data visualization, geospatial, GPU, game, or narrative surfaces, also read `references/graphics-runtime-routing.md` and select a capability family before selecting an adapter.

For animation implementation, choose library skills by job:

- Use `gsap-core`, `gsap-timeline`, `gsap-scrolltrigger`, `gsap-react`, `gsap-plugins`, `gsap-utils`, `gsap-performance`, and `gsap-frameworks` for advanced choreography, scroll-driven animation, timeline control, React integration, SVG/plugin-heavy work, or when GSAP is already in the project.
- Use `animejs` v4.5 for modular timelines, layout transitions, accessible text splitting, SVG, draggable interactions, scroll observers, WAAPI, deterministic stagger, or adapter-driven targets such as Three.js.
- Use the built-in `reflex-xy` route for Python-native charts, notebooks, static chart export, Reflex applications, or large datasets that need screen-bounded rendering. Read `references/xy-charting.md`; pin the alpha version in the target project and keep a semantic data-table path.
- Use the official `pixijs` router and the matching PixiJS v8 sub-skills only for justified interactive 2D render surfaces such as sprite fields, particles, filters, shaders, canvas editors, or high-object-count scenes. Read `references/pixijs-rendering.md` before selecting it.
- Use the built-in Phaser v4 route for a complete 2D game runtime with scenes, game-loop ownership, input, audio, physics, cameras, scaling, and game-state transitions. Read `references/phaser-v4.md`; do not depend on an unverified community skill pack.
- Use Three.js or React Three Fiber for focused 3D scene rendering; use Babylon.js or PlayCanvas when a fuller 3D engine is justified. Existing project runtimes still win when they meet the capability and budget.
- Use `references/game-ui-and-narrative.md` for HUDs, game menus, dialogue systems, visual novels, and Galgame surfaces. Keep dialogue, choice, backlog, save/load, skip, autoplay, and accessibility state independent of animation timing.
- If no animation or rendering library is already present, prefer semantic DOM plus CSS transitions/keyframes for simple state changes; choose Anime.js, GSAP, PixiJS, Phaser, or a 3D runtime only when the required capability justifies it.
- Do not add overlapping runtimes unless `design.md`, `motion.md`, and when required `scene.md` or
  `3d.md` assign distinct responsibilities. One adapter owns each render loop, clock, property,
  lifecycle, and cleanup path.
- Treat an installed but stale `animejs` companion as a warning. Use official v4.5 documentation for missing markers and record the fallback in `qa.md`.
- Treat a partial or stale PixiJS suite as a warning. Use the canonical PixiJS v8 documentation index for missing APIs and record the fallback in `qa.md`.

For React and Next.js work, also apply the installed Vercel / Next.js engineering skills listed in `references/companion-skills.md`:

- `vercel-react-best-practices`
- `vercel-composition-patterns`
- `vercel-react-view-transitions`
- `next-cache-components-adoption`
- `next-cache-components-optimizer`
- `next-dev-loop`

If a companion skill is missing, continue with the same gate manually and note the missing skill in `qa.md`. Do not block the user unless the requested output depends on a missing asset, credential, or external service.

## Stage 0: Repo Read

Before writing design artifacts or code:

- For HTML video, reels, motion graphics, captions, overlays, slideshows, explainers, voiceovers,
  or Remotion ports, route through `references/hyperframes.md` before choosing a runtime. HyperFrames
  uses HTML as the source of truth and a deterministic, paused, seekable timeline; ordinary UI
  motion remains on the normal motion route. Load only the matched workflow/domain skill when the
  upstream HyperFrames skill tree is available.

- For read-only pull-request orientation, review-thread inspection, or CI failure drilldown, use
  `node <design-pipeline>/scripts/github.cjs pr-snapshot|pr-threads|ci-failures`. The commands
  collapse repeated `gh` calls into bounded reports, preserve valid `gh` failure statuses, keep
  review resolution state through GraphQL, and write full CI logs to the OS temp directory. They
  require `gh` on `PATH` and an authenticated session; they never create or mutate GitHub
  artifacts. Use raw `gh` for workflows these commands do not cover, and never pipe `gh` into
  `head`.

- Run `node <design-pipeline>/scripts/check-deps.cjs` from the target repo root, or manually perform the same checks from `references/self-check.md` if Node is unavailable.
- Read `references/companion-capabilities.json` as the source of truth for install groups, suite requirements, capability markers, and upstream sources. Do not add another hard-coded companion list.
- Read capability-profile warnings separately from install status. `installed` means discoverable; `WARN` means the companion surface does not advertise the current capability baseline.
- Treat missing optional/enhancement companion skills as a fallback path, not a blocker. Record missing capabilities in `qa.md`.
- When a warning represents a reusable pipeline or companion gap, run self-check with `--record-feedback` or call `scripts/record-feedback.cjs` immediately. This writes a local, redacted, deduplicated draft; it does not publish remotely.
- When version-sensitive upstream freshness matters, read
  `references/upstream-capability-sync.md`. The host retrieves source evidence; the bundled audit
  compares it without executing remote content. Missing evidence is `UNKNOWN`, never current.
- Never append a retrieved taste prompt to global agent instructions. Curate reviewed observations
  into `references/anti-slop-rubric.json`, preserve source hashes, and keep the remote text inert.
- Prepare Issue or PR publication requests locally. Remote creation requires explicit authority for
  the exact action and repository, followed by a validated receipt and local reconciliation.
- Initialize or update `state.json`, `events.jsonl`, and `handoff.md` using `references/agent-interface.md`.
- Use `scripts/designer-pipeline.cjs` for v2 state initialization, migration, CAS-protected
  transitions, consistency checks, and explicit repair. Do not independently rewrite state and
  event history.
- Identify the app framework, styling system, component library, routing, existing design tokens, and test/QA surface.
- Write `toolchain-request.json`, then run `designer-pipeline toolchain resolve --artifact
  toolchain-request.json --write --output toolchain-plan.json`. This is mandatory for every
  frontend change, including a project-owned `none` UI-library choice. The request records the
  framework, current and requested stack, brief, capabilities, and any graphics family or adapter.
  The plan owns the joined frontend/tool/graphics selection plus `probe`, `invoke`, and `verify`
  descriptors. Do not infer a library from taste alone. A blocked plan stops the run. The older
  `design-system resolve-stack` command remains a narrower compatibility surface.
- Run `designer-pipeline toolchain probe --artifact toolchain-request.json` before invoking a
  selected external runtime. Probes are read-only and registry-owned; they never install or update
  a package. Record every invocation as `design-pipeline.toolchain-receipt.v1`, binding the plan
  hash, actual tool version, command, exit code, artifacts, hashes, and linked evidence receipts.
- Before BuilderPort work, write `execution-request.json` with the toolchain plan hash plus explicit
  slice owner and literal project-relative scope, then run `designer-pipeline execution route` and
  `execution prepare`. `auto` routes one clean slice in place, multiple clean slices sequentially,
  and dirty or isolation-required work to a `codex/*` worktree. Finalize with a structured outcome.
  A successful worktree must be committed, clean, and in scope before it is removed; failures,
  dirty results, scope violations, and cleanup failures retain the worktree and block completion.
- Run `designer-pipeline design-system decompose --query "<product brief>" --write --output
  capability-inventory.json`, then `designer-pipeline design-system route --query "<product
  brief>" --platform <platform>`. Record the selected routes and unavailable capabilities in the
  design-system decision. This closes the gap between a required Stage 0 search and the actual CLI.
- External tool entries are governed routes, never installation instructions. `deepclonewebsite`
  may be proposed for cloning only after its browser login and model credential requirements are
  explicit; Frog may be proposed for GitHub issue sync only after repository/workflow authority is
  explicit. The bundled cloning and feedback routes remain executable fallbacks. The bundled
  MengTo, SmoothUI, and React Bits catalogs are inert metadata; use only the named routed
  components or techniques, never auto-install or execute upstream source text. Preserve the
  recorded MIT/Commons Clause boundaries and adapt into project-owned components.
- Treat Koboyo as a low-frequency governed icon-asset route, not a shadcn preset or default icon
  library. Route it only for explicit Koboyo or hand-drawn-icon intent. Public per-icon SVG use is
  subject to the recorded license constraints; MCP icon search requires a key, should use header
  authentication, and must not persist keys in URLs or logs. Canvas mutations are outside the icon
  route and require separate explicit authority. Recheck the published license before bulk use.
- Search the design-system catalog when reusable component, hook, template, documentation, or token
  knowledge could prevent reinvention. Record the adoption mode instead of silently importing a
  candidate system.
- Run `designer-pipeline design-system decide` with both the ready `frontendStackDecision` and the
  complete `capabilityInventory` embedded in the request, or reference their contained artifact
  paths with `frontendStackDecisionPath` and `capabilityInventoryPath`. A non-custom decision
  without either artifact is blocked; custom mode still requires the frontend-stack decision.
- Inspect existing UI patterns before inventing new ones.
- Check whether the project already has source-of-truth design docs or OpenSpec-style folders.
- Confirm the graphics selection in `toolchain-plan.json` against
  `references/graphics-runtime-catalog.json`. Preserve an accepted existing adapter when it
  satisfies the capability and budget; a selected adapter without a trusted lifecycle blocks the
  unified plan instead of becoming an implied execution path.
- Resolve the reference source to a file path here, before any reference artifact is written -
  before `reference.md`, before `reference-evidence.json`, and before `reconstruction.json`. Ask
  the user for the path when it is not resolvable and name what it unlocks: rectification, camera
  calibration, landmark error, and the fidelity receipt. When no path arrives, record
  `source.availability: pending` with `pendingReason` and `requestedFrom` and report it now. A
  pending source surfaces at Stage 0, not at gate review. Asking for the path after the artifacts
  already exist is the defect this step exists to prevent.
- Then, when visual references influence the change, create `reference.md` and normative
  `reference-evidence.json` from `references/reference-spec.md`. Record object dimensionality,
  camera model, interaction model, and output surface separately before selecting `2d`, `2.5d`,
  `3d`, or `hybrid`. Perspective, occlusion, near/far scale, volumetric containers, and camera
  behavior are spatial evidence; glow and transparency alone are not. Run
  `designer-pipeline reference check` and stop unless it reports `ready`, with exactly one
  exception: a standalone `source-pending`, meaning the top-level `reason` is `source-pending` and
  every entry in the `stages` map reports `ready`. A run blocked for `source-pending` and anything
  else is still a stop.
- When exact static-reference language is present, use reference-evidence v2 and
  `reconstruction.json`; do not silently treat the image as a mood board or style direction.
- Check for project `DESIGN.md`. If it is missing or materially incompatible with the request, route
  through the requirements-driven synthesis module before implementation.
- Run `node <design-pipeline>/scripts/check-design-foundation.cjs --project-root . --json`.
  Status `synthesis-required` is the mandatory route into synthesis; only `ready` unlocks
  implementation.
- Check for project `MOTION.md`. If it is missing or incompatible with the requested interaction
  language, synthesize it from product requirements and `references/motion-foundation.md`.
- Run `node <design-pipeline>/scripts/check-motion-foundation.cjs --project-root . --json`.
  Status `synthesis-required` is the mandatory route into motion-foundation synthesis; only
  `ready` unlocks implementation.
- Check whether the project has OpenSpec, GBrain, or Matt Pocock skill artifacts and use the compatibility rules in `references/development-compatibility.md`.
- Note constraints such as no external images, single-file HTML, mobile-first, accessibility, or brand rules.

## Stage 1: Brief

Create or update `brief.md` with:

- Goal: what UI outcome the user wants.
- Audience: who uses it and under what pressure.
- Surface: pages, components, states, and screen sizes.
- Constraints: tech stack, assets, data, accessibility, performance, deadlines.
- Non-goals: what should not change.
- Acceptance checks: observable behavior and visual qualities.

Keep this short. It is an execution contract, not a product essay.

### Form sanity backstop

Before choosing a visual direction, declare the deliverable form from the user's or controller's
language, then state the reader action in plain terms. Apply the single-canvas counterfactual: if
the proposed carrier were all the reader received, could it perform that action without the author
explaining it? If the brief implies a sequence, set, or state flow, do not compress it to one canvas
for production convenience. Record unresolved form uncertainty in the brief and take the
least-assumptive path; a model-written concept cannot approve its own form.

When the brief, handoff, or interface copy asks a person to decide or act, read
`references/plain-language.md`. Put the exact consequence or available action first, then preserve
scope, limits, exclusions, uncertainty, unchanged state, and recovery actions in the second pass.

## Stage 2: Design Directions

Read `references/direction-preview.md` and write `direction-preview.json` before selecting a
direction. For an open whole-surface request, produce three candidates by default in one comparable
`direction-previews/index.html`; two candidates require a real product/reference constraint, and
four are for an explicit broader exploration. Use the same real content fixture, state coverage,
and viewport, then capture and hash one screenshot per candidate.

Run `designer-pipeline direction check --stage preview --change-root <change-root> --json` while
the decision is pending. Only after it reports `ready` may the user or an autonomous run select a
candidate. Record the selected ID and product/visitor-fit rationale, then run `direction check
--stage selection`. A narrow change, established surface, non-visual change, exact primary target,
or user-specified single direction records an explicit supported waiver. Missing evidence is not a
waiver.

Create `directions.md` from the selected, verified preview before implementation. Present the
committed direction and at most two honest alternates. When a waiver inherits an established or
user-selected direction, record that inheritance instead of inventing alternatives.

When references are present, directions must preserve the route and fidelity invariants recorded in
`reference.md`. A `3d` or `hybrid` route cannot be downgraded to flat card composition for
implementation convenience.

For a `primary-target` exact reconstruction, do not produce alternative directions. Record that
`directions.md` is intentionally bypassed because the supplied reference is the selected direction,
then proceed through rectification, camera calibration, and the graybox capture.

Each direction must include:

- Visual thesis: layout, density, rhythm, typography, color posture.
- Interaction thesis: motion, feedback, empty/loading/error states.
- Fit: why it suits this product and audience.
- Risk: where it may fail or feel wrong.

Choose the carrier and visual language from the subject, audience task, and viewing context,
not from a style label alone. Every major visual technique must name its subject or reference cause
and its intended viewer effect. Anti-template work has two sides: reject generic AI grammar and
reject under-designed output; a title over an untreated asset with faint decorative furniture is
not a finished direction.

When anti-template risk matters, use `references/anti-slop-review.md` to compare cohesion,
product-grounded signature, specificity, and template-pattern density. Named colors, fonts,
punctuation, shapes, effects, or common layout families are not automatic rejection criteria.

Default decision rule:

- Product dashboards and operational tools: choose the quietest direction that maximizes scanability and repeated use.
- Marketing pages and portfolios: choose the direction with the strongest first-viewport signal and least generic composition.
- Components and app flows: choose the direction with the clearest states, accessibility, and interaction feedback.

## Stage 3: Design Spec

Create lowercase change `design.md` using `references/design-spec.md`. It is the selected source of
truth for visual language and screen-space UI.

Order this stage by reference role. For `primary-target`, capture and pass the graybox first, then
write `design.md` against it and cite that capture; a spec written from a reading alone propagates
the misreading into the implementation. For `constraint` and `inspiration`, keep the existing order
and reconcile `design.md` against the first render afterwards. Reconciliation is required for every
change that has a reference; the role decides *when* it happens, never *whether* it happens, and
there is no role for which it is optional, `inspiration` included. Every change with a reference
records a `Spec Reconciliation` section; an empty table is a valid result, an absent section is not.

`design.md` records:

- Layout grid and responsive behavior.
- Color tokens and contrast posture. For website references, these must cite the ready
  `palette-evidence.json`, preserve DOM and raster-media sources separately, and record coverage,
  luminance, saturation, and temperature relationships rather than listing accents alone.
- Type scale and font constraints.
- When shipped copy contains CJK text, the system/project font stack, CJK body size and line height,
  punctuation/mixed-script convention, and decorative subset evidence required by
  `references/cjk-typography.md`.
- User-facing copy follows `references/plain-language.md`: titles name the smallest accurate scope,
  the first useful sentence exposes the consequence or action, and controls name only real actions.
- Component inventory and states.
- Motion rules and reduced-motion fallback.
- Accessibility requirements: semantic structure, focus order, keyboard behavior, labels, announcements, contrast.
- Asset strategy: real assets, generated bitmap images, icons, or no-assets justification.
- Anti-template decisions when the contextual anti-slop review is active: deliberately avoided
  patterns, retained common patterns, product-specific rationale, and non-applicable rules.
- Spec reconciliation when the change has a reference: the cited graybox capture, the reconciliation
  timestamp, and every value the implementation changed with an observed cause.

Do not define camera projection, world coordinates, geometry, lighting, world-space UI, or spatial
navigation in `design.md`. Those belong in `3d.md` for 3D families.

When requirements-driven synthesis is active, also write the project `DESIGN.md` according to
`references/design-synthesis.md`. Link it from change `design.md`; do not duplicate the entire file.

Use concrete values when implementation will need them. Avoid vague style words without implementation consequences.

Create `motion.md` when the change includes animation, transitions, gesture feedback, loading motion, scroll-linked motion, route transitions, hover/focus motion, or micro-interactions. Use `references/motion-spec.md`.

Change `motion.md` must record the validated project `MOTION.md` hash, selected primitive IDs,
authored or observed provenance, runtime capability status, and any degradation. It may not silently
invent a parallel motion vocabulary.

`motion.md` is required for:

- GSAP or Anime.js usage.
- PixiJS, Canvas, WebGL, or WebGPU render surfaces.
- React view transitions.
- Scroll-triggered animation.
- Multi-step choreography.
- Motion that affects navigation, focus, loading, data updates, or user confidence.

Simple CSS hover/focus transitions can stay in `design.md`, but still need reduced-motion behavior and QA notes.

Create normative `scene.json` plus its family-specific readable projection using
`references/scene-runtime-spec.md` when the change has persistent spatial
state or an engine-owned lifecycle: Canvas/WebGL/WebGPU scenes, cameras, coordinate transforms,
asset manifests, render or game loops, physics, world input, procedural state, save/load state, or
runtime-specific degradation. The pair binds design and motion semantics to a selected adapter; it
does not replace `design.md` or `motion.md`.

Fixed-camera cinematic 3D, Three.js, React Three Fiber, Babylon.js, PlayCanvas, CesiumJS, and
equivalent 3D families require `scene.json` plus `3d.md` from `references/3d-spec.md`. Phaser,
PixiJS, persistent 2D editors,
WebGPU/WGSL effects without a 3D family, and stateful narrative runtimes use `scene.json` plus
`scene.md`. A narrative UI without a scene renderer may remain DOM-first, but still requires the
pair when it owns dialogue state, save/load, backlog, autoplay, or another persistent game-state
lifecycle.

Every change with a `reference-evidence.json` implements and verifies the actual-runtime graybox
gate before materials, glow, bloom, depth of field, scanlines, or cinematic grading. The gate is
unconditional: it applies to `2d` and `2.5d` as well as `3d` and `hybrid`, to every fidelity mode,
and to runs whose source is `pending`. `3d` and `hybrid` routes record the graybox contract in
`3d.md` and `reconstruction.json`; `2d` and `2.5d` routes without a `reconstruction.json` record it
in `reference-evidence.json`. Camera navigation is required only when the approved interaction model
is inspectable or navigable.

## Stage 4: Tasks

Create `tasks.md` with a checkbox list grouped by implementation surface:

- Tokens/theme
- Layout
- Components
- States
- Motion
- Motion spec
- Scene/runtime spec when required
- Accessibility
- Responsive QA
- Browser/manual QA

Tasks must be small enough to verify independently. Update checkboxes as implementation proceeds.

## Stage 5: Implementation

Implement directly from `design.md` and `tasks.md`.

Rules:

- Re-run `design-system resolve-stack`, `design-system decompose`, `design-system route`, and
  `design-system decide` against the final brief and installed project stack. Stop if the stack or
  design-system decision is not `ready`, or if its registry hash/selected routes differ from the
  artifacts approved at Stage 0 without a recorded design change.
- For website-cloning changes, run `scripts/check-website-clone-foundations.cjs --change-root
  <change-root> --json` first and stop unless it reports `ready`.
- Re-run `scripts/check-design-foundation.cjs` and stop unless it reports `ready`.
- Re-run `scripts/check-motion-foundation.cjs` and stop unless it reports `ready`.
- When references influence the change, run `designer-pipeline reference check` and stop unless it
  reports `ready`, with exactly one exception: a standalone `source-pending`. Standalone means the
  top-level `reason` is `source-pending` **and** every entry in the `stages` map reports `ready`.
  Only then continue - through the graybox gate, with the measured gates kept blocked. A run blocked
  for `source-pending` *and* anything else - a blocked `stages.graybox`, a blocked
  `stages.reconciliation`, any other reason - is still a stop. The aggregate reports one top-level
  `reason`, so `source-pending` on that line is not by itself evidence that the stages are clear;
  read the `stages` map before continuing. This command now carries three
  stages - `stages.graybox`, `stages.reconciliation`, and the aggregate's own contract checks - and
  reports `blocked` when any of them is not `ready`, so a change that passed it before the fold can
  block on a `Spec Reconciliation` section that was never written.
- The two reconstruction gates block different work and do not overlap. The graybox gate blocks
  optical treatment: materials, glow, bloom, depth of field, scanlines, and grading. The geometry
  gate blocks detail geometry, type treatment, and any measured fidelity claim. Optical treatment is
  released by the graybox gate alone; a blocked geometry stage is not a reason to withhold it.
- For every change with a `reference-evidence.json`, run
  `designer-pipeline reconstruction check --stage graybox` and stop unless it reports `ready`
  before authoring materials, glow, bloom, depth of field, scanlines, or cinematic grading. This
  gate is unconditional across `2d`, `2.5d`, `3d`, and `hybrid`, across every fidelity mode, and
  across runs whose source is `pending`. Read the three stages independently: a blocked `geometry`
  never implies a passed `graybox`, and both blocked at once is a process failure, not an
  environmental one.
- For exact or adaptive static-reference reconstruction, run
  `designer-pipeline reconstruction check --stage geometry` and stop unless it reports `ready`
  before detail geometry, type treatment, or any claim that the frame measurably matches the source.
  This gate must pass on rectification, front elevation, locked camera, distributed landmarks, and
  overlay evidence. A pending source reports `blocked` with reason `source-pending` and never
  `fidelity-limited`; an unreadable source declaration reports `reference-source-unparseable`,
  `reference-source-malformed`, or `reference-source-availability-invalid`. A missing measurement is
  a status, never a filled-in value. Reopening the camera invalidates the gate and requires a new
  calibration pass.
- A source nobody wrote down is not a resolved source. An absent `reference-evidence.json` and a
  document with no `source` field keep the legacy `resolved` availability, so geometry on an older
  change is untouched, but neither resolves anything: a `measured` graybox comparison on such a
  change blocks with `reference-source-unrecorded` or `reference-source-undeclared`. Declare
  `comparison.mode: qualitative` instead, which is what a comparison with no source to measure
  against actually is.
- A blocked geometry stage does not stop the run. When the graybox stage is `ready`, continue into
  optical treatment and record the verification claim as `unverified`. For a `2.5d` primary-target
  exact reconstruction with a pending source the geometry stage can never report `ready`, so
  treating it as a full stop would stop the run permanently; that is a misreading of this gate, not
  a safe default.
- Link the validated project `DESIGN.md` from the active lowercase change `design.md`.
- Link the validated project `MOTION.md` and its hash from active lowercase change `motion.md` when
  the change includes non-trivial motion.
- Link `scene.json` and its required `scene.md` or `3d.md` projection from the active change when a
  graphics, game, or persistent narrative runtime is selected. Run `designer-pipeline scene check`
  and verify that capability
  family, adapter, version, lifecycle, assets, input,
  accessibility, performance, determinism, degradation, and cleanup owners are complete.
- If the repo uses OpenSpec, keep the design-pipeline artifacts linked to the active OpenSpec change and do not create a parallel source of truth.
- If the repo uses GBrain, sync or reference the design decision artifacts through the repo's established GBrain surface instead of inventing a new memory format.
- If Matt Pocock engineering skills are installed, use `codebase-design`, `grill-with-docs`, `implement`, and `matt-tdd` where they fit the current implementation stage.
- Prefer existing components, tokens, icons, and layout primitives.
- Do not add a design dependency unless the user explicitly requested it or the repo already uses it.
- Do not create nested cards, decorative gradient orbs, generic purple/blue gradients, or marketing-style hero layouts for operational tools.
- Use real visual assets or generated bitmap assets when the task is a website, landing page, portfolio, or visual product surface.
- Use stable dimensions for fixed-format UI elements so hover, labels, icons, loading states, and dynamic text do not shift layout.
- Ensure mobile and desktop text fits without overlap.

## Stage 6: Gate Review

Before claiming completion, write `qa.md` using `references/qa-checklist.md` with the result of these gates:

- Visual gate: composition is non-generic, brand/product signal is clear, palette is not one-note, typography fits the surface.
- UX gate: primary workflow is obvious, states are complete, destructive actions are guarded, recovery paths exist.
- Plain-language gate: user-facing copy puts the exact consequence or available action first, then
  passes the fact-scope review in `references/plain-language.md`; a shorter rewrite cannot widen a
  partial failure, remove a limit, strengthen uncertainty, or invent an action.
- Engineering gate: existing patterns are respected, no unnecessary dependency or abstraction was added.
- Accessibility gate: keyboard navigation, focus behavior, labels, reduced motion, and contrast are checked.
- Motion gate: interaction feedback is intentional, not decorative, and has reduced-motion fallback.
- Motion foundation gate: project `MOTION.md` is `ready`, its hash is recorded, and selected
  primitive IDs exist in the bundled registry.
- Motion spec gate: `motion.md` exists for any non-trivial motion and includes trigger, purpose, timing, easing, choreography, interruption behavior, implementation library, performance budget, and reduced-motion fallback.
- Reference-routing gate: when references influence the change, `reference.md` records evidence and
  normative `reference-evidence.json` separates reference role, requested/effective fidelity,
  geometry, camera, interaction, and output; selects `2d`, `2.5d`, `3d`, or `hybrid`; names the
  required artifact set; records source availability; and records approval. Every route names
  `graybox.png` in `requiredArtifacts`, and v2 documents carry a `composition` block. A document
  declaring `design-pipeline.reference-evidence.v1` while carrying `intent` or a `graybox` block is
  current work wearing a stale version label: it is validated as v2 and owes `intent` and
  `composition`, failing with `schema era mismatch:` until both are recorded. A v1 document that
  carries neither stays exempt.
- Verification claim gate: `qa.md` records the claim as `verified`, `fidelity-limited`, or
  `unverified`, derived from one command - `reconstruction check --stage final` - read in full, its
  top-level status together with every entry in its `stages` map. `verified` requires the top-level
  status *and* every reported stage to be `ready`; the top-level status alone is not the derivation,
  because a `final` stage can report `ready` beside a `blocked` `stages.graybox`. Only that complete
  output is evidence for the claim: `reconstruction check` defaults to `--stage geometry`, and a
  stage-scoped result - the default run, an explicit `--stage geometry` or `--stage graybox` run, or
  a bare `stages.graybox` reading lifted out of any result - is rejected as evidence for `verified`,
  because it answers only for the stage that was asked for. A `--stage final` result that is
  missing, unreadable, or incomplete records `unverified`. A pending or
  unresolvable source records `unverified` by blocking a stage, and nothing in `qa.md`, `design.md`,
  or the final response describes an `unverified` run as verified, exact, identical, pixel-perfect,
  or complete.
- Reference composition gate: `reference.md` carries the per-region structure table, an explicitly
  answered uniformity question, and named exceptions; `composition` in `reference-evidence.json`
  matches it and does not contradict itself. When two or more `rows x columns` structures tie for
  most-common there is no norm to follow, so every region records what it breaks from or is named by
  one that does; otherwise validation fails with `composition ambiguity:`. The modal structure is
  read from the counts, so reordering the table cannot change the verdict.
- Graybox gate: `designer-pipeline reconstruction check --stage graybox` reports `ready` for every
  change with a `reference-evidence.json`, on every route and in every fidelity mode. The capture is
  layout-only, its suppression comes from a declared runtime graybox mode that names the layers it
  disables - a bare token blocks with `graybox-mode-unverifiable` - and its comparison
  addresses the recorded region ids by name. Exactly one carrier holds the block - two is
  `graybox-carrier-conflict` and neither block is validated. A comparison that names regions while
  no `composition` was recorded anywhere is `graybox-composition-unrecorded` or
  `graybox-composition-undeclared`, not a pass. A reference document the contract cannot read blocks
  this stage too, with the reason that names the fault. A `qualitative` comparison proves ordering
  discipline and is never fidelity evidence. A run whose `geometry` stage is blocked on a missing
  source must still show `graybox: ready`; both blocked is a process gap, not an environmental
  limitation.
- Reference raster gate: a `measured` comparison is refused unless the bytes behind `source.path`
  are a PNG the stage can read a width and height out of. Existence is not enough; the gate reads
  the first 24 bytes and checks the PNG signature and the IHDR dimensions. Each failure keeps its
  own reason - `reference-source-path-undeclared`, `reference-source-raster-uncontained`,
  `reference-source-raster-missing`, `reference-source-raster-unreadable`,
  `reference-source-not-raster`, `reference-source-raster-truncated` - and a `video` or `live-page`
  source reaches `measured` only by exporting the compared frame as a PNG and naming that.
- Reference freshness gate: when `source.resolvedAt` is recorded, a `measured` graybox capture taken
  before it blocks with `graybox-capture-predates-source` and has to be re-run rather than
  re-labelled; a `capturedAt` that will not parse is `graybox-capture-uncomparable`, never counted
  as fresh. An absent `resolvedAt` is the legacy default and is not compared. A `resolvedAt` that is
  not an ISO 8601 timestamp is `reference-source-resolved-at-invalid`, and one recorded beside
  `availability: pending` is `reference-source-resolved-at-contradictory`; both block every stage.
- Spec reconciliation gate: change `design.md` carries a `Spec Reconciliation` section citing a
  graybox capture that exists on disk. An empty table is `ready`; an absent section is `blocked`.
  Every `Cause` entry describes an observation, not an intention. This gate is folded into
  `designer-pipeline reference check` and reported under `stages.reconciliation`, so the aggregate
  returns `blocked` whenever it is not `ready`; `reconciliation check` on its own is still
  available. A reconciliation that cannot be evaluated is `reconciliation-unverifiable`, never
  `ready`. Applicability no longer waits for a hand-authored carrier: a valid `website-cloning.json`
  with targets, or a `design-synthesis.json` recording reference inputs, makes the gate apply from
  `change init`. An absent manifest keeps the carrier-only default; a manifest that is present but
  unreadable, malformed, or self-contradictory blocks with
  `reconciliation-manifest-unreadable`, `reconciliation-manifest-malformed`, or
  `reconciliation-manifest-contradictory`, because a broken manifest leaves applicability itself
  undecidable.
- Exact reconstruction gate: `reconstruction.json` separates image/canonical/world/camera spaces;
  binds rectification, front elevation, locked camera, distributed landmarks, and overlay; and
  passes `designer-pipeline reconstruction check --stage geometry`.
- Final fidelity gate: an independent EvidencePort has the required comparison capabilities and a
  successful probe; its receipt hashes match the reference, implementation, and diff images; and
  `designer-pipeline reconstruction check --stage final` reports `ready`. Exact mode permits no
  intentional mismatch masks.
- Scene/runtime gate: `scene.json` and matching `3d.md` exist for 3D families; `scene.json` and
  matching `scene.md` exist for persistent non-3D spatial, game-engine, GPU, or stateful narrative
  surfaces. They record the capability family, adapter,
  version, scene/camera and
  coordinate model, lifecycle, assets, input, accessibility, budgets, deterministic evidence,
  degradation, and cleanup ownership.
- Responsive gate: mobile and desktop layouts have no overlap or clipped text.
- Manual QA gate: browser or matching surface was used to inspect the actual UI.
- Contextual anti-slop gate when active: run `scripts/evaluate-anti-slop.cjs`, repair hard
  blockers, resolve contextual warnings or record accepted context, and link the report from
  `qa.md`. Preference findings never block completion.
- Scorecard gate: visual taste, UX clarity, accessibility, responsiveness, motion quality, engineering fit, and performance risk are scored 0-5 with notes.
- Evidence gate: browser/tool output is represented by a validated receipt with explicit status,
  hashes, redaction, and missing-artifact states; visual guessing never fills missing evidence.
- Interoperability gate: tokens, UI IR, design-to-code mappings, pattern IDs, and design-tool
  receipts pass their public schemas when used.
- Benchmark gate: every required responsive, accessibility, palette, motion, scene, component-state,
  and evidence scenario passes; aggregates cannot hide a required failure.
- Adapter governance gate: catalog routes resolve through the registry and new adapters pass pinned
  provenance, license, maintenance, security, permission, degradation, and admission review.

If a gate cannot be run, record why and use the next-best check.

## Stage 7: Archive

After completion:

- Keep active artifacts with the code if the repo has no archive convention.
- If the repo has OpenSpec-style archiving, move completed change notes to the matching archive folder.
- Update persistent design docs only when the change creates reusable tokens, components, or interaction rules.
- Link accepted feedback observations to the completed change. Mark them resolved or superseded only after verification evidence exists.

## Feedback and Maintainer Loop

Use `references/feedback-loop.md` whenever a run exposes a pipeline bug, stale companion, missing capability, quality gap, documentation gap, or reusable feature request.

The local loop is:

1. Observe during self-check, implementation, or QA.
2. Normalize, redact, and deduplicate with `scripts/record-feedback.cjs`.
3. Generate an Issue draft by default; generate a PR draft only when changed files and validation evidence exist.
4. Review the draft, target remote, privacy boundary, and evidence.
5. Publish only after explicit user authority through an installed GitHub or ship workflow.
6. Preserve the regression test and update `companion-capabilities.json` when the durable learning changes compatibility routing.

When modifying `design-pipeline` itself, use this same pipeline and OpenSpec lifecycle. The pipeline is allowed to improve itself, but it must not silently mutate third-party skills or use ambient credentials to create remote artifacts.

## Output Contract

Final responses should report:

- Change id and artifact folder.
- Project `DESIGN.md` path, input mode, scope score/budget, and Wayfinder map URL when synthesis ran.
- Implemented surfaces.
- Verification evidence.
- Reference source availability. When it is `pending`, name the action that unlocks the measured
  gates: supply the source file path, which enables rectification, camera calibration, landmark
  error, and the fidelity receipt. Requested fidelity stays as the user asked.
- Verification claim, for every change with a `reference-evidence.json`: `verified`,
  `fidelity-limited`, or `unverified`. It is recorded on one line in `qa.md` under
  `## Reference And Spatial Routing` and derived from one command,
  `designer-pipeline reconstruction check --stage final`, read in full - its top-level status and
  every entry in its `stages` map. `verified` needs the top-level status and every reported stage to
  be `ready`; `fidelity-limited` needs a top-level `fidelity-limited` with no stage `blocked`;
  everything else is `unverified`, including a single blocked stage, a pending or unresolvable
  source, and a change with no `reconstruction.json` to run the command against. Only the complete
  output of that one command is evidence for the claim. `reconstruction check` defaults to
  `--stage geometry`, so the command run without `--stage` returns a geometry-scoped result, and
  neither that result, nor an explicit `--stage geometry` or `--stage graybox` run, nor a single
  `stages.graybox` or `stages.geometry` entry lifted out of any result, may be cited as evidence for
  `verified`: a stage-scoped status answers only for the stage that was asked for, and is reported
  beside the other stages without gating on them. A `--stage final` result that is missing,
  unreadable, or incomplete is reported as `unverified`. An `unverified`
  claim may never be reported as verified, exact, identical, 1:1, pixel-perfect, faithful, or
  complete. The claim is independent of requested fidelity, which stays where the user set it.
- Missing companion skills, if any.
- Self-check result and chosen fallbacks.
- Feedback observation ids and local draft paths, when findings were recorded.
- Anti-slop review status, report path, blockers, warnings, and accepted contextual decisions when
  that review ran.
- Whether any remote Issue or PR was published; default is “not published.”
- Remaining risks or explicit validation gaps.

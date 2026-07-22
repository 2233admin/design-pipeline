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
  directions.md
  design.md
  motion.md
  scene.json      # normative contract for persistent spatial or engine-owned runtime state
  scene.md        # human-readable projection of scene.json
  tasks.md
  qa.md
  state.json
  events.jsonl
  handoff.md
```

Use an existing project convention instead if the repo already has `openspec/`, `spec/changes/`, `docs/design/`, `.omx/`, or another active planning directory.

## Website Cloning Module

When the user asks to clone, reproduce, rebuild, reverse-engineer, or use one or more live pages as implementation references:

1. Read `references/website-cloning.md` and `references/website-clone-component-spec.md` completely.
2. Initialize the run with `scripts/init-website-clone.cjs`; pass direct clone targets with `--url` and supporting inspiration/comparison pages with `--reference-url`.
3. Treat `references/website-cloning-manifest.schema.json` as the machine-readable Browser/Builder/Evidence port and fidelity contract.
4. Complete `targets/<target-id>/research/palette-evidence.json` from both DOM/computed-style
   evidence and screenshot/raster-media evidence, then reflect the same roles and values in
   `design-tokens.md`.
5. Run `scripts/check-website-clone-foundations.cjs --change-root <change-root> --json` before
   synthesizing the implementation design or starting BuilderPort work. Project `DESIGN.md`,
   project `MOTION.md`, and every target palette must be `ready`; adaptive mode does not bypass
   this gate.
6. Keep the URL-first user experience, but record each adapter, its available capabilities, and a successful capability probe before claiming exact fidelity.
7. After EvidencePort writes its measured report, run `scripts/evaluate-website-clone.cjs`; this is the only path that may move the manifest to `complete`.
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
Project motion foundation reference: `references/motion-foundation.md`.
Machine-readable motion foundation schema: `references/motion-foundation.schema.json`.
Motion primitive registry: `references/motion-primitives.json`.
Motion spec reference: `references/motion-spec.md`.
Graphics runtime routing reference: `references/graphics-runtime-routing.md`.
Machine-readable graphics runtime catalog: `references/graphics-runtime-catalog.json`.
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
- Use the official `pixijs` router and the matching PixiJS v8 sub-skills only for justified interactive 2D render surfaces such as sprite fields, particles, filters, shaders, canvas editors, or high-object-count scenes. Read `references/pixijs-rendering.md` before selecting it.
- Use the built-in Phaser v4 route for a complete 2D game runtime with scenes, game-loop ownership, input, audio, physics, cameras, scaling, and game-state transitions. Read `references/phaser-v4.md`; do not depend on an unverified community skill pack.
- Use Three.js or React Three Fiber for focused 3D scene rendering; use Babylon.js or PlayCanvas when a fuller 3D engine is justified. Existing project runtimes still win when they meet the capability and budget.
- Use `references/game-ui-and-narrative.md` for HUDs, game menus, dialogue systems, visual novels, and Galgame surfaces. Keep dialogue, choice, backlog, save/load, skip, autoplay, and accessibility state independent of animation timing.
- If no animation or rendering library is already present, prefer semantic DOM plus CSS transitions/keyframes for simple state changes; choose Anime.js, GSAP, PixiJS, Phaser, or a 3D runtime only when the required capability justifies it.
- Do not add overlapping runtimes unless `design.md`, `motion.md`, and when required `scene.md` assign distinct responsibilities. One adapter owns each render loop, clock, property, lifecycle, and cleanup path.
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
- Inspect existing UI patterns before inventing new ones.
- Check whether the project already has source-of-truth design docs or OpenSpec-style folders.
- Identify any graphics or game runtime already present and classify the requested surface through `references/graphics-runtime-catalog.json`. Preserve an accepted existing adapter when it satisfies the capability and budget.
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

## Stage 2: Design Directions

Create `directions.md` before implementation. Produce 2-3 distinct directions when the user has not already chosen a style.

Each direction must include:

- Visual thesis: layout, density, rhythm, typography, color posture.
- Interaction thesis: motion, feedback, empty/loading/error states.
- Fit: why it suits this product and audience.
- Risk: where it may fail or feel wrong.

When anti-template risk matters, use `references/anti-slop-review.md` to compare cohesion,
product-grounded signature, specificity, and template-pattern density. Named colors, fonts,
punctuation, shapes, effects, or common layout families are not automatic rejection criteria.

Default decision rule:

- Product dashboards and operational tools: choose the quietest direction that maximizes scanability and repeated use.
- Marketing pages and portfolios: choose the direction with the strongest first-viewport signal and least generic composition.
- Components and app flows: choose the direction with the clearest states, accessibility, and interaction feedback.

## Stage 3: Design Spec

Create lowercase change `design.md` as the selected source of truth for this change:

- Layout grid and responsive behavior.
- Color tokens and contrast posture. For website references, these must cite the ready
  `palette-evidence.json`, preserve DOM and raster-media sources separately, and record coverage,
  luminance, saturation, and temperature relationships rather than listing accents alone.
- Type scale and font constraints.
- Component inventory and states.
- Motion rules and reduced-motion fallback.
- Accessibility requirements: semantic structure, focus order, keyboard behavior, labels, announcements, contrast.
- Asset strategy: real assets, generated bitmap images, icons, or no-assets justification.
- Anti-template decisions when the contextual anti-slop review is active: deliberately avoided
  patterns, retained common patterns, product-specific rationale, and non-applicable rules.

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

Create normative `scene.json` plus its `scene.md` projection using
`references/scene-runtime-spec.md` when the change has persistent spatial
state or an engine-owned lifecycle: Canvas/WebGL/WebGPU scenes, cameras, coordinate transforms,
asset manifests, render or game loops, physics, world input, procedural state, save/load state, or
runtime-specific degradation. The pair binds design and motion semantics to a selected adapter; it
does not replace `design.md` or `motion.md`.

Phaser, PixiJS, Three.js, React Three Fiber, Babylon.js, PlayCanvas, CesiumJS, WebGPU/WGSL, and
equivalent scene runtimes require both files. A narrative UI without a scene renderer may remain
DOM-first, but still requires both when it owns dialogue state, save/load, backlog, autoplay,
or another persistent game-state lifecycle.

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

- For website-cloning changes, run `scripts/check-website-clone-foundations.cjs --change-root
  <change-root> --json` first and stop unless it reports `ready`.
- Re-run `scripts/check-design-foundation.cjs` and stop unless it reports `ready`.
- Re-run `scripts/check-motion-foundation.cjs` and stop unless it reports `ready`.
- Link the validated project `DESIGN.md` from the active lowercase change `design.md`.
- Link the validated project `MOTION.md` and its hash from active lowercase change `motion.md` when
  the change includes non-trivial motion.
- Link `scene.json` and `scene.md` from the active change when a graphics, game, or persistent
  narrative runtime is selected. Run `designer-pipeline scene check` and verify that capability
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
- Engineering gate: existing patterns are respected, no unnecessary dependency or abstraction was added.
- Accessibility gate: keyboard navigation, focus behavior, labels, reduced motion, and contrast are checked.
- Motion gate: interaction feedback is intentional, not decorative, and has reduced-motion fallback.
- Motion foundation gate: project `MOTION.md` is `ready`, its hash is recorded, and selected
  primitive IDs exist in the bundled registry.
- Motion spec gate: `motion.md` exists for any non-trivial motion and includes trigger, purpose, timing, easing, choreography, interruption behavior, implementation library, performance budget, and reduced-motion fallback.
- Scene/runtime gate: `scene.json` and matching `scene.md` exist for every persistent spatial,
  game-engine, GPU, or stateful narrative surface and record the capability family, adapter,
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
- Missing companion skills, if any.
- Self-check result and chosen fallbacks.
- Feedback observation ids and local draft paths, when findings were recorded.
- Anti-slop review status, report path, blockers, warnings, and accepted contextual decisions when
  that review ran.
- Whether any remote Issue or PR was published; default is “not published.”
- Remaining risks or explicit validation gaps.

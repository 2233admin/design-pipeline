---
name: design-pipeline
description: OpenSpec-style design development pipeline for visual direction, UX research, website cloning and reverse-engineering, interaction polish, frontend implementation, and evidence-backed QA. Use for product UI, marketing pages, dashboards, live-page references, pixel-accurate rebuilds, design reviews, and frontend work that must avoid generic AI-looking output.
---

# Frontend Design Pipeline

Use this skill when the user wants UI/frontend work to be driven by a repeatable design pipeline, especially when they mention OpenSpec, design skills, frontend polish, visual taste, design review, product UI, marketing pages, dashboards, or "make it not AI-looking".

This skill does not replace individual design skills. It orchestrates them into a durable workflow with repo artifacts, implementation gates, and verification evidence.

Design is the product boundary. Engineering, OpenSpec, GBrain, Matt Pocock, Vercel, GSAP, and Anime.js integrations are support systems for producing, implementing, and validating better design outcomes. Do not let this pipeline drift into a general-purpose development framework.

## Project DESIGN.md Invariant

Every target project must have one reusable project `DESIGN.md` before implementation begins.
This is a system invariant, not an optional input:

- if it exists, validate it with `scripts/check-design-foundation.cjs`;
- if it is missing, route through requirements-driven synthesis;
- if it is incomplete, repair or resynthesize it;
- never substitute change-level lowercase `design.md`, a template copy, or a token dump.

Planning may begin in order to produce the foundation. Stage 5 implementation may not begin until
the foundation checker reports `ready`.

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
  tasks.md
  qa.md
```

Use an existing project convention instead if the repo already has `openspec/`, `spec/changes/`, `docs/design/`, `.omx/`, or another active planning directory.

## Website Cloning Module

When the user asks to clone, reproduce, rebuild, reverse-engineer, or use one or more live pages as implementation references:

1. Read `references/website-cloning.md` and `references/website-clone-component-spec.md` completely.
2. Initialize the run with `scripts/init-website-clone.cjs`; pass direct clone targets with `--url` and supporting inspiration/comparison pages with `--reference-url`.
3. Treat `references/website-cloning-manifest.schema.json` as the machine-readable Browser/Builder/Evidence port and fidelity contract.
4. Keep the URL-first user experience, but record each adapter, its available capabilities, and a successful capability probe before claiming exact fidelity.
5. After EvidencePort writes its measured report, run `scripts/evaluate-website-clone.cjs`; this is the only path that may move the manifest to `complete`.
6. If a required port or measurement is missing, keep `blocked`; if complete measurements miss a threshold, use `fidelity-limited`. Never fill missing measurements by visual guesswork.

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
Motion spec reference: `references/motion-spec.md`.
Curation policy reference: `references/curation-policy.md`.

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

Choose companions by capability, not by the presence of a familiar skill name. Read `references/capability-routing.md` when the change crosses evidence capture, design systems, assets, motion runtimes, editable design handoff, or hosted delivery.

For animation implementation, choose library skills by job:

- Use `gsap-core`, `gsap-timeline`, `gsap-scrolltrigger`, `gsap-react`, `gsap-plugins`, `gsap-utils`, `gsap-performance`, and `gsap-frameworks` for advanced choreography, scroll-driven animation, timeline control, React integration, SVG/plugin-heavy work, or when GSAP is already in the project.
- Use `animejs` v4.5 for modular timelines, layout transitions, accessible text splitting, SVG, draggable interactions, scroll observers, WAAPI, deterministic stagger, or adapter-driven targets such as Three.js.
- If no animation library is already present, prefer CSS transitions/keyframes for simple state changes; choose Anime.js or GSAP only when the required capability justifies a runtime.
- Do not add Anime.js and GSAP together unless `design.md` assigns them distinct, non-overlapping responsibilities.
- Treat an installed but stale `animejs` companion as a warning. Use official v4.5 documentation for missing markers and record the fallback in `qa.md`.

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
- Prepare Issue or PR publication requests locally. Remote creation requires explicit authority for
  the exact action and repository, followed by a validated receipt and local reconciliation.
- Initialize or update `state.json`, `events.jsonl`, and `handoff.md` using `references/agent-interface.md`.
- Identify the app framework, styling system, component library, routing, existing design tokens, and test/QA surface.
- Inspect existing UI patterns before inventing new ones.
- Check whether the project already has source-of-truth design docs or OpenSpec-style folders.
- Check for project `DESIGN.md`. If it is missing or materially incompatible with the request, route
  through the requirements-driven synthesis module before implementation.
- Run `node <design-pipeline>/scripts/check-design-foundation.cjs --project-root . --json`.
  Status `synthesis-required` is the mandatory route into synthesis; only `ready` unlocks
  implementation.
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

Default decision rule:

- Product dashboards and operational tools: choose the quietest direction that maximizes scanability and repeated use.
- Marketing pages and portfolios: choose the direction with the strongest first-viewport signal and least generic composition.
- Components and app flows: choose the direction with the clearest states, accessibility, and interaction feedback.

## Stage 3: Design Spec

Create lowercase change `design.md` as the selected source of truth for this change:

- Layout grid and responsive behavior.
- Color tokens and contrast posture.
- Type scale and font constraints.
- Component inventory and states.
- Motion rules and reduced-motion fallback.
- Accessibility requirements: semantic structure, focus order, keyboard behavior, labels, announcements, contrast.
- Asset strategy: real assets, generated bitmap images, icons, or no-assets justification.

When requirements-driven synthesis is active, also write the project `DESIGN.md` according to
`references/design-synthesis.md`. Link it from change `design.md`; do not duplicate the entire file.

Use concrete values when implementation will need them. Avoid vague style words without implementation consequences.

Create `motion.md` when the change includes animation, transitions, gesture feedback, loading motion, scroll-linked motion, route transitions, hover/focus motion, or micro-interactions. Use `references/motion-spec.md`.

`motion.md` is required for:

- GSAP or Anime.js usage.
- React view transitions.
- Scroll-triggered animation.
- Multi-step choreography.
- Motion that affects navigation, focus, loading, data updates, or user confidence.

Simple CSS hover/focus transitions can stay in `design.md`, but still need reduced-motion behavior and QA notes.

## Stage 4: Tasks

Create `tasks.md` with a checkbox list grouped by implementation surface:

- Tokens/theme
- Layout
- Components
- States
- Motion
- Motion spec
- Accessibility
- Responsive QA
- Browser/manual QA

Tasks must be small enough to verify independently. Update checkboxes as implementation proceeds.

## Stage 5: Implementation

Implement directly from `design.md` and `tasks.md`.

Rules:

- Re-run `scripts/check-design-foundation.cjs` and stop unless it reports `ready`.
- Link the validated project `DESIGN.md` from the active lowercase change `design.md`.
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
- Motion spec gate: `motion.md` exists for any non-trivial motion and includes trigger, purpose, timing, easing, choreography, interruption behavior, implementation library, performance budget, and reduced-motion fallback.
- Responsive gate: mobile and desktop layouts have no overlap or clipped text.
- Manual QA gate: browser or matching surface was used to inspect the actual UI.
- Scorecard gate: visual taste, UX clarity, accessibility, responsiveness, motion quality, engineering fit, and performance risk are scored 0-5 with notes.

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
- Whether any remote Issue or PR was published; default is “not published.”
- Remaining risks or explicit validation gaps.

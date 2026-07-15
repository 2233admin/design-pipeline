---
name: design-pipeline
description: OpenSpec-style design development pipeline for visual direction, UX research, website cloning and reverse-engineering, interaction polish, frontend implementation, and evidence-backed QA. Use for product UI, marketing pages, dashboards, live-page references, pixel-accurate rebuilds, design reviews, and frontend work that must avoid generic AI-looking output.
---

# Frontend Design Pipeline

Use this skill when the user wants UI/frontend work to be driven by a repeatable design pipeline, especially when they mention OpenSpec, design skills, frontend polish, visual taste, design review, product UI, marketing pages, dashboards, or "make it not AI-looking".

This skill does not replace individual design skills. It orchestrates them into a durable workflow with repo artifacts, implementation gates, and verification evidence.

Design is the product boundary. Engineering, OpenSpec, GBrain, Matt Pocock, Vercel, GSAP, and Anime.js integrations are support systems for producing, implementing, and validating better design outcomes. Do not let this pipeline drift into a general-purpose development framework.

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
4. Keep the URL-first user experience, but negotiate all three internal ports before claiming exact fidelity.
5. If capture or comparison evidence is incomplete, record `blocked` or `fidelity-limited`; never fill missing measurements by visual guesswork.

The website-cloning module is a design-pipeline superset capability. It adds live evidence capture and convergence gates while preserving all existing accessibility, motion, responsive, engineering, and headless-state requirements.

## Companion Skills

Reference file: `references/companion-skills.md`.
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
- `vercel-react-view-transitions`: React and Next.js view-transition implementation patterns.

For animation implementation, choose library skills by job:

- Use `gsap-core`, `gsap-timeline`, `gsap-scrolltrigger`, `gsap-react`, `gsap-plugins`, `gsap-utils`, `gsap-performance`, and `gsap-frameworks` for advanced choreography, scroll-driven animation, timeline control, React integration, SVG/plugin-heavy work, or when GSAP is already in the project.
- Use `animejs` for lighter DOM/SVG animation, small interactive pieces, simpler timelines, or when the project should avoid GSAP's larger ecosystem.
- If no animation library is already present, prefer CSS transitions/keyframes for simple state changes, Anime.js for lightweight scripted motion, and GSAP for complex timelines or scroll/sequence-heavy experiences.

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
- Treat missing optional/enhancement companion skills as a fallback path, not a blocker. Record missing capabilities in `qa.md`.
- Initialize or update `state.json`, `events.jsonl`, and `handoff.md` using `references/agent-interface.md`.
- Identify the app framework, styling system, component library, routing, existing design tokens, and test/QA surface.
- Inspect existing UI patterns before inventing new ones.
- Check whether the project already has source-of-truth design docs or OpenSpec-style folders.
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

Create `design.md` as the selected source of truth:

- Layout grid and responsive behavior.
- Color tokens and contrast posture.
- Type scale and font constraints.
- Component inventory and states.
- Motion rules and reduced-motion fallback.
- Accessibility requirements: semantic structure, focus order, keyboard behavior, labels, announcements, contrast.
- Asset strategy: real assets, generated bitmap images, icons, or no-assets justification.

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

## Output Contract

Final responses should report:

- Change id and artifact folder.
- Implemented surfaces.
- Verification evidence.
- Missing companion skills, if any.
- Self-check result and chosen fallbacks.
- Remaining risks or explicit validation gaps.

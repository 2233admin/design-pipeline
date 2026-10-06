# Companion Design Skills

This pipeline is designed to coordinate the following frontend design skills. Use `capability-routing.md` for cross-group selection and version-sensitive runtime routing. The machine-readable source of truth for install groups and capability checks is `companion-capabilities.json`.

Start with the corresponding bundled guide or selected local source. An external companion can
provide extra detail; it is not required merely because its name appears below. Existing local
coverage is reachable here:

| Need | Bundled starting point |
| --- | --- |
| Drawing, text fitting, image placement and visual diagnostics | `tools/README.md`; callable helpers and existing CLI commands |
| Motion intent, poses, timing/spacing and review | `animation-thinking.md`, `animation-opportunity-and-review.md` |
| GSAP and Anime.js implementation | `capability-routing.md`; local iart playbook and maintained Anime.js path |
| PixiJS, Phaser and graphics/runtime selection | `pixijs-rendering.md`, `phaser-v4.md`, `graphics-runtime-routing.md` |
| Layout, typography, color, interaction and design systems | `interface-discipline.md`, `impeccable-contract.md`, `prism-system.md` |
| Additional drawing, material and animation techniques | `huashu-art-motion.md`, `mengto-skills.md`, `iart-motion-skills.md`; adapt the selected source |

The last row exposes source methods, not a claim that every recipe is a tested callable helper.

For the full Impeccable product-design surface, read `impeccable-product-design.md` and use
`impeccable-product-design.json` as the coverage authority. The upstream command surface is fully
mapped to product truth, surface shaping, design authority, experience quality, and implementation
evidence; its visual skin is intentionally not imported.

## Built-In Interface Discipline

The following source suite is vendored in every package release, so it is not a companion install
requirement and does not appear in `companion-capabilities.json`. Read
`references/interface-discipline.md` for the pipeline protocol and its pinned-source manifest.

The core pipeline also bundles the complete pinned `MengTo/skills` library. Search it through
`designer-pipeline mengto search`, then apply `references/mengto-skills.md`; it is built-in source,
not an optional ambient companion.

The core pipeline also bundles the reviewed MIT `dimabraven/design-md` examples. Search them
through `designer-pipeline designmd search` without a directory catalog, then apply
`references/design-md.md`. They are inspiration-only and never a product `DESIGN.md`.

The core pipeline also bundles licensed `iart-ai` motion-skill packs. Route them through
`designer-pipeline iart route` before implementing, then apply `references/iart-motion-skills.md`.
A domain brief is enough; HTML video still uses HyperFrames as the runtime unless Remotion, Manim,
or After Effects was named.

## Built-In shadcnio Component Index

`references/shadcnio-react-components.md` exposes 75 AI, button, hook, and text entries from the
complete reviewed `shadcnio/react-shadcn-components` repository through
`designer-pipeline shadcnio search`. The source repository contains only its MIT LICENSE and README
index, not the linked webpage implementations; every result remains a review-only reference
adaptation until source-license, dependency, and project-fit evidence is recorded.

## Built-In Holosticker Implementation

`references/holosticker.md` exposes eight separately adoptable slices from the complete pinned,
MIT-licensed `jal-co/holosticker` source through `designer-pipeline holosticker inspect`. Use it only
for explicit holographic sticker, holofoil, die-cut, tilt, peel, or export behavior. It reuses the
pipeline's existing Three.js route and does not make the upstream Studio UI, analytics, fonts,
shadcn controls, or `gifenc` automatic project dependencies.

| Skill | Source | Pipeline role |
| --- | --- | --- |
| `better-interface` | `jakubkrehel/skills` | Default full/quick review orchestration across all quality domains |
| `better-accessibility` | `jakubkrehel/skills` | Semantics, input, keyboard, focus, zoom, motion, and screen-reader checks |
| `better-layout` | `jakubkrehel/skills` | Grouping, alignment, spacing, density, and adaptivity |
| `better-typography` | `jakubkrehel/skills` | Type choice, sizing, wrapping, reading details, and font features |
| `better-colors` | `jakubkrehel/skills` | Palette, contrast, gamut, conversion, and token usage |
| `better-ui` | `jakubkrehel/skills` | Surfaces, icons, motion, and UI performance |
| `better-writing` | `jakubkrehel/skills` | Product copy quality |
| `interface-review` | `jakubkrehel/skills` | Diff scope and `Introduced` / `Regression` / `Pre-existing` UI findings |

## Primary Set

| Skill | Source | Pipeline role |
| --- | --- | --- |
| `impeccable` | `pbakaus/impeccable` | Surface modes, shape/critique/audit/polish vocabulary, anti-default craft floor, bounded browser iteration, and deterministic design detection |
| `frontend-design` | `anthropics/skills` | Strong visual direction, composition, non-generic first impression |
| `web-design-guidelines` | `vercel-labs/agent-skills` | Production web UI rules, responsive layout, accessibility |
| `ui-ux-pro-max` | `nextlevelbuilder/ui-ux-pro-max-skill` | UX heuristics, searchable style/color/type system, repeatable choices |
| `design-taste-frontend` | `Leonxlnx/taste-skill` | Anti-template design discipline, typography and copy taste |
| `emil-design-eng` | `emilkowalski/skills` | Motion, easing, feedback, interaction polish |

## Motion / Animation Set

Use these skills with `references/motion-spec.md`. The document is required for non-trivial motion even when companion skills are missing.

| Skill | Source | Pipeline role |
| --- | --- | --- |
| `design-motion-principles` | `kylezantos/design-motion-principles` (was design-engineer-auditor-package) | Dedicated motion create/audit workflow for UI animation, micro-interactions, Framer Motion, CSS, and app transitions |
| `emil-design-eng` | `emilkowalski/skills` | Design-engineering motion judgment, UI polish, component feel |
| `animation-vocabulary` | `emilkowalski/skills` | Converts vague motion direction into precise animation language |
| `review-animations` | `emilkowalski/skills` | Strict animation quality review with production standards |
| `apple-design` | `emilkowalski/skills` | Apple HIG-inspired interface principles and fluid motion for web, from WWDC talks |
| `vercel-react-view-transitions` | `vercel-labs/agent-skills` | React and Next.js view transition patterns |

## Poster / Still-image Motion Set

| Skill | Source | Pipeline role |
| --- | --- | --- |
| `gc-minimal-zine-poster-v0-3` | `LiamGvchi/gc-minimal-zine-poster` | Minimal zine poster generation, reference analysis, and prompt synthesis |
| `gc-still-image-motion-director` | `LiamGvchi/gc-still-image-motion-director` | Still-image motion decision and image-to-video prompt generation constraints |

## Animation Library Implementation Set

| Skill | Source | Pipeline role |
| --- | --- | --- |
| `gsap-core` | `greensock/gsap-skills` | GSAP core tweens, defaults, easing, stagger, callbacks |
| `gsap-timeline` | `greensock/gsap-skills` | Sequenced choreography, timeline labels, nesting, playback |
| `gsap-scrolltrigger` | `greensock/gsap-skills` | Scroll-linked animation, pinning, scrub, snap, refresh handling |
| `gsap-react` | `greensock/gsap-skills` | React integration with `@gsap/react`, cleanup, refs, context |
| `gsap-plugins` | `greensock/gsap-skills` | GSAP plugin selection and plugin-specific animation patterns |
| `gsap-utils` | `greensock/gsap-skills` | Utility helpers, mapping, interpolation, randomization, selectors |
| `gsap-performance` | `greensock/gsap-skills` | GSAP animation performance and production safety |
| `gsap-frameworks` | `greensock/gsap-skills` | Framework-specific GSAP usage beyond plain JS |
| `animejs` | `BowTiedSwan/animejs-skills` + official Anime.js docs | Anime.js v4.5 modules: timelines, layout, text, SVG, draggable, scroll, WAAPI, adapters/Three.js, deterministic 3D stagger |
| `pixijs` + official sub-skills | `pixijs/pixijs-skills` | PixiJS v8 router for Application, scene graph, assets, events, ticker, particles, filters/shaders, performance, environments, and accessibility |

Anime.js is version-sensitive. Use the built-in implementation path in `capability-routing.md`.
If a companion is present, `check-deps.cjs` reports its marker coverage independently; local guidance
does not change a stale companion into a current one.

PixiJS is a specialized 2D renderer, not a default replacement for CSS, Anime.js, or GSAP. Read
`references/pixijs-rendering.md` before choosing it. The production capability profile checks the
official router plus Application lifecycle, accessibility, performance, ticker, and environment
coverage; scene, asset, event, filter, shader, and display-object skills are loaded on demand.

Phaser v4 is supported through the built-in `references/phaser-v4.md` route rather than a required
companion. The official Phaser Game Agent MCP is credentialed and metered, while the reviewed
community Phaser pack has no verified repository license; neither is an automatic install path.
Use `references/graphics-runtime-routing.md` for other 2D, 3D, data, geospatial, GPU, and narrative
adapters.

GSAP, PixiJS, Next.js, visual-direction, motion-review, and gstack-style feedback suites also have bounded capability profiles. A suite can report `WARN` when only part of it is installed or when an installed skill no longer advertises a required capability.

## Vercel / Next.js Engineering Set

| Skill | Source | Pipeline role |
| --- | --- | --- |
| `vercel-react-best-practices` | `vercel-labs/agent-skills` | React and Next.js performance patterns, bundle size, waterfalls, rendering |
| `web-design-guidelines` | `vercel-labs/agent-skills` | Web interface guidelines, accessibility, UX, production UI review |
| `vercel-composition-patterns` | `vercel-labs/agent-skills` | Scalable React component composition and API design |
| `vercel-react-view-transitions` | `vercel-labs/agent-skills` | React view transitions and navigation motion patterns |
| `next-cache-components-adoption` | `vercel/next.js` | Adopt Next.js Cache Components and PPR patterns |
| `next-cache-components-optimizer` | `vercel/next.js` | Optimize existing Cache Components and caching boundaries |
| `next-dev-loop` | `vercel/next.js` | Next.js development loop guidance |

Note: `next-best-practices` is no longer distributed by Vercel as a standalone skill. The old `vercel-labs/next-skills` repository now points users to `vercel/next.js/tree/canary/skills`; Next.js best-practice knowledge is delivered through bundled docs and generated `AGENTS.md` / `CLAUDE.md` for Next.js 16.3+.

## Install Priority

1. `impeccable`
2. `web-design-guidelines`
3. `frontend-design`
4. `design-taste-frontend`
5. `ui-ux-pro-max`
6. `emil-design-eng`
7. `apple-design` — when the surface should feel Apple-like or use fluid system UI motion

## Taste-Skill Extension Set

| Skill | Source | Pipeline role |
| --- | --- | --- |
| `design-taste-frontend` | `Leonxlnx/taste-skill` | Main v2 frontend taste skill |
| `design-taste-frontend-v1` | `Leonxlnx/taste-skill` | Older v1 taste behavior for compatibility |
| `gpt-taste` | `Leonxlnx/taste-skill` | General taste critique and output shaping |
| `minimalist-ui` | `Leonxlnx/taste-skill` | Minimalist visual direction |
| `industrial-brutalist-ui` | `Leonxlnx/taste-skill` | Brutalist / industrial UI direction |
| `high-end-visual-design` | `Leonxlnx/taste-skill` | High-end soft visual polish |
| `stitch-design-taste` | `Leonxlnx/taste-skill` | Stitch-style design taste guidance |
| `redesign-existing-projects` | `Leonxlnx/taste-skill` | Redesign existing projects without losing product intent |
| `image-to-code` | `Leonxlnx/taste-skill` | Convert visual references into frontend implementation guidance |
| `imagegen-frontend-web` | `Leonxlnx/taste-skill` | Generate web frontend visual references |
| `imagegen-frontend-mobile` | `Leonxlnx/taste-skill` | Generate mobile frontend visual references |
| `brandkit` | `Leonxlnx/taste-skill` | Brand kit direction and consistency |
| `full-output-enforcement` | `Leonxlnx/taste-skill` | Enforce complete output expectations |

## UI/UX Pro Max Extension Set

| Skill | Source | Pipeline role |
| --- | --- | --- |
| `ui-ux-pro-max` | `nextlevelbuilder/ui-ux-pro-max-skill` | Main UX, style, color, typography, and product design system guidance |
| `ui-ux-design` | `nextlevelbuilder/ui-ux-pro-max-skill` | Comprehensive design asset and presentation workflow, renamed locally to avoid conflict with OMX `design` |
| `ui-styling` | `nextlevelbuilder/ui-ux-pro-max-skill` | Visual styling, fonts, high-fidelity UI appearance |
| `design-system` | `nextlevelbuilder/ui-ux-pro-max-skill` | Token architecture, component tokens, state variants, Tailwind integration |
| `brand` | `nextlevelbuilder/ui-ux-pro-max-skill` | Brand guidelines, assets, messaging, color, typography |
| `banner-design` | `nextlevelbuilder/ui-ux-pro-max-skill` | Banner and ad layout design |
| `slides` | `nextlevelbuilder/ui-ux-pro-max-skill` | Presentation and slide design |

## Development Compatibility Set

| Surface | Source | Pipeline role |
| --- | --- | --- |
| OpenSpec / OpenSpece | repo-local convention or external CLI | Proposal, design, tasks, spec deltas, archive lifecycle |
| GBrain | GStack/GBrain local integration | Long-lived design memory and decision sync |
| `codebase-design` | `mattpocock/skills` | Architecture and codebase shape review before implementation |
| `grill-with-docs` | `mattpocock/skills` | Plan challenge against docs and requirements |
| `implement` | `mattpocock/skills` | Implementation execution surface |
| `matt-tdd` | `mattpocock/skills` | Matt TDD workflow, renamed to avoid conflict |
| `matt-code-review` | `mattpocock/skills` | Matt code review workflow, renamed to avoid conflict |
| `design-an-interface` | `mattpocock/skills` | Interface ideation |
| `domain-modeling` | `mattpocock/skills` | Domain language and workflow model clarity |
| `to-prd` | `mattpocock/skills` | Convert intent into PRD artifacts |
| `to-issues` | `mattpocock/skills` | Convert intent into issue artifacts |

## Feedback And Contribution Set

| Skill | Source | Pipeline role |
| --- | --- | --- |
| `gstack-learn` | gstack | Durable cross-session learnings |
| `gstack-spec` | gstack | Backlog-ready Issue/spec shaping |
| `gstack-review` | gstack | Independent diff and risk review |
| `gstack-ship` | gstack | Explicitly authorized PR/ship workflow |

The pipeline does not require gstack. When it is absent, use `record-feedback.cjs`, OpenSpec artifacts, repository review, and the host's authorized GitHub surface.

## Video / HTML composition Set

| Skill | Source | Pipeline role |
| --- | --- | --- |
| `hyperframes` | `heygen-com/hyperframes` | HTML composition authoring, deterministic timing, workflow routing, and production handoff |
| `hyperframes-cli` | `heygen-com/hyperframes` | Init, lint, check, snapshot, preview, render, and diagnostics |
| `hyperframes-animation` | `heygen-com/hyperframes` | Seek-safe motion rules, transitions, and runtime adapters |
| `hyperframes-core` | `heygen-com/hyperframes` | DOM timing attributes, tracks, sub-compositions, media, and determinism |

The bundled reference is a clean-room route summary, not a redistribution of the upstream skill
tree. Read `references/hyperframes.md` first and keep the project's existing MOTION.md and evidence
gates authoritative for product motion and QA.

## Optional Later

| Skill | Source | Use when |
| --- | --- | --- |
| `frontend-design-landing-page` | `cloudflare/vibesdk` | Conversion-focused landing pages |
| `frontend-design-saas` | `cloudflare/vibesdk` | SaaS dashboards and product UI references |
| `extract-design-system` | `arvindrk/extract-design-system` | Reverse-engineering an existing page or screenshot into tokens |
| `design-an-interface` | `mattpocock/skills` | Interface ideation workflow |
| `sleek-design-mobile-apps` | `sleekdotdesign/agent-skills` | Mobile app UI work |
| `impeccable` | `pbakaus/impeccable` | Upstream command surface and design detector; the built-in contract remains the fallback |

Installation state is machine-specific: obtain it from `check-deps.cjs --json` when needed.
Do not write a workstation's Installed/Not installed result into this shipped reference.
The roles above are optional companions; bundled routes remain available independently.

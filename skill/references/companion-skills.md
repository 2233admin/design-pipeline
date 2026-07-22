# Companion Design Skills

This pipeline is designed to coordinate the following frontend design skills. Use `capability-routing.md` for cross-group selection and version-sensitive runtime routing. The machine-readable source of truth for install groups and capability checks is `companion-capabilities.json`.

## Primary Set

| Skill | Source | Pipeline role | Current local status |
| --- | --- | --- | --- |
| `frontend-design` | `anthropics/skills` | Strong visual direction, composition, non-generic first impression | Installed |
| `web-design-guidelines` | `vercel-labs/agent-skills` | Production web UI rules, responsive layout, accessibility | Installed |
| `ui-ux-pro-max` | `nextlevelbuilder/ui-ux-pro-max-skill` | UX heuristics, searchable style/color/type system, repeatable choices | Installed |
| `design-taste-frontend` | `Leonxlnx/taste-skill` | Anti-template design discipline, typography and copy taste | Installed |
| `emil-design-eng` | `emilkowalski/skills` | Motion, easing, feedback, interaction polish | Installed |

## Motion / Animation Set

Use these skills with `references/motion-spec.md`. The document is required for non-trivial motion even when companion skills are missing.

| Skill | Source | Pipeline role | Current local status |
| --- | --- | --- | --- |
| `design-motion-principles` | `kylezantos/design-motion-principles` (was design-engineer-auditor-package) | Dedicated motion create/audit workflow for UI animation, micro-interactions, Framer Motion, CSS, and app transitions | Installed |
| `emil-design-eng` | `emilkowalski/skills` | Design-engineering motion judgment, UI polish, component feel | Installed |
| `animation-vocabulary` | `emilkowalski/skills` | Converts vague motion direction into precise animation language | Installed |
| `review-animations` | `emilkowalski/skills` | Strict animation quality review with production standards | Installed |
| `apple-design` | `emilkowalski/skills` | Apple HIG-inspired interface principles and fluid motion for web, from WWDC talks | Installed |
| `vercel-react-view-transitions` | `vercel-labs/agent-skills` | React and Next.js view transition patterns | Installed |

## Animation Library Implementation Set

| Skill | Source | Pipeline role | Current local status |
| --- | --- | --- | --- |
| `gsap-core` | `greensock/gsap-skills` | GSAP core tweens, defaults, easing, stagger, callbacks | Installed |
| `gsap-timeline` | `greensock/gsap-skills` | Sequenced choreography, timeline labels, nesting, playback | Installed |
| `gsap-scrolltrigger` | `greensock/gsap-skills` | Scroll-linked animation, pinning, scrub, snap, refresh handling | Installed |
| `gsap-react` | `greensock/gsap-skills` | React integration with `@gsap/react`, cleanup, refs, context | Installed |
| `gsap-plugins` | `greensock/gsap-skills` | GSAP plugin selection and plugin-specific animation patterns | Installed |
| `gsap-utils` | `greensock/gsap-skills` | Utility helpers, mapping, interpolation, randomization, selectors | Installed |
| `gsap-performance` | `greensock/gsap-skills` | GSAP animation performance and production safety | Installed |
| `gsap-frameworks` | `greensock/gsap-skills` | Framework-specific GSAP usage beyond plain JS | Installed |
| `animejs` | `BowTiedSwan/animejs-skills` + official Anime.js docs | Anime.js v4.5 modules: timelines, layout, text, SVG, draggable, scroll, WAAPI, adapters/Three.js, deterministic 3D stagger | Installed; capability profile may warn when stale |
| `pixijs` + official sub-skills | `pixijs/pixijs-skills` | PixiJS v8 router for Application, scene graph, assets, events, ticker, particles, filters/shaders, performance, environments, and accessibility | Optional; suite capability profile detects missing or partial coverage |

Anime.js is version-sensitive. A present skill directory is not enough to prove v4.5 coverage; run `check-deps.cjs` and follow `capability-routing.md` when the profile reports missing markers.

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

| Skill | Source | Pipeline role | Current local status |
| --- | --- | --- | --- |
| `vercel-react-best-practices` | `vercel-labs/agent-skills` | React and Next.js performance patterns, bundle size, waterfalls, rendering | Installed |
| `web-design-guidelines` | `vercel-labs/agent-skills` | Web interface guidelines, accessibility, UX, production UI review | Installed |
| `vercel-composition-patterns` | `vercel-labs/agent-skills` | Scalable React component composition and API design | Installed |
| `vercel-react-view-transitions` | `vercel-labs/agent-skills` | React view transitions and navigation motion patterns | Installed |
| `next-cache-components-adoption` | `vercel/next.js` | Adopt Next.js Cache Components and PPR patterns | Installed |
| `next-cache-components-optimizer` | `vercel/next.js` | Optimize existing Cache Components and caching boundaries | Installed |
| `next-dev-loop` | `vercel/next.js` | Next.js development loop guidance | Installed |

Note: `next-best-practices` is no longer distributed by Vercel as a standalone skill. The old `vercel-labs/next-skills` repository now points users to `vercel/next.js/tree/canary/skills`; Next.js best-practice knowledge is delivered through bundled docs and generated `AGENTS.md` / `CLAUDE.md` for Next.js 16.3+.

## Install Priority

1. `web-design-guidelines`
2. `frontend-design`
3. `design-taste-frontend`
4. `ui-ux-pro-max`
5. `emil-design-eng`
6. `apple-design` — when the surface should feel Apple-like or use fluid system UI motion

## Taste-Skill Extension Set

| Skill | Source | Pipeline role | Current local status |
| --- | --- | --- | --- |
| `design-taste-frontend` | `Leonxlnx/taste-skill` | Main v2 frontend taste skill | Installed |
| `design-taste-frontend-v1` | `Leonxlnx/taste-skill` | Older v1 taste behavior for compatibility | Installed |
| `gpt-taste` | `Leonxlnx/taste-skill` | General taste critique and output shaping | Installed |
| `minimalist-ui` | `Leonxlnx/taste-skill` | Minimalist visual direction | Installed |
| `industrial-brutalist-ui` | `Leonxlnx/taste-skill` | Brutalist / industrial UI direction | Installed |
| `high-end-visual-design` | `Leonxlnx/taste-skill` | High-end soft visual polish | Installed |
| `stitch-design-taste` | `Leonxlnx/taste-skill` | Stitch-style design taste guidance | Installed |
| `redesign-existing-projects` | `Leonxlnx/taste-skill` | Redesign existing projects without losing product intent | Installed |
| `image-to-code` | `Leonxlnx/taste-skill` | Convert visual references into frontend implementation guidance | Installed |
| `imagegen-frontend-web` | `Leonxlnx/taste-skill` | Generate web frontend visual references | Installed |
| `imagegen-frontend-mobile` | `Leonxlnx/taste-skill` | Generate mobile frontend visual references | Installed |
| `brandkit` | `Leonxlnx/taste-skill` | Brand kit direction and consistency | Installed |
| `full-output-enforcement` | `Leonxlnx/taste-skill` | Enforce complete output expectations | Installed |

## UI/UX Pro Max Extension Set

| Skill | Source | Pipeline role | Current local status |
| --- | --- | --- | --- |
| `ui-ux-pro-max` | `nextlevelbuilder/ui-ux-pro-max-skill` | Main UX, style, color, typography, and product design system guidance | Installed |
| `ui-ux-design` | `nextlevelbuilder/ui-ux-pro-max-skill` | Comprehensive design asset and presentation workflow, renamed locally to avoid conflict with OMX `design` | Installed |
| `ui-styling` | `nextlevelbuilder/ui-ux-pro-max-skill` | Visual styling, fonts, high-fidelity UI appearance | Installed |
| `design-system` | `nextlevelbuilder/ui-ux-pro-max-skill` | Token architecture, component tokens, state variants, Tailwind integration | Installed |
| `brand` | `nextlevelbuilder/ui-ux-pro-max-skill` | Brand guidelines, assets, messaging, color, typography | Installed |
| `banner-design` | `nextlevelbuilder/ui-ux-pro-max-skill` | Banner and ad layout design | Installed |
| `slides` | `nextlevelbuilder/ui-ux-pro-max-skill` | Presentation and slide design | Installed |

## Development Compatibility Set

| Surface | Source | Pipeline role | Current local status |
| --- | --- | --- | --- |
| OpenSpec / OpenSpece | repo-local convention or external CLI | Proposal, design, tasks, spec deltas, archive lifecycle | No active global skill found; supported by artifact mapping |
| GBrain | GStack/GBrain local integration | Long-lived design memory and decision sync | Archived/disabled GBrain tooling found; supported when repo enables it |
| `codebase-design` | `mattpocock/skills` | Architecture and codebase shape review before implementation | Installed |
| `grill-with-docs` | `mattpocock/skills` | Plan challenge against docs and requirements | Installed |
| `implement` | `mattpocock/skills` | Implementation execution surface | Installed |
| `matt-tdd` | `mattpocock/skills` | Matt TDD workflow, renamed to avoid conflict | Installed |
| `matt-code-review` | `mattpocock/skills` | Matt code review workflow, renamed to avoid conflict | Installed |
| `design-an-interface` | `mattpocock/skills` | Interface ideation | Installed |
| `domain-modeling` | `mattpocock/skills` | Domain language and workflow model clarity | Installed |
| `to-prd` | `mattpocock/skills` | Convert intent into PRD artifacts | Installed |
| `to-issues` | `mattpocock/skills` | Convert intent into issue artifacts | Installed |

## Feedback And Contribution Set

| Skill | Source | Pipeline role | Current local status |
| --- | --- | --- | --- |
| `gstack-learn` | gstack | Durable cross-session learnings | Optional |
| `gstack-spec` | gstack | Backlog-ready Issue/spec shaping | Optional |
| `gstack-review` | gstack | Independent diff and risk review | Optional |
| `gstack-ship` | gstack | Explicitly authorized PR/ship workflow | Optional |

The pipeline does not require gstack. When it is absent, use `record-feedback.cjs`, OpenSpec artifacts, repository review, and the host's authorized GitHub surface.

## Optional Later

| Skill | Source | Use when |
| --- | --- | --- |
| `frontend-design-landing-page` | `cloudflare/vibesdk` | Conversion-focused landing pages |
| `frontend-design-saas` | `cloudflare/vibesdk` | SaaS dashboards and product UI references |
| `extract-design-system` | `arvindrk/extract-design-system` | Reverse-engineering an existing page or screenshot into tokens |
| `design-an-interface` | `mattpocock/skills` | Interface ideation workflow |
| `sleek-design-mobile-apps` | `sleekdotdesign/agent-skills` | Mobile app UI work |
| `impeccable-design-polish` | `pbakaus/impeccable` | Final polish pass on existing pages |

Update `Current local status` after installing companion skills.

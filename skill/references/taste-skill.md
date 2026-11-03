# Built-in Taste skill

Use this guide for new website design, existing-site redesign or restyle, app screens
(dashboards, admin, settings, inboxes) and visual critique of a rendered page. It routes the
request to the matching part of the one packaged upstream skill, `design-taste-frontend`
(tasteskill v2), and says how its run, house rules and scripts fit the pipeline. Read the
**complete local [`UPSTREAM-SKILL.md`](../vendor/taste-skill/upstream/skills/taste-skill/UPSTREAM-SKILL.md)**
first, then the reference file the route names. No ambient Taste installation or network access
is needed to read and apply it.

The complete reviewed [Leonxlnx/taste-skill source](../vendor/taste-skill/upstream/README.md) is
pinned at `12af471f627f866411b4bd785b19646d3672784c` (v2.1.5, 2026-10-25), reviewed on 2026-11-03:
72 tracked files, 3,093,372 bytes and one skill. The Git tree is
`db698c9093437ee7daea871f70b48d06a838038e`; the canonical tree SHA-256 is
`e12cc2e63faba012ac716039de7cdd26da29cf1b2b48e065eca81aec910fc91e`.
Read [manifest.json](../vendor/taste-skill/manifest.json) for the complete blob inventory and
identity. The [MIT license](../vendor/taste-skill/upstream/LICENSE) retains copyright 2026
Leonxlnx. Preserve the notice when redistributing substantial source.

Since upstream 2.1.3 the repository is one skill; the [changelog](../vendor/taste-skill/upstream/CHANGELOG.md)
records the move. The redesign route is part of `design-taste-frontend`. The classic styles and the
image-generation skills moved to other repositories and are not packaged here; see
[Methods that left this bundle](#methods-that-left-this-bundle).

## Choose the route

| Request | Route | Read next | Output boundary |
| --- | --- | --- | --- |
| New landing page, marketing or product site, portfolio, event, one-pager | [New site](#new-site) | `UPSTREAM-SKILL.md` "The run" | Implemented web page in the project's stack. |
| Restyle, redesign or review of an existing page | [Redesign](#redesign) | `UPSTREAM-SKILL.md` "Special cases" | Before/after evidence; current stack, content and behaviour kept. |
| Dashboard, admin, analytics, settings, billing, inbox, editor or builder | [App screens](#app-screens) | [app-screens.md](../vendor/taste-skill/upstream/skills/taste-skill/references/app-screens.md) | Implemented screen; the page run does not apply. |
| Judge a rendered page or app screen | [Critique](#critique) | [critique.md](../vendor/taste-skill/upstream/skills/taste-skill/references/critique.md) | Written critique and ranked fixes; no approval. |

A product site that shows its app is a page; the interface fragments on it follow the app-screen
rules for their insides. A request that mixes both builds each with its own route and one shared
palette and type. A single component or section follows the house rules and laws without a draw.

## Project authority and adaptations

1. **Read the project first.** Use [Stage 0](stages.md#stage-0-repo-read), the existing framework,
   shared components, token owners, routes and test surface. User instructions, supplied references,
   project `DESIGN.md`/`MOTION.md`, [brand facts](brand-facts.md), accessibility, localization and
   browser targets govern the work. Apply [interface discipline](interface-discipline.md) and
   [Good CSS](good-css.md) alongside it.
2. **Directions stay with the direction stage.** When a direction is open, the
   [three-source preview](direction-preview.md#directions-from-three-sources) decides it; a Taste
   draw is not an extra card. Upstream's inventory, argument, idea sentence and copy deck
   (`UPSTREAM-SKILL.md` steps 1, 2, 4 and 5) feed `directions.md` and the change `design.md`.
3. **House rules are upstream house style.** No eyebrows, no monospace labels, no index numbering,
   no hairlines, no gradients, no resting shadows, no violet or cream-and-terracotta palette, two
   typefaces at most: these are the skill owner's taste, and `UPSTREAM-SKILL.md` says several of them
   go against gallery fashion. Apply them when this route is selected and they do not conflict with
   the project. A brand device, an approved design system, real code, tables, form fields and
   locale typography (CJK, quoted text, mathematical signs) win; record each exception in
   `design.md`. [Anti-slop review](anti-slop-review.md) judges product-specific cohesion; a single
   font, colour or punctuation character is not a gate failure.
4. **Keep the stack.** Use the project's installed framework and styling method; check the
   dependency file before an import, and do not migrate frameworks or styling libraries. The scroll
   scenes in `assets/scenes/` load GSAP ScrollTrigger and optional Lenis; adopt them only through
   [motion-spec.md](motion-spec.md) with an approved dependency, one owner per animated property,
   cleanup and a reduced-motion composition. `assets/base.css`, `app.css` and `charts.js` are optional
   starting points, not tokens that replace the project's.
5. **Real assets and facts.** User images and approved product assets come first. Found pictures
   keep their own licences and credits and are never presented as the client's own product, room,
   person or work. Sample content is labelled for the owner to confirm; customers, quotes, reviews,
   logos and business figures are never invented. Fonts named by a draw must be checked for
   licence and glyph coverage through [font selection](../tools/fonts.md) and
   [cjk-typography.md](cjk-typography.md).

## Routes

### New site

**Trigger:** a new landing page, marketing or product site, portfolio, event or restaurant page,
one-pager or hero. Read the complete `UPSTREAM-SKILL.md` "The run" (steps 1-10), its house rules and
laws, then [copy.md](../vendor/taste-skill/upstream/skills/taste-skill/references/copy.md),
[layout.md](../vendor/taste-skill/upstream/skills/taste-skill/references/layout.md),
[type.md](../vendor/taste-skill/upstream/skills/taste-skill/references/type.md),
[colour.md](../vendor/taste-skill/upstream/skills/taste-skill/references/colour.md),
[imagery.md](../vendor/taste-skill/upstream/skills/taste-skill/references/imagery.md) and
[motion.md](../vendor/taste-skill/upstream/skills/taste-skill/references/motion.md) when a decision
needs them; [scenes.md](../vendor/taste-skill/upstream/skills/taste-skill/references/scenes.md) only
when scroll scenes are adopted. [tells.md](../vendor/taste-skill/upstream/skills/taste-skill/references/tells.md)
is the dated registry of generated-page tells; [research.md](../vendor/taste-skill/upstream/skills/taste-skill/references/research.md)
holds the study's numbers.

**Output and stage checks:** Stage 0 records the stack and real assets; Stage 2 records the
direction, idea sentence and the one live thing; Stage 3 records the argument, copy deck, tokens and
adapted or excluded house rules; Stage 4/5 implements in the existing stack. Stage 6 checks
responsive layout at real widths, real copy and contrast, keyboard and accessible names, states,
fonts actually loaded, performance and actual motion with its reduced-motion fallback. Upstream's
step 7 "Gate" is its own; in this pipeline its findings are advisory (see
[Optional upstream tools](#optional-upstream-tools)).

### Redesign

**Trigger:** improve, restyle or review an existing page or app screen without losing its working
product. Read `UPSTREAM-SKILL.md` "Special cases": record the before, stop at the critique for a
review, keep the stack, content and what works, change type, colour, the frame, states and stock
components in that order, then prove it with before and after.

**Output and stage checks:** Stage 0/1 records the observed before state, stack, shared consumers,
brand, IA, SEO and analytics and what must survive; Stage 2/3 records the bounded audit and selected
changes; Stage 4/5 implements them in the current stack. Stage 6 compares before and after on real
routes, states and viewports, checks functionality and accessibility, and classifies Introduced,
Regression and Pre-existing findings through interface-review. Preserve route slugs, form fields,
legal copy, facts and approved brand identity. A restyle that changes fonts measures glyph
coverage, wrapping and downstream layout before adopting them.

### App screens

**Trigger:** a dashboard, admin or analytics view, settings, billing, inbox or queue, wallet, list
with filters, editor or builder: a screen people work in. Read the complete
[app-screens.md](../vendor/taste-skill/upstream/skills/taste-skill/references/app-screens.md) before
starting; it has its own run, shell archetypes, KPI, chart, table, form, density and state rules,
measured from 23 product screens. The page run in `UPSTREAM-SKILL.md` does not apply.

**Output and stage checks:** the existing [ui flow](stages.md) and the project's component system
own the work; app-screens.md supplies craft rules inside it. Stage 3 records the screen's one
question, the data and jobs inventory, and the chosen density; Stage 4/5 builds in the existing
components (upstream `app.css`/`charts.js` only where the project has nothing). Stage 6 checks real
data that adds up, empty/zero/loading/error states, keyboard paths, table semantics and the phone
layout. Quiet borders, small labels and repeated panels are normal on app screens; that is
upstream's own rule, not an exception to record.

### Critique

**Trigger:** judge a rendered page or app screen, the look step of a build, or a review request.
Read the complete [critique.md](../vendor/taste-skill/upstream/skills/taste-skill/references/critique.md):
how to look, the Awwwards-weighted score (design 40%, usability 30%, creativity 20%, content 10%),
the caps that override the arithmetic, the written format and what to fix first.

**Output and stage checks:** critique only screenshots of the real render at every captured width
(a Stage 2 preview or the Stage 6 result), and write it in critique.md §4's shape in the existing
review or QA evidence. Caps that come from
upstream house style (eyebrows, monospace labels, numbering, gradients, hairlines) apply only when
the house rules were adopted for this project. A score is a model judgement, not Visual Acceptance,
and it never replaces the [anti-slop review](anti-slop-review.md) or interface-review findings.

## Optional upstream tools

The upstream scripts use Node built-ins only and install nothing. `design-pipeline` never runs them itself: no command,
gate, receipt or check depends on them. An agent may run them from the packaged copy, from the
target project's root, when the route above uses them:

| Script | Use | Needs |
| --- | --- | --- |
| [`draw.mjs`](../vendor/taste-skill/upstream/skills/taste-skill/scripts/draw.mjs) | Deals a direction sheet (type, palette, hero and section blueprints) from `library/*.json`; `--app` deals an app style; `--keep palette,type` keeps the brand. | Node 18+ |
| [`inspect.mjs`](../vendor/taste-skill/upstream/skills/taste-skill/scripts/inspect.mjs) | Opens the page in a real browser at 1440, 768 and 390, measures it and saves screenshots; `--app` for app screens. | Node 22+, Chrome, Edge or Chromium |
| [`lint.mjs`](../vendor/taste-skill/upstream/skills/taste-skill/scripts/lint.mjs) | Scans source for banned patterns and stock phrases. | Node 18+ |
| [`assets.mjs`](../vendor/taste-skill/upstream/skills/taste-skill/scripts/assets.mjs) | Searches open collections (Openverse, Wikimedia Commons, Art Institute of Chicago, the Met) for commercially usable pictures; `--get` downloads with title, creator, licence and source; `--credits` prints them. | Network |
| [`scenes.mjs`](../vendor/taste-skill/upstream/skills/taste-skill/scripts/scenes.mjs) | Photographs each adopted scroll scene at 0-100% of its hold on desktop, phone and reduced motion. | Node 22+, browser |

Run them as `node <skill>/vendor/taste-skill/upstream/skills/taste-skill/scripts/<script> ...`,
where `<skill>` is the installed `design-pipeline` folder. Pass `--out` under the project's ignored
`.design-pipeline/` (for example `draw.mjs ... --out .design-pipeline/taste` and
`inspect.mjs <url> --out .design-pipeline/taste/inspect`, so the inspector finds the dealt
`direction.json`). `draw.mjs` keeps a draw history in `~/.taste-skill/history.json`; set
`TASTE_SKILL_HISTORY` to keep it inside the project. If `inspect.mjs` cannot find a browser, set
`CHROME_PATH` to the one `designer-pipeline doctor` reports.

- **Draw:** with an open direction, the three-source preview decides first. Use a draw when the
  direction stage was waived, or after the owner's choice with `--keep palette,type` for section
  blueprints. Record the direction id, seed and every redraw with its reason in `design.md`.
- **Inspect and lint are advisory.** Read every `FAIL` and `WARN` and fix the ones that are real
  problems (text covered or cut, overflow, contrast, missing title or headings, empty screens).
  Findings about taste (palettes, eyebrows, monospace labels, numbering, rules, gradients, shadows,
  violet) are upstream house style: they never fail a design-pipeline stage, gate or delivery and
  never override the project's design. Keep the report and screenshots as review evidence, not as a
  receipt; inspect the production build, and re-run after the target changes.
- **Assets:** use `assets.mjs` only when the project has no suitable supplied imagery and network
  use is acceptable. Every downloaded picture keeps its licence and credit line in the project and
  on the page, and is listed in the delivery report.

## Methods that left this bundle

Upstream moved these out of Leonxlnx/taste-skill; they are not packaged and this guide does not
route to them. Use the pipeline route named here.

| Former method | Upstream now | Pipeline route |
| --- | --- | --- |
| `minimalist-ui`, `industrial-brutalist-ui`, `high-end-visual-design`, `gpt-taste`, `design-taste-frontend-v1` | Leonxlnx/taste-skill-classics | A named style: the [design direction library](design-direction-library.md) style catalog through the direction stage. |
| `stitch-design-taste` | Leonxlnx/taste-skill-classics | Product foundations: [design-synthesis.md](design-synthesis.md) into the project `DESIGN.md`. |
| `redesign-existing-projects` | Merged into `design-taste-frontend` | [Redesign](#redesign). |
| `image-to-code` | Leonxlnx/imagegen-skills | Supplied image or page: [reference-spec.md](reference-spec.md) and [reconstruction-spec.md](reconstruction-spec.md) (replicate mode). |
| `imagegen-frontend-web`, `imagegen-frontend-mobile`, `brandkit` | Leonxlnx/imagegen-skills | Concept images or brand boards: the available image provider through the visual-assets route in [capability-routing.md](capability-routing.md), brand facts through [brand-facts.md](brand-facts.md). Images are not implemented behavior; with no provider, say so instead of claiming images. |
| `full-output-enforcement` | Removed upstream | None; complete the agreed scope through the stage checks. |

## Verification and availability

Use the existing [QA checklist](qa-checklist.md) and stages; this guide adds no command, gate,
receipt schema or resolver. Record the route, the complete source read, adaptations and excluded
house rules, the tools run with their output paths, the actual inspected surface and remaining
limits in the task's existing design/QA evidence. Report **Component Conformance** and **Visual
Acceptance** separately: source availability, an inspector run with 0 FAIL, a critique score or a
successful gate never supply owner approval of the design or the implemented result.

The existing `visual-direction-review` profile checks the packaged pipeline entry; required package
resources ensure the local source is present, and `sources:check` validates its locked identity.
The snapshot's `install.sh`, plugin manifests, CI workflow, tests, sponsor assets and install
commands are inert source; do not execute them, install ambient skills or change host configuration
as part of reading it.

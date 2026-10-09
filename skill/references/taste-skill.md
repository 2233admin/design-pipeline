# Built-in Taste suite

Use this guide for new website design, existing-site redesign, visual direction and critique,
reference-to-frontend work, web/mobile concept images, brand boards and complete output. Select
the method that matches the requested deliverable, then read its **complete local SKILL.md** below.
All thirteen entries are packaged with `design-pipeline`; no ambient Taste skill installation or
network access is needed to read and apply them. This guide supplies selection and project
adaptation, while the original files retain every instruction, example and pre-flight checklist.

The complete reviewed [Leonxlnx/taste-skill source](../vendor/taste-skill/upstream/README.md) is
pinned at `b482f7a970abb98c4108d4a9f761e458c64cefc8` (2026-10-07), reviewed on 2026-10-08:
62 tracked files, 4,824,721 bytes and thirteen skills. The Git tree is
`2589404b7fd08979aafbeb8074d4bc416fe428a3`; the canonical tree SHA-256 is
`5c05edf236140ec2152a02c95f079911ce4636dd1b15089ad9292be9d0b5a40a`.
Read [manifest.json](../vendor/taste-skill/manifest.json) for the complete blob inventory and
identity. The [MIT license](../vendor/taste-skill/upstream/LICENSE) retains copyright 2026
Leonxlnx. Preserve the notice when redistributing substantial source.

The upstream [changelog](../vendor/taste-skill/upstream/CHANGELOG.md) identifies the default
`design-taste-frontend` as **v2 experimental**, a substantial rewrite rather than a stable
v2.0.0 release. `design-taste-frontend-v1` is an explicit compatibility choice. Read one version;
do not combine their incompatible defaults. Upstream folder names differ from install names;
the links below use the original folders and the headings use the exact frontmatter names.

## Choose the deliverable

| Request | Read next | Output boundary |
| --- | --- | --- |
| New landing page, portfolio, editorial or marketing site | [design-taste-frontend](#design-taste-frontend) | Implemented web surface; v2 is experimental and excludes dense product UI. |
| Preserve an existing site's product behavior while improving design | [redesign-existing-projects](#redesign-existing-projects), with the matched v2 redesign section when applicable | Audit and targeted changes in the existing stack. |
| Explicit v1 behavior | [design-taste-frontend-v1](#design-taste-frontend-v1) | Compatibility method within project contracts. |
| Motion-rich marketing with AIDA and GSAP direction | [gpt-taste](#gpt-taste) | Planned and implemented marketing composition, not a general critique-only skill. |
| An already-chosen editorial, industrial or soft/luxury style | [minimalist-ui](#minimalist-ui), [industrial-brutalist-ui](#industrial-brutalist-ui) or [high-end-visual-design](#high-end-visual-design) | One coherent style applied to project components. |
| Semantic design rules for Stitch or a reusable foundation | [stitch-design-taste](#stitch-design-taste) | Product-specific design rules; foundation conversion required. |
| Implement a supplied or selected website image | [image-to-code](#image-to-code) | Observed reference, extracted design and working frontend. |
| Website concept images | [imagegen-frontend-web](#imagegen-frontend-web) | One separate horizontal image per requested section. |
| Mobile app concept or flow images | [imagegen-frontend-mobile](#imagegen-frontend-mobile) | Readable, coherent screen images; no app code. |
| Brand identity concept board | [brandkit](#brandkit) | Brand-kit image and concept rationale; no fabricated production asset set. |
| Exhaustive files or several deliverables | [full-output-enforcement](#full-output-enforcement) | Every requested artifact completed and checked. |

Choose one primary method and, when justified, one compatible style or completeness method.
Do not load or apply all thirteen at once. Existing product dashboards, data tables, wizards,
editors and native mobile implementation stay on their current component/platform routes; v2's
marketing-page exclusions do not remove the suite's applicable style, redesign or image methods.

## Project authority and adaptations

1. **Read the project first.** Use [Stage 0](stages.md#stage-0-repo-read), the existing framework,
   shared components, token owners, routes, analytics and test surface. User instructions,
   supplied references, project `DESIGN.md`/`MOTION.md`, accessibility, localization and browser
   targets govern the work. Upstream personas, style bans and default dials are selected methods,
   not new project policies. Apply [interface discipline](interface-discipline.md) and
   [Good CSS](good-css.md) alongside them.
2. **Ground the direction.** Record the brief/audience read, selected entry and reason, variance,
   motion and density choices, and applicable/excluded source rules in existing `directions.md`
   and change `design.md`. Critique the selected preview before building and critique the actual
   result afterwards. [Anti-slop review](anti-slop-review.md) judges product-specific cohesion;
   a font, common layout, color or punctuation character alone is not a gate failure.
3. **Keep the stack.** React/Next, Tailwind, Motion, GSAP, icon libraries and official design
   systems are upstream defaults or examples. Verify the project's installed dependencies and
   versions before an import; use its existing framework and governed toolchain selection.
   Do not install a new package merely to obey a taste preference. Assign one owner per animated
   property, clock and lifecycle; clean up listeners/triggers and follow
   [motion-spec.md](motion-spec.md). The original GSAP sketches need target-specific resize,
   scope, interruption and reduced-motion checks before adoption.
4. **Adapt style to real use.** AIDA is suitable for a conversion narrative, not every app or
   document. Large whitespace, exactly two hero lines, a one-accent palette, forced dark mode,
   card/no-card rules, dense placement and tiny telemetry labels are contextual choices.
   Preserve readable zoom, reflow, DOM/focus order, semantic error/status colors, table use and
   necessary instructions. `grid-auto-flow: dense` must not reorder the user or keyboard journey.
   Choose `svh`/`dvh` and intrinsic sizing for the actual surface rather than a universal hero rule.
5. **Keep language and fonts usable.** Font bans, emoji bans, all-caps rules, line-count limits and
   the v2 em-dash/en-dash ban do not override approved product copy, quoted text, mathematical
   signs, locale punctuation, existing brand fonts or CJK glyph coverage. Use
   [plain-language.md](plain-language.md), [cjk-typography.md](cjk-typography.md) and
   [font selection](../tools/fonts.md). Verify font availability, license, actual glyphs and
   text rendering; do not assume the named premium fonts exist.
6. **Observe assets and facts.** User-provided images and approved product assets have priority.
   No rule requires generating replacements or a fixed number of extra images for every UI fix.
   For an authorized image concept, use the available image provider, inspect its actual output
   and regenerate unclear details when useful. Never claim an unavailable provider produced
   images. Stock placeholders and upstream demo imagery are not final asset or license evidence.
   Preserve real testimonials, metrics and legal/consent copy; mark sample data explicitly rather
   than inventing believable numbers, customer logos, citations or ownership claims.
7. **Keep plans honest and motion bounded.** GPT's simulated Python randomization is an optional
   variation exercise: record the selected combination; never claim Python ran when it did not.
   Run a real script only when it is useful, with a recorded seed if repeatability matters.
   Static output is valid when the brief or reduced-motion policy calls for it. Continuous loops,
   smooth-scroll overrides, pinning and springs need a product purpose and the existing motion
   budget. Image-implied motion is a proposal; it is not playback or interaction evidence. Film
   output retains its paused/seekable runtime and reordered-seek checks.

## Complete capability coverage

### design-taste-frontend

**Trigger:** new or redesigned landing pages, portfolios, editorial and marketing surfaces where
the brief needs a coherent, non-template direction. Read the complete
[v2 experimental source](../vendor/taste-skill/upstream/skills/taste-skill/SKILL.md), including
brief inference, the three dials, official-system versus aesthetic distinction, states/assets,
theme/color/shape consistency, motivated motion, redesign protocol, pre-flight and appendices.

**Output and stage checks:** Stage 0 records the existing stack; Stage 2 produces a grounded
direction/preview; Stage 3 records layout, copy, assets, states and adapted source checks; Stage
4/5 implements the selected web surface. Stage 6 checks responsive layout, real copy/contrast,
keyboard/forms/loading/empty/error states, target themes, performance and actual motion where
used. The block-library section defines a schema and future paths; this snapshot has no populated
block implementations. Do not claim those named patterns are bundled callable components.

### design-taste-frontend-v1

**Trigger:** an explicit request or documented project dependency on original v1 behavior.
Read the complete [v1 source](../vendor/taste-skill/upstream/skills/taste-skill-v1/SKILL.md).
Its fixed `8/6/4` dials, stricter bans, React/Tailwind conventions, creative arsenal and
perpetual-motion bento paradigm differ from v2.

**Output and stage checks:** record the compatibility reason and chosen dials in Stage 2/3;
implement in Stage 4/5 using the existing framework. Stage 6 verifies real interaction states,
mobile layout, font/copy fit, reduced motion, cleanup and performance. Compatibility preserves
the requested method, while project authority still prevents forced dependencies or endless
motion on every card. Selecting v1 never silently replaces an approved direction with v2.

### gpt-taste

**Trigger:** an explicitly suitable motion-rich, conversion-oriented marketing direction.
Read the complete [GPT/Codex variant](../vendor/taste-skill/upstream/skills/gpt-tasteskill/SKILL.md):
variation planning, AIDA chapters, wide hero typography, gapless bento math, GSAP pin/stack/scrub,
inline image typography, accordions, marquees and pre-flight plan.

**Output and stage checks:** Stage 2/3 records the selected composition and real variation
choices; Stage 4/5 implements only motivated components/motion. Stage 6 measures button contrast,
headline fit on the actual laptop/mobile widths, grid filling and reading order, pin/scrub
boundaries, resize, interruption, teardown and reduced motion. The source's 700ms hover example,
global overflow clipping and compulsory GSAP do not override project motion/scroll contracts.

### minimalist-ui

**Trigger:** a selected restrained editorial/document-style interface. Read the complete
[minimalist source](../vendor/taste-skill/upstream/skills/minimalist-skill/SKILL.md): warm monochrome,
type contrast, muted semantic accents, flat grids, modest corners, quiet controls and subtle motion.

**Output and stage checks:** Stage 2/3 defines the selected type, neutral/semantic tokens, spacing
and component states; Stage 5 applies them in the existing authoring system. Stage 6 checks real
text/zoom/CJK, contrast of muted labels and pastels, alignment, touch/focus and motion preferences.
Its early no-gradient rule and later ambient-gradient examples are alternatives to resolve in
the selected direction, not instructions to combine. Plain or static surfaces remain valid.

### industrial-brutalist-ui

**Trigger:** a chosen Swiss-industrial print or tactical telemetry direction. Read the complete
[industrial source](../vendor/taste-skill/upstream/skills/brutalist-skill/SKILL.md): one archetype,
macro/micro typography, one substrate palette, blueprint grids, sharp corners, semantic data
elements, halftone/dithering, scanlines and noise.

**Output and stage checks:** Stage 2 chooses one archetype; Stage 3 specifies tokens, data
hierarchy and texture scope; Stage 5 builds the surface. Stage 6 checks dense-data readability,
small labels, zoom, actual data semantics, keyboard paths and texture/contrast/performance.
All-caps, red accents, root noise and invented revision markers are stylistic options; do not
turn decorative copyright/trademark marks into false legal claims or fabricated telemetry.

### high-end-visual-design

**Trigger:** a selected soft/luxury agency direction needing depth, generous rhythm and tactile
components. Read the complete [soft source](../vendor/taste-skill/upstream/skills/soft-skill/SKILL.md):
texture/layout archetypes, nested double-bezel surfaces, CTA trailing-icon enclosures, floating
navigation, spring cues, mobile overrides, performance and pre-output checklist.

**Output and stage checks:** Stage 2 selects one texture/layout pairing; Stage 3 records the
radius/depth/spacing system and interaction states; Stage 5 implements it. Stage 6 checks nested
radius geometry, real hit targets, menu focus/Escape/return, blur cost, mobile stacking and reduced
motion. A trailing icon enclosure is visual structure, not a nested interactive button. This
style's mandatory nested shells conflict with image-to-code's anti-nesting preference; follow
the chosen reference and component semantics rather than applying both everywhere.

### stitch-design-taste

**Trigger:** a semantic design specification for Stitch screens or translation into reusable
product design guidance. Read the complete
[Stitch source](../vendor/taste-skill/upstream/skills/stitch-skill/SKILL.md) and its
[DESIGN.md example](../vendor/taste-skill/upstream/skills/stitch-skill/DESIGN.md).

**Output and stage checks:** Stage 2/3 synthesizes product-specific atmosphere, named color roles,
type, layout, components and motion intent. Convert selected decisions through
[design-synthesis.md](design-synthesis.md) into the existing `projectFoundation`: project
`DESIGN.md` uses Google's official section order/frontmatter, followed by Product Context and
Source Decisions; project `MOTION.md` owns motion. The bundled DESIGN.md is an example and cannot
replace user DESIGN.md or become foundation evidence by copying it. The existing foundation
check covers structure/provenance; Stage 6 must inspect implemented screens. Stitch access/MCP
is needed to generate screens in Stitch; the local semantic method remains readable without it.
Stitch's static screens and motion descriptions do not verify animation.

### redesign-existing-projects

**Trigger:** improve an existing website/app without losing its working product. Read the
complete [redesign source](../vendor/taste-skill/upstream/skills/redesign-skill/SKILL.md): scan,
diagnose, targeted fixes across typography, surfaces, layout, states, content, components,
iconography, code and omitted user journeys, plus upgrade techniques and priority order.

**Output and stage checks:** Stage 0/1 records the observed before-state, stack, shared consumers,
brand/IA/SEO/analytics and intended preservation; Stage 2/3 records a bounded audit and selected
changes; Stage 4/5 implements them in the current stack. Stage 6 compares before/after on real
routes, states and viewports, checks functionality/accessibility and classifies Introduced,
Regression and Pre-existing findings via interface-review. Preserve route slugs, form fields,
legal copy, facts and approved brand identity. A font swap is not automatically low-risk;
measure glyph coverage, wrapping and downstream layout before adopting it.

### image-to-code

**Trigger:** build or adapt a web surface from an authorized supplied or selected image.
Read the complete [image-to-code source](../vendor/taste-skill/upstream/skills/image-to-code-skill/SKILL.md):
legible section/detail references, deep text/type/spacing/color/component extraction, coherent
media frames, anti-drift implementation, first-view clarity and complete multi-section output.

**Output and stage checks:** Stage 1 records source availability, authority, observations and
unknowns in existing reference evidence; Stage 3 derives the design from the verified graybox
when the reference is a primary target; Stage 4/5 builds the actual frontend. Stage 6 uses
[reference-spec.md](reference-spec.md), [reconstruction-spec.md](reconstruction-spec.md) and the
existing website-cloning module when applicable, comparing actual renders and testing live
controls/responsiveness. User images take priority over the source's generate-first default;
generated references must be selected and bound before they guide implementation. Generate new
legible details only when appropriate; never substitute generated copy/facts for approved text.
An image can suggest hover or motion, but only real input/playback evidence proves it.

### imagegen-frontend-web

**Trigger:** the requested deliverable is website concept images, not implemented frontend.
Read the complete [web image source](../vendor/taste-skill/upstream/skills/imagegen-frontend-web/SKILL.md):
one separate horizontal image per section, varied composition/background/CTA, a chosen hero
scale, narrative spine, one second-read motif, conversion purpose and one coherent palette.

**Output and stage checks:** agree or infer the requested section scope in the existing brief;
Stage 2 produces the full set of section concepts using an available image provider, labeled
by section. Inspect every output for text readability, real copy, hierarchy, crops, palette,
continuity and implementation clarity; record choices/limits in concepts/reference evidence.
The source's default six/eight sections applies only to an otherwise unspecified image-concept
request, never to a bounded bug fix. Stage 6 records inspected images and remaining uncertainty;
separate later code and live interaction work onto their normal routes. No bundled image model
or rendered UI behavior is promised.

### imagegen-frontend-mobile

**Trigger:** mobile app concept images, screen sets or onboarding/auth/commerce flows.
Read the complete [mobile image source](../vendor/taste-skill/upstream/skills/imagegen-frontend-mobile/SKILL.md):
iOS/Android/cross-platform choice, design bible, coherent screen progression, readable type,
safe areas/navigation, image/texture/icon treatment and consistent phone framing.

**Output and stage checks:** Stage 2 produces every requested screen image with an available
image provider, plus useful detail views. Inspect each screen and the ordered flow for readable
copy, safe-area placement, believable back/next navigation, state continuity, consistent palette
and device scale; record evidence in the existing concept/QA artifacts. Preserve user requests
for raw screens or alternate device frames. This capability outputs images only; it does not
write SwiftUI, React Native, Flutter or HTML. Stage 6 cannot certify platform semantics, actual
touch targets or functioning navigation from pixels; implementation requires its normal route.

### brandkit

**Trigger:** a brand-kit, logo-system concept or identity presentation board image.
Read the complete [brandkit source](../vendor/taste-skill/upstream/skills/brandkit/SKILL.md): brand
strategy/metaphor, reduced logo concepts, construction geometry, panel rhythm, visual modes,
sparse text, coherent palette and identity applications.

**Output and stage checks:** Stage 2 generates the requested board with an available image
provider; default to one overview, using the chosen 3x3/2x3/custom layout and appropriate ratio.
Inspect repeated-logo consistency, legible wordmark, hierarchy, symbolic relevance and mockup
continuity. Stage 3 records approved decisions in project DESIGN.md through design-synthesis,
with concept-image provenance. Stage 6 distinguishes inspected image quality from production
assets: a board is not an editable vector logo, tested UI, licensed font set, trademark-clearance
result or automatically approved identity. Obtain/verify actual final assets separately.

### full-output-enforcement

**Trigger:** several requested files/components/sections or a risk of incomplete delivery.
Read the complete [output source](../vendor/taste-skill/upstream/skills/output-skill/SKILL.md):
count scope, complete each deliverable, reject omitted-code placeholders and cross-check output.
The complete supporting [research](../vendor/taste-skill/upstream/research/README.md) and
[truncation research index](../vendor/taste-skill/upstream/research/laziness/README.md) remain local.

**Output and stage checks:** Stage 4 enumerates actual artifacts and checks; Stage 5 completes
the agreed scope; Stage 6 checks every output exists, works and has no placeholder standing in
for required implementation. Save full files and continue across clean internal chunks when
necessary; do not adopt the source's automatic pause-and-ask-for-continue pattern when the host
can continue autonomously. This method does not enlarge a bounded task, require long chat
repetition, change model/provider settings or guarantee output capacity. Research is preserved
reference material, not independent proof of its empirical or provider-setting claims.

## Verification and availability

Use the existing [QA checklist](qa-checklist.md) and stages; this suite adds no command, gate,
receipt schema or resolver. Record the selected exact skill name/version, complete source read,
adaptations, produced artifacts, actual inspected surface, checks and remaining limits in the
task's existing design/QA evidence. Report **Component Conformance** and **Visual Acceptance**
separately: source availability, marker checks and a successful gate never supply owner approval
of design, generated images or the implemented result.

The existing `visual-direction-review` profile checks the packaged pipeline entry; required
package resources ensure all thirteen local sources are present, and `sources:check` validates
their locked source identity. A marker check establishes a routed entry, not whether an agent
obeyed every instruction or whether a design is good. The snapshot's installer `skill.sh`, asset
scripts, sponsor links, upstream install commands and parameter suggestions are inert source;
do not execute them, install ambient skills or change host configuration as part of reading it.

# Built-in Good CSS

Read this guide whenever you write, edit or review styles, or build or restyle a web page or
component. The trigger includes plain CSS, Tailwind and other utility classes, StyleX,
CSS-in-JS, inline styles and CSS used inside a film composition. No explicit CSS request or
ambient `good-css` installation is needed. Apply the relevant techniques automatically after
reading their complete original entries; a whole page normally touches most categories.

The built-in source is the complete reviewed
[`vojtaholik/good-css`](https://github.com/vojtaholik/good-css/tree/6d16d2fd27f4892e2aea4b5c5c2b016f45be7eef)
Git tree at `6d16d2fd27f4892e2aea4b5c5c2b016f45be7eef`, reviewed on 2026-10-08. It contains
133 tracked files, 47 practices in eight categories, eight generated agent references and 47
live specimen fixtures. The commit is dated 2026-10-07. Read the pinned provenance and file
integrity evidence in [`manifest.json`](../vendor/good-css/manifest.json).

Original bytes live in [`vendor/good-css/upstream/`](../vendor/good-css/upstream/README.md).
[`PRACTICES.md`](../vendor/good-css/upstream/PRACTICES.md) is the upstream source of truth: it
retains the code, conditions, explanations, support claims and individual credits. The shorter
agent references are generated from that file. The tables below provide project routing and
adaptation checks, not replacements for those conditions. Read the source entry before copying
any snippet.

The source has an [MIT license](../vendor/good-css/upstream/LICENSE), copyright 2026 Vojta
Holik. The bundled fonts retain separate SIL OFL 1.1 notices for
[Inter](../vendor/good-css/upstream/harness/public/fonts/Inter-OFL.txt) and
[Geist Mono](../vendor/good-css/upstream/harness/public/fonts/GeistMono-OFL.txt). Preserve these
notices and the entry credits when redistributing substantial source or assets. The original
`AGENTS.md`, plugin metadata, package scripts, Bun lockfile and Vercel deployment configuration
are retained as inert source data. They do not authorize installing a skill, importing the
upstream dependency graph, deploying its site or changing this project's host policy.

## Authority and use

Prefer an intrinsic CSS declaration or native HTML behavior when it satisfies the actual
component contract. Reuse the project's tokens, shared components, authoring system and native
semantics. Read [interface-discipline.md](interface-discipline.md) for full interface review,
[cjk-typography.md](cjk-typography.md) for CJK copy and
[motion-spec.md](motion-spec.md) for non-trivial motion. Project `DESIGN.md`, `MOTION.md`, target
browsers, accessibility requirements and existing v1 contracts remain authoritative.

1. Identify the affected component and its consumers, existing reset, token owners, font faces,
   scroll ownership and browser targets. An existing surface needs a bounded adaptation, not a
   wholesale reset or palette replacement.
2. Read the upstream [agent entry](../vendor/good-css/upstream/skills/good-css/SKILL.md), then
   the applicable original category files below. Keep every condition of the selected entry,
   including conditions that are described only in prose.
3. Use the coverage tables to select the exact entry and specimen. Preserve the technique in
   the existing authoring system. Use a custom rule or arbitrary declaration when the project's
   utilities cannot express it; verify the emitted CSS instead of assuming a utility name or
   variant implements the full rule.
4. Decide the target-browser behavior before adopting an advanced feature. Record the tested
   browser/version, essential behavior and unsupported-feature result in the change evidence.
   A usable native/static result can be the fallback; when an essential function disappears,
   implement the smallest verified fallback that meets the product contract.
5. Inspect the actual product with real content, keyboard/focus, reduced motion and the relevant
   light/dark, zoom, RTL or CJK cases. A specimen or text checker proves only its scoped result.

| Source category | Practices | Read before implementing |
| --- | --- | --- |
| [Foundations](../vendor/good-css/upstream/skills/good-css/references/foundations.md) | 6 | Reset, base styles, color scheme, type and spacing tokens. |
| [Layout](../vendor/good-css/upstream/skills/good-css/references/layout.md) | 8 | Containers, card grids, sidebars, slots, layers and alignment. |
| [Spacing and shape](../vendor/good-css/upstream/skills/good-css/references/spacing-and-shape.md) | 4 | Reorderable sections, sibling rhythm, separated actions and nested corners. |
| [Text and media](../vendor/good-css/upstream/skills/good-css/references/text-and-media.md) | 5 | User/CMS content, uploads, numbers, labels and adjacent icons. |
| [Interaction](../vendor/good-css/upstream/skills/good-css/references/interaction.md) | 8 | Focus, hover, press, targets, clickable cards, forms and modal scroll lock. |
| [Motion](../vendor/good-css/upstream/skills/good-css/references/motion.md) | 6 | Motion preferences, timing tokens, custom properties, shadows and navigation cues. |
| [Show and hide](../vendor/good-css/upstream/skills/good-css/references/show-and-hide.md) | 4 | Dialogs, popovers, disclosures and overlapping panels. |
| [Scroll and viewport](../vendor/good-css/upstream/skills/good-css/references/scroll-and-viewport.md) | 6 | Carousels, inner scroll panels, overflow cues, anchors and mobile safe areas. |

## Project adaptations

- **Tokens and existing CSS:** preserve approved token roles and values. OKLCH, `color-mix()` and
  `light-dark()` are implementation choices, not permission to replace a brand palette or force
  a new theme model. Compare real contrast and gamut; equal OKLCH lightness is not contrast
  evidence. Migrate physical properties or resets with their consumers and intentional exceptions.
- **Language and content:** test `dir="rtl"`, mixed-direction strings, long names/URLs and the
  actual supported scripts. Logical properties do not automatically make carousel JS, physical
  transforms, gradient directions or anchor math RTL-safe. `cap`, `alphabetic` text trim, Latin
  fonts and Latin placeholders do not prove CJK alignment; retain glyph bounds and touch height.
- **Browser compatibility:** upstream `Support:` lines and dated browser experiments are source
  claims. The guide sets no browser floor. Verify feature support and behavior in the project's
  targets; unsupported animation can snap while interaction stays functional. Do not turn an
  upstream “write no fallback” opinion into an exemption from an essential product requirement.
- **Interaction and accessibility:** preserve semantic links, buttons, native validation,
  `<details>`, dialog focus ownership and popover behavior. Check keyboard opening/closing,
  focus return, Escape, meaningful error text, forced-colors outlines, zoom and target overlap.
  Decorative fades may remain under reduced motion; movement, size changes and scripted motion
  must follow the project's reduced-motion policy.
- **Scroll ownership:** choose page, panel and carousel scroll behavior deliberately. Apply
  clipping at the offending element. Preserve programmatic scrolling, text selection, resize
  handles, browser back gestures and mobile pull to refresh where the product needs them.
  Nested scroll lock and gutter behavior require tests in the real dialog/app shell.
- **Frameworks:** inspect the installed compiler's output for utilities, nesting, media queries,
  pseudo-elements, container rules and `@property`. CSS-in-JS and StyleX may need a small shared
  stylesheet for selectors or at-rules they cannot emit. Preserve component teardown for any
  listeners/observers. The upstream text checker cannot review dynamic styles or generated classes.
- **Film and motion ownership:** these practices can provide layout, type, surfaces and authored
  poses inside HTML films. UI timing ceilings and “no ease-in” advice apply to UI transitions;
  they do not replace authored film choreography. CSS transitions, scroll timelines, document
  navigation, `performance.now()`, intervals and autonomous animation loops are not deterministic
  film clocks. A rendered composition must derive state from its existing paused/seekable runtime,
  reproduce a requested time in either seek direction and preserve target/snapshot/receipt lineage.

The full source also preserves upstream exclusions and deferred ideas. Keep the exclusions against
global `text-box` trim, `text-rendering: optimizeLegibility`, global `display: contents` and a
shared grid cell in a reset. The `Next` section is a backlog, not additional implemented practices;
do not claim coverage of deferred features or add them merely because they are listed there.
Upstream credits Emil Kowalski for motion judgment. Use the project's available animation guides
and accepted motion contract; resolving a value disagreement does not require an ambient install.

## Complete practice coverage

Each **Source** link opens the full original entry in `PRACTICES.md`. Each **Specimen** link opens
its original live fixture; the fixture is assembled with the entry's CSS/HTML/JS by the offline
study builder described below. The exact slugs are the source heading identifiers and generated
specimen identifiers. The adaptation column is an additional project check: retain the complete
source category conditions as well.

### Foundations — 6

| Exact practice slug and title | Original source and specimen | Project use and adaptation/verification condition |
| --- | --- | --- |
| `the-reset` — The reset | [Source](../vendor/good-css/upstream/PRACTICES.md#the-reset) · [Specimen](../vendor/good-css/upstream/harness/demos/the-reset.html) | Establish a new base stylesheet; on an existing surface apply one rule at a time. Test shrinking media/icons, available weights/styles, real CJK/typing wrap, input focus without disabling zoom, active feedback after tap-highlight removal and page gutter. Use `svh` for documents/heroes and the accepted `dvh` shell behavior for pinned app UI. |
| `logical-properties` — Logical properties | [Source](../vendor/good-css/upstream/PRACTICES.md#logical-properties) · [Specimen](../vendor/good-css/upstream/harness/demos/logical-properties.html) | Express layout-relative spacing, borders, offsets and alignment. Check RTL and supported writing modes; four-value spacing/inset shorthands remain physical. Keep deliberate physical coordinates documented instead of blindly rewriting transform/gradient or renderer math. |
| `oklch-color` — OKLCH color | [Source](../vendor/good-css/upstream/PRACTICES.md#oklch-color) · [Specimen](../vendor/good-css/upstream/harness/demos/oklch-color.html) | Derive related semantic-token colors from a base. Keep achromatic hue `none`, test the actual mixes/gamut and contrast on approved surfaces, and preserve established project tokens. The hue-control specimen also uses relative color syntax, which needs its own browser check. |
| `one-set-of-color-tokens-for-light-and-dark` — One set of color tokens for light and dark | [Source](../vendor/good-css/upstream/PRACTICES.md#one-set-of-color-tokens-for-light-and-dark) · [Specimen](../vendor/good-css/upstream/harness/demos/one-set-of-color-tokens-for-light-and-dark.html) | Use paired color tokens when the project's theme model allows it. Test system/manual/subtree schemes, native controls and first-paint meta behavior. Non-color changes need their own rule; an existing theme API remains authoritative. |
| `fluid-sizes-with-clamp` — Fluid sizes with `clamp()` | [Source](../vendor/good-css/upstream/PRACTICES.md#fluid-sizes-with-clamp) · [Specimen](../vendor/good-css/upstream/harness/demos/fluid-sizes-with-clamp.html) | Derive a fluid type or space token from two design points. Retain `rem` bounds and a `rem + vw` preferred type value; verify endpoints, intermediate widths, browser zoom/user font size and the source's maximum/minimum type limit of 2.5. Do not copy specimen dimensions as product tokens. |
| `one-fluid-scale-for-type-and-space` — One fluid scale for type and space | [Source](../vendor/good-css/upstream/PRACTICES.md#one-fluid-scale-for-type-and-space) · [Specimen](../vendor/good-css/upstream/harness/demos/one-fluid-scale-for-type-and-space.html) | Derive a larger accepted token scale when that reduces repeated math. Keep numerical inputs and changes at the declaration owner, verify `pow()` in target browsers and the top-step type ratio; steep space pairs are not font tokens. Test container substitution and font/zoom behavior. |

### Layout — 8

| Exact practice slug and title | Original source and specimen | Project use and adaptation/verification condition |
| --- | --- | --- |
| `content-grid-with-breakouts` — Content grid with breakouts | [Source](../vendor/good-css/upstream/PRACTICES.md#content-grid-with-breakouts) · [Specimen](../vendor/good-css/upstream/harness/demos/content-grid-with-breakouts.html) | Replace unnecessary container wrappers where named tracks meet the layout contract. Place every direct child, wrap inline runs, retain nested full-width alignment and change width through tokens. Test narrow gutters, breakouts, CMS children and RTL; utility/StyleX consumers must emit each required child placement. |
| `intrinsic-grid` — Intrinsic grid | [Source](../vendor/good-css/upstream/PRACTICES.md#intrinsic-grid) · [Specimen](../vendor/good-css/upstream/harness/demos/intrinsic-grid.html) | Let equal cards reflow to their available width. Preserve `min(100%, …)` and choose `auto-fit` versus `auto-fill` for short or filtered rows. Test zero/one/many items, long content and slots narrower than the desired card minimum. |
| `subgrid-rows-shared-across-cards` — Subgrid rows shared across cards | [Source](../vendor/good-css/upstream/PRACTICES.md#subgrid-rows-shared-across-cards) · [Specimen](../vendor/good-css/upstream/harness/demos/subgrid-rows-shared-across-cards.html) | Align corresponding card parts across a row. Keep span equal to the actual part count and deliberate row gaps. Verify missing/long parts and reflow; use separate elements for subgrid and size containment, and keep readable cards where subgrid is unavailable. |
| `sidebar-that-wraps-on-its-own` — Sidebar that wraps on its own | [Source](../vendor/good-css/upstream/PRACTICES.md#sidebar-that-wraps-on-its-own) · [Specimen](../vendor/good-css/upstream/harness/demos/sidebar-that-wraps-on-its-own.html) | Adapt sidebar/content or media/action pairs without a viewport breakpoint ladder. Verify the container-share wrap threshold, long content, sticky sidebar room and unstretched media. Preserve accepted ideal width and reading order in RTL and narrow layouts. |
| `container-queries-with-container-units` — Container queries with container units | [Source](../vendor/good-css/upstream/PRACTICES.md#container-queries-with-container-units) · [Specimen](../vendor/good-css/upstream/harness/demos/container-queries-with-container-units.html) | Respond to a component's actual slot. Use an ancestor with independent width, avoid shrink-to-fit collapse and same-element subgrid conflicts. Check missing-container behavior, narrow/wide slots and nested containers; never register a fluid `cqi` length token with `@property`. |
| `stack-layers-with-grid` — Stack layers with grid | [Source](../vendor/good-css/upstream/PRACTICES.md#stack-layers-with-grid) · [Specimen](../vendor/good-css/upstream/harness/demos/stack-layers-with-grid.html) | Overlap in-flow image, copy, badge or state-icon layers. Test the largest-layer sizing, DOM paint order and reading/focus order. Keep absolute positioning for layers that must not size their parent; specify z-index only when the authored paint order requires it. |
| `safe-alignment` — Safe alignment | [Source](../vendor/good-css/upstream/PRACTICES.md#safe-alignment) · [Specimen](../vendor/good-css/upstream/harness/demos/safe-alignment.html) | Center or end-align content that may overflow. Verify both start and end remain reachable with scroll and keyboard at narrow widths/zoom/RTL. Use the source's safe auto-margin alternative when target support requires it. |
| `overflow-clip-over-hidden` — `overflow: clip` over `hidden` | [Source](../vendor/good-css/upstream/PRACTICES.md#overflow-clip-over-hidden) · [Specimen](../vendor/good-css/upstream/harness/demos/overflow-clip-over-hidden.html) | Clip decorative overflow at its owner while preserving sticky descendants. Keep `hidden`/`auto` for script-scrolled or resizable elements. Check both axes, focus outlines, hit areas and sticky behavior; avoid blanket root/body clipping. |

### Spacing and shape — 4

| Exact practice slug and title | Original source and specimen | Project use and adaptation/verification condition |
| --- | --- | --- |
| `section-spacing-that-depends-on-its-neighbors` — Section spacing that depends on its neighbors | [Source](../vendor/good-css/upstream/PRACTICES.md#section-spacing-that-depends-on-its-neighbors) · [Specimen](../vendor/good-css/upstream/harness/demos/section-spacing-that-depends-on-its-neighbors.html) | Express spacing between reorderable semantic sections. Keep defaults on each section, short reason-based adjacency rules and the changed edge on its owner. Test reorderings and absent sections; retain a shared stylesheet when the authoring system lacks sibling selectors. |
| `space-between-siblings-set-by-the-parent` — Space between siblings set by the parent | [Source](../vendor/good-css/upstream/PRACTICES.md#space-between-siblings-set-by-the-parent) · [Specimen](../vendor/good-css/upstream/harness/demos/space-between-siblings-set-by-the-parent.html) | Own component rhythm with `gap` or unknown prose rhythm with direct-child flow margins. Verify first/last edges, hidden children, nested lists and buttons/links that would stretch in a flex column. Preserve tokenized exceptions and avoid changing unknown CMS children into flex items unnecessarily. |
| `push-one-item-away-with-an-auto-margin` — Push one item away with an auto margin | [Source](../vendor/good-css/upstream/PRACTICES.md#push-one-item-away-with-an-auto-margin) · [Specimen](../vendor/good-css/upstream/harness/demos/push-one-item-away-with-an-auto-margin.html) | Separate toolbar/account actions, card footers or a hero title in available flex space. Test no spare space and long content, retain minimum rather than fixed height, and verify centering between unequal header/footer neighbors. This flex behavior does not transfer unchanged to grid tracks. |
| `concentric-nested-radius` — Concentric nested radius | [Source](../vendor/good-css/upstream/PRACTICES.md#concentric-nested-radius) · [Specimen](../vendor/good-css/upstream/harness/demos/concentric-nested-radius.html) | Derive the outer corner from the approved inner radius plus padding. Inspect every corner at the real border/padding values and at large padding; preserve design tokens rather than importing the specimen's corner style. |

### Text and media — 5

| Exact practice slug and title | Original source and specimen | Project use and adaptation/verification condition |
| --- | --- | --- |
| `long-text-that-wraps-truncates-or-clamps` — Long text that wraps, truncates or clamps | [Source](../vendor/good-css/upstream/PRACTICES.md#long-text-that-wraps-truncates-or-clamps) · [Specimen](../vendor/good-css/upstream/harness/demos/long-text-that-wraps-truncates-or-clamps.html) | Define wrapping, one-line truncation or a product-approved excerpt clamp for unpredictable text. Retain shrinkable flex ancestors, all clamp declarations and wrapper padding. Test CJK/URLs/tables, full-text access and target browsers; use the source's `hidden` fallback where `clip` cannot produce the required ellipsis. |
| `image-box-that-holds-any-upload` — Image box that holds any upload | [Source](../vendor/good-css/upstream/PRACTICES.md#image-box-that-holds-any-upload) · [Specimen](../vendor/good-css/upstream/harness/demos/image-box-that-holds-any-upload.html) | Reserve upload/thumbnail/avatar dimensions before loading. Verify auto axis, crop/contain intent, transparent assets, flex sizing, failed decode/load and outline contrast. Use a ratio wrapper where failed-image behavior would shift the layout; do not crop logos or required product detail. |
| `tabular-numbers` — Tabular numbers | [Source](../vendor/good-css/upstream/PRACTICES.md#tabular-numbers) · [Specimen](../vendor/good-css/upstream/harness/demos/tabular-numbers.html) | Stabilize columns, counters and changing numeric labels. Scope the feature to data, verify the actual font provides tabular figures and compare different digits/localized formats. The specimen's interval timer is diagnostic; film readouts derive from the authored clock. |
| `label-centered-on-its-letters-with-text-box` — Label centered on its letters with `text-box` | [Source](../vendor/good-css/upstream/PRACTICES.md#label-centered-on-its-letters-with-text-box) · [Specimen](../vendor/good-css/upstream/harness/demos/label-centered-on-its-letters-with-text-box.html) | Trim a single-line label only when the chosen font/script benefits. Put trim on the text span in a flex/grid button, preserve control/touch height and test descenders, CJK, fallback font and zoom. Keep readable normal line boxes without support; never apply trim globally. |
| `icon-sized-by-the-text-beside-it` — Icon sized by the text beside it | [Source](../vendor/good-css/upstream/PRACTICES.md#icon-sized-by-the-text-beside-it) · [Specimen](../vendor/good-css/upstream/harness/demos/icon-sized-by-the-text-beside-it.html) | Size label icons with font-relative metrics. Keep `flex: none`, a valid SVG viewBox and first-line alignment for wrapping copy. Inspect the icon set's internal padding and actual CJK/Latin font metrics at small/large sizes; retain an appropriate tested unit or fallback. |

### Interaction — 8

| Exact practice slug and title | Original source and specimen | Project use and adaptation/verification condition |
| --- | --- | --- |
| `one-focus-ring-with-focus-visible` — One focus ring with `:focus-visible` | [Source](../vendor/good-css/upstream/PRACTICES.md#one-focus-ring-with-focus-visible) · [Specimen](../vendor/good-css/upstream/harness/demos/one-focus-ring-with-focus-visible.html) | Provide consistent visible keyboard focus using the project's ring tokens. Test filled/light/dark surfaces, clipping and forced colors; a shadow ring retains a transparent outline. `currentColor` alone is not proof of contrast, and an existing accessible ring need not be replaced. |
| `hover-styles-only-where-hover-exists` — Hover styles only where hover exists | [Source](../vendor/good-css/upstream/PRACTICES.md#hover-styles-only-where-hover-exists) · [Specimen](../vendor/good-css/upstream/harness/demos/hover-styles-only-where-hover-exists.html) | Gate hover enhancement with both hover and fine-pointer conditions. Inspect emitted utility CSS and test mouse, touch, stylus and hybrid devices; keep press/focus feedback and all essential actions available without hover. |
| `press-feedback` — Press feedback | [Source](../vendor/good-css/upstream/PRACTICES.md#press-feedback) · [Specimen](../vendor/good-css/upstream/harness/demos/press-feedback.html) | Give immediate press feedback, including after removing native tap highlight. Use the accepted active state; if scale fits, keep it within the source's 0.95–0.98 range and gate its transition. Test pointer-down, keyboard activation, disabled controls and reduced motion; do not overwrite an existing transform pose. |
| `hit-area-larger-than-the-visual` — Hit area larger than the visual | [Source](../vendor/good-css/upstream/PRACTICES.md#hit-area-larger-than-the-visual) · [Specimen](../vendor/good-css/upstream/harness/demos/hit-area-larger-than-the-visual.html) | Enlarge a small icon/close target without changing its visual size. Test clicks outside the visual, adjacent target overlap, overflow clipping, zoom and pointer capture. Inputs need a label/wrapper rather than a pseudo-element; ensure the selected pseudo-element is free. |
| `whole-card-clickable-from-one-link` — Whole card clickable from one link | [Source](../vendor/good-css/upstream/PRACTICES.md#whole-card-clickable-from-one-link) · [Specimen](../vendor/good-css/upstream/harness/demos/whole-card-clickable-from-one-link.html) | Use a short semantic link with a stretched target where whole-card navigation is intended. Test link focus ring, open-in-new-tab and sibling controls; positioned ancestors change overlay bounds. The overlay prevents underlying text selection, so use this only where that product tradeoff is acceptable. |
| `has-for-parent-and-page-state` — `:has()` for parent and page state | [Source](../vendor/good-css/upstream/PRACTICES.md#has-for-parent-and-page-state) · [Specimen](../vendor/good-css/upstream/harness/demos/has-for-parent-and-page-state.html) | Derive presentation from descendant/content state, including native modal scroll lock. Verify `showModal()` versus a non-modal dialog, stable gutter, nested scroll owners and close/focus restoration. Do not nest `:has()`; essential behavior still works where the selector is unsupported. |
| `form-feedback-with-user-invalid` — Form feedback with `:user-invalid` | [Source](../vendor/good-css/upstream/PRACTICES.md#form-feedback-with-user-invalid) · [Specimen](../vendor/good-css/upstream/harness/demos/form-feedback-with-user-invalid.html) | Style native validation after user interaction. Add meaningful linked error text or another non-color cue, preserve server validation and test untouched/edit/blur/submit states with keyboard and assistive technology. The original fixture's color demonstration alone does not meet a production error-feedback contract. |
| `textarea-that-grows-with-its-content` — Textarea that grows with its content | [Source](../vendor/good-css/upstream/PRACTICES.md#textarea-that-grows-with-its-content) · [Specimen](../vendor/good-css/upstream/harness/demos/textarea-that-grows-with-its-content.html) | Use native content sizing for composers/comments with bounded height. Test paste, resize, IME, CJK, long content and maximum-height scrolling. Animate a wrapper only when requested, retain its content-box measurement and cleanup the observer; unsupported sizing must leave a usable scrolling textarea. |

### Motion — 6

| Exact practice slug and title | Original source and specimen | Project use and adaptation/verification condition |
| --- | --- | --- |
| `opt-in-motion` — Opt-in motion | [Source](../vendor/good-css/upstream/PRACTICES.md#opt-in-motion) · [Specimen](../vendor/good-css/upstream/harness/demos/opt-in-motion.html) | Add movement only within the accepted no-preference path, with the state change functional first. Test media-preference changes and scripted motion as well as CSS; avoid a global near-zero-duration override. In films the seekable authored state remains available independently of playback motion. |
| `motion-tokens` — Motion tokens | [Source](../vendor/good-css/upstream/PRACTICES.md#motion-tokens) · [Specimen](../vendor/good-css/upstream/harness/demos/motion-tokens.html) | Reuse accepted UI easing/duration tokens and named transition properties. Verify perceived feedback and the source's UI/modal ranges rather than copying a timing value blindly. The fixture deliberately slows curve comparison to one second; that diagnostic exception does not change production UI limits or film choreography. |
| `transition-a-custom-property-with-property` — Transition a custom property with `@property` | [Source](../vendor/good-css/upstream/PRACTICES.md#transition-a-custom-property-with-property) · [Specimen](../vendor/good-css/upstream/harness/demos/transition-a-custom-property-with-property.html) | Coordinate dependent component values or ease a script-fed number. Register a specific name once, declare valid syntax/default/inheritance and give transformed inline content a box. Test global-name collisions, reduced motion and dependent movement; script writes the value, CSS owns UI easing, film runtime owns seek state. |
| `shadow-change-that-fades-and-does-not-repaint` — Shadow change that fades and does not repaint | [Source](../vendor/good-css/upstream/PRACTICES.md#shadow-change-that-fades-and-does-not-repaint) · [Specimen](../vendor/good-css/upstream/harness/demos/shadow-change-that-fades-and-does-not-repaint.html) | Crossfade shadows when card count/blur makes measured painting cost relevant. Preserve background/isolation/stacking and inspect target paint traces rather than assuming a compositor guarantee. Both pseudo-elements are occupied; keep hit/link overlays on compatible separate owners. A small single element can use a direct shadow transition. |
| `cross-document-view-transitions` — Cross-document view transitions | [Source](../vendor/good-css/upstream/PRACTICES.md#cross-document-view-transitions) · [Specimen](../vendor/good-css/upstream/harness/demos/cross-document-view-transitions.html) | Enhance same-origin multi-page navigation where both documents opt in. Test real second-document navigation and unsupported-browser navigation; guard authored slides for reduced motion. This does not replace route/data behavior or deterministic film transitions. |
| `indicator-that-slides-to-the-active-item` — Indicator that slides to the active item | [Source](../vendor/good-css/upstream/PRACTICES.md#indicator-that-slides-to-the-active-item) · [Specimen](../vendor/good-css/upstream/harness/demos/indicator-that-slides-to-the-active-item.html) | Position a nav indicator from its semantic current item. Scope anchors per component, retain the positioned list and an independent active cue. Test two navs, label/font changes, wrapping, vertical/RTL axes, keyboard focus and unsupported anchor positioning; the source's links do not supply ARIA-tab interaction behavior. |

### Show and hide — 4

| Exact practice slug and title | Original source and specimen | Project use and adaptation/verification condition |
| --- | --- | --- |
| `enter-and-exit-transitions-from-display-none` — Enter and exit transitions from `display: none` | [Source](../vendor/good-css/upstream/PRACTICES.md#enter-and-exit-transitions-from-display-none) · [Specimen](../vendor/good-css/upstream/harness/demos/enter-and-exit-transitions-from-display-none.html) | Enhance native dialog/popover presentation using starting/discrete states. Keep selector compatibility, backdrop states and cascade order. Test enter/exit/Escape/focus return and reduced-motion movement; a snapping close is acceptable only when usable. Original fixture `commandfor` controls also need separate target support. |
| `popover-anchored-to-its-trigger` — Popover anchored to its trigger | [Source](../vendor/good-css/upstream/PRACTICES.md#popover-anchored-to-its-trigger) · [Specimen](../vendor/good-css/upstream/harness/demos/popover-anchored-to-its-trigger.html) | Position native click-open popovers with an implicit/source anchor. Retain span-based areas, mirrored gap and flip attempts; scripted opening passes the trigger. Test each viewport corner, large content, RTL, keyboard/Escape and centered unsupported behavior. Essential menus still need the product's semantics and focus model. |
| `accordion-that-animates-its-height` — Accordion that animates its height | [Source](../vendor/good-css/upstream/PRACTICES.md#accordion-that-animates-its-height) · [Specimen](../vendor/good-css/upstream/harness/demos/accordion-that-animates-its-height.html) | Use semantic `<details>` for disclosures and enhance auto-height where supported. Keep padding inside the content, deliberate shared `name` and marker behavior. Test open/close, keyboard/find-in-page, long answers, reduced motion and browsers that snap because they lack `interpolate-size`. |
| `reveal-with-clip-path` — Reveal with `clip-path` | [Source](../vendor/good-css/upstream/PRACTICES.md#reveal-with-clip-path) · [Specimen](../vendor/good-css/upstream/harness/demos/reveal-with-clip-path.html) | Reveal an overlapping unknown-height panel without measuring height. Preserve negative room for shadow, visibility/tab-order behavior and reduced-motion policy. Test hidden links cannot be hit or focused, authored open/close keyboard behavior and shadow edges; normal-flow disclosures must not leave a closed gap. |

### Scroll and viewport — 6

| Exact practice slug and title | Original source and specimen | Project use and adaptation/verification condition |
| --- | --- | --- |
| `carousel-on-native-scroll` — Carousel on native scroll | [Source](../vendor/good-css/upstream/PRACTICES.md#carousel-on-native-scroll) · [Specimen](../vendor/good-css/upstream/harness/demos/carousel-on-native-scroll.html) | Keep horizontal cards in a native scroll/snap container with optional arrow enhancement. Match padding/snap offset and test swipe/trackpad/keyboard/end states, empty content, resize and reduced motion. The original `scrollLeft`/`left` script assumes LTR and does not resync on resize; adapt and verify those cases for the actual product. |
| `scroll-area-between-a-fixed-header-and-footer` — Scroll area between a fixed header and footer | [Source](../vendor/good-css/upstream/PRACTICES.md#scroll-area-between-a-fixed-header-and-footer) · [Specimen](../vendor/good-css/upstream/harness/demos/scroll-area-between-a-fixed-header-and-footer.html) | Bound modal/chat/drawer content so the middle scrolls. Retain the size limit, zero minimum only on intermediate flex wrappers and nonshrinking header/footer. Test direct and wrapped bodies, short/long content, mobile `dvh`, gutter cost, chaining, focus visibility and viewport changes. |
| `styles-that-apply-only-when-a-scroller-overflows` — Styles that apply only when a scroller overflows | [Source](../vendor/good-css/upstream/PRACTICES.md#styles-that-apply-only-when-a-scroller-overflows) · [Specimen](../vendor/good-css/upstream/harness/demos/styles-that-apply-only-when-a-scroller-overflows.html) | Add optional overflow-edge cues using scroll timelines. Preserve default values and `animation-timeline` after the shorthand; test fit/overflow/start/middle/end, mask impact on focus and RTL gradient direction. Unsupported timelines leave a usable row; film cues derive from seekable state rather than live scroll. |
| `anchor-targets-that-clear-a-sticky-header` — Anchor targets that clear a sticky header | [Source](../vendor/good-css/upstream/PRACTICES.md#anchor-targets-that-clear-a-sticky-header) · [Specimen](../vendor/good-css/upstream/harness/demos/anchor-targets-that-clear-a-sticky-header.html) | Keep in-page targets clear of the actual sticky header via a shared offset token. Test responsive/header-height changes, anchors, keyboard navigation and reduced motion; retain the offset outside the optional smooth-scroll query. |
| `no-rubber-band-bounce-on-desktop` — No rubber-band bounce on desktop | [Source](../vendor/good-css/upstream/PRACTICES.md#no-rubber-band-bounce-on-desktop) · [Specimen](../vendor/good-css/upstream/harness/demos/no-rubber-band-bounce-on-desktop.html) | Suppress root vertical bounce only when the accepted app-shell scroll policy calls for it. Check desktop trackpad and real coarse/hybrid devices in a top-level page, restore desired touch pull to refresh and retain horizontal history gestures. Inner panels use their own deliberate containment policy. |
| `content-clear-of-the-notch` — Content clear of the notch | [Source](../vendor/good-css/upstream/PRACTICES.md#content-clear-of-the-notch) · [Specimen](../vendor/good-css/upstream/harness/demos/content-clear-of-the-notch.html) | Keep fixed phone headers/bottom bars/sheets clear of safe areas. Retain viewport-fit and `env()` fallbacks, combine inset with approved padding and avoid double-padding normal content. Verify notched-device orientation, home indicator and actual app-shell controls; desktop zero-inset output is not mobile evidence. |

## Offline live studies

The maintained Node helper builds every pinned specimen from its original fixture and the entry's
verbatim code, using bundled local assets. It needs Node 22.12+ and no new dependencies:

```bash
# From this repository, choose an output directory that does not already exist.
node skill/tools/good-css/build-study.cjs --output .design-pipeline/good-css-study

# From an installed skill, run the same helper relative to the skill root.
node tools/good-css/build-study.cjs --output <new-dir>
```

Serve the generated directory using the project's existing local/static server, then open its
`index.html`. Each practice runs at `specimens/<slug>.html`; bundled local assets are in `assets/`,
and `source/` retains the original practices and license for study. See the maintained
[builder README](../tools/good-css/README.md) for exact output and validation behavior. Keep the
helper's specimen navigation paths and local asset paths intact. Use a served
same-origin study for the cross-document transition specimen, which requires real navigation to
another document. A `file:` preview alone cannot establish browser navigation or secure-context
behavior. A safe-area or desktop overscroll specimen needs its own top-level page; an iframe and
a desktop capture cannot replace those device checks.

The builder refuses an existing output directory and never rewrites the vendored source. To
refresh a study, choose a new directory. It does not execute upstream `deploy/build.js`, Vite,
Bun, installers or deployment commands. Read
[harness/README.md](../vendor/good-css/upstream/harness/README.md) for the fixture contract:
unlayered entry CSS wins over fixture cosmetics, code is substituted at `<!-- html -->`, and
`data-specimen` describes the expected visible behavior. A fixture's diagnostic script, timer,
test controls or deliberate comparison is not production implementation authority.

Source HTML, CSS and JS are trusted only at the reviewed vendor boundary. Generated studies are
disposable local learning artifacts, not project components, an installable CSS framework or
automatic browser acceptance. Keep upstream presentation/fonts separate from the product's
approved design system. Re-review a new revision before reimporting and rebuild derived studies
and evidence whenever their source changes.

## Verification scope

The byte-preserved upstream [CSS text checker](../vendor/good-css/upstream/scripts/check-css.mjs)
runs directly under Node after source inspection and has no dependencies. From the skill root:

```bash
node vendor/good-css/upstream/scripts/check-css.mjs <stylesheet.css> <page.html>
```

It checks physical side declarations, some color syntax, removed outlines, ungated hover,
`ease-in`, broad transitions, literal duration ceilings and a subset of moving transitions. A
`.css` file is read whole; other files contribute only `<style>` blocks. Files with no readable
CSS are reported as unreviewed. Inline `style`, utility classes, dynamic CSS-in-JS, custom-property
dependent motion, at-keyframe behavior and production state are outside its complete coverage.
It does not prove token ownership, color contrast, press feedback, keyboard/focus semantics,
language support, browser compatibility, reduced-motion completeness or rendering performance.
Treat findings as source diagnostics and inspect the actual emitted CSS and UI.

The source generator [build-skill.js](../vendor/good-css/upstream/scripts/build-skill.js) retains
the original Markdown-to-reference generation rules, link checks and CSS-fence checks. It needs
upstream `marked` and its write mode replaces the upstream reference directory. Retain it for
provenance; normal pipeline use reads the packaged references and does not run the generator or
install its dependencies. Update the locked source through the existing reviewed-source process.

Record performed source/parity, package and representative browser checks in the existing change
`qa.md`. Keep unsupported features and untested target browsers explicit. Report **Component
Conformance** and **Visual Acceptance** separately: source integrity, offline assembly, text checks
and specimen browser smoke do not grant product conformance or creative/visual acceptance. Reuse
the existing v1 gates, target resolution, policy digest and receipt lineage; add no parallel gate
or receipt schema for this library.

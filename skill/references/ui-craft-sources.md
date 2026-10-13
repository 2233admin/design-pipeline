# UI Craft Rules

This is the project-owned UI craft rule index. The pipeline applies these rules itself; no
installed skill or network access is needed. The [measured audit](#measured-audit) checks what can
be measured on the rendered page: it runs in `verify interaction` and is required in the web `probe`
stage. The [review checklist](#review-checklist) covers the rest. The vendored originals and the
lintapple adaptation are provenance and detail: read one only when a rule needs its original
context, and only the file that rule cites. Upstream personas, "Initial Response" scripts,
slash commands and output formats are not pipeline behavior. Every result goes into the existing
review record in `qa.md` as Component Conformance evidence, never as Visual Acceptance.

Source keys used below. `LA` is a lintapple rule id, adapted in `scripts/interaction-audit.cjs`
(see [lintapple](#lintapple)). The other keys are vendored paths under the packaged skill root:

| Key | Vendored path |
| --- | --- |
| `EM` | `vendor/emil-design-eng/upstream/skills/emil-design-eng/SKILL.md` |
| `MI/` | `vendor/make-interfaces-feel-better/upstream/skills/make-interfaces-feel-better/*.md` |
| `FA` | `vendor/fixing-accessibility/upstream/skills/fixing-accessibility/SKILL.md` |
| `12P` | `vendor/12-principles-of-animation/upstream/skills/12-principles-of-animation/SKILL.md` |
| `ID/` | `vendor/interface-discipline/upstream/skills/*/*.md` (domain skill, then file) |
| `SC/` | `vendor/shadcn/upstream/skills/shadcn/rules/*.md` (only in a shadcn project) |

## Measured audit

Add one entry with `"kind": "audit"` to the `probes` of `interaction.json`
(`design-pipeline.interaction-probe.v1`); [workflow-web.md](workflow-web.md) gives the shape. Copy
thresholds from the project `DESIGN.md` tokens; a list replaces its default rather than merging.
A token may raise a floor, never lower it below the WCAG values (24px targets, 4.5:1 and 3:1).

| Code | Measures on every audited viewport | Default | Override (`DESIGN.md` token → probe input) | Sources |
| --- | --- | --- | --- | --- |
| `audit.font-family` | First computed family of visible text (code excluded) is a declared family | none; `thresholds.fonts` is required | `typography` families → `thresholds.fonts` | LA `font-family`; `ID/better-typography/choosing-fonts.md`, `MI/typography.md` |
| `audit.font-loading` | No `document.fonts` face reports `error` | none | none | LA `font-loading`; `ID/better-typography/SKILL.md` (load intended weights) |
| `audit.font-size` | Visible and generated text is at least `minFontPx`; with `fontSizes`, on that scale within 0.1px | 12px | `typography` scale → `thresholds.fontSizes`, `thresholds.minFontPx` | LA `font-size`; `ID/better-typography/spacing-and-sizing.md` |
| `audit.tabular-numbers` | Digits 0-9 of declared numbers and inferred numeric cells render at equal advance within 0.5px | none | `declare.numbers` | LA `tabular-numbers`; `MI/typography.md`, `ID/better-typography/variable-fonts-and-opentype.md` |
| `audit.numeric-alignment` | Inferred numeric table cells align to the end edge | none | none | LA `numeric-alignment`; `ID/better-layout/grouping-and-alignment.md` |
| `audit.text-contrast` | WCAG 2 ratio of visible and generated text over a resolved solid background (generated text over its own background, or the one behind its box); gradient, image, translucent, shadowed, overlapped or unplaceable paint, or opacity, a filter or blending on the text or any ancestor, is `indeterminate` | 4.5:1; 3:1 at ≥24px or bold ≥18.67px | `colors` roles are what is measured; stricter targets → `thresholds.contrastNormal`, `contrastLarge` | LA `text-contrast`; `FA`, `ID/better-colors/accessibility-contrast.md` |
| `audit.root-background` | The root paints an opaque background color | none | `colors` background | LA `root-background` |
| `audit.horizontal-overflow` | The document is no wider than the viewport | 1px | none | LA `horizontal-overflow`; `ID/better-accessibility/motion-and-zoom.md` (reflow) |
| `audit.viewport-bounds` | Visible boxes and text stay inside the viewport horizontally, overlays also vertically | 1px | none | LA `viewport-bounds`; `ID/better-interface/SKILL.md`, `ID/better-layout/spacing-and-adaptivity.md` |
| `audit.content-clipping` | Text is not cut by an `overflow: hidden` or `clip` ancestor without an inner scroller | 1px | none | LA `content-clipping`; `ID/better-typography/wrapping-and-punctuation.md` (truncation) |
| `audit.content-overflow` | Text stays inside each declared content box unless it scrolls | 1px | `declare.contentBoxes` | LA `content-overflow`; `ID/better-interface/SKILL.md` |
| `audit.target-size` | Each control's hit area (box plus an absolute `::before`/`::after`) is at least `minTargetPx` each way; a link inside a sentence (beside text in its own inline formatting context) is exempt | 24px | `components` control sizes → `thresholds.minTargetPx` (≥24) | LA `control-size` (15px default rebased); `ID/better-accessibility/hit-areas.md`, `MI/surfaces.md`, `FA` |
| `audit.control-gap` | Hit areas of controls in one group are at least `minControlGapPx` apart edge to edge, diagonals included, and never overlap | 8px | `spacing` → `thresholds.minControlGapPx` | LA `control-gap`; `ID/better-accessibility/hit-areas.md` (collision rule) |
| `audit.control-inset` | Controls inside declared containers keep `minControlInsetPx` from each padding edge | 8px | `declare.controlContainers`; `spacing` → `thresholds.minControlInsetPx` | LA `control-inset`; `ID/better-layout/spacing-and-adaptivity.md` (inset from edges) |
| `audit.layout-gap` | Visible children of declared stacks are at least `minLayoutGapPx` apart edge to edge, diagonals included | 8px | `declare.stacks`; `spacing` → `thresholds.minLayoutGapPx` | LA `layout-gap`; `ID/better-layout/grouping-and-alignment.md` (group with space) |
| `audit.layout-alignment` | Items of a declared group share the start, center or end edge | 1px | `declare.alignGroups` | LA `layout-alignment`; `ID/better-layout/grouping-and-alignment.md` (shared edges) |
| `audit.nested-radius` | Inner radius equals `max(0, outer - inset)` for declared pairs with even insets | 1px | `radius` tokens; `declare.radiusPairs` | LA `nested-radius`; `ID/better-ui/surfaces.md`, `MI/surfaces.md` |

`audit.font-family` and every check without a `declare` input always run; `thresholds.fonts` is
required. The optional selector checks are `audit.tabular-numbers` (declared numbers, plus inferred
numeric cells), `audit.content-overflow`, `audit.control-inset`, `audit.layout-gap`,
`audit.layout-alignment` and `audit.nested-radius`. A declared selector that matches nothing is a
failed finding.

The audit also classifies every request the page made at any viewport. A CDN or dev-server URL, or
a file outside the project, fails the verifier's existing `external-request` finding once per
probe, because the gate cannot hash it: self-host fonts, styles and scripts. This rule comes from
the project's evidence lineage, not from a vendored source.

Each check reports `passed`, `failed`, `not-declared`, `not-applicable` (nothing visible in scope)
or `indeterminate`, with a `checked` count; `checked: 0` is never `passed`. The audit fails on any
`failed` or `indeterminate` result at any viewport. An optional check without declarations reports
`not-declared` in the coverage; it is never counted as passed, and the review names the surfaces it
leaves unmeasured. No probe field skips a subtree or waives a result: fix the page, for example by
putting text on a measurable solid surface or scrim. Findings carry code, selector, viewport,
measured value, threshold and fix. A passing audit is Component Conformance evidence; it never
stands in for Visual Acceptance.

## Review checklist

Rules the audit does not measure. During web `review` and Stage 6, record each `UC-` id in `qa.md`
as passed, a finding (with `Introduced` / `Regression` / `Pre-existing` status) or not applicable
with a reason, under Component Conformance. Not restated here: the web treatment rules W1-W7
([web-direction.md](web-direction.md#review-rules-w1-to-w7), recorded only under Visual Acceptance
in [qa-checklist.md](qa-checklist.md)) and the review protocol (scope, six domains, severity,
finding status, removed signals) in [interface-discipline.md](interface-discipline.md#operating-protocol).

| Id | Check | Sources |
| --- | --- | --- |
| UC-01 | Motion earns its place: each animation names one purpose; keyboard-initiated, frequent and data-dense interactions get little or none; motion that adds nothing is removed. | `EM`, `MI/animations.md`, `ID/better-ui/animations.md`, [motion gate](animation-opportunity-and-review.md) |
| UC-02 | One element moves prominently at a time. | `12P` |
| UC-03 | Timing uses project motion tokens and stays in budget (see [Precedence](#precedence)); exits are faster than entrances; similar elements share timing; ease-out to enter and exit, ease-in-out to move on screen, linear only for constant-rate fills. | `EM`, `12P`, `MI/animations.md`, [motion gate](animation-opportunity-and-review.md) |
| UC-04 | Motion never blocks input: rapid toggles retarget instead of queueing, controls stay operable mid-animation, and controls at their default state do not animate on mount. | `EM`, `MI/animations.md`, `ID/better-ui/animations.md` |
| UC-05 | Trigger-anchored surfaces grow from their trigger and modals from center; scale entrances start at 0.9 or more, never 0; exits are softer, with a small offset. | `EM`, `MI/animations.md`, `ID/better-ui/animations.md` |
| UC-06 | Reduced motion reduces, not removes: no non-essential movement, parallax, autoplay, smooth scroll or auto-rotation; spinners and state changes stay; anything moving over 5s can be paused. | `FA`, `ID/better-accessibility/motion-and-zoom.md`, `MI/animations.md` |
| UC-07 | Changed motion is replayed slowed to about 10% through every state, then under rapid repeat, keyboard, reduced motion, mobile width, slow device and interruption. | `MI/SKILL.md`, `ID/better-ui/SKILL.md`, [motion gate](animation-opportunity-and-review.md) |
| UC-08 | Every control and pointer path works from the keyboard in visual order, with one consistent visible focus indicator that overflow and motion never hide; no positive `tabindex`. | `FA`, `ID/better-accessibility/focus-and-keyboard.md` |
| UC-09 | Composite widgets (tabs, menus, toolbars, listboxes, comboboxes) are one Tab stop with their arrow-key model; an ARIA widget role is fully implemented or not used. | `ID/better-accessibility/semantics-and-aria.md`, `ID/better-accessibility/focus-and-keyboard.md` |
| UC-10 | Dialogs take focus on open and return it to the opener; a modal traps focus over an inert page; Escape closes the newest layer first; toasts never take focus; a route change moves focus to the new view. | `FA`, `ID/better-accessibility/focus-and-keyboard.md`, `ID/better-accessibility/screen-readers.md` |
| UC-11 | Native elements first (`button` acts, `a href` navigates); every control has a name containing its visible text; decorative icons are hidden; one `main`, unskipped headings and `lang` set. | `FA`, `ID/better-accessibility/semantics-and-aria.md`, `ID/better-accessibility/screen-readers.md` |
| UC-12 | Fields keep a visible programmatic label (a placeholder is not one); hints show before the mistake; errors are text beside the linked field and submit focuses the first one; correct `autocomplete`, `type` and `inputmode`; paste allowed; mobile inputs ≥16px. | `FA`, `ID/better-accessibility/forms.md`, `SC/forms.md` |
| UC-13 | Alt text states what an image adds or names a functional image's action; decorative images are silent. | `ID/better-accessibility/screen-readers.md` |
| UC-14 | Buttons start with a verb that names the real action; no bare OK or Yes on consequential actions. | `ID/better-writing/SKILL.md` |
| UC-15 | One term per object and action across the product. | `ID/better-writing/SKILL.md` |
| UC-16 | Errors say how to fix the problem next to the field; decisions state the consequence first; destructive actions confirm, offer undo or look distinct, with initial focus on the safe choice. | `ID/better-writing/SKILL.md`, `ID/better-interface/SKILL.md`, `ID/better-accessibility/focus-and-keyboard.md` |
| UC-17 | Copy keeps actor, scope, limits, uncertainty and unchanged state, never widens a claim, uses plain words and flexes tone with stakes ([plain-language.md](plain-language.md)). | `ID/better-writing/SKILL.md` |
| UC-18 | Every component has the empty, loading, error, disabled and narrow states that apply; an empty state says what the place is and offers one next action. | `ID/better-writing/SKILL.md`, `ID/better-interface/SKILL.md`, `ID/interface-review/SKILL.md` |
| UC-19 | No hidden-only paths: a toast is never the only carrier of critical information or undo; toasts with an action or error stay until dismissed, timed ones last 5s or more and pause on hover or focus; collapsed content shows a cue. | `ID/better-layout/spacing-and-adaptivity.md`, `FA`, `ID/better-accessibility/screen-readers.md` |
| UC-20 | Color never carries state or meaning alone, and load-bearing color follows each locale's convention. | `FA`, `ID/better-colors/color-usage.md`, `ID/better-accessibility/forms.md` |
| UC-21 | Group with space first, background second, separators last; the key fact leads with room around it; each section has one dominant element. | `ID/better-layout/grouping-and-alignment.md` |
| UC-22 | A border that only shows depth uses the project elevation token instead. | `MI/surfaces.md`, `ID/better-ui/surfaces.md` |
| UC-23 | Type fits the surface and density; truncation is a product decision, never cover for an undersized component; CJK fallbacks are verified per platform ([cjk-typography.md](cjk-typography.md)). | `ID/better-typography/SKILL.md` |
| UC-24 | A control added to one surface is added to sibling surfaces carrying its peers; the primary workflow is visible without explanation text. | `ID/interface-review/SKILL.md` |

## Precedence

1. User decisions, project `DESIGN.md` and `MOTION.md`, and existing v1 contracts.
2. Pipeline protocols: [interface discipline](interface-discipline.md) (`better-interface`
   orchestrates review; findings keep `Introduced` / `Regression` / `Pre-existing` status in
   `qa.md`), the [animation opportunity and review gate](animation-opportunity-and-review.md),
   [Good CSS](good-css.md) for style authoring, `component-source-catalog.json` with
   `design-system route` for component sources, and `verify interaction` (including the measured
   audit) for interaction evidence.
3. Bundled craft detail: `emil-design-eng`, `make-interfaces-feel-better`,
   `fixing-accessibility` and, only in a shadcn project or for a selected shadcn-registry route,
   `shadcn`.
4. Checklists: `12-principles-of-animation`.

Resolved conflicts:

- Contrast: the WCAG 2 ratio decides pass or fail; the APCA levels in
  `ID/better-colors/accessibility-contrast.md` are advisory. Large bold text uses the exact 14pt
  value, 18.67px.
- Targets: 24×24px is the floor (`audit.target-size`). 40px desktop and 44px touch are advice that
  product density may waive; 48dp is not adopted.
- Nested radius: compute concentric radii only when the layers share a visible, even inset of at
  most 24px; otherwise keep the component's radius tokens. `DESIGN.md` radius tokens fix the inner
  radius the outer derives from.
- CJK text: [cjk-typography.md](cjk-typography.md) overrides the Latin measure, line height,
  tracking and emphasis-weight rules for CJK text; Latin text keeps them.
- Press feedback: immediate feedback is required, a press scale is optional per component; when
  used it stays within 0.95-0.98 and is gated by reduced motion.
- Duration: user-initiated UI motion finishes under 300ms; longer modal or explanatory motion must
  state why it needs the extra time ([animation-opportunity-and-review.md](animation-opportunity-and-review.md)).
- Curves: project motion primitives win; Emil's curves are a fallback only when no primitive fits,
  recorded as an authored extension.
- Exit easing: the 12-principles rule `easing-exit-ease-in` conflicts with Emil's rule never to
  use ease-in for UI animation. Use the project's exit token; without one, use ease-out.
- Stagger: the 12-principles 50 ms per-item cap and Emil's 30-80 ms range both yield to the
  project's stagger token; without one, the whole cascade stays inside the duration rule above.
- Any checklist rule that conflicts with a higher level is recorded as not applicable, with the
  governing source named, not as a finding.

## Stage integration

- **Stage 0 and 3:** detect `components.json`, React, the styling system, a motion runtime and
  `playwright-cli` use (an absent trigger loads nothing); make motion decisions inside the motion
  gate's opportunity screen and record the tokens the audit will copy.
- **Build:** choose components through `component-source-catalog.json` and `design-system route`
  (SmoothUI's `npx shadcn@latest add <registry url>` is the shadcn-registry case) and express craft
  details in the existing styling system. **Probe:** pass the audit. **Review:** walk the checklist.

## Execution boundary

- **shadcn:** run the shadcn CLI only when the project has `components.json`, or after the user
  approves a selected component route that installs from a shadcn registry, and always through
  the project's package runner. Never run the `!` context-injection line at the top of
  `vendor/shadcn/upstream/skills/shadcn/SKILL.md` automatically; run `info` deliberately when the
  context is needed. Without that approval, never introduce shadcn into a project that does not
  use it; keep the existing component owner.
- **playwright-cli:** an optional exploratory driver only when the project already uses it or the
  user approves running it; a copy installed elsewhere on the machine is not approval. Its
  snapshots and screenshots are not receipts; interaction evidence stays with
  `verify interaction`.
- **react-doctor:** an optional, user-approved run in React projects as described in
  [react-doctor.md](react-doctor.md).

No source adds a gate, receipt field or CLI flag, or changes how Component Conformance and Visual
Acceptance are reported. Vendored scripts, evals and agent metadata are never executed.

## Provenance

Six sources are pinned, inert snapshots, each in a vendor directory named after it:
`manifest.json` records the reviewed repository, revision, scope, license and per-file hashes,
and `upstream/` holds the byte-preserved files.

### emil-design-eng

Emil Kowalski's design-engineering judgment on whether and how to animate, springs, press feedback,
gestures and reduced motion: [`SKILL.md`](../vendor/emil-design-eng/upstream/skills/emil-design-eng/SKILL.md).
It is a different skill from the four Emil motion skills distilled in the motion gate.

### make-interfaces-feel-better

Jakub Krehel's interface details (radii, alignment, shadows, numbers, wrapping, hit areas, icons,
exits): [`SKILL.md`](../vendor/make-interfaces-feel-better/upstream/skills/make-interfaces-feel-better/SKILL.md),
then one of `typography.md`, `surfaces.md`, `animations.md`, `icons.md` or `performance.md`.

### fixing-accessibility

Julien Thibeaut's prioritized accessibility rules:
[`SKILL.md`](../vendor/fixing-accessibility/upstream/skills/fixing-accessibility/SKILL.md). Report
through the interface-discipline accessibility domain, not its standalone report shape.

### 12-principles-of-animation

Raphael Salaja's motion checklist, lowest precedence, used only on changed motion code:
[`SKILL.md`](../vendor/12-principles-of-animation/upstream/skills/12-principles-of-animation/SKILL.md).

### shadcn

The official shadcn/ui skill: CLI workflow, styling, forms, composition, registries, customization
and design-system pages, used only under the [execution boundary](#execution-boundary). Start at
[`SKILL.md`](../vendor/shadcn/upstream/skills/shadcn/SKILL.md), then `rules/*.md` or the matching
file. Its DESIGN.md flow never replaces the project's own foundation.

### playwright-cli

Microsoft's agent-facing Playwright command line for exploratory driving, used only under the
[execution boundary](#execution-boundary). Start at
[`SKILL.md`](../vendor/playwright-cli/upstream/skills/playwright-cli/SKILL.md) and read one
`references` file only for the task it names.

### react-doctor

A third-party React health-scan CLI with a 0-100 score, cited through the pinned record
[react-doctor.md](react-doctor.md). Its modified MIT license permits copying and distribution but
requires the copyright holder's prior written permission to use it as AI training or evaluation
data or as input to an automated pipeline that improves an AI system, so this project chooses not
to bundle it.

### lintapple

The measured audit adapts the in-page visibility, geometry and page-design rule logic of
[gholtzap/lintapple](https://github.com/gholtzap/lintapple) at revision
`90ddc736af6f2712903d53dd9a463445e109f586` (MIT, `Copyright (c) 2026 Gavin Holtzapple`), rewritten
as CommonJS in `scripts/interaction-audit.cjs` with its notice. It is adapted, not vendored: no
lintapple file, policy file, CLI, Playwright helper or axe-core dependency ships. Changes: thresholds
come from probe inputs, selectors replace `data-ui-*` markers, the target floor is 24px instead of
15px, tabular digits are measured, and the `copy` rule and axe-backed rules are not ported.

## Maintaining the snapshots

Import or refresh a vendored source only from a clean local checkout at its reviewed revision:

```bash
npm run sources:import:ui-craft -- --name <name> --source <clean reviewed checkout> --reviewed-at YYYY-MM-DD
```

Then run `tests/ui-craft-sources.test.cjs`, keep `references/package-resources.json` listing
exactly the vendored files, and update the third-party notices. Never execute vendored code,
hand-edit `upstream/` bytes or refresh a manifest by rehashing arbitrary source. A lintapple update
is a reviewed port at a new revision with its notice and the audit tests, never a dependency.

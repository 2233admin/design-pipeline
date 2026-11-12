---
sourceMeta:
  id: tactile-design
  kind: github
  url: https://github.com/kosta4a/tactile-design/tree/30495a2db7cb59a72bacea106118ffeab7af00d9
  reviewedRevision: 30495a2db7cb59a72bacea106118ffeab7af00d9
  reviewedContentHash: 155cc17823beda7a87d9f2b69197ba13d19dc78888fee5b7d25f9de9b4563fb6
  contentHashScope: ordered UTF-8 sourceFiles with path-and-newline separators
  sourceFiles: skills/tactile-design/SKILL.md, skills/tactile-design/references/tokens.md, skills/tactile-design/references/buttons-and-controls.md, skills/tactile-design/references/surfaces-and-layering.md, skills/tactile-design/references/layout-and-hierarchy.md, skills/tactile-design/references/motion.md, skills/tactile-design/references/mobile.md, skills/tactile-design/references/decisions.md, LICENSE
  reviewedAt: 2026-11-12T00:00:00.000Z
  freshnessDays: 365
  license: MIT
  useBoundary: reference-only; an opt-in design direction restated in this project's words and values; do not install the upstream skill or copy, import or execute its files, CSS template or Tailwind mapping
---

# Tactile product UI (an opt-in design direction)

One named look for product interfaces (dashboards, settings, forms, tables, modals and sheets):
**tactile, layered, quiet**. Controls read as objects, every surface takes its fill, edge and drop
from the surface under it, and hierarchy comes from contrast steps instead of bold type or colour.

- Source: [kosta4a/tactile-design](https://github.com/kosta4a/tactile-design/tree/30495a2db7cb59a72bacea106118ffeab7af00d9),
  MIT. It was distilled from one production dashboard, so read it as one product's look, not as a
  law of UI.
- Not bundled: the upstream skill folder, its 186 KB of references, its CSS template and its
  Tailwind mapping do not ship. Do not install or copy them. The values below are the ones worth
  keeping, written for this project.
- **Status: a direction, not a rule layer.** Nothing here is added to the default UI rules. It is
  read only when the brief names it (`tactile-design`, "tactile UI") or asks for this look. Whether
  generic UI rules improve output at all is the open question of the ablation in #372; this guide
  does not pre-empt it and is a candidate variant there, not a verdict.

## 1. Where it sits in the pipeline

1. **The project's `DESIGN.md` governs.** This direction supplies candidate tokens and recipes for
   its Product Context and Source Decisions ([design-md.md](design-md.md)); once the project has
   its own palette, typeface and tokens, remap onto them (section 9) and keep the roles.
2. **The measured audit stays the gate.** `verify interaction` and its rules (for example
   `audit.target-size`, a 24 px floor) judge the page. The 36 / 44 px control heights below are this
   direction's values, not new gates; see [ui-craft-sources.md](ui-craft-sources.md).
3. **Motion, mobile and CJK defer to the references that exist**: [motion-vocabulary.md](motion-vocabulary.md),
   [mobile-web.md](mobile-web.md), [cjk-typography.md](cjk-typography.md). Where numbers differ,
   take the project's own reference and say so in the decision.
4. **Not for** marketing heroes, posters, game or film UI. Those use the template bank, the
   style packs or [web-direction.md](web-direction.md).

## 2. Decision order

Work top to bottom; most weak UI starts at step 4.

1. **Hierarchy.** Name the one next step on this surface. That is the single primary action, or
   there is none. Rank the rest: secondary, utility pill, ghost text. A destructive action is never
   the primary.
2. **Amount of data.** The least that answers the question: one strong figure over six small ones,
   lists of 5 to 6 rows then "View all", sections hidden while empty or finished.
3. **Placement.** Column by page type (800 px reading, 1200 px data, 440 px form or flow). Section
   actions sit right of the title, above the data; paging sits below the data, outside its card.
4. **Component.** Plain rows for lists and navigation, a card for one unit of related data, a table
   for many records, inline before modal, a modal only for a focused task or a confirm (a bottom
   sheet on a phone), a toast only for a result the user cannot otherwise see.
5. **Surface and layer** (section 3).
6. **Type and spacing.** One weight; hierarchy is a size step plus an ink step. 4 px grid.
7. **Colour roles.** Neutral carries structure; hue carries meaning only (status or identity), as a
   tint with its text step. Hue never ranks importance.
8. **Motion gate.** Move only with a named purpose; frequent things barely move.
9. **Phone.** 44 px targets, 15 px text floor, 16 px in fields, dialogs as sheets.
10. **Review** at 4 to 8 times zoom in both themes: 1 px seams, double borders, mismatched radii,
    wrapped labels, layout jumps, unmatched siblings.

Working posture: smallest change that fixes it; reuse the product's own recipe before inventing;
remove before adding (borders, containers, icons, eyebrows); siblings share height, padding, radius
and ink; a rule decided once is applied to every instance in the same change.

## 3. Surfaces take their look from their parent

A tactile thing has a fill, an edge and a drop, and none is a fixed value.

| Part | Light | Dark |
| --- | --- | --- |
| Fill | the top surface (white) | parent plus 2 steps for a control, plus 1 for a card |
| Edge | 1 px ring, ink at 8% alpha (7% on cards and modals) over whatever is beneath | one solid 0.5 px outline, the same colour all round, 3 steps above the control's fill; never a lit top edge |
| Drop | `0 1px 2px 0` at 12% ink | `0 1px 2px 0` at 50% black; always darker than the parent, never a glow |
| Badge edge | its own text colour: ring 14%, drop 16% | its text colour mixed 34% into black, plus the black drop |

- **The shadow ladder is crisp.** Every level is the ring plus the 1 px drop, with at most one short
  tight extra drop: card `0 3px 4px -2px`, menu `0 4px 8px -4px`, modal `0 6px 8px -4px`. A table
  takes the button's drop alone. No large soft blur anywhere.
- **Dark elevation is lightness and a 0.5 px outline, not shadow.** Every dark edge is 0.5 px; sizes,
  padding and radius never differ between themes, only colour and shadow values.
- **White on white** (a secondary button on a white card, a neutral badge) gets its edge from the
  ring and drop, never from a fill change.
- **A variable resolves where it is declared.** An edge built from a working step must be
  redeclared on each surface class, or it keeps the root step and stops following its parent.
  Edges and drops drawn in alpha need no redeclaration.
- **Step shift.** Draw components as if on the lightest ground; a container on a darker ground
  remaps steps 1 to 7 inside itself (a rail on the second step: 1 becomes 2, 2 becomes 3, and so
  on), so children keep their contrast. Text steps never move.

Layer stack, bottom to top: ground (window, rail) → panel (page body, floats 8 px off the window,
radius 8) → raised (cards, buttons) → well (fields sink: one step darker in light, lighter in dark)
→ table → overlay (menu, popover, modal) → toast. In dark the ground sits below the first step, so
the darkest thing is furthest back.

## 4. Token roles

Write components against roles, never hex codes; a literal px or hex inside a recipe is a bug,
because a remap cannot reach it.

**Neutral ("ink"), twelve steps, each with a job**

| Steps | Job |
| --- | --- |
| 1 to 2 | grounds; step 2 is also the raised surface in dark |
| 3 to 5 | quiet fills: field well, chip, selected row; hover and pressed |
| 6 to 8 | hairline and control ring; strong line; rare disabled text |
| 9 to 10 | faint: icons, meta, placeholders, chevrons |
| 11 | secondary text: descriptions, body |
| 12 | strong text; the primary fill |

Contrast gates before shipping a remap: step 12 at 7:1 on steps 1 to 3; step 11 at 4.5:1 on step 3;
step 10 at 4.5:1 only if it carries meta or labels (otherwise placeholders and icons at 3:1); the
hairline step at 1.35:1 against the top surface; the focus ring at 3:1 on white, wells and dark
surfaces. Text a user must read to act passes 4.5:1. Choose the neutral once; never mix the brand
hue into neutral steps.

**Hue scales** (also twelve steps, a few used): 3 tint fill, 6 edge on a tint, 9 solid (dots, bars,
the destructive confirm, a switch that is on), 10 solid hover, 11 text on a tint. A tint is step 3
with step 11 text. Status roles are fixed (success green, danger red, warning amber, info blue,
inactive neutral); an identity hue (a category or tier) must be a non-status hue, and a brand hue
within about 25 degrees of a status hue becomes that status.

**Lines.** One hairline weight, 0.5 px, in the sixth neutral step (one step darker in dark). Marks
and icon strokes 1.5 px. Focus: one token, 2 px outline offset 2 px, on every control.

**Radius.** Set one control radius (4 to 8 px, default 6) to match the icon set; the ladder follows:
half for key chips, control minus 2 for check marks, control plus 2 for containers, 1.5 times that
for feature cards, 14 px fixed for phone sheets, full for pills and badges. A nested radius is the
outer radius minus the border.

**Type.** One sans for all UI and one mono for machine values only. One weight, the one at which the
sans reads solid at 13 px; bold is rare. Absolute line heights:

| Role | Desktop | Phone |
| --- | --- | --- |
| Display (rare) | 32/40, tracking −0.02em | 32/40, or 24/32 if it wraps past two lines |
| Figure | 24/32, tabular figures | same |
| Section title | 20/28 | 20/28 |
| Card, dialog title | 16/24 | 16/24 |
| Body, controls | 13/20 | 15/24 |
| Meta | 12/16 | 15/20 |
| Field text | 13/20 | 16 on any touch screen (a smaller field makes iOS zoom) |

Another face is fitted in four steps: match apparent size (`font-size-adjust` at Inter's ratio,
0.546), pick the weight by ink coverage against the reference at 13 px (ties go lighter, never a
synthesised weight), keep or zero the tracking by how loose the face is, and require tabular
figures and a real ellipsis. CJK: base 14/22, phone 16/24, no negative tracking.

**Sizes.** 4 px grid with 2 px half-steps (2, 4, 6, 8, 12, 16, 20, 24, 32, 48, 64). Control 36 px
desktop and 44 px phone; compact 32; pill and toggle option 28; inline action 24; row icon 22;
badge 20; key chip 18; table row 38 desktop, 44 phone.

**Motion tokens.** One strong ease-out `cubic-bezier(.23, 1, .32, 1)` for anything the user caused,
hover and colour included; durations hover 150 ms, swap 200 ms, modal 240 ms, move 300 ms.

## 5. Controls

| Item | Default |
| --- | --- |
| Primary | the strong text step as fill, the first step as text; one per surface; light adds a 1 px ring in the surface colour, dark a 0.5 px outline in its own fill |
| Secondary | white with the button shadow and no border; dark: two steps above its ground with the 0.5 px outline |
| Utility pill | fully round, 28 px, white; belongs to content (copy, filter, back) |
| Badge | fully round, tint plus text step, the badge edge above; a neutral status is white |
| Field | a well: third-step fill, no border; focus deepens one step plus the focus ring on keyboard focus |
| Destructive | the trigger is white with red text; solid red only on the final confirm inside its dialog |
| Press | `scale(.97)` in 150 ms; smaller targets squeeze more (.92 at 22 px), cards less (.99) |
| Disabled | .6 on buttons, switches and fields; .4 on icon buttons |
| Loading | the label swaps in place to a spinner and a verb, in the same button |
| Field error | 1 px red ring, a 12/16 red message under it, validate on blur and submit |

No grey filled button in light (it reads as disabled). In a "give something up" dialog the keep
option is the primary. Confirm buttons name the action. Cancel is white and sits left of the
confirm. Copy feedback is the icon turning into a tick at the click, with no toast.

## 6. Layout, data and states

- **Figure over label**: a 24/32 number, the 13/20 label directly under it. Number of strong
  figures per block: one.
- **Empty**: a bare centred panel, an 18 px icon, two lines (what is missing, what to do); the
  header and pager hide. **Failed load**: the same layout plus one secondary "Try again".
- **Worst-case data**: free text truncates past 32 characters with a tooltip, figures over six
  digits go compact, a missing value is an en dash. Preview empty, loading, error, long and short.
- **Tables**: 38 px rows, 0.5 px frame and dividers, one fill (stripes only on long tables), header
  and first column in the strong step, other cells in the faint-text step (secondary if it misses
  4.5:1), every cell left-aligned, tabular figures, status as a dot in its hue, the frame hugging
  the last row, paging outside below.
- **Modals**: 620 px default, 460 px confirm; header, body, footer split by full-width hairlines;
  focus the first field, trap Tab, lock scroll, return focus to the trigger; never stack two.
- **Menus**: 36 px items 2 px apart; hover is local ground plus 1, chosen is plus 2 with no tick;
  each row fades its own fill in place, never one highlight sliding between rows.

## 7. Motion gate

Ask first whether it should move: the more often it is seen, the less it moves, and keyboard
actions, drag, resize and data figures never animate. If it moves, name one purpose, animate
transform and opacity only, enter from .95 to .97 (never from 0), exits faster than entrances,
modal in 240 ms (16 px rise, 4 px blur) and out 200 ms, sheet up 320 ms and down 200 ms, menu in
150 ms from `scale(.97)` at the trigger. Toggle pills use a spring of bounce .12 over 0.4 s and a
switch knob .2 over 0.45 s so the overshoot stays inside the track. Reduced motion becomes a 150 to
200 ms crossfade. Never `transition: all`, ease-in on UI, or keyframes on something re-triggerable.

## 8. Phone

44 px targets (a small visual keeps its look and gets an invisible 44 by 44 hit area), 15 px text
floor, 16 px fields, 20 px gutters, actions stacked full width with the confirm on top, dialogs as
bottom sheets with 14 px top corners and a grab handle instead of a close mark, a sheet drag that
starts after a 4 px move and closes past the smaller of 64 px or 15% of its height or on a fast
flick, nothing that exists only on hover, no scrollbars or rubber-banding.

## 9. Remap to the project

1. Pick the neutral once for both themes and run the contrast gates (section 4).
2. Generate light and dark scales for each brand colour; map status roles to the nearest hue.
3. Set the primary: the strong neutral by default; an accent primary only when the brand requires
   it, with that hue removed from status use.
4. Set the shadow ink to the light strong text step as RGB; dark shadows stay black.
5. Set the typeface and run the four-step fit; set the control radius.
6. Leave heights, the hairline, shadow geometry, durations and spacing alone, and change them only
   on purpose and everywhere at once.

## 10. Never ship

More than one primary, or a primary that is not the real next step; a grey filled button in light;
several coloured fills on one surface; a destructive primary; a dark style that changes padding,
height, radius or border width; a fixed fill, edge or drop that ignores its surface; a large soft
blur; in dark, a lit top edge, an edge over 0.5 px, or a shadow lighter than its parent; double
borders; structural lines over 0.5 px; hierarchy made by bold or by colour; text to act on under
4.5:1; actions placed below the data they act on; fake data; layout that jumps when data arrives;
an eyebrow label, a "Step 1 of 4" over a bar, or a warning icon before an alert title; Title Case
labels and em dashes in UI copy; a toast for a copy; hover-only information; touch targets under 44
px; no reduced-motion path; unchecked zoom in both themes.

## 11. Checklist

- The brief named this direction, or asked for this look; otherwise it was not used.
- Roles, not hex codes; the project's `DESIGN.md` and palette win where they differ.
- One primary at most; hue only for status or identity; every surface takes its parent's edge.
- Light and dark share every size; dark differs only in colour and shadow.
- The measured audit and `template check` / `verify interaction` pass; a pass is technical
  conformance only and grants neither visual nor creative acceptance.

## What was not adopted

- The upstream skill folder, install paths, README and the Radix-sand default values as a shipped
  palette; the CSS custom-property template and the Tailwind v4 mapping (they are code to copy).
- The "designer's recurring decisions" file and worked example, which record one product's review
  history rather than rules.
- Any claim that these rules apply to every interface. They are a named look, selected on request.

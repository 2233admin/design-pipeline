# Design: Fix Audit CodeRabbit Limits

## Context

`audit-rendered-ui-craft` (archived 2026-10-13) added the `audit` probe to `verify interaction`.
This change corrects four geometry and paint decisions in `skill/scripts/interaction-audit.cjs`. It
adds no audit code, probe field, flag, gate, receipt schema or dependency, and no file moves. The
archived change keeps its records as they were when it was archived; the rule rows below supersede
its `audit.text-contrast` and `audit.target-size` rows, and `skill/references/ui-craft-sources.md`
carries them.

## Decisions

### Pseudo-element boxes are placed, or not used

`absolutePseudoBox` returns the border box of an absolutely positioned `::before` or `::after` of a
positioned element, placed by its resolved insets and margins in the element's padding box. It is
used only when `left + margin-left + width + margin-right + right` (padding and border added unless
`box-sizing: border-box`) matches the containing block within 1 px, and likewise vertically.
Otherwise CSS has ignored an inset, so the box is unknown and the function returns null: the
pseudo-element widens no target, and generated text in it cannot be placed. An inline host on one
line uses its border box less its borders as the padding box, where `clientWidth` and
`clientHeight` are zero; an inline host that wraps returns null.

With margins placed, the earlier rule that left margin-moved generated text `indeterminate` is
removed; that text is measured against the background behind the moved box.

### Paint over generated text on its own fill

Generated text on its own fill reads against that fill, but paint over it is ruled out only over a
located box, so own-fill text that is transformed, offset by relative or sticky positioning, or
otherwise unplaced is `indeterminate`. Over a located box the existing overlapping-paint check runs
with the host as the background provider. For an absolute pseudo-element, whose box is exact, the
host's painted descendants count too, and hit testing decides their side: the pseudo-element answers
as its host, so a child beneath the badge passes and a child above it does not. In flow, the
generated box is approximated by the host's box, so descendants stay excluded there, as for other
text.

The host's other pseudo-element shares the stacking context. When it is out of flow, paints a
background, and sits on a higher layer (z-index, with in-flow content below `auto`) or on the same
layer later in tree order (`::after` over `::before`), it covers the text where its box intersects;
when its box cannot be located, it is assumed to cover.

### A sentence ends at a line break

A link's sentence is the run of its inline formatting context between the nearest `<br>` or in-flow
block box before it and the next one after it. Only painted, visible text in that run exempts the
link. A rendered-line test was rejected: a sentence whose link wraps alone onto the next line is
still a sentence under WCAG 2.5.8, and a line test would pass at one viewport and fail at another.

## Rule Rows

| Code | Measurement |
| --- | --- |
| `audit.text-contrast` | Generated `::before`/`::after` text is measured over its own background when it paints one, otherwise over the background behind its box: the element's box in flow, or the border box of an absolute pseudo-element of a positioned element, placed by its insets and margins. Text over overlapping paint, generated text included over the box it is placed at, and generated text, on its own background or not, that is transformed, offset by relative positioning, sticky, or cannot be placed (as when an absolute pseudo-element's size, margins and insets over-constrain each other), is `indeterminate`. |
| `audit.target-size` | A control's hit area is its box widened by the border box of an absolutely positioned `::before` or `::after`, placed by its insets and margins in the control's padding box; a pseudo-element whose size, margins and insets over-constrain each other, or of an inline control that wraps, widens nothing. An inline link is exempt only beside visible, painted text on its own line run: in its own inline formatting context with no `<br>` or in-flow block box between them. |

## Compatibility

Pages that passed `probe` may now fail it or report `indeterminate`. A page whose generated text sat
on a margin-moved pseudo-element and was `indeterminate` now gets a measured ratio.

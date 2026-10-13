# Proposal: Fix Audit CodeRabbit Limits

## Problem

The `audit` probe from the archived change `audit-rendered-ui-craft` still passes or fails some pages
for the wrong reason. CodeRabbit's review of #101 at `8b6a417`, and Codex's review of this
follow-up, found four cases:

- Generated `::before`/`::after` text on its own fill was measured against that fill without checking
  paint over it, so a translucent element, a positioned child of its host or the host's other
  pseudo-element could cover a badge and it still passed.
- A link was exempt from target size and control spacing as part of a sentence when any painted text
  shared its inline formatting context, so `<p>Introduction<br><a>Go</a></p>` exempted a link that
  stands alone on its line.
- An absolute pseudo-element's box was built from its four insets even when its size over-constrained
  them, so a 2px `::after` with negative insets widened its control as if it filled them. An inline
  host's padding box was taken as zero-size, so a valid hit-area expansion on an inline link was
  under-counted and could fail.
- With margins not placed, generated text that its margins moved off its host was reported as "moved
  by its margins" instead of being measured where it sits.

## Scope

- Place an absolute pseudo-element's border box by its insets and margins, only when size, margins
  and insets add up to the containing block; otherwise it widens no target and its text cannot be
  placed. An inline host on one line uses its own padding box.
- Check generated text on its own fill for paint over its located box, including the host's painted
  descendants over an absolute box and the host's other pseudo-element above it; own-fill text that
  cannot be placed is `indeterminate`.
- End a link's sentence at a `<br>` or an in-flow block box. A sentence that wraps keeps its link
  exempt, so results do not depend on the viewport width.
- Out of scope: new audit codes, probe fields, CLI flags, gates, receipt schemas or dependencies, and
  any change to Visual Acceptance.

## Reuse

- The `audit` probe, `verify interaction`, the `interaction` gate and the existing finding shapes.
- The existing overlapping-paint check and its hit testing, `clientBounds`, and the generated-text
  placement rules.

## Affected Capabilities

`design-pipeline`: interaction verification audits rendered UI craft.

## Success Criteria

- Each new regression in `tests/interaction-audit.test.cjs` fails on the engine it fixes and passes
  after; the clean and violating fixtures keep their results.
- Pages that passed `probe` may now fail it or report `indeterminate` where paint covers generated
  text, a link stands alone after a line break, or an over-constrained pseudo-element was counted.

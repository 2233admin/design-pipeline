## Why

Closes #237. `verify interaction` measures resting typography, contrast, overflow and targets, but three
things that agent design skills now check mechanically pass it unmeasured:

- Reading: a paragraph can run 140 characters a line or be set at line-height 1.1, and a page can jump
  from `h2` to `h4`. `UC-11` names unskipped headings, but only as a review item.
- Reduced motion: the anti-slop rule `content-available-without-motion` is hard, yet its evidence is
  free text. The classic bug (content starts at `opacity: 0`, an entrance animation reveals it, the
  reduce query removes the animation and the content never appears) passes every gate, as does an
  infinite drift that ignores the preference.
- States: text contrast is measured only at rest. A hover color that drops to 2:1, or a control whose
  `:focus-visible` removes the outline without a replacement, passes.

## What Changes

The existing audit probe of `verify interaction` gains five codes in its `AUDIT_CODES` list, measured
at every declared viewport, with the existing finding shape (code, selector, viewport, expected,
actual, fix) and coverage statuses:

- `audit.line-length` and `audit.line-height` (optional, `declare.bodyText`): widest rendered line of
  declared running text in `ch` of its own font, at most `maxLineCh` (80); line-height at least
  `minLineHeight` (1.3), `normal` measured from the font.
- `audit.heading-levels` (required): no heading more than one level below the one before it.
- `audit.reduced-motion` (required): each viewport also loads the page with
  `prefers-reduced-motion: reduce` and reads it one second after load; content visible without the
  preference but hidden under it by opacity 0, `visibility` or a transform out of view fails, and so
  does a running animation or transition that moves anything but opacity or color.
- `audit.state-contrast` (required): after the resting audit, `:hover`, `:focus-visible` and
  `:active` are forced on every control with CDP `CSS.forcePseudoState`; text a state changes meets
  the text-contrast floors, and each focusable control shows a `:focus-visible` indicator of at
  least `contrastFocus` (3:1) against what it sits on.

New probe inputs, copied from DESIGN.md like the others: `thresholds.maxLineCh`,
`thresholds.minLineHeight`, `thresholds.contrastFocus` and `declare.bodyText`.

## Capabilities

- `design-pipeline`: ADDED `Interaction audit measures reading`, `Interaction audit measures reduced
  motion`, `Interaction audit measures state contrast`.

## Reuse

- The audit probe, `auditPage`, `validateAuditProbe`, `summarizeAudit`, the coverage statuses, the
  optional-check mechanism (`DECLARATIONS`, `not-declared` hints) and the WCAG contrast and background
  resolution of `audit.text-contrast`. No new gate, command, flag, receipt or schema.

## Impact

- Every audit probe now loads each viewport twice and forces three states: about one second and one
  extra load per viewport.
- Pages that pass today can fail the three required codes after this change: a skipped heading level,
  content lost or motion still running under reduced motion, a state below contrast or a missing
  focus indicator. Each is a real defect with a one-line fix in the finding. The two reading checks
  are optional and change nothing until `bodyText` is declared.

# Proposal: the interaction audit measures what a page animates

## Why

Agents write motion that runs and is still wrong: `transition: all`, an animated `height`, a blur
that never stops, a loop that keeps running below the fold. The package already says so in text
(`animation-opportunity-and-review.md` section 5, `interface-defaults.md`, the bundled
`emil-design-eng`), and `ui-rule-coverage.json` maps the same rules from `baseline-ui`,
`fixing-motion-performance` and Vercel's guidelines. None of it is measured. Of the motion rules,
`verify interaction` judges only reduced motion (`audit.reduced-motion`), so a page can break every
one of the others and pass the web `probe` stage. Seventeen rule rows wait on this change (#355).

Closes #355 (part of #346).

## What changes

- `skill/scripts/interaction-audit.cjs` gains the required code `audit.motion-properties`, appended
  to `AUDIT_CODES`. On each audited viewport it fails:
  - a timed `transition-property: all` on an element, `::before` or `::after`;
  - a timed transition, or a keyframe or script animation the document still holds, of a layout
    property (`width`, `height`, the four insets, `margin`, `padding`, their longhands and logical
    forms);
  - an infinite animation whose keyframes animate `filter` or `backdrop-filter` `blur()`;
  - an infinite animation running on an element wholly outside the viewport when the page is read.
  Motion on or inside `role="status"`, `role="progressbar"`, `role="alert"` or `aria-busy="true"`
  is exempt, by the definition `audit.reduced-motion` already uses.
- `ui-craft-sources.md`: the measured-audit row, review rows `UC-42` to `UC-44` for the rules a
  rendered page cannot show (scroll-linked motion, loops and one-shots, View Transitions, FLIP, one
  animation API per component), and the source key `FMP`.
- `ui-rule-coverage.json`: the 17 rows that named #355 become `audit` (6) or `uc` (11). No row is
  `pending` on #355 any more.
- `workflow-web.md`, `animation-opportunity-and-review.md` and `ibelick-ui-skills.md` name the code.

## What is reused

- The audit probe, its passes, the summary, native completion, evidence and lineage are unchanged.
  The check runs inside the existing `audit` pass at the existing reading (one second after load);
  the driver `interaction-capture-core.cjs` is not touched.
- The loading-indicator exemption is `STILL_MOVING.essential`.
- No gate, receipt field, schema id, probe field, threshold, CLI command or flag is added.

## Not in scope

- Vendoring `fixing-motion-performance` (the issue lists it). `ui-rule-coverage-map` (#356) landed
  after the issue was written and already pins that rule file by revision and content hash as part
  of the lock entry `ibelick-ui-skills-rules`; a vendored copy would be a second record of the same
  rules.
- Following an element that leaves the viewport on scroll. The audit reads the page at rest; a loop
  that scrolls out later stays a review (`UC-43`).
- Judging easing, duration, `scale(0)` entrances, `transform-origin` or hover gating. Project motion
  tokens outrank the default budget and curves (`ui-craft-sources.md` Precedence), and an audit
  finding cannot be waived, so these stay review rows `UC-03` and `UC-05`.
- `min-`/`max-` sizes, border widths and grid tracks: the upstream rule names six property
  families, and the audit holds to them.

## Capabilities

- `design-pipeline`: ADDED one requirement (the interaction audit measures motion properties).

## Behavior change

A page that passed the audit before can fail now. A Tailwind `transition-all` utility, a
`transition: height` accordion and an unpaused marquee below the fold are the common cases.

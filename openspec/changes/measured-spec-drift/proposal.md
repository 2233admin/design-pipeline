# Measured spec drift: the built page's colours and fonts against DESIGN.md tokens

## Why

Closes #241. The Spec Reconciliation gate reads the table the author writes in change `design.md`.
An empty table means "the spec survived contact unchanged", and nothing checks that claim: a page
that repainted the primary button, fell back to a serif, or names a token font it never loads
passes as long as the author says nothing changed. The values are on the page; the gate never
looked. brandmd's `check` (MIT; studied, not copied) shows the shape of the missing check: compare
the live page with the committed DESIGN.md, tolerate imperceptible differences, separate major from
minor drift, and refuse an empty baseline rather than pass everything.

## What Changes

- New `reconciliation measure` action: loads the built `index.html` in headless Chromium (the same
  browser, puppeteer resolution, settle and motion freeze as `evidence refs`), records each computed
  text, surface, border and SVG colour and each font family the page paints, with its share and
  whether the browser can render it, and writes change `built-styles.json`, bound to the page digest
  and the DESIGN.md hash. It refuses a missing page, a DESIGN.md with no colour or font tokens, and a
  page that moves during the capture.
- `check-spec-reconciliation.cjs` reads `built-styles.json` when present and adds
  `specDrift.measured`: the comparison with the DESIGN.md front-matter `colors` and
  `typography.fontFamily` tokens by CIEDE2000. New reasons on the existing gate:
  `reconciliation-measured-drift`, `reconciliation-measurement-stale`,
  `reconciliation-measurement-malformed`, `reconciliation-baseline-empty`; new warnings
  `reconciliation-measured-minor` and `reconciliation-unmeasured`. Every finding carries a fix.
- `reconciliation check` and the `reference check` fold pass `--project-root` and
  `--design-foundation` (existing flags) to the gate.
- `stages.md`, `design-spec.md`, CLI help and CHANGELOG describe it.

## Capabilities

- `design-pipeline`: ADDED the measured-drift requirement beside "Specified and implemented values
  are reconciled".

## Boundaries

No new gate: the measurement feeds the existing reconciliation gate and its `specDrift` record, and
the `reference check` fold carries it as before. `built-styles.json` is a measurement capture like
`evidence/refs.json`, not a receipt. No new CLI flag. Layout, spacing, radii and components are not
compared (computed values there depend on the viewport and on component extraction that is not
reliable enough to block on). Gate results remain Component Conformance; they never claim Visual
Acceptance.

# Tasks

## 1. Change records

- [x] 1.1 proposal.md, design.md and the `design-pipeline` spec delta; Closes #237.
- [x] 1.2 `npm exec -- openspec validate interaction-reading-motion-states --strict` and `npm run specs:check`.

## 2. Behaviour

- [x] 2.1 `interaction-audit.cjs`: five codes appended to `AUDIT_CODES`; `audit.line-length` and `audit.line-height` optional on `declare.bodyText`; thresholds `maxLineCh`, `minLineHeight`, `contrastFocus`; `auditPass`, `combineStateChecks`, the shared control selector.
- [x] 2.2 `auditPage`: reading and heading checks; the `reduced-motion`, `rest` and `state` passes; `audit.state-contrast` left `null` for the driver.
- [x] 2.3 `interaction-capture-core.cjs`: the reduce load per viewport, the CDP state passes, transitions finished between states, emulation restored.

## 3. Tests and docs

- [x] 3.1 `tests/interaction-audit.test.cjs`: contract and defaults, malformed inputs, state-check sum and the incomplete row, pass and fail pages for reading, headings, reduced motion and states, DESIGN.md overrides; the violating fixture fails every code and the clean fixture passes every code.
- [x] 3.2 `workflow-web.md`, `ui-craft-sources.md` (codes, defaults, sources), `anti-slop-review.md` (`content-available-without-motion` is measured), CHANGELOG.

## 4. Review fixes (PR #252)

- [x] 4.1 State text keyed on colors only; unmeasurable states listed under `notMeasured`, not failed; `:active` dropped.
- [x] 4.2 Both renderings read 1000 ms after load; loading indicators exempt; clip-hidden content compared in both; fix text says to show the final state.
- [x] 4.3 `STILL_MOVING` exported as the one definition; `measure-reduced-motion` amended to reuse it.
- [x] 4.4 Review pages kept as `tests/fixtures/ui-audit/review-*.html` with a test each; CHANGELOG names the Tailwind and Bootstrap focus defaults.

## 5. Verification

- [x] 5.1 `node --test tests/interaction-audit.test.cjs` through the focused run.
- [x] 5.2 `npm test` green except the known `ff-tracking-hud` ffmpeg 6.1 case.

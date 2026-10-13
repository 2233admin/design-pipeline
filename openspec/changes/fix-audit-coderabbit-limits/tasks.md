# Tasks

## 1. Engine

- [x] 1.1 Place absolute pseudo-element boxes by insets and margins and reject over-constrained ones,
  with an inline host's own padding box (`skill/scripts/interaction-audit.cjs`).
- [x] 1.2 Check paint over generated text on its own fill: other elements, the host's painted
  descendants over an absolute box and the host's other pseudo-element; unplaced own-fill text is
  `indeterminate`, and margin-moved text is measured where it sits.
- [x] 1.3 End a link's sentence run at a `<br>` or an in-flow block box.

## 2. Tests and documents

- [x] 2.1 Extend the spacing, generated-text and sentence-link tests in
  `tests/interaction-audit.test.cjs`; each new case fails on the engine it fixes.
- [x] 2.2 Update the `audit.text-contrast` and `audit.target-size` rows in
  `skill/references/ui-craft-sources.md`.

## 3. Verification

- [ ] 3.1 Run `node --test tests/interaction-audit.test.cjs tests/interaction-cli.test.cjs
  tests/ui-craft-sources.test.cjs tests/workflow-components.test.cjs`.
- [ ] 3.2 Run the `verify interaction` smoke on `.design-pipeline/audit-smoke`.
- [ ] 3.3 Run `npm test` and `npm run specs:check` on the frozen tree and record them in
  `verification.md`.

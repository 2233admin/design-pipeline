# Tasks

## 1. Change records

- [x] 1.1 proposal.md, design.md and the `composition` spec delta.
- [x] 1.2 `npm exec -- openspec validate measure-reduced-motion --strict` and `npm run specs:check`.

## 2. Behaviour

- [ ] 2.1 `capture-composition.cjs`: boolean option parsing; `--reduced-motion` two-pass capture and `reduced-motion.json` (design.md 1-4).
- [ ] 2.2 `references/reduced-motion.schema.json` and its validator; register in `package-resources.json`.
- [ ] 2.3 `cli-core.cjs`: `composition capture --reduced-motion` (boolean) and `verify composition --reduced-motion <file>` (value) registered; the verify handler reads, validates, checks the target hash and that `capture.sha256` equals the `--image` hash, then passes the measurement to the composition verifier.
- [ ] 2.4 `composition-core.cjs`: `reduced-motion-still-moving` error with a `fix` naming the media query; opacity/colour reported only.

## 3. Tests and docs

- [ ] 3.1 Browser tests for each scenario, plus end-to-end CLI invocations of both commands; register in `scripts/test-manifest.json`.
- [ ] 3.2 `references/motion-foundation.md` and the ui-transition rules: point the reduced-motion fallback at this check.
- [ ] 3.3 CHANGELOG entry.

## 4. Verification

- [ ] 4.1 Run on the four motion-recipe specimens and the KATANAview pages; confirm each result by watching the page with the preference on.
- [ ] 4.2 `npm test` green.

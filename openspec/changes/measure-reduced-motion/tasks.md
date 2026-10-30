# Tasks

## 1. Change records

- [x] 1.1 proposal.md, design.md and the `composition` spec delta.
- [x] 1.2 `npm exec -- openspec validate measure-reduced-motion --strict` and `npm run specs:check`.

## 2. Behaviour

- [ ] 2.1 `capture-composition.cjs`: `--reduced-motion` two-pass capture and `reduced-motion.json` (design.md 1-3).
- [ ] 2.2 `composition-core.cjs`: `--reduced-motion` input to `verify composition`, `reduced-motion-still-moving` error with a `fix` naming the media query.
- [ ] 2.3 `cli-core.cjs`: register the flags in `KNOWN_OPTIONS`/`BOOLEAN_OPTIONS` and help.

## 3. Tests and docs

- [ ] 3.1 Browser tests for each scenario; register in `scripts/test-manifest.json`.
- [ ] 3.2 `references/motion-foundation.md` and the ui-transition rules: point the reduced-motion fallback at this check.
- [ ] 3.3 CHANGELOG entry.

## 4. Verification

- [ ] 4.1 Run on the four motion-recipe specimens and the KATANAview pages; confirm each result by watching the page with the preference on.
- [ ] 4.2 `npm test` green.

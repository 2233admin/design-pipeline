# Tasks

## 1. Change records

- [x] 1.1 proposal.md, design.md and the `design-pipeline` spec delta.
- [x] 1.2 `npm exec -- openspec validate film-photosensitive-flash --strict` and `npm run specs:check`.

## 2. Behaviour

- [ ] 2.1 `film-core.cjs`: native-rate streamed decode with timestamps, stateful per-pixel detector, summed-area field window, WCAG 2.2 red definition, one-second counting (design.md 1-6).
- [ ] 2.2 `evaluateFilmRender`: `photosensitive-flash` error finding with a `fix` ("lower the contrast or slow the alternation to at most 3 per second, or shrink the flashing area"), and the `photosensitivity` report section.

## 3. Tests and docs

- [ ] 3.1 Tests with synthetic FFmpeg sources for each spec scenario (strobe, red flicker, small area, slow fade, 120 fps one-frame flashes, held frames, passing report); register in `scripts/test-manifest.json`.
- [ ] 3.2 `references/workflow-film.md`: what the check measures, the thresholds, and that broadcast delivery still needs a certified analyzer.
- [ ] 3.3 CHANGELOG entry.

## 4. Verification

- [ ] 4.1 Run on the golden film cases and the KATANA PV renders; list any new failures and confirm each by viewing the frames.
- [ ] 4.2 `npm test` green.

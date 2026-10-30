# Tasks

## 1. Change records

- [x] 1.1 proposal.md, design.md and the `design-pipeline` spec delta.
- [x] 1.2 `npm exec -- openspec validate perceptual-composition-compare --strict` and `npm run specs:check`.

## 2. Behaviour

- [ ] 2.1 Vendor pixelmatch (pinned release, unmodified source and LICENSE) into `skill/vendor/pixelmatch/`; `THIRD_PARTY_NOTICES.md`; `package-resources.json`.
- [ ] 2.2 `diagnostics.cjs`: SSIM, pixelmatch call, new metrics, `metricsMethod`, `difference-perceptual.png`, viewer section.

## 3. Tests and docs

- [ ] 3.1 Tests for each scenario with generated PNGs (text rendered twice by the browser at different subpixel offsets, moved block, identical); register in `scripts/test-manifest.json`.
- [ ] 3.2 `tools/visual-diagnostics/README.md`: what each metric means and does not mean.
- [ ] 3.3 CHANGELOG entry.

## 4. Verification

- [ ] 4.1 Re-run a page comparison from the KATANAview trial; check that the perceptual image points at real differences.
- [ ] 4.2 `npm test` green.

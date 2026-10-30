# Tasks

## 1. Change records

- [x] 1.1 proposal.md, design.md and the `composition` spec delta.
- [x] 1.2 `npm exec -- openspec validate capture-stable-frames --strict` and `npm run specs:check`.

## 2. Behaviour

- [ ] 2.1 `capture-stability.cjs` with `freezeMotion` and `settleScreenshot`; `page-refs-core.cjs` imports `freezeMotion` and deletes its copy (its `settle` stays).
- [ ] 2.2 `capture-composition.cjs`: order in design.md 3, `stabilization` in `elements.json`, seeked captures included.
- [ ] 2.3 `composition-core.cjs` (`verify composition`): `capture-unstable` warning.
- [ ] 2.4 `refs.json` `captureMethod: 2` and stale detection for lower values.
- [ ] 2.5 Register `capture-stability.cjs` in `references/package-resources.json`.

## 3. Tests and docs

- [ ] 3.1 Browser tests for each scenario (CSS rotation, rAF mover, focused input, seeked HyperFrames fixture, older refs.json, older elements.json); register in `scripts/test-manifest.json`.
- [ ] 3.2 `tools/visual-diagnostics/README.md` and the composition gate reference: what freezing does and does not stop.
- [ ] 3.3 CHANGELOG entry.

## 4. Verification

- [ ] 4.1 `evidence refs` tests pass with the method bump.
- [ ] 4.2 `npm test` green.

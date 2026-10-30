# Tasks

## 1. Change records

- [x] 1.1 proposal.md, design.md and the `composition` spec delta.
- [x] 1.2 `npm exec -- openspec validate capture-stable-frames --strict` and `npm run specs:check`.

## 2. Behaviour

- [ ] 2.1 `capture-stability.cjs` with `freezeMotion` and `settle`; delete the copy in `page-refs-core.cjs` and import it there.
- [ ] 2.2 `capture-composition.cjs` and `capture-web-evidence.cjs` use it; write `stabilization` to the capture output.
- [ ] 2.3 `composition-core.cjs` (`verify composition`): `capture-unstable` warning when `stabilization.stable` is false.
- [ ] 2.4 Register `capture-stability.cjs` in `references/package-resources.json`.

## 3. Tests and docs

- [ ] 3.1 Browser tests for each scenario (CSS rotation, rAF mover, focused input, seeked HyperFrames fixture, older elements.json); register in `scripts/test-manifest.json`.
- [ ] 3.2 `tools/visual-diagnostics/README.md` and the composition gate reference: what freezing does and does not stop.
- [ ] 3.3 CHANGELOG entry.

## 4. Verification

- [ ] 4.1 `evidence refs` tests still pass unchanged.
- [ ] 4.2 `npm test` green.

# Tasks

## 1. Change records

- [x] 1.1 proposal.md, design.md and the `design-pipeline` spec delta; Closes #311.
- [x] 1.2 `npm exec -- openspec validate composite-generated-characters --strict` and `npm run specs:check`.

## 2. Matting and compositing

- [x] 2.1 `tools/art-motion/raster.cjs` (OKLab, blur, distance transform, resampling, warps), `matte.cjs`
  (GrabCut with Boykov-Kolmogorov max-flow, guided filter, defringe, edge metrics, outline).
- [x] 2.2 `assets.cjs`: `grabcut` mode and `outline` finish in `cutCollage`, halo finding.
- [x] 2.3 `composite.cjs`: per-size compositing, measurements and findings; integration validation.

## 3. Contract, commands and checks

- [x] 3.1 `tools/template-bank/layers.cjs` (contract validation, task sheets); `bank.cjs` validates
  `layers` and `integration`, marks `data-layer`, records `layerSources`.
- [x] 3.2 `material-core.cjs`: `requestMaterial`, generated intake and landmarks, cut lineage,
  `compositeMaterial`, check of task sheets and composite inputs; `cli-core.cjs` actions, flags, help.
- [x] 3.3 `page-check.cjs`: ground layers, composite receipts, `safe-area-type`; report merge drops the
  static `contrast-unverified` when the browser measured contrast.
- [x] 3.4 `kv.tape-hero` (manifest with the contract, layout, default render, spec.md) and the
  street-tape `integration`.

## 4. Docs, tests, acceptance

- [x] 4.1 `references/template-bank.md`, `references/material-capture.md`, `docs/features.md`,
  `package-resources.json`, `CHANGELOG.md` [Unreleased].
- [x] 4.2 `tests/composite-layers.test.cjs` (synthetic fixtures; registered in `scripts/test-manifest.json`);
  counts in `tests/template-bank.test.cjs`, `tests/template-style-pack.test.cjs`, `tests/template-street-tape.test.cjs`.
- [x] 4.3 Acceptance rerun of the prototype through the new commands (design.md, Evidence).
- [x] 4.4 Focused tests (composite-layers, materials, procedural materials, template bank, style packs,
  street-tape, template bank browser), then `npm test`.

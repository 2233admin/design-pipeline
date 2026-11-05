# Tasks

## 1. Change records

- [x] 1.1 proposal.md, design.md, `design-pipeline` spec delta.
- [x] 1.2 `npm exec -- openspec validate astryx-static-snapshot --strict` and `npm run specs:check`.

## 2. Generator

- [x] 2.1 `scripts/generate-astryx-snapshot.cjs`: in-memory tarball reader, `@babel/parser` literal evaluator, CLI projection rules, lens overlays stored only when different, token tables, license and release checks, tarball integrity in provenance.
- [x] 2.2 Parity on 0.2.0 against the committed snapshot (design.md table); differences explained.
- [x] 2.3 `tests/astryx-snapshot-generator.test.cjs` with adversarial fixtures (code in a doc, inert statements, imports, await, escaping tar member, link member, version/package/license mismatch), registered in `scripts/test-manifest.json`.

## 3. Update path and regeneration

- [x] 3.1 `scripts/sources-update.cjs` npm importer step (`npm pack --ignore-scripts`, `{pack:}`, `{revision}`, restore on failure); `scripts/sources-lock.cjs` validation; tests in `tests/sources-lock.test.cjs`.
- [x] 3.2 `sources.lock.json` `astryx`: importer, notice site, `held` removed; `npm run sources:update -- --only astryx` to 0.7.7.
- [x] 3.3 Token inference for `-color` and border-style `-style` tokens; `tests/design-system-decision.test.cjs`.
- [x] 3.4 Tests read version and revision from the lock: `tests/astryx-bundled-snapshot.test.cjs`, `tests/design-system-decision.test.cjs`.
- [x] 3.5 Docs: `docs/astryx-design-system-provider.md`, `.github/CONTRIBUTING.md`, `docs/maintainers.md`, `THIRD_PARTY_NOTICES.md`; CHANGELOG.

## 4. Verification

- [x] 4.1 Focused: `astryx-bundled-snapshot`, `astryx-snapshot-generator`, `sources-lock`, `design-system-decision`, `design-system-catalog`, `design-system-provider`, `component-source-*`, `designer-pipeline-cli`.
- [x] 4.2 Repository QA: `npm test`.

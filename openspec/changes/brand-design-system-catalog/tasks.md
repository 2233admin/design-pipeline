# Tasks

## 1. Change records

- [x] 1.1 proposal.md, design.md and the `design-pipeline` spec delta; Closes #253.
- [x] 1.2 `npm exec -- openspec validate brand-design-system-catalog --strict` and `npm run specs:check`.

## 2. Source bundle

- [x] 2.1 `scripts/import-brand-design-systems.cjs` and `npm run sources:import:brand-design-systems`; import from clean checkouts of both reviewed commits.
- [x] 2.2 `skill/vendor/brand-design-systems/manifest.json` and `upstream/`: 4 shipped files, 1,144 fetched files, 198 systems, 57 corrections.
- [x] 2.3 `vendor-cache.cjs` partial schemas and pack mapping, `fetch-sources.cjs`, `brand-design-systems-core.cjs`, `doctor` `brandDesignSystems`.

## 3. Search

- [x] 3.1 `designmd search` merges systems and reports `catalogs`; `--kind design-system`; `designmd inspect` of a system with normalised front matter.

## 4. Docs and records

- [x] 4.1 `THIRD_PARTY_NOTICES.md`, `skill/references/design-md.md`, the `SKILL.md` route row, `skill/vendor/README.md`, `skill/references/installation.md`, `docs/features.md`, `CHANGELOG.md`.
- [x] 4.2 `skill/references/package-resources.json`, `scripts/test-manifest.json`, two component source catalog records.

## 5. Verification

- [x] 5.1 `node --test tests/brand-design-systems.test.cjs tests/design-md-source.test.cjs tests/design-direction-library.test.cjs tests/vendor-cache.test.cjs tests/component-source-completeness.test.cjs tests/install-doctor.test.cjs`.
- [x] 5.2 `npm run sources:check`, `npm run specs:check`.
- [x] 5.3 `npm test`, comparing failures with the known environment baseline.

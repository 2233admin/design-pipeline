# Tasks

## 1. Change records

- [x] 1.1 proposal.md, design.md and the `design-pipeline` spec delta; Closes #171.
- [x] 1.2 `npm exec -- openspec validate vendor-design-direction-library --strict` and `npm run specs:check`.

## 2. Source bundle

- [x] 2.1 `scripts/import-design-direction-library.cjs` and `npm run sources:import:direction-library`; import from a clean checkout of the reviewed commit.
- [x] 2.2 `skill/vendor/<upstream>/manifest.json` and `upstream/`: 181 shipped files with per-file SHA-256; 208 fetched files recorded.
- [x] 2.3 `vendor-cache.cjs` partial bundles, `fetch-sources.cjs`, `scripts/package.cjs` (`WHOLE_BUNDLES`), `design-direction-library-core.cjs`, `doctor` `directionLibrary`.

## 3. Hygiene and docs

- [x] 3.1 `scripts/reference-name-scope.cjs` and `scripts/qa.cjs`: the former-name rule allows only the vendored folder, `THIRD_PARTY_NOTICES.md` and the importer.
- [x] 3.2 `THIRD_PARTY_NOTICES.md`, `skill/references/design-direction-library.md`, the `SKILL.md` route row, `docs/features.md`, `skill/references/installation.md`, `CHANGELOG.md`.
- [x] 3.3 `skill/references/package-resources.json`: the guide and the core script.

## 4. Verification

- [x] 4.1 `node --test tests/design-direction-library.test.cjs tests/reference-name-scope.test.cjs tests/vendor-cache.test.cjs tests/install-doctor.test.cjs`; both new tests in `scripts/test-manifest.json`, the first also in `sources:check`.
- [x] 4.2 `npm run sources:check`, `npm run specs:check`.
- [x] 4.3 `node scripts/qa.cjs`, comparing failures with the environment baseline on main.
- [x] 4.4 Package size before and after (`npm run package:skill`): reported in the pull request.

# Tasks

## 1. Change records

- [x] 1.1 proposal.md, design.md and the `design-pipeline` spec delta.
- [x] 1.2 `npm exec -- openspec validate track-latest-upstream --strict` and `npm run specs:check`.

## 2. Lock and tooling

- [x] 2.1 `sources.lock.json` with every upstream; `scripts/sources-lock.cjs` (validation, pin collection, agreement).
- [x] 2.2 Importers drop pinned revisions, trees, hashes and counts; `scripts/import-scoped-snapshot.cjs` for the five bundles without an importer; `scripts/project-mengto-catalog.cjs`.
- [x] 2.3 `npm run sources:update` (`scripts/sources-update.cjs`): HEAD or latest release, shallow data fetch, importer, hashes, derived pins, resources, lock; loud restructure, license and marker failures; `held`.
- [x] 2.4 `npm run sources:check` (`scripts/sources-check.cjs`) with the lock test; `-- --upstream` warnings.
- [x] 2.5 `.github/workflows/sources-update.yml`: weekly and manual, read-only QA job, write job opens or refreshes `chore/track-latest-upstream`.
- [x] 2.6 Policy text in `AGENTS.md`, `openspec/config.yaml`, `.github/CONTRIBUTING.md`, `docs/maintainers.md`.

## 3. First run

- [x] 3.1 Every source to latest except held HyperFrames runtime (#262), Astryx (#263), 12-principles (#264); `@fission-ai/openspec` 1.16.0, golden-case `hyperframes` 0.9.9.
- [x] 3.2 Guides and references fixed where upstream changed: interface-discipline citations and resources, good-css container and RTL carousel, Cinetic script coverage, Impeccable command map and marker, React Bits license note, Three.js release wording.
- [x] 3.3 Source tests read the lock instead of literal pins.

## 4. Verification

- [x] 4.1 `tests/sources-lock.test.cjs` (agreement, file:// fixture bump, restructure, license change, fake upstream report) registered in `scripts/test-manifest.json`.
- [x] 4.2 `npm run sources:check`, `npm run specs:check`, full `npm test`; CHANGELOG entry.

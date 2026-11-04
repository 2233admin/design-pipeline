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

## 5. Review fixes (PR #268)

- [x] 5.1 Root license files compared on every move, cited or not; fixture test.
- [x] 5.2 No date-only churn; never force-push over others' commits (dated branch and PR instead).
- [x] 5.3 `docs/` in pin scope (`scripts/` out); `docs/agents/matt-skills.md` at the locked revision.
- [x] 5.4 Workflow: patch recorded before QA, scope guard, not green on any unmoved source, draft conversion, code spans.
- [x] 5.5 Companion marker check reads every Markdown file of the skill folder.
- [x] 5.6 Impeccable command count checked against upstream (24 listed, `craft` deprecated, 23 core).
- [x] 5.7 GSAP 3.15.1 released meanwhile: moved with new version sites; ambiguous sites stop the entry; product-film scaffold requirement follows the lock.

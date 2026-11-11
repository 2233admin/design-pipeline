# Tasks

## 1. Change records

- [x] 1.1 proposal.md, design.md and the `design-pipeline` spec delta; Closes #365.
- [x] 1.2 `npm exec -- openspec validate motion-vocabulary --strict` and `npm run specs:check`.

## 2. Data and provenance

- [x] 2.1 `skill/references/motion-vocabulary.json`: 91 terms and 12 categories quoted from the locked upstream file, aliases in English and Chinese, close terms, local links; three anti-patterns.
- [x] 2.2 `scripts/refresh-motion-vocabulary.cjs` (`--checkout`, `--catalog`, `--check`) and `tests/fixtures/motion-vocabulary/upstream-terms.json`.
- [x] 2.3 `sources.lock.json`: the guide joins the `documents` of `emilkowalski-animation-review`; `THIRD_PARTY_NOTICES.md` names the quoted glossary.

## 3. Search and routing

- [x] 3.1 `design-system-catalog-core.cjs`: record type `term`, term ranking in `searchCatalog`; `recordType` enum in the two catalog schemas.
- [x] 3.2 Generated `motion-vocabulary/*` records and the project-owned source record in `component-source-catalog.json`.
- [x] 3.3 `job-registry.json`: job `motion-vocabulary`.

## 4. Guide and docs

- [x] 4.1 `skill/references/motion-vocabulary.md`.
- [x] 4.2 `animation-opportunity-and-review.md` (vocabulary section and the quoted-part boundary), `companion-capabilities.json`, `companion-skills.md`, `feature-routes.md`, `pipeline-reference.md`, `capability-routing.md`, `SKILL.md`.
- [x] 4.3 `package-resources.json` (`required`), `CHANGELOG.md` [Unreleased].

## 5. Tests

- [x] 5.1 `tests/motion-vocabulary.test.cjs` (registered) and `tests/fixtures/motion-vocabulary/lookup-queries.json`; record-type list in `tests/component-source-completeness.test.cjs`.
- [x] 5.2 Focused tests (`motion-vocabulary`, `job-route`, `full-motion-recipes`, `component-source-completeness`, `component-source-routing`, `design-system-catalog`, `source-governance`, `sources-lock`), then `npm test` compared with unchanged `main`.

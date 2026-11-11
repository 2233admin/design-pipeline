# Tasks

## 1. Change records

- [x] 1.1 proposal.md, design.md and the `design-pipeline` spec delta; Closes #375.
- [x] 1.2 `npm exec -- openspec validate animate-ui-source --strict` and `npm run specs:check`.

## 2. Source and provenance

- [x] 2.1 `sources.lock.json`: entry `animate-ui` (`adapted-reference`) at `22a9236ae107328f8564edb7e3299375da3247af`.
- [x] 2.2 `scripts/refresh-animate-ui-fixture.cjs` (`--checkout`, `--check`) and `tests/fixtures/animate-ui/upstream-inventory.json`.
- [x] 2.3 `THIRD_PARTY_NOTICES.md`; `tests/source-governance.test.cjs` source reference for the guide.

## 3. Catalog and routing

- [x] 3.1 `component-source-catalog.json`: `source/imskyleen/animate-ui` and `animate-ui/components` (99 inventory items, 27 capabilities).
- [x] 3.2 `component-route-core.cjs`: named-source order, `routing.selectWhenNamed`, `import` and `bases` in component details; `design-system-catalog-core.cjs`: capability `animate-ui`.
- [x] 3.3 `frontend-stack-registry.json`: keyword tool `imskyleen/animate-ui`.
- [x] 3.4 `motion-vocabulary.json`: 19 terms linked to guide sections; `scripts/refresh-motion-vocabulary.cjs --catalog`.

## 4. Guide and docs

- [x] 4.1 `skill/references/animate-ui.md`.
- [x] 4.2 `SKILL.md`, `companion-skills.md`, `capability-routing.md`, `feature-routes.md`, `pipeline-reference.md`, `ui-craft-sources.md`, `docs/features.md`.
- [x] 4.3 `package-resources.json` (`required`), `CHANGELOG.md` [Unreleased].

## 5. Tests

- [x] 5.1 `tests/animate-ui-source.test.cjs`, registered in `scripts/test-manifest.json`.
- [x] 5.2 Focused tests (`animate-ui-source`, `component-routing`, `component-source-routing`, `component-source-completeness`, `component-fit-matrix`, `motion-vocabulary`, `source-governance`, `sources-lock`), `npm run sources:check`, then `npm test` compared with unchanged `main`.

# Tasks

## 1. Change records

- [x] 1.1 proposal.md, design.md and the `design-pipeline` spec delta.
- [x] 1.2 `npm exec -- openspec validate drop-12-principles-of-animation --strict` and `npm run specs:check`.

## 2. Removal and rerouting

- [x] 2.1 Remove the vendor bundle, importer record and frontmatter license path, lock entry, catalog entry, package resources, notice, `.gitattributes` and vendor README rows.
- [x] 2.2 `ui-craft-sources.md`: key, UC-02/UC-03 sources, precedence level, conflict lines, section.
- [x] 2.3 `feature-routes.md`, `pipeline-reference.md`, `capability-routing.md`, `docs/features.md`.

## 3. Verification

- [x] 3.1 `tests/ui-craft-sources.test.cjs`: five bundles, frontmatter fixture removed, regression test that no shipped guide, lock entry or vendor dir names the bundle.
- [x] 3.2 `npm run sources:check` (offline and `-- --upstream`: no 12-principles row, held 2), `tests/sources-lock.test.cjs`.
- [x] 3.3 Full `npm test`; CHANGELOG entry.

# Tasks

## 1. Change records

- [x] 1.1 proposal.md, design.md and the `design-pipeline` spec delta; Closes #356.
- [x] 1.2 `npm exec -- openspec validate ui-rule-coverage-map --strict` and `npm run specs:check`.

## 2. Sources

- [x] 2.1 `sources.lock.json`: `web-interface-guidelines` and `ibelick-ui-skills-rules` as `adapted-reference`, written through `writeLock`.
- [x] 2.2 Record documents `web-interface-guidelines.md` and `ibelick-ui-skills.md` with `sourceMeta` frontmatter; content hashes computed by `adaptedHash`.
- [x] 2.3 `THIRD_PARTY_NOTICES.md`: MIT notices for both rule lists.

## 3. Map and rules

- [x] 3.1 `scripts/refresh-ui-rule-fixture.cjs` and the pinned rule list `tests/fixtures/ui-rule-coverage/upstream-rules.json`.
- [x] 3.2 `skill/references/ui-rule-coverage.json`: 228 rows, each checked against the local text it names.
- [x] 3.3 `ui-craft-sources.md`: `UC-30` to `UC-41`, source keys `WIG` and `BU`, Rule coverage and maintenance notes. `qa-checklist.md` does not list `UC-` ids one by one, so it is unchanged.
- [x] 3.4 `package-resources.json`: the map and both record documents in `required`.

## 4. Companion documents

- [x] 4.1 `companion-skills.md`, `feature-routes.md`, `pipeline-reference.md`, `stages.md`: `web-design-guidelines` is built in.
- [x] 4.2 `companion-capabilities.json`: drop `web-design-guidelines` and its install hint from Visual taste; fallback names the record.

## 5. Tests and repository QA

- [x] 5.1 `tests/ui-rule-coverage.test.cjs` (registered in `scripts/test-manifest.json`): targets exist, reasons and issue numbers present, every pinned rule mapped, stale rule list rejected.
- [x] 5.2 `tests/ui-craft-sources.test.cjs`: `UC-` ids gap-free, every row has a source.
- [x] 5.3 `tests/source-governance.test.cjs` and `tests/check-deps.test.cjs`: both records carry the source evidence shape; self-check does not list `web-design-guidelines`.
- [x] 5.4 `tests/sources-lock.test.cjs`, `npm run sources:check`, `npm test`, CHANGELOG.

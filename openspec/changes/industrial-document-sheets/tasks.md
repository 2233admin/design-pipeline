# Tasks

## 1. Change records

- [x] 1.1 proposal.md and the `design-pipeline` spec delta.
- [x] 1.2 `npm exec -- openspec validate industrial-document-sheets --strict` and `npm run specs:check`.

## 2. Guide, source and routing

- [x] 2.1 `references/industrial-document-sheets.md` with `sourceMeta` (revision, content hash over
  seven upstream files, MIT, reference-only use boundary).
- [x] 2.2 `sources.lock.json` entry `arknights-printer`; `THIRD_PARTY_NOTICES.md`;
  `tests/source-governance.test.cjs` evidence row.
- [x] 2.3 `references/job-registry.json` job `industrial-document-sheets`; `SKILL.md` and
  `capability-routing.md` rows; `package-resources.json` required.
- [x] 2.4 `template-bank.md` points from the `arknights-endfield` row to the guide; CHANGELOG.

## 3. Checks

- [x] 3.1 `tests/job-route.test.cjs`: eight English and Chinese phrasings route to the job; an
  explicit job and an unrelated "industrial" brief keep their routes.
- [x] 3.2 `node --test tests/job-route.test.cjs tests/source-governance.test.cjs tests/sources-lock.test.cjs`.
- [x] 3.3 `npm test` (repository QA).

# Tasks

## 1. Change records

- [x] 1.1 proposal.md and the `design-pipeline` spec delta.
- [x] 1.2 `npm exec -- openspec validate tactile-product-ui --strict` and `npm run specs:check`.

## 2. Guide, source and routing

- [x] 2.1 `references/tactile-product-ui.md` with `sourceMeta` (revision, content hash over nine
  upstream files, MIT, reference-only use boundary, opt-in status).
- [x] 2.2 `sources.lock.json` entry `tactile-design`; `THIRD_PARTY_NOTICES.md`;
  `tests/source-governance.test.cjs` evidence row.
- [x] 2.3 `references/job-registry.json` job `tactile-product-ui`; `SKILL.md` and
  `capability-routing.md` rows; `package-resources.json` required.
- [x] 2.4 CHANGELOG.

## 3. Checks

- [x] 3.1 `tests/job-route.test.cjs`: seven English and Chinese phrasings route to the job; a plain
  product brief, a bare "tactile" word and a clone brief keep their routes.
- [x] 3.2 `node --test tests/job-route.test.cjs tests/source-governance.test.cjs tests/sources-lock.test.cjs`.
- [x] 3.3 `npm run specs:check`, `sources:check`, `capabilities:check` and the affected suites (ablation-eval, package-release, plain-language, capability-audit, skill-evals, cli-routing, install-local, design-skill-layer); the full `npm test` was not rerun.

# Tasks

## 1. Change records

- [x] 1.1 proposal.md, design.md and the `design-pipeline` spec delta.
- [x] 1.2 `npm exec -- openspec validate toast-notification-guide --strict` and `npm run specs:check`.

## 2. Guide and routing

- [x] 2.1 `references/toast-notification.md`: read the product, the three toast kinds,
  notification and the four "neither" cases, seven settling questions, the report table and the
  stop, restyle options A to D with kubai's 4A, 4B and 4C values, build checks, the table of where
  the package's rules win, hand-off and provenance.
- [x] 2.2 `references/job-registry.json`: scored job `toast-notification` (priority 44) with English
  and Chinese keywords; schema and dispatcher unchanged.
- [x] 2.3 `SKILL.md`, `capability-routing.md`, `feature-routes.md`, `docs/features.md`.
- [x] 2.4 `package-resources.json` (`required`), `evals/ablation/layers.json` (`ui-craft`),
  `CHANGELOG.md` [Unreleased], `THIRD_PARTY_NOTICES.md`.

## 3. Checks

- [x] 3.1 `tests/toast-notification-guide.test.cjs`, registered in `scripts/test-manifest.json`:
  routes in both languages, precedence over and under other jobs, routing documents, the judgment
  flow, kubai's values, each conflict row, link/rule/term existence, provenance.
- [x] 3.2 Focused checks: `tests/toast-notification-guide.test.cjs`, `tests/job-route.test.cjs`,
  `tests/impeccable-product-design.test.cjs`, `tests/ablation-eval.test.cjs`,
  `tests/motion-vocabulary.test.cjs`, `tests/sources-lock.test.cjs`, `tests/source-governance.test.cjs`.
- [x] 3.3 `npm run specs:check`, `npm exec -- openspec validate toast-notification-guide --strict`,
  then `npm test` (repository QA), with the failing files rerun on an unchanged checkout of the branch base (438b4654).

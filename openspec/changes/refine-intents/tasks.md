# Tasks

## 1. Change records

- [x] 1.1 proposal.md and the `design-pipeline` spec delta; Closes #347.
- [x] 1.2 `npm exec -- openspec validate refine-intents --strict` and `npm run specs:check`.

## 2. Routing and guide

- [x] 2.1 `references/job-registry.json`: scored job `refine-intents` with English and Chinese
  keywords; schema and dispatcher unchanged.
- [x] 2.2 `references/refine-intents.md`: critique, polish, distill and quieter, each with checks
  before starting, steps, prohibitions, completion and hand-off.
- [x] 2.3 `references/impeccable-product-design.json`: `guide` on all 23 commands.
- [x] 2.4 `SKILL.md`, `capability-routing.md`, `impeccable-contract.md`,
  `impeccable-product-design.md`, `package-resources.json`, CHANGELOG.

## 3. Checks

- [x] 3.1 `tests/job-route.test.cjs`: the four English queries and one Chinese phrasing each route
  through the CLI to `refine-intents` with a score above 0 and a confidence other than low;
  explicit jobs and stronger scored matches still win.
- [x] 3.2 `tests/impeccable-product-design.test.cjs`: every `guide` heading exists; the quieter
  section carries the visitor-mode split and the gray-text-on-color rule; the distill section
  carries the semantic-color cue and the removal record.
- [x] 3.3 `npm test` (repository QA).

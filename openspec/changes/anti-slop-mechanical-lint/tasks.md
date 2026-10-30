# Tasks

## 1. Change records

- [x] 1.1 proposal.md, design.md and the `design-pipeline` spec delta.
- [x] 1.2 `npm exec -- openspec validate anti-slop-mechanical-lint --strict` and `npm run specs:check`.

## 2. Behaviour

- [ ] 2.1 Vendor sloplint at `4f6a46c` unmodified with LICENSE; `THIRD_PARTY_NOTICES.md`, vendor manifest, `package-resources.json`.
- [x] 2.2 Gate map drafted and reviewed in this change as `anti-slop-lint-map.draft.json` (89 entries: 22 hard, 26 contextual, 37 preference, 4 excluded); move it to `skill/references/anti-slop-lint-map.json` unchanged.
- [ ] 2.2a Rubric: add the hard rule `no-fabricated-proof` with its check and fix, following the existing rule shape.
- [ ] 2.3 `evaluate-anti-slop.cjs --lint`/`--url`: run, map, `lint` evidence block with target digest, `LINT_CONTRADICTS_PASS`, `LINT_GATE_UNMAPPED`.
- [ ] 2.4 Evidence schema: optional `lint` block.

## 3. Tests and docs

- [ ] 3.1 Fixture pages for each scenario; register in `scripts/test-manifest.json`.
- [ ] 3.2 `references/anti-slop-review.md`: the lint step, classes and how to answer a contextual finding.
- [ ] 3.3 CHANGELOG entry.

## 4. Verification

- [ ] 4.1 Run on the KATANAview pages and the motion-recipe specimens; review every hard finding by hand.
- [ ] 4.2 `npm test` green.

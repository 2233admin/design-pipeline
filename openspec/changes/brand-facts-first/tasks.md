# Tasks

## 1. Change records

- [x] 1.1 proposal.md, design.md and the `design-pipeline` spec delta; Closes #156.
- [x] 1.2 `npm exec -- openspec validate brand-facts-first --strict` and `npm run specs:check`.

## 2. Behaviour

- [x] 2.1 `declaredBrands` in `design-synthesis-core.cjs`; brand validation and findings in `design-system-package-core.cjs`.
- [x] 2.2 `foundation check --kind all` runs the package check when brands are declared.
- [x] 2.3 The web build step shows the findings and stays unfinished until they clear.

## 3. Documentation and tests

- [x] 3.1 `references/brand-facts.md`; `design-system-package.md`, SKILL.md row, `stages.md`, `design-synthesis.md`, and the adoption note in `design-direction-library.md`.
- [x] 3.2 `tests/brand-facts-first.test.cjs` registered in the manifest; package resources and CHANGELOG.

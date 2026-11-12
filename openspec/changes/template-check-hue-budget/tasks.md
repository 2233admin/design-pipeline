# Tasks

## 1. Change records

- [x] 1.1 proposal.md and the `design-pipeline` spec delta.
- [x] 1.2 `npm exec -- openspec validate template-check-hue-budget --strict` and `npm run specs:check`.

## 2. Rule

- [x] 2.1 `tools/template-bank/page-check.cjs`: `hueBudget` pixel measure, `PAGE_RULES` limits, role
  declaration read in `discover`, `data-deco` hidden in the hue shot, findings, `hue` in the result.
- [x] 2.2 `scripts/brand-design-systems-core.cjs` exports `rgbToOklab` (no second implementation).
- [x] 2.3 `references/template-bank.md` (rule row, declaration paragraph) and
  `references/industrial-document-sheets.md` (numbers and attributes).

## 3. Checks

- [x] 3.1 `tests/template-hue-budget.test.cjs` (registered in `scripts/test-manifest.json`): pixel
  measure on synthetic shots; browser pages inside budget, over budget, decoration exempt, undeclared
  page silent, non-colour value noted; guide numbers equal `PAGE_RULES`.
- [x] 3.2 `tests/template-bank-browser.test.cjs` and `tests/composite-layers.test.cjs` unchanged and green.
- [x] 3.3 `npm test` (repository QA).

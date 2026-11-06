# Tasks

## 1. Change records

- [x] 1.1 proposal.md, design.md and the `design-pipeline` spec delta; Closes #320.
- [x] 1.2 `npm exec -- openspec validate template-check-text-stroke --strict` and `npm run specs:check`.

## 2. Behaviour

- [x] 2.1 `page-check.cjs` `STYLE`: stroke cleared in `[data-tc-off]`; stroke colour set in the key rules.
- [x] 2.2 `page-check.cjs` `discover`/contrast: fill from `-webkit-text-fill-color`, stroke colour when the fill is transparent.

## 3. Tests and docs

- [x] 3.1 Regression tests in `tests/template-style-pack.test.cjs` (already registered): invisible stroke fails, white stroke passes, touching strokes overlap, same-colour 1:1.
- [x] 3.2 Before/after reports of all templates (seeds 1, 7, 42) and HTML fixtures are byte-identical.
- [x] 3.3 CHANGELOG entry.

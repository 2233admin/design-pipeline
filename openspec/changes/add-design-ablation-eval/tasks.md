# Tasks

- [x] 1. Scenarios and original house styles (`evals/ablation/scenarios/`, `styles/`); DESIGN.md files pass the foundation validator.
- [x] 2. Layer declarations and the variant-tree builder (`layers.json`, `variants.mjs`) with package resource check.
- [x] 3. Prompt-only variants: adjective prompt and original if-else rule pack per house style (`rules/`).
- [x] 4. Deterministic scoring reusing interaction-audit, composition gate, capture extract, frontMatterGroups and png-core (`measure.mjs`, `suite.mjs`), including rhythm proxies and run fingerprints.
- [x] 5. Runner adapted from pstack `evals/run.mjs` (`run.mjs`, `lib.mjs`), report with pre-registered decision rules (`report.mjs`), blind pairwise judge (`judge.mjs`).
- [x] 6. README (Chinese) with scenarios, variants, scoring, blind spots, decision rules, how to run and costs.
- [x] 7. `tests/ablation-eval.test.cjs` with a fake client and fake judge, registered in `scripts/test-manifest.json`; CHANGELOG [Unreleased].
- [x] 8. Checks: `node --test tests/ablation-eval.test.cjs`, `npm exec -- openspec validate add-design-ablation-eval --strict`, `npm run specs:check`, `npm test`.
- [ ] 9. Owner's first real run on their machines; decisions recorded from `report.mjs` output.

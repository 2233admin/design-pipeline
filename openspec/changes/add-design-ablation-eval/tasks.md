# Tasks

- [x] 1. Scenarios and original house styles (`evals/ablation/scenarios/`, `styles/`); DESIGN.md files pass the foundation validator.
- [x] 2. Layer declarations and the variant-tree builder (`layers.json`, `variants.mjs`) with package resource check.
- [x] 3. Prompt-only variants: adjective prompt and original if-else rule pack per house style (`rules/`).
- [x] 4. Deterministic scoring reusing interaction-audit, composition gate, capture extract, frontMatterGroups and png-core (`measure.mjs`, `suite.mjs`), including rhythm proxies and run fingerprints.
- [x] 5. Runner adapted from pstack `evals/run.mjs` (`run.mjs`, `lib.mjs`), report with pre-registered decision rules (`report.mjs`), blind pairwise judge (`judge.mjs`).
- [x] 6. README (Chinese) with scenarios, variants, scoring, blind spots, decision rules, how to run and costs.
- [x] 7. `tests/ablation-eval.test.cjs` with a fake client and fake judge, registered in `scripts/test-manifest.json`; CHANGELOG [Unreleased].
- [x] 8. Checks: `node --test tests/ablation-eval.test.cjs`, `npm exec -- openspec validate add-design-ablation-eval --strict`, `npm run specs:check`, `npm test`.
- [x] 9. Review round: hierarchy floor and element-colour adherence; variance pilot, power, Holm, agreement rule, UNDETERMINED, ≥ 3 scenarios; precise removal with pointers and a full diff test; empty direction-library stub; open and ignoredone scenarios; `principles` and `recipes` packs; exposure and `next` per run; judge dedupe; one failure rule; relative paths; anchor check; structural sameness calibrated on fixtures; isolated roots, workdir deletion, cache state.
- [ ] 10. Owner's variance pilot and first real run on their machines; decisions recorded from `report.mjs` output.

# QA

Verified on 2026-08-13:

- A/B generation used the same `gpt-5.6-terra` model at low effort for three matched prompts. The
  distilled direct-language treatment won the cache notice and product announcement; the control
  won the error dialog because the treatment widened a three-field problem into a file-level
  failure. Result: 2:1, with the regression captured as the fact-scope guard.
- JSON parse checks passed for the package manifest, test manifest, and change direction waiver.
- `node --test tests/plain-language.test.cjs` -> 1 passed, 0 failed.
- `designer-pipeline direction check --stage selection` -> `ready`, waiver `non-visual`.
- `node scripts/qa.cjs` -> 365 tests passed across 41 files; reproducible tar/zip packages,
  isolated install, installed-package CLI smoke, and byte-identical repository status passed.

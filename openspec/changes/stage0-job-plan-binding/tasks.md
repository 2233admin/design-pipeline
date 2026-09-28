## Implementation
- [x] Require complete Stage 0 identity binding and preserve plan hashes.
- [x] Classify and hash original query/form; reject toolchain form conflicts.
- [x] Extend existing route and toolchain schemas.
- [x] Add generic English/Chinese product-promotion registry terms.
- [x] Migrate maintained CLI/core/execution fixtures and add behavioral regressions.
- [x] Update public handoff documentation and changelog.

## Verification
- [x] Run focused tests and public CLI binding scenarios.
- [x] Run strict OpenSpec validation.
- [x] Run the declared full QA entrypoint.
- [x] Confirm no excluded OpenAlice files were changed; retain active change.

## Evidence
- Focused specification suite: 32 passed, 0 failed across the four declared test files.
- Strict OpenSpec validation: stage0-job-plan-binding is valid.
- Full node scripts/qa.cjs: 668 repository tests across 82 files passed; installed-package CLI smoke 11 passed; package reproducibility and byte-identical repository status passed.
- Changed tracked paths contain no OpenAlice showcase or OpenAlice change files. The OpenSpec change remains active.


## Step 4 review patch evidence
- [x] Narrow product-video classifiers and registry keywords so page/dashboard requests remain non-video while English/Chinese product-video requests retain routing.
- [x] Reject missing, non-string, and blank route queries before deliverable-form classification.
- [x] Document all four required Stage 0 binding fields and query/form consistency in the Stage 0 reference.
- [x] Add routing and stale-file handoff regressions.
- Focused specification command: 32 passed, 0 failed (`node --test tests/job-route.test.cjs tests/toolchain-routing.test.cjs tests/hyperframes-routing.test.cjs tests/skill-cli-handoff.test.cjs`).
- Architecture blocker regressions cover `product showcase animation`, `产品宣传展示动画`, and `产品宣传动画` with Stage 0 and HyperFrames alignment.

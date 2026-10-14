# Verification

Date: 2026-10-08.

## Scope

The publication candidate is based on the previously published harness commit `d45370d60703b8a08beab8fc7d7d7edd56ced727`. It includes this review, existing Matt setup consumer guidance and its change record, the glossary migration, the README introduction, two official install names in the existing optional companion group, and one regression test in the existing test file. Independent film, frontend and good-css work remains in the original workspace.

No global skills were updated or deleted during this review. No runtime implementation, gate, receipt schema, resolver, digest, release version, tracker or source bundle changed. The full QA snapshot precedes final wording corrections to three documentation files and this verification record; executable and regression-test bytes are unchanged afterward. Final documentation checks validate those corrections.

## Passed checks

- Fixed upstream comparison: 38 canonical skill folders and 103 supporting files match Git blob hashes from `f3fc5632f401156837ee3872f14fe33ccf1024ea`; full compatibility and local-fork differences are recorded in review.md.
- Session review: 25 eligible local user sessions at the fixed request cutoff, 25 readable, 14 archived; aggregate counts and limits are documented. An independent audit checked the matrix, sources, privacy scope and local links.
- Glossary body equals the original tracked content after normalizing the changed title. The candidate index records `docs/glossary.md` → `docs/GLOSSARY.md`, including case.
- Official Matt installation regression: observed RED with the old names (`WARN` instead of `OK`), then GREEN using the same fixture and public self-check after the registry correction.
- 8 maintained documents / 26 local Markdown links checked for existence and exact path case.
- Strict OpenSpec validation of the scoped candidate: 51 passed, 0 failed.
- Package production, reproducibility and isolated installation checks passed; installed CLI smoke tests: 12 passed, 0 failed, 0 skipped.
- Both browser-tool self-tests passed in a separate `npm run test:browser` run.
- QA and its wrapper both confirmed candidate Git status stayed byte-identical during the full run.
- Scoped diff whitespace checks passed.

## Full QA did not pass

`npm test` exited 1. Repository tests reported **1,030 tests: 1,027 passed, 3 failed, 0 skipped**, in 855,228.9088 ms. Packaging and installed-package checks continued and passed. The npm test chain did not automatically reach browser self-tests; those were run separately, as recorded above.

Failures:

1. `native technical progress recovers a dispatcher interruption without redoing a completed unit` in component-eval.test.cjs.
2. `fresh native completion cannot transfer old visual acceptance to rewritten metadata` in component-eval.test.cjs.
3. `public native failures retain measured fixes and bound repeated attempts to input/output bytes` in workflow-next.test.cjs.

The first two failure messages used an undefined `run.notice`, masking the underlying attempt failure. Their original temporary fixtures were cleaned by the tests. The third observed a prior attempts count of 3 where 1 was expected. The full-run evidence does not establish a browser timeout or a deterministic byte-reset defect.

## Focused diagnosis

With no tracked source or test edits, the two component-eval cases passed independently: **2/2**, exit 0, 51.85 seconds. The workflow failure-count case passed independently: **1/1**, exit 0, 25.77 seconds. A further ignored observation probe also passed and recorded the actual CLI: the same output failed with attempts 1/2/3, a new output's actual browser measurement reset attempts to 1, and scope/tool blocking preserved the count. This establishes that path in the rerun, not the cause of the original failures.

The three focused passes do **not** rewrite the full run as green. Before an actual release, obtain a passing complete QA run and ensure failures retain their actual reason for diagnosis. This task prepares and publishes the compatibility review; it does not grant release or visual acceptance.

## Original-workspace check

A focused original-workspace run reported 17/18 passed. Its remaining invalid-regex test assumed Anime.js was the first profile, while parallel good-css work had inserted another first profile. The publication candidate keeps the established baseline and does not copy that unrelated registry change. Its invalid-regex check passed in the full run. Other local work was preserved.

Raw test output, session positions, source paths, full diffs and observation logs remain under ignored `.design-pipeline/matt-v13-review/`. The shared review contains aggregate results only. The earlier configure-matt-pocock-skills verification is historical installation evidence, not a claim that this full QA passed.

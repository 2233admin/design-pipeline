# Verification

Performed on Windows with the repository Node runtime on 2026-10-09, in the isolated consolidation worktree. Raw vendor bytes and the original dirty workspace were untouched.

## Counterexamples and repairs

- Before the runtime fix, the new unchanged-good-output regression returned `recorded` with no task edit. After the fix, clean and pre-existing dirty good outputs, plus verifier-only changes inside declared scope, block before capture and report/metadata writes. Repeated `next` and completion retain the original baseline.
- Actual source edits beside a check report and exact declared-output edits still pass. Reverting the sole source edit during capture or after metadata writes blocks completion without replacing the original attempt. Existing observed-failure counts, byte bindings, review invalidation, native CAS, aliases and scope history continue through the existing checks.
- Before fixture repair, the three browser-independent component-eval rejection cases failed with `TOOL_MISSING` when `PUPPETEER_EXECUTABLE_PATH` named a verified absent executable. After repair they pass, assert zero Chrome resolver calls, and do not skip. Browser setup occurs only in the six tests that execute real native verification.
- Existing rework fixtures now change page bytes after dispatch. Attempt-specific comments change only fixture evidence; browser behavior and measured reports remain real. Explicit relative Puppeteer overrides are normalized before dispatch, matching the existing resolver's validated path.

## Checks

| Check | Observed result |
| --- | --- |
| New P1 counterexample before fix | 1 failed, 1 passed; unchanged good output incorrectly completed |
| `node --test tests/component-eval.test.cjs` with Chrome available | 18 passed, 0 failed, 0 skipped; includes all six real-browser cases |
| `node --test tests/workflow-next.test.cjs` | 78 passed, 1 failed, 0 skipped; the sole failure was the existing plan-rebinding fixture resubmitting identical output after dispatch |
| Final focused workflow rerun: `native scope preserves dirty baselines`, `native task-change rechecks`, `native completion rejects unchanged good outputs`, `native completion accepts actual source` | 4 passed, 0 failed, 0 skipped after giving the rebinding fixture an actual post-dispatch edit; includes the new source-rollback regression added after the full-file run started |
| Component-eval missing-plan, guide-conflict and report-only cases with Chrome deliberately absent | 3 passed, 0 failed, 0 skipped |
| Six browser-dependent component-eval cases with Chrome deliberately absent | 0 failed, exactly 6 tool-missing skips |
| `npm exec -- openspec validate fix-native-completion-review-gaps --strict` | Passed |
| Scoped `git diff --check` | Passed |

The Chrome-absence commands set `PUPPETEER_EXECUTABLE_PATH` only in the child PowerShell process and verify that its target does not exist. Browser tools were not installed or modified. The full workflow file was not rerun after the test-only rebinding correction; parent integration owns final `npm test` and `npm run specs:check` on the consolidated snapshot.

## Boundaries

No new gate, schema, resolver, option or dependency was added. Existing target, snapshot, receipt lineage and Component Conformance / Visual Acceptance boundaries remain intact. The existing Git observation limitations and same-permission trust assumptions still apply; these checks do not establish filesystem write containment or user acceptance.

## Consolidated repository verification

On 2026-10-09, the consolidation owner ran canonical `npm test` on clean runtime snapshot `c82a9b08cced46f4a32e8bf758afc9fb5e7888b6`, with reviewed optional GEPA and local render tools available. It exited 0: 120 registered files produced 1,109 tests, 1,108 passed, zero failed, and one intentional missing-GEPA skip because GEPA was installed. Native GEPA proposal, provenance, callback-drift and failed-evidence checks executed. The final workflow fixtures and Windows namespace/NTFS checks passed in this complete run.

Reproducible TGZ, ZIP and checksums, archive resources, isolated installation and public CLI smoke (12 passed, zero skipped), and both browser-tool self-tests passed. QA confirmed repository status remained byte-identical. `npm run specs:check` also passed all 63 items strictly. Raw logs are retained in ignored `.design-pipeline/`; the original workspace's v2 Git inventory and tracked binary diff match the pre-cleanup snapshot. These results verify software behavior and packaging; no real design-quality experiment, release or Visual Acceptance was performed.

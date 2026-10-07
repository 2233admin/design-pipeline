# Correctness verification

## Verified behavior and repaired defects

The audit reproduced and repaired two serious output-boundary defects: a report could overwrite the measured page or workflow state through a filesystem alias, and a default evidence junction or report-file link could escape the requested root. The latter includes unresolved links whose external target does not yet exist. Rejection now happens before capture, preserves input bytes and does not promote the workflow.

The repair extends the existing CLI guard, exports the existing page-resolution helper and adds one unresolved-link rejection to the existing shared containment helper. It adds no runner, dependency, gate, receipt schema or target resolver. Existing v1 bindings and review/delivery behavior are preserved.

Focused regressions have observed RED before each repair and GREEN afterward. The final table has nine passing protection subcases, with no skipped cases. Independent review also exercised ordinary web review/delivery, changed bytes with restored timestamps, premature delivery without state mutation, another measured local page, and real storyboard failure/recovery. See qa.md for retained proof locations.

## Integration checks

The final runtime passed all checks:

| Check | Actual result |
| --- | --- |
| Focused workflow and public CLI checks | 79 passed, 0 failed, 0 skipped |
| `npm test`: repository QA | 968 passed across 109 files, 0 failed, 0 skipped |
| `npm test`: isolated installed-package public CLI smoke | 12 passed, 0 failed, 0 skipped |
| `npm test`: browser-tool self-tests | Both prewalk pipeline and BuilderPort passed |
| `npm run specs:check` | 48 items passed, 0 failed, strict validation |
| `git diff --check` and changed-runtime syntax checks | Passed |
| QA repository status | Byte-identical before and after |

Test execution used Node v26.3.1 through its resolved executable and a shell-local ignored workspace temporary directory; no host configuration or unrelated files were changed. Full QA includes deterministic packaging, package completeness, failure atomicity and isolated installation. Logs and status snapshots are retained in `.design-pipeline/correctness-x9T5c5/{final-focused-tests.log,npm-test.log,specs-check.log,qa-result.json,status-before-full.bin,status-after-full.bin}`.

Two independent reviewers approved the minimal runtime repair and delta spec after the unresolved-link fix. Final independent evidence covers 11 shared containment controls, a middle-parent CLI rejection, preserved bytes and a real Chrome default-output capture. All planned tasks are complete; the change remains open and unarchived.

## Remaining correctness boundaries

Native visual-task completion currently accepts a structurally valid self-declared check report whose artifact hashes match. An honest synthetic public-CLI counterexample performed zero verifier/renderer invocations yet recorded `technicalCompletion: passed` and reached `done`. This proves artifact integrity checking does not authenticate the producer or establish functional correctness. The changed-byte negative control became stale and an old-metadata completion failed with exit 2.

The same audit found that native completion does not independently compare actual changed files with the task's declared modification scope. A synthetic edit outside that scope was accepted. The existing execution-target finalizer has a Git-scope check, but native completion is not thereby proven to enforce it. A future harness slice should connect existing execution evidence and scope checks; a self-written receipt alone would not resolve either gap.

Proof is retained in `.design-pipeline/correctness-x9T5c5/native-proof/run-1791392052477/{SUMMARY,invocations}.json`. These are deliberately labelled synthetic boundary fixtures, not rendered output or fabricated verification evidence.

Primary-file binding does not cover every transitive asset or remote server revision. Stable-path checks also do not provide filesystem transactions against concurrent link replacement; use an isolated owned verification instance.

Component Conformance was not comprehensively evaluated in this audit. Real Chrome static-click controls establish capture/evaluation and measured-page binding, not general component or animation quality. Visual Acceptance remains separately unevaluated; native `review:true` still requests owner review. Passing engineering tests does not confer either conclusion.

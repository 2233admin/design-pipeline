# Diagnosis evidence

Date: 2026-10-08. Base: `a4f243f84c681fafd8b856eeb16c2a26ad523aa9`.

## Original failures

The earlier full `npm test` reported 1,027/1,030 passed. The two component cases masked a failed-status assertion with `ERR_INVALID_ARG_TYPE`; the changed-output case observed attempts 3 instead of 1. Original temporary fixtures were removed by that QA run. Its underlying native failure reasons cannot be reconstructed from the summary, and focused passes do not establish those original causes.

## Feedback loops actually run

`node --test --test-name-pattern "native technical progress recovers|fresh native completion cannot|public native failures retain" tests/component-eval.test.cjs tests/workflow-next.test.cjs` ran red in 22.50 seconds under the host environment. A repeated run with a read-only observation preload exposed `TASK_BLOCKED`: `Cannot observe this task's Git baseline: workflow: Task scope must remain inside its observed Git root`. The workflow case blocked at initial next, before its original failure-count assertion. This is a stable related native defect, not evidence that it caused the original counter failure.

Mirroring `scripts/qa.cjs`'s isolated environment passed 3/3 in 45.86 seconds. Two concurrent copies passed 6/6 in 53.23 seconds per copy. Reusing the original full-run temporary directory layout passed 3/3 in 51.81 seconds. These runs rule out a deterministic counter-reset failure in those observed executions; they do not rule out an intermittent capture or snapshot failure in the original full run.

The minimized Windows regression is `node --test --test-name-pattern "contained paths keep lexical coordinates" tests/execution-target-routing.test.cjs`. It failed before the shared repair in 6.25 ms because the long spelling was rejected inside its equivalent short-spelled root. It passed afterward, exercising physical identity, external/inbound/broken links and distinct case-sensitive directories. The fix reuses the existing three-file shared implementation from `853249b`; it does not introduce another path resolver.

The diagnostic regression is `node --test --test-name-pattern "failed native assertion reports" tests/component-eval.test.cjs`. It failed before the formatter in 1.37 ms with the same undefined-message argument error, and passed afterward with the actual failed attempt's code/reason. The existing timeout formatter is reused for all ten failed-status assertions. Production run/state/receipt schemas are unchanged.

## Failure-count distinction

The runtime updates attempts only after a complete observed semantic failure. A tool, scope, incomplete capture or CAS block preserves the previous observed evidence. Therefore attempts 3 after a failed verification of changed bytes does not, by itself, prove a broken reset.

A new check at the existing trusted observation seam records three semantic failures, changes the output bytes, forces an incomplete-capture error, and proves that attempts/input hashes/original scope window remain unchanged with `sameSnapshot: false`. A later complete observation of the changed output restarts attempts at 1. It simulates the capture failure explicitly; it does not establish that the original browser did fail for that reason.

The original public browser case now checks `sameSnapshot` and includes the actual completion failure before interpreting attempts. No browser sampling threshold, expected state, counter update or creative-acceptance boundary was weakened.

## Review and intermediate full run

Independent review found a return-coordinate defect in the reused alias repair. A real junction-root artifact creation returned `../real/output.txt`; the registered containment test reproduced `../nested/file.txt` instead of `file.txt` in 15.64 ms. The existing resolver now returns accepted absolute aliases in the caller-root coordinates and rejects relative paths outside that root. The original repro and metadata-only validation pass afterward. No artifact or receipt schema changed.

The first complete run, before this final correction, reported **1,033 tests: 1,032 passed, 1 failed**, exit 1. The original three cases passed. The remaining failure was the new distinct-case-directory fixture: fsutil printed access denied on the hermetic temporary volume yet returned exit 0, and creating `root` after `Root` raised EEXIST. The fixture now checks actual case-sensitive directory behavior, reporting that subscenario unavailable when it remains an alias. The host-profile focused check exercised distinct-case rejection; the hermetic-volume check reports the limitation and still runs alias/link/artifact/traversal coverage. Installed CLI checks passed 12/12; the npm chain did not reach browser self-tests in this intermediate run.

## Focused results

Six focused checks passed, 0 skipped, in 71.70 seconds: the original three cases, physical-root containment, assertion diagnostics and incomplete-capture counter preservation. Strict specifications passed 52/52. Temporary observers are retained only in ignored diagnostic directories; no `[DEBUG-nativeqa]` instrumentation or diagnostic environment setting is present in tracked source/tests. Complete QA and publication results belong in verification.md after execution.

After the reviewed resolver correction, host-profile containment/diagnostic checks passed 2/2 in 222.60 ms and hermetic-volume containment passed 1/1 in 138.42 ms, with the distinct-case-directory availability diagnostic above. The earlier full run is superseded for final validation; rerun complete QA on the corrected tree.

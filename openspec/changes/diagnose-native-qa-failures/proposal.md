# Diagnose native QA failures

## Why

The Matt review's full QA reported two component-eval failures whose undefined assertion messages hid their actual task failures, and a changed-output failure-count assertion of 3 instead of 1. Focused reruns passed. The user requests diagnosis of these three cases using diagnosing-bugs.

A new ambient reproduction reliably exposes a real Windows root-alias defect: native dispatch blocks with `Task scope must remain inside its observed Git root`. Exact hermetic and reduced concurrent reproductions pass. This explains the newly captured blocking, not yet the original full-run failures.

## What Changes

- Reuse the already published physical-root repair from `853249b` through the existing containment, Git snapshot and native workflow helpers; preserve escape rejection and snapshot lineage.
- Keep returned alias paths in caller-root coordinates and reject relative traversal, preventing escaped artifact metadata. Verify directory case sensitivity by its actual behavior rather than fsutil's exit code alone.
- Reuse the existing component-test timeout state formatter for failed-state assertions, retaining actual attempt failures instead of an undefined notice.
- Diagnose the original cases with retained observations; change browser or state behavior only if a reproduction demonstrates a separate defect.
- Run regressions and the complete QA on the selected tree, retaining original failures and distinguishing fresh evidence from inferred causes.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `design-pipeline`: physical-root compatibility and actionable native QA failure evidence through existing v1 mechanisms.

## Impact

Existing contract-utils, execution-target, workflow and their registered test files. No new dependency, resolver, gate, receipt schema, release version or tracker. GoodCSS, pointer-sweep delivery and other concurrent work are outside this change.

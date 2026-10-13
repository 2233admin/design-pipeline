# Proposal

## Why

Native completion currently accepts an empty task delta, so a pre-existing passing page can advance using only newly written verifier evidence. Component-eval contract rejection fixtures also resolve Chrome before exercising browser-independent failures, hiding those checks on hosts without Chrome.

## What Changes

- Require an observed task change within the current task's source scope or declared outputs before completion runs or writes evidence.
- Exclude only exact verifier-owned report, completion metadata and native control paths from that task-change proof; retain the existing frozen scope window and snapshot rechecks.
- Resolve browser tools only for component-eval scenarios that run the browser, skip those scenarios when tools are absent, and prove contract rejection scenarios run without Chrome.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `design-pipeline`: native completion task-delta proof and browser-independent rejection coverage.

## Impact

Existing `workflow-core.cjs`, `workflow-next.test.cjs` and `component-eval.test.cjs`. Reuse the existing Git inspection, target containment, visual task records, interaction verifier and artifact lineage. No new gate, receipt schema, resolver, option or dependency. Component Conformance and Visual Acceptance remain separate.

# Proposal

## Why

The correctness audit demonstrated that native visual tasks can reach `technicalCompletion: passed` using a self-written check report, and that edits outside the task's declared scope do not block completion. The next harness slice must make completion depend on observed verification and actual task changes.

## What Changes

- Keep the existing `next -> work -> decide complete -> review` entry flow; have the public completion operation run registered checks before promotion.
- Start with the existing real-browser interaction verifier for a bounded local web task. Reuse its capture kernel and evaluator; missing or unsupported execution remains blocked.
- Extend the existing design-plan.v1 visual contract with typed check bindings to existing verifier actions, rather than interpreting arbitrary report prose or shell commands.
- Capture a task-start filesystem baseline and compare actual Git-visible changes using the existing execution-target scope logic. Preserve pre-existing dirty changes and inspect edits to already-dirty files.
- Bind the observed checks and task scope result into existing artifact metadata and native state/events, retaining snapshot invalidation and owner review.
- **BREAKING** Legacy self-declared native passes remain readable but require a fresh supported verification and task baseline before they can advance. Normal project-root film/edit/web gates retain their existing behavior.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `design-pipeline`: Observed native task verification, task-scoped change checking and fail-closed completion/recovery.

## Impact

Existing `plan-core.cjs`, `workflow-core.cjs`, `cli-core.cjs`, and shared execution-target inspection in `execution-target-core.cjs`; existing workflow/interaction/execution tests and `stages.md`/`qa-checklist.md`. Migrate the existing component-eval native consumer and its fixtures to the supported binding and observed completion. Reuse artifact.v1, native state/events and existing verifier reports. Reference existing execution/toolchain receipts only when their genuine routed context exists; a visual-plan hash is not a toolchain-plan hash.

No new runner, gate/receipt schema, target resolver, policy digest, dependency or automatic cleanup is proposed. Component-first pure gates remain non-executing. This slice prevents accidental self-report promotion through the trusted public CLI; stronger authentication against an agent that can rewrite the tool and state requires a separate host permission or trusted CI boundary.

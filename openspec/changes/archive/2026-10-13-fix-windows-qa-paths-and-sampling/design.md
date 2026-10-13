## Context

The 2026-10-08 Good CSS QA log records 34 remaining failures: six component-eval, two execution-target Git, one interaction-capture and 25 workflow-next. One separate capability registry ordering failure has already been repaired. Existing native-verification changes own much of the failing code; preserve and complete their contracts rather than reverting their coverage.

## Decisions

Reuse the existing path containment, Git snapshot and native completion flows. Canonicalize one physical Windows path consistently at their shared seam; do not whitelist aliases or bypass containment. Inspect every caller before editing. Keep unsupported filesystem cases fail-closed.

Use existing failed tests as the feedback loop. Pointer motion checks must distinguish genuine discontinuity from missed browser frames under machine load; first reproduce and measure the actual timestamp/input/sample flow. Do not relax thresholds merely to pass.

## Ownership

- Path repair: contract-utils.cjs, execution-target-core.cjs and associated existing tests.
- Native completion: workflow-core.cjs/workflow-next.test.cjs and component-eval files, with separate owners coordinating the path dependency.
- Interaction sampling: interaction-capture-core.cjs and its existing test file.
- Integration owner: this OpenSpec change, verification, audit of selected Git changes and publication.
- Offline study boundary: native real paths for the existing source/output guard, tested only against a temporary source copy.

## Verification

Run focused red/green checks before complete npm test. Full QA, source integrity and strict specs must pass on the published tree. Preserve Component Conformance and Visual Acceptance as separate concepts; repository QA does not grant product appearance acceptance. Publish no scratch evidence, local tools or credentials.

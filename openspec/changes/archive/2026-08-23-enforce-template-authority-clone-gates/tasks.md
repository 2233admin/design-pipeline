## 1. Contract and initialization

- [x] 1.1 Extend the manifest validator and JSON schema with the optional implementation-authority contract.
- [x] 1.2 Emit a conservative implementation-authority contract for newly initialized clones.
- [x] 1.3 Document template authority, allowed differences, protected invariants, and interaction-environment selection.

## 2. Evaluation

- [x] 2.1 Extend verification input inspection with authority identity, invariant, difference, replay, environment, and evidence-path checks.
- [x] 2.2 Preserve blocked outcomes for missing evidence and fidelity-limited outcomes for measured contract violations.

## 3. Regression and release validation

- [x] 3.1 Add regression tests for missing authority, unauthorized differences, missing invariants, and headless substitution.
- [x] 3.2 Run OpenSpec validation, focused website-cloning tests, repository QA, package checks, installed self-check, and Sentrux rules.
- [x] 3.3 Prepare and reconcile the feedback-backed PR publication request.

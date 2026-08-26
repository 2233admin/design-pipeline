# Tasks

- [x] Define strict schemas and validators for external skill versions, task-session policies,
  candidate diffs, evaluation manifests, evidence receipts, promotion, rollback, and forgetting.
- [x] Implement deterministic effective-policy resolution with explicit scope precedence and a
  non-bypassable Methodology Kernel/project-constraint boundary.
- [x] Implement shadow-only candidate generation limited to `add`, `replace`, and `delete`, with
  bounded scope, redaction, expiry, and reviewer-visible receipts.
- [x] Implement independent held-out and replay evaluation against the incumbent with strict
  improvement promotion and fail-closed outcomes for ties, unknowns, and regressions.
- [x] Implement user review, opt-in, rejection, version selection, rollback, and scoped forgetting
  without erasing mandatory audit tombstones.
- [x] Add focused regression coverage and release QA proving no RL/weight-training path, no hidden
  profile, no gate bypass, no default live adaptation, and deterministic recovery from failures.
- [x] Run focused and full verification; record exact commands and results in `qa.md`.

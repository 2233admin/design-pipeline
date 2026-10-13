## 1. Diagnose

- [x] 1.1 Run the existing three-case loop, retain actual failures and compare hermetic, concurrent and original-layout runs.
- [x] 1.2 Rank falsifiable causes and inventory the existing shared repair and its callers.

## 2. Repair proved defects

- [x] 2.1 Run the existing physical-alias and diagnostic-message regressions red; reuse the minimal published shared repair and prove green without weakening containment.
- [x] 2.2 Investigate any separately reproduced browser or state defect; retain the distinction between measured failure and unobserved blocking.

## 3. Verify and publish

- [x] 3.1 Run focused checks, complete repository/browser QA and strict specifications; remove active debug instrumentation and document limits of causal conclusions.
- [x] 3.2 Review the scoped diff, commit and push the authorized fix, preserving unrelated work.

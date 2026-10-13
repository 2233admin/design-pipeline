# QA

Evidence details and limitations: [verification.md](verification.md). Actual local logs live under ignored `.design-pipeline/harness-verification-1791384595797/`.

## Run verification

- Launch: public CLI is per command; no persistent target server started. Browser regression owns and closes its captures.
- Doctor: real CLI returned ready. This is package readiness, not target-app acceptance.
- Drive: 11 actual CLI commands exercised premature delivery, timestamp-preserving input drift and verifier-based recovery. Real browser regression exercised three local page bindings; Windows CLI and output collision/hard-link regressions also passed.
- Evidence: retain before/after stdout, stderr, exit codes and state-preservation assertions. Test static-click expectations do not claim responsive behavior.
- Cleanup: four owned temporary project directories were removed after containment checks; before/after/guide evidence remains. No persistent process required stopping.

## Self-Check

- Required OpenSpec workflow used; change remains open and unarchived.
- Missing skills/fallbacks: none for this implementation. Broad code-intelligence bootstrap was unavailable in reconnaissance; bounded source/caller inspection supplied repository evidence instead.
- Component Conformance: existing affected engineering checks passed. Functional coverage is bounded to the exercised command and page-binding paths. Owner Visual Acceptance: not requested or granted.

## Static Checks

- Runtime/test syntax checks: passed.
- Focused workflow: 46 initial GREEN tests plus separately passed actual-browser, Windows and collision regressions; all are also covered by the final full suite.
- Film/edit focused checks: 17 passed, no skips.
- Strict specs: 46 items passed, zero failures.
- Whitespace diff: passed.
- Build/package: reproducible archives, required QA guide and isolated-install smoke passed.
- First full QA: 823 passed / 14 process-spawn failures through a transient NVM executable alias. Fixed-executable rerun: exit 0, 955 repository tests and 12 installed-package tests passed, zero failed/skipped; browser adapter and BuilderPort self-tests passed. No source workaround or machine-default change.

## Control Plane Checks

- Legacy workflow-state.v1 remains in use; native schemas/events/receipts untouched.
- Premature decisions and colliding outputs preserve state bytes. Missing/changed/unbound checked inputs reopen the existing action.
- Latest review and standard delivery bind the checked snapshot; reject history remains readable. Legacy timestamp-only passes need a fresh check without deleting state.

## Browser / Visual Checks

- Actual browser capture regression passed with no skip. Static target and declared `responds: false` test measured-page bindings only.
- Responsive layouts, visual direction, final screenshots and creative acceptance are outside this runtime change.

## Plain-Language Checks

- New errors identify the pending workflow action or the separate output directory needed for recovery.
- Guide distinguishes readiness, captured evidence, file integrity, functional coverage and owner Visual Acceptance.

## Frontend Redesign / Direction Preview / CJK / Website-Cloning Fidelity Checks

Not applicable: this change does not author a frontend redesign, direction candidates, CJK interface or website clone. Pre-existing related work remains preserved.

## Agent-Readable State

One existing next action is retained; no parallel runner or receipt is introduced. Old evidence remains readable and resumes through fresh check/review/delivery actions.

## Package And Release Reproducibility

Required QA guide is present in the actual archive. Archive repeatability and isolated installation passed. This work does not release or install into the real user agent home.

## Final Verdict

Engineering verification passed within the recorded scope; independent review found no blocking issue. Owner Visual Acceptance is not evaluated by this runtime change.

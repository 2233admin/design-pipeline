# Tasks

## 1. Current workflow evidence

- [x] 1.1 Add regressions in existing workflow-next.test.cjs for premature delivery, missing/same-time changed inputs, legacy passes, stale review/delivery and actual render binding; reproduce the failures before the runtime fix.
- [x] 1.2 Extend existing gate records and shared stage checks with content bindings, wire actual public-verifier inputs and reuse the film render selector; verify with workflow-next.test.cjs and existing film project checks.
- [x] 1.3 Bind shared review and standard delivery to current evidence, preserve UI and quick compatibility, and document the recovery path in existing stages.md; verify normal and rejected/stale paths in workflow-next.test.cjs.

## 2. Agent verification method

- [x] 2.1 Extend existing qa-checklist.md with launch/doctor/drive/evidence/cleanup and failure recovery, link it from SKILL.md and register its existing resource; verify references, package inclusion and preserved partial-capture/visual-acceptance boundaries.
- [x] 2.2 Follow the guide through a real public CLI path, retain its actual outputs and perform cleanup without deleting evidence; record the reproduction and repaired behavior in this change's verification.md.

## 3. Integration verification

- [x] 3.1 Independently review the focused diff and run npm test, npm run specs:check and git diff --check; record results and remaining limits without claiming creative acceptance or complete pstack integration.

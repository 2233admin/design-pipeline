# Tasks

## 1. Implementation

- [x] 1.1 Create the proposal, design and design-pipeline spec delta before editing runtime behavior.
- [x] 1.2 Add isolated installed-checker regressions for standard user/project roots, legacy roots, explicit exclusivity and precedence, missing resources, root order and de-duplication.
- [x] 1.3 Extend only the existing default root branch, preserving explicit multi-root settings and legacy ordering.
- [x] 1.4 Document default directories, explicit overrides and the diagnostic-only boundary; add a minimal changelog entry without altering existing edits.

## 2. Clean-Worktree Verification

- [x] 2.1 Run `node --test tests/check-deps.test.cjs`: 21 passed, 0 failed, including isolated installed user/project discovery, legacy roots, explicit exclusivity, precedence and missing-resource cases.
- [x] 2.2 Run `npm run specs:check`: 26 passed, 0 failed; the new change validates strictly.
- [x] 2.3 Install the clean worktree's skill through standard `npx skills add` into a standalone project outside the repository. With an empty isolated home and explicit roots cleared, the installed checker reports `OK` with 1082 bundled resources. Its doctor reports `ready` with no missing resources, the Visual Craft scaffold creates its output, and an explicit invalid root still returns `FAIL` and exit 1.
- [x] 2.4 Complete local `npm test` and record its result: exit 1; 1484 tests, 1474 passed, 6 failed, 4 skipped. Two failures explicitly report Windows temporary-directory rename `EPERM` in DesignMD and palette tests; four website-cloning assertions also fail. Packaging, archive installation, installed self-check and installed public CLI smoke pass. This is not a full-suite pass.
- [x] 2.5 Run `npm run test:browser` separately because the failed QA command prevents its `&&` continuation: both browser adapter and BuilderPort self-tests pass.

The original shared worktree and its unrelated edits were not included. Local QA failure is retained, not suppressed. Required PR CI must pass before merge; GitHub check runs are the authoritative evidence for that final integration gate.

Checked items record performed work, not a full-suite pass, user or visual acceptance, or permission to archive.

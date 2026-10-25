# Tasks

## 1. Implementation

- [x] 1.1 Create the proposal, design and design-pipeline spec delta before editing runtime behavior.
- [x] 1.2 Add isolated installed-checker regressions for standard user/project roots, legacy roots, explicit exclusivity and precedence, missing resources, root order and de-duplication.
- [x] 1.3 Extend only the existing default root branch, preserving explicit multi-root settings and legacy ordering.
- [x] 1.4 Document default directories, explicit overrides and the diagnostic-only boundary; add a minimal changelog entry without altering existing edits.

## 2. Integration Verification

- [x] 2.1 Run `node --test tests/check-deps.test.cjs`: 21 tests passed, 0 failed, including isolated installed-checker default discovery, explicit exclusivity, precedence and missing-resource regressions.
- [x] 2.2 Run `npm exec -- openspec validate fix-standard-skills-install-discovery --strict` (valid) and `npm run specs:check` (32 passed, 0 failed).
- [x] 2.3 Install the local repaired skill through `npx skills add` into a standalone temporary project outside the repository. With explicit roots cleared and an isolated home containing no installation, its installed self-check reports core `OK`, 1111/1111 resources and overall `OK`. A separate isolated user `.agents/skills` installation reports `OK` through its installed JSON checker. An explicit absent root reports `FAIL` and exit 1 despite complete default copies. Companion discovery is covered by the isolated installed-checker regression scenarios.
- [x] 2.4 Complete `npm test` for repository QA on the final integration tree.
  - Attempted: repository QA is not green. The run reports `FAIL test manifest covers every tests/*.test.cjs` and failures in the concurrently added answer-me-with-html tests, then ends with `[Command aborted]`. Full-suite completion and browser-test completion remain unverified.

Focused repair checks and standalone installation smoke passed. Full repository QA remains unsuccessful on the shared integration tree; unrelated answer-me-with-html work was not modified. The fix is local and has not been committed or pushed.

Implementation and verification checkboxes record performed work, not a full-suite pass, user or visual acceptance, or permission to archive.

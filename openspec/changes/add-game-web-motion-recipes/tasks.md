## 1. Recipe authoring

- [x] 1.1 Add original HP ghost-bar guide and offline specimen with repeated-damage/healing/reduced-motion cases.
- [x] 1.2 Add original cooldown-completion guide and offline specimen with restart/cancel/single-completion cases.
- [x] 1.3 Add original reward-arrival guide and offline specimen with immediate grants/repeated input/reset cases.
- [x] 1.4 Add original menu-switch guide and offline specimen with latest-state/focus/Escape/reduced-motion cases.

## 2. Existing-path integration

- [x] 2.1 Add recipe index and existing catalog doc/method records with original provenance and local paths.
- [x] 2.2 Add narrow workflow/tool guidance links and required package resources; preserve concurrent edits.

## 3. Verification and release note

- [x] 3.1 Run existing CLI discovery in Chinese/English for all recipes and confirm component platform search remains isolated.
- [x] 3.2 Open every offline specimen and exercise normal, interruption/reset and reduced-motion behavior with fresh visual evidence.
- [x] 3.3 Run existing catalog/package checks within npm test, strict change validation and repository specs; record exercised results.
- [x] 3.4 Add the verified recipe change to the changelog and record technical evidence separately from owner Visual Acceptance.

Task 3.3 is blocked by the concurrent `internalize-answer-me-with-html` change. Its new vendor/companion source URLs lack a canonical catalog source, two newly registered tests were not yet present, and package files were being written during QA. The recipe source-registration defect was fixed; its canonical identity/license/local-pointer checks pass. Full QA and a fresh final archive must run after the ambient change converges. No pending recipe implementation or specimen behavior was replaced by this blocker.

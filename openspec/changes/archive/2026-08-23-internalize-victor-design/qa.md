# QA

Verified on 2026-08-14.

- `node --test tests/victor-design-guidance.test.cjs tests/plain-language.test.cjs tests/anti-slop-review.test.cjs tests/direction-preview.test.cjs` — 18 passed, 0 failed.
- `node skill/scripts/designer-pipeline.cjs direction check --stage selection --root . --change-root openspec/changes/internalize-victor-design --json` — `ready`; preview correctly waived as non-visual guidance.
- `node scripts/qa.cjs` — package build, reproducibility, isolated install, CLI smoke, and 398 of 399 repository tests passed.
- Full QA has one unrelated failure in the pre-existing `frontend-stack-routing` worktree changes: the HyperFrames keyword route is also returned for an ordinary dashboard brief because its registry entry carries the always-present `design-workflow` capability. This change does not touch that registry, router, or test.
- `git diff --check` — no whitespace errors.

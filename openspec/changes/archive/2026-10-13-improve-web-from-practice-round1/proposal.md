# Improve web workflows from practice round 1

## Why

The web trial skipped intake when a user-owned `BRIEF.md` existed, then overwrote that assignment when intake was explicitly recorded. Returned commands targeted the shell's current directory instead of the selected project. Three concept cards shared one layout skeleton. Cover/KV studies optimized isolated text measurements while breaking subject placement, scene continuity, reading order and aspect-ratio relationships.

## What Changes

- A: Complete intake only from a recorded state decision; refuse case-insensitive collisions with brief files not written by intake. Apply the shared protection to film, edit and UI as well as web.
- B: Bind workflow action commands and record templates to the selected absolute project root using the existing shell quoting convention, across film/edit/web/UI.
- C: Require three structurally divergent web first screens, a one-line skeleton per card and an agent same-size contact-sheet pre-screen before asking the user. Redo failed cards without presenting them; screening is not Visual Acceptance.
- D: Teach relational reference layout study at the native aspect ratio in the existing reference guide, with separate ratio adaptation, coupled subject/scene/lockup relations, legibility and visual pre-screening.

## Capabilities

### New Capabilities

None; extend the existing design-pipeline workflow and reference methods.

### Modified Capabilities

- `design-pipeline`: intake decisions, project-root-bound workflow commands, web concept guidance and relational reference study.

## Impact

Runtime: `skill/scripts/workflow-core.cjs` and `skill/scripts/workflows/`. Regression tests reuse registered workflow test files. Maintained instructions change in `workflow-web.md`, `web-direction.md`, `reference-spec.md` and intake guides where needed. No new gate, receipt schema, target resolver or policy digest. Film product-source/sample logic, mechanism documents and template schemas are out of scope.

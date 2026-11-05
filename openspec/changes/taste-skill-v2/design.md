## Decisions

1. One source, one bundle: `skill/vendor/taste-skill/upstream/` holds the complete reviewed tree at
   `12af471` (72 files, 3,093,372 bytes, Git tree `db698c9`), imported by the existing importer with
   pinned revision, tree, canonical hash and inventory. `install.sh` keeps its `100755` mode in the
   manifest; stored copies are not executable. No file exceeds 1 MB, so nothing is fetched on demand.
2. The guide routes by deliverable: new site (the run), redesign (special cases), app screens
   (`app-screens.md`), critique (`critique.md`). Former methods are listed once with the upstream
   repository that now holds them and the pipeline route to use instead; the guide links none of
   their anchors.
3. Tools run only when an agent chooses to, with Node from the packaged path, from the target
   project's root, writing under `.design-pipeline/`. Their output is review evidence, not a receipt;
   no gate consumes it. Findings about taste never fail a stage. Real defects they find (covered or
   cut text, overflow, contrast, missing headings) are fixed through the existing checks.
4. Upstream house rules apply when the route is selected and yield to the project's brand, design
   system, accessibility and locale typography. Exceptions are recorded in `design.md`.
5. With an open direction the three-source preview decides; a draw is used when the direction stage
   was waived, or after selection with `--keep palette,type` for section blueprints.
6. The new entry's description is a folded YAML block scalar. `scripts/import-taste-skill.cjs` reads
   it and refuses a description that is still an indicator. `scripts/git-tree-snapshot.cjs` is not
   changed: answer-me-with-html's build provenance pins its SHA-256.

## Ownership and migration

- `scripts/import-taste-skill.cjs`, `skill/vendor/taste-skill/**`, `tests/taste-skill.test.cjs`.
- `skill/references/taste-skill.md` and its consumers: `SKILL.md`, `stages.md`, `capability-routing.md`,
  `companion-skills.md`, `feature-routes.md`, `pipeline-reference.md`, `workflow-web.md`,
  `qa-checklist.md`, `interface-discipline.md`, `tools/README.md`, `docs/features.md`.
- The marker `built-in-taste-suite` becomes `built-in-taste-skill` in `companion-capabilities.json`.
- Removed anchors (`#design-taste-frontend`, `#image-to-code`, `#brandkit`, and the other former
  method anchors) have no aliases; every consumer was updated.

## Risks

- v2 tells overlap the anti-slop review. Keeping v2 advisory leaves one judge for gates.
- Users who relied on concept-image or brand-board methods now go through the image provider and
  brand routes until imagegen-skills is vendored.

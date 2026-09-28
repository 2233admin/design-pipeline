---
sourceMeta:
  id: onetake-reference-skill
  kind: github
  url: https://github.com/feitangyuan/onetake/tree/36072d36e777a7de4604eacaa110342f80ae76eb
  reviewedRevision: 36072d36e777a7de4604eacaa110342f80ae76eb
  reviewedContentHash: f5d0914ed654dc4dba1d4024394225ed37b6bf17d53d555e675ecdc531a64a18
  contentHashScope: ordered UTF-8 sourceFiles with path-and-newline separators
  sourceFiles: README.md, LICENSE
  reviewedAt: 2026-09-28T00:00:00.000Z
  freshnessDays: 30
  license: PolyForm-Noncommercial-1.0.0
  useBoundary: reference-only; ideas only; do not install, execute, copy, or bundle upstream code, text or assets
  codeCopied: false
---

# Reference skill: onetake

Provenance record for the onetake agent skill, which this project studies as a reference for
continuous-camera product films. The canonical repository is `feitangyuan/onetake`.

## Boundary

- The license is PolyForm Noncommercial 1.0.0. This repository is MIT, so nothing from the
  upstream repository enters it: no code, prose, prompts, data or assets. Only ideas, restated in
  our own words and implemented independently, may be adopted.
- Running the skill for comparison (see `openspec/changes/redesign-user-workflow/design.md`,
  Q18-Q19) is research use. Its outputs stay in private benchmark directories and are never
  committed here.
- Each adopted idea names this record in its OpenSpec change so the lineage stays auditable.

## Review

- 2026-09-28: first review at `36072d36`, the upstream default branch head (committed
  2026-09-26).
- Review again before `reviewedAt` plus `freshnessDays`; `tests/source-governance.test.cjs` fails
  once the record is older than that.

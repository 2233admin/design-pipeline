---
sourceMeta:
  id: motion-web-reference-skill
  kind: github
  url: https://github.com/feitangyuan/motion-web/tree/5f4e40f1253e11e28850d08dce28b9b7e4320115
  reviewedRevision: 5f4e40f1253e11e28850d08dce28b9b7e4320115
  reviewedContentHash: 68945441b0bbd6b79f2849206c019c2c7bc01a13a2bbd5c267c9c3d5c069c1b4
  contentHashScope: ordered UTF-8 sourceFiles with path-and-newline separators
  sourceFiles: README.md, LICENSE
  reviewedAt: 2026-09-28T00:00:00.000Z
  freshnessDays: 30
  license: CC-BY-NC-4.0
  useBoundary: reference-only; ideas only; do not install, execute, copy, or bundle upstream code, text or assets
  codeCopied: false
---

# Reference skill: motion-web

Provenance record for the motion-web agent skill, which this project studies as a reference for
motion-first websites. The canonical repository is `feitangyuan/motion-web`; `2233admin/motion-web`
is a fork and is not the source of record.

## Boundary

- The license is CC BY-NC 4.0 (non-commercial). This repository is MIT, so nothing from the
  upstream repository enters it: no code, prose, prompts, data or assets. Only ideas, restated in
  our own words and implemented independently, may be adopted.
- Running the skill for comparison (see `openspec/changes/redesign-user-workflow/design.md`,
  Q18-Q19) is research use. Its outputs stay in private benchmark directories and are never
  committed here.
- Each adopted idea names this record in its OpenSpec change so the lineage stays auditable.

## Review

- 2026-09-18: first review at `5f4e40f1`.
- 2026-09-28: re-reviewed. The upstream default branch is still at `5f4e40f1`; the recomputed
  content hash of `README.md` and `LICENSE` matches, and the license is unchanged.
- Review again before `reviewedAt` plus `freshnessDays`; `tests/source-governance.test.cjs` fails
  once the record is older than that.

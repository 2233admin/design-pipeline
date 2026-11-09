---
sourceMeta:
  id: motion-web-reference-skill
  kind: github
  url: https://github.com/feitangyuan/motion-web/tree/536ef6551530ff0c6b091e2b7786d3ecc21f26fa
  reviewedRevision: 536ef6551530ff0c6b091e2b7786d3ecc21f26fa
  reviewedContentHash: 872f0816f29cb301d4b750c7a562a0c19e7d591853c7d80c0ae495995158e180
  contentHashScope: ordered UTF-8 sourceFiles with path-and-newline separators
  sourceFiles: README.md, LICENSE
  reviewedAt: 2026-11-09T00:00:00.000Z
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
- Running the skill for comparison (see `openspec/changes/archive/2026-10-15-redesign-user-workflow/design.md`,
  Q18-Q19) is research use. Its outputs stay in private benchmark directories and are never
  committed here.
- Each adopted idea names this record in its OpenSpec change so the lineage stays auditable.

## Review

- 2026-09-18: first review at `5f4e40f1`.
- 2026-09-28: re-reviewed. The upstream default branch is still at `5f4e40f1`; the recomputed
  content hash of `README.md` and `LICENSE` matches, and the license is unchanged.
- Review again before `reviewedAt` plus `freshnessDays`; `tests/source-governance.test.cjs` fails
  once the record is older than that.

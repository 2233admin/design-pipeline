# QA

Verified locally on 2026-07-20 as the `v0.6.0` release candidate.

## Automated evidence

- `node --test --experimental-test-coverage tests/*.test.cjs`: 112 passed, 0 failed; total line
  coverage 89.90%, branch coverage 60.10%, and function coverage 96.89%.
- `PACKAGE_VERSION=0.6.0 node scripts/qa.cjs`: repository structure, references, strict schemas,
  project DESIGN/MOTION foundations, normalized motion model, all 112 tests, and package generation
  passed.
- Two consecutive package runs produced byte-identical `.tgz` and `.zip` archives. An independent
  Node 20.19.1 comparison produced identical TGZ and ZIP hashes on Windows and Ubuntu 24.04, and
  both hosts extracted matching `SKILL.md` content. QA generates `checksums.txt` for the final
  source commit instead of embedding a pre-commit checksum here.
- Installed skill self-check returned `OK`; the installed skill and repository `skill/` tree have no
  content diff.
- Code-intel completed 7 checks with 0 failures. The reviewed release-candidate state was saved as
  the post-merge Sentrux baseline; check and gate then passed at quality 6908 with no coupling,
  cycle, or god-file regression. Maximum measured complexity is 18 in
  `inspectMappingReferences`.

## Review evidence

The independent architecture and code-review passes first identified four foundation integration
gaps and then three artifact-boundary gaps. The implementation now:

- validates motion safety as structured data and keeps the schema, normalized model, and checker
  aligned;
- applies one DESIGN, MOTION, and palette preflight to website-cloning implementation and
  completion;
- validates the website-cloning manifest before initialization, resume, evaluation, or persistence;
- rejects anti-slop output and palette evidence that escape through symlinks or directory
  junctions; and
- rejects unknown fields across anti-slop rubric/evidence and palette evidence shapes.

The final independent re-audit passed. Targeted security and strict-shape tests are included in the
112-test suite.

A separate release-archive review caught host-tool metadata differences, silent pre-1980 timestamp
clamping, optional ZIP validation, and destructive failure cleanup. The final packager writes
canonical TAR/GZIP/ZIP structures directly in Node, preserves the declared package timestamp,
requires both archives, and publishes through a recoverable directory swap. Its Windows/Ubuntu
re-audit passed.

## Known non-blocking observations

- The installed Anime.js companion is usable but its capability audit warns that the companion
  contract does not yet advertise `adapters`, `3d-stagger`, or `deterministic-stagger`; the
  documented fallback is the official Anime.js v4.5 reference.
- Code-intel remains amber only because stricter hypothetical complexity limits would flag the
  existing `inspectMappingReferences` hotspot. Current structural rules pass and report no
  regression.

## Publication boundary

This file records the release-candidate evidence. Remote PR, merge, tag, and release publication
occur after the evidence is committed.

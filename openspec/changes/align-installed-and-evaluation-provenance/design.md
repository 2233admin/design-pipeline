# Design

## Decision

Treat each copy as a separate evidence subject. Git commit and `skill/` Git tree identify committed source; a version string only names a release line. Archive SHA-256 identifies published bytes. A path/realpath, per-file inventory and whole-tree digest identify an installed or frozen copy. Existing `PACKAGE.json` carries version/time/source URL, not a source commit; record the commit and tree alongside it rather than inventing a new resolver or receipt.

Use a clean, pinned publication snapshot only after all runtime and documentation slices land. Package that entire snapshot, extract the archive, and copy the complete extracted skill into a disposable project's `.agents/skills/design-pipeline`. Use explicit installed CLI paths and explicit dependency-discovery roots to avoid an older global copy winning. Compare extracted and installed file inventories before assigning verification to the installed copy. A candidate archive is not a new published release.

## Ownership and compatibility

This change owns `skill/references/installation.md`, `docs/installation-and-evaluation-provenance.md`, and the proved later-round checkbox in `add-golden-case-library/tasks.md`. The frontend owner owns README and skill entry/workflow guidance; the integration owner owns CHANGELOG and the package resource registry. The maintained repository guide is not shipped in the skill archive; the installation reference remains standalone for installed consumers.

All public commands and v1 state/decision/receipt/target/policy lineage remain unchanged. Historical names and logs retain their original identities; a maintained pointer explains archived paths. No partial-file sync, global junction replacement or original checkout edits are performed.

## Evidence policy

Use four distinct statements: implemented, technically exercised, model experiment, owner visual acceptance. Only explicit owner approval tied to a reviewed artifact corrects an acceptance task. Recorded historical hashes remain recorded evidence when local raw logs are unavailable, not freshly recomputed verification. Old technical checks or accepted films do not establish current model performance.

## Verification boundary

Identity reads and documentary corrections can finish before integration. Strict OpenSpec, targeted regression, final frozen packaging, copied installation, installed `doctor`/`check-deps` and real CLI/web smoke run once under the integration owner. Keep these tasks pending until actual output and the new immutable identity are appended to `verification.md`; never pack a partially integrated runtime tree.

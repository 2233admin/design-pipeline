# QA

## Baselines

- Clean `ca98894a232563f3a0e9b5ed38cdae4c5688f415`: `112/112` tests, repository QA passed.
- Clean commit plus allowlisted P3 overlay: `118/118` tests, repository QA passed.
- Primary dirty-tree status SHA-256 before/after overlay:
  `92e07bdc7d706b1b448d903a30c29a693ee60dc822d45ecf82752423e75e6396`.

## Publication authority

The user explicitly requested completing and pushing the phases, and previously explicitly requested
main-branch publication plus a release. Publication remains gated on the exact staged candidate and
successful local/remote checks.

## Final local verification

- Command: `node scripts/qa.cjs`.
- Result: `170/170` tests passed across `25` manifest-declared test files.
- Syntax: every packaged script, adapter, installer, package script, and QA script passed.
- Control plane: doctor, foundation, state consistency, adapter registry, and style signals passed.
- Reproducibility at `SOURCE_DATE_EPOCH=1784764800`:
  - TGZ: `161659` bytes in both builds.
  - ZIP: `661925` bytes in both builds.
  - TGZ, ZIP, and `checksums.txt` were byte-identical.
- Package completeness: every declared resource plus generated `PACKAGE.json` and
  `scripts/install-local.cjs` was present.
- Failure atomicity: invalid packaging preserved prior artifacts; failed replacement preserved the
  previous installed tree; interrupted state initialization/advance preserved a consistent pair.
- Isolated install: performed from the extracted package installer under isolated HOME/CODEX_HOME
  with invalid proxies; implicit replacement failed, explicit replacement passed.
- Installed-package smoke: all six public CLI scenarios passed.
- Evidence trust: capture writes to a temporary contained root, validates credential-free URL,
  recomputes artifact hashes, and publishes only a complete validated receipt tree.
- Repository status: byte-identical before and after QA.

## Review observations repaired

- Scene `unknown` availability was separated from placeholder prose and now blocks execution.
- Benchmark required failures can create only a redacted, deduplicated local feedback observation.
- New state initialization and successful-commit cleanup were made crash-safe.
- Local install replacement now stages first and rolls back to the prior tree on failure.
- Release archives now carry their own installer; QA no longer borrows the source-tree installer.
- New-path containment now resolves the closest existing parent to reject junction/symlink escape.
- CLI unknown/duplicate options fail with stable error codes.

## Independent review infrastructure

Native reviewer/verifier attempts were rejected by the Codex runtime with
`Store must be set to false`. The built-in read-only review path then failed while loading its
mandatory review skill, and direct diff-only review attempts terminated on the local Codex model
cache compatibility error before returning a verdict. These infrastructure failures did not mutate
the worktree and produced neither findings nor an approval. The leader completed an explicit
adversarial review, repaired the observations above, and performed staged-diff format, artifact,
size, binary, and credential scans. Release proceeds with the unavailable independent verdict
recorded as a tooling residual risk rather than misreported as approval.

## v0.7.0 release verification repair

The first published package exposed a documentation/runtime drift during the required downloaded
artifact check: the README no-`--source` command expected the packaged installer to use the package
root, while the installer still defaulted to a source checkout's `skill/` directory. The patch
makes source selection layout-aware, corrects the destination `--root` example, and changes
hermetic QA to run the documented packaged command. A dedicated regression test and the full
`170/170` suite pass before the non-destructive `v0.7.1` patch release.

## Completed release verification

- Main CI `29962353562` passed for patch commit
  `b14389a3cabfe023f7a48fc8ad14ab9ac50e1517`.
- Release workflow `29962416312` passed for the exact same commit and published
  [v0.7.1](https://github.com/2233admin/design-pipeline/releases/tag/v0.7.1).
- Downloaded `design-pipeline-skill.tgz` SHA-256:
  `2d8eec0beeb7f2e543dd8eb9a47a6720dd938c2068ced24efde994ba14297b5f`.
- Downloaded `design-pipeline-skill.zip` SHA-256:
  `3492cd27b7a7ba5c1195bae6f5cb6d5edb2e90dc77133f46ea5115432d0aff62`.
- Both hashes matched `checksums.txt` and the GitHub asset digests.
- The downloaded TGZ reported package version `0.7.1`, installed without `--source`, passed its
  dependency self-check, and returned `ready` from the installed public CLI doctor.

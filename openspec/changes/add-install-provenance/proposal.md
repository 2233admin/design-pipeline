# Installed copies say which source they came from

## Why

Step 1 of #76. `~/.agents/skills/design-pipeline` was a junction to a dev checkout with uncommitted
changes, 93 commits behind `main`, and `doctor` said `ready`. An installed copy records nothing
about its source, so neither the user nor `doctor` can tell a Release install from a stale or
locally edited copy. `doctor` only checks that the required files exist.

## What Changes

- `PACKAGE.json` at the skill root becomes the install provenance record
  (`schema: design-pipeline.install-provenance.v1`): `version`, `commit` (40 hex or null), `dirty`
  (true, false or null when unknown), `treeDigest` (`sha256:` over the installed files, rules
  `v1`) and `digestRules`.
- `scripts/package.cjs` writes those fields into the `PACKAGE.json` it already generates, using the
  repository commit and whether `skill/` or `scripts/install-local.cjs` has uncommitted changes. The
  digest is taken over the exact archive bytes. Packaging fails on names the Skills CLI drops
  (`metadata.json`, `.git/`, `__pycache__/`, `__pypackages__/`), which would otherwise make every
  Skills CLI install differ from the digest.
- `scripts/install-local.cjs` records provenance in the staged copy before the rename. From a Git
  checkout: `git rev-parse HEAD`, `git status --porcelain` on the source, and the repository
  `VERSION`. From a package that carries a record: the record is kept and its digest must match the
  staged copy, or the install fails. Otherwise commit and dirty are null.
- `doctor` shows version, short commit, dirty and whether the digest matches. A digest mismatch or
  `dirty: true` is a required-tier failure (blocked, exit 2) whose fix reinstalls. A copy at a
  standard location without a record gets a recommended-tier "provenance not recorded" warning. A
  copy outside the standard locations inside a Git work tree shows its commit, branch and dirty
  state as information. `doctor --json` carries `provenance` and `environment.install.git`.

## Reuse

`PACKAGE.json` (already generated into every package and listed in `package-resources.json`
`generated`) is extended instead of adding a second record file. `inspectDoctor` stays the source of
the blocked status; `doctor-report.cjs` tiers, `install-hints.cjs` `installCommand` and the exit-code
convention (0 ready, 2 blocked) are reused. No new gate, receipt schema or policy digest.

## Impact

Affects `design-pipeline` (local install, packaging, doctor). A copy installed from uncommitted work
now reports blocked until it is reinstalled from a clean source; `install-local.cjs` still installs
it. Copies installed before this change report "provenance not recorded" and keep working. Remote
freshness ("N commits behind") is not in this step.

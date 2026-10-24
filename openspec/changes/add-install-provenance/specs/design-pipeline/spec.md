## ADDED Requirements

### Requirement: Installed copies record their provenance

`PACKAGE.json` at the skill root SHALL carry `schema: design-pipeline.install-provenance.v1`, `version`, `commit` (40 hex or null), `dirty` (true, false or null), `treeDigest` and `digestRules: v1`. `scripts/package.cjs` SHALL write it into every package; `scripts/install-local.cjs` SHALL write it into the staged copy before the rename, or keep a carried record whose digest matches.

#### Scenario: A checkout is installed

- **WHEN** `install-local.cjs` installs from a Git work tree where `SKILL.md` is tracked
- **THEN** `commit` SHALL be `git rev-parse HEAD`, `dirty` SHALL be whether `git status --porcelain` on the source is non-empty, and `version` SHALL be the work tree's `VERSION`.

#### Scenario: The source is neither a checkout nor a recorded package

- **WHEN** the source has no Git work tree and no record
- **THEN** `commit` and `dirty` SHALL be null and the install SHALL succeed.

#### Scenario: A package was edited after packaging

- **WHEN** the source carries a record whose `treeDigest` differs from the staged copy
- **THEN** the install SHALL fail and the target SHALL be unchanged.

#### Scenario: A package is extracted and installed

- **WHEN** the archive is extracted and installed with its own `install-local.cjs`
- **THEN** the installed record SHALL equal the packaged one and its digest SHALL match.

### Requirement: The tree digest is reproducible

`treeDigest` SHALL be `sha256:` over `<path>\0<sha256 of raw bytes>\n` for each regular file, paths relative with `/`, sorted by UTF-8 bytes. `PACKAGE.json` and `.design-pipeline/` at the root SHALL be excluded; links SHALL NOT be followed. Packaging SHALL fail on names the Skills CLI does not copy.

#### Scenario: Excluded locations change

- **WHEN** `PACKAGE.json` or a file under `.design-pipeline/` changes
- **THEN** the digest SHALL stay the same.

#### Scenario: Any other byte changes

- **WHEN** an included file changes, including only its line endings
- **THEN** the digest SHALL change.

### Requirement: Doctor exposes a copy that drifted from its source

`doctor` SHALL show the recorded version, short commit, dirty state and whether the digest matches, in text and in `--json` `provenance`. A digest mismatch, `dirty: true` or an unreadable record SHALL be a required-tier failure with a reinstall command.

#### Scenario: A file of an installed copy is edited

- **WHEN** an included file differs from the recorded digest
- **THEN** `doctor` SHALL report blocked, exit 2 and print the reinstall command.

#### Scenario: The copy was installed from uncommitted work

- **WHEN** the record says `dirty: true`
- **THEN** `doctor` SHALL report blocked and exit 2; `install-local.cjs` SHALL still have installed it.

#### Scenario: A copy has no record

- **WHEN** a copy at a standard agent location has no record
- **THEN** `doctor` SHALL list "provenance not recorded" with the reinstall command as recommended and SHALL NOT block.

#### Scenario: A checkout runs in place

- **WHEN** the running copy is outside the standard locations, has no record and sits in a Git work tree
- **THEN** `doctor` SHALL show its commit, branch and dirty state and SHALL NOT block on them.

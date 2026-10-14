## ADDED Requirements

### Requirement: The package holds one SKILL.md and upstream skills keep their bytes

The packaged skill SHALL contain exactly one file named `SKILL.md`, the pipeline's entry. Bundled upstream files named `SKILL.md` SHALL be stored as `UPSTREAM-SKILL.md` with unchanged bytes, while manifests keep upstream paths and hashes. Verification, search results, preparation and imports SHALL map between the two names, and an import SHALL fail when an upstream tree already contains `UPSTREAM-SKILL.md`.

#### Scenario: The package is built

- **WHEN** the release package is built
- **THEN** its only `SKILL.md` SHALL be `design-pipeline/SKILL.md`

#### Scenario: A bundled snapshot is verified

- **WHEN** a vendor snapshot with stored `UPSTREAM-SKILL.md` files is verified against its manifest
- **THEN** file lists, blob ids, `gitTree` and `treeSha256` SHALL match using upstream paths

#### Scenario: A file escaped the rename

- **WHEN** a vendor snapshot contains a file named `SKILL.md`
- **THEN** verification SHALL block and name the file

#### Scenario: A catalog search returns a skill

- **WHEN** mengto or iart search selects an upstream skill
- **THEN** the returned path SHALL be the stored `UPSTREAM-SKILL.md` file, which exists

#### Scenario: An upstream already uses the stored name

- **WHEN** an import source contains a file named `UPSTREAM-SKILL.md`
- **THEN** the import SHALL fail before writing

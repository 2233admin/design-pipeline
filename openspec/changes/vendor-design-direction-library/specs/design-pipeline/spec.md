## ADDED Requirements

### Requirement: The design direction library ships its text and fetches its binaries

The package SHALL carry the library's license, references, 84 HTML style specimens, small text assets and scripts under `skill/vendor/` with a manifest recording the pinned source, Git tree and, per file, mode, blob id, size and SHA-256. The upstream `SKILL.md` SHALL be stored as `UPSTREAM-SKILL.md`. Images, audio and other files SHALL NOT be in Git or the package; the manifest SHALL list them with the same fields.

#### Scenario: Shipped and fetched parts cover the pinned tree

- **WHEN** the manifest's shipped and fetched objects are combined
- **THEN** they SHALL rebuild the recorded Git tree exactly, every shipped file SHALL match its hash, and no fetched path SHALL exist in the repository or package.

#### Scenario: A shipped file differs

- **WHEN** a shipped file is changed, removed or added, or a second `SKILL.md` appears
- **THEN** verification SHALL report `blocked` and `doctor` SHALL list the bundle as missing files.

### Requirement: The binaries are fetched through the existing source fetch

`sources fetch --bundle design-direction-library` SHALL download each listed file from the pinned commit, check size, Git blob id and SHA-256, and install the set into the user cache only when every file verifies. Until then `doctor` SHALL list the bundle under `downloads` without blocking.

#### Scenario: A downloaded file differs from the manifest

- **WHEN** one file's size, blob id or SHA-256 differs
- **THEN** the fetch SHALL fail with `SOURCE_CHANGED` and install nothing.

#### Scenario: Not fetched yet

- **WHEN** the bundle has not been fetched
- **THEN** verification SHALL return `missing` with the fetch command and the shipped text SHALL remain usable.

### Requirement: The library is reference material and its scripts are never run

Nothing in the package SHALL execute, import or install anything from the vendored scripts or their dependencies, and the manifest SHALL state that. The guide and `SKILL.md` SHALL describe the bundle by a neutral name and SHALL NOT change a stage, gate or `next` action.

#### Scenario: Scripts are present but inert

- **WHEN** the package is installed and a task runs
- **THEN** no command, gate, fetch or install step SHALL run a vendored script, and shipped files SHALL not be executable.

### Requirement: The former-name QA rule is scoped to the vendored bundle

QA SHALL fail any tracked path or content that contains the upstream name, except paths under the vendored folder, `THIRD_PARTY_NOTICES.md` and the importer script. Look-alike paths and every other file SHALL still fail.

#### Scenario: The name appears outside the allowed places

- **WHEN** a guide, test, `SKILL.md`, a sibling of the vendored folder or a differently named script contains the name
- **THEN** QA SHALL report each path as a failure.

### Requirement: The import is explicit and reproducible

The importer SHALL require a clean local checkout at the reviewed revision and Git tree, a valid review date and the reviewed content hashes, and SHALL replace the snapshot only after the new one is complete. It SHALL NOT recompute hashes from other content to accept a changed source.

#### Scenario: Unreviewed or dirty source

- **WHEN** the checkout is at another revision, has tracked changes or the date is invalid
- **THEN** the import SHALL fail and leave the existing snapshot unchanged.

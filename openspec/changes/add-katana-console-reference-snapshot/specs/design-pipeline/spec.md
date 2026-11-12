## ADDED Requirements

### Requirement: Versioned KATANA reference import

The pipeline SHALL import KATANA Console from an explicit Git commit through the existing v1 snapshot contract, recording repository, commit, source paths, byte hashes, source permission and original maturity. Import SHALL not include unrelated application or host files or execute source code.

#### Scenario: Repeatable import from a dirty working directory

- **WHEN** the importer is given a repository and fixed ref whose working directory has later edits
- **THEN** imported bytes and hashes SHALL match the Git objects at the fixed ref and SHALL exclude working edits and untracked files

#### Scenario: No maturity promotion

- **WHEN** a source specification or fixture declares an implementation state
- **THEN** the generated catalog SHALL retain that declaration separately from independent verification and route its component as a reference requiring review

### Requirement: Discoverable reference knowledge

The imported design system SHALL be usable by existing normalize, search, routing and token projection commands with an explicit snapshot path, retaining source attribution and without replacing another project's selected design system.

#### Scenario: Search and project tokens

- **WHEN** a user selects the KATANA snapshot and searches a component or projects foundation tokens
- **THEN** the command SHALL return the corresponding attributed reference entry or valid token artifact through existing contracts

### Requirement: Portable reference preview

The pipeline SHALL provide a read-only loopback preview of manifest-listed design files. Missing host tokens MAY be injected into HTTP responses without altering original source bytes. Paths outside the reference allowlist SHALL be refused.

#### Scenario: Card outside the Claude host

- **WHEN** an imported component card is opened through the local preview
- **THEN** its semantic token values SHALL resolve and its source, declared maturity and fixture context SHALL remain available

#### Scenario: Unlisted path

- **WHEN** a request resolves outside the imported source or to an unlisted file
- **THEN** the preview SHALL refuse the request rather than read that file

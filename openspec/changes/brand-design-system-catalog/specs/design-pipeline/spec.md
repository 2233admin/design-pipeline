## ADDED Requirements

### Requirement: Brand design systems are a pinned, fetched bundle

The package SHALL carry the brand design-system manifest (sources, revisions, Git trees, licences, system index, and per file mode, blob id, size and SHA-256) and the licence texts. The system files SHALL NOT be in Git or the package; `sources fetch --bundle brand-design-systems` SHALL download them from each source's pinned revision and install them only when every file verifies.

#### Scenario: A downloaded file differs from the manifest

- **WHEN** one file's size, blob id or SHA-256 differs
- **THEN** the fetch SHALL fail with `SOURCE_CHANGED` and install nothing

#### Scenario: Not fetched yet

- **WHEN** `doctor` runs before the fetch
- **THEN** it SHALL list the bundle under `downloads` with the fetch command and SHALL NOT block

#### Scenario: A cached or shipped file changes

- **WHEN** a fetched or shipped file no longer matches the manifest
- **THEN** verification SHALL report `blocked` and search and inspect SHALL refuse with the folder to remove and the fetch command

### Requirement: designmd search covers the brand design systems

`designmd search` SHALL return fetched systems beside the bundled examples, each with name, category, description, a palette signature and the paths to read, and SHALL keep every result reference-only. `--kind design-system` SHALL narrow to systems. `designmd inspect` of a system SHALL add its tokens normalised to Google DESIGN.md front matter, with the recorded correction overlay applied.

#### Scenario: Search before the fetch

- **WHEN** `designmd search --kind design-system` or `designmd inspect --id design-md:design-system:<id>` runs before the fetch
- **THEN** it SHALL fail with `TOOL_MISSING` naming `sources fetch --bundle brand-design-systems`
- **AND** a search without `--kind` SHALL return the examples and a `catalogs` entry naming the command

#### Scenario: Search after the fetch

- **WHEN** a query matches a system's name, category, description or DESIGN.md
- **THEN** the result SHALL include that system with `admission: reference-only` and `executableReady: false`
- **AND** the pipeline SHALL NOT install its files or front matter as a product `DESIGN.md`

#### Scenario: Normalised tokens

- **WHEN** a system is inspected
- **THEN** colours from `var()`, `rgb()`, `oklch()` and `color-mix()` SHALL be hex, the overlay SHALL win over `tokens.css`, and unsupported values SHALL be listed in `omittedTokens`

### Requirement: The brand catalog import is explicit, deduplicated and reproducible

The importer SHALL require clean checkouts of both reviewed revisions and Git trees, a valid review date and the reviewed content hashes, take English agent-facing files only, keep one system per id, attach correction overlays to the system they correct, and replace the bundle only after the new one is complete. The same sources SHALL produce byte-identical manifests.

#### Scenario: Unreviewed or dirty source

- **WHEN** either checkout is at another revision, has tracked changes, or the date is invalid
- **THEN** the import SHALL fail and leave the existing bundle unchanged

#### Scenario: An unmapped duplicate or overlay

- **WHEN** an overlay names no open-design system, or an exported duplicate maps to no chosen system
- **THEN** the import SHALL fail

## ADDED Requirements

### Requirement: Large upstream bundles are downloaded on demand and verified

The release package SHALL omit the MengTo and iart upstream files and keep their manifests. `sources fetch` SHALL download a bundle at its pinned revision, verify every file against the manifest's blob id and size, and install it into the user cache only when all files verify. A missing bundle SHALL be reported with the fetch command and SHALL NOT block `doctor` or install.

#### Scenario: A bundle is fetched

- **WHEN** `sources fetch mengto-skills` runs with network access
- **THEN** the cache SHALL hold the verified bundle at the manifest revision and search SHALL use it

#### Scenario: A downloaded file differs

- **WHEN** a downloaded file's blob id or size differs from the manifest
- **THEN** the fetch SHALL fail and leave no installed or partial bundle

#### Scenario: Search runs before a fetch

- **WHEN** MengTo or iart search runs and the bundle is in neither the repository nor the cache
- **THEN** it SHALL fail with `TOOL_MISSING` naming `sources fetch <bundle>`

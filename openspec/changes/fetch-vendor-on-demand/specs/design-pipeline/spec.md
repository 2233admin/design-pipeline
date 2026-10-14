## ADDED Requirements

### Requirement: Large upstream bundles are downloaded on demand and verified

The release package SHALL omit the MengTo and iart upstream files and keep their manifests. `sources fetch` SHALL download a bundle at its pinned revision, verify every file against the manifest's blob id and size, and install it into the user cache only when all files verify. A missing bundle SHALL be reported with the fetch command and SHALL NOT block `doctor` or install.

#### Scenario: A bundle is fetched

- **WHEN** `sources fetch --bundle mengto-skills` runs with network access
- **THEN** the cache SHALL hold the verified bundle at the manifest revision and search SHALL use it

#### Scenario: A downloaded file differs

- **WHEN** a downloaded file's blob id or size differs from the manifest
- **THEN** the fetch SHALL fail and leave no installed or partial bundle

#### Scenario: Search runs before a fetch

- **WHEN** MengTo or iart search runs and the bundle is in neither the repository nor the cache
- **THEN** it SHALL fail with `TOOL_MISSING` naming `sources fetch --bundle <bundle>`

## MODIFIED Requirements

### Requirement: MengTo skills are completely internalized

The pipeline SHALL use a complete, pinned, MIT-attributed `MengTo/skills` source tree and a
machine-readable catalog. The package SHALL carry the catalog manifest; the tree SHALL be downloaded
on demand and verified (see `Large upstream bundles are downloaded on demand and verified`) and
then used offline.

#### Scenario: A design technique is needed offline

- **WHEN** the user has the packaged design pipeline with the MengTo bundle fetched, and requests a
  matching visual, motion, reference, WebGL, or game workflow
- **THEN** local search SHALL return candidates from all bundled skills with exact source paths
- **AND** the selected source SHALL be adapted through project DESIGN, MOTION, dependency, and QA
  contracts rather than copied as project authority.

#### Scenario: The upstream snapshot is partial or altered

- **WHEN** a tracked file is missing, added, or byte-drifted
- **THEN** deterministic verification SHALL block
- **AND** revision, Git tree, counts, and canonical hash SHALL be updated together for a valid sync.

#### Scenario: A bundled workflow crosses an authority boundary

- **WHEN** a skill involves credentials, paid services, private accounts, publication, social
  posting, or other external side effects
- **THEN** bundling SHALL NOT grant authority
- **AND** the workflow SHALL remain explicit-only and subject to normal host boundaries.

#### Scenario: Kage is used as a scroll-world reference

- **WHEN** a task cites the separately published `MengTo/kage` repository
- **THEN** the pipeline SHALL route through the bundled `web-design/build-threejs-scroll-worlds`
  playbook plus the clean-room Kage case study
- **AND** it SHALL preserve the current repository's no-license boundary by importing no source,
  font, generated image, foreground artwork, or other project asset.

### Requirement: iart motion skills are internalized with activation boundaries

The pipeline SHALL use pinned, MIT-attributed iart-ai motion-skill packs that include a LICENSE,
plus the index repository. The package SHALL carry the manifest; the packs SHALL be downloaded on
demand and verified, then used offline. Packs without a LICENSE SHALL be recorded as excluded, not
copied.

#### Scenario: A web-motion technique is needed offline

- **WHEN** the user has the packaged design pipeline with the iart bundle fetched, and requests a
  matching web, WebGL, or kinetic-typography workflow
- **THEN** local search SHALL return candidates from bundled automatic skills with exact source paths
- **AND** the selected source SHALL be adapted through project DESIGN, MOTION, dependency, and QA
  contracts rather than copied as project authority.

#### Scenario: A named motion-graphics domain is selected

- **WHEN** the user names a video, motion-graphics, Remotion, Manim, or After Effects domain
- **THEN** `iart route` SHALL return a selected playbook, ranked alternatives, and a runtime
- **AND** it SHALL NOT require the user to name a skill id
- **AND** the result SHALL remain a selection: not executable-ready and not an install grant
- **AND** HTML video SHALL default to the HyperFrames runtime unless Remotion, Manim, or After
  Effects was named.

#### Scenario: The iart snapshot is partial or altered

- **WHEN** a tracked file is missing, added, or byte-drifted, or a discovered SKILL.md is not
  catalogued
- **THEN** deterministic verification SHALL block
- **AND** pack revisions, counts, and canonical hash SHALL be updated together for a valid sync.

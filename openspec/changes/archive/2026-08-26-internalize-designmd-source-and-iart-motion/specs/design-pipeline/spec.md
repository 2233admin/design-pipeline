## ADDED Requirements

### Requirement: DesignMD GitHub examples are internalized

The pipeline SHALL ship a pinned, MIT-attributed `dimabraven/design-md` source tree as an offline
example catalog. Directory ingest SHALL remain a separate live snapshot.

#### Scenario: Offline example search

- **WHEN** `designmd search` or `inspect` runs without a directory catalog
- **THEN** local search SHALL return bundled example DESIGN.md files with exact source paths
- **AND** every result SHALL remain `reference-only`
- **AND** the pipeline SHALL NOT install those files as a product `DESIGN.md`

#### Scenario: The bundled DesignMD snapshot drifts

- **WHEN** a tracked file is missing, added, or byte-altered
- **THEN** deterministic verification SHALL block
- **AND** revision, Git tree, counts, and canonical hash SHALL be updated together for a valid sync.

### Requirement: iart motion skills are internalized with activation boundaries

The pipeline SHALL ship pinned, MIT-attributed iart-ai motion-skill packs that include a LICENSE,
plus the index repository, as core offline package resources. Packs without a LICENSE SHALL be
recorded as excluded, not copied.

#### Scenario: A web-motion technique is needed offline

- **WHEN** the user has only the packaged design pipeline and requests a matching web, WebGL, or
  kinetic-typography workflow
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

## MODIFIED Requirements

### Requirement: Source resolution is requested before reference artifacts are written

No change to the requirement text. Stage 0 catalog search exclusions SHALL also include the bundled
iart catalog: classify, write, and bind SHALL NOT search iart as a side effect.

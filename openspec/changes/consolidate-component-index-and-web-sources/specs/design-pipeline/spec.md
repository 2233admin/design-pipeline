## ADDED Requirements

### Requirement: Component source discovery has one index

The existing component-source catalog SHALL register canonical source identities and typed source, component, method and template records. External stack, provider and companion entries SHALL reference sourceId without moving execution contracts. Existing record IDs, namespace and v1 lineage SHALL remain intact.

#### Scenario: A source appears in multiple registries

- **WHEN** vendor manifests, stack registries, component providers, companions, design-system profiles or snapshots refer to one normalized source URL
- **THEN** a single source record SHALL own its canonical sourceId and aliases
- **AND** component-level records SHALL refer to that source without registering it twice.

#### Scenario: Packaged and reference-only sources are discovered

- **WHEN** the index is checked against all vendor manifests, non-excluded iart packs, external registries, Astryx, Prompt Motion and HyperFrames
- **THEN** every source SHALL have an index record with explicit availability, license state and evidence
- **AND** local pointers SHALL resolve to existing files inside the skill package
- **AND** film and GEPA SHALL remain discoverable without entering web component ranking.

### Requirement: Source licensing remains explicit and auditable

Source records SHALL separate license state from license identifier and evidence. States SHALL be verified, unverified, commercial, project-owned or platform. Revision and Git tree provenance SHALL remain distinct from content-hash scope. An uncertain or commercial license SHALL NOT authorize copying code.

#### Scenario: Repository license evidence is unavailable

- **WHEN** license inspection cannot establish a source's permission or the source is commercial
- **THEN** the index SHALL retain the honest unverified or commercial state and evidence
- **AND** workflow instructions SHALL permit study and clean reimplementation only, not copying.

#### Scenario: A reference has executable metadata but no copy authority

- **WHEN** an unverified or commercial source is selected or returned as an alternative
- **THEN** its route SHALL remain reference-adaptation and review
- **AND** it SHALL NOT expose package, install, dependency or source-code adoption fields, including nested component installation metadata.

### Requirement: MengTo projection follows the pinned source inventory

The maintained MengTo catalog SHALL match the current vendor manifest's revision and method inventory. Frontend validation SHALL compare projection equivalence with the manifest rather than a fixed historic count.

#### Scenario: Projection is stale despite a valid old count

- **WHEN** projection source, revision, license, method names, count or categories differ from the pinned vendor manifest
- **THEN** validation SHALL reject the stale projection
- **AND** a complete matching current projection SHALL pass regardless of the old 127-entry count.

### Requirement: Web build follows an explicit component source decision

Every quick, standard and full web workflow in brief, freeform and replicate modes SHALL ask components immediately before build. The choices SHALL cover project components with paths, a named GitHub library, searching the existing index and scratch implementation. The recommendation SHALL prefer project components, then the index.

#### Scenario: Next reaches a build boundary

- **WHEN** earlier prerequisites are complete and no components decision is recorded
- **THEN** next SHALL return the components ask before build
- **AND** its decide command SHALL bind the absolute project path and work outside that directory.

#### Scenario: Build follows a recorded reply

- **WHEN** decide records the owner's components reply
- **THEN** the build instruction SHALL follow that reply and explicitly name references/component-source-catalog.json
- **AND** index discovery SHALL use design-system route with the page brief and platform web, plus design-system search
- **AND** the instruction SHALL require component-manifest.json before index.html.

### Requirement: Component provenance is an existing build completion condition

Web build, and equivalent UI code build stages, SHALL require index.html and a valid component-manifest.json with an entries array. Each entry SHALL have name, sourceId or URL, availability, license state and usedIn identifying file and usage. A scratch decision MAY have empty entries but SHALL still be recorded. This SHALL NOT introduce a new gate.

#### Scenario: HTML exists without valid provenance

- **WHEN** index.html exists but the manifest is absent, malformed or lacks required entry fields
- **THEN** build SHALL remain unfinished.

#### Scenario: Scratch implementation is explicitly chosen

- **WHEN** a scratch components decision is recorded and index.html plus a manifest with an empty entries array exist
- **THEN** the component provenance completion condition SHALL be satisfied
- **AND** technical completion SHALL NOT grant Component Conformance or Visual Acceptance.

#### Scenario: Reuse or discovery is chosen without manifest entries

- **WHEN** the recorded components answer names project components, a GitHub library or index discovery and the manifest has no entries
- **THEN** build SHALL remain unfinished
- **AND** only the explicit answer `Write from scratch`, ignoring case and surrounding whitespace, SHALL permit an empty entries array.

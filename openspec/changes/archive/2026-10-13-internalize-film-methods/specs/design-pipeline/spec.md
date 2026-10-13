## ADDED Requirements

### Requirement: Complete film method source snapshots

The packaged skill SHALL preserve both reviewed redistributable film-method Git trees with original bytes, file inventories, hashes and notices. Import SHALL reject an unreviewed revision or altered checkout and preserve the previous snapshot on failure.

#### Scenario: Complete sources travel with an isolated installation

- **WHEN** the package is installed without ambient Cinetic or product-film-skill
- **THEN** every reviewed tracked blob SHALL remain readable locally and match its locked identity
- **AND** excluded external media SHALL have a stated boundary.

#### Scenario: Arbitrary source refresh is refused

- **WHEN** an import uses an unreviewed revision or modified source
- **THEN** it SHALL fail without replacing the previous snapshot.

### Requirement: Film methods activate within existing task contracts

Film adaptations SHALL activate only for explicit applicable film or motion-loop tasks and map selected methods into existing artifacts and verification. Project brand, components, constraints and engine selection SHALL remain authoritative; source scripts SHALL not become runtime dependencies merely by being packaged.

#### Scenario: A product film is planned

- **WHEN** a product-film method is selected
- **THEN** planning SHALL discover real design/component sources, record provenance and produce an existing-contract plan suitable for actual rendering and validation
- **AND** it SHALL distinguish callable adaptations from source-only scripts and technical checks from Visual Acceptance.

#### Scenario: An ordinary interface task is selected

- **WHEN** the task is ordinary UI or CSS work
- **THEN** film methods SHALL NOT take over its workflow or require a soundtrack, storyboard, Remotion or higher frame rate.

#### Scenario: A short loop uses Cinetic methods

- **WHEN** an explicit short loop selects a technique and timing method
- **THEN** its plan SHALL preserve user constraints and use existing timeline/render verification
- **AND** randomness or upstream style bans SHALL NOT silently determine the result.

### Requirement: Prompt Motion references retain observation limits

Prompt Motion case references SHALL identify author, original repository, applicable tasks, transferable methods, observed content and observation limits. They SHALL enter the existing reference evidence flow without mirroring works lacking redistribution authority.

#### Scenario: Only a case page was read

- **WHEN** an agent has read page text without watching its video or hearing its soundtrack
- **THEN** motion and audio SHALL remain unobserved
- **AND** proposed transfers SHALL be labelled adaptations rather than measured case facts.

### Requirement: Maintained film tools have bounded execution evidence

New maintained film tools SHALL have reproducible selection, planning, actual artifact and existing validation evidence for a branded product task and a short motion task. Platform and provider claims SHALL be limited to executed environments and observed outputs.

#### Scenario: Windows execution evidence is reported

- **WHEN** a maintained helper and selected existing renderer pass on Windows
- **THEN** the claim SHALL cover those entries only
- **AND** unexecuted upstream scripts, WSL, cloud services and unheard audio SHALL remain explicitly unverified.

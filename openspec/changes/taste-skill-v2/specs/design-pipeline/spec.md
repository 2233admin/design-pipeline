## MODIFIED Requirements

### Requirement: Complete pinned Taste source

The pipeline SHALL ship the complete reviewed Leonxlnx/taste-skill Git tree with its one skill, references, library, scripts, assets and supporting files, preserving original bytes and recording modes. Provenance SHALL bind revision, Git tree, per-object identities, canonical hash and MIT license through existing snapshot and resource mechanisms.

#### Scenario: Reviewed source is internalized

- **WHEN** a clean explicitly reviewed revision is imported
- **THEN** the complete source inventory and the `design-taste-frontend` skill name SHALL match the preserved Git blobs
- **AND** required package resources SHALL include their complete local source.

#### Scenario: An import or snapshot cannot be trusted

- **WHEN** the source is dirty, unreviewed, incomplete or a locked blob is changed, missing or added
- **THEN** import or source verification SHALL fail without approving a new baseline
- **AND** a failed import SHALL preserve the prior snapshot.

### Requirement: Task-selected built-in Taste capability

The pipeline SHALL expose the Taste skill through a maintained local guide with routes for a new site, redesign, app screens and critique, reached from the existing entry and frontend routes. Installed packages SHALL provide the source without external Taste skills. Every route SHALL identify its output, project use and verification boundary. The guide SHALL NOT route to methods no longer in the pinned source.

#### Scenario: A clean installation selects a capability

- **WHEN** only the packaged design-pipeline skill is installed
- **THEN** existing entry/routing guidance SHALL reach the matching route and its complete local source
- **AND** source, guide and resource checks SHALL establish built-in availability independently of host Taste installations.

#### Scenario: A source preference conflicts with the task

- **WHEN** upstream house rules, framework, scroll-scene or copy preferences conflict with user references, project design or accessibility requirements
- **THEN** the maintained guide SHALL adapt the selected route within the existing project contracts
- **AND** source availability or a successful gate SHALL NOT imply Visual Acceptance.

#### Scenario: A former method is requested

- **WHEN** a request names a classic style, image-to-code, concept images, a brand board or full-output enforcement
- **THEN** the guide SHALL name the existing pipeline route for it and SHALL NOT link a Taste method that the pinned source no longer contains.

#### Scenario: An image-only capability is selected

- **WHEN** the request selects web concepts, mobile concepts or a brand board
- **THEN** the guide SHALL route it to the available image-generation capability and distinguish image output from implemented behavior
- **AND** lack of an image provider SHALL remain explicit rather than claiming images were produced.

## ADDED Requirements

### Requirement: Taste tools stay advisory

The pipeline SHALL NOT execute the vendored Taste scripts. An agent MAY run them from the packaged copy in the target project; their findings about taste SHALL remain advisory review evidence and SHALL NOT fail a stage, gate or delivery or change a gate result.

#### Scenario: Inspector reports a house-style failure

- **WHEN** `inspect.mjs` reports a FAIL for an eyebrow label, monospace label or palette on a page the project's design allows
- **THEN** no design-pipeline stage, gate or delivery SHALL fail because of it

#### Scenario: Draw with an open direction

- **WHEN** the direction is open and an agent runs `draw.mjs`
- **THEN** the three-source direction preview SHALL still decide the direction and the draw SHALL NOT add a card to it

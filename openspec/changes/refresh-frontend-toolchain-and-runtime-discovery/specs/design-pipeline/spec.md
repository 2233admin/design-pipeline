## ADDED Requirements

### Requirement: Blender discovery distinguishes absence from failure

The pipeline SHALL discover supported Blender executables through explicit configuration, PATH and
platform defaults. It SHALL keep custom paths outside shipped source and report detected executable
or rendering failures rather than hiding them as missing-tool skips.

#### Scenario: Blender is available on PATH

- **WHEN** no explicit executable is selected and PATH contains a supported Blender
- **THEN** the existing film adapter SHALL use it and the native render check SHALL run

#### Scenario: A selected executable fails

- **WHEN** the configured Blender cannot execute or its render fails
- **THEN** the check SHALL fail with the diagnostic cause instead of claiming Blender is uninstalled

### Requirement: Repository maintenance has one npm entry

The repository SHALL expose its maintained npm packages through a private root workspace, one
lockfile and root commands for dependency inspection, tests and existing capability/source checks.
Installing the packaged skill SHALL NOT require installing the repository maintenance workspace.

#### Scenario: Maintainer installs the toolchain

- **WHEN** a maintainer runs npm ci from the repository root
- **THEN** npm SHALL install the locked workspace dependencies without requiring separate installs
- **AND** root npm scripts SHALL invoke the maintained verification commands

#### Scenario: A user installs only the skill

- **WHEN** the skill is packaged and installed outside this repository
- **THEN** its callable tools SHALL retain their existing dependency and path contracts

#### Scenario: Continuous integration verifies the repository

- **WHEN** CI or the release workflow verifies a checkout
- **THEN** it SHALL install the root lockfile and required browser dependencies first
- **AND** it SHALL invoke the root specification, test and package commands

### Requirement: Frontend capability updates have bounded evidence

Frontend and animation updates SHALL record primary upstream provenance, preserve source licenses
and integrity, and verify affected runtime behavior before raising the supported baseline. A version
query or successful package install alone SHALL NOT establish API compatibility or visual acceptance.

#### Scenario: A runtime or source snapshot changes

- **WHEN** an integrated animation capability is refreshed
- **THEN** the update SHALL use its existing manifest/registry and run affected checks
- **AND** source revisions, compatibility limits and rendered evidence SHALL remain inspectable

#### Scenario: An update cannot be verified

- **WHEN** upstream behavior or required runtime evidence is unavailable
- **THEN** the capability SHALL remain unresolved or pinned with a stated reason
- **AND** existing approved visual evidence SHALL NOT be silently replaced

#### Scenario: Latest stable versions are requested

- **WHEN** the user requests current stable animation and graphics dependencies
- **THEN** maintained dependencies and optional adapter provenance SHALL use verified stable releases
- **AND** optional runtimes SHALL be tested without becoming unconditional packaged-skill dependencies

### Requirement: Referenced skills have portable local guidance

Reusable reference-skill methods SHALL enter the existing bundled guides and routes with source
provenance and applicable checks. Shipped guidance SHALL NOT claim host-specific installation
state. Optional companion presence, upstream currency and local capability coverage SHALL remain
separate observations.

#### Scenario: A companion is missing or stale

- **WHEN** a GSAP, Anime.js or PixiJS task lacks a current companion skill
- **THEN** the route SHALL start from its bundled guide or selected local source playbook
- **AND** remaining API uncertainty SHALL use version-matched primary documentation
- **AND** the companion diagnostic SHALL NOT be changed to current by the fallback

#### Scenario: A referenced upstream skill changes

- **WHEN** a maintainer reviews a new reference-skill revision
- **THEN** the review SHALL distinguish reusable methods, version-dependent APIs and source-specific assumptions
- **AND** an unchanged source-integrity check or npm version SHALL NOT prove the skill content current

### Requirement: Comparison reports identify their metric

The existing browser comparison report SHALL identify the library version, metric and options
used to calculate pixel differences. A metric upgrade SHALL preserve earlier evidence and SHALL
NOT make values from different metrics interchangeable or grant visual acceptance.

#### Scenario: Pixelmatch changes its color metric

- **WHEN** a new comparison runs with pixelmatch 8
- **THEN** its existing v1 report SHALL record the OKLab/HyAB metric and effective options
- **AND** prior reports and approved golden assets SHALL remain unchanged

#### Scenario: Comparison inputs contain a visible change

- **WHEN** the maintained comparator receives identical images or a known changed region
- **THEN** identical images SHALL produce zero difference and the changed region SHALL be detected

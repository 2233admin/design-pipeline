## ADDED Requirements

### Requirement: Complete pinned Taste source

The pipeline SHALL ship the complete reviewed Taste-Skill Git tree with all thirteen skills, research and supporting files, preserving original bytes and modes. Provenance SHALL bind revision, Git tree, per-object identities, canonical hash and MIT license through existing snapshot and resource mechanisms.

#### Scenario: Reviewed source is internalized

- **WHEN** a clean explicitly reviewed revision is imported
- **THEN** the complete source inventory and all thirteen skill names SHALL match the preserved Git blobs
- **AND** required package resources SHALL include their complete local source.

#### Scenario: An import or snapshot cannot be trusted

- **WHEN** the source is dirty, unreviewed, incomplete or a locked blob is changed, missing or added
- **THEN** import or source verification SHALL fail without approving a new baseline
- **AND** a failed import SHALL preserve the prior snapshot.

### Requirement: Task-selected built-in Taste capability

The pipeline SHALL expose all thirteen Taste capabilities through a maintained local selection/adaptation guide and its existing entry, frontend, brand and visual-asset routes. Installed packages SHALL provide the source without external Taste skills. Every entry SHALL identify its output, project use and verification boundary.

#### Scenario: A clean installation selects a capability

- **WHEN** only the packaged design-pipeline skill is installed
- **THEN** existing entry/routing guidance SHALL reach the appropriate complete local skill
- **AND** source, guide and resource checks SHALL establish built-in availability independently of host Taste installations.

#### Scenario: A source preference conflicts with the task

- **WHEN** upstream style, framework, randomness, image-first or copy preferences conflict with user references, project design or accessibility requirements
- **THEN** the maintained guide SHALL adapt the selected method within the existing project contracts
- **AND** source availability or a successful gate SHALL NOT imply Visual Acceptance.

#### Scenario: An image-only capability is selected

- **WHEN** the request selects web concepts, mobile concepts or a brand board
- **THEN** the guide SHALL use the available image-generation capability and distinguish image output from implemented behavior
- **AND** lack of an image provider SHALL remain explicit rather than claiming images were produced.

### Requirement: Capability-selected engineering companions

The pipeline SHALL select engineering companions by the current framework and requested or required capability. Next.js methods SHALL require a Next.js project. Cache Components adoption SHALL require authorized adoption or demonstrated task need; optimization SHALL require affected existing cache boundaries.

#### Scenario: Ordinary UI work does not need specialized caching

- **WHEN** an ordinary React component or Next.js visual change has no cache adoption or optimization need
- **THEN** engineering guidance SHALL select only the capabilities needed for that task
- **AND** the presence of an installed companion SHALL NOT require its unrelated procedure.

#### Scenario: An applicable companion is absent

- **WHEN** a selected engineering companion is unavailable
- **THEN** the pipeline SHALL use applicable project and bundled guidance with a relevant fallback record
- **AND** only missing inputs or services required by the requested output SHALL block that work.

### Requirement: Observable skill eval coverage

The skill eval suite SHALL check actual state, observable behavior signals and nonempty artifacts for its named supporting CSS, quick Chinese UI and missing-reference cases. Deterministic fixture/CLI regressions SHALL be reported separately from independent-agent forward tests and other cases' manifest/routing coverage. Neither SHALL grant Visual Acceptance.

#### Scenario: Named behavior expectations are executed

- **WHEN** the supporting CSS or quick Chinese UI regression runs with available browser tooling
- **THEN** it SHALL execute the actual rendered fixture and applicable public workflow
- **AND** wrong expected state, a missing required signal or a missing required artifact SHALL fail
- **AND** quick UI completion SHALL retain `visualAcceptance: not-evaluated`.

#### Scenario: Required reference input is unavailable

- **WHEN** the missing-reference regression checks pending source input and attempts resolution without its file
- **THEN** the public check SHALL return blocked with exit 2 and source-pending reason
- **AND** failed resolution SHALL preserve the pending input bytes and null source path/hash.

#### Scenario: A browser prerequisite is absent

- **WHEN** a named rendered-fixture regression cannot obtain its existing browser tooling
- **THEN** the skipped case SHALL remain visible and SHALL NOT be reported as a behavioral pass.

## MODIFIED Requirements

### Requirement: Companion self-check covers the design profile

The design-pipeline self-check MUST detect the companion set when installed via the team `design` profile and detect bundled Taste through the required core package. Missing optional companions remain fallback-safe; missing required `design-pipeline` resources still fail the check.

#### Scenario: The full design profile is installed

- **WHEN** self-check runs with every companion listed below installed
- **THEN** it SHALL detect every companion in its corresponding capability group
- **AND** the required core pipeline check SHALL pass.

**Visual taste**

- `frontend-design`
- `ui-ux-pro-max`
- `web-design-guidelines`
- `emil-design-eng`
- The complete Taste-Skill suite is built into `design-pipeline`; a separate `design-taste-frontend` installation is not required.

**Motion design**

- `design-motion-principles` (source: `kylezantos/design-motion-principles`)
- `animation-vocabulary`
- `review-animations`
- `apple-design`
- `vercel-react-view-transitions`

**Animation implementation**

- All `gsap-*` skills from `greensock/gsap-skills`
- `animejs` from `BowTiedSwan/animejs-skills`

**React / Next.js**

- `vercel-react-best-practices`
- `vercel-composition-patterns`
- `next-dev-loop`
- `next-cache-components-adoption`
- `next-cache-components-optimizer`

**Matt Pocock**

- `codebase-design`
- `grill-with-docs`
- `implement`
- `matt-tdd` (local rename of `tdd`)
- `matt-code-review` (local rename of `code-review`)

#### Scenario: An optional companion is missing

- **WHEN** one or more optional companions are unavailable
- **THEN** self-check SHALL report `WARN`, identify the missing capability or marker, preserve the documented fallback, and remain usable
- **AND** a missing required `design-pipeline` skill SHALL still fail the check.

#### Scenario: Ambient Taste skills are absent

- **WHEN** a complete packaged pipeline is installed in an otherwise empty skill root
- **THEN** its existing visual-direction profile SHALL check the built-in Taste entry
- **AND** it SHALL NOT request an external Taste installation to provide that coverage.

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

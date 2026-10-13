## ADDED Requirements

### Requirement: Bundled UI craft sources

The pipeline SHALL ship pinned, scoped, byte-preserved and license-attributed snapshots of
`emil-design-eng`, `make-interfaces-feel-better`, `fixing-accessibility`,
`12-principles-of-animation`, `shadcn` and `playwright-cli`, readable without a global skill
install or network access, and SHALL route them through one maintained guide.

#### Scenario: Fresh standalone installation builds a web page

- **WHEN** a user installs only `design-pipeline` and `next` reaches the web `build` stage
- **THEN** the returned guide section SHALL route to the bundled UI craft guide
- **AND** every bundled source that guide names SHALL exist in the package with its manifest and
  license evidence, while each reference-only source SHALL resolve to its packaged, pinned
  reference record.

#### Scenario: A snapshot drifts or is incomplete

- **WHEN** a vendored file is changed, removed or added, or a manifest is rehashed without matching
  bytes
- **THEN** the source integrity test SHALL fail
- **AND** the importer SHALL reject an unreviewed revision, a dirty checkout or an invalid review date
  without replacing the existing snapshot.

#### Scenario: Upstream guidance conflicts with pipeline contracts

- **WHEN** a bundled source disagrees with project tokens, the interface review protocol, the motion
  gate or Good CSS
- **THEN** the project and pipeline contract SHALL govern, and the conflicting rule SHALL be recorded
  as not applicable rather than as a finding
- **AND** upstream persona text, slash-command usage and output formats SHALL NOT replace the
  existing review record.

### Requirement: Tool-running UI sources stay opt-in and advisory

Guidance that runs an external tool (the shadcn CLI, `playwright-cli` or React Doctor) SHALL run it
only in a project that already uses that tool or after the user approves. It SHALL NOT install
dependencies, fetch remote prompts, add a gate or receipt field, or report tool output as Component
Conformance or Visual Acceptance.

#### Scenario: The project does not use shadcn

- **WHEN** Stage 0 finds no `components.json` and no selected component route installs from a
  shadcn registry
- **THEN** the pipeline SHALL NOT run the shadcn CLI or execute the bundled skill's context-injection
  command
- **AND** it SHALL keep the project's existing component owner.

#### Scenario: An approved tool reports results

- **WHEN** React Doctor or `playwright-cli` runs with approval
- **THEN** its findings SHALL be recorded as advisory evidence in the existing QA record
- **AND** interaction evidence SHALL still come from `verify interaction`, and acceptance from the
  owner's review.

### Requirement: License-restricted UI sources are referenced, not bundled

A requested UI source whose license restricts use as input to automated AI pipelines SHALL stay
out of the package and SHALL be cited through a pinned, hashed, reference-only record.

#### Scenario: React Doctor is routed

- **WHEN** the pipeline routes a React health check
- **THEN** it SHALL cite the pinned `millionco/react-doctor` revision and content hash without
  vendoring upstream files
- **AND** it SHALL NOT use React Doctor source text as evaluation or optimization data.

## MODIFIED Requirements

### Requirement: Companion self-check covers the design profile

The design-pipeline self-check MUST detect the companion set when installed via the team `design` profile and detect bundled Taste and UI craft sources through the required core package. Missing optional companions remain fallback-safe; missing required `design-pipeline` resources still fail the check.

#### Scenario: The full design profile is installed

- **WHEN** self-check runs with every companion listed below installed
- **THEN** it SHALL detect every companion in its corresponding capability group
- **AND** the required core pipeline check SHALL pass.

**Visual taste**

- `frontend-design`
- `ui-ux-pro-max`
- `web-design-guidelines`
- The complete Taste-Skill suite is built into `design-pipeline`; a separate `design-taste-frontend` installation is not required.
- `emil-design-eng` is built into `design-pipeline` with the other UI craft sources; a separate installation is not required.

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

#### Scenario: Ambient UI craft skills are absent

- **WHEN** a complete packaged pipeline is installed in an otherwise empty skill root
- **THEN** self-check SHALL NOT report a missing `emil-design-eng` companion or request its installation
- **AND** the bundled `emil-design-eng` snapshot SHALL remain reachable through the UI craft guide.

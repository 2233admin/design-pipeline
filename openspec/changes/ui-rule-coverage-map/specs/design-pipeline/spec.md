## ADDED Requirements

### Requirement: Upstream UI rule lists are mapped rule by rule

The repository SHALL keep one coverage map, `skill/references/ui-rule-coverage.json`, with one row
per rule line of each tracked upstream UI rule list. A row SHALL name an `audit.*` code, a `UC-`
checklist id, a packaged Markdown path with an optional heading anchor, `pending` with an issue
number, or `not-adopted` with a reason. The map is comparison data and SHALL NOT be a gate, a
receipt field or a command input.

#### Scenario: A mapped target does not exist

- **WHEN** a row names an audit code `interaction-audit.cjs` does not define, a `UC-` id the checklist does not have, a file the skill does not ship or a heading that file does not have
- **THEN** the coverage test SHALL fail and name the row and the target.

#### Scenario: An upstream rule has no row

- **WHEN** the pinned upstream rule list contains a rule line that the map does not quote under the same id
- **THEN** the coverage test SHALL fail and print that rule line.

#### Scenario: A rule is declined or not held yet

- **WHEN** a rule is not followed, or no local rule holds it yet
- **THEN** its row SHALL be `not-adopted` with a non-empty reason, or `pending` with the issue that will add it
- **AND** a row without that reason or issue number SHALL fail the coverage test
- **AND** the row SHALL NOT point at unrelated local text to look covered.

#### Scenario: A local rule differs from the upstream one

- **WHEN** the local rule covers part of an upstream rule or sets another threshold
- **THEN** the row SHALL be marked partial and its note SHALL say what differs.

### Requirement: Tracked UI rule lists are pinned and their drift is visible

Each tracked UI rule list SHALL be an `adapted-reference` entry of `sources.lock.json` whose record
document carries the revision and the hash of its rule files. A pinned rule list under
`tests/fixtures/` SHALL record the hash it was read at. No upstream rule file SHALL be vendored,
installed or fetched at run time.

#### Scenario: Upstream moved without touching the rule files

- **WHEN** `npm run sources:update` moves a rule source to a new revision and the hash of its rule files is unchanged
- **THEN** the coverage test SHALL pass without regenerating the pinned rule list.

#### Scenario: Upstream changed a rule file

- **WHEN** the update rewrites the rule-file hash in the record document
- **THEN** the coverage test SHALL fail until the pinned rule list is regenerated from a clean checkout at the locked revision
- **AND** every added or reworded rule SHALL then need a row before the test passes.

#### Scenario: The upstream command skill is considered for bundling

- **WHEN** a rule list is published only through a skill that downloads its rules when it runs, or through a repository without a license file
- **THEN** that skill SHALL NOT be bundled
- **AND** the rules SHALL be read from the licensed repository that owns them.

## MODIFIED Requirements

### Requirement: UI craft rules are project-owned

The pipeline SHALL keep one project-owned UI craft rule index that maps each audit code to its
sources and holds a deduplicated review checklist with stable, gap-free ids for rules the audit does not
measure, each row citing its sources. Source-level rules a rendered page cannot show SHALL be
checklist rows. The web review SHALL record checklist results as Component Conformance evidence.

#### Scenario: A reviewer checks an unmeasured rule

- **WHEN** the web review covers motion feel, focus, semantics, copy or states
- **THEN** it SHALL use the checklist ids from the rule index and record results in `qa.md`
- **AND** it SHALL NOT report them as Visual Acceptance.

#### Scenario: A source-level rule is added to the checklist

- **WHEN** a rule about hydration, render cost, component primitives or another property of the source is adopted
- **THEN** it SHALL become a checklist row whose id continues from the last one and whose sources cell names where it came from
- **AND** the UI craft source test SHALL fail on a skipped id, a repeated id or a row without a source.

### Requirement: Companion self-check covers the design profile

The design-pipeline self-check MUST detect the companion set when installed via the team `design` profile and detect bundled Taste, UI craft sources and the built-in web interface rules through the required core package. Missing optional companions remain fallback-safe; missing required `design-pipeline` resources still fail the check.

#### Scenario: The full design profile is installed

- **WHEN** self-check runs with every companion listed below installed
- **THEN** it SHALL detect every companion in its corresponding capability group
- **AND** the required core pipeline check SHALL pass.

**Visual taste**

- `frontend-design`
- `ui-ux-pro-max`
- The rules of Vercel's `web-design-guidelines` list are built into `design-pipeline` through the UI craft guide and the rule coverage map; a separate installation is not required.
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

#### Scenario: The Vercel web-design-guidelines skill is absent

- **WHEN** a complete packaged pipeline is installed in an otherwise empty skill root
- **THEN** self-check SHALL NOT list `web-design-guidelines` as a missing companion or print an install hint for it
- **AND** the Visual taste fallback SHALL name the packaged record of the built-in web interface rules.

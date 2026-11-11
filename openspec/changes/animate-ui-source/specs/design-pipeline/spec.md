## ADDED Requirements

### Requirement: Animate UI is a catalog component source without bundled source

`component-source-catalog.json` SHALL hold a source record and the component record `animate-ui/components` for `imskyleen/animate-ui`, licence `LicenseRef-MIT-Commons-Clause`, with an inventory where each item has a description, English and Chinese keywords, an install command and either an import or a registry name. The package SHALL NOT ship upstream component source.

#### Scenario: Search by name or by a Chinese keyword

- **WHEN** `design-system search --snapshot references/component-source-catalog.json --query "animate-ui"` runs
- **THEN** the results SHALL include `source/imskyleen/animate-ui` and `animate-ui/components`
- **AND** the queries `动效基元` and `页面转场` SHALL each return `animate-ui/components`.

#### Scenario: Upstream gains or loses a primitive

- **WHEN** the pinned upstream inventory names a primitive or registry item the record does not list, the record lists one upstream does not have, or the pinned inventory's revision differs from the lock
- **THEN** the repository tests SHALL fail and name the item.

#### Scenario: Component source is added to the package

- **WHEN** a `skill/vendor/animate-ui` folder exists or a required package resource points into one
- **THEN** the repository tests SHALL fail.

### Requirement: A brief that names a catalog source is routed to that source

`design-system route` SHALL treat a requested capability as a source name when it is the first id segment of a component record that advertises it, and SHALL order the records that advertise a named source before all others for every capability of that brief. Recommended component details SHALL include `import` and `bases` when the inventory item has them.

#### Scenario: The brief names Animate UI

- **WHEN** the brief is `animate-ui animated tabs` on platform `web`
- **THEN** `tabs` SHALL select `animate-ui/components` with status `ready`, package `@animate-ui/react`, its install command, and recommended components that carry an import and a docs URL.

#### Scenario: The brief names another source

- **WHEN** the brief is `SmoothUI animated tabs and magnetic button`
- **THEN** `tabs` and `button` SHALL select `smoothui/components`.

#### Scenario: The platform is not supported

- **WHEN** the brief names `animate-ui` on platform `expo`
- **THEN** the route SHALL be `blocked`.

### Requirement: A source marked selectWhenNamed does not replace a default route

A component record with `routing.selectWhenNamed: true` SHALL be selected only when the brief names its source. For any other brief it SHALL be listed among the alternatives at its score and SHALL NOT be the selected route when another record advertises the capability. `selectWhenNamed` SHALL be boolean.

#### Scenario: A brief that does not name the source

- **WHEN** each known capability is routed on `web` with and without the `animate-ui/components` record
- **THEN** the selected route and status SHALL be identical for every capability except `animate-ui`
- **AND** `animated tabs` SHALL list `animate-ui/components` first among its alternatives.

#### Scenario: The mark is not boolean

- **WHEN** a record sets `routing.selectWhenNamed` to a string
- **THEN** routing SHALL fail with a contract error naming the field.

### Requirement: The Animate UI guide restates the upstream skill and stays pinned

The package SHALL ship `references/animate-ui.md` as the document of lock entry `animate-ui`, with `sourceMeta` frontmatter naming the locked revision, the content hash and its upstream files. It SHALL cover path choice, install, coexistence with shadcn/ui components, reduced motion, pace, review, migration and Vue, and SHALL map each upstream skill capability to a packaged resource.

#### Scenario: The guide and the lock disagree

- **WHEN** the guide's `reviewedRevision` differs from the lock entry's revision
- **THEN** `npm run sources:check` SHALL report the disagreement.

#### Scenario: Routing documents

- **WHEN** the repository tests run
- **THEN** `SKILL.md`, `companion-skills.md`, `capability-routing.md`, `feature-routes.md`, `pipeline-reference.md` and `ui-craft-sources.md` SHALL each link to the guide, and every packaged file the guide links to SHALL exist.

## ADDED Requirements

### Requirement: Briefs that name the tactile direction route to its guide, and no other brief does

A brief that names tactile-design or asks for a tactile, layered, quiet product UI SHALL route
through the job registry to the scored job `tactile-product-ui`, whose primary knowledge is
`references/tactile-product-ui.md`. A product brief that names none of its keywords SHALL keep its
route, and the route SHALL add no gate, receipt or CLI command.

#### Scenario: A brief that names the direction

- **WHEN** `designer-pipeline route --query` receives "build the settings page with tactile-design", "a tactile UI for the admin table", "a tactile, layered, quiet dashboard" or "做一个触感界面的设置页"
- **THEN** the route SHALL be `ready` with job `tactile-product-ui`
- **AND** `primaryKnowledge.id` SHALL be `tactile-product-ui`.

#### Scenario: A plain product brief or another explicit job

- **WHEN** the brief is "design a settings page for the dashboard", mentions only the word "tactile" as in "build a tactile keyboard prototype", or also asks to clone a page
- **THEN** the default job or the explicit job SHALL stay primary
- **AND** the tactile job SHALL NOT be selected.

### Requirement: The tactile direction is a locked, hashed, unbundled reference

`references/tactile-product-ui.md` SHALL record the upstream repository, the reviewed revision and a
content hash over its listed source files in `sourceMeta`, and `sources.lock.json` SHALL pin the same
revision as an `adapted-reference`. No upstream skill file, reference text, CSS template or Tailwind
mapping SHALL ship.

#### Scenario: The lock and the guide agree

- **WHEN** repository QA runs the source checks
- **THEN** the lock entry `tactile-design` SHALL name the guide as a document that records `reviewedRevision` equal to the lock's revision
- **AND** the evidence table of the source-governance test SHALL hold the same revision, content hash and nine source files.

#### Scenario: The guide is a direction, not a rule layer

- **WHEN** the guide's `useBoundary` and status are read
- **THEN** they SHALL state reference-only use, forbid installing or copying the upstream files, and say the project's `DESIGN.md` and the measured audit govern.

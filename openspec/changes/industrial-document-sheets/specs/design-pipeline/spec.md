## ADDED Requirements

### Requirement: Industrial sci-fi sheet briefs route to their method guide

A brief that asks for a poster, information sheet or archive card in an Arknights, Endfield or
industrial sci-fi document style SHALL route through the job registry to the scored job
`industrial-document-sheets`, whose primary knowledge is `references/industrial-document-sheets.md`.
The route SHALL add no step beyond the kernel and SHALL add no gate, receipt or CLI command.

#### Scenario: A sheet brief in English or Chinese

- **WHEN** `designer-pipeline route --query` receives "a poster about the Tay Bridge collapse in an Arknights style", "industrial sci-fi poster about a measurement", "做一张舟工业信息图" or "终末地风格的档案卡"
- **THEN** the route SHALL be `ready` with job `industrial-document-sheets` and a confidence other than `low`
- **AND** `primaryKnowledge.id` SHALL be `industrial-document-sheets` and `next` SHALL hold only the kernel steps.

#### Scenario: Another job matches or no keyword matches

- **WHEN** the brief also asks to clone a page, or names no keyword of the job such as "an industrial inventory dashboard"
- **THEN** the explicit job SHALL stay primary, or the default job SHALL be kept
- **AND** the industrial job SHALL NOT be selected.

### Requirement: The industrial sheet guide is a locked, hashed, unbundled reference

`references/industrial-document-sheets.md` SHALL record the upstream repository, the reviewed
revision and a content hash over its listed source files in `sourceMeta`, and `sources.lock.json`
SHALL pin the same revision as an `adapted-reference`. No upstream script, stylesheet, template or
image SHALL ship.

#### Scenario: The lock and the guide agree

- **WHEN** repository QA runs the source checks
- **THEN** the lock entry `arknights-printer` SHALL name the guide as a document that records `reviewedRevision` equal to the lock's revision
- **AND** the evidence table of the source-governance test SHALL hold the same revision, content hash and source files.

#### Scenario: The guide is read, not executed

- **WHEN** the guide's `useBoundary` is read
- **THEN** it SHALL state reference-only use and forbid installing or executing the upstream skill or its Python scripts.

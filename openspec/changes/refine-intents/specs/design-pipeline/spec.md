## ADDED Requirements

### Requirement: Refine intents route to their step guide

A brief that asks to critique, polish, distill or quiet an existing surface SHALL route through the
job registry to the `refine-intents` job, whose primary knowledge is `references/refine-intents.md`.
The guide SHALL give each intent its checks, steps, prohibitions, completion and hand-off, and SHALL
add no gate, receipt or CLI command.

#### Scenario: A refine brief in English or Chinese

- **WHEN** `designer-pipeline route --query` receives "critique this page", "make this quieter", "distill this screen", "polish before ship" or a Chinese phrasing such as "这页太吵了" or "上线前打磨一遍"
- **THEN** the route SHALL be `ready` with job `refine-intents`, a top candidate score above 0 and a confidence other than `low`
- **AND** `primaryKnowledge.id` SHALL be `refine-intents` and `next` SHALL hold only the kernel steps.

#### Scenario: A brief with no refine word

- **WHEN** the brief names no refine keyword and matches no other job
- **THEN** the route SHALL stay on the default job with confidence `low`.

#### Scenario: Another job matches more strongly

- **WHEN** a refine keyword appears beside an explicit job's keyword, or beside more keywords of another scored job
- **THEN** that other job SHALL remain the primary
- **AND** the refine job SHALL NOT be selected.

#### Scenario: Quieter and distill are carried out

- **WHEN** the guide's quieter or distill section is followed
- **THEN** quieter SHALL be read by visitor mode and SHALL forbid gray text on a colored ground
- **AND** distill SHALL keep semantic colors with a non-color cue and record what was removed and where it can still be reached
- **AND** both SHALL hand off to polish, with results in the existing `qa.md` review record.

### Requirement: Every Impeccable command names an existing guide

Each command in `references/impeccable-product-design.json` SHALL carry a `guide` of the form
`<file>#<anchor>`, relative to `references/`, that resolves to a heading in a packaged guide. The
`critique`, `polish`, `distill` and `quieter` commands SHALL point at their sections of
`refine-intents.md`.

#### Scenario: The command map is checked

- **WHEN** repository QA reads the command map
- **THEN** every `guide` file SHALL exist and contain a heading whose anchor equals the stated anchor.

#### Scenario: A guide heading is renamed or removed

- **WHEN** a command's `guide` names a file or an anchor that no longer exists
- **THEN** repository QA SHALL fail and name the command.

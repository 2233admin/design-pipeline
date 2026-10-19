## MODIFIED Requirements

### Requirement: Web prompts keep the shared stage contract

Web stage ids SHALL be: quick `intake, components, build, probe`; quick replicate `intake, reference, extract, components, build, probe`; standard and full `intake, reference, concepts, components, description, build, probe, review, deliver`; standard and full replicate `intake, reference, extract, components, description, build, probe, review, deliver`. Every web stage SHALL keep a guide anchor. Film, edit and `ui` prompts, stages and records SHALL NOT change.

#### Scenario: Film, edit and ui intake and film concepts are unchanged

- **WHEN** `next` runs at intake for film, edit and ui projects and at concepts for a film project (edit and ui have no concepts stage)
- **THEN** each action's question, questions (including the `duration` question), recommended, record and reason text SHALL deep-equal the corresponding shared `INTAKE` or `CONCEPTS` action.

#### Scenario: Web keeps its stage order

- **WHEN** the web stages are listed for the quick, standard and full tiers, in brief and replicate modes
- **THEN** the ids and their order SHALL equal the lists in this requirement
- **AND** `workflow-web.md` SHALL have a `## <stage id>` heading for each.

## ADDED Requirements

### Requirement: Web intake accepts default

At standard and full, `decide --stage intake --answer default` without `--verdict` or `--choice` SHALL complete web intake as the owner's acceptance of every recommendation, recorded as `defaulted`. A bare "default" SHALL still be refused as a skip or a confirmed playback, and at quick.

#### Scenario: Default completes intake

- **WHEN** the owner answers "default" at a standard web intake
- **THEN** intake SHALL be finished and the record SHALL keep the answer `default`.

#### Scenario: A bare default is not a stated skip

- **WHEN** `--choice skip --answer default` is recorded
- **THEN** it SHALL be refused and the state SHALL be unchanged.

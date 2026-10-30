## ADDED Requirements

### Requirement: A recorded interface reference becomes real controls

In web or ui replicate mode with a `video` reference, the observed behaviours of the recording SHALL be listed in `reference.md` under `## Recorded behaviours`, each with a real control and a keyboard path, and every listed behaviour SHALL be covered by a passing interaction-state entry before delivery. Projects without a video reference SHALL be unaffected.

#### Scenario: Table missing

- **WHEN** a web or ui replicate project with a `video` reference leaves the extract step and `reference.md` has no `## Recorded behaviours` table or an empty one
- **THEN** `next` SHALL block with `recorded-behaviours-missing` and a fix naming the heading and columns

#### Scenario: Row without a control

- **WHEN** a row has an empty `control` or `keyboard` cell, or `keyboard` is `none` without a reason
- **THEN** the step SHALL list that row's id with its fix

#### Scenario: Behaviour uncovered at delivery

- **WHEN** coverage runs with the recorded ids and an id is named by no matrix entry, or only by an entry with blockers
- **THEN** the result SHALL be blocked with `RECORDED_BEHAVIOUR_UNCOVERED` naming the id

#### Scenario: Table broken after extract

- **WHEN** a web or ui replicate project with a `video` reference reaches delivery and its table is absent or invalid
- **THEN** delivery SHALL block with `recorded-behaviours-missing` and SHALL NOT run coverage without the ids

#### Scenario: Unknown id in the matrix

- **WHEN** a matrix entry names a `recordedBehaviour` that the table does not declare
- **THEN** the result SHALL be blocked with `RECORDED_BEHAVIOUR_UNKNOWN`

#### Scenario: No video reference

- **WHEN** coverage runs without recorded ids
- **THEN** the result SHALL be the same as before this change

## ADDED Requirements

### Requirement: Design skills are manifest-bound producers, not gate authorities

The future Design Skill layer SHALL pair each single-purpose `SKILL.md` with a machine-readable
manifest whose effects are mechanically enforced. Skills SHALL produce typed, target-bound handoff
artifacts and SHALL NOT declare deterministic gates passed. Prototype work SHALL remain isolated
until a human selection receipt authorizes a separate promotion operation.

#### Scenario: A prototype skill completes before selection

- **WHEN** `design.prototype` produces a valid prototype set and browser evidence but no human
  selection receipt exists
- **THEN** the skill run MAY be complete while the promotion gate remains blocked
- **AND** the runner SHALL reject target writes until a separate authorized promotion operation.

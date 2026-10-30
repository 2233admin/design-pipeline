## ADDED Requirements

### Requirement: Anti-slop review is backed by a mechanical lint

`evaluate-anti-slop.cjs --lint` SHALL run the vendored sloplint on the target and map every finding through a reviewed gate map to a rubric rule and class. A hard rule marked `pass` while a mapped hard finding exists SHALL be rejected. Taste gates SHALL NOT become hard findings. An unmapped gate SHALL fail the run.

#### Scenario: Pass contradicted by the page

- **WHEN** the evidence marks `controls-are-real-and-operable` as `pass` and the page has a form that shows "Thanks" with no request
- **THEN** evaluation SHALL fail with `LINT_CONTRADICTS_PASS` naming the gate, file and line

#### Scenario: Template tell is contextual

- **WHEN** the page uses a placeholder testimonial name and the evidence records `accepted-context` for `content-specificity` with a product reason
- **THEN** evaluation SHALL accept it and list the lint finding as accepted context

#### Scenario: House rule is excluded

- **WHEN** the page lacks the Hallmark CSS stamp
- **THEN** no finding SHALL be produced for it

#### Scenario: Upstream adds a gate

- **WHEN** the vendored linter reports a gate id that is not in the map
- **THEN** the run SHALL fail with `LINT_GATE_UNMAPPED`

#### Scenario: Linted files change

- **WHEN** a linted file changes after the lint block was written
- **THEN** evaluation SHALL reject the stale lint block

### Requirement: Fabricated proof is a hard defect

The anti-slop rubric SHALL include a hard rule against invented metrics, testimonials, logo walls and case-study counts. A finding under it SHALL NOT be accepted as context.

#### Scenario: Invented testimonial

- **WHEN** the page shows a testimonial the brief and the owner did not supply
- **THEN** `no-fabricated-proof` SHALL be a hard failure and `accepted-context` for it SHALL be rejected

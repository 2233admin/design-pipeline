## ADDED Requirements

### Requirement: A scored critique runs only on request

The web references SHALL document a critique of six dimensions scored 0 to 10 (Concept, Direction fidelity, Hierarchy and pacing, Craft, Function, Originality), mapped to W1 to W7. When Concept is 5 or lower the overall score SHALL be capped at 6.0. The critique SHALL be produced only when the owner asks for one.

#### Scenario: A template concept caps the score

- **WHEN** a critique scores Concept 4 and the mean of the six scores is 7.2
- **THEN** the overall score SHALL be reported as 6.0 with the veto stated
- **AND** the critique SHALL say to fix the concept before the execution.

#### Scenario: Delivery does not critique

- **WHEN** a build is delivered or reviewed and the owner did not ask for a critique
- **THEN** no critique SHALL be produced and no `next` action SHALL request one.

### Requirement: A critique has a fixed three-part output

A critique SHALL list the scores, then Keep, then Fix ordered fatal, important, polish with the current state, the reason and a fix carrying a concrete value, then three Quick Wins. It SHALL be recorded under a `Critique` heading in `qa.md`.

#### Scenario: A fix has no value

- **WHEN** a Fix item says only "increase contrast"
- **THEN** it SHALL be treated as incomplete and given the value to change.

### Requirement: A critique score is not acceptance

A critique score SHALL NOT be recorded as Visual Acceptance and SHALL NOT change a Component Conformance result. The owner's choice SHALL outrank the score, and the critique SHALL add no gate, receipt, schema, finding code or command.

#### Scenario: The owner keeps a flagged direction

- **WHEN** the owner chose a direction the critique scored low on Originality
- **THEN** the critique SHALL state what it would change and SHALL NOT override the choice
- **AND** Visual Acceptance SHALL stay pending until the owner records it.

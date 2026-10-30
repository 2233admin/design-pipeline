## ADDED Requirements

### Requirement: Brand marks are audited and proofed before delivery

The brand-mark tool SHALL audit an SVG mark for portability and reproduction defects with a 0 to 100 score, render a proof sheet at small sizes, in one colour, reversed and blurred, and export standard icon sizes. The audit SHALL be reported as technical conformance only.

#### Scenario: Live text fails

- **WHEN** a mark contains a `<text>` element
- **THEN** the audit SHALL report FAIL `live-text` and the score SHALL be at most 75

#### Scenario: Near-miss angle

- **WHEN** a straight edge is 1.5° off horizontal
- **THEN** the audit SHALL report WARN `near-miss-angle` with that edge

#### Scenario: Proof sheet

- **WHEN** `brand-mark sheet` runs on three concepts
- **THEN** it SHALL write an HTML sheet and a PNG showing each at 16, 32 and 64 px, mono, reversed and blurred, and a shelf with all three

#### Scenario: Clean mark

- **WHEN** a flat two-colour mark with a viewBox and a title is audited
- **THEN** the score SHALL be 100 and the report SHALL state it does not judge the idea

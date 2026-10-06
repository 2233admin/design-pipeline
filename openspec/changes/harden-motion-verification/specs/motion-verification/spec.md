# Motion verification delta

## ADDED Requirements

### Requirement: truthful coverage
Legacy v1 receipts SHALL remain accepted and return timing-only coverage. Strict lifecycle
requests SHALL fail if lifecycle evidence is absent. Valid structured scenarios SHALL return
timing-and-lifecycle coverage, without implying browser capture or authenticity checks.

#### Scenario: Legacy receipt is evaluated
- **WHEN** a legacy v1 receipt is evaluated
- **THEN** it SHALL remain accepted and return timing-only coverage

#### Scenario: Strict or structured lifecycle evidence is evaluated
- **WHEN** strict lifecycle evidence is absent or structured lifecycle scenarios are valid
- **THEN** the strict request SHALL fail when evidence is absent
- **AND** valid structured scenarios SHALL return timing-and-lifecycle coverage without implying browser capture or authenticity checks

### Requirement: structured lifecycle
The evaluator SHALL reject missing mandatory scenarios, duplicate/unknown scenarios, failed
checks, and malformed fields. Passed checks SHALL name expected behavior, observed behavior,
and a capture. Only reverse MAY be not-applicable with a non-empty reason.

#### Scenario: Lifecycle scenarios or fields are invalid
- **WHEN** a mandatory scenario is missing, a scenario is duplicate or unknown, a check fails, or a field is malformed
- **THEN** the evaluator SHALL reject the receipt

#### Scenario: Lifecycle check passes or is not applicable
- **WHEN** a lifecycle check passes or reverse is marked not-applicable
- **THEN** a passed check SHALL name expected behavior, observed behavior, and a capture
- **AND** reverse SHALL have a non-empty not-applicable reason

### Requirement: valid temporal data
Cadence and frame budget SHALL be positive. Interruption and reduced-motion declarations SHALL
reject placeholder values after trimming. Long-frame timestamps SHALL be ordered and within
the observed interval. The published JSON Schema SHALL describe all accepted receipt fields.

#### Scenario: Temporal receipt data is invalid
- **WHEN** cadence or frame budget is not positive, interruption or reduced-motion declarations contain placeholder values after trimming, or long-frame timestamps are unordered or outside the observed interval
- **THEN** the evaluator SHALL reject the receipt

#### Scenario: Receipt schema is published
- **WHEN** the JSON Schema is published
- **THEN** it SHALL describe all accepted receipt fields

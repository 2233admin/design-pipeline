# Motion verification delta

## Requirement: truthful coverage
Legacy v1 receipts SHALL remain accepted and return timing-only coverage. Strict lifecycle
requests SHALL fail if lifecycle evidence is absent. Valid structured scenarios SHALL return
timing-and-lifecycle coverage, without implying browser capture or authenticity checks.

## Requirement: structured lifecycle
The evaluator SHALL reject missing mandatory scenarios, duplicate/unknown scenarios, failed
checks, and malformed fields. Passed checks SHALL name expected behavior, observed behavior,
and a capture. Only reverse MAY be not-applicable with a non-empty reason.

## Requirement: valid temporal data
Cadence and frame budget SHALL be positive. Interruption and reduced-motion declarations SHALL
reject placeholder values after trimming. Long-frame timestamps SHALL be ordered and within
the observed interval. The published JSON Schema SHALL describe all accepted receipt fields.

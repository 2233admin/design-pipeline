# Design pipeline delta

## ADDED Requirements

### Requirement: code-carried capability
New design, composition, motion or film capability SHALL be delivered as at least one of:
a deterministic gate whose findings carry a concrete fix, a parameterized template, or a
cross-model evaluation under the existing benchmark contract.

#### Scenario: New capability is delivered
- **WHEN** a new design, composition, motion, or film capability is added
- **THEN** it SHALL include at least one of: a deterministic gate whose findings carry a concrete fix, a parameterized template, or a cross-model evaluation under the existing benchmark contract

### Requirement: acceptance separation
Gates, templates and evaluations SHALL NOT report creative or user acceptance. Those remain
separate recorded states.

#### Scenario: Capability evidence is reported
- **WHEN** a gate, template, or evaluation reports its result
- **THEN** it SHALL NOT report creative or user acceptance, which remain separate recorded states

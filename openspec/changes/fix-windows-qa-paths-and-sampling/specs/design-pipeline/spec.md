## ADDED Requirements

### Requirement: Physical path identity survives Windows aliases

Existing Git scope and native completion SHALL identify one physical repository consistently when Windows paths use long or short directory spellings, while retaining containment, link, root, branch and history checks.

#### Scenario: Equivalent root spellings reach a native task

- **WHEN** a task and Git root refer to the same physical directory through different Windows spellings
- **THEN** snapshot identity and change-to-Git coordinates SHALL remain consistent
- **AND** baseline capture and verified completion SHALL not be rejected solely for that alias.

#### Scenario: A path escapes its physical root

- **WHEN** an external link, different Git root or uncontained target is selected
- **THEN** the existing verifier SHALL reject the path and preserve prior evidence.

#### Scenario: Offline study output aliases the preserved source

- **WHEN** study source and nested output use different Windows spellings of one physical directory
- **THEN** the builder SHALL reject that output before writing and preserve every source byte.

### Requirement: Repository QA observes actual browser motion

Pointer capture SHALL apply every planned intermediate native input with step spacing after delayed delivery. Driver stalls SHALL not create elapsed-time catch-up jumps or bursts. Capture SHALL retain real browser samples, timestamps and safety bounds without weakening existing gate conditions.

#### Scenario: Pointer capture runs under variable frame scheduling

- **WHEN** the supported browser drives and observes the existing pointer specimen
- **THEN** the driver SHALL retain the intermediate coordinates rather than skip directly to a later elapsed-time position
- **AND** measurements SHALL reflect the actual input duration and observed frames.

#### Scenario: Motion is actually discontinuous or absent

- **WHEN** the specimen jumps or ignores the pointer
- **THEN** capture SHALL retain the actual discontinuity observations
- **AND** a motionless target SHALL retain its failed motion-response finding.

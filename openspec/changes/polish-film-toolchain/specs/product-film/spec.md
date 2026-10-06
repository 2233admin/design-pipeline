# Product film delta

## ADDED Requirements

### Requirement: film project workflow
The pipeline SHALL scaffold a film project whose storyboard passes the storyboard gate and whose
composition script names each beat, SHALL refuse to overwrite existing files without an explicit
replace flag, and SHALL run all applicable film gates in one check that reports skipped gates
with the command that unblocks them.

#### Scenario: Film project is scaffolded
- **WHEN** a film project is scaffolded
- **THEN** its storyboard SHALL pass the storyboard gate and its composition script SHALL name each beat

#### Scenario: Project files already exist
- **WHEN** scaffolding would overwrite existing files without an explicit replace flag
- **THEN** the pipeline SHALL refuse to overwrite them

#### Scenario: Film project is checked
- **WHEN** the pipeline runs the combined film check
- **THEN** it SHALL run all applicable film gates and report skipped gates with the command that unblocks each one

### Requirement: actionable findings
Every film gate finding SHALL carry a concrete fix. Contract errors for enumerated values and
unsupported properties SHALL list the allowed values.

#### Scenario: Finding or contract error is returned
- **WHEN** a film gate returns a finding or reports an enumerated-value or unsupported-property error
- **THEN** findings SHALL include a concrete fix and the error SHALL list allowed values

### Requirement: timeline capture
The pipeline SHALL capture a composition's registered GSAP timeline in headless Chrome without
adding a package dependency, and SHALL name the install command when the browser stack is absent.

#### Scenario: Timeline is captured
- **WHEN** a composition has a registered GSAP timeline and the browser stack is available
- **THEN** the pipeline SHALL capture it in headless Chrome without adding a package dependency

#### Scenario: Browser stack is absent
- **WHEN** the browser stack is absent
- **THEN** the pipeline SHALL name the install command

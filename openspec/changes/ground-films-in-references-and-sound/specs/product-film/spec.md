# Product-film direction

## MODIFIED Requirements

### Requirement: Reference and sound precede film construction
For promotional animation, the agent MUST inspect relevant moving references and available user
material before committing to visual grammar, storyboard or runtime. When the user supplies no
reference, the agent MUST seek suitable finished films without requiring professional terminology.
The reference record MUST distinguish observed time ranges from inferred or unavailable details.

#### Scenario: User supplies moving references or material
- **WHEN** promotional animation begins and the user has supplied relevant moving references or material
- **THEN** the agent MUST inspect them before committing to visual grammar, storyboard, or runtime
- **AND** the reference record MUST distinguish observed time ranges from inferred or unavailable details

#### Scenario: User supplies no reference
- **WHEN** promotional animation begins without a user-supplied reference
- **THEN** the agent MUST seek suitable finished films without requiring professional terminology

### Requirement: Promotional films include a sound direction
The agent MUST plan music, sound effects and intentional silence with the storyboard. Audible
delivery is the default unless the user or delivery context explicitly calls for silence. Missing
audio access or tooling MUST remain an unresolved production dependency rather than being silently
converted into a silent final deliverable.

#### Scenario: Promotional storyboard is planned
- **WHEN** the agent plans a promotional film storyboard
- **THEN** it MUST plan music, sound effects, and intentional silence with the storyboard
- **AND** audible delivery MUST be the default unless the user or delivery context explicitly calls for silence

#### Scenario: Audio access or tooling is missing
- **WHEN** audio access or tooling is unavailable
- **THEN** the agent MUST retain it as an unresolved production dependency and MUST NOT silently convert the final deliverable to silence

### Requirement: Reference-led audiovisual proof
A representative moving proof MUST use the selected material and sound direction. Creative review
MUST compare that proof against the recorded reference traits. Agent review, technical tests and
user acceptance MUST remain distinct states. User rejection reopens creative direction.

#### Scenario: Representative proof is reviewed
- **WHEN** a representative moving proof is prepared
- **THEN** it MUST use the selected material and sound direction
- **AND** creative review MUST compare it against the recorded reference traits
- **AND** agent review, technical tests, and user acceptance MUST remain distinct states

#### Scenario: User rejects proof
- **WHEN** the user rejects the proof
- **THEN** creative direction MUST reopen

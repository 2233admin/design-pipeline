# Runtime evidence delta

## ADDED Requirements

### Requirement: Agent-browser evidence can start from saved browser state

`evidence capture` SHALL accept `--agent-browser-state <file>`, an agent-browser state file inside
`--project-root`, and load it when the agent-browser session starts. The receipt SHALL name the
file and its sha256 and SHALL NOT copy its contents.

#### Scenario: Saved state is preloaded

- **WHEN** `--agent-browser-state` names a file inside the project and `--agent-browser` is set
- **THEN** the adapter SHALL start the session with `--state <file>`
- **AND** the probe message SHALL name the file and its sha256.

#### Scenario: The state file is outside the project

- **WHEN** `--agent-browser-state` resolves outside `--project-root`
- **THEN** the capture SHALL fail closed without starting a browser.

#### Scenario: Another adapter would ignore the state

- **WHEN** `--agent-browser-state` is given without `--agent-browser`
- **THEN** the capture SHALL fail closed without starting a browser.

# Runtime evidence delta

## ADDED Requirements

### Requirement: Agent-browser evidence can start from saved browser state

`evidence capture` SHALL accept `--agent-browser-state <file>`, an agent-browser state file inside
`--project-root`, and load it when the agent-browser session starts. The host SHALL read the file
once into a private copy outside the evidence and the adapter SHALL load that copy. The receipt
SHALL name the file and the sha256 of the copied bytes and SHALL NOT copy its contents.

#### Scenario: Saved state is preloaded

- **WHEN** `--agent-browser-state` names a file inside the project and `--agent-browser` is set
- **THEN** the adapter SHALL start the session with `--state` pointing at the host's copy
- **AND** the probe message SHALL name the file and its sha256
- **AND** the copy SHALL be removed after the capture, whether or not it succeeded.

#### Scenario: The state file changes during the capture

- **WHEN** the project's state file is rewritten after the host read it
- **THEN** the browser SHALL load the bytes the host read
- **AND** the probe message SHALL name the sha256 of those bytes.

#### Scenario: The state file is outside the project

- **WHEN** `--agent-browser-state` resolves outside `--project-root`
- **THEN** the capture SHALL fail closed without starting a browser.

#### Scenario: Another adapter would ignore the state

- **WHEN** `--agent-browser-state` is given with an `--adapter-path` other than the packaged
  `adapters/agent-browser.cjs`, or without `--agent-browser`
- **THEN** the capture SHALL fail closed without starting the adapter.

# Runtime evidence delta

## ADDED Requirements

### Requirement: The agent-browser adapter fills every web evidence artifact

The bundled `adapters/agent-browser.cjs` SHALL capture screenshot, trace, DOM, console,
network, accessibility and performance artifacts into the existing evidence receipt. It SHALL
run only the agent-browser executable and browser that the caller selected explicitly.

#### Scenario: Every measurement is captured

- **WHEN** every capture command succeeds
- **THEN** the receipt SHALL be `complete` with all seven artifacts hashed
- **AND** `accessibility.json` SHALL hold the axe-core violations and incomplete results.

#### Scenario: A measurement fails

- **WHEN** any capture command fails
- **THEN** its artifact SHALL be `null`, the receipt SHALL be `partial`
- **AND** the probe message SHALL name the failed commands.

#### Scenario: Network evidence may carry credentials

- **WHEN** network requests are recorded
- **THEN** request and response headers SHALL be removed
- **AND** the receipt redaction SHALL be `applied` with a note saying so.

#### Scenario: The tool is not selected explicitly

- **WHEN** `--agent-browser` is missing or resolves outside the project root
- **THEN** the capture SHALL fail closed without starting a browser.

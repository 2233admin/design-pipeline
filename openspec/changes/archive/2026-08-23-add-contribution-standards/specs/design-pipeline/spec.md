# Contribution Standards Delta

## ADDED Requirements

### Requirement: Contribution standards

The repository SHALL document how contributors propose changes, validate changes, and handle external skill intake.

#### Scenario: Contributor proposes an external skill

- **WHEN** a contributor proposes a new external skill source
- **THEN** the contribution SHALL classify it using the curation policy outcomes before it can be accepted.

### Requirement: Security guidance

The repository SHALL document that secrets and private data must not be written into pipeline artifacts or QA evidence.

#### Scenario: Agent state captures a run

- **WHEN** `state.json`, `events.jsonl`, or `handoff.md` are written
- **THEN** they SHALL NOT include secrets, tokens, cookies, private credentials, or raw proprietary data.


# Design pipeline delta

## ADDED Requirements

### Requirement: non-commercial reference provenance
Each non-commercially licensed reference skill that the pipeline studies SHALL have a source record
that pins the canonical repository, revision, content hash and license, marks `codeCopied: false`,
and limits use to ideas. Repository QA SHALL fail when a record is older than its freshness window.

#### Scenario: Non-commercial reference skill is studied
- **WHEN** the pipeline studies a skill with a non-commercial license
- **THEN** its source record SHALL pin the canonical repository, revision, content hash, and license
- **AND** it SHALL mark `codeCopied: false` and limit use to ideas

#### Scenario: Source record is stale
- **WHEN** a source record is older than its freshness window
- **THEN** repository QA SHALL fail

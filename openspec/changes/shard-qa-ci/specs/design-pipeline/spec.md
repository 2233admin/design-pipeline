## ADDED Requirements

### Requirement: Repository QA can be sharded across CI jobs

Repository QA SHALL accept `DESIGN_PIPELINE_QA_SHARD=i/n` and, when set, run the test files at manifest positions congruent to `i - 1` modulo `n`. Shard 1 SHALL also run every non-test repository check; other shards SHALL run only their slice. With the variable unset, QA SHALL behave as an unsharded run.

#### Scenario: Shards cover the manifest once

- **WHEN** QA runs as shards `1/n` through `n/n`
- **THEN** every file in `scripts/test-manifest.json` SHALL run in exactly one shard
- **AND** packaging and installed-package checks SHALL run only in shard 1.

#### Scenario: An invalid shard is refused

- **WHEN** the value is malformed, its index is outside `1..n`, or the slice selects no test file
- **THEN** QA SHALL fail without invoking `node --test` and without auto-discovering nested fixtures.

### Requirement: Superseded pull-request CI runs are cancelled

The CI workflow SHALL cancel an in-progress pull-request run when a newer push to the same pull request starts one, and SHALL NOT cancel runs on pushes to the default branch.

#### Scenario: A second push arrives while CI runs

- **WHEN** a pull request receives a new commit while its earlier CI run is in progress
- **THEN** the earlier run SHALL be cancelled and the new run SHALL start.

## ADDED Requirements

### Requirement: Repository references name the current home

User-facing install commands, the plugin marketplace entry, generated package metadata, `doctor` links and agent-facing tracker docs SHALL name `XartLab/design-pipeline`. Schema `$id` identifiers and historical records SHALL keep their recorded values.

#### Scenario: A user installs from the marketplace

- **WHEN** a user follows `README.md` or `docs/install.md`
- **THEN** the commands SHALL name `XartLab/design-pipeline`, and the marketplace entry SHALL point at `https://github.com/XartLab/design-pipeline/releases/latest/download/design-pipeline-skill.zip`

#### Scenario: An agent opens an issue

- **WHEN** an agent reads `AGENTS.md` or `docs/agents/issue-tracker.md` to find the tracker
- **THEN** both SHALL name `XartLab/design-pipeline`

#### Scenario: Schema identifiers are unchanged

- **WHEN** this change is applied
- **THEN** no `$id` in `skill/references/*.schema.json` SHALL change

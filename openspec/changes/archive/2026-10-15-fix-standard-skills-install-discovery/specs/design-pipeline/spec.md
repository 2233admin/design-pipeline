## ADDED Requirements

### Requirement: Standard default skill discovery

Without nonempty explicit root settings, self-check SHALL search the legacy Codex skills root, user `~/.agents/skills`, then `<cwd>/.agents/skills`. `CODEX_HOME` SHALL determine the legacy root when set; otherwise it SHALL be `~/.codex/skills`. Default roots SHALL be resolved and de-duplicated in first-seen order. Checks SHALL NOT install or repair skills.

#### Scenario: Standard user installation

- **WHEN** an installed `check-deps.cjs --json` runs without explicit root settings and a complete pipeline and companion are installed under `~/.agents/skills`
- **THEN** core status and overall result SHALL be `OK`, missing resources SHALL be empty, the companion SHALL be discovered and the process SHALL exit 0.

#### Scenario: Standard project installation

- **WHEN** an installed checker runs from a project with a complete pipeline and companion under `<cwd>/.agents/skills` and no explicit root settings
- **THEN** core status and overall result SHALL be `OK`, missing resources SHALL be empty, the companion SHALL be discovered and the process SHALL exit 0.

#### Scenario: Legacy and customized Codex homes remain supported

- **WHEN** explicit roots are unset
- **THEN** the first default root SHALL be `<CODEX_HOME>/skills` when configured, or `~/.codex/skills` otherwise
- **AND** complete installations and companions there SHALL remain discoverable without changing the later standard defaults.

#### Scenario: Default roots overlap

- **WHEN** the resolved legacy, user or project default roots coincide
- **THEN** each resolved directory SHALL appear once in first-seen order.

#### Scenario: A default installation is incomplete

- **WHEN** a required resource is absent from all default roots
- **THEN** self-check SHALL identify the missing resource, report core and overall `FAIL`, and exit 1 without attempting repair.

## MODIFIED Requirements

### Requirement: Explicit multi-root skill discovery

The pipeline SHALL support explicit platform-delimited skill roots without inferring host-specific plugin-cache layouts. A nonempty `DESIGN_PIPELINE_SKILL_ROOTS` SHALL take precedence over `CODEX_SKILLS_DIR`; either nonempty setting SHALL replace all default roots rather than append them.

#### Scenario: Companion skills use separate roots

- **WHEN** `DESIGN_PIPELINE_SKILL_ROOTS` or `CODEX_SKILLS_DIR` contains multiple platform-delimited roots
- **THEN** self-check SHALL search each root for companion skills and bundled resources.

#### Scenario: Explicit roots exclude available defaults

- **WHEN** the selected explicit root list lacks the required pipeline while a complete installation exists in a default location
- **THEN** self-check SHALL search only the explicit roots, report missing core skills and resources, return `FAIL`, and exit 1.

#### Scenario: The higher-precedence setting wins

- **WHEN** both explicit root settings are nonempty
- **THEN** self-check SHALL use only `DESIGN_PIPELINE_SKILL_ROOTS`, regardless of whether `CODEX_SKILLS_DIR` contains a complete installation.

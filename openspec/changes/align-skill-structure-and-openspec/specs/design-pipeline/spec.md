## ADDED Requirements

### Requirement: Task-scoped skill guidance

The skill SHALL use one entry to select bounded supporting tools or a complete deliverable.
Supporting tool use SHALL retain the user's existing workflow. Stage documentation SHALL inherit
the selected scope and SHALL NOT impose OpenSpec on every downstream task.

#### Scenario: A caller needs text fitting only
- **WHEN** a caller selects the Canvas text-fitting helper for an existing project
- **THEN** guidance leads to that helper and its relevant check without initializing a film or full workflow

#### Scenario: A complete deliverable reads a stage guide
- **WHEN** the selected deliverable opens a detailed stage guide
- **THEN** the guide preserves the selected tier and links to one maintained body for each stage
- **AND** technical completion does not record visual acceptance

### Requirement: Attributed source bundles have a distinct location

The package SHALL keep original upstream bundles under `vendor/` and maintained callable helpers
under `tools/`. Moving a bundle SHALL preserve source bytes, revisions, licenses and manifest hashes.
Existing catalog commands SHALL resolve and verify the moved bundles in an installed skill.

#### Scenario: An installed catalog finds a source
- **WHEN** a catalog search or inspection returns a bundled source path
- **THEN** that path exists inside the installed skill and its existing integrity check passes

#### Scenario: A moved source is corrupted
- **WHEN** source bytes differ from the bundle's recorded manifest
- **THEN** the existing verifier rejects the bundle instead of treating relocation as verification

### Requirement: Current OpenSpec configuration carries project context

The repository SHALL maintain planning context and artifact rules in `openspec/config.yaml`, using
the installed stable OpenSpec schema. Active change specs SHALL pass strict validation. Generated
local agent instructions SHALL remain excluded from Git, and existing archives SHALL remain intact.

#### Scenario: An agent requests proposal instructions
- **WHEN** OpenSpec generates instructions for this change
- **THEN** the result includes this project's context and proposal rules from config.yaml

#### Scenario: Legacy active spec syntax is encountered
- **WHEN** an active change lacks a valid delta or scenario heading
- **THEN** migration repairs the syntax and preserves its stated behavior
- **AND** it does not bypass validation with skip_specs or archive the change to hide the failure

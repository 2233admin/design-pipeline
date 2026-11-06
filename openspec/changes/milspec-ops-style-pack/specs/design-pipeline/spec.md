## ADDED Requirements

### Requirement: Template bank ships the milspec-ops pack

The template bank SHALL ship the `milspec-ops` style pack. It SHALL name its case and a generic lineage without any game, studio, operator, faction or map name, state "borrow grammar, never assets", give every font role a catalog family with a fallback, keep Latin-only faces to Latin roles, list materials recipes, carry the 64 px test as guidance and list the case screens kept as examples.

#### Scenario: List the pack

- **WHEN** `template list --style milspec-ops` runs
- **THEN** it SHALL exit 0 with the pack's font roles, grammar, materials, motion and its five templates.

#### Scenario: Fallbacks

- **WHEN** the pack's font roles are read
- **THEN** every stack SHALL hold at least two families, one of them in `references/fonts/catalog.json`.

### Requirement: Milspec-ops templates keep the measured grammar and pass both halves of the check

The `ui.ops-dock`, `card.ops-select-rail`, `kv.ops-callout`, `card.ops-intel` and `ui.ops-brief` templates SHALL render from parameters with original copy, draw the dock's CTA as a five-sided plate, keep the measured dock and rail pitches and draw weapons only as generic silhouettes. Default renders SHALL pass the static check at every size and for seeded variations, and the browser check.

#### Scenario: Default renders and variants

- **WHEN** each template renders with its defaults, and with its variant parameters
- **THEN** each static check SHALL pass, and each default render SHALL pass `--browser`.

#### Scenario: The measured geometry

- **WHEN** the default `ui.ops-dock` and `card.ops-select-rail` renders are read
- **THEN** the CTA plate SHALL be a five-point polygon, dock items SHALL sit about 147 units apart and rail items 126 units apart.

#### Scenario: A date the structure cannot draw

- **WHEN** `card.ops-intel` gets `--set date=10月28日`
- **THEN** the render SHALL exit 1 with `OPTION_VALUE_INVALID` and a fix.

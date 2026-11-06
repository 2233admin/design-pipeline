## ADDED Requirements

### Requirement: Template bank ships the frontier-survey pack

The template bank SHALL ship the `frontier-survey` style pack. It SHALL name its case and a generic lineage without any game, studio or character name, state "borrow grammar, never assets", give every font role a catalog family with a fallback, keep Latin-only faces to Latin roles, keep yellow as the only accent role, list materials recipes, carry the 64 px test as guidance and list the case screens kept as examples.

#### Scenario: List the pack

- **WHEN** `template list --style frontier-survey` runs
- **THEN** it SHALL exit 0 with the pack's font roles, grammar, materials, motion and its five templates.

#### Scenario: Fallbacks

- **WHEN** the pack's font roles are read
- **THEN** every stack SHALL hold at least two families, one of them in `references/fonts/catalog.json`.

### Requirement: Frontier-survey templates keep the measured grammar and pass both halves of the check

The `ui.survey-rail`, `card.survey-section-title`, `card.survey-dossier`, `kv.survey-album` and `banner.survey-timeline` templates SHALL render from parameters with original copy and keep the measured proportions: the rail's 60-unit pitch from y 152, the 78 x 24 title block, the 656 x 1043 crew column and the 229-unit album band. Default renders SHALL pass the static check at every size and for seeded variations, and the browser check.

#### Scenario: Default and variant renders

- **WHEN** each template renders with its defaults, and `kv.survey-album` with `side=right band=grey wordmark=false`
- **THEN** each static check SHALL pass, and each default render SHALL pass `--browser`.

#### Scenario: Measured proportions

- **WHEN** the default renders are read
- **THEN** the dossier's yellow column SHALL be 656 x 1043, the album band 229 x 653 and the rail's current plate SHALL start at y 152 and move 60 units per item.

#### Scenario: Copy the structure cannot draw

- **WHEN** `card.survey-section-title` gets `--set title_latin=世界观`, `kv.survey-album` gets `--set index=第一张`, or `banner.survey-timeline` gets `--set date_1=11月20日`
- **THEN** the render SHALL exit 1 with `OPTION_VALUE_INVALID` and a fix.

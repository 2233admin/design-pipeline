## ADDED Requirements

### Requirement: Template bank ships the crisis-command pack

The template bank SHALL ship the `crisis-command` style pack. It SHALL name its case and a generic lineage without any work, studio, organisation or character name, state "borrow grammar, never assets", give every font role a catalog family behind any Latin face, and carry the 64 px test and the rule against code-drawn mecha, weapons or people as guidance.

#### Scenario: List the pack

- **WHEN** `template list --style crisis-command` runs
- **THEN** it SHALL exit 0 with the pack's font roles, grammar, materials, motion and its five templates.

### Requirement: Crisis-command templates keep the measured grammar and pass both halves of the check

The five templates SHALL render from parameters with original copy, keep the measured compression steps (1.00, 0.85, 0.65, 0.35), the 3.06:1 hexagon with 55-degree tips and the title card's 2:1 title-to-number ink, draw clock and ratio digits as segments, and pass the static check at every size and for seeds, and the browser check with OFL fixtures in `--font-dir`.

#### Scenario: Default renders and variants

- **WHEN** each template renders with its defaults, at each listed size, for seeds 1-50 and in its variants
- **THEN** each static check SHALL pass, and each default render SHALL pass `--browser`.

#### Scenario: Copy the structure cannot draw

- **WHEN** `ui.crisis-countdown` gets `--set clock=4:59` or `ui.crisis-alert-wall` gets `--set latin_1=第九区`
- **THEN** the render SHALL exit 1 with `OPTION_VALUE_INVALID` and a fix.

### Requirement: Compressed text keeps its type size

`Doc.text` SHALL accept a horizontal compression factor and draw it as a scale-only transform about the anchor; `template check` SHALL measure the compressed extent through the transform and read the type size from the vertical axis.

#### Scenario: A compressed film title

- **WHEN** `banner.crisis-film-title` renders a 120 px title compressed to 0.4
- **THEN** the measured type size SHALL be 120 px and the measured width 0.4 of the uncompressed width.

### Requirement: Examples ship the crisis-command UI kit

`examples/crisis-command-ui-kit/` SHALL be a design-system package with at least 20 components and a cover that passes `design-system check` and `foundation check --kind all`, generated files current with its generator, bundled OFL subsets covering every character it sets, and an art task sheet and layer stack for every art slot.

#### Scenario: Kit checks

- **WHEN** the kit's test runs
- **THEN** the package SHALL be ready, the subsets SHALL cover the copy, and the app screens SHALL pass `template check --browser`.

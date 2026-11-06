## ADDED Requirements

### Requirement: Template bank ships the megastructure-ink pack

The template bank SHALL ship the `megastructure-ink` style pack. It SHALL name its case and a generic lineage without any work, author, character, organisation or vehicle name, state "borrow grammar, never assets", give every font role a catalog family with a fallback, keep Latin-only faces to Latin roles, list materials recipes that use the materials commands, and carry the 64 px test and the rule that no person, mecha, creature or object is drawn in code as guidance.

#### Scenario: List the pack

- **WHEN** `template list --style megastructure-ink` runs
- **THEN** it SHALL exit 0 with the pack's font roles, grammar, materials, motion and its five templates.

#### Scenario: No source names

- **WHEN** the pack's style file is read
- **THEN** it SHALL contain no name of the lineage's works or author.

### Requirement: Megastructure-ink templates keep the measured grammar and pass both halves of the check

The `kv.ink-shaft-hero`, `ui.ink-topbar`, `card.ink-label-plate`, `ui.ink-hud-frame` and `banner.ink-terminal` templates SHALL render from parameters with original copy. Default renders SHALL pass the static check at every size and for seeded variations, and the browser check with fixture fonts.

#### Scenario: Default renders and variants

- **WHEN** each template renders with its defaults, at each listed size, for seeds 1-50 and in its variants
- **THEN** each static check SHALL pass, and each default render SHALL pass `--browser` with `--font-dir` set to the fixture fonts.

#### Scenario: Copy the structure cannot carry

- **WHEN** `kv.ink-shaft-hero` gets `--set value_1=很深` or `--set title_latin=穹井`
- **THEN** the render SHALL exit 1 with `OPTION_VALUE_INVALID` and a fix.

### Requirement: The megastructure-ink key visual states scale without a figure

The `kv.ink-shaft-hero` template SHALL draw its structure as an abstract plate over the top 70% of the canvas with no embedded picture, or leave a `bg` ground image slot, and SHALL draw a scale marker instead of a person.

#### Scenario: Plate, name and scale marker

- **WHEN** `kv.ink-shaft-hero` renders with its defaults
- **THEN** the plate's clip SHALL cover the top 70%, the SVG SHALL hold no image, the name SHALL be at least ten times a label, and the scale marker SHALL be a 10-unit tick beside a 420-unit bracket.

### Requirement: The megastructure-ink kit example is a ready design-system package with checked pages

`examples/megastructure-ink-kit` SHALL be a design-system package that `design-system check` reports ready with at least 20 components and `foundation check --kind all` reports ready; its generated files SHALL match its generator; every art slot SHALL have a task sheet that requires original characters and every task sheet SHALL be used; its layer contracts SHALL validate; its pages SHALL embed no pictures in show mode and pass `template check --browser`.

#### Scenario: Kit checks

- **WHEN** the kit's test runs
- **THEN** the package and foundations SHALL be ready, `build.cjs --check` SHALL exit 0 and the HUD and terminal pages SHALL pass the browser check at 1920 x 1080.

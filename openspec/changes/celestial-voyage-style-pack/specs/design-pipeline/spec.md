## ADDED Requirements

### Requirement: Template bank ships the celestial-voyage pack

The template bank SHALL ship the `celestial-voyage` style pack. It SHALL name its case and a generic lineage without any game, studio, character, organisation or vehicle name, state "borrow grammar, never assets", give every font role a catalog family with a fallback, keep Latin-only faces to Latin roles, list materials recipes that use the materials commands, and carry the 64 px test and the show-mode rule (no figures, no drawn pseudo-illustration) as guidance.

#### Scenario: List the pack

- **WHEN** `template list --style celestial-voyage` runs
- **THEN** it SHALL exit 0 with the pack's font roles, grammar, materials, motion and its four templates.

#### Scenario: Fallbacks

- **WHEN** the pack's font roles are read
- **THEN** every stack SHALL hold at least two families, one of them in `references/fonts/catalog.json`.

### Requirement: Celestial-voyage templates keep the measured grammar and pass both halves of the check

The `ui.voyage-topbar`, `card.voyage-ticket`, `kv.voyage-ticket-carousel` and `kv.voyage-orbit-roster` templates SHALL render from parameters with original copy and place the roster's faction medallions on one arc of radius 760 centred at (1005, 540) in 1920 units, 13.7 degrees apart. Default renders SHALL pass the static check at every size and for seeded variations, and the browser check.

#### Scenario: Default renders and variants

- **WHEN** each template renders with its defaults, at each listed size, for seeds 1-50 and in its variants
- **THEN** each static check SHALL pass, and each default render SHALL pass `--browser`.

#### Scenario: The orbit

- **WHEN** the medallion discs of `kv.voyage-orbit-roster` are read from its default render
- **THEN** each centre SHALL lie within 0.5 units of the arc and neighbours SHALL be 13.7 degrees apart.

#### Scenario: Copy the structure cannot draw

- **WHEN** `card.voyage-ticket` gets `--set date=11月10日` or `kv.voyage-ticket-carousel` gets `--set title_latin=新闻`
- **THEN** the render SHALL exit 1 with `OPTION_VALUE_INVALID` and a fix.

### Requirement: Distill keeps strips apart from key visuals

`template distill` SHALL class a reference or a template wider than 4:1 as a `strip` and SHALL add the aspect-mismatch distance when a strip is compared with a landscape layout.

#### Scenario: A site bar and a 16:9 board

- **WHEN** distill ranks the nearest templates of a 16:9 left-title archetype
- **THEN** `ui.voyage-topbar` (1920 x 140) SHALL NOT rank first.

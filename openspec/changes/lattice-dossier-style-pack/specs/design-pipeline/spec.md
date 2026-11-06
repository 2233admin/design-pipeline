## ADDED Requirements

### Requirement: Template bank ships the lattice-dossier pack

The template bank SHALL ship the `lattice-dossier` style pack. It SHALL name its case and a generic lineage without any game, studio, character, organisation or term name, state "borrow grammar, never assets", give every font role a catalog family with a fallback, keep Latin-only faces to Latin roles, list materials recipes, carry the 64 px test as guidance and list the case screens kept as examples.

#### Scenario: List the pack

- **WHEN** `template list --style lattice-dossier` runs
- **THEN** it SHALL exit 0 with the pack's font roles, grammar, materials, motion and its five templates.

#### Scenario: Fallbacks

- **WHEN** the pack's font roles are read
- **THEN** every stack SHALL hold at least two families, one of them in `references/fonts/catalog.json`.

### Requirement: Lattice-dossier templates keep the measured frame and pass both halves of the check

The five lattice-dossier templates SHALL render from parameters with original copy, draw the frame hairlines (y 152, y 900, x 1683 of 1920) on a 172-unit lattice without rounded corners, keep the signal cyan under 3% of each default render, and pass the static check at every size and seed and the browser check.

#### Scenario: The frame and the cyan budget

- **WHEN** `kv.lattice-bulletin` renders with its defaults
- **THEN** it SHALL draw the three hairlines, no `rx` corners, and an accent share under 0.03, and `ui.lattice-pager` SHALL draw its numeral as a decor slot clipped to a 47.5-unit window.

#### Scenario: Default renders and variants

- **WHEN** each template renders with its defaults, at each listed size, for 50 seeds, and `kv.lattice-bulletin` with `tab=3 items=2 active=3`
- **THEN** each static check SHALL pass, and each default render SHALL pass `--browser`.

#### Scenario: Copy the structure cannot draw

- **WHEN** `ui.lattice-pager` gets `--set current=二`, or `kv.lattice-bulletin` gets `--set date_1=11月6日`
- **THEN** the render SHALL exit 1 with `OPTION_VALUE_INVALID` and a fix.

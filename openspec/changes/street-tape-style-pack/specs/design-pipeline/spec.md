## ADDED Requirements

### Requirement: Template bank ships the street-tape pack

The template bank SHALL ship the `street-tape` style pack. It SHALL name its case and a generic lineage without any game, studio or character name, state "borrow grammar, never assets", give every font role a catalog family with a fallback, keep Latin-only faces to Latin roles, list materials recipes, carry the 64 px test as guidance and list the case screens kept as examples.

#### Scenario: List the pack

- **WHEN** `template list --style street-tape` runs
- **THEN** it SHALL exit 0 with the pack's font roles, grammar, materials, motion and its five templates.

#### Scenario: Fallbacks

- **WHEN** the pack's font roles are read
- **THEN** every stack SHALL hold at least two families, one of them in `references/fonts/catalog.json`.

### Requirement: Street-tape templates keep the measured grammar and pass both halves of the check

The `ui.tape-topbar`, `card.tape-section-title`, `ui.tape-pager`, `kv.tape-cut-carousel` and `banner.tape-sticker-cta` templates SHALL render from parameters with original copy, draw every diagonal at 49 degrees and size the section number at 2.6-2.9 times the CJK title's ink. Default renders SHALL pass the static check at every size and for seeded variations, and the browser check.

#### Scenario: Default and mirrored renders

- **WHEN** each template renders with its defaults, and `kv.tape-cut-carousel` with `side=right control=dots`
- **THEN** each static check SHALL pass, and each default render SHALL pass `--browser`.

#### Scenario: The cut angle

- **WHEN** the acid slab of `kv.tape-cut-carousel` is read from its default render
- **THEN** its longest slanted edge SHALL be within 0.5 degrees of 49.

#### Scenario: Copy the structure cannot draw

- **WHEN** `card.tape-section-title` gets `--set number=四`, `ui.tape-pager` gets `--set current=A`, or `kv.tape-cut-carousel` gets `--set date=11月5日`
- **THEN** the render SHALL exit 1 with `OPTION_VALUE_INVALID` and a fix.

#### Scenario: The number is sized in the family that renders

- **WHEN** `card.tape-section-title` renders without `--font-dir`, or with a `--font-dir` that holds Oswald, Anton or Noto Sans SC
- **THEN** the number SHALL be pinned to the first `num` family `--font-dir` supplies, or to Noto Sans SC with a `fontSwitches` reason when none is supplied, and with the faces supplied its measured ink SHALL be 2.6-2.9 times the CJK title's.

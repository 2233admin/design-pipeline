## ADDED Requirements

### Requirement: Template bank ships the game style packs

The template bank SHALL ship the `citypop-sleeve`, `xerox-flyer`, `cassandre-litho`, `woodblock-pixel`, `acid-print-hud` and `cyanotype-specimen` packs. Each SHALL name its case, lineage and the rule "borrow grammar, never assets", give every font role a catalog family with a fallback, list materials recipes, carry the 64 px distinctiveness test as guidance, and list the case screens kept as example renders.

#### Scenario: List a game pack

- **WHEN** `template list --style xerox-flyer` runs
- **THEN** it SHALL exit 0 with the pack's font roles, grammar, materials, motion grammar, checks and its three templates.

#### Scenario: Every role falls back to the catalog

- **WHEN** a game pack's font roles are read
- **THEN** every stack SHALL hold at least two families, one of them in `references/fonts/catalog.json`.

### Requirement: Game templates render from parameters and pass both halves of the check

The 18 game templates SHALL render from parameters with original placeholder copy, and their default renders SHALL pass the static check at every listed size and for seeded variations, and the browser check. Structural copy SHALL be validated: a striped-numeral slot takes digits and `: . - /`, a ten-pull stars slot 3 to 6 stars, a pixel template a 480 x 270 multiple.

#### Scenario: Default renders

- **WHEN** each game template is rendered with its defaults and `--browser`
- **THEN** each render SHALL exit 0.

#### Scenario: Copy the structure cannot draw

- **WHEN** `cover.event-kv` gets `--set time=3PM`, or `pixel.inventory` gets `--size 1280x720`
- **THEN** the render SHALL exit 1 with `OPTION_VALUE_INVALID` and a fix.

#### Scenario: Half-size scorebug

- **WHEN** `broadcast.scorebug --param scale=half` renders
- **THEN** every text SHALL be 12 px or more, the spray bridges SHALL be gone and the check SHALL pass.

### Requirement: The Steam capsule set re-composes one design per size

The `steam.*` templates SHALL each carry one Steam size (920x430, 462x174, 1232x706, 748x896, 600x900, 800x450, 1920x622) and draw the same parts from a per-size composition, keeping the title inside the frame and on the paper light; the small capsule's title SHALL be at least half its height.

#### Scenario: New copy in every size

- **WHEN** every `steam.*` template renders with `--set title=雾港 --set title_latin=FOGPORT`
- **THEN** each check SHALL pass with the title at 7:1 or more.

### Requirement: Pixel templates keep the grid

Pixel templates SHALL draw on a 480 x 270 grid scaled by a whole number, with whole-pixel geometry and text at 12 or 24 native px.

#### Scenario: Blocks at x4

- **WHEN** `pixel.title-screen` and `pixel.inventory` render to PNG at 1920 x 1080
- **THEN** every 4 x 4 block outside text SHALL hold one colour of the pack's palette.

### Requirement: Template check measures drawn numerals and full path geometry

The static check SHALL read every path command, curves by their control points and arcs by their end points. The browser half SHALL measure an element marked `data-chk` drawn with paths and no text as lettering, by its `.lettering` paths, using the stroke when a glyph is stroked; a lettering slot's offset shadow plate SHALL be part of the unit, never its ground.

#### Scenario: Arc far from text

- **WHEN** a filled path with an arc sits away from a title
- **THEN** the title's ground SHALL not change.

#### Scenario: Stroked numeral on a light pool

- **WHEN** a hand-written SVG holds a `data-chk` group of paper-white stroked paths on pool cyan
- **THEN** `template check` SHALL exit 2 with a `contrast` finding for it, and no `no-text-measured`.

### Requirement: Containment errors say how to widen the root

A path option outside `--root` SHALL keep failing with exit 1, and its message SHALL say to pass `--root` with a directory that contains it.

#### Scenario: Font directory outside the root

- **WHEN** `template render card.tcg-frame -o card.svg --font-dir <outside>` runs with another `--root`
- **THEN** it SHALL exit 1 and the message SHALL name `--root` as the fix.

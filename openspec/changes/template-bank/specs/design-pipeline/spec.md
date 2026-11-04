## ADDED Requirements

### Requirement: Template bank renders measured layout templates by id

The packaged skill SHALL ship a template bank in `skill/tools/template-bank/` whose templates each have a manifest (id, family, sizes, slots with kind and budget, parameters with default, range and class, palette roles, accent budget, relations, decoration, provenance) and a default render. `template list [--family <f>]` SHALL list them with slots and variation knobs.

#### Scenario: List one family

- **WHEN** `template list --family kv` runs
- **THEN** it SHALL exit 0 and list only `kv` templates, each with sizes, slots and rhythm knobs.

#### Scenario: Unknown family

- **WHEN** `template list --family poster` runs and no template has that family
- **THEN** it SHALL exit 1 with `OPTION_VALUE_INVALID` naming the families.

#### Scenario: Default render is current

- **WHEN** the tests render each template with its defaults
- **THEN** the output SHALL equal the committed `template.svg` and pass `template check` at every listed size.

### Requirement: Template render fills slots with knobs and audits the output

`template render <id> -o <out.svg>` SHALL accept repeatable `--set slot=value` and `--param name=value` (including `palette.<role>=#RRGGBB`), `--size WxH` of the template's aspect, `--seed <n>` and `--png <out.png>`. It SHALL write the SVG, run the check on it, and exit 0 when it passes or 2 when a finding fails. Values outside the declared slots, ranges or aspect SHALL exit 1 without writing.

#### Scenario: Seeded variation

- **WHEN** a template is rendered twice with `--seed 7` and once with `--seed 8`
- **THEN** the two seed-7 renders SHALL be identical, the seed-8 render SHALL differ, and only `rhythm` parameters SHALL move, inside their ranges.

#### Scenario: Usage errors

- **WHEN** the template id, a slot, a parameter value, the size aspect, the seed or `-o` is invalid or missing
- **THEN** the command SHALL exit 1 with a coded error and write no file.

#### Scenario: Image slot

- **WHEN** `--set figure=<png file>` names an image slot
- **THEN** the image SHALL be embedded in the SVG; a non-image file SHALL exit 1.

#### Scenario: CJK in a lettering slot

- **WHEN** a lettering slot receives characters the code-drawn glyph set cannot draw
- **THEN** the slot SHALL fall back to `<text>` in the manifest's named open CJK fonts.

### Requirement: Template check measures the rendered SVG and gives a fix per finding

`template check <file.svg>` SHALL measure the file itself: text extent against each slot box and line budget, character budget, minimum type size, contrast against the composited ground, title overlap with a figure zone, slots inside a crop zone, accent-colour area and shared alignment lines. Every finding SHALL carry a fix. Exit 0 pass, 2 failed check, 1 when the file is not a template-bank render.

#### Scenario: Long text overflows

- **WHEN** a title slot holds twice its budget
- **THEN** the check SHALL fail with `text-overflow` and `text-length`, and the fix SHALL name how many characters fit, or that the size parameter cannot shrink enough inside its range.

#### Scenario: Title over the figure

- **WHEN** a title covers more than 30% of its width over a declared figure zone
- **THEN** the check SHALL fail with `figure-zone` and a fix naming the distance and the title or figure parameter to move.

#### Scenario: Hand-edited render

- **WHEN** a rendered file is edited so the CJK title moves into the figure zone and off the shared left line
- **THEN** `template check` SHALL report `figure-zone` and `align-line` for that slot.

#### Scenario: Contrast, size, accent and crop

- **WHEN** a palette change lowers text contrast, the canvas is rendered below the type minimum, the accent budget is lowered under the drawn accent, or a listed slot leaves the 16:9 crop
- **THEN** the check SHALL report `contrast`, `type-size`, `accent-budget` or `safe-zone` with a fix.

#### Scenario: Not a template render

- **WHEN** the file has no template-check metadata
- **THEN** the command SHALL exit 1 with `CONTRACT_INVALID`.

### Requirement: Display lettering is drawn in code and deterministic

The bank SHALL set Latin display slots with code-drawn glyphs as SVG paths (53 glyphs, parameters stroke, width, chamfer, chamfer mode, stencil, tracking, slant) and SHALL report their width. The same text and parameters SHALL give the same paths and width; widths SHALL match the study's original program.

#### Scenario: Width matches the original

- **WHEN** `COLLECTION` is set at cap height 77.76 with default parameters
- **THEN** the reported width SHALL be 555.984 within 1e-6, and two runs SHALL produce identical SVG.

#### Scenario: Parameter out of range

- **WHEN** a lettering parameter is outside its range
- **THEN** setting the text SHALL throw an error naming the range.

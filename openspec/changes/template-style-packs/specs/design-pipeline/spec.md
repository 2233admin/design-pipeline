## ADDED Requirements

### Requirement: Template bank groups templates into style packs

The template bank SHALL keep style packs in `skill/tools/template-bank/styles/<id>/style.json` (font roles with stacks and weights, layout grammar, materials, motion grammar, check rules). Every template manifest SHALL name its style and use its font roles. `template list --style <id>` SHALL show the pack and its templates; an unknown style SHALL exit 1 with `OPTION_VALUE_INVALID`.

#### Scenario: List the shinbo pack

- **WHEN** `template list --style shinbo` runs
- **THEN** it SHALL exit 0 with the pack's font roles, grammar, materials, motion grammar, checks and its 11 templates.

#### Scenario: Unknown style

- **WHEN** `template list --style nope` runs
- **THEN** it SHALL exit 1 with `OPTION_VALUE_INVALID` naming the styles.

### Requirement: The shinbo pack renders title cards, a poster, UI screens and a cut rhythm

The shinbo pack SHALL ship card, key visual, UI and motion templates whose default renders and seeded variations pass the static check at every listed size. Collage image slots SHALL be drawn only when filled, at the image's aspect. Slots a layout derives SHALL reject `--set`.

#### Scenario: From zero in one round

- **WHEN** seven cards, the poster with four collage pieces, the codex and the cut are rendered with new copy and the style's fonts
- **THEN** each render SHALL exit 0 with the browser check passed.

#### Scenario: Derived slot

- **WHEN** `--set summary=x` is given to `motion.title-card-cut`
- **THEN** the render SHALL exit 1 with `OPTION_VALUE_INVALID`.

### Requirement: Template check measures rendered pixels in the browser

`template check` SHALL measure an SVG or HTML file in headless Chrome when `--browser` is given, when the file has no template metadata, or when the render's style asks for it: ink overlap, hidden glyphs, text past the canvas, collage alpha in a text's ink zone, contrast against the page with that text hidden, missing assets and per-glyph fallback. Each finding SHALL carry a fix.

#### Scenario: The experiment's first pass

- **WHEN** the first-pass fixtures are checked
- **THEN** the check SHALL report the poster key over its copy as `collage-cover`, the c04 line as `off-canvas` and 12 `contrast` findings including nights h1r at 4.48:1.

#### Scenario: The experiment's final

- **WHEN** the final fixtures are checked
- **THEN** c01, c03 and c07 (em boxes intersect) SHALL pass on ink, f03 (frame over the line, alpha clear) SHALL pass, and the codex SHALL report only its four per-glyph fallbacks.

#### Scenario: Injected layer and hand-written SVG

- **WHEN** a script adds text after load or a hand-written SVG without metadata is checked
- **THEN** that text SHALL be measured, and `template check` SHALL exit 2 on its findings.

#### Scenario: No browser

- **WHEN** the browser check is needed (asked, no template metadata, or the style asks for it) and no Chrome or puppeteer-core is found
- **THEN** the command SHALL exit 1 with `TOOL_MISSING` and status `unverified`; when the check itself breaks it SHALL exit 1 with `KERNEL_FAILED`.

#### Scenario: Small text on a giant glyph

- **WHEN** paper-colour text sits on the paper stroke of a giant character on black
- **THEN** its contrast SHALL be measured against that stroke and fail, while black text there passes.

#### Scenario: Script error or no text

- **WHEN** the page throws, or shows no text without declaring `data-no-text` on its root
- **THEN** the check SHALL report `page-error` or `no-text-measured` with a fix, and a page that navigates away SHALL exit 1 with `KERNEL_FAILED`.

#### Scenario: Covered by a plate

- **WHEN** a plain element painted above a text hides more than 15% of its glyphs
- **THEN** the check SHALL report `text-occluded` naming that element.

### Requirement: A string is set in one font

Rendering with `--font-dir` SHALL read the style's font files and set each string in the first font of its role that covers every character, recording the switch. When no font of the role covers it, the static check SHALL report `glyph-coverage`. A registered coverage provider SHALL be asked before font files.

#### Scenario: Simplified-only character in a Mincho role

- **WHEN** `card.onechar-bleed` renders `钥` with fonts where Shippori Mincho B1 lacks it
- **THEN** the slot SHALL be set in Noto Serif CJK SC and the result SHALL list the switch.

#### Scenario: Per-glyph fallback on a page

- **WHEN** a page sets `钥匙夜` in a font that lacks `钥匙`
- **THEN** the browser check SHALL report `glyph-coverage` naming the missing characters.

### Requirement: Title-card cuts keep the motion grammar

The rhythm rule SHALL check each segment's frames by kind, flash groups of one ground tone and allowed size, repeats, the total duration and at most three ground-tone flashes per second.

#### Scenario: Strobe

- **WHEN** an edit alternates black and paper every two frames
- **THEN** the check SHALL report `rhythm` `flash-rate` with a fix.

#### Scenario: Too long

- **WHEN** the cut is rendered with eight groups and 32-frame holds
- **THEN** the check SHALL report the duration with how many frames to remove.

## MODIFIED Requirements

### Requirement: Template check measures the rendered SVG and gives a fix per finding

`template check <file.svg>` SHALL measure the file itself: text extent against each slot box and line budget, character budget, minimum type size, contrast against the composited ground, title overlap with a figure zone, slots inside a crop zone, accent-colour area and shared alignment lines. Every finding SHALL carry a fix. Exit 0 pass, 2 failed check, 1 when its metadata is malformed or a needed check cannot run.

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

- **WHEN** the file has no template-check metadata (HTML or hand-written SVG)
- **THEN** the command SHALL run the browser check on it, exit 0 or 2 on its findings, and exit 1 with `TOOL_MISSING` and status `unverified` when no browser can run.

#### Scenario: Malformed metadata

- **WHEN** the template-check metadata is not valid JSON of its schema
- **THEN** the command SHALL exit 1 with `CONTRACT_INVALID`.

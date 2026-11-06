## ADDED Requirements

### Requirement: Templates declare a layer contract for generated characters

A template MAY declare `layers` (`design-pipeline.layer-contract.v1`): the stack in paint order with roles bg, ground, ghost-type, mid, one char, fx, fg, texture and type, where layers behind the character come before it, fx and fg after it and type last; per-size frame, crop, sprite boxes, character foot, height, frame-break edges and type boxes; and the character's light and rim colour as a palette role. Loading SHALL reject a contract that breaks these rules.

#### Scenario: Type painted before a layer

- **WHEN** a contract lists an fx layer after its type layer
- **THEN** loading SHALL fail with a message that titles and UI are always painted last.

#### Scenario: The street-tape first screen

- **WHEN** `kv.tape-hero` is loaded
- **THEN** its contract SHALL declare 1920x1080, 1080x1920 and 920x430, and its default render SHALL show hatched placeholders, with the scene slot marked `data-layer="ground"`.

### Requirement: Generation task sheets come from the contract

`materials request --template <id>` SHALL write `materials/requests/<name>.md` and `.json` for the char layer (or a layer marked generate): figure height at least twice the largest slot, a transparent PNG or a flat backdrop far from the palette, light and rim, palette, references by name, regions where type or the occluder cover the figure, no text, and "original characters only - never an existing work's character".

#### Scenario: A sheet for the first screen

- **WHEN** `materials request --template kv.tape-hero` runs
- **THEN** it SHALL exit 0 and the sheet SHALL ask for a figure at least 2600 px tall and give the intake command.

#### Scenario: An existing character

- **WHEN** the subject matches a derivative cue (fan art, cosplay, 同人, a character from an existing work)
- **THEN** the command SHALL exit 2 with status refused, write nothing, and give a fix; the cue list is a heuristic, not a complete gate, and the owner's review of the image is.

#### Scenario: Subject as data

- **WHEN** a subject spans lines or runs past 200 characters
- **THEN** it SHALL be folded to one line or refused, and the prompt SHALL quote it as data followed by the fixed original-characters constraint.

### Requirement: Generated images are recorded against their task sheet

`materials add --kind generated` SHALL require `--tool` and `--prompt` naming a task sheet under `materials/requests/` with its `.json`, and SHALL record the tool, both hashes, the template and layer, and optional `--landmarks` (foot, head top, face and hand boxes) validated against the image. `materials check` SHALL fail a generated image whose sheet is missing or changed.

#### Scenario: Lineage is self-reported

- **WHEN** a generated image is recorded
- **THEN** the sheet hashes SHALL prove the sheet was not changed afterwards, not that the image came from it; the record is the owner's statement.

#### Scenario: Sheet edited after intake

- **WHEN** the prompt file changes after the image was recorded
- **THEN** `materials check` SHALL report `material-task-changed` with a fix and exit 2.

### Requirement: GrabCut cuts figures on uneven backdrops

`materials cut --mode grabcut` SHALL separate a figure with colour models and a graph cut, refine the edge, defringe it and record the halo before and after; the `outline` finish SHALL add a die-cut white edge, a black line and an offset ink plate. A cut piece SHALL carry its source's landmarks in its own pixels.

#### Scenario: A studio gradient

- **WHEN** a figure on a dark gradient is cut in grabcut mode
- **THEN** the piece SHALL hold the figure without the backdrop, and the share of backdrop-coloured edge after defringe SHALL be lower than before.

### Requirement: Composite renders every declared size from one set of layers

`materials composite --template <id> --set <layer>=<file>` SHALL render each declared size into ground, upper, mask and final PNGs with the style pack's integration mode, record them with their inputs' hashes, write `composite.json` with parameters, measurements and the redo command, and report upscale, black point, mean colour difference, halo and face and hand safe areas with fixes; upscale above 1.5x and covered safe areas exit 2.

#### Scenario: An input, the contract or the integration changes

- **WHEN** a layer file is re-recorded, or the template's layer contract or the style's integration for the mode changes, after compositing
- **THEN** `materials check` SHALL report every output `material-derived-stale` with the recorded command, its paths shell-quoted, as the fix.

#### Scenario: An occluder over a hand

- **WHEN** a size's foreground box covers more than 5% of a hand box
- **THEN** the composite SHALL report `safe-area-occluder` with the box to move and exit 2.

### Requirement: The browser check takes a ground layer as text ground

The browser check SHALL treat an image as the text's ground (sampled for contrast, never `collage-cover`) when it or its own slot element carries `data-layer="ground"` (noted as self-declared without a matching receipt), or a `composite.json` beside it lists it as ground with its sha256. Images tied to a receipt SHALL add its failing checks as findings, its warn bands as notes, and SHALL report `safe-area-type` when text ink covers the character's face or hands.

#### Scenario: Text on a composited pavement

- **WHEN** a page sets a line of text over a receipt-listed ground image
- **THEN** the check SHALL report no collage-cover finding for it, while the same page without the receipt reports one.

#### Scenario: Forged receipt or wrapper

- **WHEN** the receipt's sha256 differs from the image shown, or a non-slot ancestor carries `data-layer="ground"`
- **THEN** the image SHALL stay collage.

#### Scenario: A title over the face

- **WHEN** text ink covers the face box of a receipt-linked character image
- **THEN** the check SHALL report `safe-area-type` with a move fix.

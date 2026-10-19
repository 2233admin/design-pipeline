## MODIFIED Requirements

### Requirement: Visual directions are previewed before selection

Every change SHALL record whether a visual direction preview is required or waived. An open
whole-surface design, material visual redesign, or explicit comparison request SHALL make its
directions from the three sources (six cards, a thumbnail board and exactly three full versions) with
a shared content fixture, state coverage, and viewport before selecting a direction, in every flow. A
narrow, inherited, non-visual, exact-primary-target, or user-fixed direction MAY record a supported
waiver. A required preview made of model-made candidates SHALL be rejected.

#### Scenario: An open interface has no selected style

- **WHEN** Stage 2 must choose the product's visual direction
- **THEN** the pipeline SHALL hash-bind one comparison page and one screenshot per version, with six cards and a thumbnail board
- **AND** every version pair SHALL differ on at least four declared axes, including luminance or era
- **AND** `directions.md` SHALL NOT commit a direction until the preview and selection gates pass.

#### Scenario: The change has one authoritative direction

- **WHEN** the user supplied a single direction or an exact primary target already decides it
- **THEN** `direction-preview.json` SHALL record the supported waiver and rationale
- **AND** the pipeline SHALL NOT invent alternatives merely to satisfy a count.

#### Scenario: A plain candidate receipt

- **WHEN** a required `direction-preview.json` carries two to four candidates without `medium`, `cards` and `thumbs`
- **THEN** `direction check` SHALL block it, or reject it as a contract error when no change root is given.

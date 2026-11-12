## ADDED Requirements

### Requirement: Template check measures a saturated-hue budget by declared role

`template check --browser` SHALL measure the share of the canvas painted by each saturated hue on a
page whose root element declares `data-hue-brand`, `data-hue-counter`, `data-hue-alert` or
`data-hue-timed`, and SHALL report rule `hue-budget` when the counter colour exceeds 3%, the alert and
timed colours together exceed 1%, or an undeclared saturated hue reaches 0.1%. It SHALL NOT limit the
brand colour and SHALL NOT measure a page that declares no role.

#### Scenario: A page inside its budget

- **WHEN** a page declares brand, counter and alert colours and paints the counter under 3% and the alert under 1% of the canvas
- **THEN** the check SHALL report no `hue-budget` finding
- **AND** the result SHALL carry `hue` with the shares and a note naming the brand, counter and status shares.

#### Scenario: A page over its budget

- **WHEN** the counter colour paints 4% of the canvas, the alert colour 1.5% and an undeclared green 1.3%
- **THEN** the check SHALL report three `hue-budget` findings for `counter`, `status` and the green hue, each with `measuredBy` `browser`, the measured share, the limit and a `fix`
- **AND** the status SHALL be `failed`.

#### Scenario: Decoration and undeclared pages

- **WHEN** the over-budget elements carry `data-deco`, or the page declares no role
- **THEN** the check SHALL report no `hue-budget` finding and SHALL NOT add `hue` to a page that declared nothing.

#### Scenario: A declared value that cannot be measured

- **WHEN** a declared value is not a colour or has OKLab chroma under 0.08
- **THEN** the check SHALL say so in a note and SHALL NOT assign any pixel to that role.

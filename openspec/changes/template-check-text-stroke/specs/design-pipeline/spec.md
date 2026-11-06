## ADDED Requirements

### Requirement: Template check measures stroked text

`template check` in the browser SHALL clear `-webkit-text-stroke` when it hides a text to sample its ground, count the stroke in the text's ink, and measure contrast with the stroke colour when the fill is transparent and the stroke is painted. Output for pages without a text stroke SHALL be unchanged.

#### Scenario: Invisible stroked text

- **WHEN** a text has a transparent fill and a 3px `#101112` stroke on a `#101112` ground
- **THEN** the check SHALL report a `contrast` finding of about 1:1 with the stroke colour as `measured.text` and a fix.

#### Scenario: Visible stroked text

- **WHEN** a text has a transparent fill and a white stroke on a dark ground
- **THEN** the check SHALL pass and SHALL NOT note that the colour is not a colour.

#### Scenario: Stroke is ink

- **WHEN** two texts have transparent fills and their strokes touch
- **THEN** the check SHALL report `text-overlap`.

#### Scenario: Pages without a stroke

- **WHEN** a template render or an HTML fixture without a text stroke is checked
- **THEN** its report SHALL be byte-identical to the one before this change.

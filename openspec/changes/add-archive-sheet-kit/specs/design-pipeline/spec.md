# Design pipeline delta

## ADDED Requirements

### Requirement: document sheets render from a data spec
The skill SHALL render an industrial document sheet about a real subject from a JSON spec of frame, title, one hero, side blocks and notes, drawing every hero from data in the spec and never by eye.

#### Scenario: Computed hero
- **WHEN** a gnomon spec gives gnomon height, latitude and solar declinations
- **THEN** each noon shadow SHALL be drawn and labelled at gnomon height × tan(latitude − declination)

#### Scenario: Example values are disclosed
- **WHEN** any field in the spec is flagged as an example value
- **THEN** the value SHALL carry an asterisk and the footer SHALL state that starred values are examples

### Requirement: sheet checks on render
Rendering a sheet SHALL report findings for a missing sources line, an incomplete frame, a hero or text column over the method's density budget, and a side column that overflows the page.

#### Scenario: Over budget
- **WHEN** a standard-density sheet has more than eight text-column fields
- **THEN** a density-budget finding SHALL be reported and the script SHALL exit 2

### Requirement: four-question intake for sheets
For a sheet about a real subject the skill SHALL ask at most four questions, format and size, issuing institution, dialect and density, then decide anything else itself.

#### Scenario: Owner does not answer
- **WHEN** the questions get no answer
- **THEN** the sheet SHALL be built at 1920×1080, paper dialect, standard density, with an invented institution named for the subject

### Requirement: vector display plates with a raster glow pass
The skill SHALL render early-80s vector display plates (`scope`, `plate`, `panel`) from a JSON spec as crisp phosphor lines with no SVG filters, and SHALL apply the physical glow in a separate raster pass that keeps scan tears inside the spec's tear zone.

#### Scenario: Computed subject
- **WHEN** a plate spec names a Menger sponge of level 2
- **THEN** the plate SHALL draw the 400 cubes that remain of 729 and report no findings

#### Scenario: Text stays readable
- **WHEN** the glow pass runs with the spec's tear zone
- **THEN** no scan tear SHALL fall outside that band, so captions, tags and readouts outside it are not displaced

## ADDED Requirements

### Requirement: Visual directions are previewed before selection

Every change SHALL record required or waived direction-preview applicability. Required previews
SHALL render two to four real miniature candidates with shared content, states, and viewport and
SHALL pass preview and selection gates before `directions.md` commits a direction.

#### Scenario: Open visual design

- **WHEN** no visual direction is authoritative
- **THEN** the pipeline SHALL hash-bind the brief, comparison HTML, and one screenshot per candidate
- **AND** candidate pairs SHALL differ on at least four axes including luminance or era.

#### Scenario: Direction is already authoritative

- **WHEN** scope is narrow/inherited/non-visual or a single user direction or exact target decides it
- **THEN** the receipt SHALL record a supported waiver and rationale instead of fake alternatives.

### Requirement: CJK typography is explicit and bounded

CJK interfaces SHALL record a system/project stack, real weights, size/line-height posture,
punctuation and mixed-script convention, and decorative subset evidence. Full CJK webfonts SHALL
NOT be added for routine UI or body copy.

#### Scenario: Chinese interface copy ships

- **WHEN** the implemented surface contains Chinese text
- **THEN** Stage 6 SHALL verify real CJK strings, responsive widths, 200% zoom, and font failure
- **AND** every decorative font SHALL retain a licensed, hash/byte-accounted subset and fallback.

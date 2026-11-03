## ADDED Requirements

### Requirement: Design-system role colours are measured

`design-system check` SHALL report an `on-<fill>` colour token that no `contrast` entry measures on `<fill>` (or, when `<fill>` is not a colour token, in any entry), and a colour token whose name contains `focus` that no entry measures or that an entry measures with a minimum below 3. Each finding SHALL carry a code, severity `error` and a fix naming the entry to add.

#### Scenario: Unmeasured on- colour

- **WHEN** tokens declare `accent` and `on-accent` and `contrast` measures `on-accent` only on `paper`
- **THEN** the check SHALL report `on-token-unmeasured` with a fix that adds `on-accent` on `accent`

#### Scenario: Focus ring below 3:1 floor

- **WHEN** `focus-ring` is measured with `min` 2
- **THEN** the check SHALL report `focus-ring-floor` and the package SHALL NOT be `ready`

#### Scenario: Measured role colours

- **WHEN** `on-accent` is measured on `accent` and `focus-ring` with `min` 3 or more
- **THEN** no role finding SHALL be reported

### Requirement: The design-system cover is checked for its fixed form

`design-system check` SHALL report a cover preview, outside HTML comments, that shows a picture (`cover-picture`), uses a gradient (`cover-gradient`), moves (`cover-motion`) or has a responsive layout through media or container queries or viewport units (`cover-responsive`). Each finding SHALL carry a fix. Taste rules for the cover SHALL stay advisory.

#### Scenario: A cover with a picture and a gradient

- **WHEN** the cover contains an `<img>` and a `linear-gradient(`
- **THEN** the check SHALL report `cover-picture` and `cover-gradient`

#### Scenario: Words in the derivation comment

- **WHEN** only an HTML comment in the cover mentions `img`, `gradient` or `@media`
- **THEN** no cover finding SHALL be reported

### Requirement: Distilled design methods stay advisory and keep provenance

Design methods distilled from outside skills SHALL land in the existing guides in this repository's own words, with source, terms and `codeCopied: false` recorded in the change design and `THIRD_PARTY_NOTICES.md`. Guidance that needs taste or a source to judge SHALL NOT become a gate finding and SHALL NOT claim Visual Acceptance.

#### Scenario: Deck craft

- **WHEN** an agent builds an HTML deck
- **THEN** `editable-pptx-html.md` SHALL give it the title-first outline, type floor, height budget and footer rail as guidance, not a gate

#### Scenario: Unlicensed source text

- **WHEN** a source is Anthropic material with no licence granted
- **THEN** only its mechanisms SHALL be restated, and no prompt text, code or asset SHALL be copied

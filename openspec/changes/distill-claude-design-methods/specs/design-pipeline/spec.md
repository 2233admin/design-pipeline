## ADDED Requirements

### Requirement: Design-system role colours are measured

Role colours are named `on-<fill>` and `focus-ring` or `focus-outline` (kebab-case suffixes allowed, such as `focus-ring-inverse`). `design-system check` SHALL report an `on-<fill>` token no `contrast` entry measures on `<fill>` (in any entry when `<fill>` is not a colour token), and a focus-ring token with no entry. Either measured below 3 SHALL be reported. Each finding SHALL carry a code, severity `error` and a fix.

#### Scenario: Unmeasured on- colour

- **WHEN** tokens declare `accent` and `on-accent` and `contrast` measures `on-accent` only on `paper`
- **THEN** the check SHALL report `on-token-unmeasured` with a fix that adds `on-accent` on `accent`

#### Scenario: Floors below 3:1

- **WHEN** `on-accent` is measured with `min` 2, or `focus-ring` with `min` 2
- **THEN** the check SHALL report `on-token-floor` or `focus-ring-floor` and the package SHALL NOT be `ready`

#### Scenario: Other focus names

- **WHEN** tokens declare `focus-bg`
- **THEN** no focus-ring finding SHALL be reported for it

#### Scenario: Measured role colours

- **WHEN** `on-accent` is measured on `accent` and `focus-ring` with `min` 3 or more
- **THEN** no role finding SHALL be reported

### Requirement: The design-system cover is checked for its fixed form

`design-system check` SHALL read the cover preview and each `components/bundle.css` rule whose selector names a class or id the cover uses, ignoring HTML and CSS comments. It SHALL report a picture element (`cover-picture`), a CSS gradient function or SVG gradient (`cover-gradient`), `animation` properties, keyframes or SVG animation elements (`cover-motion`), and size media queries, container queries or viewport units in CSS values (`cover-responsive`), each with a fix.

#### Scenario: A cover with a picture and a gradient

- **WHEN** the cover contains an `<img>` and a `linear-gradient(`
- **THEN** the check SHALL report `cover-picture` and `cover-gradient`

#### Scenario: Comments, prose, transitions and colour-scheme queries

- **WHEN** only an HTML or CSS comment or body text mentions a gradient, the cover has only a `transition`, or a `prefers-color-scheme` media query
- **THEN** no cover finding SHALL be reported

#### Scenario: A bundle rule reaching the cover

- **WHEN** `bundle.css` gives `.hero` a gradient and the cover body has class `hero`
- **THEN** the check SHALL report `cover-gradient`; for a class the cover does not use it SHALL NOT

### Requirement: Distilled design methods stay advisory and keep provenance

Design methods distilled from outside skills SHALL land in the existing guides in this repository's own words, with source, terms and `codeCopied: false` recorded in the change design and `THIRD_PARTY_NOTICES.md`. Guidance that needs taste or a source to judge SHALL NOT become a gate finding and SHALL NOT claim Visual Acceptance.

#### Scenario: Deck rules

- **WHEN** an agent builds an HTML deck bound for PowerPoint
- **THEN** `editable-pptx-html.md` SHALL give it the title-first outline, type floor, height budget and footer rail as guidance, not a gate

#### Scenario: Unlicensed source text

- **WHEN** a source is Anthropic material with no licence granted
- **THEN** only its mechanisms SHALL be restated, and no prompt text, code or asset SHALL be copied

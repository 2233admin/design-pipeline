## ADDED Requirements

### Requirement: Interface products keep a design-system package

A `ui` or `web` product SHALL keep `design-system/` beside `DESIGN.md`: a README with content fundamentals, visual foundations and iconography; a list-shaped `tokens.json` with a usage note on every token and style and declared contrast pairs; guidelines and a marked live preview per component; and a bare cover. `foundation check --kind system` SHALL validate it and `--kind all` SHALL include it when present.

#### Scenario: A complete package

- **WHEN** every token has a usage note, every declared contrast pair meets its minimum in every theme, and every component has guidelines and a marked preview
- **THEN** the check SHALL report `ready` with the components and the measured contrast ratios

#### Scenario: A project without a package

- **WHEN** `design-system/tokens.json` does not exist
- **THEN** `--kind system` SHALL report `synthesis-required` and `--kind all` SHALL check only `DESIGN.md` and `MOTION.md`

#### Scenario: Usage or contrast is missing

- **WHEN** a token has no usage note, a family is a name-to-value map, an alias does not resolve, or a contrast pair is below its minimum in any theme
- **THEN** the check SHALL report `invalid` with one finding per problem and exit 2

#### Scenario: A preview embeds another page

- **WHEN** a preview lacks the line-1 marker or uses iframe, frame, object, embed, portal or noscript
- **THEN** the check SHALL report it as a finding for that file

### Requirement: Design-system tokens are the single source of DESIGN.md tokens

When the package exists, the `DESIGN.md` front-matter `colors`, `typography`, `rounded` and `spacing` groups SHALL equal the `design-system design-md-tokens` output, with aliases resolved. Lengths SHALL be px, rem or em so the generated front matter passes the Google format lint.

#### Scenario: A token changes in tokens.json only

- **WHEN** a colour value in `tokens.json` differs from `DESIGN.md`
- **THEN** the check SHALL name the token and the regenerate command

#### Scenario: A percentage radius

- **WHEN** a radius or spacing token is `50%`
- **THEN** the check SHALL refuse it and ask for px, rem or em

### Requirement: Design-system previews render through composition capture

`design-system compile` SHALL write `tokens.css` compiled from `tokens.json` and one standalone HTML per preview with `tokens.css` and `components/bundle.css` inlined and the first theme set, inside the project. Rendering SHALL reuse `composition capture`; a ready check SHALL NOT be reported as visual acceptance.

#### Scenario: Previews are compiled

- **WHEN** `design-system compile` runs on a package with an Entry component and a cover
- **THEN** it SHALL write `previews/Cover.html` and `previews/Entry.html`, each loading the compiled tokens and the bundle stylesheet

#### Scenario: The output escapes the project

- **WHEN** `--output` resolves outside `--project-root`
- **THEN** the command SHALL fail and write nothing

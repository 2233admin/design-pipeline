## ADDED Requirements

### Requirement: Declared real brands owe a sourced facts file

When DESIGN.md Product Context declares `Real brands:` with names other than `none`, the design-system package check SHALL report, each with a fix, a missing facts file, a fact without an https or owner source, and a declared brand with no sourced fact under its own heading. Brand names SHALL be compared by equality, never by substring. The web build step SHALL show the same findings and SHALL NOT finish while any remain.

#### Scenario: An unsourced fact stops the build

- **WHEN** the facts file has a line with no https URL or owner source
- **THEN** `design-system check` SHALL report `brand-fact-unsourced` with a fix
- **AND** the web build step SHALL list the finding before its instruction.

#### Scenario: A longer name does not satisfy a shorter one

- **WHEN** Product Context declares `Meta` and the only brand data is for `Meta Quest 3`
- **THEN** the check SHALL report the missing colour, logo and facts for `Meta`.

#### Scenario: A project with its own brand is not blocked

- **WHEN** Product Context says `Real brands: none` or has no such line
- **THEN** no brand finding SHALL apply.

### Requirement: Brand colours are sourced tokens

For each declared brand, `design-system/tokens.json` SHALL hold at least one colour token carrying `brand` and `source`, or `brands.<Brand>.colours` set to `"none"`. A source SHALL be an https URL, `owner`, or an existing file inside the project; when it is a project text asset the token's hex SHALL appear in it, an empty file included. The brand values reach DESIGN.md through the generated `colors` group.

#### Scenario: A guessed colour stops the build

- **WHEN** a brand colour token has no `source`
- **THEN** the check SHALL report `brand-colour-unsourced` with a fix naming where the value must come from.

#### Scenario: A cited asset that does not hold the colour

- **WHEN** the token cites an svg that is empty or lacks its hex
- **THEN** the check SHALL report `brand-colour-not-in-source`.

#### Scenario: Colours none passes

- **WHEN** `brands.<Brand>.colours` is `"none"` and no token carries that brand
- **THEN** no colour finding SHALL apply for that brand.

### Requirement: Declared real brands have one logo in the package

Each declared brand SHALL have exactly one `brands.<Brand>.logo = {path, source}` whose file is an svg, png, webp or jpg that exists under `design-system/assets/logos/` inside the project, with a source.

#### Scenario: Missing, duplicate or misplaced logo

- **WHEN** a logo is absent, declared twice, outside the project or `assets/logos/`, or has no source
- **THEN** the check SHALL report `brand-logo-missing`, `brand-logo-multiple` or `brand-logo-invalid` with a fix.

#### Scenario: Real brands without a package

- **WHEN** Product Context declares real brands and `design-system/tokens.json` does not exist
- **THEN** `foundation check --kind all` and the build step SHALL report `brand-package-missing` with the fix to write the package.

## ADDED Requirements

### Requirement: Declared real brands owe a sourced facts file

When DESIGN.md Product Context declares `Real brands:` with names other than `none`, the design foundation check SHALL report, each with a fix, a missing facts file, a fact without a source, and a brand that no fact names. The web build step SHALL show the same findings and SHALL NOT finish while any remain.

#### Scenario: An unsourced fact stops the build

- **WHEN** the facts file has a line with no URL or owner source
- **THEN** `foundation check` SHALL block with `brand-fact-unsourced` and a fix
- **AND** the web build step SHALL list the finding before its instruction.

#### Scenario: A project with its own brand is not blocked

- **WHEN** Product Context says `Real brands: none` or has no such line
- **THEN** the foundation check SHALL apply no brand finding.

### Requirement: Declared real brands owe one real logo and sourced colours

For each declared brand the foundation check SHALL report, each with a fix: no Logo line, a Logo line without an existing logo file or a source, more than one Logo line, no Brand colour line, a colour value without a source, or a value absent from the text asset it cites.

#### Scenario: A guessed colour stops the build

- **WHEN** Source Decisions has `Brand colour - Stripe: #635BFF` with no URL, owner or file source
- **THEN** `foundation check` SHALL block with `brand-colour-unsourced` and a fix naming where the value must come from.

#### Scenario: A complete brand spec passes

- **WHEN** one Logo line cites a downloaded svg and a URL, and the Brand colour line cites a hex found in that svg
- **THEN** the foundation check SHALL report ready.

## ADDED Requirements

### Requirement: Design-system previews style with tokens

`design-system check` SHALL report each `var(--x)` in `components/bundle.css` or a preview that is neither a token from tokens.json nor a custom property declared in the package CSS, and raw colour values or font stacks outside custom-property declarations, each with a fix. It SHALL return declared, referenced and unused token counts without failing on unused tokens.

#### Scenario: A preview hard-codes a colour

- **WHEN** a preview's style sets `background: #ffffff` or `font-family: "Inter"`
- **THEN** the check SHALL report the file with the raw values and SHALL return `invalid`

#### Scenario: bundle.css declares a local alias

- **WHEN** `bundle.css` declares `--row-rule: #d8d2c4` and uses `var(--row-rule)`
- **THEN** neither the declaration nor the reference SHALL be a finding

### Requirement: Anti-slop waivers explain the target

The anti-slop evaluator SHALL refuse an `accepted-context` or `not-applicable` rationale shorter than 24 characters, and the same rationale (ignoring case and spacing) on two or more rules. A hard rule SHALL still refuse `accepted-context` first.

#### Scenario: One sentence waives every contextual rule

- **WHEN** two observations carry the same rationale
- **THEN** the evaluator SHALL fail naming both rule ids

#### Scenario: The rationale is too short

- **WHEN** a contextual rule is accepted with "It fits."
- **THEN** the evaluator SHALL fail and ask for at least 24 characters naming the product reason

### Requirement: Current AI defaults are named, advisory only

`fashion-tell-advisory` SHALL name the current clusters of AI design defaults from a hashed, recorded source, as preference severity: prominent use needs a stated reason where the brief leaves that axis free, and SHALL never block. The craft-density menu SHALL NOT recommend template chrome as craft.

#### Scenario: The brief asks for a broadsheet look

- **WHEN** the brief names the look
- **THEN** using it SHALL be the owner's choice and no finding SHALL block it

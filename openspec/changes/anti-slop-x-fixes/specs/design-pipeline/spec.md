## ADDED Requirements

### Requirement: Design-system previews style with tokens

`design-system check` SHALL report each `var(--x)` in `components/bundle.css` or a preview that is neither a token from tokens.json, a custom property declared in `bundle.css`, nor a custom property declared in the same preview, with a fix. A custom property SHALL count as declared only where a declaration starts with it, after comments are removed. The check SHALL return declared, referenced and unused token counts without failing on unused tokens.

#### Scenario: bundle.css declares a local alias

- **WHEN** `bundle.css` declares `--row-rule: #d8d2c4` and a preview uses `var(--row-rule)`
- **THEN** neither the declaration nor the reference SHALL be a finding

#### Scenario: A preview's own custom property stays in that preview

- **WHEN** one preview declares `--gap` and another preview uses `var(--gap)`
- **THEN** the second preview SHALL report `var(--gap)` as undeclared

#### Scenario: A BEM selector is not a declaration

- **WHEN** `bundle.css` has the selector `.btn--primary:hover` and uses `var(--primary)`
- **THEN** the check SHALL report `var(--primary)` as undeclared

### Requirement: Raw colours in declaration values are findings

`design-system check` SHALL report raw colours, meaning hex values and the `rgb`, `rgba`, `hsl`, `hsla`, `hwb`, `lab`, `lch`, `oklab`, `oklch`, `color` and `color-mix` functions, in declaration values of `bundle.css`, preview `<style>` blocks and preview `style` attributes with HTML entities decoded, and in preview SVG `fill`, `stroke`, `stop-color`, `flood-color` and `lighting-color` attributes. Named colours are not detected.

#### Scenario: A preview hard-codes a colour

- **WHEN** a preview's style sets `background: #ffffff`, or an SVG in it sets `fill="#ff0000"`
- **THEN** the check SHALL report the file with the raw values and SHALL return `invalid`

### Requirement: Raw font stacks are findings

`design-system check` SHALL report a `font-family` declaration in the same sources whose value is neither a `var(--font-...)` stack nor `inherit`, `initial` or `unset`, with or without `!important`.

#### Scenario: A preview names a font

- **WHEN** a preview's style sets `font-family: "Inter", sans-serif`
- **THEN** the check SHALL report the stack and SHALL return `invalid`

#### Scenario: A keyword font-family with !important

- **WHEN** CSS sets `font-family: inherit !important`
- **THEN** it SHALL NOT be a finding

### Requirement: Only declaration values are scanned for raw values

The token-use check SHALL NOT scan selectors, CSS or HTML comments, `<script>` content, string literals, `url(...)` contents, `@font-face` or `@property` blocks, or custom-property values for raw values, and SHALL ignore `none`, `currentColor`, `url(#...)` and `var()` paint attributes.

#### Scenario: A hex-like selector, comment or string is not a colour

- **WHEN** CSS has the selector `#add`, the comment `/* #ff0000 */`, `content: "#fff"` or `fill: url(#grad)`
- **THEN** none of them SHALL be a raw-colour finding

### Requirement: Anti-slop waivers explain the target

The anti-slop evaluator SHALL refuse an `accepted-context` or `not-applicable` rationale that weighs less than 24, counting characters other than whitespace and punctuation, with each CJK ideograph, kana or hangul syllable weighing 2. A hard rule SHALL still refuse `accepted-context` first. The rule prompts the reviewer to explain the waiver; it is not proof against deliberate padding.

#### Scenario: The rationale is too short

- **WHEN** a contextual rule is accepted with "It fits." or with eight Chinese characters
- **THEN** the evaluator SHALL fail and ask for at least 24 characters naming the product reason

#### Scenario: A short CJK rationale that says enough

- **WHEN** a contextual rule is accepted with twelve Chinese characters
- **THEN** the length check SHALL pass

### Requirement: One waiver rationale is not copied across rules

The anti-slop evaluator SHALL refuse the same rationale, ignoring case, whitespace and punctuation, on two or more `accepted-context` or `not-applicable` observations; `pass` and other outcomes SHALL NOT be compared. The rule is not proof against deliberate rewording.

#### Scenario: One sentence waives every contextual rule

- **WHEN** two `accepted-context` or `not-applicable` observations carry the same rationale, differing only in case, spacing or punctuation
- **THEN** the evaluator SHALL fail naming both rule ids

#### Scenario: Pass notes may repeat

- **WHEN** two `pass` observations carry the same rationale
- **THEN** the evaluator SHALL NOT report a copied rationale

### Requirement: Current AI defaults are named, advisory only

`fashion-tell-advisory` SHALL name the current clusters of AI design defaults from a hashed, recorded source, as preference severity: prominent use needs a stated reason where the brief leaves that axis free, and SHALL never block. The craft-density menu SHALL NOT recommend template chrome as craft.

#### Scenario: The brief asks for a broadsheet look

- **WHEN** the brief names the look
- **THEN** using it SHALL be the owner's choice and no finding SHALL block it

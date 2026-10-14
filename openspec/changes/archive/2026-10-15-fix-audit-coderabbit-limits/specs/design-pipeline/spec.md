## MODIFIED Requirements

### Requirement: Interaction verification audits rendered UI craft

The existing interaction verifier SHALL accept an `audit` probe that measures the rendered page for
typography, contrast, overflow, clipping, target size, control spacing, alignment and nested radius
at declared viewports. Thresholds and selectors SHALL be probe inputs with documented defaults. Each
check SHALL report passed, failed, not-declared, not-applicable or indeterminate with a checked count.

#### Scenario: A page violates measured craft rules

- **WHEN** `verify interaction` runs an audit probe against a page with failing measurements
- **THEN** each failure SHALL be a finding with its code, element selector, measured value,
  threshold, viewport and fix
- **AND** the verifier SHALL exit 2 and SHALL NOT record a gate pass.

#### Scenario: Evidence is unresolved

- **WHEN** text sits on a gradient, image or translucent background, or a declared selector matches
  no element
- **THEN** contrast SHALL report `indeterminate` with a fix to place the text on a measurable surface,
  or the check SHALL fail, and the audit SHALL fail
- **AND** no probe field SHALL suppress the result or mark the check as passed.

#### Scenario: An optional check is not declared

- **WHEN** a selector-based optional check has no declared selectors
- **THEN** it SHALL report `not-declared` in the audit coverage
- **AND** it SHALL NOT be reported as passed.

#### Scenario: An audit probe is malformed

- **WHEN** an audit probe has an unknown field, no `thresholds.fonts`, an empty selector, a
  non-positive threshold, a duplicate viewport, or a page that is not a local file inside the project
- **THEN** validation SHALL reject it before any browser starts
- **AND** existing motion and journey probes SHALL keep their current behavior.

#### Scenario: Paint over generated text on its own fill is unresolved

- **WHEN** generated `::before` or `::after` text on its own fill lies under another element, a
  positioned child of its host, or its host's other pseudo-element painted above it
- **THEN** contrast SHALL report `indeterminate` instead of a ratio against that fill
- **AND** generated text on its own fill that is transformed, offset by relative or sticky
  positioning, or otherwise cannot be placed SHALL report `indeterminate` as well.

#### Scenario: Generated text is measured where its margins place it

- **WHEN** the margins of an absolute pseudo-element move its generated text off its host
- **THEN** contrast SHALL be measured against the background behind the moved box.

#### Scenario: An over-constrained pseudo-element does not widen a target

- **WHEN** a control's absolute `::before` or `::after` has a size, margins and insets that
  over-constrain each other
- **THEN** target size SHALL measure the control without that pseudo-element
- **AND** a pseudo-element whose insets and margins resolve SHALL widen the target to its border box,
  on an inline control on one line as on a block.

#### Scenario: A link across a line break is not inside a sentence

- **WHEN** an inline link is separated from the surrounding text by a `<br>` or an in-flow block box
- **THEN** that text SHALL NOT exempt the link from target size and control spacing
- **AND** a link inside a sentence that merely wraps SHALL stay exempt.

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
  non-positive threshold, or a page that is not a local file inside the project
- **THEN** validation SHALL reject it before any browser starts
- **AND** existing motion and journey probes SHALL keep their current behavior.

#### Scenario: A positioned host child covers non-absolute generated text on its own fill

- **WHEN** in-flow `::before` or `::after` text, including a static inline-block pseudo-element, has its own opaque fill and a positioned painted host child intersects its conservative host-box boundary above the host
- **THEN** `audit.text-contrast` SHALL report `indeterminate` with an error naming the pseudo-element and covering child, not a ratio against the fill
- **AND** `verify interaction` SHALL exit 2 and SHALL NOT record a gate pass
- **AND** descendant paint detection SHALL NOT require the pseudo-element to be absolutely positioned.

#### Scenario: Generated text on its own fill has no unresolved descendant paint

- **WHEN** generated own-fill text has no painted descendant intersecting its measured boundary, or hit testing demonstrates that an intersecting descendant paints beneath the host
- **THEN** that descendant SHALL NOT make contrast indeterminate
- **AND** an equivalent unobscured in-flow marker SHALL retain its measurable contrast.

#### Scenario: Exact in-flow pseudo geometry is unavailable

- **WHEN** an in-flow own-fill pseudo uses its host box as the existing conservative boundary and intersecting descendant paint above the host cannot be excluded
- **THEN** contrast SHALL remain `indeterminate` without inventing a glyph or pseudo-element box to claim a passing ratio
- **AND** ordinary-text descendant handling and existing absolute pseudo-element placement SHALL remain unchanged.

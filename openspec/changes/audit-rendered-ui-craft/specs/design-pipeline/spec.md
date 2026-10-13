## ADDED Requirements

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

### Requirement: Web probe stage requires a page audit

The web workflow's `probe` stage SHALL require at least one passing audit probe at every tier. When
the probe file lacks one, `next` SHALL return an instruction to add it, and the stage SHALL NOT
finish.

#### Scenario: A legacy probe file has no audit

- **WHEN** a web project reaches `probe` with an `interaction.json` that has no audit probe
- **THEN** `next` SHALL ask for an audit probe instead of returning the verify command
- **AND** `review` and `deliver` SHALL stay unavailable.

### Requirement: Interaction gate binds rendered dependencies and design tokens

A recorded interaction gate SHALL bind the hashes of local files the page loaded and of the
project's `DESIGN.md` and `MOTION.md` when present. A record without that lineage, with a changed
hash, or missing a token source that now exists SHALL be stale. An audited page SHALL load only
resources the gate can hash.

#### Scenario: A stylesheet changes after verification

- **WHEN** a stylesheet loaded by the verified page is edited
- **THEN** the interaction gate SHALL be stale
- **AND** `probe`, `review` and `deliver` SHALL reopen.

#### Scenario: A gate was recorded before lineage existed

- **WHEN** an interaction gate record has no dependency lineage
- **THEN** it SHALL be treated as stale and require re-verification.

#### Scenario: An audited page loads an unbindable resource

- **WHEN** an audited page requests an `http(s)` resource or a `file:` outside the project
- **THEN** the audit SHALL fail with the verifier's existing `external-request` finding, listing each
  such resource once per audit probe with a fix to copy it into the project
- **AND** the verifier SHALL exit 2 and SHALL NOT record a gate pass.

#### Scenario: Any probe loads a file outside the project

- **WHEN** a motion or journey probe on a local page, or a request after a probe stopped recording,
  loads a `file:` resource outside the project
- **THEN** the verification run SHALL fail with an `external-request` finding listing that file
- **AND** the verifier SHALL exit 2 and SHALL NOT record a gate pass.

### Requirement: UI craft rules are project-owned

The pipeline SHALL keep one project-owned UI craft rule index that maps each audit code to its
sources and holds a deduplicated review checklist with stable ids for rules the audit does not
measure. The web review SHALL record checklist results as Component Conformance evidence.

#### Scenario: A reviewer checks an unmeasured rule

- **WHEN** the web review covers motion feel, focus, semantics, copy or states
- **THEN** it SHALL use the checklist ids from the rule index and record results in `qa.md`
- **AND** it SHALL NOT report them as Visual Acceptance.

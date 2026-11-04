## ADDED Requirements

### Requirement: Interaction audit stress pass measures long content

An audit probe MAY declare `stress`. The verifier SHALL then, at each viewport after the normal
audit, lengthen the page's visible text in place, audit it again and report only new failures of
the existing overflow codes, each with a fix. A passing record SHALL name `long-content` and
`overflow` as the states it evidences; no state, gate, schema or code is added.

#### Scenario: Text breaks under stress

- **WHEN** `verify interaction` runs an audit probe with `stress` on a page that passes the normal
  audit but clips, truncates or pushes the page sideways once its text is 2.5 times longer
- **THEN** each new failure SHALL be a finding with its overflow code, selector, viewport, measured
  value, `pass: "stress"` and fix
- **AND** the verifier SHALL exit 2 and SHALL NOT record a gate pass.

#### Scenario: Robust page and reachable truncation

- **WHEN** the stressed page wraps its text, and every ellipsis or line clamp has a title, link or
  details element reaching the full value
- **THEN** the stress coverage SHALL pass at every viewport and count the reachable truncations
- **AND** a failure the normal audit already reported SHALL NOT be repeated as a stress finding.

#### Scenario: Stress declaration is malformed or missing

- **WHEN** `stress` is not an object, has an unknown key, a `textScale` not above 1 or above 10, or
  an empty scope selector
- **THEN** validation SHALL reject it before any browser starts
- **AND** a scope selector the page rejects or does not match SHALL exit 1 with no gate recorded.

#### Scenario: Completion needs the stress record

- **WHEN** a probe declares `stress` and a report row lacks a passing stress record at a viewport,
  or claims a pass that lengthened no text
- **THEN** native completion SHALL reject the row
- **AND** an audit probe without `stress` SHALL capture, summarize and complete as before.

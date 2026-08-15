## ADDED Requirements

### Requirement: Component-first v2 binds one target snapshot through chained receipts

The future v2 gate SHALL bind stack, component, Playground, page, and browser evidence to one target
identity, snapshot digest, and policy digest. An upstream digest change SHALL invalidate downstream
receipts. Prototype evidence SHALL require an explicit promotion receipt before satisfying a
production target. Component conformance SHALL remain distinct from visual acceptance.

#### Scenario: An upstream target snapshot changes

- **WHEN** a component or target snapshot digest differs from the digest bound by a downstream page
  or browser receipt
- **THEN** the downstream receipt SHALL become stale and SHALL NOT satisfy component conformance
- **AND** visual acceptance SHALL remain a separate result rather than being inferred.

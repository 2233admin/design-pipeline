## ADDED Requirements

### Requirement: Product-animation controls evidence is safe across review surfaces

The OpenAlice product-animation target SHALL emit a current-run, target-local Component Conformance receipt for desktop, mobile, reduced-motion, and native-controls review surfaces without treating that receipt as Visual Acceptance.

#### Scenario: A controls-safe review is recorded

- **WHEN** the target produces polish evidence
- **THEN** the receipt SHALL contain one distinct reviewable capture for desktop, mobile, reduced-motion, and native-controls surfaces with viewport, runtime state, path, and hash metadata
- **AND** each capture SHALL show that the bottom 210 authored pixels are reserved for native media controls
- **AND** both terminal human-review strings SHALL remain above that reserved region and unobscured while native media controls are visible.

#### Scenario: Historical evidence is encountered

- **WHEN** a reviewer or verifier reads historical `native-*.png` evidence or an `output/sample-approved/` artifact
- **THEN** it SHALL be retained as archive material and SHALL NOT be represented as evidence produced by the current polish run
- **AND** its presence or a baseline comparison SHALL NOT imply Visual Acceptance.

### Requirement: Motion graph verification preserves the public runtime boundary

The target SHALL preserve its authored lexical motion graph for verification without mounting that graph as a public `window.__motionGraph` API or altering the established `window.film` and `window.__timelines.openalice` contracts.

#### Scenario: The verifier reads the authored graph

- **WHEN** `verify.cjs` evaluates the target page
- **THEN** it SHALL obtain the lexical `motionGraph` through a target-local, test-only hook in the same page execution context
- **AND** `window.__motionGraph` SHALL be absent from the public window surface
- **AND** the test-only hook SHALL NOT be documented or usable as an application integration API.

#### Scenario: The graph contract is checked

- **WHEN** the verifier receives the authored graph snapshot
- **THEN** it SHALL validate the declared schema, composition, starts, track IDs, shared-anchor track, and bounded `response.spring-settle` parameters
- **AND** it SHALL require the exact ordered beat sequence `orient, extract, retain, reference, inspect, review`
- **AND** it SHALL reject overlapping, inverted, or undeclared-gapped beat boundaries.

#### Scenario: A spring response settles

- **WHEN** a `response.spring-settle` track is sampled at its declared endpoints
- **THEN** the verifier SHALL check the associated `springProgress` endpoint and settled target state
- **AND** it SHALL reject an endpoint that does not settle or spring parameters outside the declared bounds
- **AND** the check SHALL not add a live clock or another motion runtime.

### Requirement: The 7.5-second evidence sample is deterministic and sequentially proven

The target SHALL generate a deterministic 7.5-second sample as a target-local derivative of the canonical composition and SHALL bind its accurate sequential frame evidence and normal-speed playback proof to the current receipt.

#### Scenario: A sample is rendered

- **WHEN** `run.cjs --sample` renders the short sample
- **THEN** it SHALL derive the sample from the same target-local `index.html` composition at exactly 7.5 seconds
- **AND** it SHALL NOT read, copy, overwrite, or otherwise use `output/sample-approved/` as a render source
- **AND** it SHALL clean temporary retime artifacts after the render completes or fails.

#### Scenario: Frame evidence is extracted

- **WHEN** the verifier evaluates the rendered sample
- **THEN** it SHALL decode sequentially and accurately rather than relying on keyframe-seeking `-ss` approximation
- **AND** its ordered decoded frame references SHALL cover SOURCE, RETAIN, REFERENCE, Inbox, inspect/review, and ending.

#### Scenario: Normal-speed playback completes

- **WHEN** the 7.5-second sample plays in a native media element
- **THEN** the receipt SHALL record MP4 SHA256, verifier result, monotonic real wall-clock samples, `playbackRate === 1`, and a native `ended` event
- **AND** the resulting Component Conformance receipt SHALL NOT be interpreted as Visual Acceptance.

### Requirement: Archives and frozen baseline remain outside the polish evidence lineage

The polish SHALL preserve historical archive material and the frozen baseline without using either as a current render source, receipt replacement, or approval proxy.

#### Scenario: Preservation boundaries are enforced

- **WHEN** Tasks 1–3 are implemented or verified
- **THEN** `output/sample-approved/` SHALL remain an archive boundary
- **AND** `baseline/optimization-before-final/` SHALL remain frozen
- **AND** neither boundary SHALL be overwritten, deleted, or claimed as the current polish evidence.

#### Scenario: Work outside the polish scope is considered

- **WHEN** an implementer identifies provenance, shared pipeline/catalog, or historical integration work
- **THEN** this change SHALL NOT modify it
- **AND** Task 4 provenance SHALL remain exclusively governed by `fix-motion-web-provenance`
- **AND** the historical/done `integrate-product-animation` change SHALL NOT be reopened.

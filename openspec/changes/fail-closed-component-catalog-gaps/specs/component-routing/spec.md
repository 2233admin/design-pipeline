# Component catalog coverage requirements

## Requirement: zero-result honesty

The pipeline MUST treat a zero-result from the bundled design-system catalog as inconclusive and
MUST provide an actionable next step when neither direct nor capability search has coverage.

### Scenario: vocabulary gap

Given a non-empty brief that decomposes to no governed capabilities and has no direct catalog match,
`design-system decompose` reports `zeroResultInconclusive: true` and explains that bundled catalog
coverage is missing.

## Requirement: complete routing before readiness

The aggregate component-source route MUST remain `blocked` while any requested capability has no
compatible route.

### Scenario: partial coverage

Given a brief with at least one ready route and at least one unavailable capability, the result is
`blocked`, names the unavailable capability, and the public CLI exits with code 2.

### Scenario: empty decomposition

Given a brief with no governed capability decomposition, the result is `blocked` and directs the
caller to expand the vocabulary or provide explicit capabilities before implementation.

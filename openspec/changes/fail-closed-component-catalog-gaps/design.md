# Design: Fail-closed component catalog coverage

## Discovery semantics

`design-system decompose` searches a finite selected catalog. A direct zero-result therefore cannot
prove that no reusable implementation exists. When neither direct search nor decomposed capability
search finds coverage, the inventory adds an actionable `next` message and keeps
`zeroResultInconclusive` true. An empty decomposition is treated as a vocabulary gap.

## Routing precedence

Individual routes continue to be `ready`, `review`, or `blocked`. The aggregate status uses strict
precedence: `blocked` when the brief has no governed capabilities, no selected route, or any blocked
route; otherwise `review` when at least one route needs authority; otherwise `ready`.

Blocked results explain whether the caller must expand/provide capabilities or resolve named
unavailable capabilities through an authorized provider or explicitly approved project-owned
fallback. The pipeline does not install packages or perform external discovery automatically.

## Compatibility

Existing response fields and route entries remain compatible. Unresolved discovery output gains an
optional additive `next` field; no closed JSON schema governs this design-system discovery
inventory. This intentionally changes exit code from 0 to 2 for requests that previously reported
`ready` despite partial coverage.

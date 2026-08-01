## Why

A website-cloning run can currently reach `complete` while the user-designated local template is absent from the manifest, implementation differences are unconstrained, and headless interaction evidence substitutes for a required real-browser replay. That permits structurally divergent pages and stale completion claims to pass schema-valid gates.

## What Changes

- Add a machine-readable implementation-authority contract to website-cloning manifests.
- Require the contract to identify the normative target, enumerate allowed differences and protected invariants, and declare the required interaction environment.
- Extend verification evidence and the evaluator so missing authority, unverified invariants, unapproved differences, or the wrong interaction environment block completion.
- Initialize conservative defaults and document how a user-designated template differs from a content/reference source.
- Preserve regression tests proving that adaptive fidelity cannot bypass these gates.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `design-pipeline`: Website-cloning completion now requires an explicit implementation-authority and live-interaction contract when the run declares those constraints.

## Impact

Affected surfaces include the website-cloning manifest/schema, initializer, evaluator, documentation, OpenSpec contract, and website-cloning regression tests. Existing manifests remain readable, but evaluation blocks until an implementation-authority contract is supplied.

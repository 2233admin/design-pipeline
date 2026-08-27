# Design: Component-First Artifact V2

The repository is a container; `target` is the evaluation identity. Each receipt binds target,
snapshot, policy, input receipt digests, producer metadata, and evidence hashes. Upstream digest
change invalidates every downstream receipt. Prototype readiness requires an explicit selection and
promotion receipt before it can become production readiness.

The planned receipts are `stack-runtime-receipt.v2`, `component-contract-receipt.v2`,
`playground-receipt.v2`, `page-usage-receipt.v2`, `browser-evidence-receipt.v2`, and
`component-first-gate.v2`. Visual comparison, typography, density, spacing, motion, accessibility,
golden screenshots, and human/model approval belong to a separate Visual Acceptance Gate.

The v2 contract is implemented by `skill/scripts/component-first-v2-core.cjs`. Migration consumes a
`component-first-gate.v1` result and requires an explicit `sha256:<digest>` target snapshot. Every
stage receipt carries target identity, snapshot, policy, input, parent receipt hashes, and its own
receipt hash. Selection and promotion receipts are separate, hash-bound artifacts; promotion can
only move a prototype to production after passed component conformance, while visual acceptance is
reported independently and is never inferred.

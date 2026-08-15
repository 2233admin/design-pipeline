# Design: Component-First Artifact V2

The repository is a container; `target` is the evaluation identity. Each receipt binds target,
snapshot, policy, input receipt digests, producer metadata, and evidence hashes. Upstream digest
change invalidates every downstream receipt. Prototype readiness requires an explicit selection and
promotion receipt before it can become production readiness.

The planned receipts are `stack-runtime-receipt.v2`, `component-contract-receipt.v2`,
`playground-receipt.v2`, `page-usage-receipt.v2`, `browser-evidence-receipt.v2`, and
`component-first-gate.v2`. Visual comparison, typography, density, spacing, motion, accessibility,
golden screenshots, and human/model approval belong to a separate Visual Acceptance Gate.

No schema or runtime code is introduced by this planning change.

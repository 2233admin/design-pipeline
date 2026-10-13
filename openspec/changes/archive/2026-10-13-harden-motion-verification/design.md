# Design

Primary scope: deterministic motion evidence tooling on 0.11.0-beta.1.
Project DESIGN.md and MOTION.md remain authoritative; the repository's interface is static.
Stage 0 selected technique/mengto from motion keywords, but this is a validator repair, so no
target animation, catalog adoption, runtime binding, or browser preview is needed.

Extend v1 with optional lifecycle scenarios. Existing callers can keep timing-only receipts;
strict consumers opt into requireLifecycle or --require-lifecycle. Return explicit coverage
so timing validation cannot be confused with lifecycle validation. Lifecycle reports remain
producer assertions referencing captures, not authenticated browser observations.

Require rapid-input, reverse, unmount, and reduced-motion scenarios when lifecycle is supplied.
Only reverse may be not-applicable, with a reason. Resize and route-change are optional checks.
Reject failures, duplicates, unknown fields, missing captures, and incomplete lifecycle sets.
Do not impose a new global timing or frame budget; enforce the producer's declared budget.

# Extend generic animation verification evidence

Add reusable adapter-neutral probes for authored-time animation evidence. The probes cover seek/settle/reset, fixed-step sampling, deterministic replay through a persistable `design-pipeline.animation-input-trace.v1` envelope, interaction oracles, transition safety, reduced-motion fallback, lifecycle cleanup, performance budgets, and native validation of existing receipt references.

The input trace envelope is versioned and carries schema, version, source identity, viewport metadata, ordered events, and strict invariants: monotonic timestamps, non-empty keyboard keys, legal pointer/touch phases, and drag `start` -> `move*` -> `end`; touch replay has focused coverage.

Lineage validation invokes the existing callable receipt/schema/hash validators and blocks incomplete or mismatched native chains; it does not introduce a parallel lineage schema or gate.

Synthetic fixtures are project-owned mechanisms and skins only. No external case names, code, assets, prompts, or branches are included.

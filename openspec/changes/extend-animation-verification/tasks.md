# Generic animation verification tasks

- [x] Add adapter-neutral authored-time seek/settle/reset and 30/60/120 fixed-step probes.
- [x] Add deterministic pointer, wheel, scroll, drag, touch, and keyboard replay with state-transition oracle.
- [x] Implement and validate a versioned input-trace envelope with schema/version, source and viewport metadata, ordered events, strict key/phase/drag/timestamp checks, and touch coverage.
- [x] Add mid-transition, state-exit, reduced-motion with explicit terminal/preference evidence, lifecycle cleanup, declared multi-channel no-teleport, and performance observation checks; delegate budget declaration validation to the core Animation Job `budgets` contract and fail closed on missing or over-budget observations.
- [x] Validate animation lineage through callable existing owner receipt/schema/hash validators; do not create a parallel lineage schema or gate.
- [x] Add project-owned multi-case synthetic mechanism/skin fixtures and focused tests.
- [x] Register focused tests in the declared test manifest.
- [ ] Integrate probe evidence into a target-specific capture adapter; this remains outside the generic helper slice.

# Scene renderer lifecycle factory tasks

- [x] Add a project-owned WebGL/3D scene lifecycle factory that composes `createLifecycleAdapter` and preserves the v1 lifecycle contract.
- [x] Require camera, viewport, DPR, root containment, and explicit renderer resource registry inputs without DOM or runtime renderer dependencies.
- [x] Route authored frames through deterministic update/render callbacks and support resize with an injectable GL-like context.
- [x] Enforce existing structured object, particle, texture, and frame budgets with fail-closed rejection.
- [x] Release registered resources exactly once and expose probe-compatible cleanup status, including blocked cleanup/context-loss/fallback states.
- [x] Add focused lifecycle/job/probe/budget tests and register the test in `scripts/test-manifest.json`.
- [ ] Register a package resource only if the repository QA/package checks require it.

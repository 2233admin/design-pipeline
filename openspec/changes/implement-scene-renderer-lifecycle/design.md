# Scene renderer lifecycle factory design

## Existing authorities

`skill/scripts/motion-foundation-core.cjs` remains the authority for `LIFECYCLE_ADAPTER_SCHEMA`, `createLifecycleAdapter`, `validateLifecycleAdapter`, `createAnimationJob`, and `validatePerformanceBudgets`. The new factory passes the standard lifecycle contract to that factory and exposes the returned contract unchanged to animation jobs.

## Factory inputs

The factory accepts renderer `webgl` or `3d`, an adapter id, a scene contract containing a camera, positive integer viewport, positive DPR, containment root, and resource registry, a core structured `budgets` object, an optional minimal GL-like context, and lifecycle callbacks. The resource registry has explicit arrays for buffers, textures, programs, framebuffers, render loops, observers, and listeners. Optional object/particle entries are counted against their corresponding core budgets.

## Lifecycle and cleanup

The factory delegates all five lifecycle operations through `createLifecycleAdapter`. `update` and `render` receive the authored frame from `createAnimationJob`; no wall-clock or uncontrolled loop is introduced. Resize updates the authored viewport/DPR and calls an injected context viewport operation when available. Dispose invokes each resource releaser at most once, remains idempotent through the existing adapter, and returns `cleanupStatus()` with the existing `initialized`, `disposed`, and `resources[{id,released}]` shape plus a blocked status only when context/fallback/cleanup failure prevents readiness.

## Fail-closed behavior

Resource counts and texture bytes are checked against `validatePerformanceBudgets` output before construction. Optional frame metrics are checked against the same structured frame budget. A lost context, declared fallback, release failure, or budget overrun is blocked or rejected; the factory never provides a ready fallback renderer.

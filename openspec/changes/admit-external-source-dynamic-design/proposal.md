# Admit external sources and govern Dynamic Design

## Goal

Turn the architecture update in AD-18 through AD-21 into an implementable, auditable contract. An external source SHALL remain inert by default, and only an explicitly promoted source MAY become an isolated executable snapshot. Dynamic Design SHALL remain a composition capability rather than a second source, build, runtime, or publishing pipeline.

## Scope

This change specifies the future behavior for:

- promoting an AD-2 `reference-only` external source through an explicit governed decision;
- materializing the promoted source only inside a declared and allowlisted sandboxed deploy profile;
- rejecting arbitrary commands supplied by an untrusted repository;
- consuming a governed live endpoint or built static artifact in Dynamic Design;
- emitting structured motion/interaction composition and evidence references without cloning, building, starting, or publishing;
- preserving source revision/content identity through Capture, Probe/Gate, Package/Publish, and the final artifact;
- reusing the existing execution-target, route, toolchain, and receipt authorities and the existing gate semantics.

## Reference boundary

The reviewed `motion-web` revision remains a reference/parity fixture only. This change SHALL NOT make it a dependency, runtime, namespace, or copied implementation. Its CC BY-NC boundary SHALL remain in force: upstream code, assets, fonts, case names, prompts, CLI, tests, workflow, and one-for-one motifs SHALL NOT be redistributed or copied.

## Non-goals

- The change SHALL NOT alter the existing target runtime, motion implementation, rendered output, or frozen baseline.
- The change SHALL NOT modify the separate `fix-motion-web-provenance` change or its files.
- The change SHALL NOT add a second gate system, replace the existing execution-target/route/toolchain/receipt contracts, or introduce a hosted runtime.
- A non-VCS source SHALL NOT require a Git commit when it is identified by another applicable revision/content identity.

## Evidence expected from implementation

The implementation SHALL provide hermetic coverage for default reference-only admission, governed promotion, sandbox allowlisting, arbitrary-command rejection, Dynamic Design ownership, complete lineage, final publish gating, and the motion-web licensing/reference boundary. OpenSpec validation and the repository QA manifest SHALL remain required release checks.

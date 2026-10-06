# Design

## Existing surfaces

Reuse `findBlender`, film checks, `scripts/qa.cjs`, the current capability/source schemas, catalog
verifiers and source importers. Do not introduce a second runtime resolver or dependency registry.
The source of truth for npm versions becomes the existing workspace manifests and one root lockfile.
The root package is private maintenance tooling; packaged `skill/` remains usable on its own.

## Runtime discovery

Explicit executable configuration has precedence. PATH and platform default locations are automatic
fallbacks; custom portable libraries use the existing `BLENDER_PATH`/`--blender` surface, without
embedding a workstation path in shipped code or scanning whole drives on every invocation.
An existing executable that crashes, reports an invalid version or fails rendering must produce
diagnostic failure, not a successful missing-tool skip. Preserve the minimum supported Blender
version unless real API compatibility requires an explicitly documented change.

## npm and capability maintenance

Use npm workspaces for `tools/browser-automation` and `evals/cases`, exact pins for render-affecting
dependencies, a root-pinned OpenSpec CLI, and one root lockfile. Prefer root npm scripts wrapping existing checks to a new
orchestration framework. Keep installer and downstream project dependencies separate.
CI and release jobs install this lockfile, prepare browser dependencies and run the same root
verification/package commands; they must not bypass workspace installation through the former
direct QA invocation.

Audit primary upstream versions and API changes before changes. Refresh selected maintained guides
and provenance with the behavior actually verified, not a blanket claim that everything is current.
Source snapshots retain their licenses, revisions and hash manifests. Do not run arbitrary upstream
install scripts as a side effect of source inspection or bless modified source by rehashing it.

The follow-up latest-stable request is evaluated against npm's official stable tag and primary
release notes. Already-current versions remain pinned. Optional graphics libraries are recorded
in their existing adapter provenance and guides, then exercised in isolated browser probes; they
do not become unconditional skill dependencies. Original upstream snapshots keep their own pins.

Pixelmatch 8 changes the color-distance metric. Extend the existing comparison v1 report with
the actual package version, metric and options used to compute its values. Preserve existing
screenshots and reports, and require recalibration before comparing scores across metric versions.
Use the current self-test to cover identical images and observable changed pixels; do not add a
parallel report schema or silently loosen a threshold.

## Reference-skill internalization

Use the existing capability guides and source routes as the maintained layer. GSAP already has
local iart playbooks; connect those paths rather than duplicating them. Anime.js needs actionable
v4.5 construction, deterministic seeking and cleanup guidance alongside its capability list.
Review PixiJS skill-source changes separately from the npm runtime version, accepting only
version-verified guidance. Keep raw vendor snapshots immutable and host companions optional.

`companion-skills.md` describes portable roles, not the maintainer's installed folders. Actual
presence and missing markers remain observations from `check-deps.cjs`; do not mark a stale
external skill current merely because a bundled fallback now covers its gap. Extend
`upstream-capability-sync.md` with this review/adaptation step, keeping its existing audit,
feedback and publication contracts. No new registry, gate, global installation or renderer.

Files: the existing routing, companion, PixiJS, iart and synchronization guides and source metadata;
the current OpenSpec change records the work. Verify exact changed examples in a local browser,
run existing source/capability/package checks, and review task scenarios with no companions
available. Preserve technical-versus-visual acceptance and the prior repository changes.

The first follow-up QA exposed component-workbench state-wait failures under the host's default
31 concurrent test files; the same 12 workbench cases pass in isolation. Bound the existing QA
runner to at most four files (or fewer available CPUs) to control real CLI subprocess contention.
Keep the test's eight-second waits, assertions and production timeouts unchanged.

## Verification

Run focused Blender discovery and real headless render tests, workspace install/check commands,
relevant browser/runtime probes, catalog integrity checks and full package QA. Preserve any approved
golden assets; a toolchain bump cannot silently regenerate or approve them. Use local captures for
visual review. Update canonical skill installation only after a recoverable backup and verification.

# Proposal: Internalize Astryx Design System Provider

## Problem

Design Pipeline can validate generic design artifacts, but it has no provider-neutral way to ingest
an externally supplied design-system snapshot, search it as inert catalog data, project its tokens,
or record whether a project should reference, adopt, substitute, or bypass a candidate system.
The existing deferred provider boundary also leaves Agents without a discoverable, safe CLI path.

Treating Astryx as a direct dependency would create the wrong boundary. Its CLI, React/StyleX
compatibility, beta/canary channels, documentation modules, and templates can change independently
of Design Pipeline. Direct installation or module execution would also mix acquisition authority
with design authority.

## Change

- Add strict v1 contracts for supplied snapshots, normalized catalogs, provider profiles and
  receipts, token projections, and runtime decisions.
- Package a pinned, inert Astryx snapshot as candidate evidence without creating a live dependency.
- Add a pure, deterministic catalog normalizer and read-only search surface.
- Add explicit acquisition through either the bundled read-only Astryx translator plus a
  caller-supplied local Astryx CLI path, or a caller-selected local adapter, with bounded commands,
  contained output, and receipt evidence.
- Add loss-aware token projection and explicit `reference`, `adopt`, `substitute`, and `custom`
  runtime decisions.
- Expose the workflow through the Agent-discoverable
  `design-system profiles|normalize|acquire|search|project-tokens|decide` command family.
- Extend `benchmark evaluate` with a backward-compatible v2 fairness contract.
- Document provenance, license, compatibility, canary, security, and authority boundaries.

## Success Criteria

The workflow remains fully usable with a supplied local snapshot and no Astryx installation.
Repeated normalization, search, projection, and decision calls are deterministic. Acquisition runs
only a bundled read-only translator over an explicit local provider CLI, or an explicit local
adapter, and produces attributable receipts. Required benchmark failures and fairness violations
cannot be hidden by aggregate scores.

## Non-goals

- Automatically install Astryx, another provider, or any package.
- Grant ambient network access or fetch a hosted catalog.
- Import or execute provider `.doc.mjs` files inside the Design Pipeline kernel.
- Inject provider guidance into `AGENTS.md` or another global instruction file.
- Replace, mutate, or supersede project `DESIGN.md` or `MOTION.md`.
- Populate or rewrite the existing UI pattern catalog.
- Make Astryx a required runtime, default project choice, or privileged benchmark participant.

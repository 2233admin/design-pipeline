# Proposal

## Why

The installed Blender is missed by a limited executable search, leaving its real render test skipped.
Frontend and animation capabilities also have stale or dispersed runtime/source baselines. The user
requested a unified npm entry so maintaining these capabilities is a normal repository operation.

## What Changes

- Find Blender through explicit configuration, PATH and supported platform defaults; make a missed
  lookup distinct from a detected executable or renderer failure and run the real installed renderer.
- Add a private root npm workspace and shared lockfile for the existing maintained npm packages.
  Expose dependency inspection, repository/browser tests and existing capability/source checks there.
- Refresh actually integrated frontend/animation runtime pins and capability/source baselines from
  primary upstream evidence, with compatibility checks before declaring them supported.
- Preserve skill installation independence and source attribution; update maintainer instructions
  and the canonical installed skill after verification.
- Follow the user's subsequent latest-stable request for GSAP, Anime.js, Three.js, PixiJS, Phaser
  and HyperFrames, including the owned browser-comparison dependency. Verify optional runtime
  versions without installing every library into the packaged skill or downstream projects.
- Follow through on the user's reference-skill question: route reusable methods into the existing
  bundled guides, inspect relevant upstream skill differences, and remove workstation-specific
  installation claims from shipped guidance. Retain optional companion diagnostics and source
  provenance without requiring global skill installation.

## Capabilities

### Modified Capabilities

- `design-pipeline`: runtime discovery, frontend/animation maintenance and repository dependency entry.

## Impact

Root package metadata/lockfile, existing workspace manifests, Blender resolver/template/tests,
frontend/animation guides and registries, selected source snapshots and importers as needed. Existing
public CLI names, v1 receipts, target resolution and evidence lineage remain authoritative.

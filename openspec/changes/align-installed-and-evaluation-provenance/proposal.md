# Align installed and evaluation provenance

## Why

Issue [#76](https://github.com/2233admin/design-pipeline/issues/76) identifies confusion between repository source, selectively synchronized installations, published archives and frozen model experiments. A version label or a successful CLI check does not prove that the same complete tree was installed, evaluated by a model or visually accepted.

## What changes

- Maintain an identity and evidence guide in `docs/installation-and-evaluation-provenance.md`, with immutable source/release identities, installation roles and reachable historical evaluation lineage.
- Make full copied project-scoped installation from the verified publication snapshot the current verification strategy; document the existing packager, installer, `doctor` and `check-deps` commands without replacing the live developer junction.
- Correct the stale golden-case later-round task only from existing render-bound owner approvals.
- Record new integrated-snapshot verification separately from historical experiments. Package/install/CLI evidence for the new integrated commit remains pending until the integration owner performs it.

## Reused contracts and scope

Reuse `scripts/package.cjs`, generated `PACKAGE.json`, `scripts/install-local.cjs`, the package resource manifest, `doctor`, `check-deps` and existing `design-pipeline.golden-case.v1` approval records. No runtime change, new version resolver, receipt schema or parallel gate. Frozen logs, snapshots, model outputs and raw assets remain unchanged. Issues #65 and #71–#75 remain open; this change does not claim model benefits or Visual Acceptance.

## Impact

Owned maintained paths: installation reference, provenance guide, this OpenSpec change and the proved stale golden-case task. Frontend entry guidance and parent-owned changelog/resource registry are updated by their owners. New-commit verification and issue publication/closure belong to the integration owner.

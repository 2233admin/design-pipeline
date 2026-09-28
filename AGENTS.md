<!-- bmad:context -->
<!-- Verified 2026-09-28 against e147fc0. Managed by bmad-project-context; edits inside this block are replaced on refresh. Keep anything you want preserved outside the markers. -->

## design-pipeline

Design-first frontend workflow shipped as a packaged agent skill. Node.js CommonJS with no root `package.json`. Package entry is `skill/SKILL.md`; behavior specs and changes live in `openspec/`.

## Policy

- Change behavior only through an OpenSpec change under `openspec/changes/<change-id>/`; read `openspec/project.md` and that change first.
- Extend existing v1 gates, contracts and receipt schemas; never add a parallel gate, receipt schema, target resolver or policy digest.
- Keep target, snapshot, policy digest and receipt lineage intact; when an upstream receipt changes, recompute or invalidate downstream evidence.
- Report Component Conformance and Visual Acceptance separately; gate results never claim creative or visual acceptance.
- Preserve unrelated working-tree changes; inspect `git status` before editing and never reset or discard work you did not make.

## Where things are

- CLI: `node skill/scripts/designer-pipeline.cjs <command>`; commands are the `COMMANDS` table in `skill/scripts/cli-core.cjs`.
- Release and versioning rules: `CONTRIBUTING.md`.

## Running and verifying

- Verify with `node scripts/qa.cjs`; never bare `node --test`, which discovers nested upstream fixtures.
- Add each new test file to `scripts/test-manifest.json`, or QA never runs it.
- Add each new shipped file under `skill/` to `skill/references/package-resources.json`, or the installed package omits it.
- Film render tests need `ffmpeg` and `ffprobe` on PATH and skip without them.

## Conventions that differ from defaults

- Register every new CLI flag in `KNOWN_OPTIONS` or `BOOLEAN_OPTIONS` in `cli-core.cjs`; unlisted flags fail with `UNKNOWN_OPTION`.
- CLI exit codes: 0 passed, 2 gate failed, 1 contract or usage error.

<!-- /bmad:context -->

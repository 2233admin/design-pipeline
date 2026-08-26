# QA

Verified on 2026-08-13:

- `node --check skill/scripts/direction-preview-core.cjs`
- `node --check skill/scripts/cli-core.cjs`
- JSON parse checks for `skill/references/package-resources.json` and `scripts/test-manifest.json`
- `node skill/scripts/designer-pipeline.cjs direction check --change-root openspec/changes/internalize-cjk-direction-preview --stage selection --json` -> `ready`, waiver `non-visual`
- `node --test tests/direction-preview.test.cjs tests/designer-pipeline-cli.test.cjs` -> 14 passed, 0 failed
- `node scripts/qa.cjs` -> 365 tests passed across 41 files; reproducible tar/zip packages, isolated install, installed-package CLI smoke, and byte-identical repository status passed

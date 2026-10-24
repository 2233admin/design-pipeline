# Tasks

## 1. Change records

- [x] 1.1 proposal.md, design.md (record, digest rules v1, exclusion table) and the `design-pipeline` spec delta; step 1 of #76.
- [x] 1.2 `npm exec -- openspec validate add-install-provenance --strict` and `npm run specs:check`.

## 2. Behaviour

- [x] 2.1 `skill/scripts/install-provenance.cjs` (schema, digest, Git probe, inspection), listed in `package-resources.json` `required`.
- [x] 2.2 `scripts/package.cjs`: provenance fields in the generated `PACKAGE.json`, digest over the archive bytes, refuse names the Skills CLI drops.
- [x] 2.3 `scripts/install-local.cjs`: record or verify provenance in the staged copy; staged doctor accepts a dirty-only block; print `provenance`.
- [x] 2.4 `inspectDoctor` blocks on a mismatch, `dirty: true` or an unreadable record; `doctor-report.cjs` `Source` line, required and recommended provenance items, Git state for a checkout; `install-hints.cjs` `skill` command.

## 3. Docs and tests

- [x] 3.1 `docs/install.md`, `skill/references/installation.md`, `CHANGELOG.md`.
- [x] 3.2 `tests/install-provenance.test.cjs` in `scripts/test-manifest.json`; QA checks the installed package's digest and accepts a dirty-only doctor block, as does `designer-pipeline-cli.test.cjs`.

## 4. Verification

- [x] 4.1 `node --test` on `tests/install-provenance.test.cjs`, `install-local`, `install-doctor`, `designer-pipeline-cli`.
- [x] 4.2 Digest of one installed tree computed twice in Git Bash and once in PowerShell.
- [x] 4.3 Smoke: `install-local.cjs --root <temp>`, then the installed `doctor` from a temporary project.

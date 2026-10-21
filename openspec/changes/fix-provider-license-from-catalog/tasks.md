# Tasks

## 1. Component fit

- [x] 1.1 Resolve each provider's license once per build from the catalog source record with its
  `sourceId` (`providerLicense` in `skill/scripts/component-fit-core.cjs`): verified `license.id`,
  otherwise `provenance.license`; `project-owned` for project-owned providers; `null` without a
  `sourceId` or record; a `component-fit` failure for duplicate source records.
- [x] 1.2 Put unverified and commercial source states through the existing `requiresLicense` review
  rule and record `requiresLicense` on the provider candidate.

## 2. Tests and documents

- [x] 2.1 Replace the assertion in `tests/component-fit-matrix.test.cjs` that pinned React Aria's
  license as `fail`, and add the catalog-license regression: verified providers pass, a changed
  record changes the license and makes `validate-fit --catalog` stale, unverified, commercial and
  unspecific records give `review`, an unindexed `sourceId` fails, duplicate records throw. Both
  fail on the `516cdfb` core and pass after 1.1.
- [x] 2.2 Document the provider license source in `docs/cli-and-reference-providers.md` and add a
  `CHANGELOG.md` entry.

## 3. Verification

- [x] 3.1 Run `node --test tests/component-fit-matrix.test.cjs`.
- [x] 3.2 Run `node scripts/qa.cjs` and `openspec validate fix-provider-license-from-catalog
  --strict` and record them in `verification.md`.
- [x] 3.3 Run `component fit` read-only on the real workbench request
  (`ShinkaEvolve/shinka/research/webui`, change `award-redesign`).

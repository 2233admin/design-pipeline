# Proposal: Fix Provider License From Catalog

## Problem

`component fit` judges every external component provider unlicensed. `providerCandidates()` in
`skill/scripts/component-fit-core.cjs` took a provider's license from `provider.license`, but the
provider registry contract (`PROVIDER_KEYS`) has no `license` field and rejects a provider that
carries one. So for every `project-pinned-adapter` provider in
`skill/references/component-providers.json` (React Aria, Ark UI, Vuetify0) the license was always
`null`, the `license` dimension reported `fail` with `source has no license declaration`, and the
candidate was `blocked`. A real React 19 workbench (`award-redesign`) saw `provider:react-aria`
blocked on all 13 requested capabilities, although the component source catalog records
`adobe/react-spectrum` as verified Apache-2.0.

## Scope

- Resolve a provider's license from the component source catalog: the `recordType: "source"`
  record whose `sourceId` equals the provider's `sourceId`. A verified record supplies
  `license.id`; otherwise its `provenance.license` is used. Project-owned providers keep
  `project-owned`. A provider without `sourceId`, or whose `sourceId` has no source record, keeps no
  license and still fails the `license` dimension.
- Keep the existing review rules: unspecific licenses (`unverified`, `mixed`, `unknown`,
  `unspecified`, `undisclosed`) and `requiresLicense` go to `review`. A source record whose
  `license.state` is `unverified` or `commercial` sets the candidate's `requiresLicense`, as component
  routing already treats those states as review.
- Two source records with the provider's `sourceId` make `component fit` fail rather than pick one.
- The matrix candidate `license` shows the resolved value. `catalogHash` already covers the source
  records, so `component validate-fit --catalog` reports a matrix stale when a provider's catalog
  license changes.
- Out of scope: a `license` field in the provider registry, catalog or registry content changes,
  how decisions rank project-owned against external candidates, the `visualFit` rules, and schema
  or version changes.

## Reuse

- The existing catalog normalisation (`normalizeDesignSystemSnapshot`, `validateCatalog`), which
  keeps `sourceId`, `recordType`, `license` and `provenance` on every entry.
- The existing `license` dimension in `fitDimension` with `UNSPECIFIC_LICENSES` and
  `requiresLicense`, and the existing `catalogHash`/`providerHash` bindings.

## Affected Capabilities

`design-pipeline`: component fit takes provider licenses from the catalog source record named by
the provider's `sourceId`.

## Success Criteria

- `provider:react-aria` resolves `Apache-2.0` with license `pass` against the bundled catalog;
  the regressions in `tests/component-fit-matrix.test.cjs` fail before the change and pass after.
- A provider whose `sourceId` has no source record, or that has no `sourceId`, still fails the
  `license` dimension and is `blocked`.
- Unverified, commercial and unspecific catalog licenses put the provider's `license` dimension in
  `review`; duplicate source records for one `sourceId` fail the build.
- Changing the provider's source record license makes `validate-fit --catalog` report the catalog
  binding stale.
- The read-only `component fit` run on the `award-redesign` request reports `provider:react-aria`
  license `pass`.

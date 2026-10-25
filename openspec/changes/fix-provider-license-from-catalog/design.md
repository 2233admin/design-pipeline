# Design: Fix Provider License From Catalog

## Context

`buildComponentFitMatrix` builds three kinds of candidate per capability: project components,
providers from the governed provider registry, and component records from the normalized component
source catalog. Provider candidates are pseudo-entries scored by the shared `fitDimension`. The
`license` dimension reads `entry.provenance.license`: `review` for `routing.requiresLicense` or an
unspecific value, `fail` when empty, otherwise `pass`.

The provider pseudo-entry took `provenance.license` from `provider.license`, which the registry
contract never allows (`PROVIDER_KEYS` rejects unknown provider fields). Every registry provider
carries a canonical `sourceId`, and the catalog stores one `recordType: "source"` record per
`sourceId` with `provenance.license` and a `license` object (`state`, optional `id`, `evidence`).
`normalizeSnapshot` merges each record's provenance over the snapshot provenance, whose license is
`mixed`, and keeps `sourceId`, `recordType` and `license` on the normalized entry. The CLI passes the
bundled normalized catalog to `component fit` unless `--catalog` or the request supplies one.

`consolidate-component-index-and-web-sources` let providers carry `sourceId` "descriptively without
granting license authority". That still holds for the provider registry: it grants nothing. This
change makes the catalog source record, joined by `sourceId`, the provider's license authority.

## Decisions

1. **The catalog source record is the only license authority for an external provider.**
   `providerLicense(provider, catalog)` returns `project-owned` for a `project-owned` provider. For
   any other provider it finds the catalog entries with `recordType === "source"` and the provider's
   `sourceId`. With none, or without a `sourceId`, the license is `null` and the dimension keeps
   failing with `source has no license declaration`. The registry gains no `license` field.
2. **Verified id first, then provenance.** A record with `license.state === "verified"` and a
   nonempty `license.id` supplies that id (an SPDX id or `LicenseRef-*`); otherwise the record's
   `provenance.license` is used, which may be the inherited `mixed` and then goes to review.
3. **Unverified and commercial states stay in review.** Their `provenance.license` can be a specific
   value such as `LicenseRef-Aceternity`, which the unspecific-license rule alone would pass.
   `component-route-core.cjs` already treats these states as review, so the provider candidate gets
   `requiresLicense: true` and its `license` dimension is computed by the same `fitDimension` with
   `routing.requiresLicense` set. The flag is applied only to that dimension so the pseudo-entry
   `routing` used for visual keyword matching is unchanged.
4. **Ambiguity fails.** Catalog validation does not require unique source `sourceId`s. If two
   source records carry a provider's `sourceId`, `component fit` fails with a `component-fit` error
   naming the provider and `sourceId` instead of choosing one.
5. **Resolve once per build.** Licenses are resolved once per provider in `buildComponentFitMatrix`
   and passed to `providerCandidates`, so the duplicate check runs for every provider whatever
   capabilities are requested.
6. **Matrix contract unchanged.** The candidate keeps its fields; `license` now shows the resolved
   value and `requiresLicense` the source state. `catalogHash` hashes the whole normalized catalog
   and so covers the source records; `component validate-fit --catalog` already reports a stale
   catalog binding when a provider's source record changes. `providerHash` is unchanged because the
   registry is unchanged. Matrices written before this change still validate by self-hash; their
   recorded provider licenses are the old `null` values until they are rebuilt.

## Ownership

| Asset | Change | Verification |
| --- | --- | --- |
| `skill/scripts/component-fit-core.cjs` | `providerLicense`, provider candidate license and `requiresLicense` | `tests/component-fit-matrix.test.cjs`, full QA |
| `tests/component-fit-matrix.test.cjs` | Bug-pinning assertion replaced; catalog-license regression added | Fails before, passes after |
| `docs/cli-and-reference-providers.md`, `CHANGELOG.md` | Provider license source documented | Review |

## Risks

- A caller-supplied `--catalog` without the provider's source record now leaves that provider
  unlicensed (`fail`), as before this change; only the bundled catalog or a catalog that keeps the
  source records resolves provider licenses.
- External providers can now reach `review` or `ready` instead of always `blocked`. Decisions still
  prefer a ready project-owned candidate (`reuse`) before any provider; this change does not alter
  that ranking.

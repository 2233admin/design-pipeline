## Decision and scope

The owner adopted survey Option A: extend `skill/references/component-source-catalog.json`, not a second source table. The brief is `D:/projects/design-pipeline/.design-pipeline/component-survey/BRIEF-implement.md`; the survey is the adjacent `report.md`. Existing v1 gates, receipt lineage, target resolution and policy digests remain authoritative.

## Context

The existing snapshot mixes library sources and individual components, while several registries separately repeat provenance and licensing. MengTo's maintained projection has an obsolete revision and 127-entry assumption. Web build reaches HTML without an explicit owner decision about reusable sources or a usage manifest.

## Alternatives and tradeoffs

| Option | Discovery authority | Migration cost | Drift risk | Decision |
| --- | --- | --- | --- | --- |
| A: extend existing catalog | One existing v1 entry point | Add fields and migrate consumers | Independent inventory tests detect omissions | Adopted by owner |
| B: add a separate source registry | Two cooperating authorities | New joins and resolver conventions | Repeated identity/license facts | Rejected: violates brief |
| Keep current files | Fragmented implicit discovery | None | Known stale projection and omitted sources remain | Rejected: does not meet requested behavior |

## Index contract

Existing IDs and namespace remain. Canonical `sourceId` joins registry facts to source records. `recordType` distinguishes source, component, method and template. `availability` is bundled-implementation, reference-link, metadata-only or project-owned. `localPaths` maps guide, manifest, catalog and implementation pointers relative to the skill package. Provenance records URL, revision and Git tree where observed; content-hash scope is separate. License is `{ state, id?, evidence }`, with disjoint verified, unverified, commercial, project-owned and platform states. Components can share a sourceId; canonical source records cannot duplicate normalized source identity. Film/GEPA discovery must not enter web component ranking.

Source inventories stay in their original bundles and registries. The index points to manifests, without modifying upstream bytes or absorbing provider execution contracts. Repository evidence, not inferred package identity, establishes license state. Commercial and unresolved sources remain reference-only for study/reimplementation.

The implemented snapshot remains `design-pipeline.design-system-snapshot.v1` with namespace `frontend-component-sources`. Existing component identities remain except where public-source evidence resolves an identity conflict; canonical sources can be added without a parallel index. Existing v1 callers may omit new metadata, but supplied metadata is validated. `aliases` is a URL string array; license evidence is a nonempty string array. `licenseScope` records grant boundaries, and `webRanking: false` keeps film/GEPA out of web implementation routes. Route summaries preserve the existing license display string and expose structured metadata separately as `licenseEvidence`.

Commercial/unverified references have no executable adoption metadata in the maintained index. The route projection also suppresses package/install/dependency/source-code fields, including nested component installation details, for those explicit license states; selected and alternative candidates remain review/reference-adaptation. Documentation links remain available for study/reimplementation. Component-fit's existing strict provider contract accepts optional canonical sourceId and preserves it descriptively without granting license authority.

The MengTo projection has 176 methods in nine categories at revision `83a47fee32f0b6349bff1fede99257a5ef03dc93`; the consumer compares source, revision, license, count and complete category memberships against the untouched vendor manifest.

## Workflow contract

All nine web tier/mode stage lists ask `components` immediately before build. The owner can choose existing project components with paths, a named GitHub library, this index, or scratch implementation; project components then index are recommended. Existing `decide` records the reply. `cliCommand()` and `shellPath()` preserve absolute project binding outside the project directory.

Build instructions consume the decision, explicitly name the catalog and provide existing design-system route/search commands. Search/decompose retain their Astryx defaults; the returned unified-source search command therefore passes the absolute index as `--snapshot` under the absolute installed skill root. Before HTML, write `component-manifest.json`; each entry identifies name, sourceId or URL, availability, `license.state` and `usedIn: [{file, marker, how}]`. The existing catalog core owns internal validation and web build calls it. Sources must resolve to indexed identities, decision-named GitHub repositories or contained existing project-owned paths; indexed license states must match. Each usage file exists inside the project and contains its marker. Verified adoption records attribution/license-notice handling; unverified/commercial references permit study/reimplementation only. Explicit `fromScratch: true` allows empty entries for a recorded scratch answer, including Chinese, but not a contradicting library/reuse decision. No gate or receipt is introduced.

UI has no equivalent HTML/build stage: `workflow-core.cjs` uses a generic `work` stage completed by `decisions.delivered` and the existing `deliver --answer <evidence>` contract for arbitrary artifacts. That runtime contract remains unchanged; workflow guides explain why the web manifest rule is not forced onto UI.

## Ownership and affected assets

| Asset | Owner / change | Risk | Verification | Rollback |
| --- | --- | --- | --- | --- |
| Existing catalog, schema/core and registries | SourceIndex: field extension and sourceId migration | Ranking or provenance drift | Targeted regressions and full QA | Revert this commit |
| MengTo projection and consumers | SourceIndex: manifest equivalence | Stale method routing | Mutation/equivalence regression | Revert this commit |
| Independent index completeness test | IndexTests: inventories from other files | Tautological coverage | Failing baseline and passing updated index | Revert this commit |
| Workflow implementation and guides | Workflow: decision and manifest completion | Incorrect order or premature completion | Nine combinations, invalid manifests, outside-cwd CLI smoke | Revert this commit |
| OpenSpec, changelog, external implementation report | Parent: contracts and integration evidence | Claims exceed observed results | Strict validation and exact command outputs | Revert repository docs; replace external report |

## Non-goals and consequences

No vendor refresh, new source format, execution permission, automatic dependency installation, new gate, schema generation, resolver or policy digest. License discovery may remain unresolved; the report must name those sources for the owner's decision rather than invent a grant. Build completion becomes stricter; existing HTML without a manifest now returns build work. Technical QA never certifies creative quality or visual acceptance.

## Acceptance

Each brief item has an owner above. Tests must show failing-before/passing-after results; complete QA uses `FONTTOOLS_PYTHON=D:/Temp/dp-fonttools-venv/Scripts/python.exe npm test`, plus `npm run specs:check` and strict change validation. The parent commits only verified changes, does not push, and writes the requested external report with commit SHA and unresolved licenses.

## Round 2 decisions and ownership

The follow-up brief is `BRIEF-implement-round2.md` beside the original survey. The user's 2026-10-12 decision leaves every unverified/commercial source reference-only: study and reimplement, never copy; no paid entitlement is assumed. GSAP is usable under its actual Standard No Charge License, including the competing no-code animation-tool restriction, not MIT. Motion and anime.js require observed GitHub license evidence and npm/ESM discovery metadata. Public React Bits identity replaces a commercial identity only when source evidence proves it.

LicenseDiscovery owns source facts and web route/search exclusions (items 1 and 4). Manifest owns the existing catalog-core validator, web completion, usage docs and regressions (item 2). GateProjection owns shared saved-command projection (item 3). Parent owns integration records and final verification. Shared catalog-core edits stay within validator/export versus ranking sections.

Saved gate command projection is presentation-only: the same existing absolute command conventions project findings.fix and next without rewriting saved state. Contract regressions do not require ffmpeg. Route/search checks distinguish web reusable libraries/components from film, optimization methods and templates.

The final catalog contains 72 canonical sources and 20 component records. Motion and anime.js have observed MIT license blobs; GSAP retains its custom license. Depth Carousel's live registry and component bytes match public React Bits at revision `496968c4117e21278f13917201b7d615bc5e7450`, so the identity is cleanly migrated to `reactbits/depth-carousel` under MIT + Commons Clause, not plain MIT. No Pro compatibility alias remains.

Observed search leakage required a fix: `--platform web` now defaults to the unified source index and filters platform-reusable component records. Explicit index searches use the same eligibility rule. Searches without a platform retain the existing Astryx default. Existing route typed filtering already excluded methods/templates and was preserved.

Frozen-tree verification follows the repository contribution rules: complete code, tests and source docs before staging the tree; retain exact focused red/green outputs and CLI smokes, then full QA and strict specs validation. Post-run verification-record changes are identified as evidence-only, not untested implementation changes. Component Conformance and Visual Acceptance remain distinct; this maintenance work does not certify a rendered UI.

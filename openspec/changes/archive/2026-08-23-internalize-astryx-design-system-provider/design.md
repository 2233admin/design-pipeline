# Design: Internalize Astryx Design System Provider

Project foundation: `../../../../DESIGN.md`

Foundation SHA-256: `1126499915fb720ce0943afcba8b9327885c11a6ccc63160db96cd801a8cf88e`

## Decision

Internalize a provider-neutral design-system evidence pipeline and ship Astryx only as a built-in
candidate profile. The normalizer, search, token projection, decision engine, and benchmark gates
remain deterministic local kernels. Provider acquisition is a separate, explicitly authorized
adapter boundary.

The project foundations remain unchanged:

- root `DESIGN.md` owns reusable product visual, layout, typography, color, component, and
  accessibility decisions;
- root `MOTION.md` owns reusable motion semantics or the explicit static posture;
- provider catalogs contribute attributed evidence and candidates only.

## Goals

- Make a supplied snapshot sufficient for the complete local catalog workflow.
- Make local Astryx CLI acquisition explicit, contained, versioned, and attributable.
- Preserve projection loss and runtime incompatibility instead of guessing through them.
- Give Agents one discoverable command family and stable JSON results.
- Compare candidates fairly without giving a bundled profile privileged scoring.

## Non-goals

- Installing Astryx or resolving an ambient `node_modules` package on the user's behalf.
- Browsing, downloading, or updating remote provider content.
- Running provider `.doc.mjs`, template, hook, codemod, swizzle, init, upgrade, or theme-build code in
  the kernel.
- Editing `AGENTS.md`, `DESIGN.md`, `MOTION.md`, or the UI pattern catalog.
- Rendering provider documentation or adding a product UI.
- Treating Astryx compatibility metadata as proof that adoption is correct for a project.

## Artifact Flow

```text
supplied snapshot ------------------------------+
                                                  |
reviewed local adapter -> provider receipt -> snapshot
                                                  |
                                      pure normalization
                                                  |
                                      normalized catalog
                                      /       |        \
                                  search   project    runtime
                                           tokens     decision
                                              \       /
                                          benchmark v2
```

Acquisition is optional. Every downstream operation accepts local artifacts, so a missing Astryx
installation or unavailable provider never blocks requirements-only or project-owned work. The
bundled adapter is only a translator; it does not bundle or install the Astryx CLI.

## Contracts

| Artifact | Schema | Purpose |
| --- | --- | --- |
| Supplied or acquired snapshot | `design-pipeline.design-system-snapshot.v1` | Inert components, docs, templates, hooks, namespace, and provenance |
| Normalized catalog | `design-pipeline.design-system-catalog.v1` | Stable IDs, kind, searchable fields, provenance, and content hashes |
| Provider profile registry | `design-pipeline.design-system-provider-profiles.v1` | Candidate identity, official sources, license, compatibility, API versions, and canary policy |
| Provider receipt | `design-pipeline.design-system-provider-receipt.v1` | Adapter commands, version, hashes, loss, status, and failures |
| Token projection | `design-pipeline.design-system-token-projection.v1` | Design tokens plus explicit review or blocking loss |
| Runtime decision | `design-pipeline.design-system-decision.v1` | Selected mode, candidate, rejections, rationale, and evidence |
| Benchmark manifest/result | `design-pipeline.benchmark-manifest.v2` / `design-pipeline.benchmark-result.v2` | Fair candidate/scenario comparison with v1 compatibility |

Unknown schema versions and unknown fields fail closed. Artifacts use canonical JSON and content
hashes where identity or provenance must survive handoff.

## Pure Catalog Kernel

`design-system normalize` validates JSON-only values, contained relative paths, provenance, unique
namespaced IDs, and supported collections. It does not install packages, execute entry content,
contact a network, read provider modules, or mutate the source snapshot.

Normalization produces deterministic entry ordering and hashes. `design-system search` is a
read-only filter over that catalog by query, kind, category, and status. Search does not re-rank
Astryx above another namespace and does not copy entries into the UI pattern catalog.

## Local Provider Acquisition

`design-system acquire` requires a provider profile (default `astryx`), a supported
`--api-version`, and a contained `--output-root`. The default Astryx route uses the bundled
read-only translator and requires `--provider-cli-path` to identify an already-installed,
root-contained Astryx CLI. A custom route uses an explicit `--adapter-path` inside the working root.
The kernel invokes the selected adapter without a shell, with a bounded timeout and output size,
and strips proxy, credential, token, password, secret, authorization, and API-key environment
variables.

The bundled Astryx translator converts only the read-only acquisition types `manifest`,
`component`, `docs`, `template`, and `hook` from the local CLI into the provider envelope. A custom
adapter has the same allowlist. The kernel rejects install, init, swizzle, upgrade, codemod,
theme-build, instruction injection, and other commands. Adapter stdout must be one version-matched
JSON envelope; the kernel validates provider identity and license before publishing the snapshot
and receipt.

The adapter is executable trusted code. The kernel's bounded environment is not an operating-system
network sandbox, so callers that require offline proof must run the command in an offline or
sandboxed host. Design Pipeline itself never downloads or installs Astryx.

Astryx `.doc.mjs` files remain inert from the kernel's perspective. A reviewed adapter may use the
installed Astryx CLI's documented JSON output or a pre-exported local snapshot; it must not ask the
kernel to import documentation modules.

## Astryx Profile

The built-in `astryx` profile records the official site and repository, MIT license, provider API
version, React/React DOM/StyleX compatibility, and deny-by-default canary policy. This metadata makes
the candidate discoverable and auditable. It does not prove local installation, admission,
compatibility with the current project, or permission to adopt.

The packaged pinned Astryx snapshot is also inert data. It supports default local search,
projection, and reference decisions at the reviewed revision, but it is not refreshed at runtime and
does not claim to describe a user's installed version. The profile and snapshot are maintained as
data. Adding another provider requires compatible profile/snapshot and adapter contracts, not a
branch in the catalog kernel.

## Token Projection And Loss

`design-system project-tokens` maps provider token names and values into the existing
`design-pipeline.design-tokens.v1` contract. Source names, semantic roles, modes, license, and source
hash remain attributable.

Projection never fabricates semantic certainty:

- unresolved token type or role produces a `review` loss;
- normalized path collision or an unsafe/invalid value produces a blocking loss;
- light/dark or other representable modes remain explicit extensions;
- a projection is `ready` only when the emitted token artifact passes the existing token validator
  and no unresolved loss remains.

## Runtime Decision

`design-system decide` records one explicit mode:

| Mode | Meaning | Readiness rule |
| --- | --- | --- |
| `reference` | Use provider evidence without making it the implementation runtime | May inspect otherwise incompatible candidates; canary still requires explicit allowance |
| `adopt` | Use the selected provider runtime/components | Requires project runtime compatibility and admissible intake evidence |
| `substitute` | Use a compatible alternative while preserving mapped intent | Requires an eligible substitute and records rejected candidates |
| `custom` | Keep the runtime/project system custom | Selects a project-owned system without provider dependency |

An existing project design system or validated `DESIGN.md` remains the governing project authority.
`reference` may select provider evidence alongside it; `adopt` or `substitute` may select a
candidate only through the explicit requested mode and its compatibility/intake gates. Canary
entries are rejected unless `--allow-canary` is explicit. A decision with no eligible candidate is
`blocked`; it does not silently fall back to Astryx.

## Agent-Discoverable CLI

The public help surface lists:

```text
design-system profiles
design-system normalize
design-system acquire
design-system search
design-system project-tokens
design-system decide
```

All commands use the existing `design-pipeline.cli-result.v1` envelope and stable exit semantics.
`profiles` and search are read-only. Normalize, token projection, and decision commands return their
artifact without writing unless `--write` is explicit. Acquisition writes only below the explicit
`--output-root` after containment checks.

## Fair Benchmark v2

`benchmark evaluate` remains the entry point and continues to accept v1 manifests and
measurements. A v2 manifest is valid only when it records all six fairness conditions as true:

- same prompts;
- same environment class;
- evaluator blind to candidate identity;
- expected answers hidden from candidates;
- fresh context for each run;
- representative delivery conditions.

The same required scenarios, thresholds, evidence rules, and evaluator apply to Astryx, another
provider, substitute, and custom candidates. Missing evidence remains `unknown` and blocking.
Required failures decide the gate independently of aggregates. The result preserves fairness
validation and invalid reasons; an invalid fairness declaration cannot produce a passing result.
Canary results remain separate from stable results unless the caller explicitly admits canary.

## License And Attribution

Each snapshot and normalized entry carries source and license provenance; URLs and attribution are
retained when supplied. Provider receipts bind the selected profile, reported provider version,
license, commands, and content hashes.

Astryx is attributed to its official project and repository and recorded as MIT-licensed. The
profile is a reviewed metadata assertion, not a license grant for arbitrary third-party integrations
or user-supplied content. An entry whose license is absent, conflicts with the profile, or cannot be
verified is not eligible for adoption.

## Security Boundaries

- All input and output paths remain within explicit roots after link resolution.
- Snapshot values are JSON data; functions, cycles, prototype-pollution keys, absolute paths, and
  parent traversal are rejected.
- No command treats ambient credentials, package-manager state, or network availability as
  authority.
- Default Astryx acquisition uses only the bundled translator plus an explicit contained local CLI
  path; custom acquisition uses an explicit local adapter. Arbitrary ambient executables are not
  discovered.
- Unknown provider commands, API versions, schemas, statuses, and canary states fail closed.
- Writes are explicit, contained, atomic, and do not replace validated foundations.
- Receipts record failure without publishing a partial successful snapshot.

## Alternatives Considered

| Option | Complexity | Safety | Offline path | Replaceability | Decision |
| --- | --- | --- | --- | --- | --- |
| Auto-install and invoke Astryx | Low initial | Poor | Poor | Poor | Rejected |
| Vendor the Astryx executable/runtime package | High | Poor | Good | Poor; couples releases | Rejected |
| Package a pinned inert Astryx snapshot | Low | Strong | Strong | Reviewable revision updates | Selected as candidate evidence |
| Pure supplied snapshots only | Low | Strong | Strong | Strong | Insufficient for explicit local acquisition |
| Provider-neutral core plus local adapter | Medium | Strong with documented trust boundary | Strong | Strong | Selected |

## Consequences

- Users who want live local acquisition must provide and trust an adapter; this is deliberate.
- Provider-specific executable behavior remains outside the stable kernel.
- Token and runtime decisions may stop at `review` or `blocked` rather than produce a convenient but
  unsupported answer.
- New providers can reuse the catalog and decision contracts without changing project foundations.

## Touched Assets

| Asset | Relation and change | Risk | Verification | Rollback |
| --- | --- | --- | --- | --- |
| `skill/scripts/design-system-*.cjs` | Pure catalog, provider, projection, and decision kernels | Contract drift or unsafe execution | Focused Node tests plus installed CLI smoke | Revert kernels and command routing together |
| `skill/scripts/cli-core.cjs` | Public `design-system` command family | Undiscoverable or inconsistent flags | Help/JSON/exit-code tests | Remove command routes and help entries |
| `skill/references/design-system-*.json` | Strict schemas and Astryx profile | False compatibility or provenance claim | Schema fixtures and profile assertions | Revert profile/schema revision |
| `skill/scripts/benchmark-core.cjs` and benchmark schemas | v1-compatible fairness v2 | Misleading comparison or v1 regression | v1/v2 focused tests | Retain v1 evaluator and remove v2 admission |
| `docs/astryx-design-system-provider.md` | User preparation and safety guide | Users over-trust adapter isolation | Command smoke and documentation review | Remove guide with feature |

## Open Items

- Implementation and QA evidence remain pending in `tasks.md` and `qa.md`.
- Any future provider API or compatibility update requires a reviewed profile diff and matching
  regression evidence; it must not be inferred at runtime.

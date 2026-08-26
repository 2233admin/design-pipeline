---
reviewer: BMAD Architecture rubric walker
target: ../ARCHITECTURE-SPINE.md
intent: Validate
updated: 2026-08-23
verdict: needs-revision
---

# Architecture Spine Rubric Review

## Verdict

**NEEDS REVISION BEFORE HANDOFF.**

The spine has the right central shape: local Skill + CLI + filesystem, inert external content, explicit governance, one primary route, hash/owner-bound handoff, and context that cannot weaken the Methodology Kernel. It covers the PRD's main journeys and all FR/SM identifiers are referenced.

It is not yet a fully executable feature-altitude contract. Four high-severity gaps remain: the discovery/security rules exceed the current DesignMD implementation, FR-6 capability probing is only bundled into a generic intake row, FR-7 normalization has no canonical contract or decision semantics, and the operational envelope is silent. The spine should not be handed to story implementation until these boundaries are either made explicit in the spine or deliberately handed to named downstream specs.

## Mechanical gate

`lint_spine.py --workspace architecture-design-pipeline-2026-08-23` passed with `0` findings.

- No placeholders or unresolved template tokens.
- AD-1 through AD-13 are unique and monotonic.
- Every AD has `Binds`, `Prevents`, and `Rule`.
- Stack rows have versions or explicit support floors.

This only establishes mechanical integrity; the findings below are semantic and brownfield findings.

## PRD capability coverage

| PRD area | Result | Evidence | Assessment |
| --- | --- | --- | --- |
| UJ-1 / FR-1 / FR-2 | Covered with implementation mismatch | Spine map §Capability → Architecture Map; AD-2–AD-4. Current sync seeds hubs plus sitemap/llms and uses bounded fetch in `skill/scripts/designmd-core.cjs:181-213`. | The pipeline shape is correct, but robots enforcement, status vocabulary, and exact limits are not yet aligned with the written rule. |
| FR-3 / FR-4 | Partially covered | AD-2, AD-5, AD-8; `designmd-core.cjs:103-123` records a heuristic license string and hard-codes `reference-only`. | Provenance/hash is clear. License/security admission states and inspect/route blocker semantics are not defined as a DesignMD contract. |
| UJ-2 / FR-5 | Boundary covered; implementation deferred | AD-6; Deferred items at spine lines 200-201; `adapter-core.cjs:89-109` validates a receipt. | The receipt boundary is useful, but the actual importer and its CLI intake boundary do not exist in the current brownfield. |
| FR-6 | **Under-specified** | The map bundles FR-5 and FR-6 into one “design-tool intake” row at spine line 192. | There is no explicit read-only capability-probe contract: provider availability, host dependency, version evidence, and fallback behavior are not tied to an AD or artifact. |
| FR-7 | **Under-specified** | Spine line 193 names “normalized artifact and receipt contracts” but does not define the artifact or decision vocabulary. | The PRD requires reference/adopt/substitute/custom decisions, deterministic normalization, and preserved uncertainty; the spine does not make those executable. |
| UJ-3 / FR-8 | Covered | AD-7–AD-10; `frontend-stack-core.cjs:94-120,148-176`; `toolchain-core.cjs:175-217`. | Primary route, specificity, blocked propagation, context, source hashes, and toolchain plan are coherent with the brownfield. |
| FR-9 / FR-10 | Partially covered | AD-4 and AD-12; `designmd-core.cjs:216-278` provides atomic publish, recovery preservation, and persisted-content validation. | Recovery is covered. Change/disappearance detection and a verify error taxonomy are not explicitly owned by the spine. |
| SM-1–SM-5 | Referenced, but SM-4 is not executable yet | Spine line 196 maps all five metrics; Deferred line 201 admits no complete Figma/Penpot importer. | The measurement map exists, but the Figma/Penpot/local-export paths required by SM-4 still need a concrete downstream contract and fixtures. |
| NFRs / non-goals | Mostly covered | AD-1, AD-2, AD-5, AD-8, AD-12; Stack and Consistency Conventions. | MCP, remote writeback, remote execution, path containment, deterministic JSON, hashes, and local-only runtime are clear. Operational/environmental behavior is missing; see H-04. |

## AD executability and brownfield fit

| AD | Verdict | Evidence and judgment |
| --- | --- | --- |
| AD-1 | Pass | The local runtime boundary is explicit and matches the PRD and current Skill + CLI surface. |
| AD-2 | Pass with contract gap | The inert/reference-only rule is enforceable. The current DesignMD entry shape has `license`, `status`, content, and hash at `designmd-core.cjs:103-123`, but it lacks a structured admission state and explicit provenance/revision fields. |
| AD-3 | **Fail: brownfield mismatch** | The rule requires `robots.txt`, size limits, and blocked/partial reporting. Current sync has page/concurrency/timeout/retry behavior at `designmd-core.cjs:165-185`, but no robots check, no explicit maximum content-byte policy, and the CLI emits only `complete` or `blocked` at `designmd-sync.cjs:17-21`. |
| AD-4 | Pass | Atomic temporary publish and last-known-good preservation are implemented at `designmd-core.cjs:216-260`; the rule matches the implementation. |
| AD-5 | **Fail: security mismatch** | The rule promises symlink escape rejection. `readPersistedCatalog` only checks lexical relative containment at `designmd-core.cjs:263-278`; it does not resolve and reject a symlinked content file/directory. Other receipt validation has stronger symlink checks, but that does not cover the DesignMD reader. |
| AD-6 | Partial | Receipt validation is concrete at `adapter-core.cjs:89-109`, including provider availability, source SHA-256, mappings, editable, and evidence. The claimed Figma JSON/SVG/PNG/tokens intake path is not implemented; no importer/normalizer or probe-to-receipt transition is named. |
| AD-7 | Pass | Current routing ranks explicit capability/keyword matches ahead of generic routes and emits one `primaryRoute` at `frontend-stack-core.cjs:94-120`; toolchain records `primaryRouteId` at `toolchain-core.cjs:185-217`. |
| AD-8 | Pass | Current frontend routing blocks a non-ready/licensed primary at `frontend-stack-core.cjs:149-158`; toolchain creates governed-review probes/invocations instead of silently making them ready at `toolchain-core.cjs:100-148,231-246`. |
| AD-9 | Pass | Plan and receipt validation bind plan SHA-256 and artifact hashes; the toolchain receipt checks plan hash and evidence paths at `toolchain-core.cjs:269-307`. Owner binding is represented in invocation stages, but should be made an explicit receipt field downstream. |
| AD-10 | Pass with product-surface deferral | `resolvePolicy` applies defaults → user → project → task while preserving constraints/gates and rejecting executable/sensitive guidance at `adaptation-core.cjs:696-721`. Persistent onboarding/inspect/edit/forget flows are explicitly deferred. |
| AD-11 | Pass | Ownership boundaries are clear enough to prevent hidden cross-layer mutation; the adaptation ledger already has append-only event handling. |
| AD-12 | Partial | Canonical JSON, SHA-256, and observable failures are present. The written “one-to-one” status/exit-code rule is not a current global CLI contract; existing commands use several status families and DesignMD sync uses `complete`, `blocked`, and process code `2`. |
| AD-13 | Pass at architecture level | The declared dependency direction matches the observed module flow: routing feeds toolchain; execution does not discover or mutate sources. |

## Findings

### H-01 — AD-3 is not executable against the current DesignMD sync implementation

**Severity:** high  
**Category:** brownfield mismatch / reliability / external-input policy  
**Evidence:** AD-3 at spine lines 53-57 requires robots compliance, bounded page/concurrency/timeout/size limits, canonical deduplication, and blocked/partial outcomes. `designmd-core.cjs:165-185` implements timeout/retry/page/concurrency bounds, and `:181-213` performs discovery, but there is no robots policy or maximum content-byte check. `designmd-sync.cjs:17-21` returns only `complete` or `blocked`.

**Why it matters:** The architecture promises a safety and completeness boundary that the current sync path cannot enforce or report. Two implementers can also choose different defaults for content size and partial status.

**Recommended disposition:** **Autofix in the architecture/spec boundary, then implement.** Pin the default page count, concurrency, timeout, retry count, and maximum single-resource bytes; define robots-unavailable behavior; define `complete`, `partial`, `blocked`, and `recovered` transitions and exit codes. If robots is intentionally deferred, move it out of AD-3 and explicitly mark the resulting risk rather than leaving an adopted rule unsupported.

### H-02 — AD-5 claims symlink protection that `designmd-core.cjs` does not provide

**Severity:** high  
**Category:** security / brownfield mismatch  
**Evidence:** AD-5 at spine lines 65-69 says every persisted path is verified against traversal and symlink escape. `readPersistedCatalog` checks only `path.isAbsolute`, `path.relative`, and then reads the target at `designmd-core.cjs:263-278`; it does not `realpath` the target or reject a symlink.

**Why it matters:** A catalog content path can be lexically inside the catalog root while resolving outside it. The invariant is correct, but the current implementation does not satisfy it.

**Recommended disposition:** **Autofix in the shared path guard and add a hermetic symlink regression test.** Reuse the existing stronger `realpath`/`lstat` pattern in toolchain receipt validation. Do not weaken AD-5 or defer this security boundary.

### H-03 — FR-7 normalization is named but not contractually decided

**Severity:** high  
**Category:** capability coverage / downstream divergence  
**Evidence:** PRD FR-7 requires deterministic normalization into design knowledge plus explicit `reference`, `adopt`, `substitute`, or `custom` decisions and preserved uncertainty. The spine map at line 193 reduces this to “normalized artifact and receipt contracts”; no AD defines canonical artifact fields, decision ownership, uncertainty representation, or how a normalized artifact enters routing.

**Why it matters:** This is the seam where DesignMD resources, Figma/Penpot exports, web extraction, DESIGN.md, tokens, UI IR, and route inputs meet. Without a contract, the next stories can produce incompatible representations while all claiming to satisfy FR-7.

**Recommended disposition:** **Autofix or hand off explicitly to bmad-spec.** Decide the provider-neutral normalized artifact envelope, source/evidence links, confidence/unknown semantics, and the decision enum with its admission effect. Exact Figma/Penpot field mappings may remain deferred; the envelope and decision semantics cannot.

### H-04 — The operational/environmental envelope is silent

**Severity:** high  
**Category:** good-spine checklist / operations  
**Evidence:** AD-1 and Stack define local runtime and package versions, but there is no decision for network-unavailable operation, robots cache/freshness, filesystem retention/cleanup, lock/concurrency behavior for sync, log/error retention, or how a packaged install discovers project roots. The Deferred list does not own these dimensions.

**Why it matters:** The reviewer-gate checklist explicitly requires deployment and environments, provider strategy, and operations to be decided, deferred, or open. A local-first product still has an operational envelope; otherwise recovery and reproducibility differ by machine.

**Recommended disposition:** **Autofix in the architecture or name a downstream spec owner.** Keep it small: define supported OS/runtime, online/offline behavior, one sync writer/lock policy, snapshot retention, output-root ownership, and log/receipt retention. Do not add a service or daemon for v1.

### M-01 — FR-6 capability probing is hidden inside the FR-5 row

**Severity:** medium  
**Category:** capability coverage  
**Evidence:** The map at spine line 192 groups FR-5 and FR-6 under “design-tool intake”. The PRD FR-6 requires read-only probing, provider version/source/capability evidence, host-dependent status, and a fallback path. AD-6 governs receipts but not the probe lifecycle or how probe results gate import.

**Recommended disposition:** **Autofix or defer explicitly.** Add a small probe contract (provider, version, availability, capability set, credentials-required flag, fallback, evidence) and bind it to AD-6/AD-8, or state that the adapter registry lifecycle probe is the authoritative implementation and reference it directly.

### M-02 — FR-9 has recovery but no change/disappearance lifecycle

**Severity:** medium  
**Category:** capability coverage / state ownership  
**Evidence:** AD-4 covers atomic replacement and preservation of a valid snapshot. The PRD FR-9 additionally requires identifying added, changed, disappeared, and failed entries, and stale entries must not retain `ready`. Neither the map nor Deferred defines a diff, tombstone, stale, or removal policy.

**Recommended disposition:** **Autofix or defer to bmad-spec with an owner.** Decide whether the catalog carries `added/changed/disappeared/failed` in a sync receipt, whether disappeared entries remain referenceable as stale/tombstoned, and which state prevents routing.

### M-03 — Admission semantics are too weak for the PRD's license/security gates

**Severity:** medium  
**Category:** brownfield fit / governance  
**Evidence:** The spine requires license/status/provenance and route gates through AD-2/AD-8. Current DesignMD extraction returns a heuristic license string and fixed `reference-only` status at `designmd-core.cjs:98-123`; structured license/security intake exists separately in `adapter-core.cjs:112-152` but is not connected to DesignMD entries.

**Recommended disposition:** **Defer with an explicit contract owner or fix the boundary.** Define the minimum catalog admission states and the handoff from catalog inspection to route blocking. Keep the default `reference-only`; do not pretend heuristic license extraction is verification.

### M-04 — AD-6's “first adapter path” is ahead of the brownfield

**Severity:** medium  
**Category:** scope honesty / implementation boundary  
**Evidence:** The spine names Figma JSON/SVG/PNG/tokens as the first path at lines 71-75, while the current public CLI exposes adapter audit/intake/receipt-check rather than an import command (`skill/scripts/cli-core.cjs:281-288,883-884`). `adapter-core.cjs:89-109` only validates a prebuilt receipt.

**Recommended disposition:** **Defer explicitly to a named importer story.** Keep the receipt boundary, but state the v1 command/input/output and the minimum fixture for the first local format. Treat Penpot as contract compatibility until its fixture passes.

### M-05 — AD-12's status and exit-code convention is not reconciled with the existing CLI

**Severity:** medium  
**Category:** brownfield consistency  
**Evidence:** The spine consistency table lists `ready`, `review`, `blocked`, `invalid`, `partial`, `recovered`, and `fidelity-mismatch` and requires one-to-one exit mapping. Existing modules expose additional domain statuses, while DesignMD sync emits `complete`/`blocked` and exit code `2` (`designmd-sync.cjs:19-21`).

**Recommended disposition:** **Autofix in the downstream contract.** Separate public process exit classes from domain status values, or define a canonical envelope mapping table. Do not force every existing domain status into one global one-to-one mapping without checking compatibility.

### M-06 — Generic Resource Source extension and snapshot retention are not decided

**Severity:** medium  
**Category:** missing dimension / downstream divergence  
**Evidence:** The PRD says v1 abstracts a Resource Source interface while first connecting one real source. The spine only names DesignMD pages in the paradigm/seed and does not define source adapter identity, source-specific discovery, revision, retention, or snapshot eviction. Deferred only covers external DesignMD tool links and remote cache/ETag optimization.

**Recommended disposition:** **Defer explicitly.** Keep DesignMD as the only v1 implementation, but specify the minimum source-port contract and state that retention/eviction is local/manual until a second source exists.

## Deferred audit

The Deferred section is directionally honest and correctly keeps exact Figma/Penpot mappings, the complete importer, persistent profile UX, external tool records, and cache/observability out of the spine's current implementation claim. It does not, however, cover every dimension the feature-altitude spine owns:

1. **Missing operational envelope:** network/offline, locks, retention, logging, and environment behavior are neither decided nor deferred (H-04).
2. **Missing normalization envelope:** exact vendor mappings may be deferred, but the provider-neutral artifact and decision semantics cannot be left open (H-03).
3. **Missing source lifecycle:** generic source-port identity, revision, disappearance/stale state, and retention are not owned (M-02/M-06).
4. **Missing status compatibility:** the relationship between domain statuses and CLI exit classes is not decided (M-05).
5. **Missing probe boundary:** FR-6 is not separately decided or deferred (M-01).

The existing deferred items themselves do not appear to create an immediate two-unit divergence if the next BMAD step assigns each to a named spec/story owner. The importer and user-profile deferrals are acceptable only if their current boundaries remain inert and cannot claim `ready` without the missing evidence.

## Brownfield conclusion

The spine **ratifies the existing routing/toolchain/adaptation architecture** well:

- explicit capability/keyword routes outrank generic routes;
- one primary route is carried into the toolchain plan;
- review/blocked routes cannot silently become executable;
- hashes and receipts bind plan/evidence state;
- task/project/user/default context is resolved without overriding constraints and gates;
- MCP is not introduced as a hidden runtime dependency.

It **overstates the current DesignMD and design-tool implementation** in four places: robots/size policy, symlink protection, Figma/Penpot intake, and normalized-artifact semantics. Those are fixable boundary gaps, not a reason to redesign the product around MCP or a hosted service.

## Recommended next action

Run `bmad-spec` against this review and make it close H-01 through H-04 before epics/stories. M-01 through M-06 can be closed in the same spec if they affect the first implementation slice; otherwise each must appear as an owned deferred/open item with an acceptance boundary.

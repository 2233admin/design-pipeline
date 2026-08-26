---
reviewer: adversarial-incompatibility
target: ARCHITECTURE-SPINE.md
date: 2026-08-23
verdict: reject-handoff
scope: brownfield compatibility, routing handoff, state integrity, path and data safety, implementation truthfulness
---

# Adversarial Incompatibility Review

## Verdict

**REJECT HANDOFF for now.** The spine has the right high-level direction, but several adopted rules are stronger than the current implementation. The most serious gaps are an unconstrained DesignMD fetch boundary, an unenforced design-tool artifact boundary, a `ready` route with no executable lifecycle, and an in-scope Figma/Penpot import capability that does not exist yet.

The review is intentionally non-mutating. `ARCHITECTURE-SPINE.md` was not changed.

## Critical findings

### C-01 — DesignMD sync can leak credentials or reach unintended network targets

- **Severity:** Critical
- **Affected rules:** AD-1, AD-2, AD-3, AD-12; PRD 7.1 and FR-1/FR-2.
- **Evidence:** `skill/scripts/designmd-sync.cjs:14-17` accepts an arbitrary `--url` and passes it to `syncDesignMd`. `skill/scripts/designmd-core.cjs:22-31` preserves query strings and user-controlled URLs. `skill/scripts/designmd-core.cjs:165-178` calls `fetch()` without rejecting private/link-local hosts, stripping credentials or sensitive query parameters, or validating redirects. The persisted catalog stores `catalog.source` and each entry's `url` at `skill/scripts/designmd-core.cjs:111-123`.
- **Reproduction:** A controlled fetcher produced `catalog.source = https://designmd.test/?token=secret`; the token is retained in the catalog source.
- **Impact:** A URL such as `https://user:password@host/...`, a token-bearing query, a localhost/private address, or a redirect can become a persisted secret or an SSRF-like read of an internal service. This directly contradicts the PRD rule that credentials must not enter snapshots, URLs, logs, or receipts.
- **Fix recommendation:** Reject URL userinfo and sensitive query keys before fetch; persist a sanitized canonical source separately from the fetch target; resolve and re-check every redirect against an explicit public-host/origin policy; reject loopback, link-local, private and metadata ranges by default; require an explicit opt-in for local test hosts. Add hermetic tests for credential stripping, redirects, private IPs and sanitized error output.
- **Disposition:** Must fix before Architecture handoff; do not defer as an implementation detail because it defines the ingestion trust boundary.

### C-02 — Design-tool receipts do not enforce the project path or source-file boundary

- **Severity:** Critical
- **Affected rules:** AD-5, AD-6, AD-9; PRD FR-5 and 7.1.
- **Evidence:** `skill/scripts/adapter-core.cjs:89-109` validates `source.artifact` only as a non-empty string and validates `source.sha256` only as a shape. It accepts absolute paths, traversal strings and arbitrary `mappings.sourceLocations`; it has no `projectRoot`, `evidenceRoot`, `realpath`, regular-file, or byte-hash verification option. `skill/scripts/cli-core.cjs:30` exposes `validateDesignToolReceipt` through the adapter surface without adding a containment context.
- **Reproduction:** A receipt with `source.artifact = C:/Users/Administrator/secret.fig` and `mappings.sourceLocations = ["../../secret"]` passes structural validation when its status is otherwise valid. The validator never reads or bounds the referenced artifact.
- **Impact:** A forged or malicious receipt can point outside the project, leak paths, or claim a hash that was never computed from the supplied file. Any later consumer that trusts the receipt can cross the exact boundary AD-5 says must be checked.
- **Fix recommendation:** Make receipt validation require a project/evidence root; resolve all source and evidence paths through the shared `resolveInside`/realpath guard; reject symlink targets; require the source file to exist and hash-match when the operation is `import`; constrain `sourceLocations` to a documented relative syntax or normalized logical IDs.
- **Disposition:** Must fix before handoff.

## High findings

### H-01 — The claimed Figma/Penpot import capability is not implemented

- **Severity:** High
- **Affected rules:** AD-6, capability map UJ-2/FR-5/FR-6; PRD 4.3, MVP 6.1 and SM-4.
- **Evidence:** `skill/scripts/adapter-core.cjs` contains receipt/intake validators but no JSON/SVG/PNG/tokens importer or normalization path. `skill/scripts/cli-core.cjs:280-285` exposes `adapter audit|intake|receipt-check`, not an import command. `skill/scripts/toolchain-core.cjs:153-171` only builds graphics-runtime lifecycle stages; it does not consume a design-tool receipt. The spine itself defers “a complete Figma/Penpot importer implementation” while the PRD lists local design-tool import as MVP in scope.
- **Impact:** UJ-2 cannot complete: a user can validate a hand-authored receipt, but cannot submit an export and receive extracted mappings, DESIGN.md/UI IR/tokens, or a route. SM-4 is not currently testable as stated.
- **Fix recommendation:** Either narrow the spine/PRD claim to “receipt contract only” and move UJ-2/SM-4 out of MVP, or define and implement the smallest importer slice: contained local input, format detection, source hash, provider-neutral normalized artifact, editable/evidence result, and one Figma fixture. Penpot can remain contract-compatible but not falsely ready.
- **Disposition:** Resolve in Architecture/spec boundary; implementation can follow in stories, but the capability status must be truthful now.

### H-02 — A `ready` primary route can have no executable lifecycle or command

- **Severity:** High
- **Affected rules:** AD-7, AD-8, AD-9; PRD FR-8 and SM-C2.
- **Evidence:** `skill/references/frontend-stack-registry.json` marks `design-pipeline/core` and `design-pipeline/website-cloning` as `status: "ready"` with `lifecycle: null`. `skill/scripts/toolchain-core.cjs:100-150` converts such a route into an `agent-route` with `command: null`. `skill/scripts/toolchain-core.cjs:175-217` still emits an overall `status: "ready"` when no blocker exists. `skill/scripts/execution-target-core.cjs:161-201` can then produce a ready execution plan after only checking route/owner/hash relationships.
- **Reproduction:** Resolving a normal React page produced `status: "ready"`, primary `design-pipeline/core`, and invocation `{ kind: "agent-route", command: null }`.
- **Impact:** “ready” means different things at different layers: an agent-owned route is presented alongside executable tool lifecycles, but no CLI/toolchain invocation exists to carry out the selected owner. This is the exact Skill → CLI → toolchain break the spine claims to prevent.
- **Fix recommendation:** Make the distinction explicit in the contract: `agent-owned`/`manual` must not be called executable `ready`, and must carry a required Skill action plus evidence checkpoint; or provide a real local invocation lifecycle. Execution should reject a plan whose selected primary has neither a command nor an explicitly governed agent handoff.
- **Disposition:** Must fix before handoff.

### H-03 — `designmd verify` can return JSON status `ready` with exit code 2

- **Severity:** High
- **Affected rules:** AD-8, AD-12; PRD FR-2, FR-9, FR-10 and 7.4.
- **Evidence:** `skill/scripts/cli-core.cjs:700-702` returns `{ status: "ready", ...errors }` and sets `exitCode` to `2` when `catalog.errors.length` is non-zero. The sync command uses `blocked` for the same condition at `skill/scripts/designmd-sync.cjs:19-21`.
- **Impact:** Machine consumers that trust the JSON envelope see `ready` while process orchestration sees blocked. A state downgrade can occur at the CLI boundary, and a caller can accidentally continue with a partial catalog.
- **Fix recommendation:** Return `status: catalog.errors.length ? "blocked" : "ready"` from `verify`; use one status/exit-code table shared by sync and verify. Add a test that asserts both JSON status and exit code for a partial snapshot.
- **Disposition:** Must fix in the shared CLI contract.

### H-04 — All-page fetch failure does not produce the promised blocked/recovery envelope

- **Severity:** High
- **Affected rules:** AD-4, AD-12; PRD FR-2/FR-9/FR-10.
- **Evidence:** `skill/scripts/designmd-core.cjs:138-149` rejects an empty catalog. `skill/scripts/designmd-core.cjs:191-213` records fetch errors but calls `validateCatalog`, so a run with no successful entries throws `catalog.entries must not be empty`. `skill/scripts/designmd-sync.cjs:24-27` then prints a stack trace and exits 1 rather than returning a blocked result with URL-level errors. The CLI wrapper can only classify this as generic `KERNEL_FAILED` through `skill/scripts/cli-core.cjs:304-327`.
- **Reproduction:** A fetcher that throws for every requested URL produced `designmd: catalog.entries must not be empty`; no deterministic blocked sync envelope was returned.
- **Impact:** The last-known-good recovery path cannot report what happened when the source is entirely unavailable. Automation cannot distinguish “source empty” from “network outage” and cannot reliably choose preserve/retry/inspect.
- **Fix recommendation:** Permit a validated blocked/partial candidate with zero entries when errors are present; carry `status`, `errors`, `preserved` and `previousSnapshotHash` through the kernel result; let `writeCatalog` preserve a valid prior snapshot without requiring a non-empty candidate.
- **Disposition:** Must fix before claiming AD-4 complete.

### H-05 — AD-3 requires robots and size bounds that the crawler does not implement

- **Severity:** High
- **Affected rules:** AD-3, AD-12; PRD 7.2/7.3 and SM-1.
- **Evidence:** `skill/scripts/designmd-core.cjs:165-179` fetches with a timeout and retries but has no `robots.txt` read/evaluation, no response byte cap, no `Content-Length` check, and no streaming limit before `response.text()`. `skill/scripts/designmd-core.cjs:181-209` bounds pages and concurrency but does not enforce a request rate or source-specific budget.
- **Impact:** The spine says robots-compliant, bounded ingestion; the shipped crawler can still read disallowed pages and allocate unbounded memory for one response. The “full sync” success metric is therefore not backed by the stated safety/performance contract.
- **Fix recommendation:** Add a per-source robots preflight/cache and fail closed or mark blocked when policy cannot be evaluated; enforce maximum response bytes while streaming; make page/concurrency/byte/timeout limits part of the catalog result and tests. Do not describe the current implementation as robots-compliant until this exists.
- **Disposition:** Must fix or explicitly change AD-3 to a planned constraint before handoff.

### H-06 — Source/artifact hashes are not carried through the route and execution handoff

- **Severity:** High
- **Affected rules:** AD-9, AD-11; PRD FR-3, FR-7, FR-8 and SM-2/SM-3.
- **Evidence:** `skill/scripts/toolchain-core.cjs:185-216` includes hashes for the bundled frontend/adapter/graphics registries, but no input design-artifact hash, resource-entry hash, admission hash, or request hash. `skill/scripts/execution-target-core.cjs:129-175` binds the execution request to `toolchainPlanSha256`, `routeId`, and slice owners, not to a source artifact. `skill/scripts/toolchain-core.cjs:269-307` validates a receipt against the plan hash only; it does not require route owner or source-artifact identity.
- **Impact:** The plan can be reproduced against a different local design input while retaining the same route/owner binding. The tests prove plan/owner integrity, but not the PRD's resource-to-route provenance chain.
- **Fix recommendation:** Add `inputArtifacts[]` to the normalized route/toolchain contract with contained path, content hash, admission status and source entry ID; include it in the plan hash; require execution and toolchain receipts to echo and verify those hashes. Add a test that changes the input artifact after routing and proves execution rejects it.
- **Disposition:** Must fix in the next contract version; do not paper over with another owner-only test.

### H-07 — Persisted path semantics are internally inconsistent and symlink checks are incomplete

- **Severity:** High
- **Affected rules:** AD-5, AD-11; PRD 7.1 and FR-1/FR-3.
- **Evidence:** `skill/scripts/designmd-core.cjs:241` persists `contentPath` as `content/<kind>/<slug>.md`, relative to the catalog directory, while AD-5 says persisted paths are project-relative. `skill/scripts/designmd-core.cjs:263-278` performs lexical containment but does not resolve the target's real path or reject a symlink in the content path. `skill/scripts/designmd-sync.cjs:13-17` performs only lexical `--output-root` containment and bypasses the shared realpath-aware `resolveInside` guard.
- **Impact:** Consumers can resolve the same `contentPath` against different bases; a catalog-root symlink can redirect a read outside the project. The new traversal test covers `../`, but not symlink escape.
- **Fix recommendation:** Pick one contract (`project-relative` or `catalog-root-relative`) and name the base explicitly; use one shared realpath-aware resolver for catalog reads and sync output; reject symlinked files/directories at trust boundaries. Add Windows junction/symlink tests where available.
- **Disposition:** Must fix before handoff because it is both a contract and security mismatch.

## Medium findings

### M-01 — “All DesignMD tool resources” is deferred to a hub-only representation

- **Severity:** Medium, High if the earlier product requirement “support DesignMD 全部资源站类型” means every tool card must be independently searchable.
- **Affected rules:** AD-2 and capability map FR-1/FR-3; PRD FR-1 and SM-1.
- **Evidence:** `skill/scripts/designmd-core.cjs:73-96` extracts external GitHub/GitLab/npm links only as `sourceUrls`. `skill/scripts/designmd-core.cjs:206-208` queues only same-origin URLs. Therefore `/tools` becomes one `tool` entry; external tool cards are not individual resource entries.
- **Impact:** The catalog supports the `tool` kind syntactically but cannot search/inspect each external tool as a Resource Entry or attach independent license/status/hash. This makes “full DesignMD tool support” materially weaker than the product wording.
- **Fix recommendation:** Either explicitly define a hub-only `tool` model in the PRD, or create inert external entries containing card URL, source URL, provenance and license state without auto-fetching/executing external code. Add an allowlisted, bounded external-fetch flow only if independently justified.
- **Disposition:** Resolve as a product/architecture decision; current deferral is acceptable only if documented as non-goal.

### M-02 — Snapshot maintenance claims change/disappearance tracking that is absent

- **Severity:** Medium
- **Affected rules:** AD-2, AD-4, AD-12; PRD FR-3 and FR-9.
- **Evidence:** `skill/scripts/designmd-core.cjs:181-213` creates a fresh catalog from the current crawl and sorts entries; it does not compare against a prior snapshot, record `fetchedAt`/revision, mark `changed` or `stale`, or report disappeared entries. `validateEntry` at `skill/scripts/designmd-core.cjs:126-136` does not require `contentPath`, provenance or revision fields.
- **Impact:** The implementation has content hashes, but cannot satisfy “identify added, changed, disappeared and failed” or prevent an old entry from silently remaining usable after source removal.
- **Fix recommendation:** Add a snapshot identity and previous-snapshot reference, calculate an explicit diff, and define statuses for changed/disappeared/stale entries. If this is outside the first slice, remove the stronger FR-9 claim from the architecture handoff.
- **Disposition:** Defer only with an explicit contract boundary; do not call the current sync “maintenance” complete.

### M-03 — “Append-only ledger” is not the actual adaptation persistence model

- **Severity:** Medium
- **Affected rules:** AD-11 and Consistency Conventions.
- **Evidence:** `skill/scripts/adaptation-core.cjs:56-58` stores candidates, receipts, promotions, tombstones and history in one JSON state object. `skill/scripts/adaptation-core.cjs:127-135` atomically rewrites that file; lifecycle operations mutate/delete map entries while appending to the in-memory `history` array.
- **Impact:** The semantic history is append-like, but the durable state is a mutable snapshot, not an append-only ledger. Recovery/audit consumers cannot rely on an immutable event stream or independently verify the state transition sequence.
- **Fix recommendation:** Either change the architecture wording to “versioned atomic state with append-only history” or add a separate append-only event file with state-hash chaining. The former is the lazy, sufficient fix if tamper-evident event replay is not a requirement.
- **Disposition:** Clarify in Architecture/spec; implementation need not be expanded unless audit replay is required.

### M-04 — The architecture has no explicit source-adapter contract beyond the DesignMD special case

- **Severity:** Medium
- **Affected rules:** AD-1 through AD-3 and Structural Seed.
- **Evidence:** The spine describes “sources and ports” and a normalized artifact boundary, but the brownfield implementation exposes a hard-coded `syncDesignMd` path (`skill/scripts/designmd-core.cjs:181-214`) and no generic Resource Source adapter/schema. The PRD says a generic source interface is out of scope for MVP, while the spine's source-layer language reads broader.
- **Impact:** Future sources can bypass robots, budget, provenance and admission rules because there is no named port contract they must implement.
- **Fix recommendation:** Keep MVP DesignMD-only, but state that the current port is a DesignMD-specific implementation of a future source contract, and list the minimum adapter inputs/outputs without building a generic framework.
- **Disposition:** Clarify; no new abstraction needed now.

## False-positive / non-findings checked

- The product is correctly modeled as local Skill + CLI + filesystem; no MCP runtime was found in the reviewed handoff path.
- Route owner mismatch and plan hash mismatch are covered by existing tests in `tests/cli-routing.test.cjs:84-114` and `tests/skill-cli-handoff.test.cjs:65-108`; the finding above is that source-artifact identity is still missing, not that owner checks are absent.
- `skill/scripts/contract-utils.cjs:64-80` has a realpath-aware containment helper, and `skill/scripts/cli-core.cjs:137-145` uses it for many ordinary CLI artifacts. The DesignMD kernel and design-tool receipt paths do not consistently reuse it.
- Atomic replacement and last-known-good preservation are present for the tested partial-sync case in `skill/scripts/designmd-core.cjs:216-260`; the failure is the unhandled all-failure/empty-candidate case, not the absence of all atomic behavior.

## Required exit criteria before re-review

1. Close C-01 and C-02 with executable boundary tests.
2. Decide whether Figma/Penpot import is MVP truth or a deferred contract; align the spine and PRD accordingly.
3. Make route readiness distinguish executable lifecycle from agent/manual handoff.
4. Make DesignMD sync/verify statuses, recovery envelopes, robots handling and size limits agree with AD-3/AD-4/AD-12.
5. Add source-artifact hash binding to toolchain and execution receipts.


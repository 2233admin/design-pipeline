---
reviewer: adversarial-incompatibility-r2
target: ARCHITECTURE-SPINE.md
date: 2026-08-23
verdict: reject-handoff
scope: brownfield compatibility, security boundary, state degradation, path escape, capability truth
previous_review: reviews/review-adversarial.md
---

# Adversarial Incompatibility Review — R2

## Verdict

**REJECT HANDOFF.**

The revised spine is materially more honest: `Brownfield Delivery Boundary` now labels several gaps as obligations, `AD-15` separates contract-present from implementation-complete, and `Deferred` no longer silently claims that Figma/Penpot import or full execution readiness already exists. That resolves the documentation-level overclaim from R1.

It does not yet pass brownfield compatibility or security review. The adopted rules still conflict with executable code and current registry state. In particular, the current surface can retain unsafe fetch targets, accept unbounded design-tool receipt paths, expose a `ready` route with no command, and return a `ready` catalog status alongside a blocked exit code.

This review is non-mutating. `ARCHITECTURE-SPINE.md` was not changed.

## Findings

### F-01 — Ingestion security boundary is specified but not enforced

- **Severity:** Critical
- **Rules:** AD-3, AD-12, AD-14; Brownfield Delivery Boundary.
- **Evidence:** `skill/scripts/designmd-sync.cjs:14-17` accepts arbitrary `--url`. `skill/scripts/designmd-core.cjs:22-31` preserves URL query/userinfo data. `skill/scripts/designmd-core.cjs:165-178` calls `fetch()` without private/link-local/metadata target checks, sensitive-query rejection, redirect revalidation, robots evaluation, or response-byte enforcement. `skill/scripts/designmd-core.cjs:181-213` only bounds pages and concurrency.
- **Observed behavior:** A controlled sync with `https://designmd.test?token=secret` retained `https://designmd.test/?token=secret` as `catalog.source`. A fetcher that fails every page still reaches catalog validation rather than producing the AD-4 recovery envelope.
- **Impact:** The revised text correctly names URL/redirect safety as an obligation, but the public CLI still permits credential retention and unintended network reads. A large response is also read with `response.text()` before any byte limit. This is a trust-boundary failure, not merely missing optimization.
- **Fix recommendation:** Implement a shared fetch policy: reject URL userinfo and sensitive query keys, sanitize persisted/error URLs, deny loopback/link-local/private/metadata targets by default, re-check redirects, evaluate robots, and enforce a streaming response-byte cap. Make policy failure `blocked`/`partial`. Until implemented, the sync capability must remain explicitly non-ready in public status.

### F-02 — Path containment and design-tool receipt schema still contradict AD-5/AD-6

- **Severity:** Critical
- **Rules:** AD-5, AD-6, AD-9.
- **Evidence:** The spine now says catalog paths are catalog-root-relative and all reads/writes are realpath-safe. `skill/scripts/designmd-core.cjs:263-278` only performs lexical containment and reads the resolved path; it does not reject symlink/junction targets. `skill/scripts/designmd-sync.cjs:13-17` performs a lexical output-root check instead of using the shared realpath-aware guard. Separately, `skill/scripts/adapter-core.cjs:89-109` still validates the old receipt shape: no `sourceMode`, producer, fidelity/loss evidence or evidence-path root is required; `source.artifact` is only a string and `source.sha256` is only a format check.
- **Impact:** The text and code describe different security contracts. A catalog-root symlink can redirect a content read, and a structurally valid design-tool receipt can name an absolute/out-of-root artifact or claim a hash without the validator reading the file. The new AD-6 fields cannot be emitted/validated by the current v1 validator without a coordinated schema change.
- **Fix recommendation:** Route DesignMD reads/writes through one realpath-aware resolver and reject symlink/junction/non-file targets. Version or migrate the receipt schema; require root context, regular-file checks and byte-hash equality for imports, and constrain logical `sourceLocations`. Add Windows junction/symlink fixtures and valid-receipt-outside-root rejection tests.

### F-03 — `ready` still means executable in the registry while the selected route has no lifecycle

- **Severity:** High
- **Rules:** AD-8, AD-15; PRD SM-C2 and FR-8.
- **Evidence:** `skill/references/frontend-stack-registry.json:79-80` marks `design-pipeline/core` and `design-pipeline/website-cloning` as `status: "ready"` with no lifecycle. `skill/scripts/toolchain-core.cjs:100-150` emits `kind: "agent-route"` and `command: null` for such routes. `skill/scripts/toolchain-core.cjs:175-217` can still return plan `status: "ready"`; `skill/scripts/execution-target-core.cjs:161-201` only verifies route/owner/plan relationships.
- **Observed behavior:** A normal React request resolves to primary `design-pipeline/core` with `status: "ready"` and invocation `kind: "agent-route", command: null`.
- **Impact:** The revised AD-8/AD-15 rules explicitly say `ready` requires a real executable lifecycle and agent/manual paths need a distinct non-executable status. The brownfield registry still violates that rule, so the architecture is not yet ratified by the current source of truth. Skill → CLI → toolchain can terminate at a null command while reporting ready.
- **Fix recommendation:** Change the registry status to `agent-owned`/`manual` and require a declared Skill action/evidence checkpoint, or add a real local lifecycle. Make toolchain/execution reject a selected primary with neither a command nor a governed agent handoff. Add a registry-wide invariant test, not only a single route smoke test.

### F-04 — State degradation remains observable at the CLI boundary

- **Severity:** High
- **Rules:** AD-4, AD-8, AD-12, AD-14.
- **Evidence:** `skill/scripts/cli-core.cjs:700-702` returns `status: "ready"` from `designmd verify` even when `catalog.errors.length > 0`, while setting exit code 2. `skill/scripts/designmd-core.cjs:138-149,191-213` rejects an all-failure candidate because entries must be non-empty, so `designmd-sync` falls through to generic kernel failure instead of a deterministic blocked/recovery envelope. The spine says sync and verify must agree, but it does not include the promised shared mapping table.
- **Impact:** JSON-only consumers can proceed on a partial snapshot even though the process is blocked. An entirely unavailable source cannot report `preserved`, `previousSnapshotHash`, URL-level errors or next action through the declared contract. This is a status downgrade and recovery-path break.
- **Fix recommendation:** Return `blocked` from verify when errors exist; permit an error-bearing zero-entry candidate; preserve and report the previous snapshot atomically; include `status`, `errors`, `preserved`, `previousSnapshotHash` and next action in one versioned envelope. Publish and test one command/status/exit mapping table before marking AD-12 complete.

### F-05 — Provenance and import capability remain disconnected from routing/execution

- **Severity:** High
- **Rules:** AD-6, AD-9, AD-15; PRD UJ-2, FR-5/FR-7/FR-8, SM-2/SM-4.
- **Evidence:** `skill/scripts/adapter-core.cjs` provides validators only; there is no Figma/Penpot JSON/SVG/PNG/tokens importer or normalized artifact producer. `skill/scripts/cli-core.cjs:280-285` exposes `adapter audit|intake|receipt-check`, not import. `skill/scripts/toolchain-core.cjs:185-216` hashes bundled registries but carries no input artifact/resource-entry/admission hash. `skill/scripts/execution-target-core.cjs:129-175` binds only `toolchainPlanSha256`, route and slice owners; `validateToolchainReceipt` at `skill/scripts/toolchain-core.cjs:269-307` does not require source-artifact identity.
- **Impact:** The revised spine correctly says SM-4 is unearned, but AD-9 is still not ratified by the handoff implementation. A route can be bound to a plan and owner while the actual design input changes or is absent. UJ-2 cannot reach normalization/execution; a hand-authored receipt is the only apparent entry point and is not a real importer.
- **Fix recommendation:** Keep Figma/Penpot non-ready until one real local importer fixture passes. Add `inputArtifacts[]` with contained path, source-entry ID, admission status and byte hash to the normalized route/toolchain plan; include it in the plan hash and require execution/toolchain receipts to echo and verify it. Add mutation-after-routing tests.

## R1 disposition

| R1 issue | R2 disposition |
| --- | --- |
| Unsafe DesignMD URL/redirect handling | Still open; now honestly named as an obligation, but not implemented. |
| Receipt path escape | Still open; AD-5/AD-6 are stronger than current validators. |
| Figma/Penpot importer overclaim | Documentation overclaim fixed; implementation remains intentionally deferred and must stay non-ready. |
| Null-command `ready` route | Still open; AD-8/AD-15 now explicitly conflict with the registry. |
| `verify` ready + exit 2 | Still open; no shared mapping table or code fix found. |
| All-page recovery envelope | Still open; all-failure path still throws. |
| Missing source-artifact handoff hash | Still open; only registry/plan hashes exist. |
| DesignMD external tool-card completeness | Correctly narrowed to a deferred hub/reference boundary; no longer treated as a current full-catalog claim. |
| Adaptation ledger wording | Corrected to versioned atomic state plus append-like history. |

## Re-review exit criteria

1. Close F-01 and F-02 with executable security tests.
2. Remove false `ready` states from the registry or provide governed agent lifecycle contracts.
3. Make sync/verify/all-failure status behavior deterministic and consistent.
4. Bind actual input artifacts through toolchain and execution, or keep the entire design-tool intake path explicitly non-ready.


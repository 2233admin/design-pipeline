## Decision and ownership

Extend current v1 contracts rather than add a preflight. The frontend owner implements entry and downstream consumption; a scoped worker may implement decision validation and its tests. The provenance worker's installation/evaluation guide is separate. Parent owns CHANGELOG, package resources, verification and publication.

## Existing seams

`workflow-core` owns workflow-state.v1; web owns conversational choices and description/section approval. `project inspect` produces a bounded, byte-backed static observation. Host captures use evidence-receipt.v1. `design-system decide` already produces design-system-decision.v1. Native artifact metadata, control phases and task input hashes already invalidate changed inputs; component-first owns target/snapshot/policy/receipt contracts.

## Chosen mechanism

1. Add one frontend workflow helper shared by web and generic UI. State retains the supplied request, link, scope and purpose. First `next` returns a read-only project observation and, for a link, a bounded host-capture instruction. `decide` records the observation summary delivered to the owner plus actual current file/capture hashes. No observed/approved boolean completes this action. Purpose clarification follows observation only when the supplied facts leave a material role unresolved.
2. A design-system selection states its basis: `owner-scratch`, `preserve-existing`, or `capability-search`. It includes a rationale and structured authority with actor, source, choice and actual request/reply text. Scratch requires owner selection but no inventory; preserving project authority does not require a new owner approval. Searched fallback/substitution requires inventory, candidate comparisons/rejections and compatibility. Reference-only decisions can support exploration, not dependencies.
3. Published decisions bind their request and contained stack/inventory/catalog sources through current hashes. Consumers validate shape, reread/recompute the decision and check every bound source. Web/UI consume before concepts/spec/work and again before implementation; approval digests include that binding. Missing/changed decisions cannot be rescued by old approvals or a cached ready flag.
4. Native frontend phase/task consumers carry the same decision as existing artifact/receipt inputs. Existing target, snapshot and policy authority remain unchanged. Film/edit do not acquire frontend prerequisites.
5. Optimization preserves function/content/explicit brand constraints, not defective appearance. Existing concept/description decisions handle material overall-style changes. Faithful reproduction keeps existing invariants and fidelity authoritative. Quick already-authorized work does not add a design approval merely because an observation was recorded.

## Alternatives and trade-offs

| Option | Correctness | Complexity | Owner scratch |
| --- | --- | --- | --- |
| Prose-only guidance | Leaves direct/resumed bypasses | Small | Fast but unaudited |
| Separate preflight/schema | Duplicates lineage and authority | High | Adds ceremony |
| Extend existing records and consumers (chosen) | Revalidates current evidence at existing boundaries | Bounded migration | No search or duplicate interview |

## Compatibility and migration

Old frontend state without entry/decision bindings reopens at the missing evidence; it does not inherit authority from files alone. Existing callers and test fixtures supply real structured decisions through public APIs. Existing v1 names and exit codes remain: malformed usage is 1, unavailable/blocked evidence is 2, ready actions are 0. No shim marks legacy evidence ready.

## Out of scope

Film/edit sequencing, all-media preflight, generic DesignBrief, new approval points or parallel gates/schemas/target resolver/policy digest, catalog importing, deferred issue implementation and version-provenance ownership.

## Evidence boundary

This design specifies runtime behavior. Parent runs focused contracts, actual CLI/web/UI smoke, strictspecs, package/install and CI after integration. Those checks cannot establish model effectiveness or owner Visual Acceptance. The six deferred issues remain open.

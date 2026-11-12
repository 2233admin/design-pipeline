## Decision and ownership

Extend current v1 contracts rather than add a preflight. The frontend owner implements entry and downstream consumption; a scoped worker may implement decision validation and its tests. The provenance worker's installation/evaluation guide is separate. Parent owns CHANGELOG, package resources, verification and publication.

## Existing seams

`workflow-core` owns workflow-state.v1; web owns conversational choices and description/section approval. `project inspect` produces a bounded, byte-backed static observation. Host captures use evidence-receipt.v1. `design-system decide` already produces design-system-decision.v1. Native artifact metadata, control phases and task input hashes already invalidate changed inputs; component-first owns target/snapshot/policy/receipt contracts.

## Chosen mechanism

1. Add one frontend workflow helper shared by web and generic UI. State retains the supplied request, link, scope and purpose. First `next` returns a read-only project observation and, for a link, a bounded host-capture instruction. `decide` records the observation summary delivered to the owner plus actual current file/capture hashes and bounded source membership, including candidates beyond the smaller file-read budget. Before authorized work, changes, removals, additions and empty-to-nonempty transitions reopen observation and invalidate dependent authority. Process artifacts retain their own contract bindings rather than masquerading as product source.
2. A design-system selection states its basis: `owner-scratch`, `preserve-existing`, or `capability-search`. It includes a rationale and structured authority with actor, source, choice and actual request/reply text. Scratch requires owner selection but no inventory; preserving project authority does not require a new owner approval. Searched fallback/substitution requires inventory, candidate comparisons/rejections and compatibility. New adoption/substitution requires actual owner authority; agent reference research does not authorize dependencies. Public decomposition is consumed unchanged; a search limit bounds matching hits, not an unrelated catalog prefix, and cannot prove complete fallback evidence.
3. Published decisions bind their request and contained stack/inventory/catalog sources through current hashes. Implicit catalog selection additionally binds the installed bundled snapshot; the shared validator rereads its bytes and normalized catalog on consumption. Web/UI consume before concepts/spec/work and again before implementation; approval digests include that binding. Missing/changed decisions cannot be rescued by old approvals or a cached ready flag. Negated or materially ambiguous role language does not become fidelity authority; actual purpose corrections update routing and survive refreshed observation.
4. Existing workflow dispatch records literal source-output scopes in workflow-state.v1, bound to the current observation/purpose and decision. Native task dispatch uses its existing declared scope/outputs and records authorization before the Git execution baseline. Only these authorized outputs may diverge from the historical observation; input/reference/decision evidence remains current. Existing web gate inputs bind the current authorized output set, so added/removed/changed outputs stale technical evidence rather than create a perpetual observation loop. Native task verification retains its original scope, checked-output and artifact receipt contracts. Existing target, snapshot and policy authority remain unchanged; film/edit acquire no frontend prerequisites.
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

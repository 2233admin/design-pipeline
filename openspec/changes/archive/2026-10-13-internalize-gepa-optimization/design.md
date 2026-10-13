# Independent native GEPA tool

## Context

See proposal.md. Existing feedback records findings; `adaptation` validates external finite collaboration rules and their replay/held-out results. Neither executes general guidance search. The existing supporting-tool route already allows independently callable helpers, and packaging recursively ships `skill/` with required-resource checks. Code-Intel failed earlier on an oversized graph and case-sensitive glossary inventory; bounded source inspection established the integration surfaces.

## Goals / Non-Goals

**Goals:** executable native optimization of one guidance text, frozen case splits, explicit inference configuration, bounded search, auditable candidate output and complete source-skill provenance.

**Non-Goals:** another optimizer implementation, new gates/receipts/resolvers, automatic promotion, free-form changes through bounded adaptation, model-weight training, additional optimizer backends, global installation, or evidence that synthetic scores establish creative quality.

## Decisions

1. **Pinned upstream skill and optional native runtime.** Review `gepa-ai/gepa` revision `462e437a09be67d2acb59564cc0ea59132f5777c` and import all files in `.claude/skills/gepa-optimize-anything/`, plus LICENSE, README and pyproject metadata. Use the existing Git snapshot helpers for original blobs and scoped inventory. Pin the Python dependency to that exact Git revision: release labels currently disagree with this source and the official skill postdates the latest tag. Python is optional for this supporting tool; the npm workspace and core installation remain independent.

2. **Thin Python invocation.** `skill/tools/gepa/optimize.py` accepts a seed file, trusted task module, fresh run directory and positive `--max-evals`. The module supplies native `evaluator`, `dataset`, `valset`, `test_set`, `objective`, and an explicit `reflection_lm` or `custom_candidate_proposer`. Preserve native task/evaluator semantics; validate unique nonempty disjoint fixture ids and finite scores. Execute the GEPA backend in process, without caching/parallel closure serialization. Never silently select a model. Task code is trusted executable code, not a sandbox; use an isolated project for real generation/rendering and keep secrets in provider environment configuration.

3. **Local output and unchanged inputs.** Validate requests before creating output. Use a new run directory; save seed, input hashes, declared budget, native results/history, selected text and unified diff. Native final-test comparison stays outside search and its budget: the seed baseline runs before search and the selected candidate afterward, with baseline reuse when unchanged. Document the additional evaluator calls. Do not add a receipt schema or call promotion. Preserve interrupted/failed output for diagnosis; input drift fails instead of reporting a successful experiment. Native callbacks and their external model/render costs remain caller-owned.

4. **Two separate proofs.** A credential-free synthetic task exercises actual candidate generation, evaluation, selection, parent history and final-test exclusion. It proves the wiring only. Real design evaluators must run the existing renderer/agent, collect actual outputs, feed diagnostic feedback, apply existing gates and obtain separate Visual Acceptance. Private golden answers remain evaluator-only; search validation is exposed for selection and is not the final test.

5. **Adoption follows existing authority.** The helper exports proposals. Maintainers adopt packaged guidance through the original feedback/OpenSpec process, preserving source/target/snapshot/policy/receipt lineage and invalidating downstream evidence when inputs change. Existing finite project/user adaptation is unchanged and cannot consume arbitrary optimized prose.

6. **Verify the loaded runtime.** Before importing GEPA or creating experiment output, compare the installed distribution's `direct_url.json` Git commit with the existing bundled source manifest's reviewed revision. Reject unknown or mismatched provenance; do not accept version labels or unrecorded local-source installations. Preserve the checked runtime version/revision with experiment output. Verify native result fields are exportable before adding them to the failure record, so derived nonfinite aggregates cannot prevent a failed `result.json` from being retained.

## Ownership and compatibility

- Source worker: `scripts/import-gepa.cjs`, `skill/vendor/gepa/`, `tests/gepa-source.test.cjs`; no edits to original bytes.
- Runtime worker: `skill/tools/gepa/`, `tests/gepa-runtime.test.cjs` and ignored native verification output.
- Root: this change, `skill/references/gepa.md`, selected existing entry/index/feedback documents, package resource/test manifests, npm maintenance commands, attribution and release notes.
- Existing dirty files contain unrelated work. Apply narrow additive patches and preserve all edits. No public CLI flag, install-group registry or artifact migration is needed. New files are packaged under the existing supporting-tool route.

## Risks / Trade-offs

- Evaluator bias and case overfitting → final test separate from search, independent comparison and human review before adoption.
- Arbitrary trusted evaluator/proposer code can access its process environment → clearly document trust, use isolated task workspaces and never treat the helper as a sandbox.
- Optional dependencies may be unavailable → fail clearly; core design delivery stays usable. Native Python checks run in an isolated environment, with optional runtime integration outside unprepared installations.
- Budget caps search evaluation calls, not all external cost or wall time → record the limit, bound callbacks/processes separately and account for final-test calls outside search.
- Multica currently returns server errors → preserve scope/progress/verification here and in chat; reconcile when service recovers.

## Migration Plan

No existing state or artifact changes. Ship the additive supporting tool and provenance. Rollback removes these additions and routes; seed files and installed skills are never rewritten. Retain local experiment output and existing version history.

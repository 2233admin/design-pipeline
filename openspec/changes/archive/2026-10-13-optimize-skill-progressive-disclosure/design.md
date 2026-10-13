# Design: Progressive Disclosure and Skill Evaluation

## Decision

Use the existing `skill/` directory as the single packaged skill. Keep `SKILL.md` as the dispatch layer and move detailed instructions into references selected by route. Do not install or vendor the upstream Anthropic skills.

Add explicit canonical job entries for reference reconstruction and dynamic web verification so the mandatory Stage 0 dispatcher can reach the route-specific references. Preserve existing job IDs and add only non-overlapping keywords.

The front door will contain:

1. trigger and user-intent routing;
2. project invariants and fail-closed rules;
3. a compact stage map;
4. command examples for the public CLI;
5. a route-to-reference table;
6. the output and verification contract.

Detailed reconstruction, cloning, component, motion, adaptation, and QA instructions remain in focused references. Existing references are reused before new files are created.

## Reference Loading

Create only the missing focused documents needed to move long normative sections out of the entry point. The entry point must link each document at the point where the route is selected. Reference files are independent reading units and must not require loading the full skill.

The package resource manifest must include every new reference. The package QA must verify that the installed archive preserves the same front door and references.

Add `evals/evals.json` with schema `design-pipeline.skill-evals.v1`. Each evaluation contains:

- stable `id` and `name`;
- a realistic user prompt;
- the route-contract alias used by the front-door table;
- the canonical `expectedJob` emitted by the dispatcher;
- the expected downstream state (`ready` or `blocked`);
- required signals that should appear in the selected workflow;
- optional input fixture paths.

Add `scripts/validate-evals.cjs` as a deterministic, offline validator. It checks schema, unique IDs, non-empty prompts, route-contract aliases, canonical job IDs loaded from `references/job-registry.json`, expected states, normalized fixture paths contained by the manifest directory, and non-empty required signals. It validates evaluation assets only; it does not infer model quality.


## Existing Contract Reuse

The official `frontend-design` ideas map to existing project contracts:

- subject grounding and audience specificity → `references/design-synthesis.md`;
- product-specific signature and comparable candidate directions → `references/direction-preview.md`;
- iterative critique and anti-default checks → `references/anti-slop-review.md` and the existing Impeccable contract;
- responsive, focus, and reduced-motion evidence → existing QA and interaction-state contracts;
- network-idle browser reconnaissance and evidence capture → `adapters/playwright.cjs` and the browser evidence references.

The change adds routing pointers and eval coverage for these contracts instead of adding a second, conflicting implementation.

## Compatibility and Risk

- Existing public commands and state/receipt schemas do not change; two explicit, non-overlapping job routes are added so existing queries continue to resolve as before.
- Existing reference paths remain valid; moved content is relocated without semantic edits.
- Eval files are package metadata, while the route registry additions are the only runtime dispatch change.
- The main risk is a lost instruction during extraction or route drift. Mitigate with a reference inventory, package-resource validation, canonical job and route-contract tests, full QA, and a focused test that checks all eval routes, states, and required signals.

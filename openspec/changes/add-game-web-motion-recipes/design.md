# Design: Game and Web Motion Recipes

## Outcome and boundaries

Four complete original recipes with runnable examples and existing catalog discovery. No library of all site effects, copied code, component-route broadening, mandatory A/B step or separate motion checker. Use project primitives/tokens when present. Recommendations and specimen values are project-authored starting points, not a second default token scale or measured source values.

## File ownership

- HUD slice: `skill/references/motion-recipes/hp-ghost-bar.md`, `cooldown-completion.md`; `skill/tools/motion-recipes/hp-ghost-bar.html`, `cooldown-completion.html`.
- Interaction slice: `skill/references/motion-recipes/reward-arrival.md`, `menu-switch.md`; `skill/tools/motion-recipes/reward-arrival.html`, `menu-switch.html`.
- Integration slice: `skill/references/motion-recipes/README.md`, `skill/tools/motion-recipes/README.md`; narrow additions in catalog, package resources, tools index, pipeline-reference, workflow-web and game-ui-and-narrative. Avoid editing concurrent UI transition rule content. Recipe links must reuse its authority.
- Parent: change records, final evidence and narrow changelog addition after runtime verification.

All standalone specimens run from file:// and contain no remote dependencies. Use semantic DOM/SVG and CSS/WAAPI with bounded cancellation ownership, system prefers-reduced-motion plus a visible reduced-motion checkbox. Each page has `main[data-recipe="<slug>"]`, readable state and named controls. This identity is only a smoke selector, not a public artifact schema. No instrumentation/testing API is required.

## Recipe content

Each individual guide gives Chinese and English name, product purpose/frequency and no-motion conditions, authoritative and visual state, trigger/start/end, timing phases and tuning boundaries, current platform primitive or existing semantic primitive if it truly matches, repeat/reverse/cancel/reset/disposal behavior, accessible/reduced-motion behavior, specimen controls and rendered acceptance cases. Preserve state/order/focus while reducing motion.

- HP: damage changes HP instantly; trail is a visual remainder. Successive damage retargets from current presentation; healing aligns both values. Reduced motion aligns trail without delaying real HP.
- Cooldown: deadline/progress determines availability, not animation completion. Start/restart/cancel/reset never leaves a stale ready cue. Completion cue fires once per genuine run and does not loop at idle.
- Reward: a grant commits the total immediately; decorative arrivals never mint or duplicate the reward. Repeated grants and interrupted presentation preserve correct totals. Reset cancels old visuals. Reduced motion retains the exact grant and readable amount.
- Menu: current requested state controls panel availability and aria-expanded; focus/Escape are coherent. Open-close-open or rapid selection never lets old cleanup hide the latest requested panel. Inactive controls are not focusable during exit.

## Sources and lineage

Reference URLs are external observation provenance, not code or asset licenses. HP ghost bar and Icon Morph were played in the preceding research; cooldown/reward may be supported by written catalog descriptions and must not claim measured playback. Concrete recipe parameters and code are original. Do not import upstream data, export snippets or assets.

Catalog records live in the existing snapshot's docs collection: one canonical project-owned source record (`source/design-pipeline/motion-recipes`) owns the four method records through `sourceId: design-pipeline/motion-recipes`. Reuse existing source completeness and license-state equality contracts. Existing normalization supplies canonical metadata hashes; do not mint content hashes or a policy digest. Local paths resolve relative to skill root. Project-owned license evidence points to the original packaged guide/specimen; external source licensing remains unknown and separate. Method retrieval explicitly omits --platform web, which remains component-only.

Decisions/evidence remain in reference.md, motion.md and qa.md or phase records. Existing target/snapshot/digest/receipt invalidation is unchanged. Rendering or CLI search success proves the scoped observed behavior, not Visual Acceptance.

## Acceptance and verification

- Existing CLI method/doc searches retrieve each recipe by Chinese and English scenario terms; record paths resolve to docs/specimens. Platform web search excludes these method entries.
- Browser opens every specimen, exercises normal playback, rapid input/cancel/reset and reduced motion; observes actual state and fresh screenshots.
- Existing focused package/catalog checks, strict OpenSpec validation, npm run specs:check and npm test run once after integration. No permanent tests for source wording or file wiring; add a consumer behavior regression only if a production code fix becomes necessary.

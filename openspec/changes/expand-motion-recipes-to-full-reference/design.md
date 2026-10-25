# Design: Full Motion Reference Recipe Coverage

## Verified inventory and scope

The 2026-10-14 live inventory has 782 unique IDs in 64 categories. Assembly starts from 811 records and removes 29 explicit aliases. All pagination was exhausted (120, 240, 360, 480, 600, 720, 782), every category filter's exact ID set was checked, and the union equals the final catalogue. The 228 new text-engine entries are a subset of 782; text categories contain 248 entries because 20 retained legacy entries use other mechanisms. Twelve text guides and two research records are separate from the motion count.

Research source: `.design-pipeline/motion-reference-full-inventory.json` and `.md`. Publish only factual identity/count/source-parameter observations and original adaptation metadata, not source descriptions, recipes, code or assets. Do not promote live metadata enumeration into a claim that 782 source animations were visually reviewed.

## Ownership and partition

All observed categories have exactly one owner; no fallback owner or unassigned category:

- `basic` (164): principles, easing, spring, timing, entrance, move, scale, rotate, reaction, collection, attention, svg-path.
- `web` (157): web-scroll, web-interaction, web-layout, web-feedback, form-state, gesture, ui-button, ui-control, ui-navigation, ui-loading, ui-feedback, data-story.
- `game` (107): game-hud, game-combat, game-reward, game-progress, game-cinematic, ui-spatial, ui-material, game-impact-fx.
- `text` (248): every `tx-*` category, including 228 text-engine entries and 20 legacy entries.
- `scene` (106): light, effect, transitions, camera, particles, loops, character, look, depth3d, sound.

Each owner writes `skill/tools/motion-recipes/full/<group>.js` and `skill/references/motion-recipes/families/<group>.md`, plus a private integration handoff `.design-pipeline/full-motion-<group>-records.json`. Owners may create additional exclusively prefixed original helper files and must report them for packaging. They do not edit shared catalogues, indexes, package resources, changelog or tests. No author may collapse structurally different catalogue concepts or text effects into one generic motion merely to reach the assigned count.

Integration owner writes the gallery, deterministic data projection helper/output, original source inventory summary, coverage consumer tests and shared catalogue/index/resource links. Parent owns final evidence, release note and acceptance. Existing four original guides/standalone HTML specimens remain unchanged and accessible.

## Catalogue and variant record interface

The existing `component-source-catalog.json` remains the authoritative searchable recipe configuration. Add one `doc`/`method` record for each observed source ID, local ID `motion-reference/<source-id>`, under existing canonical project source `design-pipeline/motion-recipes`. Reuse project-owned license state/evidence and existing metadata hash normalization. Do not create another catalogue format, source resolver, policy digest, CLI group or receipt.

Each owner's private handoff is a JSON array of records containing these fields; integration adds/validates the existing catalogue ownership/availability fields:

- `id`: `motion-reference/<exact-source-id>`.
- `name`: `{ en: <short source title>, zh: <original concise Chinese name> }`.
- `category`: `motion-reference-<source-category>`.
- `description`: original short mechanism/adaptation explanation, not copied source prose.
- `keywords`: Chinese/English scenario/technique terms, exact source ID and category.
- `localPaths.guide`: `references/motion-recipes/families/<group>.md`.
- `localPaths.implementation`: `tools/motion-recipes/full/index.html`.
- `inspiration`: source detail URL, source-displayed action/loop duration and easing, observation kind `catalogue-metadata`, no copied code/assets or upstream licensing assertion.
- `motionRecipe`: `{ group, recipeId, variantId, parameters, studyDurationMs, usage, rationale }`.
  - `recipeId` is namespaced `<group>.<actual-mechanism>` and must name a real recipe descriptor in that group's module.
  - `variantId` equals the exact source ID. Every parameter is explicit, author-controlled and supported by that recipe; no guessed unsupported effect values or missing-entry fallback.
  - `studyDurationMs` is the original teaching timeline, distinct from source-displayed action/loop values and target-project operational budgets.
  - `usage` uses existing workflow contexts `web`, `ui`, `film`, `edit` where relevant; game/text are recipe groups, not new CLI deliverable values.
  - `rationale` explains why the actual mechanism and parameters cover this item. Title/keyword similarity alone is insufficient.

Core search keeps its existing `--kind doc --query` path with explicit snapshot selection; `--platform web` remains component-only. Plain internal metadata fields are not a new public artifact schema.

## Original recipe module interface

A module is an original standalone classic browser script, also loadable by Node for configuration validation. Use a small UMD/IIFE wrapper: `module.exports` in CommonJS; otherwise assign `globalThis.MotionRecipeModules[group]`, initializing that object if necessary. Never fetch/evaluate upstream script content or use eval/new Function. No browser DOM access at require time.

Each module exports `{ group, recipes }`. `recipes` is an object keyed by exact namespaced recipe ID. Every descriptor provides:

- `title`: original short Chinese/English mechanism label.
- `validate(parameters)`: returns normally for supported, complete parameters; throws a specific error for absent/unsupported values. It does not silently coerce an unknown mechanism into a default.
- `create(stage, parameters, options)`: creates an original meaningful DOM/SVG/Canvas study inside the supplied stage and returns `{ seek(progress), dispose() }`.
  - `progress` is finite in [0,1]; cold/reverse seek must be deterministic from authored state/parameters. Do not assume prior frame order or allocate the DOM again each frame.
  - `options` is `{ reducedMotion: boolean, text: string, seed: number }`. Text defaults supplied by caller are real CJK/Latin sample content; text segmentation preserves semantic text and grapheme boundaries where applicable.
  - Reduced motion preserves readable/meaningful state without travel, shake, flashing or repeating emphasis. It may present the intended result statically; do not break logical values, focus or interaction.
  - Native controls/pointer/keyboard input may be used where the mechanism is interactive. All listeners, owned animations, request loops and resources must be released by dispose. Gallery owns its playback loop; create must not start an uncontrolled infinite loop.
  - Set `stage.dataset.recipe` to the exact recipe ID for branch diagnosis. Diagnostic selectors are not public receipt schemas.

Distinct principle, curve, path, layout, glyph, spatial and compositing behaviors require actual implementation branches/recipes. If no existing semantic primitive fits, use explicitly named platform channels and record adaptation, not invented taxonomy IDs. Source parameters are observations; authored study parameters and current project tokens govern the implementation.

## Offline gallery and derived data

`full/index.html` uses local classic script tags, not ES-module imports or fetch, so file:// works without special browser flags. A deterministic `full/build-data.cjs` reads existing catalogue records and original inventory summary, validates complete ID membership and supported parameters using the original modules, and derives `full/data.js`. That output is a projection, not another curated source of truth. `--check` compares rather than rewrites; normal build only owns its generated file. This is a bounded tool helper, not a new public pipeline command or gate.

Gallery supports exact hash selection `#motion=<source-id>`, Chinese/English search, category/group filtering, native select, replay/pause, seek, reverse inspection, reduced motion and editable sample text. User-visible selection errors remain explicit. Variant changes dispose previous content. Playbacks and static screenshots report only what was observed; selecting a label does not constitute implementation proof.

## Coverage and verification

The original inventory summary retains independently observed IDs/categories, total/text counts, alias exclusions, source URLs and count proof. Coverage validation compares its complete identity set to catalogue methods, rejects duplicates, extra/missing IDs, nonexistent recipe descriptors and unsupported parameter sets. It must be a useful consumer check, not a source-text or generated-copy assertion. Negative fixtures cover real missing/unsupported/duplicate/ambiguous configuration errors.

Parent opens the gallery and exercises every implemented mechanism branch with valid mapped variants, parameter changes where they distinguish behavior, normal/reduced motion, reverse/cold seek and exact selection. Meaningful state/geometry/pixel changes provide evidence beyond labels. Representative visual playback is reported separately from all-config mount/seek checks; full source visual fidelity is not asserted. Existing four interactive specimens retain their earlier acceptance cases.

Register every load-bearing file in existing package resources and every permanent test in the existing manifest. Run current focused checks, strict new change validation, npm run specs:check and npm test after integration, not during workers' edits. Preserve ambient changes and report external blockers rather than deleting their registrations.

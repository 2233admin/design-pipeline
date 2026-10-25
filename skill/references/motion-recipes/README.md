# Motion Recipe Studies / 全类动效配方

Choose a product scenario or mechanism, read its guide, and inspect the original offline study.
The full gallery maps the independently observed Motion Reference inventory to explicit authored
variants. The four existing interactive specimens remain separate state-owned adaptations.
Neither route is a film workflow, component library, production runtime or default motion scale.

## Full mechanism discovery / 全类机制入口

Open the [offline gallery](../../tools/motion-recipes/full/index.html) directly with `file://`.
Search in Chinese or English, filter by group/category, and choose the exact source ID. A link
ending in `#motion=<source-id>` selects that variant; an invalid ID reports an error, not a
generic substitute. Playback is opt-in. Pause, replay, seek backwards, toggle reverse/reduced
motion, and edit real CJK/Latin sample text to inspect the selected parameters.

| Family / 分组 | Guide and adaptation emphasis | Observed inventory membership |
| --- | --- | --- |
| Basic / 基础 | [Principles, curves, springs, path and object motion](families/basic.md) | 164 |
| Web / 网页 | [Scroll, gesture, layout, forms and UI state](families/web.md); real input/state ownership belongs to the product | 157 |
| Game / 游戏 | [HUD, combat, reward, progress and spatial feedback](families/game.md); visual playback never grants logical state | 107 |
| Text / 文字 | [Grapheme, layout, glyph and variable-font studies](families/text.md); preserve semantic readable text | 248 (228 text-engine entries + 20 retained legacy entries) |
| Scene / 场景 | [Light, compositing, camera, particles and scene motion](families/scene.md); adapt within the existing film/scene renderer | 106 |

The [factual inventory](full-inventory.json) records 782 unique IDs across 64 categories,
independent category ID sets/counts, exhausted pagination and 29 alias exclusions. Text is a
subset, not an additional 228 items. Short names, source URLs and displayed parameters are
observations; no source-wide playback, fidelity or upstream redistribution licence is claimed.

The authoritative configurations are existing `component-source-catalog.json` doc/methods
under `design-pipeline/motion-recipes`. `tools/motion-recipes/full/data.js` is a deterministic
projection, not another curated catalogue. The bounded `build-data.cjs` helper validates exact
membership, descriptor/variant identity and real supported author parameters; `--check` only
compares its generated output. It is not a public CLI, workflow step or new gate.

## Select a scenario

| Scenario and search terms | Guide | Offline specimen | State that must remain authoritative |
| --- | --- | --- | --- |
| 血条拖尾 / hp ghost bar — damage, healing, HUD | [HP ghost bar](hp-ghost-bar.md) | [hp-ghost-bar.html](../../tools/motion-recipes/hp-ghost-bar.html) | Current HP changes immediately; the trail is only a visual remainder. |
| 冷却完成 / cooldown completion — ready cue, ability, HUD | [Cooldown completion](cooldown-completion.md) | [cooldown-completion.html](../../tools/motion-recipes/cooldown-completion.html) | The current deadline determines availability, not the cue's completion. |
| 奖励到账 / reward arrival — grant, balance, progression | [Reward arrival](reward-arrival.md) | [reward-arrival.html](../../tools/motion-recipes/reward-arrival.html) | Each grant commits once immediately; decorative arrivals never change the total. |
| 菜单切换 / menu switch — open/close, selection, navigation | [Menu switch](menu-switch.md) | [menu-switch.html](../../tools/motion-recipes/menu-switch.html) | The latest requested state determines panel availability and focus behavior. |

The guides contain intent/frequency, no-motion conditions, logical and visual state, triggers,
phased timing, primitive selection, interruption/reset, reduced motion and rendered acceptance
cases. Use the [specimen index](../../tools/motion-recipes/README.md) for offline operation.

## Find a recipe through the existing catalog

Set `SKILL_ROOT` to the installed skill directory containing `scripts/` and `references/`.
Search the supplied snapshot as documentation, with the skill root resolving its local paths:

```sh
SKILL_ROOT="/absolute/path/to/installed/design-pipeline"
node "$SKILL_ROOT/scripts/designer-pipeline.cjs" design-system search \
  --root "$SKILL_ROOT" --snapshot references/component-source-catalog.json \
  --kind doc --query "血条拖尾"
node "$SKILL_ROOT/scripts/designer-pipeline.cjs" design-system search \
  --root "$SKILL_ROOT" --snapshot references/component-source-catalog.json \
  --kind doc --query "hp ghost bar"
```

Replace the query with either language's scenario term or an exact source ID. Each result identifies
`sourceId: design-pipeline/motion-recipes`, a stable `motion-reference/<source-id>` local ID (or
`motion-recipe/<slug>` for one of the four existing specimens), and `localPaths.guide` and
`localPaths.implementation` relative to `SKILL_ROOT`. For full studies, select the exact source ID
in the gallery or append `#motion=<source-id>` to its local URL. The existing normalizer supplies
namespaced doc identity and metadata hashes; no manual hash or second source resolver is needed.

**Omit `--platform web` for these method records.** That filter remains component-only and excludes
recipes even when the snapshot is supplied. Generic search defaults are unchanged; these commands
explicitly select the component-source snapshot rather than relying on the default Astryx index.

## Adapt within existing authority

Apply the [animation opportunity screen and review](../animation-opportunity-and-review.md) and
[UI transition rules](../ui-transition-rules.md) before adopting a treatment. User decisions,
project `DESIGN.md`/`MOTION.md`, current semantic primitives and runtime owners govern. Specimen
values are original starting points for inspection, not measured reference timings or a token
scale to import. Keep a static result when frequency, function or the project budget rejects motion.

Record the selected source, adaptation and limits in existing `reference.md`, motion decisions in
`motion.md` or the phase task record, and playback/interruption/reduced-motion evidence in `qa.md`.
Use existing interaction/motion verification when applicable. A catalog match or successful
specimen playback does not grant the owner's Visual Acceptance or create another gate/receipt.

## Provenance and reuse boundary

[Motion Reference](https://motion-reference.takayustudio.jp/) is external inspiration only.
The preceding research played HP ghost bar and Icon Morph; cooldown/reward inspiration is limited
to written catalog descriptions. No source timing measurement is asserted. The menu recipe is a
project-authored state/focus application, not a claim that the Icon Morph demonstration implements
an accessible menu.
Full-inventory records use `catalogue-metadata` observations only. Their displayed source
durations/easing and authored study timelines are separate; neither supplies production tokens.
Family guides document the original mechanism and adaptation rationale instead of copying
source descriptions. A mechanism study does not inherit real pointer, scroll, menu, combat or
film ownership from the reference title.

The packaged guides, recipe parameters and DOM/SVG specimens are original project-owned work.
No external source code, snippets or assets are copied or vendored. Catalog license evidence points
to those local deliverables; it does not grant rights to the external site. External redistribution
licensing is unverified and remains separate from project ownership. Consult each guide for the
specific observation and adaptation boundary.

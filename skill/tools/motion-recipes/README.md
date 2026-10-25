# Offline Motion Recipe Specimens

Open the [full gallery](full/index.html) or one standalone HTML specimen directly in a browser
(`file://`); no server, package install, fetch, remote dependency or film project is required.
The gallery provides exact full-catalogue mechanism variants; the four project-authored DOM/SVG
specimens below remain state-owned [motion recipes](../../references/motion-recipes/README.md).
Both are adaptation studies, not another production runtime or a prescribed product style.

| Product scenario | Open locally | Read before adaptation |
| --- | --- | --- |
| 血条拖尾 / hp ghost bar | [hp-ghost-bar.html](hp-ghost-bar.html) | [HP ghost bar guide](../../references/motion-recipes/hp-ghost-bar.md) |
| 冷却完成 / cooldown completion | [cooldown-completion.html](cooldown-completion.html) | [Cooldown completion guide](../../references/motion-recipes/cooldown-completion.md) |
| 奖励到账 / reward arrival | [reward-arrival.html](reward-arrival.html) | [Reward arrival guide](../../references/motion-recipes/reward-arrival.md) |
| 菜单切换 / menu switch | [menu-switch.html](menu-switch.html) | [Menu switch guide](../../references/motion-recipes/menu-switch.md) |

## Full catalogue inspection

Use the gallery's bilingual search, group/category filters and native variant selector.
`full/index.html#motion=<exact-source-id>` addresses one variant directly. Errors are explicit:
unknown IDs, ambiguous records and unsupported parameters do not select a fallback.

Play/pause, replay, seek, reverse, reduced motion and editable CJK/Latin text all inspect the
exact selected catalogue parameter set. Switching variants disposes the previous study.
Playback starts only on request; system reduced-motion preference initializes the checkbox.
Read the displayed [family guide](../../references/motion-recipes/README.md#full-mechanism-discovery--全类机制入口)
before production adaptation, particularly when the study timeline replaces real pointer,
scroll, input, game state or film-render ownership.

For maintainers, the canonical source is `references/component-source-catalog.json`.
`node tools/motion-recipes/full/build-data.cjs` (from the skill root) derives `data.js` only;
append `--check` to compare without rewriting. The helper validates the independent factual
inventory and actual module validators. This supporting helper is not a pipeline command/gate.

## Inspect one scenario

1. Read the matched guide's controls and rendered acceptance cases, then open the HTML file.
2. Use its named semantic controls and read the current state. Exercise normal playback and the
   guide's rapid-input, reverse/cancel and reset cases where applicable; inspect state during the
   motion, not only after it ends.
3. Exercise the visible reduced-motion checkbox and system `prefers-reduced-motion`. Essential
   values, availability, order and menu operation must remain correct without decorative travel or
   repeated emphasis. Check keyboard operation and focus as well as the pixels.
4. Adapt only the needed state/visual behavior into the project's current renderer and semantic
   primitives. Replace study values with suitable existing project tokens; do not import the
   specimen's style or timing as a new foundation.

Each page identifies itself with `main[data-recipe="<slug>"]` for scoped inspection. That marker is
not a public artifact schema or testing API. Pages expose readable state and ordinary controls,
not a separate verification engine.

## Authority and evidence

The [recipe index](../../references/motion-recipes/README.md#find-a-recipe-through-the-existing-catalog)
shows Chinese/English discovery through existing `design-system search --kind doc` and the supplied
snapshot. Method searches omit `--platform web`, whose component-only behavior is unchanged.

The [opportunity/review contract](../../references/animation-opportunity-and-review.md),
[UI transition rules](../../references/ui-transition-rules.md), project motion tokens and existing
interaction/motion checks govern adoption. Record observed playback, interruption, reduced motion
and focus in the task's existing motion/QA evidence. Do not infer visual acceptance from technical
success or add a new gate/receipt.

Code and recipe parameters are original project-owned work. External
[Motion Reference](https://motion-reference.takayustudio.jp/) observations are attributed separately
in the guides; no source code/assets are included and no external redistribution license is
asserted. A source demonstration's full duration is not a measured functional transition budget.

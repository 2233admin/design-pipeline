# Game feedback, spatial UI and material studies / 游戏反馈、空间界面与材质

These are **original teaching studies**, not copied animations or a gameplay runtime. The 107 source identities are factual catalogue observations; their short titles inform mechanism selection, not a claim of frame-for-frame visual review. Open [the offline gallery](../../../tools/motion-recipes/full/index.html) and choose the exact `#motion=<source-id>` recorded in the existing catalogue. Search by Chinese scenario or English mechanism using the existing `design-system search --kind doc` route; omit the component-only `--platform` filter.

## Choose a product question / 从产品问题选型

| Product question / 场景 | Channel to inspect | Production authority |
| --- | --- | --- |
| 血量变少了多少？/ How much HP was lost? | Immediate HP value plus delayed remainder, not an interpolated game value | Current HP, damage/heal event sequence |
| 技能是否可用？/ Is an ability ready? | Deadline ring clearance and checkmark; active buffs keep their own lifetime | Engine deadline and availability |
| 有没有击中、破防、连击？/ Was the hit accepted? | Crosshair contraction, fractured guard, per-hit counter, time-held impact scene | Accepted combat event; simulation clock |
| 奖励是否入账、结果是什么？/ Was the reward granted? | Wallet arc, coin gravity paths, hinged chest, occluder/card reveal | Idempotent grant ledger and preselected outcome |
| 经验跨级、任务下一步是什么？/ What was carried or unlocked? | XP quotient/remainder, persistent nodes/connectors, tier or collection coverage | XP, unlock/claim rights and current task |
| Boss/开局/胜败需要读多久？/ How should a cinematic beat read? | One-shot warning, integer countdown, title hold, matte/focus, result dissolve | Start/result signal and skip/input policy |
| 控件在空间哪里、选中了谁？/ Where is a spatial target? | Real perspective projection, hit selection, orbit/depth ordering | Logical identity, focus, actual renderer coordinates |
| 应有何种柔软、折叠、玻璃或冲击感？/ What material or impact should read? | Analytic deformation, generated-image sampling/compositing, authored fractures/field geometry | Actual control state, not a material drawing |

## Runtime boundary / 业务与表现分离

`game.js` exports the 47 HUD/combat/reward/progression/cinematic descriptors and merges 20 spatial, 20 material and 20 impact descriptors. CommonJS requires its three helper files. In the classic offline browser, load **`game-spatial.js`, `game-material.js`, `game-impact.js` before `game.js`**. The helpers accumulate `MotionGameParts`; the complete module registers `MotionRecipeModules.game`. No DOM is read at import, no upstream fetch is made, and no external assets or runtime are required.

Every descriptor has `validate(parameters)` and `create(stage, parameters, { reducedMotion, text, seed })`. Parameters are complete and explicit in each catalogue mapping; missing, unknown, unsupported or inconsistent values throw. `seek(progress)` accepts a finite absolute fraction in `[0,1]`; the gallery owns playback and reverse inspection. Instances build their own DOM/SVG/Canvas once, sample absolute presentation state rather than integrate frame deltas, and `dispose()` removes their owned content/listeners. Changing the seed creates another reproducible study; reverse seeking does not reroll geometry or prizes.

**Never attach HP, availability, grants, simulation hits or current navigation state to timeline completion.** The state study already displays the committed logical fact beside a separate animated presentation. The HP damage button, caller-deadline toggle and new-grant button are small native study event inputs: each click updates local event authority immediately, then resets only its presentation. The parameter object supplied by the catalogue is copied before local changes; a replay or seek never commits the event. The other native inspect button explains that boundary, not a gameplay action. Real interaction semantics should be taken from the retained [HP](../hp-ghost-bar.md), [cooldown](../cooldown-completion.md), [reward](../reward-arrival.md) and [menu](../menu-switch.md) specimens; they remain unchanged.

These browser studies are **not** engine callbacks, saved game state, an accessibility-complete 3D menu, audio spatialization, physical cloth/fluid solvers, or a real gacha/financial reward system. A parry-window cursor is a visual interval study, not a collision/acceptance detector. The countdown does not start the engine. An optical surface is an explicitly stylized study of original generated geometry/imagery, not a claim of physically correct rendering.

## Adapt in the current renderer / 接入现有 primitive 与平台

Use the existing [opportunity screen](../../animation-opportunity-and-review.md), [UI transition rules](../../ui-transition-rules.md), `DESIGN.md`, `MOTION.md` and **current project tokens**. Choose the existing semantic primitive if one already owns this change; do not invent a new primitive ID from a recipe title. Study colors, 480×270 canvas, curve, phase fractions, 2s/2.6s/3.2s teaching duration and author samples are not a new motion-token scale. Replace them with the project’s purpose-specific feedback/overlay/cinematic budget, including delays and the last staggered item.

- **DOM/CSS / 网页界面:** use the existing state owner, stable keyed controls and current focus/keyboard policy. Copy the mathematical relationship only where appropriate. Keep real readable values in semantic DOM; a decorative SVG/Canvas proxy is not another accessible button. A card flip uses actual perspective and two backface-culled DOM faces, not `scaleX` pretending to be geometry. Native menu/select inputs remain operable in no-motion mode.
- **SVG / HUD:** use persistent paths, circles, strips and clip regions; map authored coordinates to actual measured viewport/target bounds. Translate damage/marker directions through the real camera projection, not a guessed screen direction. Maintain immediate logical labels outside temporary particles.
- **Canvas / material and composite:** adapt the explicit path/field/displacement channel to the renderer already in the project. Prebuild geometry, sample seeded analytic positions and use actual source-image sampling for optical distortion. Keep persistent controls in DOM. Do not ship these fixed-size illustrative drawings as a substitute for a required renderer.
- **Game engine / 游戏引擎:** bind to accepted event IDs and engine clock/state; use engine-owned HUD, meshes, particles, materials and camera. Hold only the appropriate presentation action clock for hit-stop; never pause the wrong network/physics/UI owner. Keep fixed HUD independent from a kicked scene camera. Use real depth/raycast/focus information when replacing spatial studies.
- **Film/edit / 影片与剪辑:** the cinematic/impact examples can inform an authored held frame, slash matte or typography beat. Retain the existing film/edit route and real footage/artwork/rig, not an ordinary UI converted into a film workflow. No implicit sound playback or synchronized source audio is supplied.

## Frequency, interruption and no motion / 频率、打断与减弱

Routine repeated hits, timers, keyboard navigation, dense status updates and resource caps often need **static immediate updates**, not replayed entrances. Reserve rewards, rank changes and victory holds for actual rare committed events. No fake warning should appear merely because a gallery item mounted. Do not delay reading, access or claim rights for a decorative beat.

The absolute seek contract is an inspection model, not a production retargeting policy. In a live HUD, newest accepted state wins: update logical HP/balance/deadline immediately, carry the currently visible trail to the new target if the existing primitive supports it, otherwise settle that presentation directly. Never queue obsolete damage, complete an old grant twice, let an exit callback hide a newer quest, or accept a hit based on a screen cursor. Recompute actual target geometry after viewport/camera/content changes; cancel stale motion and release owned resources on removal.

Reduced motion renders a fixed readable result independent of progress: final logical values for bars/counters/unlocks, one interior readable frame for an ephemeral ping/number/rain/dissolve or quest banner, the middle of the displayed parry window, and static selected spatial/material/impact state. That snapshot contains no travel, shake, flashing or repeating accent as `seek` changes. Preserve the persistent status label even when particles are absent. A production no-motion version should normally omit the decorative layer entirely while retaining semantic values, input, focus and the actual result.

## Provenance and licensing / 来源与授权边界

[Motion Reference](https://motion-reference.takayustudio.jp/) is inspiration. Each existing catalogue entry retains its exact source ID, title, category, link and source-displayed action/loop duration/easing. These values were observed as **catalogue metadata**, not a measurement of the new teaching timeline or evidence that every original source animation was played. Original Chinese scenario names, mechanisms, parameters, drawings, code and adaptation text are project-authored. No upstream code, descriptions, fonts, textures, models or other assets are copied.

Upstream redistribution licensing is **unverified**. Project-owned original studies can be reused under the project’s existing ownership/license evidence; that does not grant permission to redistribute the external site, its exported snippets or assets. Record adopted source/adaptation/limits in existing `reference.md`, motion decisions in `motion.md` or the phase task, and actual playback/reverse/reduced/input/cleanup evidence in `qa.md`. Successful selection or mounting is not owner Visual Acceptance and creates no new gate or receipt.

# HP Ghost Bar / 血条拖尾

Chinese scenarios and keywords: 血条拖尾、血条残影、血条、生命值、受伤、扣血、残影血条、连续伤害、回血、游戏 HUD. English: health bar, HP trail, ghost bar, damage feedback, healing.

[Open the offline specimen](../../tools/motion-recipes/hp-ghost-bar.html). Open the HTML directly with `file://`; no server, dependency install or remote asset is required. This is original project-owned code and guidance, not a source-site implementation.

## Purpose and opportunity

**One purpose: state indication.** Immediate current HP answers “how much remains”; a quiet, short-lived striped remainder answers “how much was just lost” on the same 0–100 basis. HP and the controls never wait for the remainder.

Frequency is occasional or lightly repeated damage feedback. Keep the tail subordinate to the real HP and nearby gameplay. For sustained high-rate combat ticks, dense multi-unit HUDs, keyboard/core navigation, an unchanged value, first mount, or an already-clear static damage readout, choose **no motion**: align both layers immediately. Do not add shake, flashes, numerical reels or an idle pulse. Healing is also immediate in this recipe; it does not play a reversed damage trail.

Run the [animation opportunity screen](../animation-opportunity-and-review.md#1-opportunity-screen-before-implementation), then apply [UI transition rules](../ui-transition-rules.md), especially TR-01, TR-05, TR-06, TR-09 and TR-10. The [game UI profile](../game-ui-and-narrative.md) governs semantic state, input and comfort. Target-project `DESIGN.md` and `MOTION.md` override example styling and tuning.

## State and trigger contract

- **Authoritative:** numeric `hp`, clamped to 0–100, committed synchronously on accepted damage/heal/reset. The visible number and meter semantics always expose this value.
- **Presentation only:** `ghost` and at most one `trail = { from, to, start }`. The striped layer cannot grant health, absorb damage, determine death, or write HP on completion.
- **Trigger:** a damage event lowers HP. Start at the presentation sampled at that event's monotonic timestamp; target the new HP. Keep the left edge fixed and animate only the remainder's horizontal scale.
- **End:** the visual trail reaches current HP and releases its request loop. No animation-end callback has semantic authority.
- **Same value:** clamping at 0/100 creates no new trail. Reset aligns even if the number is unchanged.

The specimen's sampled scalar uses a hold followed by linear interpolation. It does not read DOM geometry per frame or scale the text. On a repeated damage event, sample the old presentation **before** cancelling its owner; never restart from 100, the previous target, or a queued historical value.

## Phases and tuning

These are original local specimen values, not new project defaults or source measurements.

| Phase | Specimen value | Meaning and tuning boundary |
| --- | --- | --- |
| Commit | 0 ms | HP, text and meter change immediately. Never add an input delay. |
| Hold | 80 ms | Briefly retain the current presentation so the lost amount can be read. Reduce to zero if damage frequency makes it distracting. |
| Settle | 180 ms, linear | Shrink to the current HP with no overshoot. A scalar remainder needs no spring. |
| Rest | No loop | Both layers align; no work remains until the next real change. |

The whole damage interval is **260 ms**, including the hold, below the ordinary 300 ms interaction budget. At repeat input this interval retargets; it is not a queue. High sustained frequency is a reason to remove the effect, not lengthen it until all hits are visible. Keep any target adaptation's whole interval within its existing budget. A longer explanatory exception needs an explicit reason in the existing motion record.

### Primitive and token mapping

The current `motion-primitives.json` has no semantic ID for a held HP remainder. In particular, `response.spring-settle` would falsely imply a spring-damper response. Use the **platform DOM `transform: scaleX` channel**, left-center origin, with an owned sampled linear interpolation. Do not invent a taxonomy ID.

Map hold and settle to existing target-project delay/feedback duration tokens, linear interpolation to its applicable easing token, and solid/striped colors to health/damage/track tokens. If no suitable token exists, record this bounded authored choice in the target's existing `motion.md`; do not create another token scale. Repository `MOTION.md` is static and `DESIGN.md` defines no shared graphical palette: specimen constants and CSS custom properties are examples only.

## Repeat, healing, cancel and cleanup

- **Repeated damage:** sample current tail, replace the one owner, lower authoritative HP immediately and retarget. A new hit during settlement must not jump back to an older start. The rapid ×3 control issues three separate synchronous −10 events; it is not a hidden timed sequence.
- **Healing/reversal:** cancel the trail and align both values immediately at the healed HP. A damaged tail cannot resume after healing.
- **Reset:** cancel the RAF and clear the trail, then set HP and ghost to 100. No old callback may restore a lower value.
- **Reduced-motion change mid-run:** cancel and align immediately. Disabling reduced motion later does not replay old damage.
- **Background return:** resample the current monotonic presentation; an expired trail settles immediately instead of advancing by a fixed per-frame increment.
- **Page exit:** `pagehide` cancels the loop, aligns at current HP and aborts document/preference listeners. A back-forward cache return rebinds controls, retaining HP but not replaying the trail. When adapting into a mounted component, give equivalent cancellation and listener disposal to that component's owner.

## Accessibility and reduced motion

Use named native buttons, a labelled meter and readable `N / 100 HP` text. The ghost is decorative and is not a second health meter; its striped pattern and textual legend prevent color-only meaning. Presentation diagnostics are not live regions. Only deliberate event summaries use a polite status; do not announce interpolated trail values every frame. Input stays available throughout playback, with no focus transfer.

The checkbox starts checked when the system requests reduced motion. Effective reduction is **system preference OR checkbox**; unchecking cannot override an active system preference. Reduced motion keeps the exact same HP updates and summaries while removing hold and interpolation. The page names the active mode. Fonts are local system/CJK fallbacks, with no downloaded font and no fixed-width text block.

## Specimen controls and visible acceptance cases

Scope selectors to `main[data-recipe="hp-ghost-bar"]`.

| Control or case | Expected rendered result |
| --- | --- |
| Initial load | `#hp-value` is `100 / 100 HP`; `#health[aria-valuenow]` is 100; phase `#phase` is Aligned. No mount animation. |
| `#damage` | HP becomes 80 immediately; striped `#ghost-fill` waits, shrinks, then aligns in 260 ms. `#phase` moves Holding → Settling → Aligned. |
| Damage again while settling | HP becomes 60 immediately; the tail retargets from its current size, not full HP or the old destination. |
| `#heavy-damage` | Removes 45, clamped at zero. Depleted state is text/meter state, not a fade or hidden control. |
| `#burst` after reset | HP becomes 70 immediately; one latest trail settles at 70, with no replayed queue. |
| `#heal` during a trail | Adds 25, capped at 100; both layers align immediately and remain aligned after old timing expires. |
| `#reset` during a trail | HP and ghost become 100 immediately; old damage never returns. |
| `#reduced-motion`, then damage | Latest HP and meter update; `#trail-value` aligns immediately, `#phase` stays Aligned, no moving remainder. |
| Keyboard and narrow/zoomed viewport | Tab reaches all controls, Enter/Space operate native buttons, focus is visible, text wraps without blocking controls. |

Additional state selectors: `main[data-state="healthy"|"depleted"]`, `#status`, `#motion-mode`, `#hp-fill`, `#trail-value`. Observe playback as well as resting screenshots. Record exercised cases and any unverified behavior in existing `qa.md`; these expected cases are not a runtime result or owner Visual Acceptance.

## Source inspiration and evidence limit

[Motion Reference: HP ghost bar](https://motion-reference.takayustudio.jp/#motion=catalog-game-hud-hp-ghost-bar) supplied the product scenario. The preceding research played that reference and inspected its displayed parameters: **400 ms ghost wait + 500 ms settlement**, within a **2800 ms showcase**. The displayed values are source metadata, not independently measured playback timing or a recommended interaction delay. The source separates immediate current HP from a trailing visual remainder.

The original recipe instead authors an 80 ms hold + 180 ms settlement, its own controls, markup, palette and state model. No upstream code, assets, exported snippets or timing table are imported. The link is observation provenance only; external redistribution licensing remains unverified and is not permission to copy. Searchability, source attribution and technical checks do not grant Visual Acceptance.

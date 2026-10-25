# Cooldown Completion / 冷却完成

Chinese scenarios and keywords: 冷却、冷却完成、技能可用、倒计时、技能恢复、护盾、游戏 HUD. English: cooldown completion, ability ready, countdown, progress ring, restart, cancel.

[Open the offline specimen](../../tools/motion-recipes/cooldown-completion.html). Open the HTML directly with `file://`; no server, install or remote dependency is required. Guidance and DOM/SVG code are original project-owned work, not a source-site implementation.

## Purpose and opportunity

**One purpose: state indication.** The countdown answers “when can I use it again?”; one restrained completion cue marks the transition to Ready. The ability becomes available when the current deadline expires, not when the cue ends.

Frequency is occasional ability recovery. Use a short cue only if the player benefits from noticing this particular readiness transition. For many simultaneous cooldowns, continuous auto-recast, dense operational HUDs, already-obvious static state, keyboard/core navigation or unchanged Ready state, choose **no completion motion**. Preserve readable countdown/Ready feedback without an idle pulse, shake, flashing or repeated emphasis.

Run the [animation opportunity screen](../animation-opportunity-and-review.md#1-opportunity-screen-before-implementation); follow [UI transition rules](../ui-transition-rules.md), especially TR-01, TR-04, TR-05, TR-06, TR-09 and TR-10, and the [game UI profile](../game-ui-and-narrative.md). The target project's `DESIGN.md` and `MOTION.md` govern appearance and budget.

## State and trigger contract

- **Authoritative:** at most one run with identity, duration and a deadline on the page's monotonic `performance.now()` clock. A timestamp comparison decides whether that run is still cooling down.
- **Derived presentation:** remaining seconds, elapsed progress, SVG arc, Ready/Cooling down label and native button availability. Neither the SVG path nor a completion callback is the state source.
- **Completion:** when the current run reaches its deadline, remove that run before incrementing the completion count, setting Ready and optionally showing a cue. A consumed run cannot complete twice.
- **Trigger:** Start/restart sets a new deadline; Use ability also increments the use count exactly once before starting. Selecting a duration affects the next run only.
- **Cancel:** remove the current run and cue, return to Ready without incrementing completions. This is a demonstration policy, not a prescribed game rule; in a target game the product's cancellation policy owns availability.
- **Reset:** cancel everything, clear both counters, restore the next-run duration to 3 seconds, and show Ready without a cue.

A deadline timeout only wakes the owner to reevaluate the current timestamp; an early wake reschedules the remaining interval. RAF samples the same state for presentation. Both paths check run identity, so superseded callbacks cannot complete a newer run. Completion does not wait for `animationend`, a WAAPI finish promise or the progress arc to reach its last rendered frame.

## Phases and tuning

These values are original specimen parameters, not a new project default scale or measurements of the external source.

| Phase | Specimen value | Meaning and tuning boundary |
| --- | --- | --- |
| Start | Immediate | Disable the ability and replace any previous run/cue before scheduling work. |
| Product countdown | 3 s default; selectable 1.5 / 3 / 6 s | Remaining time and progress derive from the current deadline. This is product/game time, **not** an interaction-animation duration. |
| Ready commit | First deadline reevaluation at/after expiry | Make the ability available and increment genuine completions once, before the decorative cue. Browser suspension may delay execution; on return reevaluate current time immediately. |
| Completion cue | 180 ms, linear | One outer ring fades 0 → 0.8 → 0 while scaling 0.96 → 1 → 1.025. Peak occurs at 35% of the interval; no oscillation or loop. |
| Ready rest | No loop or timers | Keep the static arc/Ready label and available ability. |

The **whole completion cue is 180 ms**, below the ordinary 300 ms interaction budget; it is independent of the multi-second cooldown. Keep input available at Ready even if the cue is playing. Do not add a post-countdown delay. In adaptation, reduce or omit scale/opacity emphasis when frequency or prominence makes it distracting. Do not copy a showcase timeline into a game cooldown.

### Primitive and token mapping

The sampled normal-mode SVG arc matches existing **`reveal.trim-line`**: its visible arc length represents explicit progress using the SVG `path.progress` channel (`stroke-dasharray`/`stroke-dashoffset`). Its state-driven deadline mapping is project-authored. This does not imply adoption of a registry runtime adapter or source implementation: the local specimen uses native SVG and JavaScript directly, with no added library.

The short completion accent has **no matching semantic registry ID**. Use platform SVG/WAAPI `opacity` and `transform: scale` channels, centered at the dial; do not call it `response.spring-settle` because there is no spring. The progress and cue circles are decorative proxies for one semantic progress indicator, not duplicate controls.

Map cooldown duration to the product's gameplay configuration, the 180 ms cue to its existing feedback duration token, the linear progress/cue curves to applicable easing tokens, and ring/text/track colors to its status tokens. SVG path-length work is justified by a small, single progress ring; do not turn it into many expensive per-frame HUD paths without target performance evidence. No layout measurement is needed. Repository `MOTION.md` has static posture and `DESIGN.md` has no shared graphical palette: local constants/custom properties are demonstration choices only. Record any necessary authored adaptation in existing `motion.md`, not a new token system.

## Restart, cancel, reset and cleanup

- **Restart near expiry:** clear the old RAF, deadline timer and cue, create a new identity/deadline and show the new countdown immediately. The old run cannot unlock the ability or increment completions.
- **Cancel/reset during a cue:** cancel its WAAPI instance and clear its bounded cleanup timer. A generation check prevents stale cleanup from clearing a newer cue. Cue cleanup never changes ability state or counts.
- **No idle replay:** completion removes the current run; no new run means no new cue. Initial load, cancel, reset and duration selection do not count as genuine completions.
- **Reduced motion during a run/cue:** keep the deadline; hide the moving arc and cancel any active cue. Countdown text and semantic progress continue. An expired run is still consumed and counted once, even when its decoration is suppressed. Turning reduction off does not replay an already-consumed completion.
- **Background/throttling:** no fixed per-frame subtraction. The visibility-return path reevaluates the same monotonic deadline. The specimen is a page-local clock, not a persistent cross-device/wall-clock game service.
- **Page exit:** `pagehide` cancels run, cue, timers and RAF and aborts document/preference listeners. On a back-forward cache return, controls rebind in Ready state, retaining counters but not resuming an old cooldown. A mounted target component needs equivalent owner disposal; persistence across navigation is a separate product decision, not this visual recipe.

## Accessibility and reduced motion

Native buttons/select provide keyboard operation and visible focus. `#ability` is natively disabled only while the current run is active; restarting/cancelling does not move focus. Readable Ready/Cooling down text and numeric time carry meaning independently of color or arc movement. A labelled semantic progressbar exposes elapsed percentage and remaining-time text; only event transitions use a polite live status, never frame-by-frame countdown announcements. The SVG arc and outer cue are `aria-hidden`.

Effective reduction is **system `prefers-reduced-motion` OR the visible checkbox**; the checkbox initializes from the system setting and cannot force motion while the system requests reduction. Reduced mode hides the arc instead of progressively drawing it, removes cue scale/fade, and retains track, countdown, Ready label, availability and counts. No delayed semantic result depends on a zero-duration animation. If WAAPI is unavailable, readiness/countdown still work and the optional completion accent is omitted. All text uses local system/CJK font fallbacks.

## Specimen controls and visible acceptance cases

Scope selectors to `main[data-recipe="cooldown-completion"]`.

| Control or case | Expected rendered result |
| --- | --- |
| Initial load | `main[data-state="ready"]`, `#state` Ready, `#remaining` 0.0 s, `#ability` enabled, `#completion-count` 0, no cue. |
| `#start` | Starts/restarts using `#duration`; `main[data-state="cooling"]`, ability disabled, deadline-based countdown/arc. It does not increment `#use-count`. |
| `#ability` | From Ready, increments use count once and starts the selected cooldown. Cannot activate while disabled. |
| Genuine expiry | Ready and enabled ability appear independently of cue cleanup; completion count increases by exactly one. Normal mode shows a single 180 ms `#completion-cue`. |
| Restart just before expiry | New full countdown replaces old progress. Old expiry never adds a completion or unlocks the new run. Only the new run may complete. |
| `#cancel` while running or cueing | Ready immediately, count unchanged, cue removed. Wait past the old deadline: no late cue or completion. |
| `#reset` while running or cueing | Ready, both counters 0, duration 3 s, cue removed; old timing cannot restore anything. Motion preference remains selected. |
| `#duration` change during a run | Current deadline stays unchanged; next Start/Use uses the newly selected duration. |
| `#reduced-motion` during run, then expiry | Text/semantic progress continue; arc hidden, no moving cue, Ready/count/availability still correct. Uncheck after expiry: no replay. |
| Wait at Ready beyond several prior durations | Completion count and Ready state remain unchanged; no idle loop. |
| Keyboard and narrow/zoomed viewport | Tab reaches enabled controls, Enter/Space operates buttons, select works natively, focus stays visible and copy wraps. |

Additional selectors: `#cooldown-progress[aria-valuenow]`, `#progress-arc`, `#status`, `#motion-mode`, `#use-count`, `main[data-cue="active"|"inactive"]`. The cue-state attribute names presentation ownership, not product availability; inspect actual playback, not that attribute alone. Record exercised normal, interruption, background and reduced cases in existing `qa.md`; a resting screenshot, source reading or successful discovery is not a runtime pass or Visual Acceptance.

## Source inspiration and evidence limit

[Motion Reference: cooldown ability](https://motion-reference.takayustudio.jp/#motion=catalog-game-hud-cooldown-ability) provides the named countdown-completion scenario through its catalog label/description. Its playback and timing were **not measured for this recipe**. Do not claim a measured source curve, sequence, duration or behavior.

The 3-second selectable countdown, 180 ms cue, state model, controls, SVG, typography and palette are authored here. No upstream code, assets, exported snippets or source timings are imported. Attribution is observation provenance, not an external redistribution license; upstream licensing remains unverified. Technical correctness evidence and owner Visual Acceptance stay separate.

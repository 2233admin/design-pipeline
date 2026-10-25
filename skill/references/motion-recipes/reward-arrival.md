# Reward Arrival — 奖励到账

A reward grant updates the authoritative total **immediately and exactly once**. A decorative arrival explains the source-to-wallet relationship; it never authorizes, delays or duplicates the reward.

Chinese scenarios and search terms: 奖励到账、金币收集、任务奖励、钱包更新、奖励飞入。English terms: reward arrival, coin collect, grant, wallet update.

## Use and no-motion decision

Use this occasional feedback for a deliberate quest claim or an infrequent reward acknowledgement when connecting the reward to its destination helps comprehension. Keep the amount readable at once and the wallet usable throughout.

Do **not** fly a coin for every frequent combat pickup, background income tick, keyboard-driven collection or data-dense transaction. Use an immediate labelled total and concise amount message instead. A clear static update, reduced-motion preference or target project's static `MOTION.md` is sufficient reason to choose no motion. Do not add idle sparkle, loops, shake, rolling digits or a queue of arrivals merely to make the wallet look busy.

Apply the [opportunity screen](../animation-opportunity-and-review.md#1-opportunity-screen-before-implementation) before adapting the recipe, then [UI transition rules](../ui-transition-rules.md). The [game state model](../game-ui-and-narrative.md#state-model) governs real rewards. This is presentation after a locally accepted grant, not delivery, network retry or economy infrastructure.

## Local preview

Open [`../../tools/motion-recipes/reward-arrival.html`](../../tools/motion-recipes/reward-arrival.html) directly in a browser, including `file://`. The specimen has no remote dependencies, assets, fonts or installation steps. Every press of **Grant +10 coins** is a separate deliberate local grant.

1. Press **Grant +10 coins**. The total and committed-grant count change immediately; one decorative `+10` coin travels toward the wallet.
2. Press again during the flight. Both grants count; the newest presentation retargets the current coin pose, rather than stacking old journeys.
3. Press **Cancel presentation**. The coin disappears, but the wallet and grant count do not change.
4. Press **Reset wallet** during a flight. The total and count become zero, pending presentation is cancelled and no old arrival can write them back.
5. Enable **Reduced motion** before or during a flight. Movement stops immediately; future grants still update the same readable total and amount message. The system preference takes precedence over the checkbox.

The specimen starts at zero. Reset is explicitly a local demonstration control, not a reversal of a production transaction.

## State and trigger contract

| Concern | Contract |
| --- | --- |
| Authoritative state | Integer total and deliberate grant count; the grant handler updates them synchronously before presentation starts. Production products use their existing accepted-grant state, not this local counter. |
| Trigger | One accepted deliberate grant. A replay of the **visual** cue must not submit another grant. |
| Semantic result | Latest total and a polite text message naming the amount and total; never a counter that waits for a decorative coin. |
| Visual state | At most one decorative, `aria-hidden`, pointer-inert coin and one owned animation. It carries no focusable content or independent announcement. |
| Start/end | Start at the grant control's measured centre, or the existing coin's rendered pose during interruption; end at the wallet centre and remove the proxy. |
| Arrival | Presentation cleanup only. No animation finish, cancel, timeout or geometry callback may modify authoritative rewards. |

The grant handler owns the total. The presentation owner owns only the temporary coin, animation handle and generation. Keep this separation when moving the recipe into an engine or framework: a stopped renderer must not stop a reward being real. Do not special-case repeated deliberate grants as duplicates; each deliberate action in this specimen counts exactly once.

## Phases and adaptation values

These values are **project-authored specimen defaults**, not measured source timings or a shared numerical token scale. Replace them with the consuming project's approved tokens and budget in `MOTION.md` and change-level `motion.md`. This repository's root motion foundation is static and selects no moving primitive; the specimen is an optional authoring example, not animation in the CLI workflow.

| Phase | Specimen value | Purpose and boundary |
| --- | --- | --- |
| Commit | Synchronous, 0 ms delay | Write the total/count and readable grant message before any visual work. Never tune this phase to match a showcase. |
| Flight and fade | 260 ms, `cubic-bezier(.2, .8, .2, 1)` | A single straight translation to the wallet with opacity 1 → 0 and final scale .7. No stagger or hold. A retarget starts from current opacity/transform and lasts at most the same budget. |
| Arrival cleanup | Immediately on the current animation's finish | Remove the decorative visual; no wallet pulse, extra loop or state commit. |
| Reduced/static | Immediate | No coin movement, no scale, no repeated emphasis; keep the amount, total and keyboard behavior. |

Tune duration downward for repeated use, cap the normal UI transition below 300 ms and reject long screen-spanning travel. Keep source and destination close in the HUD composition; if responsive layout moves them far apart, prefer static feedback rather than extending the travel. Use the target project's accent/contrast/safe-area/layout tokens. The specimen's local palette, dimensions and custom properties are not requirements for another game.

## Primitive and implementation choice

Read [`motion-primitives.json`](../motion-primitives.json) before selecting a semantic primitive. Its orbit, path reveal, distortion, procedural curves and spring contracts do **not** describe this one-way bounded arrival. Do not cite `transform.orbit` for a straight flight or `response.spring-settle` for a non-spring ease. Here the adapter is native DOM plus WAAPI `transform`/`opacity`, governed by project tokens and the existing transition rules; no extra runtime is needed.

The specimen samples source/destination geometry once per grant, not per frame. It uses one fixed-position decorative proxy; never clone a real grant control or wallet output. Resize and scroll cancel the flight because its measured coordinates may no longer be valid. On a browser without `Element.animate`, the same grant/result uses the immediate static path. This fallback is an implementation decision, not a claim of runtime verification across browser versions.

### Repeat, cancel and disposal

- **Repeat/retarget:** read the current decorative transform and opacity while the old animation is active; then invalidate its generation, clear its finish handler and cancel it. Start the replacement from that pose toward the current wallet coordinates. There is no backlog and at most one coin. Older amount announcements are replaced by the latest real total.
- **Reverse:** there is no reward-reversal gesture. Cancel only suppresses presentation. A real deduction needs the product's own authoritative transition, not a reverse flight pretending to undo a grant.
- **Cancel:** remove the temporary visual and its animation; preserve total/count. A cancelled callback cannot recreate the proxy or change the latest presentation label.
- **Reset:** cancel/invalidate first, then synchronously reset the local total/count. Subsequent grants begin a fresh presentation.
- **Reduced motion:** effective reduction is system preference OR checkbox. Turning reduction on mid-flight cancels it immediately; turning it off does not replay an old reward. Preference changes are observed live.
- **Layout/background/exit:** resize, scroll, hidden tab and page departure settle presentation without editing reward state. On final teardown, remove media-query and DOM listeners and cancel the owned animation. A back-forward-cached page keeps working controls but no old flight.

No animation promise is used to drive business state. No `transitionend` event or timer is required to make the reward readable. A production grant source already owns acceptance/idempotency; this recipe does not invent delivery/retry machinery or make its visual generation a transaction identifier.

## Accessibility and current transition rules

Use native buttons, a labelled total, tabular numerals, and one polite atomic grant message. Motion never steals focus. The decorative coin is hidden from assistive technology and cannot be clicked or focused. Text describes the amount and wallet independently of color or travel. Rapid grants retain exact values even if a screen reader coalesces polite announcements.

- **TR-04/05:** authoritative text is available immediately; update the wallet value quietly, not a reel or whole-HUD entrance on each grant.
- **TR-06:** latest presentation wins; retarget from the current visual pose and invalidate old cleanup.
- **TR-07:** the displayed total is an underlying comparable amount. No extra directional reel or motion-inferred transaction status is introduced.
- **TR-08:** only real controls/values announce or receive focus; the proxy is decorative.
- **TR-09:** static/reduced mode produces the identical grant and readable amount without completion events.
- **TR-10:** one bounded animation, measured once, no per-frame layout work, no stale proxy/listener on teardown.

Use the existing [animation review](../animation-opportunity-and-review.md#3-review-and-evidence-before-completion) and UI transition manual review matrix; retain their current authority rather than treating this example as a new gate.

## Source boundary

Inspiration: [Motion Reference — Game HUD coin collect](https://motion-reference.takayustudio.jp/#motion=catalog-game-hud-coin-collect). The preceding study used **written catalog metadata only**, describing a wallet-update/arrival demonstration. Playback, detailed curves, frame timing and implementation exports were not verified for this entry. Do not describe this recipe as a measured reconstruction or postpone a real reward to reproduce an illustrative wallet counter.

All code, markup, visual treatment and concrete defaults here were authored for this project. The external link is observation provenance, not an upstream code/asset export or redistribution license. No source code/assets were copied, and no claim is made that all effects on the source site export exact implementations. Record reference decisions in the existing `reference.md`; adaptation belongs in `motion.md`, observed evidence in `qa.md`.

## Rendered acceptance

Exercise the actual offline specimen at intended speed, then interruption and reduced-motion cases. Source reading and successful catalog search do not count as playback evidence.

| Action | Expected rendered/semantic observation |
| --- | --- |
| Grant once; inspect before the flight finishes | Total is 10 and count is 1 immediately. The coin only explains arrival; focus remains on the grant button. |
| Grant five times rapidly from reset | Total is 50 and count is 5 immediately and after all presentation settles; never more than one decorative coin. |
| Grant twice, then cancel mid-flight | Total remains 20 and count 2 after the old flight would have completed; coin hidden, no duplicate grant or stale “Arrived” callback. |
| Grant, reset during flight, wait beyond its budget, grant again | Reset stays 0/count 0; fresh grant becomes 10/count 1, with no old cleanup removing or minting the new reward. |
| Enable checkbox during flight; grant several times reduced | Coin gone immediately; totals remain exact, no queued travel or wallet pulse. Disable checkbox: old rewards do not replay. |
| Load/change system preference to reduce; uncheck checkbox | System preference still gives static grants, the same semantic controls and readable totals. |
| Resize/scroll, hide tab or leave page during flight | Presentation cancels; real total is unchanged. Return from back-forward cache and controls still work. |
| Narrow viewport, zoom, keyboard-only operation | No clipped essential amount, focus visible, controls reachable, coin neither steals focus nor duplicates announcements. |

Parent integration records actual browser/version, observed results, artifacts and unexercised cases in existing QA records. Real performance/feel requires target-device playback; these authored values are not a performance measurement. Technical behavior does not grant owner Visual Acceptance.

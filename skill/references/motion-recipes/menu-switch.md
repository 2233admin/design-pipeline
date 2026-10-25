# Menu Switch — 菜单切换

A meaningful menu/panel switch makes the **latest requested state available immediately**. The icon and panel presentation may settle afterward; their old completion callbacks must never hide, refocus or restore an obsolete view.

Chinese scenarios and search terms: 菜单切换、菜单开关、面板切换、汉堡菜单、图标变形、快速开关。English terms: menu switch, menu toggle, panel switch, icon morph, latest-state navigation.

## Use and no-motion decision

Use this occasional disclosure for a compact game hub, inventory/navigation chooser or a web panel toggle when a short menu-to-close change helps indicate the control's current function. The icon is not the feature: opening must expose actual destinations or controls, and selecting one must operate the product.

For keyboard shortcuts, command palettes, frequent core navigation and repetitive operational menus, choose immediate static state. If text plus `aria-expanded` already makes the toggle clear, omit the morph. Do not copy a demonstration's full timeline, hold a menu disabled while the icon plays or stagger every destination. No idle looping, entrance on mount, blur, spring bounce or animated height is required.

Apply the [opportunity screen](../animation-opportunity-and-review.md#1-opportunity-screen-before-implementation), then [UI transition rules](../ui-transition-rules.md) before adapting. The [game UI state model](../game-ui-and-narrative.md#state-model) owns menu and selected-view state independently of rendering.

## Local preview

Open [`../../tools/motion-recipes/menu-switch.html`](../../tools/motion-recipes/menu-switch.html) directly in a browser, including `file://`. There are no remote dependencies, fonts, copied assets or installation steps.

1. Press **Open menu**. The labelled nonmodal navigation panel is immediately available; the same three strokes change into a close mark.
2. Press **Close menu**, then reopen before exit settles. The latest open request must survive old cleanup.
3. Select **Inventory / 背包** or **Settings / 设置**. The actual view changes immediately, the menu closes, and focus moves to the chosen view's heading. The settings checkbox is a real persistent local preference across view switches.
4. Use Enter/Space on the toggle, Tab through destinations, and Escape to close. Closed/exiting destinations must not receive keyboard focus or intercept pointer input.
5. Press **Settle current motion** while opening or closing. It snaps to the current requested state without reversing the request. **Reset menu and view** closes and restores Overview; it does not reset the separate captions preference.
6. Enable **Reduced motion** before or during a transition. All controls remain functional, latest state settles immediately, and the system preference cannot be overridden by unchecking the checkbox.

This example is a **nonmodal disclosure with native buttons**, not an ARIA `menu`/`menubar`, modal dialog, router or composite keyboard widget. It uses normal Tab navigation, not invented arrow-key semantics or a focus trap. A true modal, route change or menu widget must retain the target product's existing semantics and focus owner.

## State and trigger contract

| Concern | Contract |
| --- | --- |
| Authoritative state | Requested open/closed state and selected view ID. Set them in the user-action handler, not from animation events. |
| Trigger | Toggle action, Escape, destination selection or explicit reset; no queued old requests. |
| Open semantics | `aria-expanded="true"`, panel not hidden or inert, `aria-hidden="false"`, native destination buttons enabled immediately. |
| Close semantics | `aria-expanded="false"`, panel inert and `aria-hidden="true"`, native destination buttons disabled immediately; pointer interception removed. |
| Visual lifetime | An inactive panel may remain painted only for a bounded exit. `hidden` is applied at current-generation exit cleanup, or immediately on static/settle paths. |
| View selection | One current real section; all other sections `hidden` and inert. Selection marks its button pressed and focuses the new heading before the departed section becomes inactive. |
| Focus | Opening keeps focus on the toggle; Tab reaches destinations. Closing returns panel-contained focus to the toggle before making the panel inactive. Escape explicitly returns focus; selecting a destination focuses its view heading instead. |
| Start/end | Current rendered transforms/opacity → latest panel/icon targets. No restart from an obsolete closed/open start pose. |

Keep **semantic state** separate from **visual rendering**. `pointer-events: none` alone does not exclude keyboard or assistive-technology access. During exit the panel may be painted but is already inactive. During entry it is already usable. The specimen also disables native destination buttons while closed, so keyboard exclusion is not dependent solely on `inert` support. Noncurrent content sections are immediately `hidden`, including the inactive Settings checkbox.

## Phases and adaptation values

These are **project-authored specimen defaults**, not source measurements or a shared token scale. Bind your target product's `MOTION.md` and existing motion tokens in its change-level `motion.md`. The repository's root foundation has a static posture; this optional browser study does not change the CLI workflow or install a runtime.

| Phase | Specimen value | Boundary |
| --- | --- | --- |
| Accept request/semantics/focus | Synchronous, no delay | Apply expanded/inert/hidden-view/button availability and focus policy in the action handler. Never postpone input to finish an icon. |
| Panel enter | 180 ms, opacity 0 → 1, `translateY(-8px)` → 0 | Trigger-adjacent panel, one ease-out, no stagger. On interruption, start from its actual rendered pose. |
| Panel exit | 120 ms, opacity → 0, translation → -8 px | Faster deliberate dismissal. Panel already unavailable to keyboard/pointer/AT. Apply final `hidden` only for the still-current close. |
| Icon | At most 160 ms; capped to panel duration | Same top/bottom strokes rotate to ±45°, middle stroke fades. Closing reverses toward the original three-stroke targets. No path-morph engine. |
| Settle/reduced/static | Immediate | Same expanded/view/focus outcome, no translation, rotation interpolation or fade required; final menu/close icon is sufficient. |

All normal transitions use specimen `cubic-bezier(.2, .8, .2, 1)`. Adapt whole-change timing, not just one tween: there is no hold, delay or trailing queue. Keep ordinary menu motion below the existing 300 ms interaction budget, reduce intensity for repeated use and prefer no motion for high-frequency navigation. Use target-project color, typography, safe-area and layout tokens; the specimen palette and dimensions are only a local study treatment. Position the panel near its own trigger; do not convert this recipe into a screen-spanning drawer by stretching its timings.

## Primitive and implementation choice

Read [`motion-primitives.json`](../motion-primitives.json). None of its orbit, reveal, distortion, procedural path or spring contracts is the correct ID for this simple switch. In particular, this icon does not progressively draw a path (`reveal.trim-line`) and its easing is not a spring (`response.spring-settle`). Use native DOM/CSS and WAAPI `transform`/`opacity` with target tokens; no runtime dependency or new semantic primitive is introduced here.

The three icon strokes are decorative spans in one semantic button. Each retained stroke keeps its identity; no duplicated accessible control or path-export code is needed. The panel's text is never scaled or squashed. A browser lacking `Element.animate` gets the immediate static result. Browser support and performance remain things to exercise on the consuming project's targets, not facts proved by these authored defaults.

### Latest-state retargeting and ownership

1. Read the panel/strokes' rendered transform and opacity **before** cancelling old animations.
2. Invalidate the presentation generation, detach obsolete finish handlers and cancel all owned animations.
3. Accept the requested state immediately; update semantics and focus independently of the visual work.
4. Remove final rendering `hidden` before presenting an open state. For exit, keep painting briefly while inert/disabled/`aria-hidden` already exclude interaction.
5. Set the latest resting styles, then animate from captured poses to those targets. A current-generation finish may only settle presentation and apply final `hidden` matching the current request.

There is one owner for panel and icon motion. Avoid CSS transitions simultaneously fighting WAAPI over those properties. Do not attach an unguarded close timeout, queue animation promises, disable the toggle while moving or use `transitionend` as the only source of operability. A rapid open → close → open invalidates the old exit; only the latest request can govern hidden state.

- **Repeat/reverse:** the toggle always acts on current requested state, including while moving; retarget current visuals. Repeated selection uses the latest real view, not an animation queue.
- **Cancel/settle:** cancel owned work and apply latest requested resting styles; do not silently close an open menu. No business state is rolled back.
- **Reset:** restore Overview and close immediately, cancelling pending presentation; if focus belonged to departing content, move it before hiding that content. Reset does not re-submit a view action or change unrelated settings.
- **Reduced motion:** effective reduction is system preference OR checkbox; observe changes live and snap mid-transition. Disabling reduction does not replay an old transition.
- **Resize/background/disposal:** settle at latest state on resize, hidden tab or page departure. On final teardown remove media/DOM listeners and animation handles; on back-forward caching keep working controls but settle all old visuals. No observer, timer or frame loop is required.

## Accessibility and current transition rules

Expose a native labelled toggle with `aria-controls` and synchronized `aria-expanded`. The decorative icon is `aria-hidden`. Give all interactive targets visible focus styles and sufficient target size. The chosen view is actual DOM text; essential meaning is not conveyed solely by shape or color. A nonmodal disclosure does not inert the whole page or trap Tab. Escape is immediate while this panel is open; an integrated product with multiple layers delegates Escape to its existing newest-layer owner.

- **TR-01/02:** a real state change justifies the icon, which retains the same strokes/control identity; no animation on initial mount.
- **TR-03:** panel positioning stays relative to its trigger, no stale measured layout or text scale; resizing settles current state.
- **TR-04:** one coordination owner defines exit painting, without delaying semantic inactivity or current-view availability.
- **TR-05:** target tokens govern the full interval; these local defaults are explicit adaptation values, not a second global duration scale.
- **TR-06:** latest accepted state wins; retarget current poses and guard every delayed hide/cleanup.
- **TR-08:** focus leaves before inactivation; only current controls are available, selecting a destination focuses its real heading, Escape restores toggle focus.
- **TR-09:** static/reduced paths retain the identical state, keyboard order, selection and focus policy without completion events.
- **TR-10:** cancel replacement/teardown animation work; use bounded transform/opacity, no layout loops or persistent promotion hints.

Use the existing [animation review](../animation-opportunity-and-review.md#3-review-and-evidence-before-completion) and transition manual-review matrix. Record applicable UC/TR observations in current QA rather than creating a new menu gate.

## Source boundary

Inspiration: [Motion Reference — Icon Morph](https://motion-reference.takayustudio.jp/#motion=icon-morph). The preceding study played this entry and observed the same strokes change from menu to close. Its canvas also displayed an `aria-expanded` state annotation; this was not verification of a real accessible menu. The source labels the **action duration as 560 ms**, inside a **2400 ms full demonstration**. These are displayed source values, not measured timing or a recommended budget for a functional menu.

This adaptation deliberately uses shorter project-authored UI timings, a real hub-view chooser and explicit interruption/focus behavior. It does not import a full demonstration timeline, copy source code/assets, assert upstream licensing or claim all source entries export exact code. The external link supplies attributed observation provenance only. Keep source decisions in `reference.md`, authored adaptation in `motion.md`, actual playback observations in `qa.md` under existing evidence lineage.

## Rendered acceptance

Use real browser playback at intended speed, then rapid input, keyboard, reduced-motion and narrow-width cases. A screenshot alone cannot prove interruption or focus behavior.

| Action | Expected rendered/semantic observation |
| --- | --- |
| Toggle open once; inspect immediately | Expanded is true, panel available and destinations enabled before panel/icon settles. Toggle retains focus; Tab can reach destinations. |
| Open → close → open faster than exit completes | Expanded remains true, newest open remains visible and interactive after the obsolete exit's budget; no stale hidden write or old focus jump. |
| Close with a destination focused | Focus reaches toggle before panel becomes inert/hidden; exiting buttons immediately excluded from Tab and pointer input. |
| Escape during entry/exit/reopen | Current open menu closes immediately and focus returns to toggle; no later callback reopens, refocuses or hides a fresh request. |
| Select Inventory, then Settings; toggle captions; leave and return | Actual selected section/pressed state changes, other sections hidden, focus on selected heading. Captions choice persists and its inactive checkbox is not keyboard-accessible. |
| Settle while entering, then while exiting | Current requested open/closed state preserved; owned animation gone and final hidden state correct. |
| Reset during animation | Overview current and menu closed, no pending cleanup can hide a fresh open. Reset does not alter captions preference. |
| Enable reduced mode mid-transition; repeat toggle/select/Escape | Latest state snaps immediately, no travel/rotation interpolation; identical selection and focus semantics, no event-dependent wait. |
| System reduce active; uncheck local checkbox | Reduced behavior still effective and fully operable; old transitions never replay. |
| Resize, hide tab or leave page during motion | Latest state settles; no stale animation or focus change. Back-forward-cached controls still operate on return. |
| Narrow viewport, zoom and keyboard-only navigation | Panel within viewport, visible focus not clipped, active content readable and inactive content excluded. |

Parent integration supplies actual browser/version, results and fresh evidence artifacts in existing QA; unexercised cases remain explicitly unverified. Target-device performance and intended-speed feel need real playback. Semantic correctness is technical evidence, not owner Visual Acceptance.

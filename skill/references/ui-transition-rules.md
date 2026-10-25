# UI Transition Rules

Project-owned authoring and manual review contract for ordinary web UI state changes. These rules
are original project guidance informed by the public written methods listed in
[Provenance and license](#provenance-and-license); they are not an upstream skill, copied recipe
collection or component library. The guide is usable offline.

## Applicability and authority

Read this guide before selecting a non-trivial UI transition and when reviewing changed UI motion.
Use it for content/value replacement, expanding layout, overlays, navigation and item movement.
For films, character animation and explanatory beats, retain [animation thinking](animation-thinking.md)
and the film route; do not turn ordinary UI into a film timeline.

Apply the [opportunity screen](animation-opportunity-and-review.md#1-opportunity-screen-before-implementation)
first. Then choose from the map below, record the decision in existing `motion.md` or the phase task
record, implement in the existing runtime and review the rendered result. The
[vocabulary/runtime contract](animation-opportunity-and-review.md#2-vocabulary-curve-and-runtime-contract)
and [review protocol](animation-opportunity-and-review.md#3-review-and-evidence-before-completion)
remain authoritative. No additional file, receipt, runtime or automated gate is required.

[UI craft precedence](ui-craft-sources.md#precedence) governs: user decisions, project `DESIGN.md`
and `MOTION.md`, and existing contracts win. This guide specializes UC-01..07; it does not replace
their purpose/frequency, prominence, timing/easing, interruptibility, origin, reduced-motion or
replay rules. Focus/keyboard/semantics still follow UC-08..11. Do not import gallery durations,
curves, blur strengths or token tables. A conflicting recommendation is recorded as not applicable
with its governing source; it is not permission to break state correctness or accessibility.

**Terms:** a *logical item* is the same product entity across states, identified independently of
its position or DOM node. *Geometry* is its visible bounds, coordinate space, alignment edge and
clip region. A *visual proxy* is a temporary drawing of an item, not another interactive control.
*Retargeting* changes motion toward the newest accepted state rather than replaying older requests.
MUST/MUST NOT mark required review outcomes; SHOULD marks a recommendation whose deviation needs
an explicit project reason. The rules are checked by human rendered review, not a new CLI validator.

## Select by the state change

Choose the least motion that makes the change legible. The effect column contains options, not
mandatory treatments. Source ids refer only to the narrow written observations below; identity,
semantics and fallback requirements are our authored applications of existing project contracts.

| Change and intended read | Optional treatment | Conditions and rejection | Basis |
| --- | --- | --- | --- |
| Status or content is replaced in place: Saving → Saved | Static replacement, short crossfade, or restrained exit/enter | Keep the control/label's anchor; avoid a blank interval that hides the result. Do not treat status words as a numeric trend. | S4, S8 |
| Same value changes presentation or comparison basis: USD → EUR, Week → Month | Neutral in-place replacement; stable alignment | A currency/unit/period switch does not prove growth. Preserve adjacent unit/badge geometry without forcing blur or a width tween. | S8 |
| Same logical surface expands or collapses | Bounded container/layout continuity | Preserve the item and readable content; measure current/end bounds only when needed. Do not squash text to fake a resize. Static is valid if geometry is unavailable. | S3; project extension |
| One selected item becomes its detail representation | Shared-element or local layout continuity | Only if item identity and corresponding bounds are unambiguous. An unrelated item or reused slot MUST NOT appear to morph into it. Otherwise use neutral replacement/static navigation. | Project extension, not an upstream shared-element recipe |
| Trigger-anchored overlay vs page-level modal opens/closes | Subtle origin-aware reveal or static open/close | Apply UC-05 and UC-10: trigger relationship vs center, correct focus, inert background for modals. A fade does not make hidden content noninteractive. | S5; UC rules |
| Known ordered steps or spatially related screens navigate forward/back | Reversible directional transition or neutral replacement | Direction must follow the actual relationship and reverse on back. Unrelated routes, frequent keyboard navigation and unknown relationships need no slide. | S6; project extension |
| List inserts/removes/reorders, or notifications arrive together | Move surviving items; restrained arrival/removal; static order update | Stable item keys, preserved focused item and latest order. Do not replay every survivor's entrance. Notification stack styling does not define generic list behavior or dismissal policy. | S7 for stack coordination; reorder is a project extension |
| A comparable numeric value increases/decreases on the same basis | Static update or quiet changed-digit feedback; directional motion only if meaning is defined | Compare underlying numbers, not formatted strings. Keep unchanged digits still when helpful. Reserve conspicuous reels for an explicitly justified rare event, not routine balances/KPIs. | S2, S9; sign/comparability is project guidance |
| First mount, unchanged value, keyboard/core navigation or repeated dense work | No motion; immediate static feedback | UC-01/04 opportunity rejection applies. Do not add an entrance merely because a component mounted. No motion must still expose state and feedback. | Existing opportunity screen; UC-01/04 |

Before implementation, record target/trigger, before/after state, one purpose, logical identity,
geometry/origin where relevant, selected existing primitive/runtime, timing token and total budget,
entrance/exit relationship, latest-state interruption and cleanup behavior, and static/reduced-motion
substitute. Reuse the existing motion/task fields; do not invent a parallel plan format.

## Individually referenceable rules

### TR-01 — Motion communicates an actual change

Authors MUST pass UC-01's opportunity screen and identify the before/after state, not just name an
effect. **Pass:** the user can say what changed, or the record explicitly chooses no motion because
the static change is clear/high-frequency. **Fail:** unchanged content repeatedly animates, a default
control animates on mount, or decoration delays reading/input. UC-01/04 remain the decision source.

### TR-02 — Continuity preserves logical identity

A continuity transition MUST connect the same logical item. List identity MUST be independent of
array position; a shared visual proxy MUST NOT create duplicate interactive/accessible items.
**Pass:** a selected card/detail or moved row retains its content, selected state and focused control.
**Fail:** sorting reuses a position key so one person's row turns into another, or the wrong card
morphs to the selected detail. When correspondence is ambiguous, use neutral/static replacement.

### TR-03 — Geometry is coherent at the handoff

Authors MUST preserve the intended alignment edge, origin and clip relationship through a layout
or shared-element transition. Recompute or abandon stale geometry after resize, scroll, font/content
changes; do not force continuity from invalid bounds. **Pass:** at narrow width and after resize,
content remains readable and lands on the real target without a second jump. **Fail:** clipped focus,
scaled/squashed text, a proxy landing at an old position, or adjacent units jumping after settlement.
Use UC-05 for origins; an ordinary opacity change needs no shared-element measurements.

### TR-04 — Entrance and exit have one coordination owner

The chosen UI/runtime owner MUST define whether old/new content overlaps or transitions sequentially,
and when outgoing visuals disappear. Product state and operability MUST NOT wait for decorative exit.
**Pass:** one legible result, deliberate layering, no unintended blank frame, and no invisible outgoing
control intercepting input or remaining in keyboard order. **Fail:** two animation owners fight over
one property, removal cuts off a required exit, or outgoing/incoming versions both announce as live
content. Apply UC-02 prominence and UC-10 focus independently of visual lifetime.

### TR-05 — Project timing and easing govern the whole change

Authors MUST select existing project primitives/tokens under UC-03 and its precedence resolutions.
Review the complete interval including delays, stagger, text replacement and layout settlement, not
only one tween. **Pass:** similar purposes share project timing, feedback is immediate and the last
moving item settles within the applicable interaction budget. **Fail:** copying a gallery spring or
counter delay creates a competing scale, or a nominally short tween hides a long cascade. An authored
extension needs the existing motion contract's reason; this guide supplies no new timing constants.

### TR-06 — The newest accepted state wins

Under UC-04, interrupted transitions MUST retarget/reverse from their current visual state where
supported, or settle immediately to the latest valid state. Pending callbacks MUST NOT overwrite,
remove or focus a newer state; do not queue obsolete requests. **Pass:** open-close-open, rapid tab
changes and repeated value updates end at the latest request without jumps to an old start pose.
**Fail:** a close timer hides a reopened modal, old text returns after the new value, controls lock
until playback finishes, or a queue continues after navigation. Unsupported retargeting calls for a
static latest-state fallback, not added infrastructure.

### TR-07 — Direction does not invent meaning

Numeric trend motion MUST use comparable underlying values and a documented direction convention.
Nonnumeric text, unrelated routes and changed currency/unit/comparison basis MUST NOT imply an
unsupported increase/decrease or spatial relationship. **Pass:** reverse traversal reverses a defined
step relationship; comparable numeric updates follow the chosen convention; status and basis changes
use neutral/static replacement. **Fail:** Saved rolls upward as if it is larger than Saving, formatted
strings determine numeric order, or USD-to-EUR appears to communicate a loss. A reel is not proof of
numeric direction and no directional effect is required.

### TR-08 — Semantics and focus follow real state

Motion MUST preserve UC-08..11 keyboard/focus/semantics: visual proxies and outgoing hidden content
cannot duplicate controls or announcements. **Pass:** modal focus is correct on open and restored on
close, Escape closes the newest layer, route focus reaches the new view, and reorder retains the
focused logical item. **Fail:** a faded page is still tabbable, focus goes into a removed proxy,
toasts steal focus, or a hover-only stack makes actions unreachable. Use native semantics; pointer
suppression alone is not keyboard/accessibility state management.

### TR-09 — Reduced motion preserves the result

The reduced/static path MUST preserve state, order, feedback and focus under UC-06; it MUST NOT
depend on a transition-end event that never fires when movement is disabled. **Pass:** reduced motion
shows the latest text, numeric result, open dialog and readable list without nonessential spatial
movement/blur/reels, with the same keyboard behavior and cleanup. **Fail:** removing duration leaves
old text, hidden content, overlapping stack items or a waiting state. Essential progress/status
feedback remains; a zero-duration animation alone does not demonstrate an adequate substitute.

### TR-10 — Motion owns and releases its resources

Apply the existing animation review's cleanup/performance requirements. The implementation MUST
cancel obsolete timers, animation instances, loops, observers/listeners and temporary visual proxies
on replacement/unmount; remove temporary dimensions/styles and restore a readable resting state.
Authors SHOULD use transform/opacity first. Layout/filter/mask work needs the existing explicit
performance reason, not a showcase precedent. **Pass:** repeated changes and leaving mid-transition
produce no late writes, orphan overlays or persistent running work; a trace on the target surface
supports the chosen performance budget. **Fail:** per-item read/write layout thrashing, permanent
promotion hints without need, stale measured widths or expensive blur that breaks the target budget.
Source inspection or a smooth screenshot is not runtime/performance evidence.

## Manual review matrix

Run applicable cases on the actual changed surface, first at intended speed, then the slowed/state
replay and rapid-input, keyboard, reduced-motion, mobile-width, slow-device and interruption cases
required by UC-07. The cases below add transition-specific expected observations, not a new test
runner. Do not call a case passed from code reading alone.

| Case/action | Expected observation | Reject when | Rules |
| --- | --- | --- | --- |
| Saving → Saved, then retry before settlement | Latest status readable at the same anchor; only the real current status announced | Older status reappears, blank interval hides result, or words use numeric trend reels | TR-01/04/06/07/08 |
| 1,299 → 1,305 → 1,298 on one numeric basis | Latest underlying value wins; direction follows documented convention if used; unchanged portion stays stable if chosen | Lexicographic ordering, obsolete queued digits, or motion blocks reading the value | TR-05/06/07 |
| Change currency/unit/period, including short-to-long CJK label | Neutral/static change; alignment, adjacent unit and final text remain readable | Unsupported gain/loss signal, clipped text, stale fixed width or settlement jump | TR-03/07/10 |
| Expand a row, resize/scroll midway, then collapse | Same row/control; geometry retargets or settles statically at real current bounds | Proxy lands at old coordinates, text squashes, focused control clips or vanishes | TR-02/03/06 |
| Select item B from a reordered list and open detail | B, not B's former slot, is the continuity source; one semantic detail view | A morph connects item A to B or clones duplicate focusable content | TR-02/03/08 |
| Open-close-open modal quickly; Escape; repeat reduced-motion | Latest open survives old close work; newest layer closes; focus is correct on every path | Old timer removes reopened surface, faded layers remain tabbable, or focus waits for animation | TR-04/06/08/09/10 |
| Forward/back between related steps; interrupt by another route | Reverse respects defined relationship; latest route and focus win; unrelated navigation is neutral | Same directional entrance on back implies wrong relation, or old route regains focus | TR-06/07/08 |
| Insert/remove/sort with a focused row; several notifications arrive | Survivors retain identity/order/focus; actual actions reachable by keyboard; critical notice policy preserved | All rows replay entrance, focus moves to another item, or hover/visual stacking hides required actions | TR-02/04/05/08; UC-19 |
| Reduced motion, background/throttled clock and unmount during any case | Latest resting state works without end-event timing; no pending work mutates removed/new surface | Old content persists, cleanup waits forever or detached proxies/listeners remain | TR-06/09/10 |

Record applicable TR ids with observed result/artifact and findings in existing `qa.md`, alongside
UC ids (do not duplicate a shared finding). Use Introduced/Regression/Pre-existing and name any
unexercised case. A not-applicable result needs a surface or precedence reason. These are manual
Component Conformance observations, not measured `audit.*` checks, new gate receipts or Visual
Acceptance. Existing `verify interaction` evidence and the owner's actual review still apply.

## Provenance and license

Reviewed public written sources on 2026-10-14 at commit
[`9398105c07dafe877e43197b71c15a10a3b0e3f6`](https://github.com/Jakubantalik/transitions.dev/tree/9398105c07dafe877e43197b71c15a10a3b0e3f6).
The table lists every upstream file consulted. No live animation was watched, no recipe executed,
no paid content accessed and no claim made that the whole library was audited. Source descriptions
are evidence of written methods, not measured feel, browser support or performance.

| Id | Pinned path | Observed method, not an adopted implementation |
| --- | --- | --- |
| S0 | [LICENSE](https://github.com/Jakubantalik/transitions.dev/blob/9398105c07dafe877e43197b71c15a10a3b0e3f6/LICENSE) | Custom transitions/skills license, tooling-only MIT, separate paid/template conditions and reserved website/branding. |
| S1 | [transitions-dev/SKILL.md](https://github.com/Jakubantalik/transitions.dev/blob/9398105c07dafe877e43197b71c15a10a3b0e3f6/skills/transitions-dev/SKILL.md), [transitions-polish/SKILL.md](https://github.com/Jakubantalik/transitions.dev/blob/9398105c07dafe877e43197b71c15a10a3b0e3f6/skills/transitions-polish/SKILL.md) | Surface/action selection and semantic timing/easing refinement; these are inputs to our method, not installed agents or project token defaults. |
| S2 | [02-number-pop-in.md](https://github.com/Jakubantalik/transitions.dev/blob/9398105c07dafe877e43197b71c15a10a3b0e3f6/skills/transitions-dev/02-number-pop-in.md) | Changed digits can move while a common leading portion stays still; direction is configurable. The source does not establish our numeric-sign convention. |
| S3 | [01-card-resize.md](https://github.com/Jakubantalik/transitions.dev/blob/9398105c07dafe877e43197b71c15a10a3b0e3f6/skills/transitions-dev/01-card-resize.md) | Container size changes represent compact/expanded states; not evidence of a general shared-element implementation. |
| S4 | [04-text-states-swap.md](https://github.com/Jakubantalik/transitions.dev/blob/9398105c07dafe877e43197b71c15a10a3b0e3f6/skills/transitions-dev/04-text-states-swap.md) | Status replacement explicitly coordinates outgoing text, content change and incoming text. Its timers/reflow are not our required mechanism. |
| S5 | [06-modal.md](https://github.com/Jakubantalik/transitions.dev/blob/9398105c07dafe877e43197b71c15a10a3b0e3f6/skills/transitions-dev/06-modal.md) | Center-origin overlay, distinct open/close states and exit cleanup; not a complete accessibility contract. |
| S6 | [08-page-side-by-side.md](https://github.com/Jakubantalik/transitions.dev/blob/9398105c07dafe877e43197b71c15a10a3b0e3f6/skills/transitions-dev/08-page-side-by-side.md) | Two related screens have opposing spatial states; a no-slide first-paint option exists. |
| S7 | [32-banner-stacking.md](https://github.com/Jakubantalik/transitions.dev/blob/9398105c07dafe877e43197b71c15a10a3b0e3f6/skills/transitions-dev/32-banner-stacking.md) | Arrivals, surviving depths and departures coordinate; hover spread accounts for pointer geometry. Generic reorder/keyboard/notice policy is our extension. |
| S8 | [34-text-swap-soft.md](https://github.com/Jakubantalik/transitions.dev/blob/9398105c07dafe877e43197b71c15a10a3b0e3f6/skills/transitions-dev/34-text-swap-soft.md) | Neutral in-place replacement distinguishes unit/period/value updates from status steps; aligns text, coordinates width and clears pending replacement work. No guarantee of fully continuous interruption is inferred. |
| S9 | [26-spinning-counter.md](https://github.com/Jakubantalik/transitions.dev/blob/9398105c07dafe877e43197b71c15a10a3b0e3f6/skills/transitions-dev/26-spinning-counter.md) | Conspicuous numeric event is distinguished from quiet update. The recipe describes JS-built reels but later claims pure-CSS orchestration; implementation requirements are unverified and not adopted. |

TR rules and review cases are project-authored applications/extensions of the existing UC and motion
contracts. In particular, stable keys/shared-element identity, comparable numeric direction,
keyboard/focus ownership, robust latest-state retargeting and runtime performance conclusions are
not attributed to an uninspected upstream implementation. We reject universal gallery styling,
mandatory blur/reels, bulk token installation, forced reflow recipes and delayed product state.

**No-copy boundary:** `codeCopied: false`. This change ships original prose and links only: no
upstream snippets, source bundle, paid recipe collection, component implementation or installed
upstream skill. The source catalog remains reference-only with no local implementation paths.
At this pin the transitions/skills license is not MIT; MIT covers only the listed tooling. Free
public transitions/skills need no paid plan, but public visibility grants no Pro/Business seat or
paid Agent access. Templates/themes/starter/UI-kit use has additional plan/retention conditions;
website design, branding and logo are reserved. Do not fetch paid material, infer entitlement or
repackage the library. Any future code adoption needs a separate explicit license/entitlement and
scope decision under existing source governance; this guide does not authorize it.

Change governance: maintain these original rules through a reviewed documentation diff and the
existing OpenSpec process; sync routing/resource links if paths change. The proposal/design for
`internalize-ui-transition-methods` records the adoption decision and source-evidence limits.

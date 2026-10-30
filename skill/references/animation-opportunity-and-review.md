---
sourceMeta:
  id: emilkowalski-animation-review
  kind: github
  url: https://github.com/emilkowalski/skills/tree/d23d7f88a2e21c9e4b1418c7abe420f5c1052ba7
  reviewedRevision: d23d7f88a2e21c9e4b1418c7abe420f5c1052ba7
  reviewedContentHash: fff4cfc7619acb1467b0e3fafac6a4075fead4f7e90711a772af2c0280090139
  contentHashScope: ordered UTF-8 sourceFiles with path-and-newline separators
  sourceFiles: skills/improve-animations/SKILL.md, skills/find-animation-opportunities/SKILL.md, skills/animation-vocabulary/SKILL.md, skills/review-animations/SKILL.md
  reviewedAt: 2026-08-26T00:00:00.000Z
  freshnessDays: 365
  license: MIT
  useBoundary: reference-only; distilled guidance; do not install or execute upstream content
---

# Animation Opportunity and Review

This project-owned reference turns motion intent into a bounded design decision and an evidence-backed
review. It distills the four supplied Emil motion skills named below without installing or copying
their upstream skill files. Use it with `references/motion-foundation.md` and
`references/motion-spec.md`; the foundation and change spec remain authoritative for project
primitives and detailed fields.

Source concepts: `improve-animations`, `find-animation-opportunities`, `animation-vocabulary`, and
`review-animations` from [emilkowalski/skills](https://github.com/emilkowalski/skills/tree/d23d7f88a2e21c9e4b1418c7abe420f5c1052ba7). This reference
is an internal operating contract, not a replacement skill package. Do not install, import, copy, or
execute upstream content from these four skills. `emil-design-eng`, a different skill from the same
repository, is bundled separately as an inert pinned snapshot; see
[ui-craft-sources.md](ui-craft-sources.md#emil-design-eng).

For ordinary UI state changes, read [UI transition rules](ui-transition-rules.md) after the
opportunity screen and during rendered review. It adds state-change selection and observable
cases, not new tokens, automated gates or upstream implementation recipes.

## 1. Opportunity screen before implementation

Run this screen for every non-trivial animation before selecting a runtime or writing implementation
code. Record the answers in `motion.md` or the phase task record.

1. **Frequency** — classify the surface as keyboard/core navigation, frequent repeated work, occasional,
   or rare/first-time. Reject animation for keyboard shortcuts, command palettes, and other high-frequency
   actions. Frequent surfaces may only receive brief, near-imperceptible feedback.
2. **Purpose** — name exactly one purpose: feedback, spatial consistency, state indication, preventing a
   jarring change, explanation, or rare/first-time delight. “Looks cool” is not a purpose.
3. **Function** — ask whether motion helps orientation or comprehension without delaying reading, focus,
   navigation, or input. Keep data-dense and operational surfaces still unless the motion carries meaning.
4. **Budget** — fit the existing motion foundation and interaction budget. UI motion is normally below
   300ms; press feedback is typically 100–160ms, small popovers 125–200ms, and dropdowns 150–250ms.
   Longer modal or explanatory motion must state why it needs the extra time.
5. **Decision** — keep only high-conviction opportunities. If the static transition is already clear,
   or the only benefit is decoration, explicitly record “no motion” and stop.

For an existing motion surface, `improve-animations` is an audit-and-plan route; it must not silently
become an implementation task. For a missing but worthwhile transition, `find-animation-opportunities`
provides a proposal; it does not turn every seam into a wishlist.

For an explicitly broad audit of an app or several surfaces, make the report finite and useful for
decision-making: list evidence-backed findings in priority order, and include representative motion
candidates you rejected with the specific frequency, purpose, function, or budget reason. If no
candidate survives, say so. Do not invent a fixed finding count or keep searching after the relevant
surface classes have been covered. For each finding handed to a low-context executor, put the exact
target and current behavior, the applicable existing token or primitive, the allowed change boundary,
and the rendered check needed to confirm it in the existing phase task record or `motion.md`. Include
the intended-speed feel check and any relevant reduced-motion, rapid-input, reverse, or cleanup case.
This adds an output shape to broad audits; it does not require a new plan directory, fan-out, or
implementation of an audit finding without authorization.

This broad-audit supplement was reviewed against the current
[opportunity scan](https://github.com/emilkowalski/skills/blob/e8a175de22ae1e49370fc144c1f3bb9aeedf988d/skills/find-animation-opportunities/SKILL.md)
and [audit/handoff method](https://github.com/emilkowalski/skills/blob/e8a175de22ae1e49370fc144c1f3bb9aeedf988d/skills/improve-animations/SKILL.md)
on 2026-10-07. The four-file baseline recorded above is retained; this scoped review does not
declare every upstream skill or installed companion current.

## 2. Vocabulary, curve, and runtime contract

Name the behavior before choosing the mechanism. Use `animation-vocabulary` terms such as `enter/exit`,
`scale in`, `origin-aware animation`, `continuity transition`, `shared element transition`, `stagger`,
`spring`, `interruptible animation`, or `scroll-driven animation` so the intent is unambiguous. Then
record the exact project easing token or cubic-bezier, duration, delay/stagger, origin, distance, and
animated properties. Do not invent a parallel curve or duration scale when the project foundation has a
suitable primitive.

The decision must include:

- trigger, target, start state, end state, and one named purpose;
- chosen primitive id and runtime owner, including why CSS/WAAPI or an existing runtime is sufficient;
- easing/curve and duration budget, with separate delay and stagger values;
- repeat, reverse, cancel, rapid-input, and unmount behavior;
- a static or reduced-motion substitute that preserves state, order, focus, and feedback.

Prefer `transform` and `opacity` for ordinary UI motion. Layout properties, filters, masks, Canvas, and
WebGL require an explicit performance reason. Trigger-anchored surfaces must preserve their spatial
origin; dynamic or gesture-driven motion must be interruptible rather than restarting from zero.

## 3. Review and evidence before completion

After implementation, apply the following built-in review to the actual rendered surface, not only
the source. An installed `review-animations` companion may provide extra detail. Review each animation for:

- justified purpose and frequency-appropriate intensity;
- responsive easing, bounded duration, correct origin, and physical continuity;
- interruptibility during rapid input, route changes, resize, and reverse traversal;
- compositor-friendly properties and absence of avoidable layout thrashing;
- `prefers-reduced-motion`, keyboard focus, touch stability, and hover gating where applicable;
- asymmetric enter/exit timing when deliberate user action differs from system response;
- cleanup of timers, animation instances, request loops, observers, listeners, and runtime contexts.

Capture evidence appropriate to the surface: browser/manual QA notes, screenshot or frame sequence,
temporal/performance trace, and the reduced-motion and interruption scenarios from `motion-spec.md`.
Classify each finding as **Introduced**, **Regression**, or **Pre-existing**; never call an inference a
measurement. The final record must state the review scope, evidence artifacts, verdict, and any open
finding. Approval requires no feel-breaking regression, no obvious motion that should be deleted,
bounded timing/easing, handled interruption, and respected reduced motion.

## 4. Routing boundaries

- This reference is the default design-time gate for non-trivial web motion, regardless of whether the
  implementation uses CSS, WAAPI, Anime.js, GSAP, or another already-approved project runtime.
- `prototype` remains the existing project route only; do not create a new prototype capability here.
- `animate-expo`, `write-swift`, and `ask-sonner` are not default web-pipeline capabilities. Use a
  platform-specific or library-specific route only when the project explicitly requires that platform
  or dependency.
- Do not install external repositories, duplicate the four distilled upstream motion skill files, or
  add a second animation runtime without distinct ownership and a documented reason.


## 5. Compositor cost

Source: Distilled from emilkowalski/skills animation-performance at a81dbca (MIT); wording and selection are this repository's.

Every frame has a budget: about 16.7 ms at 60 Hz and about 8 ms at 120 Hz. Plan for the smaller number
and for a mid-range phone, not the developer laptop. A single layout pass on a busy page can cost
many frames.

### Property tiers

A changed property enters the render pipeline at one of three points.

| Tier | Typical properties | Cost |
| --- | --- | --- |
| Composite only | `transform`, `opacity` | Cheapest. No re-measure, no redraw. |
| Paint, then composite | `box-shadow`, `border-radius`, `color`, `background` | Redraws the element each frame. |
| Layout, paint, composite | `width`, `height`, `padding`, `margin`, `top`, `left`, `border-width` | Re-measures neighbours too. Most expensive. |

`filter`, `clip-path` and `background-color` are accelerated in some engines and not others. Test them
in the target browsers before relying on them.

Swap down a tier when the picture is the same:

| Instead of | Animate |
| --- | --- |
| `width`, `height`, `padding` | `scale()` |
| `top`, `left`, `margin` | `translate()` |
| `display` or `visibility` swap | `opacity`, keeping the hide: `visibility: hidden` (or `inert`) after the fade-out, removed before the fade-in |
| `box-shadow` | `filter: drop-shadow()`, or crossfade a shadow layer |

Reason: a layout animation can look fine on a small element and regress on a slow device. A transform
version cannot. `opacity: 0` alone is not hidden: the element stays focusable and still takes pointer input, so a
faded menu or dialog keeps its hidden-state mechanism and only the fade moves to `opacity`. A sidebar that animates `margin-left` also re-lays-out the content beside it every frame.

### Rules

- List exact properties in `transition`. Never write `transition: all`.
- Name the cause of every performance fix. "Added will-change, feels smoother" is not a diagnosis.
- Animated `blur()` should stay small. Use 2 to 5px to soften a crossfade and keep it under 20px.
- Do not animate custom properties that children inherit. Changing one on a parent restyles every
  descendant each frame. Set `transform` on the moving element instead.
- Do not drive hand-written animation through component state. Write to `style.transform` on a ref.
- Percentage transforms are fine for elements of unknown size. Correctness beats a best-effort
  optimisation.
- Motion that plays while the page is busy (route changes, hydration, data fetch) belongs in CSS or
  WAAPI. A main-thread script loop stalls with the page.

```css
.panel { transition: transform 200ms var(--ease-out), opacity 200ms var(--ease-out); }
```

### will-change

Browsers promote an element that animates `transform` or `opacity` anyway. `will-change` therefore adds
nothing on the common path.

- Add it only after you see a one pixel shift at the start or end of motion, or a measured drop.
- Put it on the animating element only. Never on `*`, on large containers or on many siblings.
- Every promoted layer costs GPU memory. A full-screen layer costs far more than a small one.
- It earns its place on an expensive paint, such as a large blurred element. Keep that layer small.
- Remove it when the motion is finished if the element is long-lived and idle.

```css
.drawer { will-change: transform; } /* only after the shift is observed */
```

### Measuring

Do not judge by feel on a fast machine.

1. Record in the browser Performance panel while the motion plays. Look for long tasks and frames that
   miss the budget, and for "Recalculate style" or "Layout" blocks inside the animation.
2. Use the Animations panel to slow motion down and inspect it.
3. Where available, read Long Animation Frames (the `long-animation-frame` entry type) to find which
   script or style work made a frame late. Treat it as a pointer, not a verdict, and check support.
4. Repeat on a real mid-range phone over remote debugging. Desktop CPU throttling models a slow CPU, not
   a weak GPU or low memory.
5. Record the trace or note in the review evidence. Mark each finding as verified from a recording or
   inferred from code.

## 6. Subtract pass

Source: Distilled from emilkowalski/skills remove-animations at a81dbca (MIT); wording and selection are this repository's.

Run this before adding motion, and again on any surface that already animates. The burden of proof is on
the animation. "It is already there" and "it looks nice" are not defences. The pass only removes or
shrinks motion. It does not change curves or add new effects.

### Decision tree

```
Triggered by keyboard (shortcut, command palette, focus jump, arrow keys)?
  yes -> DELETE.
High frequency (core navigation, tab switches, list rows, in-app route changes, 100+ a day)?
  yes -> DELETE.
Functional data the user reads or acts on (charts, tables, numbers, dashboards)?
  yes -> DELETE, unless it shows a real change in value after a user action.
Can you name one purpose (feedback, spatial continuity, state, avoiding a jarring jump, explanation)?
  no  -> rare first-time moment (onboarding, empty state, success)?
           yes -> KEEP, within a small delight budget.
           no  -> DELETE (pure decoration).
  yes -> seen tens of times a day (hover, toggles, expansion)?
           yes -> REDUCE.
           no  -> over budget (UI over 300 ms, or slide/scale where a fade says the same)?
                    yes -> REDUCE.   no -> KEEP.
```

Marketing pages get more room for one hero entrance and for explanation. Repeated scroll reveals on every
section still fail. They hold content back from people who scroll fast.

### Reduce, do not redesign

| Today | Reduce to |
| --- | --- |
| Hover scale, lift or shadow growth | Colour or opacity change, 150 ms or less |
| Slide or scale entrance on a frequent surface | Opacity only, about 150 ms, ease-out |
| UI motion over 300 ms | 200 to 250 ms, same curve |
| Stagger over 80 ms per item or 300 ms total | 30 ms per item at most, or fade the group once |
| Infinite loop on a persistent element | Run once, or keep the static end state |

If the reduced version no longer carries its purpose, delete it.

### Hazards to check before deleting

- Hidden start states. `opacity: 0` in a keyframe with `fill-mode: forwards`, an `initial` prop or a
  reveal class left behind makes the element invisible forever. Remove the start state with the motion.
- Code that waits for motion: `transitionend`, `onAnimationEnd`, `onExitComplete`, timers sized to a
  duration. Remove the wait too.
- Exit animations that delay unmount. When the exit goes, cleanup that ran after it must run on close.
- Layout animations masking a jump. If removal exposes a shift, keep the motion and log the shift.
- Focus moved after an animation must move at once.
- Tests that wait for animation classes or durations.
- Documented decisions. If a comment explains why a motion exists, keep it and note it.

### Cleanup and report

- Delete orphaned `@keyframes`, animation utilities, empty presence wrappers, unused variant objects and
  unused motion imports. Grep each removed name to confirm no references remain.
- Propose, do not perform, dropping a motion dependency that is no longer imported.
- Record for each candidate the branch that decided it. Also list two to five animations kept and the
  purpose that kept them, so the pass is not read as "delete everything".
- List animations that stay but are badly built (curve, origin, interruptibility) for the review in
  section 3. Do not fix them in this pass.
- Say what needs a human on a real device, such as hover feel and perceived speed.

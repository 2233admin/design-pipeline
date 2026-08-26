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
review. It distills the supplied Emil motion skills without installing or copying their upstream skill
files. Use it with `references/motion-foundation.md` and `references/motion-spec.md`; the foundation and
change spec remain authoritative for project primitives and detailed fields.

Source concepts: `improve-animations`, `find-animation-opportunities`, `animation-vocabulary`, and
`review-animations` from [emilkowalski/skills](https://github.com/emilkowalski/skills/tree/d23d7f88a2e21c9e4b1418c7abe420f5c1052ba7). This reference
is an internal operating contract, not a replacement skill package. Do not install, import, copy, or
execute upstream content.

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

After implementation, run `review-animations` against the actual rendered surface, not only the source.
Review each animation for:

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
- Do not install external repositories, duplicate upstream skill files, or add a second animation
  runtime without distinct ownership and a documented reason.

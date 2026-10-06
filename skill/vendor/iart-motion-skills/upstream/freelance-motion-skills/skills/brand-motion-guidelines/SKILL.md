---
name: brand-motion-guidelines
description: This skill should be used when the user asks to "write motion guidelines", "create a brand motion system", "define easing and timing tokens", "document our animation principles", "build a motion language like Slack/IBM/Klarna", "set up entrance/exit/transition rules", or "add a reduced-motion / accessibility section". It outputs a fill-in-ready brand motion guidelines document.
version: 0.1.0
---

# Brand Motion Guidelines

Author a brand motion system — the document that defines how a brand or product moves, the way mature design systems (Slack, IBM Carbon, Klarna, Material) do it. Output is a fill-in-ready template covering principles, easing/timing tokens, a motion library, logo rules, feedback states, accessibility, and do/don't examples.

## When to use

Use when a brand or product needs a documented motion language, when animation feels inconsistent across a team, when defining named easing/duration tokens for designers and engineers, or when adding a reduced-motion/accessibility standard. The output is a structured doc, not code.

## Decision tree — scope the system, then pick the token

Two judgments: *how big a system does this brand actually need*, and *which token a given motion should use*. Don't build a 7-part system for a landing page; don't ship a one-pager for a multi-team design system.

```
How many surfaces/teams will use this?
├─ One site / one campaign → lightweight: principles + tokens + a short
│   library. Skip deep logo/state sections unless relevant.
├─ A product (app/web) → full 7-part doc; tokens are mandatory.
└─ A brand across product + marketing + broadcast → full doc PLUS a
    Motion Personality preset (see motion-art-direction) so every medium matches.

Picking the token for a given motion:
  duration: larger element / longer travel → longer token
            (instant<fast<base<slow<slower)
  easing:   entrance → decelerate · exit → accelerate (and shorter)
            within-view move → standard · brand moment → emphasized
            continuous loop → linear · playful accent → spring (sparingly)
```

Rule of thumb: if a motion can't name the token it uses, it's a one-off — and one-offs are what make a system feel inconsistent.

## What a motion system contains

A complete motion guidelines doc has seven parts. Author them in order:

1. **Motion principles** — 3-5 named beliefs that govern every animation.
2. **Timing & easing tokens** — named durations and curves, so motion is consistent and engineer-implementable.
3. **Motion library** — entrance, exit, and transition patterns mapped to tokens.
4. **Logo animation rules** — how the mark may and may not move.
5. **Feedback & state motion** — loading, success, error, hover, focus.
6. **Accessibility** — reduced-motion, photosensitivity, focus visibility.
7. **Do / Don't** — concrete examples that make the rules unambiguous.

## Tokens are the core

Everything else references the tokens. Define durations and curves once, as named tokens; the library and components reuse them. This is what makes a motion system implementable rather than decorative.

### Sample duration tokens (fill in / adjust)

| Token | Value | Use |
|---|---|---|
| `duration-instant` | 100ms | Micro-feedback (toggle, tap) |
| `duration-fast` | 150ms | Hover, small state change |
| `duration-base` | 250ms | Standard UI transition (default) |
| `duration-slow` | 400ms | Larger surfaces, modals, page sections |
| `duration-slower` | 600ms | Hero/brand moments, full-screen |

Rule of thumb: the larger the element/distance, the longer the duration. Most UI motion lives at 150-400ms; under ~100ms reads as instant, over ~500ms feels sluggish for routine UI.

### Sample easing tokens (curves)

| Token | cubic-bezier | Feel / use |
|---|---|---|
| `ease-standard` | (0.4, 0.0, 0.2, 1) | Default; element moving within view |
| `ease-decelerate` (ease-out) | (0.0, 0.0, 0.2, 1) | Entrances — fast in, settle |
| `ease-accelerate` (ease-in) | (0.4, 0.0, 1, 1) | Exits — ease in, speed off |
| `ease-emphasized` | (0.2, 0.0, 0, 1) | Expressive/brand moments |
| `ease-spring` | spring(stiffness, damping) | Playful overshoot (use sparingly) |

Principle: entrances decelerate (objects arrive and settle), exits accelerate (objects leave with intent), and nothing important uses linear easing — linear feels mechanical and is reserved for continuous loops (spinners, progress).

## Motion library (map patterns to tokens)

| Pattern | Tokens | Behaviour |
|---|---|---|
| Fade in | `duration-base` + `ease-decelerate` | Opacity 0→1 |
| Scale + fade in | `duration-base` + `ease-decelerate` | 0.96→1 scale, opacity 0→1 |
| Slide up in | `duration-slow` + `ease-decelerate` | Y +8/16px → 0, fade in |
| Fade out | `duration-fast` + `ease-accelerate` | Opacity 1→0 (exits faster than entrances) |
| Modal open | `duration-slow` + `ease-emphasized` | Scale + fade, backdrop fades in |
| Page/section transition | `duration-base` + `ease-standard` | Cross-fade or shared-element move |
| List stagger | `duration-fast` per item, 30-50ms offset | Items cascade, not all at once |

Default rule: exits are shorter than entrances; staggers use small offsets (30-50ms) so groups feel alive without dragging.

## The template (fill in)

```
[BRAND] MOTION GUIDELINES                         Version: ___  Owner: ___

1. PRINCIPLES
   We move to: [principle 1 — e.g. "Guide attention, never steal it"]
               [principle 2 — e.g. "Fast by default, expressive on purpose"]
               [principle 3 — e.g. "Every motion has a reason"]
               [principle 4] [principle 5]

2. TIMING TOKENS
   instant ___ms · fast ___ms · base ___ms · slow ___ms · slower ___ms

3. EASING TOKENS
   standard ____ · decelerate ____ · accelerate ____ · emphasized ____

4. MOTION LIBRARY
   Entrances: [list patterns + tokens]
   Exits:     [list patterns + tokens]
   Transitions:[list patterns + tokens]

5. LOGO ANIMATION
   Allowed: [reveal style, duration token, when it may animate]
   Never:   [stretch, distort, rotate freely, recolour, exceed ___ms]

6. FEEDBACK & STATE MOTION
   Loading: [spinner/skeleton rules + when each]
   Success: [confirmation motion]
   Error:   [shake/colour rules — never colour alone]
   Hover/Focus: [token + visible focus requirement]

7. ACCESSIBILITY
   Reduced motion: [what happens — see section below]
   Photosensitivity: max 3 flashes/sec; no full-screen strobing.
   Focus: focus indicators never animate away or disappear.

8. DO / DON'T
   ✅ [do]            ❌ [don't]
```

## Logo animation rules (fill in)

State explicitly what is allowed and forbidden. Typical baseline:
- **Allowed**: a reveal/build using `duration-slow`-`slower` + `ease-emphasized`; gentle settle; one signature build kept consistent everywhere.
- **Never**: stretch/squash the mark out of proportion, free-rotate, recolour outside the palette, animate every appearance (reserve it for key moments), or exceed the agreed max duration.

## Feedback & state motion

- **Loading**: skeletons for content layout; spinners only for short, indeterminate waits; show progress for waits over ~1s.
- **Success/error**: pair motion with a label or icon — never communicate state by colour or motion alone (accessibility).
- **Hover/focus**: `duration-fast` + `ease-standard`; focus state must be clearly visible and must not animate itself out of view.

## Accessibility (required section)

- **Reduced motion**: honour the user's "reduce motion" setting. Replace movement/parallax/large transforms with simple opacity cross-fades or instant state changes. Keep essential meaning; remove decorative motion. (Conceptually maps to `prefers-reduced-motion`.)
- **Photosensitivity**: no more than 3 flashes per second; avoid full-screen high-contrast strobing.
- **No meaning by motion/colour alone**: always pair with text or icon.
- **Focus visibility**: never let an animation hide or remove the focus indicator.

## Worked examples

**GOOD — a token-anchored library entry:**
> *Modal open: `duration-slow` (400ms) + `ease-emphasized`; scale 0.96→1, backdrop fades in. Close: `duration-base` (250ms) + `ease-accelerate`.*

Every value is a named token, the close is shorter than the open, the easing matches the intent (emphasized for a brand moment in, accelerate to leave). An engineer can implement it directly and it will match every other modal.

**ANTI-PATTERN — the "vibes" guideline:**
> *"Animations should feel smooth, modern, and delightful. Use nice easing and keep things snappy but not too fast."*

Why it fails: no named tokens, no values, no entrance/exit rule, nothing implementable — "smooth" and "snappy" contradict and every engineer interprets them differently, so the product ends up inconsistent (the exact problem the doc was meant to solve). The fix: replace adjectives with the token tables, map each pattern to tokens, and give do/don't pairs with concrete millisecond values.

## Common mistakes

| Symptom | Why it happens | Fix |
|---|---|---|
| Motion inconsistent across screens | Hand-tuned one-off values, no tokens | Define tokens once; every pattern references them |
| Doc sounds nice, can't be built | Principles written as adjectives, not values | Pair every principle with a numeric token rule |
| Everything bounces | Spring/overshoot used everywhere | Reserve spring/emphasized for brand moments only |
| Exits feel sluggish | Exit duration ≥ entrance | Make exits one step shorter; accelerate them |
| Animation breaks accessibility | No reduced-motion / colour-only states | Add the required accessibility section; pair motion with text/icon |
| Logo animates differently everywhere | No logo rules | State one signature reveal + an explicit "never" list |
| Token values renamed constantly | Names are literal (`duration-250`) | Name by purpose (`duration-base`) so values can change |

## Deliverable spec — what a good motion guidelines doc contains

The output is a structured document (template in references/full-template.md), not code. A complete doc has all seven parts, and:
- 3-5 named principles, each with a one-line rule (not adjectives).
- Duration and easing **tokens** with values/curves — the implementable core.
- A motion library mapping every pattern to tokens.
- Explicit logo allowed/never rules.
- Feedback/state motion (loading, success, error, hover, focus).
- A required accessibility section (reduced-motion, photosensitivity, focus, no meaning-by-colour-alone).
- Concrete do/don't pairs that remove ambiguity.

### Before you finish — checklist
- [ ] 3-5 principles, each named and given a one-line rule.
- [ ] Duration tokens defined with values; easing tokens with cubic-bezier curves.
- [ ] Every library pattern names the tokens it uses.
- [ ] Entrances decelerate, exits accelerate and are shorter; linear only for loops.
- [ ] Logo rules state both allowed and never.
- [ ] Feedback states pair motion with text/icon (never colour alone).
- [ ] Accessibility section present: reduced-motion, photosensitivity, focus, contrast.
- [ ] Do/don't pairs are concrete (with values), not vibes.
- [ ] Token names are semantic (purpose), not literal values.

## Related frameworks

This doc is the *system-of-record* for a brand's motion; two sibling skills supply the upstream theory and the per-project feel — reference and apply them, don't duplicate their tables:
- **`animation-principles`** — your principles section should encode the **Three Pillars** (intent → tone → craft); the **Primary/Secondary/Ambient** motion layers explain *why* a hero move and ambient drift get different tokens; the **1/3 Rule** justifies stagger limits (don't move everything at once). Cite these; keep the canonical tables there.
- **`motion-art-direction`** — for a brand spanning product + marketing + broadcast, pick a named **Motion Personality** preset and state it at the top of the doc, then derive token values to match (snappier preset → shorter durations; premium preset → longer, smoother). The motion-language spec lives there.

## Quick reference

| Decision | Default |
|---|---|
| Default UI duration | `duration-base` 250ms |
| Entrance easing | decelerate (ease-out) |
| Exit easing | accelerate (ease-in), shorter than entrance |
| Linear easing | only for loops (spinners/progress) |
| Stagger offset | 30-50ms per item |
| Logo animation | reserved, consistent, never distort |
| State feedback | motion + label/icon, never colour alone |
| Reduced motion | swap transforms for fades/instant |

## Reference files

- `references/full-template.md` — the complete fill-in motion guidelines document with every section expanded and example copy.
- `references/token-reference.md` — full duration and easing token tables with values, cubic-bezier curves, and usage notes.
- `references/dos-and-donts.md` — a library of concrete do/don't pairs and worked principle examples (Slack/IBM/Material-style).

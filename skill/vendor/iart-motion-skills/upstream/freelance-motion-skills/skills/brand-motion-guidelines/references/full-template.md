# Full Motion Guidelines Template

Replace every [bracket]. Keep the structure. This is the deliverable.

```
═══════════════════════════════════════════════════════════════
[BRAND] MOTION GUIDELINES
Version [x.x] · Owner [name/team] · Last updated [date]
═══════════════════════════════════════════════════════════════

0. PURPOSE
This document defines how [Brand] moves. Motion is part of the brand,
like colour and type. Use these tokens and patterns so every surface
feels like the same product. Designers reference patterns; engineers
implement tokens.

───────────────────────────────────────────────────────────────
1. PRINCIPLES
Our motion is governed by [3-5] principles. When in doubt, return here.

P1. [Name] — [one line]. e.g. "Purposeful: every motion guides
    attention or gives feedback. No motion for decoration."
P2. [Name] — e.g. "Quick: fast by default so the product feels
    responsive; expressive only at brand moments."
P3. [Name] — e.g. "Natural: things accelerate and decelerate like
    real objects; nothing snaps mechanically."
P4. [Name] — e.g. "Consistent: the same action animates the same way
    everywhere."
P5. [Name] — e.g. "Considerate: respects reduced-motion and never
    blocks the user."

───────────────────────────────────────────────────────────────
2. TIMING TOKENS
Name      Value     Use
instant   [100]ms   micro-feedback (toggle, tap)
fast      [150]ms   hover, small state change
base      [250]ms   standard UI transition (DEFAULT)
slow      [400]ms   modals, large surfaces, sections
slower    [600]ms   hero / brand moments
Rule: bigger element or longer distance → longer duration.

───────────────────────────────────────────────────────────────
3. EASING TOKENS
Name         Curve                      Use
standard     cubic-bezier(.4,0,.2,1)    moving within view
decelerate   cubic-bezier(0,0,.2,1)     ENTRANCES (arrive + settle)
accelerate   cubic-bezier(.4,0,1,1)     EXITS (ease in, speed away)
emphasized   cubic-bezier(.2,0,0,1)     expressive / brand
spring       spring([stiffness],[damp]) playful overshoot, sparing
Rule: entrances decelerate, exits accelerate, loops are linear,
nothing important is linear.

───────────────────────────────────────────────────────────────
4. MOTION LIBRARY
ENTRANCES
  Fade in           base + decelerate        opacity 0→1
  Scale+fade in     base + decelerate        scale .96→1 + fade
  Slide-up in       slow + decelerate        Y +[12]px→0 + fade
EXITS (shorter than entrances)
  Fade out          fast + accelerate        opacity 1→0
  Scale+fade out    fast + accelerate        scale 1→.96 + fade
TRANSITIONS
  Modal open        slow + emphasized        scale+fade, backdrop fade
  Section change    base + standard          cross-fade / shared element
  List stagger      fast/item, [40]ms offset cascade

───────────────────────────────────────────────────────────────
5. LOGO ANIMATION
Allowed:
  • One signature reveal/build: [describe] using slow–slower +
    emphasized, settling cleanly.
  • Animate only at [moments — splash, key transitions], not on every
    appearance.
Never:
  • Stretch, squash, skew, or free-rotate the mark.
  • Recolour outside the palette or add effects not in this doc.
  • Exceed [600]ms or distract from content.

───────────────────────────────────────────────────────────────
6. FEEDBACK & STATE MOTION
Loading   skeletons for layout; spinner for short indeterminate waits;
          progress bar for waits > [1s].
Success   [confirmation: checkmark draw + base/decelerate]; pair with
          a label.
Error     [shake [2-3]px or colour shift]; ALWAYS with text/icon, never
          colour alone.
Hover     fast + standard.
Focus     fast; focus ring clearly visible and never animated away.

───────────────────────────────────────────────────────────────
7. ACCESSIBILITY
Reduced motion: honour the OS "reduce motion" setting. Replace movement,
  parallax, and large transforms with opacity cross-fades or instant
  changes. Keep meaning; drop decoration.
Photosensitivity: ≤ 3 flashes/sec; no full-screen strobing.
Meaning: never convey state by motion or colour alone — pair with
  text/icon.
Focus: never hide or remove the focus indicator via animation.

───────────────────────────────────────────────────────────────
8. DO / DON'T
✅ Use base + decelerate for a menu opening.
❌ Use a 600ms bounce for a menu opening (too slow, too playful).
✅ Make an error shake AND show error text.
❌ Turn a field red with no message.
✅ Fade-only when reduced-motion is on.
❌ Keep parallax/slide when reduced-motion is on.
✅ One consistent logo reveal everywhere.
❌ A different logo animation per screen.
═══════════════════════════════════════════════════════════════
```

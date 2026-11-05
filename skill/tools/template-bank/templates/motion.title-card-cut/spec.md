# motion.title-card-cut: Title-card cut: a rhythm table of flashes, holds and blacks, drawn as a storyboard strip

> Measured basis. Slot budgets, parameter ranges and palette are authoritative in `manifest.json`; the style pack (`styles/shinbo/style.json`) owns the font roles, grammar, materials, motion grammar and checks.

Canvas 1920x1080 (1920x1080, 1280x720). Source: Nocturne Corridor film EDL (samples film edl).

## When to use
Plan the edit of a title-card film: which card, how many frames, which variation; the rhythm and flash rate are checked before rendering frames.

## Slots
| Slot | Kind (font role) | Budget |
|---|---|---|
| title | text (head) | <= 30 |
| summary | text (num) | <= 80, derived |
| shot{i} | text (body) | <= 16 |

## Measured
- final film: 13.9 s, 41 segments; flashes 2-5 frames, holds 12-32, blacks 2-10
- a black of 2 frames and inverted / red flash variants inside groups alternate ground tones; the grammar keeps one ground per group so the cut stays under 3 flashes per second

## Relations vs decoration
- **Relation**: Flash groups of 3-6 cuts of 2-6 frames, each group one ground tone, bounded by holds or blacks.
- **Relation**: Holds 12-32 frames, blacks 4-14, the whole cut 10-15 s at 30 fps.
- **Decoration**: Push-in variants z105/z110 on repeats; one click per flash cut, a low thud on holds.

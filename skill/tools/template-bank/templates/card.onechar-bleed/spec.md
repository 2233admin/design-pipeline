# card.onechar-bleed: Title card: one character fills the frame and bleeds off it, a reading in the far corner

> Measured basis. Slot budgets, parameter ranges and palette are authoritative in `manifest.json`; the style pack (`styles/shinbo/style.json`) owns the font roles, grammar, materials, motion grammar and checks.

Canvas 1920x1080 (1920x1080, 1280x720, 3840x2160). Source: Nocturne Corridor c01/c03 final (samples c01-black-onechar, c03-red-onechar).

## When to use
One word reduced to one character as a full-screen beat of a title-card cut or a chapter divider. Not for sentences.

## Slots
| Slot | Kind (font role) | Budget |
|---|---|---|
| char | text (display) | <= 1, bleeds |
| ruby | text (ruby) | <= 6 |
| label | text (label) | <= 6 |

## Measured
- c01: 夜 at 1300px (1.2H) from x 330 (0.17W), top -110 (-0.1H); reading よる 44px vertical at x 1580; the em-box check reported an overlap, the ink check does not

## Relations vs decoration
- **Relation**: The character is the only large element; the reading and the label sit in the two corners farthest from its centre.
- **Relation**: Small text tracked .3-.4em.
- **Decoration**: Ground tone only; no texture is required.

# Do / Don't Library & Principle Examples

## Worked principle examples (steal and adapt)

Mature systems express motion as a few memorable principles. Examples to model:

- **Purposeful** — "Motion guides attention and gives feedback; it never decorates." (Every animation must answer "what does this help the user understand?")
- **Quick by default** — "Fast so the product feels responsive; expressive only at brand moments." (Most UI at 150-300ms.)
- **Natural** — "Objects accelerate and decelerate like real things; nothing snaps mechanically." (Decelerate in, accelerate out.)
- **Consistent** — "The same action animates the same way everywhere." (One menu-open motion, reused.)
- **Considerate** — "Respects reduced-motion and never blocks the task." (Motion is interruptible and optional.)

Pick 3-5, name them in one word, and give each a one-line rule.

## Do / Don't pairs

| Topic | ✅ Do | ❌ Don't |
|---|---|---|
| Duration | Open a menu in ~250ms | Take 600ms with a bounce |
| Easing | Decelerate entrances, accelerate exits | Use linear for a discrete move |
| Exits | Make exits shorter than entrances | Make exit as long/longer than entrance |
| Stagger | Cascade list items at 40ms offset | Animate all items at once, or 200ms apart |
| Error state | Shake + show error text | Turn red with no message |
| Loading | Skeleton for layout, progress for long waits | Spin forever with no progress for a 5s wait |
| Logo | One consistent signature reveal | A new logo animation per screen |
| Logo | Settle cleanly within the max duration | Stretch, spin, or recolour the mark |
| Reduced motion | Swap transforms for opacity/instant | Keep parallax and slides on |
| Meaning | Pair colour/motion with text or icon | Communicate state by colour alone |
| Focus | Keep the focus ring visible at all times | Animate the focus ring away |
| Flashing | Stay under 3 flashes/sec | Full-screen strobe transition |
| Hero moments | Reserve emphasized/spring for brand beats | Spring-bounce every button |
| Consistency | Reference shared tokens | Hand-tune one-off durations per screen |

## Review questions before shipping any animation

1. What does this motion help the user understand or do? (If nothing, cut it.)
2. Does it use named tokens, or a one-off value? (Use tokens.)
3. Entrance decelerates, exit accelerates, exit shorter? (Fix if not.)
4. Does it still work with reduced-motion on?
5. Is meaning also carried by text/icon, not motion/colour alone?
6. Is the focus state still visible throughout?
7. Is it consistent with how this same action animates elsewhere?

## Anti-patterns to call out explicitly in the doc

- Decorative motion with no informational purpose.
- Linear easing on discrete UI moves.
- Inconsistent durations for the same interaction across screens.
- Spring/bounce overuse (signals "unfinished" or "toy").
- Animations that block input or can't be interrupted.
- Ignoring reduced-motion.

---
Codify the dos and don'ts and a brand's motion stays consistent across hands. Built by **[iart.ai](https://iart.ai/?utm_source=github&utm_medium=readme&utm_campaign=freelance-motion-skills&utm_content=skill_footer&utm_term=brand-motion-guidelines)** — the AI motion agent for editable, on-brand motion graphics.

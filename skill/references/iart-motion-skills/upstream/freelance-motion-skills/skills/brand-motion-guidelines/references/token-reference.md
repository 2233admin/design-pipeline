# Token Reference

Define once, reference everywhere. These are sensible defaults; tune the values to the brand's personality (snappier product = shorter durations; premium brand = slightly longer, smoother).

## Duration tokens

| Token | Default | Range to consider | Typical use |
|---|---|---|---|
| `duration-instant` | 100ms | 80-120ms | Toggles, tap feedback, tiny state flips |
| `duration-fast` | 150ms | 120-200ms | Hover, focus, small fades, exits |
| `duration-base` | 250ms | 200-300ms | Default UI transition, most components |
| `duration-slow` | 400ms | 350-500ms | Modals, drawers, large surfaces, sections |
| `duration-slower` | 600ms | 500-800ms | Full-screen, hero, brand/logo moments |

Guidance:
- Under ~100ms reads as instant; over ~500ms feels slow for routine UI.
- Larger element or longer travel distance → longer duration.
- Exits are typically one step shorter than the matching entrance.

## Easing tokens

| Token | cubic-bezier | Character | Use |
|---|---|---|---|
| `ease-standard` | (0.4, 0.0, 0.2, 1) | Balanced in/out | Element moving within the viewport |
| `ease-decelerate` | (0.0, 0.0, 0.2, 1) | Fast start, soft stop | Entrances — arrive and settle |
| `ease-accelerate` | (0.4, 0.0, 1, 1) | Soft start, fast end | Exits — leave with intent |
| `ease-emphasized` | (0.2, 0.0, 0, 1) | Pronounced, expressive | Brand moments, hero modals |
| `ease-linear` | linear | Constant | Loops only — spinners, progress, marquee |
| `ease-spring` | spring(stiffness, damping) | Overshoot/bounce | Playful accents, used sparingly |

Rules:
- Entrances decelerate; exits accelerate.
- Linear is reserved for continuous loops — never for discrete UI moves.
- Spring/overshoot signals playfulness; restrict it to brand-appropriate moments.

## Distance & stagger tokens (optional but useful)

| Token | Default | Use |
|---|---|---|
| `move-sm` | 8px | Small slide-in offset |
| `move-md` | 16px | Standard slide/parallax offset |
| `move-lg` | 32px | Large surface entrance |
| `stagger-offset` | 40ms | Delay between cascaded list items |
| `scale-enter` | 0.96 → 1 | Subtle scale-in start value |

## Naming convention

- Durations: `duration-[speed]` (instant/fast/base/slow/slower).
- Easings: `ease-[behaviour]` (standard/decelerate/accelerate/emphasized/linear/spring).
- Keep names semantic (purpose), not literal (`duration-250`), so values can change without renaming everywhere.

## How tokens flow to implementation

Designers pick a pattern → the pattern names tokens → engineers map tokens to the platform (CSS custom properties, design-system theme values, motion library configs). The guideline doc owns the names and values; platforms own the wiring.

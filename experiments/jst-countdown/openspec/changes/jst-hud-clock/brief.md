# Brief — jst-hud-clock

## Goal

Rebuild the supplied amber mission-clock board frame as a live, self-contained web surface: the
same board, the same camera, the same crop, but showing real Japan Standard Time, real mission
elapsed time, and real Greenwich Mean Time.

## Audience

Operations-room viewers reading a wall board at distance, in low light, continuously. No operator
interacts with it.

## Surface

- One page, one locked full-viewport frame.
- Three registers: JST live time, mission elapsed countdown (`T+`), GMT.
- Register states: ticking, held, cropped, stale.
- Screen sizes: desktop primary; the board scales as a rigid object down to 360px wide.

## Constraints

- Single HTML file, no build step, no runtime dependency, no external assets or webfonts.
- Fonts must resolve from system stacks. Texture is generated (SVG filter + CSS).
- Project `DESIGN.md` and `MOTION.md` are the foundation and may not be contradicted.
- Reduced-motion must be honoured for surface motion; clock ticking is an explicit exception.
- The supplied frame is `primary-target` at requested fidelity `exact-reconstruction`.

## Non-goals

- No settings, no timezone picker, no controls of any kind.
- No second hue family, no charts, no additional registers.
- No animation library, no canvas or WebGL runtime.
- No orbit/pan/dolly camera. The approved output is a locked cinematic frame.

## Acceptance Checks

1. Japan register shows correct UTC+9 wall time and advances at 1Hz.
2. GMT register shows correct UTC wall time.
3. `T+` register advances with a centisecond tail at 10Hz and never reflows while counting.
4. The board renders as one perspective plane: hairlines converge with the numerals, no element is
   independently skewed.
5. The third register is cut by the bottom frame edge by design, and no scrollbar appears.
6. Digits keep open counters under bloom at the default viewport.
7. `prefers-reduced-motion: reduce` freezes the grain to a static texture; clocks still tick.
8. Numeral width is stable: replacing every digit with `8` shifts no layout.

## Fidelity Status

Requested fidelity is `exact-reconstruction`. The measured reconstruction gates cannot run in this
change because the source frame exists only in the conversation, not as a file with a resolvable
SHA-256. See `qa.md`. This change may not be described as exact, identical, 1:1, or pixel-perfect.

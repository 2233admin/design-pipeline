# Clock

Countdown clock: a chamfered bezel with a bracketed label, capsule digits with Mincho units at 0.21 of the digit, and an LCD elapsed line.

## Provide

Remaining time (HH:MM:SS), elapsed (HH:MM:SS.cc); `data-clock` makes it tick; `--compact`.

## Use

Deadlines, countdowns, reserve power.

## States

- Normal: amber.
- Danger: a hard cut to `alert-ink` with a red rule (also in the last 10 s).
- Paused: digits at 55% with PAUSED under the label.
- Reduced motion: no ticking.

## Don't

- Do not fade between states.
- Keep the units in Mincho.

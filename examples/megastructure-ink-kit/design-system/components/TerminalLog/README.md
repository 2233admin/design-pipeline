# TerminalLog

A screen panel: `screen` ground with 3px scanlines, a head with the line id, timestamped lines and a blinking cursor.

## Provide

Lines as time / kind / text; a title and caps line.

## Use

For switchboard traffic, squad comms and solver logs. New lines print at 28 ms a character.

## States

- Error lines carry a 2px `alarm` inset edge.
- The list is `aria-live=polite`.

## Don't

- Do not put more than nine lines; old lines drop off the top.

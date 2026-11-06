# TerminalLog

Terminal log: timestamped lines with a source tag (SYS, OPS, ERR in red-orange) and the command field.

## Provide

Lines (time, source, message); an input.

## Use

Event history of a console.

## States

- Error lines: `alert-ink`.
- A typing line shows a blinking caret.

## Don't

- Do not wrap the time column.

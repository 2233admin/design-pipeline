# Readout

A readout: a bilingual label over a tabular number and its unit, on a 1px left rule.

## Provide

Label, caps line, value, unit and state (`live`, `alarm`).

## Use

For depth, counts, distances and rates; three in a row at most.

## States

- Live: rule and number in `signal`.
- Alarm: rule and number in `alarm`.
- A value with CJK (静默) switches to the sans face.

## Don't

- Do not set Latin digits in a CJK face or CJK in the data face.

# LabelPlate

The monitor label plate: a square icon tile, a dark plate with a thin tracked label and a caps line, and a small caption under it.

## Provide

Label (2–4 characters), English caps, icon, tone (`screen`, `alarm`) and an optional caption.

## Use

To name a live readout or channel on HUD screens and the dossier (实况, 静默, 通讯).

## States

- Panel tone: `line` tile on `panel`.
- Screen tone: `signal` tile on `screen`.
- Alarm tone: `alarm` tile on `alarm-dim` with an `alarm` edge.

## Don't

- Do not put a sentence in a plate.
- Do not use the alarm tone outside alarm states.

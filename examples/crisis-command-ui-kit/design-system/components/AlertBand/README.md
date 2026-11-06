# AlertBand

Warning band: a red-orange strip with blinking hazard stripes at both ends and a running line of 警报 / EMERGENCY / place.

## Provide

Short Chinese word, English word, a place line; `is-live` blinks the stripes.

## Use

The foot of the first screen, the head of an app in an alarm state.

## States

- Live: the stripes blink at 1 Hz (`dur-blink`), the line runs.
- Reduced motion: both stop.
- The band is a `role=status` region.

## Don't

- Do not blink the whole band (the text would fail contrast in the dark half).
- One band per view.

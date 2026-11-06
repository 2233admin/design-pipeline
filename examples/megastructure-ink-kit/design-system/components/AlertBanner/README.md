# AlertBanner

The alarm banner: `alarm-dim` ground, `alarm` edge, an outer frame that blinks on 440 ms / off 440 ms, icon, title and code.

## Provide

Title (中文 + caps), one line of text, a code.

## Use

Only for hostile contact or a lost line; `role=alert` when it appears live, `note` when it is part of the page.

## States

- The blink is a hard step (`ease-step`) below 3 flashes a second and stops under reduced motion.

## Don't

- Do not use it for errors a user can fix: use the field hint.
- Do not stack two alerts.

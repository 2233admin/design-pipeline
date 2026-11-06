# Dialog

A modal in a HUD frame: title, caps line, field, radio group and actions.

## Provide

Id, the form content.

## Use

For the reserve flow; opened with `showModal`, closed by Escape or the close button.

## States

- Backdrop `scrim`; it rises 8px on open.
- Confirm validates the call sign and keeps focus in the field when it fails.

## Don't

- Do not open a dialog on page load.

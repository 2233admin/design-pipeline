# MemberCard

A member card. Show mode: an echo trace and the code in large data type instead of a figure. Slot mode: a 2:3 portrait frame with size and task id.

## Provide

The member record (code, name, role, deepest depth, trace seed) and the slot id.

## Use

In a row of four on the bureau screen; pressing one shows its dossier.

## States

- Hover: `line` edge, `panel-raised`.
- Pressed: `signal` edge and trace, code in `line`.
- The big code is decoration (`data-deco`).

## Don't

- Do not draw the person: portraits come from the task sheet.

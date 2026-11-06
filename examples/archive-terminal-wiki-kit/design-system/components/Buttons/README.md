# Buttons

Buttons: primary dark, accent, ghost (outlined), tool and icon buttons, all with the chamfer cut, in rest, hover, active, focus, disabled and loading.

## Provide

Label (and optional leading icon or trailing chevron), kind, size (36px default, 48px `--lg`, 32px tool) and state.

## Use

Primary dark for the one confirming action in a view (知道了, 提交); accent for search and creation; ghost for secondary and hero actions; tool for page toolbars.

## States

- Hover: dark lightens toward `paper`, accent goes to `accent-strong`, ghost and tool to `panel-muted`. Active: 1px press.
- Focus-visible: the cut is removed so the 2px `focus-ring` outline reads all round.
- Disabled: `panel-muted` with `ink-muted` text and a `rule-strong` edge (still 4.5:1), not-allowed cursor.
- Loading (`aria-busy="true"`): label hidden, a spinner in the label colour, clicks blocked.

## Don't

- Do not put two primary dark buttons side by side.
- Do not round the corners: the cut is the shape.
- Do not dim disabled buttons with opacity.

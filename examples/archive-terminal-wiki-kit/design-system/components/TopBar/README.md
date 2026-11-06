# TopBar

The sticky top bar: tri-colour signal strip, archive mark and name, the search field, icon actions and the login button.

## Provide

Brand name and tag, the search action URL, the icon actions the product needs (theme, notice, random, help) and the signed-in state.

## Use

Every page, once, above the side nav.

## States

- Rest: `paper` at 96% under a 12px backdrop blur, `rule` hairline below; the 3px `signal-strip` wipes in once on load (`dur-wipe`, `ease-out-expo`).
- Icon buttons: 36px (`control-h`) with the `chamfer-sm` cut; hover `panel-hover` + `ink`; focus-visible drops the cut and shows the 2px `focus-ring`.
- Notice button with unread updates: `accent-soft` fill and a rotated `accent` dot.
- Below 1024px the menu button appears and opens the side nav as a drawer; below 760px the search field folds into a search icon and the tag, theme, random and help actions hide.

## Don't

- Do not put more than five icon actions in the bar.
- Do not colour icons with `accent` on `paper`: accent is a fill, not an ink.
- Do not remove the signal strip; it is the system's signature line.

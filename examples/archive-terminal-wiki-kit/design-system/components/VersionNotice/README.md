# VersionNotice

The version notice modal: a dark title bar with a yellow close tile, a yellow progress-style accent bar, a striped body with version and date, a primary action, and the tri-colour stripe at its foot.

## Provide

Title, version, date, body text, the primary action label and an optional secondary link.

## Use

Once per release on the home page, and from the notice button in the top bar.

## States

- Opens as a modal `<dialog>` over a `scrim-fill` backdrop (20% light, 55% dark) with a 10px rise and 0.98 scale over `dur-drawer`; the accent bar wipes in after 120ms.
- Focus moves to the close tile; Escape, the close tile, the primary action or a backdrop click closes it and focus returns to the opener; dismissal is remembered per version.
- The close tile turns 90° on hover; it keeps a 3:1 `focus-ring` outline.

## Don't

- Do not open it on every page load.
- Do not put forms in it; it is a notice.

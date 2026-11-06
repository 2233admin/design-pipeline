# SideNav

The collapsible bilingual side navigation: sections headed by an accent diamond, links that pair a 中文 label with an ENGLISH caption, and a collapse control at the foot.

## Provide

Sections (`zh` title) and links (`icon`, `zh`, `en`, `href`), the current page id, and optionally a live entry with a status chip.

## Use

Every page at 1024px and up as a 214px rail (`sidebar-w`); below that as an off-canvas drawer.

## States

- Link rest: `ink-muted` label, `ink-subtle` caption; hover `panel-hover` and `ink`.
- Current (`aria-current="page"`): `accent-soft` wash fading right, a 4px `accent` bar on the left, a contour-line texture masked in `accent` at 35%, labels bold, caption in `accent-ink`.
- Live entry: label and caption in `danger` with a pulsing `chip--live`.
- Section collapsed: header `aria-expanded="false"`, chevron turned -90°, list hidden.
- Rail collapsed (`data-nav="collapsed"` on `<html>`, remembered): 64px, icons only, links keep their `title`; width animates over `dur-panel`.
- Drawer: slides over a `scrim-fill` backdrop over `dur-drawer`; Escape or the scrim closes it and focus returns to the menu button; while open the rest of the page is inert.

## Don't

- Do not drop the ENGLISH caption: the bilingual pair is the system's label grammar.
- Do not show more than one current link.
- Do not use `accent` for the current label text on light grounds; use `accent-ink`.

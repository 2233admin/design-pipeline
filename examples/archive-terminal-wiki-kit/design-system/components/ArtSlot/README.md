# ArtSlot

The art slot: a striped placeholder frame with a dashed safe-area box and a label giving the slot's kind, pixel size and the id of the image-generation task that briefs it.

## Provide

Kind, pixel size, aspect ratio (from its container), the safe-area inset (`--safe`), and the task id from `art-tasks/`.

## Use

Wherever generated art will go: portraits, cards, banners, thumbnails, icons.

## States

- Labelled form for large slots; bare form (frame only) for cards and thumbnails.
- The slot is `role="img"` with an `aria-label` that names the size and task, so a screen reader hears what is missing.
- Showcase mode leaves every slot empty; no character art ships with the kit.

## Don't

- Do not drop art into a slot without checking it against the task's safe area.
- Do not fill a slot with a stock photo as a stand-in.

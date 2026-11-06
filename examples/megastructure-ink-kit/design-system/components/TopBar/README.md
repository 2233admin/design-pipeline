# TopBar

The fixed 56px top bar: the rail-script mark, the work's name compressed to 78%, nav items labelled with their depth, the silence indicator and one reserve button.

## Provide

The nav list (中文 label + depth), the current section id, the dialog id the reserve button opens.

## Use

Once per site page, fixed at the top on `ground` with a `rule-strong` hairline below.

## States

- Hover: `panel-hover` fill, label to `text`.
- Current: label and depth in `signal`, a 2px `signal` underline inside the bar.
- Focus-visible: 2px `focus-ring` outline offset 2px.
- Under 760px: 48px high, the nav becomes a drawer behind the menu button (`aria-expanded`), the silence indicator and reserve button hide.

## Don't

- Do not add a second coloured button: the bar holds one `signal` fill.
- Do not drop the depth numbers on desktop: they are what makes the nav a sounding line.

# ArchiveHero

The home page archive header: a raised panel with accent corner brackets and a fading dot grid, a kicker with an accent bar, the display title, two outlined actions, and a side column with recent entries, upcoming dates and live counters with mini bar charts.

## Provide

Kicker text, title, one-line subtitle, two actions, a recent-entry card, up to three upcoming items, and three counters with 14 bar heights each (as `--h` percentages).

## Use

Once, at the top of the home page.

## States

- The title prints in left to right once (`clip-path` wipe, 560ms `ease-out-expo`); bars grow from the baseline with a 40ms stagger.
- Counters: `stat-number` in `accent-ink`, label `body-sm` bold, caption `caps-sm` in `ink-muted`; the live dot pulses at `dur-pulse`.
- Actions use the ghost button at `button-h` with a chevron that moves 3px on hover.
- Under 1100px the side column moves below the title; under 760px the title drops to 36px and actions go full width.

## Don't

- Do not put a picture behind the title: the dot grid and the brackets are the hero's texture.
- Do not add a second accent colour to the bars.
- Do not use the hero on inner pages; they use the page head.

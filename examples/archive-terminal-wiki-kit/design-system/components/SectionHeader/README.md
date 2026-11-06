# SectionHeader

Two section titles: the home section header (accent bar, 中文 title, ENGLISH caption, a “view all” link) and the wiki body title framed in [ ] brackets with a fading rule.

## Provide

The 中文 title, the ENGLISH caption, an optional link label and target, and an id for the body title (it is a jump target).

## Use

Home sections use the accent-bar header; article and entity bodies use the bracket title.

## States

- Accent-bar header: 4px `accent` left border, `title-block` 中文, `caps` ENGLISH in `ink-subtle`; link `meta` in `ink-muted`, `ink` on hover.
- Bracket title: `title-section` between `bracket` brackets, `caps` caption, a 1px `rule-strong` line that fades to transparent; `scroll-margin-top` keeps it clear of the sticky bar.

## Don't

- Do not write the ENGLISH half in sentence case: it is always uppercase with 0.16em tracking.
- Do not nest an accent-bar header inside a bracket section.

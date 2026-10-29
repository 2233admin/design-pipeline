# Tweaks: Live Variant Switching

Use this when a design has several variations the owner should compare, or when a small set of live
controls would help the owner see the design space. Tweaks let the owner change a design without editing
code. They are an addition to a complete design, never a substitute for one.

## When to add tweaks

- The owner asks to compare or switch between versions.
- The design has two or more real variations to choose between.
- The owner did not ask, but two or three tweaks would reveal useful possibilities. For a single design,
  two or three tweaks (colour theme, type size, layout variant) is a reasonable default.

## Principles

1. **Meaningful, discrete options.** Each tweak must switch between real design choices. Expose named
   variants ("corner style: none / small / large"), not a free slider over a range where most values look
   wrong. A slider is acceptable only when every intermediate value is a finished state.
2. **Few options.** At most five or six per design. More than that is a settings page, and the owner loses the
   quick comparison the panel exists for.
3. **The default is the finished design.** The page with the panel closed is the deliverable. Tweaks add
   options; they never hold back a missing default.
4. **Group options** when there are more than three: visual (colour, type size, dark mode), layout (density,
   sidebar position), content (data volume, states such as empty, loading, error).
5. **Collapsed by default.** The panel opens from a small control and does not cover the design. It can be
   dismissed.

## Persistence

- Store the tweak values in the browser's `localStorage`, with a key scoped to the project (for example
  `design-tweaks-<project>`) so several pages do not share state.
- Wrap every read and write in `try`/`catch`. Private browsing and blocked storage throw; the design must still
  render with the defaults.
- Merge stored values over the defaults on load, so a new tweak added later gets its default.
- Reset clears the stored values and returns to the defaults.

Persistence in `localStorage` is per browser and per viewer. It does not write back to source. If a host can
persist tweaks into source, keep the defaults in a clearly marked block so the host can find and rewrite them;
this repository does not depend on that host capability.

## Typical options by medium

| Medium | Useful tweaks |
| --- | --- |
| Any design | primary colour (from a short palette, not a free picker), type size, type pairing, dark mode |
| Slide deck | theme (light, dark, brand), background style, decoration level, information density |
| Product prototype | layout variant, interaction speed, mock data volume, state (empty, loading, success, error) |
| Motion | speed, loop mode, easing family |
| Landing page | hero treatment, CTA wording variant, column structure |

## Linked tweaks

A tweak may change another tweak when the combination needs it (choosing dark mode also picks a matching text
colour). Keep such links explicit in the update logic and list them in the design notes so the owner can see
why a value changed.

## Checks before delivery

- Every option renders a complete, readable design at desktop and mobile widths.
- Closing the panel leaves the default design visible and correct.
- Storage failure (blocked or private mode) falls back to defaults without an error on the page.
- The panel is keyboard reachable, has labels on every control, and does not trap focus.

## Provenance

The concept of live variant switching with a small, discrete option set, default-first design and
browser-local persistence is adapted from the second reference project's tweaks reference (see
THIRD_PARTY_NOTICES.md, design direction library section). Wording and structure here are this repository's own.
`codeCopied: false`.

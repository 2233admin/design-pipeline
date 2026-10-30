## Why

The 2026-10-30 drift audit found methods in reviewed upstreams that fill gaps the package still has. The owner asked
for all of them to be internalized. Each is either vendored at a pinned commit (MIT sources whose bytes are worth
keeping) or distilled into project-owned references in our own words (sources whose value is a short rule set, or
whose licence or runtime does not fit vendoring).

## What Changes

Distilled into project-owned references (concept credit in `THIRD_PARTY_NOTICES.md`):

- `references/mobile-web.md` (new), from emilkowalski/skills `mobile-native` (`a81dbca`, MIT): dynamic viewport units,
  safe-area insets, tap highlight, input zoom prevention, overscroll and pull-to-refresh, touch target spacing.
- `references/animation-opportunity-and-review.md` gains a compositor section from emil `animation-performance`
  (what triggers layout, paint and composite; when `will-change` helps and when it costs) and a subtract pass from
  `remove-animations` (remove motion on keyboard-driven actions, high-frequency surfaces, functional data and pure
  decoration before adding any).
- `references/worst-case-content.md` (new), from jakubkrehel/skills `break` (`592aedc`, MIT): the scenario checklist
  (long names, empty, huge counts, missing images, RTL, extreme zoom) used by the component state matrix as named
  states.
- `references/interface-defaults.md` (new), from raphaelsalaja/skill `defaults` (`5e98985`, MIT): scroll-edge mask
  fades, shadow room so shadows are not clipped, `overscroll-behavior: contain`, ring-not-border focus, sticky
  borders, `scroll-padding` under sticky headers, hit-area expansion.
- `references/motion-recipes` gains a timeline-deconstruction method from raphaelsalaja `deconstruct`: record a
  reference interaction's property timeline and state machine before rebuilding it.
- Anti-slop: the rendered-page checks impeccable (`02523aec`, Apache-2.0) has and Hallmark lacks —
  first-viewport column overflow, typographic stragglers, clipped overflow containers and browser surfaces (selection,
  caret, scrollbar, focus ring, tabular numerals) — become project-owned checks added to the gate map of
  `anti-slop-mechanical-lint`. Impeccable's DESIGN.md token checks are not added; `replicate-measured-extraction`
  covers that.
- `references/fonts.md` gains the font licence lookup from ui-ux-pro-max (`28b3b8d`, MIT) `google-font-licenses.json`,
  vendored as data.

Vendored at pinned commits:

- MengTo/skills `web-design/html-demo` (`a45892d`, MIT): product demos drawn live in HTML as a pure function of t
  with a scripted cursor, scrub, freeze and reduced motion; routed for "show the product working" sections on web
  pages and as a product-film source. `media/html-reel` is referenced, not vendored (it depends on paid services).

## Capabilities

- `design-pipeline`: ADDED `Reviewed upstream methods are internalized with provenance`.

## Dependencies

- The anti-slop additions extend `anti-slop-mechanical-lint`.

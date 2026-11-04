# Design: look signature in the appearance ledger

## Decisions

- **Inside `appearance`, same schema id.** The signature is one more field of the existing entry
  (`appearance.signature`), not a second history file (the reference keeps its own
  `.open-design/history.json`; we already have a user-level ledger). The field is additive, so the
  schema id stays `design-pipeline.appearance-ledger.v1`. Entries written before this change have no
  signature; they keep working for the existing collision checks and are simply absent from
  `recentLooks`. No migration, no backfill (a guessed signature would be worse than none).
- **Measured from computed styles.** The reference reads the HTML statically (CSS variables, `.hero`
  class names, button rules). We read what the browser computed, through the elements.json that
  `composition capture` already writes for the ledger:
  - accent: the most repeated chromatic colour on small things. A text item's own opaque fill
    (a button) weighs 3, a filled block under 15% of the viewport 2, chromatic text colour 1; fills
    of 15% or more are the theme, not the accent. Ties go to the more saturated colour, then the hex.
    A neutral page has `accent: null`.
  - display font: the first non-generic family of the largest text; body font: the family carrying
    the most characters at 22px or less (the same rules `fonts` already uses). The family is the
    declared one; computed style cannot say which face actually rendered.
  - theme: the area-dominant opaque background, `dark` below WCAG relative luminance 0.179 (where
    white text starts to out-contrast black), else `light`.
  - hero: the largest text whose box is in the first viewport. No such text of 24px or more is
    `none`. Media at least 60% wide and 40% tall under it is `full-bleed-image`. Media, or a filled
    panel narrower than 60%, of at least 8% of the viewport, beside it across the centre line
    (with a 10% dead band so a centred heading over a centred image is not a split), is `split`.
    Otherwise the heading's computed `text-align` gives `centred`, `left` or `right`. We add `left`
    and `right` to the reference's `centred|split|full-bleed-image|none` because a left-aligned
    text-only hero is common and is not centred; a full-width block heading's box is centred
    whatever its alignment, so the box alone cannot tell them apart.
- **elements.json grows fields, not items.** Hero media needs to know where images are, which items
  did not record. Adding media as `block` items would change what `verify composition` aligns, so
  media go in a separate top-level `media` list; text items gain `align` and `fill`. Everything that
  read elements.json before reads the same items.
- **Without a browser.** `signature.accent` comes from an `--accent`, `--primary` or `--brand` token
  (with or without `color-`), fonts from the existing source measurement, theme from its lightness,
  and `hero: "unmeasured"`; `appearance.measured` already says `source`.
- **Advisory only.** `recentLooks` is attached to the directions `run` action and the owner's ask;
  `direction check` is unchanged and produces the same findings with or without signatures in the
  ledger. The existing blocking collision checks (`ledger-source-collision`,
  `ledger-appearance-collision`, roulette skip) are untouched; this change does not widen them.
- **N = 5.** The collision checks look at the last three deliveries; the advisory list shows the
  last five (the reference's `RECENT_DESIGNS_LIMIT`), since information costs less than a block. A
  constant `LOOKS`, no flag.
- **Own project excluded**, as for the collision checks: re-delivering the same project should not
  tell the owner they used their own look.
- **Overlap.** Each version's `repeatsRecent` names the parts it shares with each recent look:
  accents within 48 RGB units read as the same colour; fonts, theme and hero by name (`none` and
  `unmeasured` heroes never match).
- **Privacy.** The signature holds colours, font family names and classes only, no project text,
  consistent with the ledger's rule.

## File ownership

- `skill/scripts/appearance-ledger-core.cjs`: signature measurement, `recentLooks`, `describeLook`,
  `lookOverlap`.
- `skill/scripts/capture-composition.cjs`: the in-page extract gains `align`, `fill` and `media`.
- `skill/scripts/workflows/directions.cjs`: `recentLooks` on the run action and the ask, per-version
  `look` and `repeatsRecent`.
- `skill/references/direction-preview.md`: the ledger section documents the signature and the advice.
- `tests/look-signature.test.cjs` (registered in `scripts/test-manifest.json`).

## Compatibility

Old ledger entries and old elements.json files remain valid. An old elements.json without `media`,
`align` or `fill` still yields a signature (no media means no `full-bleed-image`/media `split`; no
`align` falls back to the box centre; no `fill` means buttons count only through block fills).

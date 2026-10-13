# Variant switcher

A throwaway switcher for comparing structurally different versions of one screen on one page, as
the web `concepts` stage does with its three first-screen variants
([workflow-web.md#concepts](../../references/workflow-web.md#concepts)). Adapted from the UI branch
of Matt Pocock's `prototype` skill: variants on one route chosen by `?variant=`, flipped with a
floating bar.

## Use

1. Put each variant in an element marked `data-variant="A"`, `"B"`, `"C"` …, optionally with a short
   `data-variant-name` such as `Split hero`. Variants must disagree about structure (layout skeleton,
   focal element, type position, image role), not just colour or copy.
2. Inline [variant-switcher.js](variant-switcher.js) in a `<script>` at the end of the page. It needs
   no network, build step or library, so the page stays self-contained.
3. Open the page. One variant shows at a time, chosen by `?variant=<key>` (the first key when the
   parameter is missing or unknown). The bar at the bottom centre has a left arrow, the label
   (`B (Split hero)`) and a right arrow; the ← → keys do the same unless a form field or editable
   region has focus. Each switch rewrites `?variant=` so a variant can be shared or reloaded.

The bar sits in a shadow root, high-contrast and outlined, so it reads as a tool rather than part of
the design, and page styles cannot restyle it.

Hidden variants are forced out of the layout: the script adds
`<style data-variant-switcher-style>[data-variant][hidden] { display: none !important; }</style>`
to the page head once, so the page's own `display` rules (a `section { display: grid }`, an id
rule or an inline `style="display:grid"`) cannot show a hidden variant.

## Not shipped

The switcher and the losing variants are prototypes. Fold the chosen variant (and anything the
owner combined from the others) into the real page, rewritten properly; never copy the switcher into
`index.html` in any form. The web `build` stage stays unfinished, with the finding
`variant-switcher-shipped`, while `index.html` (HTML comments aside) carries `data-variant` or
`data-variant-name` panels, switcher markup such as `data-variant-switcher`, the script inline, a
`<script src>` that names it (local or remote), or a local script file that contains it under
another name.

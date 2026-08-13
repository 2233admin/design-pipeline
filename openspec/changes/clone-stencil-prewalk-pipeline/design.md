# Design: Prewalk pipeline reconstruction

## Implementation Authority

`stencil-so-blog-prewalk` is the only implementation authority. The live page capture at
`targets/stencil-so-blog-prewalk/evidence/reference/` determines content, component topology,
responsive behavior, interaction behavior, assets, and visual values. No differences are allowed.

The implementation must be a self-contained local document under
`experiments/prewalk-pipeline/`: no iframe, live Stencil stylesheet, page embedding, analytics, or
hydration runtime. A visible Chromium browser at device scale 1 is required for final replay and
comparison at `1440×900`, `768×1024`, and `390×844`.

## Project Foundation

- Product foundation: `../../../DESIGN.md`, SHA-256
  `1126499915fb720ce0943afcba8b9327885c11a6ccc63160db96cd801a8cf88e`.
- The project foundation governs evidence and process. The captured target governs this page's
  visual language.
- Exact-target direction preview is waived in `direction-preview.json`; visual reinterpretation
  would conflict with the selected authority.

## Topology

Preserve one continuous semantic article in this order:

1. site header and brand/blog navigation;
2. article category/share controls, title, author, and date;
3. outcome summary with metrics and cost/pass figure;
4. plan critique and handoff diagram;
5. reading-cost explanation and token figure;
6. three execution ribbons;
7. trajectory explanation and two ribbons;
8. history and strategy-swap figure;
9. Sol and Opus receipt tables;
10. unexpected-effect comparison;
11. prefill conclusion and commands;
12. footer.

Nothing may disappear or reorder between viewports. No sticky layer, modal, carousel, or new
navigation is introduced.

## Tokens And Typography

Measured tokens are defined in
`targets/stencil-so-blog-prewalk/research/design-tokens.md`. The local stylesheet preserves the
source CSS values; the semantic summary is:

- canvas `#000000`, panel `#0a0a0c`;
- primary/body/muted text `#f5f5f6`, `#a3a3ac`, `#63636d`;
- sparse cyan, violet, amber, green, and red signals;
- `760px` desktop article measure inside a `1200px` shell;
- Inter/Inter Variable for prose and Berkeley Mono for diagram labels;
- desktop H1 `52px/54.08px`, weight `500`.

Fonts, stylesheets, the author image, and captured explanatory figures are localized in
`experiments/prewalk-pipeline/assets/`. The clone may not fetch visual dependencies at runtime.

## Components

The page contract is
`targets/stencil-so-blog-prewalk/research/components/prewalk-page.spec.md`. Its implementation
units are `SiteHeader`, `ArticleHeader`, `MetricStrip`, `CanvasFigure`, `InlineDiagram`,
`ExecutionRibbon`, `ArticleProse`, `ReceiptTable`, and `SiteFooter`. They are represented by the
source semantic DOM rather than a new framework abstraction; there is only one page and one
implementation.

Four non-interactive canvases are replaced by local viewport-specific `<picture>` frames captured
from the authority after page and font readiness. Inline SVG diagrams remain inline and preserve
their source structure.

## Interaction

- Navigation, social share, article references, and hash navigation remain native anchors.
- Hover and focus styles come from the localized authority stylesheet.
- The `Copy link` button copies the canonical article URL. Repeated activation is idempotent and
  does not move page geometry.
- Reading remains native document scrolling; no scroll interception is added.
- Source-order keyboard reachability and accessible names are preserved.

## Responsive Behavior

- `1440×900`: preserve the measured desktop shell, article origin, type scale, and figure sizes.
- `768×1024`: preserve the measured `689px` article/media span.
- `390×844`: preserve the authority's intentional `724px` document width for dense diagrams;
  horizontal overflow is an observed invariant.
- Viewport-specific canvas frames are selected with native media queries. All prose and inline
  vector content remain responsive under the localized authority CSS.

## Accessibility

Retain the semantic header, nav, main, article, headings, lists, tables, links, button, and footer.
Preserve accessible names and keyboard order. Visible focus remains source-authored. Captured canvas
figures are explanatory and retain their surrounding text context; replacement images use empty alt
text where the original canvas exposed no accessible name. Reduced motion removes non-essential
transitions and animations without hiding information.

## Asset Strategy

`assets/manifest.json` records source URL, destination, hash, and local-evaluation use for every
localized dependency. Static captures are allowed only for the four non-interactive canvas figures.
The page itself, prose, links, tables, diagrams, and controls remain real DOM. There are no final
comparison masks.

## Spec Reconciliation

Graybox: `graybox.png`, captured 2026-08-12T19:20:33.625Z
Reconciled: 2026-08-12T19:22:57.886Z

| Value | Specified | Implemented | Cause |
| --- | --- | --- | --- |

The graybox established all twelve distributed regions and passed measured geometry at zero
landmark error. The final EvidencePort comparison verified all three declared viewports with zero
layout delta and pixel-difference ratios below `0.001`.

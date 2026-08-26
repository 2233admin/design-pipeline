# Behaviors: stencil-so-blog-prewalk

Evidence: `../evidence/reference/observation-1440x900.json` and the visible-browser capture receipt.

- Navigation, social share, article links: native anchors with hover and keyboard-focus states.
- Copy link: one button labelled and titled `Copy link`; activation writes the canonical article URL.
- Internal ribbon reference: native hash navigation to `#django-13279-ribbons`.
- Scroll: document flow; the full page was traversed before capture to activate lazy rendering.
- Charts: four canvas surfaces rendered after fonts/page readiness; the implementation may use local captured frames because these are non-interactive explanatory figures.
- SVG diagrams/ribbons: inline and visible without JavaScript after hydration.
- Loading/error/empty: no product state was exposed on the static article route; navigation failure remains the browser's native behavior.
- Reduced motion: static comparison freezes animation only after real hover/focus behavior is recorded; the clone disables non-essential transitions under `prefers-reduced-motion`.
- Responsive: at `390px` the source intentionally exposes a `724px` document width for dense diagrams; this overflow is part of the measured primary target, not an implementation accident.

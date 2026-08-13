# Brief: clone-stencil-prewalk-pipeline

## Goal

Create a second, independently auditable reconstruction of the complete Prewalk article so it can be compared with the earlier hand-built baseline.

## Targets

- stencil-so-blog-prewalk (primary): https://stencil.so/blog/prewalk

## Constraints

- Confirm ownership, authorization, licensing, and applicable terms.
- Capture real content and assets only when their use is permitted.
- Preserve accessibility, responsive behavior, and reduced-motion support.

## Surface

- One complete long-form article page, every section from site header through footer.
- Declared desktop, tablet, and mobile viewports.
- Native links, share actions, copy link, hash navigation, hover, focus, scrolling, and reduced motion.

## Non-goals

- Do not clone unrelated stencil.so routes.
- Do not publish the local evaluation copy.
- Do not embed the source page or depend on its runtime CSS.

## Acceptance

- Website-cloning evaluator exits 0 with exact gates.
- Text, asset, and interaction coverage are 1.0.
- Pixel difference is at most 0.001 and layout delta at most 1px at every declared viewport.
- All evidence and builder outputs are traceable to this change root.

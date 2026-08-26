# Component Inventory: stencil-so-blog-prewalk

| Component | Variants/states | Evidence |
| --- | --- | --- |
| SiteHeader | desktop/mobile, link hover/focus | observations for all viewports |
| ArticleHeader | category, share links, copy action, author metadata | desktop interaction list |
| MetricStrip | four metrics with compact labels | full-page screenshots |
| CanvasFigure | sigil plus three chart sizes across viewports | 12 captured canvas PNGs |
| InlineDiagram | plan handoff and cheating comparison | serialized inline SVG |
| ExecutionRibbon | plan/oneshot/prewalk variants | serialized inline SVG |
| ArticleProse | paragraphs, lists, code/emphasis, links | captured visible text and DOM |
| ReceiptTable | Sol and Opus result groups | serialized table markup |
| SiteFooter | static year mark | all viewport screenshots |

Every component is owned by `experiments/prewalk-pipeline/index.html` plus localized evidence-backed assets. No framework or additional runtime dependency is required.

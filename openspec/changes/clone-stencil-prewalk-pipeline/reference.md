# Reference: Prewalk live article

## Source Inventory And Provenance

- Primary live page: `https://stencil.so/blog/prewalk`, HTTP 200, captured by visible Chromium 151.
- Normative exported frame: `reference.png`, `1425×9361`, SHA-256 `35a13324b9b5b97bbc78048983e6fd94185c4d1f286b7a5904f2f5ffad82517c`.
- Responsive evidence: `targets/stencil-so-blog-prewalk/evidence/reference/full-*.png` and matching observations.
- DOM, computed styles, accessibility names, assets and interactions are recorded in the target evidence folder.

## Observable Evidence

- Composition: one narrow, left-aligned article column inside a wider site shell; dense technical figures remain in document flow.
- Type: Inter-style sans serif for prose, BerkeleyMono-style monospace inside technical diagrams; large 52px two-line title.
- Color: black canvas, three neutral text levels, sparse cyan/violet/amber/green/red data signals.
- Material/light: flat emissive screen UI; no physical material, camera light or depth-of-field evidence.
- Motion: only link/button states and possible inline figure animation; static comparison freezes after real states are recorded.

| Region | Rows | Columns | Contents left to right | Breaks from |
| --- | ---: | ---: | --- | --- |
| site-header | 1 | 2 | Stencil brand; Blog link | plan-critique |
| article-header | 3 | 1 | category/share; title; author/date | plan-critique |
| outcome-summary | 2 | 1 | metric strip; cost/pass chart | none |
| plan-critique | 2 | 1 | heading/prose; handoff diagram | none |
| reading-cost | 2 | 1 | token chart; prose/list | none |
| execution-ribbons | 3 | 1 | plan ribbon; oneshot ribbon; prewalk ribbon | plan-critique |
| trajectory | 3 | 1 | heading/prose; procedure; comparison ribbons | plan-critique |
| history | 2 | 1 | history prose; swap chart | none |
| receipts | 2 | 1 | Sol table; Opus table | none |
| unexpected-effect | 2 | 1 | cheating chart; explanation | none |
| prefill-conclusion | 2 | 1 | conclusion prose; commands/source note | none |
| site-footer | 1 | 1 | year mark | plan-critique |

Uniform structure across regions? **No.** The dominant two-row content pattern is broken by the two-column site header, three-row article header/ribbon groups, and one-row footer.

## Spatial Evidence

- Against 3D: no perspective convergence, authored thickness, camera-dependent overlap, contact shadows, bevel lighting or depth-of-field.
- For 2D: every element is screen-space DOM, SVG, canvas or image in one document coordinate system.

Selected route: **2d**, confidence `0.99`; fixed orthographic comparison is used only to express the locked screenshot viewport.

## Fidelity Invariants

- Preserve all twelve regions in the observed order.
- Preserve exact content, shell/article geometry, responsive overflow, assets and eight discovered interactions.
- Preserve local accessibility names and focus order.
- Do not use iframe, remote source CSS, analytics or runtime page embedding.

## Unknowns And Tests

- Font rasterization is environment-sensitive; both reference and implementation are rendered in the same browser build.
- Canvas figures are non-interactive in observed evidence; local captured frames are compared at each viewport.
- No dynamic masks are permitted in final exact comparison.

## Required Artifacts

`reference.md`, `graybox.png`, `rectified-reference.png`, `front-elevation.svg`, `camera-calibration.json`, `landmark-overlay.png`, and `reconstruction.json`.

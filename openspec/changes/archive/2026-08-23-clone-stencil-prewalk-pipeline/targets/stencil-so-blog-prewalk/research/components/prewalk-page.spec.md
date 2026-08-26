# PrewalkPage Contract

## Ownership

- Primary target: `stencil-so-blog-prewalk`
- Reference targets and mappings: none
- Target files: `experiments/prewalk-pipeline/index.html`, `graybox.html`, `assets/**`
- Builder slice owner: repository-local static-clone builder
- Evidence root: `../../evidence/reference/`
- Fidelity mode: exact
- Implementation authority target: `stencil-so-blog-prewalk`
- Allowed differences: none
- Protected invariants: component topology, responsive behavior, interaction behavior, no runtime dependency on stencil.so CSS or page embedding
- Required interaction environment: actual-browser

## Environment

- Reference/final URL: `https://stencil.so/blog/prewalk`
- Viewports: `1440×900`, `768×1024`, `390×844`; device scale 1
- Browser: visible Chromium 151.0.7922.34
- Locale/color scheme: `en-US`, light media preference; the page itself is black
- Font-ready: `document.fonts.ready`
- Page-ready: `networkidle`, complete ready state, then two animation frames
- Dynamic policy: traverse the full document once, record live states, then pause animation for static comparison; no final masks

## Interaction Model

- Primary driver: mixed static, scroll, hover, focus and click
- Trigger: native document scroll, anchor hover/focus, copy-button activation
- Keyboard: all eight captured interactive elements remain tab-reachable in source order
- Loading/empty/error/disabled: not exposed by this static article route
- Interruption: native links remain browser-owned; repeated copy activation is idempotent

## Structure

- Semantic outline: site header/nav → main/article → article header → continuous prose/figures → site footer
- Landmarks: one primary nav, one main, one article, one footer
- Fixed/sticky: none observed
- Layering: figures and inline SVG remain in article flow

## Exact Visual Evidence

- Full-page and element evidence: `../evidence/reference/full-*.png`, `observation-*.json`, `canvas-*.png`
- Desktop shell: `1200px`; article: `760px`; desktop H1 `52px/54.08px`, weight `500`
- Full heights: `9361px`, `9566px`, `13202px` for the three declared viewports

## Palette Foundation

- Palette evidence: `../palette-evidence.json`
- DOM roles: canvas, panel, primary/body/muted text, five signal colors
- Raster roles: dominant black field, near-black panels, sparse cool/warm marks
- Coverage: black canvas 80–90%; individual signals below 2%
- Target tokens: all `--prewalk-*` tokens in `design-tokens.md`
- Intentional adaptations: none

## State Transitions

### Link hover and focus

- Trigger: pointer hover or keyboard focus
- State A/B: measured base to source-computed hover/focus style
- Reduced motion: immediate state change
- Evidence: `../evidence/reference/observation-1440x900.json`

### Copy link

- Trigger: click or keyboard activation
- State: clipboard receives canonical article URL; visual geometry stays fixed
- Reduced motion: no animated dependency

## Content And Assets

- Visible text: exact captured article body in `source-1440x900.html`
- Accessible names: captured in `observation-1440x900.json`
- SVG: retain serialized inline diagrams/ribbons
- Canvas: use local, viewport-specific captured frames because all four observed canvases are explanatory and non-interactive
- Fonts/CSS/media: localize with source URL, SHA-256, destination and local-evaluation permission note in `assets/manifest.json`

## Responsive Contract

- `1440×900`: article starts at `x=144.33`, width `760`
- `768×1024`: article and media fit the measured 689px content span
- `390×844`: preserve the source's intentional 724px document width for dense diagrams
- No sections may disappear or reorder

## Target-Project Mapping

- Reuse: semantic HTML and browser-native link/button behavior
- New runtime dependency: none
- Framework mapping: static HTML/CSS/JS
- Rejected: iframe, live stylesheet hotlink, analytics, page runtime hydration

## Builder Contract

- Inputs: complete component contract and captured BrowserPort evidence
- Palette gate: `check-website-clone-foundations.cjs` must report ready
- Allowed files: `experiments/prewalk-pipeline/**`, asset manifest and receipts under this change
- Checks: builder self-test, no runtime Stencil CSS/embed references, HTML parse/syntax check, browser capture
- `SPEC_INCOMPLETE`: missing source HTML, CSS capture, canvas frames, or ready foundation
- Completion: local file renders the complete article with all captured interactions and no source runtime dependency

## Evidence Gate

- Coverage: text 1.0, assets 1.0, interactions 1.0
- Pixel difference: at most 0.001; layout delta at most 1px
- Authority invariants: all must be independently verified
- Approved masks: none
- Verdict: ready; all declared hard gates passed in `verification-final/comparison.json`

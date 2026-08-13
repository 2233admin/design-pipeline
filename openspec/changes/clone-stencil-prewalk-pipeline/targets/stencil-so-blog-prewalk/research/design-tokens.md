# Design Tokens: stencil-so-blog-prewalk

## Palette Evidence

Measured sources: `dom-computed-palette.json`, `raster-palette.json`, and `palette-evidence.json`.

## Semantic Roles

- Canvas and media void use measured black; panels use the measured near-black layer.
- Primary, body, and muted text form the measured three-step luminance hierarchy.
- Cyan, violet, amber, green, and red remain sparse data and link signals.

## Palette Relationships

Raster sampling measured the canvas at 80–90% coverage. Signals stay below 2% each and never become full-surface fills. The foundation is neutral-cool with small warm counterpoints.

## Target-Project Token Mapping

```css
:root {
  --prewalk-canvas: #000000;
  --prewalk-panel: #0a0a0c;
  --prewalk-text-primary: #f5f5f6;
  --prewalk-text-body: #a3a3ac;
  --prewalk-text-muted: #63636d;
  --prewalk-cyan: #44cfff;
  --prewalk-violet: #a86af4;
  --prewalk-amber: #f5b04a;
  --prewalk-green: #4ade80;
  --prewalk-red: #f4644a;
}
```

## Remaining Design Tokens

- Content width: `760px`; site shell: `1200px` with `32px` shell padding.
- Desktop article origin: `x=144.33px`; desktop H1: `52px/54.08px`, weight `500`.
- Body: Inter/Inter Variable fallback stack; diagrams use BerkeleyMono-style monospace.
- Breakpoints verified at `1440×900`, `768×1024`, and `390×844`.
- Figures retain measured fixed heights where canvas evidence requires stable chart geometry.

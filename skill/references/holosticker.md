# Holosticker capability

The complete MIT-licensed `jal-co/holosticker` repository is bundled at
`references/holosticker/upstream/` at the revision recorded in
`references/holosticker/manifest.json`. Its 57 tracked files contain the real Three.js holographic
material, exact distance-field die cut, pointer tilt, peel geometry, studio controls, and export
paths; this is implementation source, not a screenshot or prose-only reference.

```bash
# List the available implementation slices and their actual source files
node skill/scripts/designer-pipeline.cjs holosticker inspect --json

# Inspect only the minimum animated export slice
node skill/scripts/designer-pipeline.cjs holosticker inspect \
  --capability animated-export --json

# Verify every bundled byte against the pinned snapshot
node skill/scripts/designer-pipeline.cjs holosticker verify --json
```

## Adoption route

1. Use this capability only when holographic sticker, holofoil, die-cut, peel, or matching export
   behavior is requested. It is not a default visual treatment.
2. Route the runtime as `scene-renderer-3d` with the existing project-pinned `threejs` adapter.
   Create `scene.json` and `3d.md`; keep semantic controls and status outside the canvas.
3. Start with `src/lib/settings.ts` and `src/lib/three-renderer.ts`. Add
   `StickerCanvas.tsx` only for React lifecycle and pointer tilt, `load-image.ts` only for uploads,
   and the export modules only for explicitly requested output formats.
4. Preserve the target repository's accepted Three.js version and component primitives. Do not
   install the upstream Vite app, shadcn controls, fonts, analytics, or `gifenc` unless the selected
   slice actually needs them.
5. Treat the upstream source as an MIT implementation reference to adapt, not a drop-in package.
   Keep its copyright and license notice with substantial copied portions.

## Required boundaries

- The renderer is browser/WebGL code. Isolate it from SSR, own one animation loop, and dispose
  geometries, materials, textures, listeners, observers, and the WebGL renderer on teardown.
- Pointer tilt needs keyboard/static parity. Reduced motion uses a stable authored angle and must
  not continuously animate diffraction or peel.
- Validate file type and decode failures at upload. Keep transparent export explicit and cap large
  PNG/GIF/video work by the target project's memory and frame budgets.
- Preserve deterministic screenshot settings for QA. Verify die-cut borders at transparent edges,
  small counters, non-square artwork, and each requested export path in a real browser.

The bundled `.github/demo.gif` and application chrome prove upstream scope but are not implementation
requirements. The manifest's capability list is the smallest-source routing authority.

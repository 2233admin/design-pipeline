## Decisions

1. Port the checks, codes and messages from `svg_audit.py` at `734090317a2155c5bf1ae8bd4cc85c6848a0128f`, citing it
   in `THIRD_PARTY_NOTICES.md`. Parse SVG with a small path tokenizer (move, line, curve, arc, close) for anchors,
   angles and bounding boxes; no SVG library.
2. Fixed thresholds instead of library percentiles: complexity WARN above 120 anchors, near-miss angles 0.3° to 3°
   off a multiple of 15°, tiny detail under 1/64 of the viewBox's shorter side.
3. Sheet rendering goes through the existing composition capture, so it is a PNG plus HTML with hashes.
4. Exports rasterise with the same browser; ICO packs 16, 32 and 48 PNGs.

## Risks

- Anchor counting differs from upstream for arcs and implicit commands; tests pin our counts on fixtures rather
  than matching upstream exactly.

## Decisions

1. Vendor at commit `d2c28da8aae3098a7f7dc02fb4355f3f803edb6c`, files unmodified (ESM), loaded from CommonJS with
   dynamic `import()`; Node 22 supports it. Record the commit and file list in `THIRD_PARTY_NOTICES.md` and the
   vendor manifest, as for other vendored bundles.
2. Our collector replaces their Playwright crawler: one `page.evaluate` that walks visible elements and returns the
   same `computedStyles` shape the extractors read (tag, role, classList, box, colour, background, border, font,
   spacing, radius, shadow, transition and animation properties), plus `cssVariables` from `:root` and
   `document.getAnimations()` keyframes for runtime motion. A contract test feeds a fixture through both shapes so
   a vendored update that changes the input shape fails loudly.
3. One viewport by default (1440×900); `--width/--height` repeatable pairs add breakpoints. Pages are captured after
   the stabilisation helper of `capture-stable-frames` for styles, but motion is read before freezing.
4. Matching tolerances live in one constant table in `foundation check`; changing them is an OpenSpec change.
5. Source Decisions declares additions as `added: <token> — <reason>`; the check reads that list.

## Risks

- Computed styles miss canvas, WebGL and image-baked colour. The report lists the area it could not attribute,
  and those tokens are declared as added.
- A vendored update can drift; the vendor manifest pins the commit and the contract test guards the shape.

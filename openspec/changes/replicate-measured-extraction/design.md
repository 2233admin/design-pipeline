## Decisions

1. No second extractor. The additions extend `reference-extract-core.cjs` from `reference-palette-extract`: its
   `measureStyles` walk also returns radii, shadows, transition and animation properties per visible element,
   and `document.getAnimations()` keyframes for runtime motion; the analysis gains pure functions for them. The
   design-extract method (commit `d2c28da8aae3098a7f7dc02fb4355f3f803edb6c`) is ported, not vendored, and
   credited in `THIRD_PARTY_NOTICES.md`.
2. `--path <index.html>` loads a page contained in `--root` over file://; it gets the same overlay, content-wait
   and block-page handling as `--url`, and `sourceUrl` in the palette evidence is the file URL.
3. One viewport by default (1440×900); repeatable `--width/--height` pairs add breakpoints, measured with the
   same walk. Motion is read before the page is frozen.
4. Existing fields of `extraction.json`, `palette-evidence.json` and `design-md-draft.md` keep their meaning;
   new fields are added beside them. `tokens.dtcg.json` is the only new file.
5. Matching tolerances live in one constant table in `foundation check`; changing them is an OpenSpec change.
6. Source Decisions declares additions as `added: <token> — <reason>`; the check reads that list.

## Risks

- Computed styles miss canvas, WebGL and image-baked colour. The report lists the area it could not attribute,
  and those tokens are declared as added.

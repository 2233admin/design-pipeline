# Design

## Decisions (made without asking)

- **Where the contract lives**: in the template manifest (`layers`), because the template owns the
  type boxes the character must avoid and the sizes it ships; the style pack owns how a figure joins its
  grammar (`integration`). Task sheets and composites read both; nothing else is a source of truth.
  The contract's sizes may have other aspects than the template's own render sizes (`kv.tape-hero`
  renders 16:9; its contract also declares 1080 x 1920 and 920 x 430 for store and mobile pages).
- **Under `materials`, not a new command family**: request, intake, cut and composite all read and
  write `materials/` with `licenses.json` lineage, so `materials check` covers them. A composite output
  is a material derived from several inputs: `derivedFrom.inputs` (layer, file, sha256) extends the
  existing record; `derivedFrom.file` stays the character piece. Its licence is the inputs' licences
  joined (`CC0 + generated + owner-original`), `commercialUse` only when every input allows it. The
  per-size measurements and the redo command go in `composite.json` beside the outputs; it is the only
  place the browser check reads them from.
- **Ground is a role, not a guess**: the fix for the collage false positive is declared, never inferred
  from pixels: `data-layer="ground"` on the element (template slots declare `"layer": "ground"`) or the
  receipt beside the file. Character, fx and fg outputs stay collage, so a title over the figure is
  still caught.
- **Pure JavaScript, deterministic**: the runtime has no OpenCV. GrabCut is the published algorithm
  (5-component colour GMMs, 8-neighbour graph, Boykov-Kolmogorov max-flow) at a 640 px working size,
  seeded k-means++ start; the edge is refined by a colour-guided filter (radius 0.36% of the long side,
  as the prototype's 12 px at 3400 px) and tightened as the prototype did (40-215). On the stand-in at
  2400 px: 26.8% foreground in one component (the prototype: 26.8%), 13 s on this machine.
- **Halo limits**: the cut flags the share of the edge band that is still backdrop-coloured (above
  25%; the prototype: 43% raw, 17% defringed) because a width in pixels depends on resolution; the
  composite flags the halo at its use size (source px x scale, above 1 px).
- **Warn bands, not targets**: black-point difference warns above 0.03 L, mean dE above 25 (a residual
  of 10-20 on flat light grounds is expected; pulling it to 0 washes the figure out, so `meanvar` above
  0.45 is its own warning). Upscale above 1.5x and a face or hand under a type box or the occluder fail.
  In the browser check the warn bands are notes; failures are findings.
- **Landmarks**: foot, head top, face and hand boxes come from the task sheet's return
  (`materials add --landmarks`, carried to the cut piece by its placement) or `params.landmarks` for a
  stand-in; without them the figure is anchored by its alpha (bottom centre, top) and the safe-area
  check reports that it could not run. No face or hand detection: it is not reliable on stylised art.
- **Light is declared, not estimated** (the issue's decision): the contract states key and rim
  direction and the sheet asks for them; rim and cast shadow are drawn from the declaration.
- **Type boxes are axis-aligned outer boxes**: a rotated sticker declares its rotated bounds (the
  prototype's vertical wordmark only touched the face after rotation).
- **Refusing derivative subjects** is a heuristic on the subject text (fan art, cosplay, 同人, "character
  from ..."); every sheet also carries the negative constraint "original characters only - never an
  existing work's character", and the owner reviews the result.
- **Backdrop for models without alpha**: the candidate (green, blue, magenta, cyan, orange) farthest in
  OKLab from every palette colour (street-tape: `#FF00FF`).
- **Showcases stay character-free**: the template's default render shows hatched placeholders for the
  scene and the character slot; nothing is composited without layers the owner supplies.

## Evidence (acceptance run, outside the repository)

The prototype rerun through the new commands: `materials fetch --source cleveland --id 1972.368.6
--width 2400`, the case's plates recorded with `materials add`, `materials generate` for paper and
halftone, `materials cut --mode grabcut`, `materials composite --template kv.tape-hero` sticker and
painted at 1920 x 1080, 1080 x 1920 and 920 x 430.

| Size | Black point (raw -> sticker / painted) | Mean dE (raw -> sticker / painted) | Prototype mean dE |
| --- | --- | --- | --- |
| 1920 x 1080 | +0.063 -> +0.018 / 0.000 | 21.5 -> 16.9 / 13.9 | 21.5 -> 16.8 / 13.6 |
| 1080 x 1920 | +0.057 -> +0.029 / +0.025 | 24.4 -> 19.4 / 16.0 | 24.5 -> 19.4 / 15.8 |
| 920 x 430 | +0.069 -> -0.027 / -0.092 (warn) | 6.7 -> 4.5 / 3.7 | 6.7 -> 4.3 / 3.3 |

- Cut: halo 2.69 -> 1.60 px at 2400 px (share of the edge band 44% -> 18.5%; prototype 2.15 -> 1.18 px
  at 3400 px, 42.6% -> 16.6%); at use size 0.45-0.99 px.
- Safe areas: 0 at every size; with the prototype's first steam layout the occluder covers the left
  hand 76%, as the prototype measured.
- Browser check of the six pages (the case's first screen and its vertical and steam pages over the new
  ground and upper images): 0 findings; `main`'s page-check on the same pages: 4 `collage-cover`
  findings on the ground image (the false positive). `template render kv.tape-hero` over the composites:
  0 findings, minimum text contrast 7.1:1 on the case page.

## Compatibility

New manifest and style keys are optional; templates and packs without them are unchanged. `materials`
records gain optional keys (`generatedBy`, `landmarks`, `derivedFrom.inputs`, `derivedFrom.matte`).
`cutCollage` keeps its outputs and params for the existing modes (`outline` params appear only when
the finish or the param is used).

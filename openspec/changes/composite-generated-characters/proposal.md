# Compositing generated characters into template layers

## Why

Closes #311. Game key art is character-driven, and the bank's cases carry none: the owner decided that
showcases stay character-free, that character art comes from image-generation models (any model; a
transparent PNG or a plain-colour backdrop), and that compositing is its own stage. The prototype
(a CC0 museum figure, Cleveland Museum of Art 1972.368.6, in the street-tape first screen at three
sizes, sticker and painted) ran the whole chain by hand and measured it: `materials cut` failed (border
kept 85% of the frame, paper lost the head), grading in OKLab moved the black-point difference from
+0.060 to +0.017 / -0.001 and the mean dE from 21.5 to 16.8 / 13.6, defringe cut the halo from 2.15 to
1.18 px, and the safe-area measurement found two real faults (an occluder over a hand, a wordmark over
the face). It also found a false positive in the browser check: `page-check.cjs` treats every `<img>`
as collage, so text on a composited raster ground is reported as collage over the copy.

## What Changes

- **Layer contract** in the template manifest (`layers`, `design-pipeline.layer-contract.v1`): the
  stack in paint order with roles bg, ground, ghost-type, mid, char, fx, fg, texture, type (type last),
  per-size frame, plate crop, sprite boxes, character foot and height, frame-break edges and type boxes,
  and the character's light, rim colour (a palette role) and shadow. Validated on load.
- **Style pack `integration`**: `sticker` or `painted`, each mode's grade, wrap, rim, shadow, occluder,
  outline and haze, the shared texture, and the figure rendering and references for task sheets.
- **`materials request`** writes a generation task sheet from the contract (prompt `.md` and `.json`);
  refuses subjects that ask for an existing work's character.
- **`materials add --kind generated --tool --prompt [--landmarks]`** records an image model's output
  against its sheet; `materials check` fails when the sheet is gone or changed.
- **`materials cut --mode grabcut`** (GrabCut, guided-filter edge, defringe, halo measured) and the
  **`outline`** finish (die-cut white edge, black line, offset plate).
- **`materials composite`**: every declared size from one set of layers, ground / upper / mask / final
  per size, recorded with lineage and a `composite.json` receipt; measured upscale, black point, mean
  dE, halo at use size and face/hand safe areas, each finding with a fix.
- **Browser check**: images in `[data-layer=ground]` or listed as ground in a receipt are text ground,
  not collage; receipt-linked composites add their checks and the face and hands against the measured
  ink (`safe-area-type`). A browser run drops the static `contrast-unverified` finding as it already
  drops the static contrast estimate.
- **Template `kv.tape-hero`** (street-tape first screen) carries the first contract; `street-tape` gets
  `integration` (sticker by default).

## Capabilities

- `design-pipeline`: materials gain request, generated intake, grabcut and outline, composite; the
  template bank gains the layer contract, style integration and one template; the browser check gains
  ground layers and composite receipts.

## Reuse

- `materials` records (`licenses.json`, `derivedFrom` lineage, `materials check`), `cutCollage` and its
  findings, `template render|check` and `page-check.cjs`, the manifest and style schemas, exit codes
  0 / 2 / 1, `KNOWN_OPTIONS`. No new gate, resolver or receipt schema beside the materials records.

## Impact

- New: `tools/art-motion/raster.cjs`, `matte.cjs`, `composite.cjs`; `tools/template-bank/layers.cjs`;
  `templates/kv.tape-hero/`; `tests/composite-layers.test.cjs`.
- Changed: `material-core.cjs`, `assets.cjs`, `cli-core.cjs` (two actions, five flags, help, report
  merge), `bank.cjs`, `page-check.cjs`, `layouts-street.cjs`, `styles/street-tape/style.json`,
  `references/template-bank.md`, `references/material-capture.md`, `docs/features.md`,
  `package-resources.json`, `test-manifest.json`, `CHANGELOG.md`; counts in the template tests.

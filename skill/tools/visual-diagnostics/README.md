# Visual diagnostics

For still graphics, layout, frontend screenshots and rendered frames. No dependencies beyond
the pipeline's Node runtime/PNG codec; video sampling uses the existing FFmpeg/FFprobe tools.
Run commands from the project root, with the installed skill's CLI path.

## Compare two images

```sh
designer-pipeline composition compare --source reference.png --image qa/screenshot.png --output qa/comparison-01
```

Both PNGs must be inside the project, have identical dimensions, and be at most 16 megapixels
each. Output must be a new directory. To capture a browser surface first:

```sh
designer-pipeline composition capture --composition index.html --width 1280 --height 800 --output qa/capture
```

Open `qa/comparison-01/index.html` and inspect the actual PNGs: `side-by-side.png` retains the
reference at left and candidate at right at original pixel scale; `difference.png` uses black
for unchanged, red through yellow for larger changes. `report.json` contains input/output hashes,
dimensions, changed-pixel fraction and maximum/mean channel differences. The comparison does
not resize, register, color-manage or score a design. Compare like viewports, crops, UI states,
fonts and times. An intended redesign can correctly differ in every pixel.

The difference uses premultiplied RGBA: hidden RGB does not count, changed transparency does.
Rasterization differences count even if imperceptible. Inspect hierarchy, focal point, optical
alignment, typography, crop and material purpose yourself; use the existing composition gate
for its applicable technical checks. Keep Component Conformance and Visual Acceptance separate.

## Inspect sampled motion

```sh
designer-pipeline reference analyze-video --path reference.mp4 --output qa/reference-01
```

Each timed window with at least two distinct source samples receives a map in `windows/`.
Open its HTML or the `motionMap.path` returned with the observation action. A map is the maximum
pixel change across adjacent samples inside that window, downsampled to fit 320×180. Its record
names frame IDs, pair count, dimensions, SHA-256 and limits. The existing reference validator
checks source frames and maps; edits invalidate the old binding. Old reports remain readable.

Look at the source frames beside the map. Camera movement, cuts, texture noise and an object's
motion all change pixels. A still pose may be intentional; a low map value is not a failure.
Fast events can disappear between samples. Resample an uncertain range using existing
`--start`, `--end`, `--fps` and `--max-frames` options into a new directory, then update the existing
reference binding. Write actual object/property observations yourself; maps do not supply them.

## In code

`diagnostics.cjs` exports `sampleImage(image, {maxWidth, maxHeight})`, `motionMap(images)` and
`compareComposition(root, {source, image, output})`. An image is `{width, height, data}` with a
Node RGBA Buffer. Sampling uses integer box averages over white, preserves aspect and never
upscales. `motionMap` accepts 2–400 equal-sized images within 64 million total sampled pixels;
it returns `{image, pairCount, changedPixels, peakDifference, meanDifference}`. Video uses
already selected PTS frames; no second sampler, gate or acceptance receipt is introduced.

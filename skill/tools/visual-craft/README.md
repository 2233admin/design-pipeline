# Canvas craft

Small drawing and layout primitives for an existing Canvas surface. No package installation,
remote font, image asset or animation engine. Load `canvas.js` as a classic script to get
`window.VisualCraft`, or `require('./canvas.js')` for pure geometry/layout tests in Node.
Keep semantic frontend copy and controls in DOM/CSS; these helpers serve illustrations,
diagram labels, posters, assets and Canvas scenes within the project's chosen renderer.

## Start in a project

From the project directory, run the installed skill CLI by its absolute path and choose a new
output directory:

```sh
SKILL_ROOT="/absolute/path/to/installed/design-pipeline"
node "$SKILL_ROOT/scripts/designer-pipeline.cjs" \
  composition scaffold --root "$PWD" --template visual-craft --output "visual-craft-study"
```

This copies `index.html`, `canvas.js` and `LICENSE.art-motion` into that new directory.
It refuses to replace an existing path and does not create film or workflow state. Open the
copied `index.html` in a browser; it uses the sibling helper and native Canvas. For installation
and upgrade instructions, see [Install and upgrade](../../references/installation.md).

Open `study.html` in a browser for a responsive example, or capture it with the existing
`composition capture` command. `window.renderStudy(progress)` redraws from explicit progress,
including the same static grain. The range input is keyboard accessible; no implicit playback
or animation timer runs. This is a technical study, not a prescribed art direction.

## Draw a mark

```js
VisualCraft.drawBrush(ctx, [[20, 80], [90, 50], [160, 75], [230, 30]], {
  width: 14, pressures: [0.2, 0.8, 0.5, 0.1], seed: 41,
  spacing: 3, progress: 0.7, color: '#a3442e'
});
const paper = new Path2D();
paper.rect(0, 0, 260, 100);
VisualCraft.paperGrain(ctx, paper, {x: 0, y: 0, width: 260, height: 100}, {
  seed: 2471, count: 300, size: 0.7, alpha: 0.12
});
```

`strokeGeometry(points, options)` returns `{length, visibleLength, samples, outline}` without
drawing. `drawBrush` fills that outline. Width is required; optional pressure has one 0–1 value
per point. Otherwise the profile rises and falls along the path. Progress reveals arc length;
seed and jitter control stable edge variation. Supply actual path geometry: this is a continuous
variable-width ribbon, not a fluid simulation, auto-smoothed calligraphy or a full brush engine.
Sharp reversals can self-intersect. Split deliberately disconnected marks into separate paths.
More material methods are local in `../art-motion/engine/lib/brush.js` and `paint.js`.

Coordinates are caller-owned. Resize or transform them intentionally; regenerate paper grain
with the same seed in the same material coordinates when a moving object should carry its
texture. `paperGrain(ctx, path, bounds, options)` clips to the supplied `Path2D`. Drawing helpers
restore Canvas styles/transforms/clip; use device-pixel-ratio backing dimensions for sharp output.

## Measure a label

```js
await document.fonts.ready;
const fit = VisualCraft.fitText(ctx, '清楚地呈现\nA useful label',
  {width: 240, height: 90},
  {fontFamily: 'system-ui, sans-serif', fontWeight: '500', size: 28, minFontSize: 16});
if (!fit.ok) {
  // Change copy/box/layout; do not silently shrink below the readable minimum.
  console.info(fit.overflowReasons);
} else {
  ctx.save();
  ctx.font = fit.font; ctx.textBaseline = 'top';
  fit.lines.forEach((line, i) => ctx.fillText(line, 20, 20 + i * fit.lineHeightPx));
  ctx.restore();
}
```

`wrapText(ctx, text, width, font)` preserves explicit newlines, CJK characters, whitespace and
unbroken words; it reports a word wider than the box as overflow. Grapheme segmentation uses
`Intl.Segmenter` where available (code-point fallback otherwise). `fitText` searches down to the
given minimum and returns `ok`, `overflow`, `overflowReasons`, `font`, `size`, `lineHeightPx`,
`lines` and `widths`. Inputs/work are bounded. This is label layout, not a full typesetter:
inspect punctuation, fallback glyphs, script shaping and optical alignment at final size.
Font availability, glyph coverage and licensing are separate from fitting. Local font methods
are indexed in `../../references/art-motion.md`.

## Place an image or choose a frame

```js
const r = VisualCraft.imageRect(image.naturalWidth, image.naturalHeight,
  {x: 20, y: 30, width: 320, height: 180}, 'cover');
ctx.drawImage(image, r.sx, r.sy, r.sw, r.sh, r.dx, r.dy, r.dw, r.dh);
const frame = VisualCraft.spriteFrame(timeInSeconds, frames.length, 12, {loop: false});
```

`contain` centers the complete image, `cover` centers an explicit crop. Inspect the subject and
adjust placement when centered cropping loses it; CSS `object-fit` remains the native DOM choice.
`spriteFrame` clamps at the final frame by default or loops when requested. Supply explicit time
and real registered assets/anchors; it does not invent missing poses or choose a stylistic fps.

## Check a result

Render at the intended sizes. Inspect silhouette, stroke pressure, edge continuity, crop, text
legibility and clipping. Compare cold and reordered progress samples; static grain must not crawl.
Use `../visual-diagnostics/README.md` for original-pixel comparisons. Share source-sized output
with the lead for visual review. A helper's deterministic geometry does not prove good drawing.

Adapted methods retain the MIT notice copied from `../art-motion/LICENSE` as `LICENSE.art-motion`;
copy that notice with `canvas.js` if extracting it into a project. The method index lives in
`../../references/art-motion.md`.

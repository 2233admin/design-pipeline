# Composition gate

For a small drawing study, run `composition scaffold --template visual-craft --output <new-dir>`
from the project through the installed skill's CLI. It copies a runnable `index.html`, `canvas.js`
and the license, without starting a film workflow. Existing output is preserved; choose a new
directory. Read `tools/visual-craft/README.md` for the helper API and `references/installation.md`
for the installed CLI path.

Measure a rendered frame before claiming a layout, poster, UI screen or film frame is done.
Works on any PNG: a browser screenshot, a HyperFrames frame, a Blender render.

```bash
designer-pipeline composition capture --composition index.html --output qa/comp [--seek 3.5]
designer-pipeline verify composition --image qa/comp/screenshot.png --elements qa/comp/elements.json --profile ui|poster|frame
```

`composition capture` loads a local HTML file or http(s) URL in headless Chrome (the HyperFrames
browser stack) and writes `screenshot.png` plus `elements.json` (visible text with box, size,
weight and effective colors). `--seek` positions registered GSAP timelines first. Without
`--elements` the gate runs on pixels alone.

Errors fail the gate: `blank-frame`, `low-contrast`, `text-contrast` (WCAG 4.5:1, 3:1 large),
`text-off-canvas`. Warnings are review prompts: `weak-separation`, `off-balance`, `dead-band`,
`no-focal-point`, `clutter`, `palette-sprawl`, `edge-crowding`, `alignment-near-miss`,
`flat-hierarchy`, `type-scale-sprawl`. Every finding carries a `fix`. Allow a warning only when
the composition deliberately does that (`--allow dead-band` for intended negative space) and say
why in the change's qa record.

`film check` runs the gate on each beat's midpoint frame with the `frame` profile and, when it
captures the composition, on the visible text sampled five times a second plus both sides of
every beat boundary (`references/film-choreography/layout-probe.js`). Text runs count only
while they are legible, not covered by an opaque element, not clipped away and not marked
`data-layout-allow-overlap`. Error: `text-overlap` held for two samples (a dissolve, whose
opacities sum to about one, does not count). Warnings: `text-overlap` caught in one sample or as
a steady faint copy under legible text, `text-edge-margin` (resting text within 4% of the short
side from the edge) and `text-too-small` (resting text under 2.4% of the frame height).
`film check --allow <code>` accepts named warnings.

The gate measures failure shapes; it does not judge taste. A passing frame still needs creative
review, and a warning is not proof of a bad design.

For source/candidate inspection use `composition compare --source <reference.png> --image
<candidate.png> --output <new-dir>`. It preserves equal-size original pixels in a pair and
creates a difference map with hashes, without returning a quality verdict. See
`tools/visual-diagnostics/README.md`; this diagnostic does not replace this gate or visual review.

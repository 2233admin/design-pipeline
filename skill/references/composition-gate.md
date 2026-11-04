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

`composition capture` loads a local HTML file or http(s) URL in a headless browser (the
HyperFrames headless shell, else an installed Chrome, Edge or Chromium; see installation.md). It
needs `puppeteer-core` in the project or `--puppeteer-module <absolute path to puppeteer-core>`
on the call; without either it fails with `puppeteer-core not found`. It writes `screenshot.png`
plus `elements.json` (visible text with box, size, weight and effective colors).
`--seek <sec>` positions the page first. A page whose loaded DOM has a `[data-composition-id]`
root is a HyperFrames composition (a mention in a comment or string does not count). It is reloaded
the way `hyperframes render` prepares a frame: the render frame rate (the root's `data-fps`, else 30)
is set before any script, the HyperFrames runtime is present (the page's own, as in the preview, else
the project's `hyperframes` install; `film scaffold` pins it), and the runtime's `renderSeek` moves
it. Clips outside their `data-start`/`data-duration` window are hidden, so the capture matches the
rendered frame. The runtime snaps the time to that frame rate: `seek.appliedSec` in the result is
the frame time actually shown next to the requested `seek.atSec` (`--seek 3.99` at 24 fps shows
3.9583 s), with `seek.fps` and `seek.durationSec`. A time at or past the duration has no rendered
frame and fails with `SEEK_OUT_OF_RANGE`, naming the duration and the last frame time. Without the
runtime, `--seek` on such a page fails with `TOOL_MISSING` and the PNG-sequence render command.
Other pages seek their registered GSAP timelines as given (`seek.clock` is `timeline`; for
HyperFrames it is `hyperframes-runtime`).
Without `--elements` the gate runs on pixels alone.

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

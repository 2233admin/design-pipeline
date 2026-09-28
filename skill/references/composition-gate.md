# Composition gate

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

`film check` runs the gate on each beat's midpoint frame with the `frame` profile.

The gate measures failure shapes; it does not judge taste. A passing frame still needs creative
review, and a warning is not proof of a bad design.

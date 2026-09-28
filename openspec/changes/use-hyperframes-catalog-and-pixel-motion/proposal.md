# Use the HyperFrames catalog and judge procedural motion from pixels

The plan was to write light 3D templates. HyperFrames 0.8.81 already ships 387 catalog blocks,
including 20 tagged 3d, 14 webgl and 19 shader (dolly zoom, rack focus, orbit carousels, device
mockups, code extrusion). Reusing them is better than writing new templates.

Testing a real 3D block exposed two gaps in the gates. Raw-file timeline capture does not run the
HyperFrames runtime, so nested blocks never load and the host timeline came back empty (0 s, no
tweens) without any error. Under the runtime, the block's motion is one proxy tween on a plain
object (`u: 0 -> 1`) that computes the camera per frame, which the GSAP timeline gate cannot
interpret.

This change adds a catalog bridge, captures through the preview runtime, tags proxy driver
tweens, and adds runtime-agnostic pixel motion evidence to the render gate. That evidence also
covers future Blender and footage beats.

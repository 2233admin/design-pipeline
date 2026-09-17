# Product film motion specification

Target foundation: `experiments/openalice-product-animation/MOTION.md`. Exact foundation and implementation hashes are captured in the verification receipt.

Trigger: automatic preview load unless reduced motion is requested; renderer seeks by frame. Purpose: explain the product sequence independently of user input. Total duration 24 seconds, 30 fps. Chapters start at 0, 4, 9, 14, 18 seconds. Scene exit 0.22 seconds with power2.in, followed by a 0.4-second entrance with power2.out; internal entrances 0.45 seconds with power2.out, stagger 0.22 seconds. A 24-second linear SVG trim-line indicates narrative progress; animate the SVG attribute to preserve fractional offsets without CSS pixel rounding.

Choreography and layer ownership: fixed background, persistent header/footer/spine, outgoing scene fully exits before incoming text appears, staggered product rows inside the active scene. Opening headline is visible at frame zero. One synchronous paused GSAP timeline registered as `window.__timelines.openalice`; no autonomous composition clock. Preview host calls play/pause/restart on that same timeline. HyperFrames owns rendering time.

Interruption: preview pause freezes time, replay starts at zero, scene controls seek settled holds, pagehide pauses and removes callbacks. Reduced motion starts on the final overview with no animation; manual scene stepping remains available. Exported video is explicitly played media.

Budget: 1280×720, 720 frames, no remote assets, canvas, blur, 3D, or layout-property tweens. Opacity, transform, and SVG stroke offset only. Verify errors, no-scroll advancement, deterministic backward seek, controls, reduced motion, encoded duration/full decode, and rendered scene/transition frames. Visual review remains separate from automated pass/fail.

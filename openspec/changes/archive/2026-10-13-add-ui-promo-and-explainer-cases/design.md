# Design

## Capturing a real interface

OpenAlice's UI demo mode mocks its backend with MSW, so the real interface runs without accounts,
keys or live data. `capture.cjs` works in three steps:

1. It checks that the checkout is at the pinned commit.
2. It builds the demo UI with `vite build --mode demo`.
3. It serves the build locally and captures it with the HyperFrames Chrome.

- **Resolution.** The camera pushes up to 2.9x into 13 px terminal text, so frames are captured
  at 2x (3840 x 2160). Chrome's screencast downsamples to css size, so each frame is a screenshot
  instead.
- **Timing.** Before each screenshot, the page's virtual clock advances by 1/30 s. The demo replay
  times itself from the requestAnimationFrame timestamp, which headless Chrome takes from the wall
  clock. Each 2x screenshot took about 150 ms, so the replay ran about 4x fast.
  - An init script now passes the virtual `performance.now()` to rAF callbacks.
  - After the clock is paused, the capture restarts the replay with its own "Replay again" button,
    so the replay starts on frame 0 every time.
- **Input.** Typing into the paused page stalled the screenshots, because the input starts a
  network request. The typing clip is therefore stop-motion. For each frame, the capture sets the
  textarea's value through the native setter and fires an input event.
  `caret-animation: manual` holds the caret steady.
- **Encoding.** Video has a keyframe every 0.5 s. With the default spacing, the renderer froze
  inside both video shots.

Nothing captured is committed. OpenAlice is AGPL-3.0, so its interface, logo and demo data stay
in the git-ignored `assets/captures/`. `capture.json` records the source commit and the hash of
each file.

## Composition notes

The renderer drew video frames at their natural width and ignored the css width. Video is
therefore laid out at its capture size inside a wrapper scaled by 0.5.

Match cuts are framed from anchors measured in css px on the captures, so the matched text has the
same cap height on both sides. The camera is still at each cut.

## Gate calibration

`instantReplacement` used to accept a step only when it was 4x the median of its 2 s window. When
camera moves filled that window, a clean cut between two held frames failed.

A step whose two neighbours are both under a tenth of it now counts as well. Continuous motion is
unaffected, because its neighbours are close to its peak. A unit test on a synthetic motion
profile covers both cases.

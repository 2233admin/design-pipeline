# OpenAlice product animation

Open **[watch.html](watch.html)** to watch the actual encoded video without installing anything.
The [MP4](output/openalice.mp4) is a silent 24-second, 1280×720, 30 fps product film with five
autonomous scenes. It ends at a closed human-approval boundary. This is an original illustrative
workflow, not captured OpenAlice UI or a real transaction.

## Reproduce

Requires Node 22+, FFmpeg/ffprobe on PATH, and Chromium. From this folder:

```sh
npm ci --no-audit --no-fund
npx playwright install chromium
npm run lint
npm run check
npm run render
npm run verify
```

Dependencies are pinned and locked: HyperFrames 0.8.46, GSAP 3.15.0, Playwright 1.62.0.
HyperFrames may install its own Chrome for rendering; set `HYPERFRAMES_BROWSER_PATH` to select a
browser for checks. `run.cjs` disables telemetry, preserves tool logs, and does not publish.
Rendering needs permission to create the browser cache outside the worktree on restricted hosts.

Open [preview.html](preview.html) after installing dependencies for the live authored timeline.
Normal-motion playback starts automatically; reduced motion opens a static overview and supports
manual scene stepping. Keyboard-operable pause/replay controls remain outside the rendered frame.
The exported MP4 player also honors reduced motion at initial load. A browser may require Play if
its autoplay policy overrides muted playback.

## Evidence

- `output/check.json`: actual HyperFrames runtime/layout/contrast checks; inspect informational
  findings as well as the aggregate. Its motion-assertion detector is disabled; `verify.cjs`
  supplies separate timeline and playback assertions.
- `output/verification.json`: ffprobe, complete decode, no-input preview advancement, actual MP4
  playback, backward-seek determinism, title-seam/progress assertions, keyboard controls,
  reduced motion, mobile overflow, console errors, and implementation/video hashes.
- `output/contact-sheet.png` and `frame-*.png`: decoded **MP4** frames at the timestamps recorded
  in the receipt, including all four transitions. These support visual inspection; they are not
  substitutes for the video. `encoded-playing.png` captures native media playback in Chromium.
- `../../openspec/changes/integrate-product-animation/qa.md`: visual review and integration evidence.

The job plan selects `motion-graphics / product-launch-video`. The bound toolchain plan selects
HyperFrames but truthfully remains `blocked` because the shared catalog marks it `review`.
This user-authorized target qualifies a pinned local runtime through the existing documented
fallback; it does not globally admit HyperFrames. The original `openalice-showcase` scroll page
and osprey's unrelated work remain untouched.

The film's facts come from the previously documented showcase foundation. No OpenAlice source,
screenshots, or assets were copied. Pacing adapts the inert product-demo playbook; the maintained
[HyperFrames rendering documentation](https://github.com/heygen-com/hyperframes/blob/main/docs/guides/rendering.mdx)
informed the CLI usage. Audio, portrait export, and screenshot fidelity are outside this sample.

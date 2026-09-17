# OpenAlice product animation

Open **[watch.html](watch.html)** for the actual encoded film. The [MP4](output/openalice.mp4) is a silent **20-second, 1280×720, 30 fps** research-workflow illustration, not captured product UI or a real transaction. One research document gains a cited finding, keeps its source and saved versions, and sends an attachment reference to Inbox without moving the original. It ends with **Ready for your review / No trade placed**.

The 7.5-second direction sample passed the coordinator's normal-speed playback precheck before expansion. This is **not user visual acceptance**. The rejected 24-second five-panel film is preserved in `output/rejected-24s/`; its receipts do not validate the redesign. The approved direction source, video and checks are preserved in `output/sample-approved/`. `watch.html?sample=1` plays the retained sample, not the complete delivery.

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

Serve this folder over HTTP for the iframe timeline preview (the command below was exercised locally; it is not the full MP4 seek/reduced-motion acceptance server):

```sh
python -m http.server 8767 --bind 127.0.0.1
```

Open `http://127.0.0.1:8767/preview.html` for the controllable timeline. Direct `file://` opening supports `watch.html` with its sibling MP4 and is the offline delivery entrypoint, but does not support the cross-document iframe preview. Python HTTP serving supports sequential video playback but does not supply byte ranges here: Chromium can report buffered `[0,20]` and seekable `[0,0]`, so it cannot prove seek/reduced-motion ending. For those checks use local `watch.html` or a Range-capable server such as the verifier’s existing local server.

Pinned dependencies: HyperFrames 0.8.46, GSAP 3.15.0, Playwright 1.62.0. `run.cjs` disables telemetry, retains raw tool logs, and derives duration from the composition. `HYPERFRAMES_BROWSER_PATH` can select Chromium. The archived sample cannot accidentally be overwritten by rendering the full film with `--sample`.

[preview.html](preview.html) drives the authored timeline after dependency installation. Pause/replay and previous/next beat controls remain outside the rendered frame. Reduced motion opens a static ending with explicit playback available. The MP4 player also respects reduced motion; browser autoplay policy may require pressing Play after the media loads. Both players use the actual duration, not a fixed scene count.

The composition is noninteractive film artwork: its citation and Inbox references are text, never focusable navigation. Use the real source link in the surrounding transcript outside the video/iframe. Ending framing reserves native-control space; portrait viewing still scales the landscape detail, so the full text remains available in the transcript.

## Evidence and boundaries

- `output/lint.json`, `check.json`, `render.log`: current tool receipts. Layout warnings remain inspectable; thumbnail copies intentionally emerge behind the opaque original, and only those decorative snapshots declare allowed occlusion. Primary text is not exempted. HyperFrames motion assertions are disabled; the verifier separately exercises motion.
- `output/verification.json`: duration/frame metadata, full decode, normal-speed preview and actual MP4 playback, object identity and visible provenance at every encoded-frame timestamp, deterministic backward seek, keyboard controls, reduced motion, mobile layout, lifecycle cleanup, errors, and source/video hashes.
- `output/contact-sheet.png`, `frame-*.png`, `encoded-playing.png`: decoded MP4/actual native-playback evidence, not substitutes for watching the film at normal speed.
- `../../openspec/changes/integrate-product-animation/qa.md`: technical results and visual-acceptance boundary.

Receipt hashes identify the current files; they are not independent certification that a particular input generated a video. Actual render logs, complete decode and normal-speed MP4 playback are the evidence used here.

The concrete historical fact is **NVIDIA Data Center FY2025 revenue $115.2 billion, +142% year over year**, from the [NVIDIA earnings release dated 26 February 2025](https://nvidianews.nvidia.com/news/nvidia-announces-financial-results-for-fourth-quarter-and-fiscal-2025). It is not total company revenue or a forecast. Filename, version labels, Session identifier and layout are illustrative. No product source, screenshots, or remote assets are copied; no trade is proposed, approved or executed.

The refreshed bound job plan selects `motion-graphics / product-launch-video`. The toolchain plan truthfully remains `blocked`: the shared HyperFrames catalog candidate is `review`. This target uses the existing authorized local fallback; it does not globally admit a tool or alter shared gates. Audio, portrait re-editing, live data and publication are outside this delivery. The original `openalice-showcase` and unrelated osprey work are untouched by this redesign slice.

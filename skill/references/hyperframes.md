# HyperFrames Route

This is a project-owned summary of the official HyperFrames skill contract. It keeps the pipeline
route usable when the upstream skill tree is absent; the upstream source remains authoritative for
new workflow and runtime details.

- Source: https://github.com/heygen-com/hyperframes
- Reviewed release: `hyperframes@0.8.137` at revision `d09e003b17610177b71e340ec0bac95c9dde3e64`
- License: Apache-2.0
- Reviewed browser toolchain: Node.js 22.12+ (including Puppeteer's runtime requirement).

## Select the route

Use HyperFrames for HTML-based video, reels, motion graphics, title cards, explainers, captions,
overlays, slideshows, voiceovers, or a Remotion port. Match the deliverable, not a passing mention
of motion or animation. Ordinary UI motion stays on the project's normal motion route.

For a fresh video request, route once:

1. Existing Remotion source: `remotion-to-hyperframes`.
2. Presentation or navigable deck: `slideshow`.
3. Captions on unchanged footage: `embedded-captions`.
4. Designed overlays on unchanged footage: `talking-head-recut`.
5. Beat-driven music video: `music-to-video`.
6. Product or website promotional film/animation: `product-launch-video`.
7. Other short unnarrated motion-first unit: `motion-graphics`.
8. PR explanation: `pr-to-video`.
9. Topic or article explainer: `faceless-explainer`.
10. Otherwise: `general-video`.

For product promotion, apply `references/product-film-direction.md` before choosing a template or
authoring a storyboard, including when the user asks only for an HTML preview. Its reference and
asset study plus sound direction precede film construction. This project-owned
creative contract complements the upstream runtime contract below. Technical checks and creative
review are separate outcomes; ordinary promotional wording is sufficient to activate both.

Optional [Cinetic/Product Film methods](film-methods.md) reuse this HTML route: explicit technique
recipes, actual product component/twin provenance and configurable motion primitives feed the
existing paused timeline. Their upstream Remotion/default-fps choices do not reroute HTML video.

Existing project state wins over fresh routing. An existing `BRIEF.md`, `hyperframes.json`, or
`STORYBOARD.md` resumes the recorded workflow. An explicit inspect, check, preview, render, publish,
or batch-render request performs only that operation. When the user requests a creative revision,
reassess the recorded storyboard against the product-film contract rather than preserving a failed
structure solely because it already exists.

## Composition contract

- HTML is the source of truth. Timing is declared in `data-*` attributes and media playback is
  owned by HyperFrames.
- A standalone root is directly in `<body>`; a sub-composition root is inside `<template>` and its
  host id, inner composition id, and timeline key must match exactly.
- The root carries a sized box, `data-start="0"`, dimensions, and `data-duration`.
- Register exactly one fully built `gsap.timeline({ paused: true })` at
  `window.__timelines[compositionId]`. The renderer seeks this timeline frame by frame. Async
  construction such as waiting for `document.fonts.ready` is supported; register only after the
  timeline build finishes.
- Keep IDs unique across the assembled page. Put full-screen fills on a full-bleed child, not the
  composition root.

## Determinism and motion

- No `Date.now`, `performance.now`, render-time clocks, unseeded randomness, network dependence,
  input-state dependence, or infinite repeats.
- Do not tween `display`, raw `visibility`, or layout properties such as `top`, `left`, `width`,
  and `height`; use seek-safe transform aliases and the framework's clip lifecycle. HyperFrames
  owns `.clip` visibility, so do not animate `autoAlpha` or `visibility` on the clip itself.
- Do not pair a CSS initial transform with a GSAP tween of the same property.
- Prefer GSAP for most choreography. Use another adapter only when the composition needs Lottie,
  Three.js, Anime.js, CSS keyframes, WAAPI, or TypeGPU, and preserve one render-loop owner.

### Code drawn from time (`seek(t)` pages and ported code animations)

Code-animation libraries and prompt collections usually ship a page that draws itself from one
function of time (`window.seek(t)`, `window.renderAt(t)`) and plays it with its own
`requestAnimationFrame` loop. Porting one into a composition keeps the same discipline the
HyperFrames timeline already enforces:

- Every pixel is a function of `t`: no state carried from the previous frame (counters, pushed
  particle arrays, integrated velocities), no CSS transitions or timers. Particles and noise use a
  seeded generator built once before the first draw, or are computed from their index and `t`.
- Fonts and images are ready before the timeline is registered. Replace the page's own `<video>`
  seeking with HyperFrames media clips, whose frames the renderer extracts itself.
- The page's own play loop and preview controls stay outside the composition; only the paused
  timeline advances time during a render.

Check it, in the pinned CLI (`--workers` and `--format png-sequence` exist in 0.8.137): render the
composition twice as PNG sequences, once with one worker and once with several, and compare the
frame hashes. Workers start at different frames, so a frame that depends on which frames were drawn
before it differs between the two runs. In the test recorded with OpenSpec change
`game-ui-lens-and-code-video`, a 2-second composition that counted its own updates changed 10 of
60 frames; the same composition drawn purely from time matched on all 60.

```bash
npx --no-install hyperframes render --workers 1 --format png-sequence --output qa/seq-1
npx --no-install hyperframes render --workers 3 --format png-sequence --output qa/seq-3
(cd qa/seq-1 && sha256sum *.png) > qa/seq-1.sha256
(cd qa/seq-3 && sha256sum *.png) > qa/seq-3.sha256
diff qa/seq-1.sha256 qa/seq-3.sha256   # no output: every frame identical
```

The check proves order independence of the drawn frames only; it says nothing about how the film
looks.

## Production loop

Use the project-pinned CLI from the composition root. `film scaffold` writes a `package.json`
that pins `hyperframes` 0.8.137 and `gsap` 3.15.0 and loads GSAP from
`node_modules/gsap/dist/gsap.min.js`; run `npm install` once (network), then call the CLI with
`--no-install` so `npx` never fetches a newer release and lint, check and render run offline:

```bash
npm install
npx --no-install hyperframes lint
npx --no-install hyperframes check
npx --no-install hyperframes preview
npx --no-install hyperframes render --quality high --output out.mp4
ffprobe -v error -show_format out.mp4
```

`check` is the final gate for lint, runtime errors, layout, motion assertions, and contrast. For
sub-compositions, snapshot visible midpoints and inspect each mounted scene. Preview is review, not
approval; render only after approval, then verify that the output exists, is non-empty, and has a
plausible duration.

A lint error stops `check` before the browser session starts, and the sections after it still print
`0 errors` and `0 sample(s)`. Treat Layout, Motion and Contrast as not run when the output contains
`Browser session never ran` or reports zero samples; fix lint and rerun.

Keep the CLI version pinned for reproducibility. A latest-version upgrade probe may be run before a
render-affecting command, but a dependency bump is a separate, explicit change and must be followed
by `npx --no-install hyperframes check`.

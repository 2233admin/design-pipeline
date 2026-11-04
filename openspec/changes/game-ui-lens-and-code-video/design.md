## Context

Sources read on 2026-11-04:

- Tencent Game Institute article 10027 by AJ (Tencent Interactive Entertainment publishing),
  undated page, images from 2019-07. No licence stated: paraphrased in our words, linked, no text
  or images copied.
- howseen-ai/claude-motion-design `3d90d349ef3fdde9b7e89de4df4a2159c9e8697f`, MIT (Copyright (c)
  2026 Howseen AI). Shallow clone, read only; no script executed.
- XiaoyeCodes/code-animation-prompts `69ccbeaf0b821591a40936572c2f559d8f4cfb68`. Root
  `LICENSE.md`: the original pack (curated by Bilibili user 俯仰观照) is free to use and to pass on
  free, and must not be packaged into paid courses, paid skills or anything sold; series L
  (Lemo-Opuscar), V (mg-styles-15) and X (code-video) keep their MIT licences; the collection is
  explicitly not labelled MIT as a whole. 76 MB library. Shallow clone, read only; no script
  executed.

## Decisions

1. **Lenses are advisory and live in the existing game UI guide.** No gate, receipt or finding
   code. Taste stays with the owner. A lens names a check only where an existing tool measures part
   of it, and states the tool's limit (the composition gate skips text over image or gradient
   backgrounds and reads a translucent panel's first opaque ancestor; `verify interaction` measures
   DOM boxes and transforms, not canvas particles; `composition capture --seek` positions GSAP
   timelines but does not run HyperFrames clip visibility, so it was not used for film checks).
2. **Each lens and each adopted film mechanism is a #260 ablation candidate.** The guides say so;
   none is kept by default.
3. **Film mechanisms land in the guides that own the step**, not in a new guide: seek discipline
   in `hyperframes.md`, review sheets and motion blur in `workflow-film.md`, effect placement in
   `film-score.md`, the named-reference rule in `product-film-direction.md`, the audit record in
   `film-methods.md`.
4. **Motion blur is optional delivery post-processing.** Render at N× the delivery rate with the
   pinned CLI and average the first half of each group of N with FFmpeg `tmix`, keeping one frame
   per group. Opening the exposure at the frame time means a cut on a frame boundary is never
   blended. HyperFrames caps `--fps` at 240, so 60 fps delivery gets 4 subframes.
5. **Order independence is checked on real renders**, not on single captures: one worker versus
   several workers as PNG sequences, compared by hash.
6. **The style library is routed as a companion, not vendored and not a `sources fetch`
   bundle.** The design direction library is fetched because it is MIT throughout. This collection
   carries a no-resale condition that an MIT package cannot pass on, plus per-series licences.
   Routing keeps provenance with the owner's own copy and leaves the package licence clean.
7. **Not adopted** (recorded in `film-methods.md`): fixed style bans and quotas, repeated
   self-scoring to a threshold, one studio's stock-asset sources and shell renderers,
   platform-specific caption and poster tricks, per-shot parallel build agents. Bans stay
   contextual per the existing project-authority rule; a self-score is not acceptance.

## Measurements behind the guide text

Run on this host (FFmpeg 6.1.1, HyperFrames 0.8.164 from the root workspace; the scaffold pins
0.8.137, whose bundled CLI also defines `--fps` up to 240, `--workers` and `png-sequence`):

- Subframe blur on a 2 s 640×360 HyperFrames composition with a white box moving 600 px/s and a
  hard cut from red to blue at 1.0 s: 240 fps render 24 s, 30 fps render 5 s; blended output 60
  frames at 30 fps; box 40 px wide sharp, 47 px smeared (expected 40 + 7.5); corner colour 30 red
  then 30 blue frames, no mixed frame. The 60 fps variant (`tmix=frames=2`, `mod(n,4)=1`): 120
  frames, 60 red and 60 blue, none mixed.
- Synthetic FFmpeg source with the cut at 0.51 s (off the 30 fps grid): one mixed frame, as the
  guide warns.
- Order independence: the same composition rendered with `--workers 1` and `--workers 3` as PNG
  sequences, 60 of 60 hashes equal; a copy that counted its own `onUpdate` calls differed on 10 of
  60 frames.
- Effect peak: a 0.6 s synthetic effect peaking at 0.299 s measured 0.299 s in 1 ms windows;
  delayed by 1701 ms into a 3 s bed it peaked at 2.000 s.
- Review sheets: the strip, phone and seam commands produced 3840×180, 1800×609 and 1920×180
  images on test renders.

## Compatibility

No command, flag, schema, receipt or gate changes. Existing projects are unaffected.

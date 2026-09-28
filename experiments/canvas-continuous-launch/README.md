# SeedController — Connected imagination

Historical continuity study. The user rejected its silent visual direction for the intended
promotion. The current direction is [Field Notes](../seed-film-reference/README.md).

22-second silent HTML product-film concept. Run `node server.cjs`, then open
http://127.0.0.1:4175/ . This experiment shares GSAP and the original landscape with the sibling
`ascii-canvas-launch` folder; keep both folders when moving the experiment. The previous 40-second
version remains on port 4174 for comparison.

The film uses one Canvas 2D world with persistent prompt/image actors. GSAP 3.13.0 owns one paused,
seekable timeline at `window.__timelines['canvas-film']`; playing is a preview adapter. All drawing
derives from timeline time. The image field is sampled once from the local asset and cached.

Keyboard: Tab reaches controls; Space toggles playback outside controls; range arrows seek; Escape
pauses. Reduced motion starts on the held end frame. A text transcript describes the product action.

This is an illustrative product film, not a product screen recording. Three storyboard panels
reuse crops of one generated image, and do not demonstrate actual video generation. The source
prompt and asset provenance are in `../ascii-canvas-launch/assets/PROMPT.md`; GSAP provenance is
in `../ascii-canvas-launch/vendor/README.md`.

Uses HTML composition metadata and a deterministic timeline; HyperFrames CLI lint/check/render
were not run. No video/audio export is included. Technical and creative review evidence lives in
`openspec/changes/default-product-film-storytelling/qa.md` at the repository root.

# SeedController — 从想法，到作品

Historical style study. The user found the independent scenes too slide-like for the intended
promotion. The current direction is [Field Notes](../seed-film-reference/README.md).

A 40-second HTML product film. ASCII describes the idea and structure; color belongs to the
reference materials and finished imagery. Features are grounded in SeedController's local
README and domain context. The interface is an illustrative composition, not a screen recording.

```sh
node experiments/ascii-canvas-launch/server.cjs
```

Open http://127.0.0.1:4174. Pause, drag the timeline, or choose a chapter. Space toggles playback
outside form controls. Fullscreen is available when the browser permits it. All assets are local.

One GSAP 3.13.0 timeline lives at `window.__timelines['seed-film']`. Its duration is exactly 40
seconds and it supports deterministic seeking. The preview uses HyperFrames-style composition
metadata, but HyperFrames CLI lint/check/render have not been run. No MP4 or audio is included.

`assets/landscape.png` was generated with the built-in imagegen tool for this film. Its complete
prompt and provenance are in `assets/PROMPT.md`. ASCII previews are derived from its luminance.
GSAP source and license attribution are under `vendor/README.md`; original runtime notices remain.

# SeedController — Field Notes

A new 32-second HTML promotional film, informed by the supplied [SEAM reference](https://www.liblib.tv/detail/8eee3e10b8c3442882ac631511100ce2).
Moving footage, cool grading, detail crops and fine annotations lead into a canvas of connected creative material, then back into full-frame results. Includes an original stereo score.

## Play locally

From the repository root:

```sh
node experiments/seed-film-reference/server.cjs
```

Open <http://127.0.0.1:4176/> and choose **播放影片 · 开启声音**. The initial frame stays held until an explicit play action. Playback, seeking, restart, mute, volume and fullscreen are available below the film. All playback assets are local; there is no install step.

The preview is a promotional concept using existing project footage, not a recording of a live generation task. The earlier experiments remain available separately.

## Sources and implementation

- The three videos are copied unchanged from the SeedController frontend's existing public login assets: `city-ruins.mp4`, `night-ride.mp4`, and `moon-piano.mp4`. Their embedded source audio is muted. Ownership and any underlying asset license remain with the source project.
- The SEAM page informed treatment and editing. Its video and music were not copied into this film.
- `compose-score.py` is the reproducible source of `assets/field-notes-score.wav`: an original 32-second, 96 BPM electronic instrumental. Regenerating it requires Python and NumPy; playback does not.
- GSAP 3.13.0 is vendored with its existing provenance in `vendor/README.md`. One finite timeline drives Canvas 2D graphics, clip windows and soundtrack synchronization.
- `DESIGN.md` and `MOTION.md` record the foundations. The edit, sources, sound decisions and QA are recorded under `openspec/changes/create-reference-led-canvas-film/`.

The user reviewed this version, reported no major remaining problems, and requested a PR. Sound loading, timing, levels and controls were verified; the current tooling did not provide auditory input for a separate subjective listening review by the agent.

## Decisions

1. **Two videos, not video plus live code.** The owner judges the render, the artefact that ships. Two `<video>`
   elements play from `file://` without a server; an iframe of the composition would need one (file origins are
   opaque) and would show code the render may not match. Live-code sync stays an agent tool (frame pairs).
2. **One clock, one frame rate.** Frame numbers count render frames. `film compare` requires `storyboard.fps`
   and a constant-frame-rate render whose encoded rate equals it (probed with FFmpeg: `r_frame_rate` equal to
   `avg_frame_rate` and to `storyboard.fps`); otherwise it exits 1 with a fix (set `fps`, or re-render at it). The
   reference may have any rate: it is shown at the same time, so it shows its frame containing that instant. The
   render is the master; while playing, each animation frame resets the reference's `currentTime` when it drifts
   more than half a render frame. Stepping sets both to `(n + 0.5) / fps`. Unequal durations: the shorter video
   holds its last frame.
3. **Overlay and wipe need the same aspect ratio.** Both videos are drawn into one box of the render's size. When
   the aspect ratios differ (beyond 1 %), overlay and wipe are disabled with the reason shown, and the page falls
   back to side by side; this matches the frame-pair "unmeasured" rule.
4. **Markers come from existing evidence.** Cut ticks from the reference analysis and the render's cut list in the
   latest `verify film-render` report; worst pairs from its frame-pair list. Without that report, the page still
   works and says markers are missing and which command produces them.
5. **Binding.** `compare.json` records the sha256 of the reference source, the analysis, the draft and the
   `verify film-render` report the markers came from (`null` when there was none). The review step treats the page
   as current only when all four match the current files; videos are linked by relative path, not copied.
   `compare.json` and `renders/side-by-side.json` are plain hash bindings read only by `next`: no schema id, no
   status, no receipt lineage. They are not evidence receipts; the film gate's receipt stays the only one.
6. **Proof video.** Both inputs are resampled to the render's frame rate and scaled to the same panel height
   (540 landscape, 960 portrait); whichever is shorter is padded by cloning its last frame (`tpad=stop_mode=clone`),
   then `hstack` with a 20 px gap and the output trimmed to the render's duration. A 64 px label band is rendered
   once to PNG by the browser (FFmpeg `drawtext` is often missing). Audio is the render's only, cut at the same
   duration; the reference's audio is dropped. `-preset veryfast -crf 18`. The sidecar `renders/side-by-side.json` records input
   hashes and the command. The proof is optional: the review ask names it only when its recorded hashes match the
   current reference and draft, and otherwise gives the `film proof` command instead of naming a stale file.

## Risks

- Browser seek accuracy on `file://` H.264: stepping uses half-frame offsets to land inside the frame; tests decode
  the frame shown at three times and compare it with FFmpeg's.
- Large references: the page streams from disk; nothing is inlined.

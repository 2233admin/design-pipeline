## Decisions

1. **Two videos, not video plus live code.** The owner judges the render, the artefact that ships. Two `<video>`
   elements play from `file://` without a server; an iframe of the composition would need one (file origins are
   opaque) and would show code the render may not match. Live-code sync stays an agent tool (frame pairs).
2. **One clock.** The render is the master. While playing, each animation frame sets the reference's
   `currentTime` when it drifts more than half a frame. Stepping sets both to `(n + 0.5) / fps`, where `fps` is the
   storyboard's; the frame number shown is `n`. Unequal durations: the shorter video holds its last frame.
3. **Overlay and wipe need the same aspect ratio.** Both videos are drawn into one box of the render's size. When
   the aspect ratios differ (beyond 1 %), overlay and wipe are disabled with the reason shown, and the page falls
   back to side by side; this matches the frame-pair "unmeasured" rule.
4. **Markers come from existing evidence.** Cut ticks from the reference analysis and the render's cut list in the
   latest `verify film-render` report; worst pairs from its frame-pair list. Without that report, the page still
   works and says markers are missing and which command produces them.
5. **Binding.** `compare.json` records the sha256 of the reference source, the analysis and the draft. The review
   step treats the page as current only when all three match; videos are linked by relative path, not copied.
6. **Proof video.** Both inputs scaled to the same panel height (540 landscape, 960 portrait), `hstack` with a
   20 px gap, a 64 px label band rendered once to PNG by the browser (FFmpeg `drawtext` is often missing),
   `-preset veryfast -crf 18`, render length, render audio. The sidecar `renders/side-by-side.json` records input
   hashes and the command; the file is rebuilt when either input changes.

## Risks

- Browser seek accuracy on `file://` H.264: stepping uses half-frame offsets to land inside the frame; tests decode
  the frame shown at three times and compare it with FFmpeg's.
- Large references: the page streams from disk; nothing is inlined.

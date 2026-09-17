# Product animation verification

Trace: CERE-482. Change: `integrate-product-animation` (active, awaiting principal review).

## Identity

- Worktree: `D:/projects/design-pipeline/product-animation-integration`
- Branch: `product-animation-integration`
- Codex session/thread: `01a0af45-0f67-7392-b5f5-ae6f54242f36`
- Orca terminal: `term_61f17fb1-11b9-4d46-9176-e8e166957529`
- Routing baseline integrated: `472a4514dd9d1e7fb64c39e7972349f300b71ce7`
- Destination: `D:/projects/design-pipeline/osprey`, branch `osprey`.

## Actual film

`experiments/openalice-product-animation/output/openalice.mp4`: H.264, 1280×720, 30 fps, exactly
24.000 seconds / 720 frames, 1,670,480 bytes. Silent original product graphics, five autonomous
scenes and four transitions. Native playback page: `watch.html`; authored timeline: `preview.html`.
The film ends with AWAITING APPROVAL and never depicts a submitted trade.

The machine receipt is `experiments/openalice-product-animation/output/verification.json`:

- Full FFmpeg decode succeeded.
- Zero-input preview samples advanced through scenes 0, 1, 2, 3, 4 and ended at 24s; composition
  scrollY stayed zero and its document height equalled the fixed viewport height.
- Actual MP4 autoplay in Chromium reached ended/currentTime 24; 720 total video frames and zero
  dropped frames. Native requestVideoFrameCallback samples prove media-clock progression.
- Keyboard replay and pause, previous/next scenes, deterministic backward seeking, reduced-motion
  static overview, and 390px preview overflow checks passed. No page/console errors or remote requests.
- Sixteen transition-seam samples have at most one visible title scene. SVG progress at 2, 12,
  and 22 seconds matches continuous fractional offsets.
- Receipt binds source, foundation, story, route, dependency lock, and MP4 hashes.

## Visual inspection of the actual encoded file

Inspected decoded MP4 frames at 0, 2, 4.3, 6.5, 9.3, 11.5, 14.3, 16.5, 18.3, 21, and 23.966 seconds,
including the contact sheet, full-size research scene, and native encoded-video playback capture.
Also inspected the reduced-motion mobile preview capture. Evidence is in `output/frame-*.png`,
`contact-sheet.png`, `encoded-playing.png`, and `preview-reduced-mobile.png`.

First rendered review found two **Introduced** defects despite a green automated check: overlapping
outgoing/incoming headlines, and CSS pixel rounding turning normalized SVG progress into a step.
One repair batch made exits precede entrances, animated SVG attributes rather than rounded CSS
values, and made the opening headline visible at frame zero. Re-rendered and inspected the final
encoded frames: titles are distinct, the research trail advances continuously, and final approval
copy remains visible. No unresolved observed visual blockers. This is sampled-frame visual review
plus full automated playback/decode, not a claim of watching every frame by eye.

HyperFrames `check.json` passes runtime/layout/contrast with zero errors/warnings. Three informational
`connector_orphan` findings at 4.3s concern the geometric boxes of fully trimmed paths before their
endpoints enter; the actual decoded 4.3s frame shows no connector shafts. Its motion-assertion pass
is disabled; the separate playback and seam assertions above provide motion evidence.

## Design gates and limitations

- Target DESIGN.md and MOTION.md checkers: ready. Primitive: reveal.trim-line. Product signature:
  research accumulates along a Git trail and stops at the human boundary.
- Motion opportunity: a once-per-view film uses staged disclosure to explain a product sequence;
  24-second budget, no perpetual or input-driven motion. Cleanup pauses the preview on pagehide.
- Interface review scope: standalone film, preview controls, and native MP4 player. Existing scroll
  sample and unrelated user files are excluded consumers. No removed interaction signals.
- Accessibility: readable final holds, transcript, keyboard controls, native media controls,
  reduced-motion initial state, no flashes, 81/81 contrast samples passed. Small-screen film text
  scales with 16:9; portrait editorial redesign is outside scope and the transcript remains readable.
- Visual taste 4/5, clarity 4/5, accessibility 4/5, responsiveness 3/5 (landscape film), motion 4/5,
  engineering fit 4/5, performance risk 5/5 (no external assets, 0 dropped native video frames).
- No screenshot reconstruction/fidelity claim, reference-evidence carrier, persistent spatial
  scene, interactive Playground, or adaptive-skill promotion applies.
- Route selects motion-graphics/product-launch-video and preserves plan hash. Shared toolchain
  admission remains blocked/review, recorded honestly; this user-authorized local runtime uses the
  documented fallback and does not globally admit the catalog candidate.
- No audio, portrait export, real market data, real trading, or remote publication.

## Repository and integration

Task worktree `node scripts/qa.cjs`: 668/668 tests across 82 files; installed-package CLI smoke
11/11; reproducible archives/checksums; repository status byte-identical. Exact summary and log
digest: `evidence/qa-task.json`. The earlier run failed only the status-invariance check because
evidence files were being created concurrently; the successful rerun froze edits during QA.

Strict OpenSpec validation passed for both `integrate-product-animation` and
`stage0-job-plan-binding`. `git diff --check` passed.

Before integration, captured all 24 pre-existing modified/untracked osprey file hashes and exact
porcelain status in `evidence/osprey-before.json`. Destination integration and QA are pending in
this initial report; the final receipt will record their actual outcomes.

## Pipeline refinement and closeout

Only after actual film inspection, expanded the existing HyperFrames reference with encoded-file
proof, separate preview/render clocks, transition-frame inspection, fractional SVG progress,
and truthful distinction between routing and executable admission. Added no new global gate or
runtime dependency to the portable skill. The example's scripts make reproduction and proof local.

PM: append evidence to existing CERE-482; no duplicate issue. Docs: source contracts, target README,
storyboard, and this report. KB: no duplicate knowledge note; the reusable contract lives in the
repository reference, while task state belongs in Multica. Git: only task-owned files are staged;
the destination user's work is not staged. The active change remains reviewable rather than archived.

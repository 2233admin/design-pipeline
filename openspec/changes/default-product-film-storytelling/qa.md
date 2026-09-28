# Verification

## Subsequent user review — direction rejected

The user rejected this silent 22-second concept as the intended promotional-film direction and
provided SEAM as a moving reference. The technical results below remain historical facts; they
do not override that rejection. See `ground-films-in-references-and-sound/reference.md` for the
new evidence and direction. Do not continue this experiment as an accepted creative baseline.

## Moving proof

Browser: local HTML at port 4175. Played 1–9s at natural speed and captured eight sequential
frames in the browser. The cursor moves toward the output port around 4s; the signal follows
the connection at 5s; a character field assembles into the image at 6–9s. Persistent world
geometry makes the prompt-to-image relationship observable while the camera follows it.

Corrections after proof: fade the opening title before the prompt body occupies it; begin
character assembly earlier to remove the empty pause after the signal arrives. During the
later pullback, move the same prompt above the central image and reshape its existing link,
removing a duplicate connector that crossed the left storyboard panel.

## Technical review

- Six focused HyperFrames/routing/package-pointer tests pass, including ordinary Chinese
  promotion requests and negative UI/marketing-page cases.
- Both experiment foundations validate ready. JavaScript syntax check passes.
- Uninterrupted natural-speed playback reached exactly 22s; twelve time-stamped canvas samples
  at approximately two-second intervals were inspected, alongside full-size transition frames.
  Browser console contained no warnings or errors during this run.
- Six seeks (3, 6.8, 9.3, 15.8, 18.7, 21s) produce byte-identical canvas images after visiting
  end/start and seeking back. One registered timeline has duration 22s.
- Desktop viewport 1280px has 1265px document width (scrollbar); mobile 390x844 has 390px
  document width. Controls reflow without horizontal overflow. Film retains its 16:9 composition;
  small node labels are secondary detail, best viewed on desktop/fullscreen.
- Keyboard Home then ArrowRight sets the progress to 0.1s. The replay button restarts playback.
  Emulated reduced motion starts paused at 21s; emulation and viewport overrides were restored.
- Repository-wide `node scripts/qa.cjs` exited 0: 676 tests across 82 files; reproducible
  archives include the new contract; isolated install and 11 installed-package public CLI
  tests pass. QA preserved repository status byte-for-byte. Log: `.scratch/product-film-qa.log`.

## Creative review

Agent review of the moving proof, full uninterrupted playback samples, and transition frames:

- Product comprehension: 1.7–6s connects a written idea to an image node; 12.8–17.5s preserves
  that image while a command and two additional compositions form a connected storyboard.
- Continuity: the same prompt/image world persists. The camera follows the signal at 4–6.5s;
  the mountain silhouette survives the 8.7–10.5s ASCII/color wipe. At 18.7s the three pictures
  visibly converge and flatten before the closing mark, instead of a new full-screen scene reset.
- Rhythm: short initial anticipation; typing and signal travel; glyph assembly; full-color
  payoff held at 10.5–12.8s; wider storyboard; rapid contraction; brand holds around 20–22s.
- Transformation: characters spatially assemble; image content changes from structure to color;
  the image yields additional crops and connections. Section crossfades are no longer the primary
  storytelling mechanism. The full-color hold is intentionally still.
- Identity: ASCII represents the idea and structure, the landscape supplies the creative outcome,
  and connected nodes carry the SeedController story. No Apple footage, logo or branding copied.

This is an agent-reviewed improvement over the six-scene baseline, not a user acceptance result.
The storyboard remains a simplified concept; detailed production UI behavior and sound design
are outside this preview. Browser timeouts while waiting on long CDP calls were worked around by
collecting the playback record asynchronously; they were not page runtime errors.

## Scope and limitations

Silent HTML concept film. No sound-design review, MP4 export, HyperFrames CLI check or hardware
frame-rate benchmark. The original landscape and its three crops are illustrative assets, not
evidence of actual product image/video generation. Actual capabilities are grounded in the local
SeedController README and context inspected for the prior film. The 40-second baseline is retained.

# Design

Source record: `skill/references/reference-skill-onetake.md` (pinned `36072d36`). Ideas are taken
from its public README only and restated here; the implementation is independent.

## Storyboard (brief w1)

- `CARRIED_HANDOFFS = continuation, morph, camera-carry, match-cut`. A beat whose handoff is one of
  these SHALL have `carrier`: a non-placeholder string naming what survives the boundary and what it
  becomes ("prompt bar opens into the app window"). Missing: error `carrier-unnamed`.
- `holdSec` (optional number, 0 < holdSec <= beat length): seconds of stillness at the end of the beat.
- `uniform-cadence` (error): at least 4 beats and longest / shortest beat length < 3. The idea's
  target is 4x or more; 3x is the failure line so ordinary films are not rejected on a hair.
- `no-rest` (error): durationSec >= 8 and no title/brand hold and no beat with holdSec >= 0.3.
- Metrics gain `cadenceRatio` and `restSec`.

## Render and check (brief w2)

- `carry-cut` (error): a detected scene cut within the cut tolerance of a boundary whose handoff is
  continuation, morph or camera-carry. (match-cut is a cut by design and is exempt.)
- `stillShare`: share of 10 fps motion samples below the frozen threshold, reported in the render
  result. Reported, not gated, until calibrated on cases.
- `carryScore` in `film check`: over planned carried boundaries (excluding match-cut), the share that
  are carried in the timeline (when a timeline exists) and not cut in the render (when a render
  exists). `low-carry` (error) when at least 3 such boundaries and carryScore < 0.6.

## Direction (brief w3)

- Concepts stage and guide: each card starts with the central idea as one sentence about the
  picture ("one dot becomes every screen"), not a list of scenes.
- `camera-follow` choreography: the camera leads the subject slightly, travels to where the next
  subject lands, and holds still during rests; seek-safe, registered in `registry.json`.
- `workflow-film.md` and `product-film-direction.md` gain a short carry-and-rhythm section.

## Why

Closes #265. The owner shared a Tencent Game Institute analysis of the Arknights interface
(<https://gameinstitute.qq.com/article/10027>) and posts about video made entirely in code.
`game-ui-and-narrative.md` covers game UI state, layers and accessibility, but gives a reviewer
nothing to look at for world-branded UI and key art: where information lives (in the world or on
top of it), material, depth in flat UI, decorative type that fits the world, focus, transition
logic and input-driven feedback. The film workflow renders HTML frame by frame, but lacks several
mechanisms the public code-video libraries rely on: order-independent drawing from time checked
on real renders, motion blur from subframes, frame strips around fast moves and loop seams, sound
effects anchored by onset or peak, a named-reference rule for the brief, and a route to a
large style library with reference stills.

## What Changes

- `game-ui-and-narrative.md` gains an advisory "World-Branded UI And Key Art Review Lens" with
  seven lenses (L1 diegetic or not, L2 material, L3 depth, L4 decorative type, L5 focus and world
  grounds, L6 transition logic, L7 input feedback). Each lens names what to look for, a good and a
  bad sign, and only where an existing tool measures part of it, the check to run and its limit.
  The lenses never block; they are candidate layers for the ablation eval (#260).
- Film guides, no new gate, command or flag:
  - `hyperframes.md`: drawing from time for ported `seek(t)`/`renderAt(t)` code, checked by
    rendering with one and with several workers as PNG sequences and comparing frame hashes.
  - `workflow-film.md` review: strips of consecutive frames around fast moves, a phone-width
    sheet, a loop seam strip, and a muted one-sentence read by someone who did not build it.
  - `workflow-film.md` deliver: optional motion blur by rendering subframes with HyperFrames
    `--fps` and averaging them with FFmpeg `tmix` (180° shutter, cuts on whole frames).
  - `film-score.md`: hits (taps, clicks, pops, impacts) put their onset on the cue frame under an
    `impact`/`accent`/`downbeat` cue, which the audio gate times by onset; swells (whooshes,
    risers) put their loudest RMS window on the moment under a `riser` cue, which it does not time.
  - `product-film-direction.md`: name a style by a concrete work, not adjectives.
  - `prompt-motion.md`: XiaoyeCodes/code-animation-prompts routed as a companion style library,
    not vendored or fetched (licence decision recorded).
  - `film-methods.md`: the audit record of both libraries, what landed where, what was already
    covered and what was not adopted, all as #260 ablation candidates.
- `capability-routing.md` row for game UI mentions the lens; `game-ui-and-narrative.md` becomes a
  required package resource; `THIRD_PARTY_NOTICES.md` records the concept sources; CHANGELOG.

## Capabilities

- `design-pipeline`: ADDED `World-branded UI and key art have an advisory review lens`,
  `Film guides carry the audited code-video mechanisms`, `Style libraries with restrictive or
  mixed terms are routed, not bundled`.

## Reuse

- Checks named by the lenses are the existing `verify composition`, `verify interaction`,
  `composition capture`, `verify film-render` and the UI transition rules.
- Film mechanisms use the pinned HyperFrames CLI (`--fps`, `--workers`, `--format png-sequence`,
  all present in 0.8.137), FFmpeg filters already required by the film checks, `audio master` and
  the audio gate.

## Impact

Documentation and a guide-content test only. Files: the seven guides above, `capability-routing.md`,
`package-resources.json`, `THIRD_PARTY_NOTICES.md`, `CHANGELOG.md`, a new test registered in
`scripts/test-manifest.json`.

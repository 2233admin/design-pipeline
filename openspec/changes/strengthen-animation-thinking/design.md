# Design

## Reuse before adding

Use storyboard.v1's existing benefit/proofAction, beat subject/transformation/carrier/arc/note,
sound cues, reference.md and qa.md. Motion thinking belongs in these artifacts and the authored
motion study; no parallel planning schema or transcript-bound requirement is introduced.

## Choreography

`pose-to-pose` appends a sequence of authored keys to the existing paused GSAP timeline.
Keys have relative `at`, a numeric transform/opacity `pose`, and optional incoming `ease` or
`hold` (hold the preceding pose, switch on the new key). The first key is at zero, times strictly
increase, all keys name the same properties. Explicit spacing keys describe arcs, acceleration,
smears and staggered secondary action without fixed ratios. Validate all input before mutation.

`draw-on` accepts ordered SVG geometry, uses native arc length and strokeDashoffset, and fits
the strokes and gaps inside one exact drawing interval. It is one general reveal tool and does
not turn the film workflow into a whiteboard pipeline. Both patterns seek without callbacks.

## Gates versus direction

Known failures remain errors: invalid contracts, timeline gaps/overlaps, missing transformations,
fade-only action, property conflicts, failed carried boundaries, missing required audio, invalid
material routes. A valid film can intentionally use uniform pulses, uninterrupted acceleration,
long held images, dissolves or off-onset cuts. Thus `uniform-cadence`, `no-rest`, `hold-dominant`,
`hold-chain`, `slideshow-handoffs`, `sound-unbound`, and `cuts-off-beat` become warnings with
contextual review hints. A sustained or contrapuntal phrase need not accent half the action beats.
`slideshow-pair` and `surface-only-motion` still reject the known fade-panel failure shape.

The explicit `arc: anticipate-act-settle` still requests those diagnostics; it is not mandatory.
No static-frame bypass is added for action beats; an intentional held image is a hold beat,
or authored rest inside a beat that actually acts. The timeline gate recognizes later changed
numeric transform sets on the same target; initial sets and unchanged poses are not action,
and opacity/scale alone still fail. This does not establish continuous carry across a boundary.
A tempo grid is an editing aid, not a director:
off-grid cut decisions in the edit workflow should be review warnings, while missing footage,
licenses, source ranges and timing closure stay errors.
Explicit audio accents still promise a musical event and retain `cue-off-grid` failures.

## Verification

Unit tests assert input validation and key timing, warning/error separation and existing paths.
The lead reviews inexpensive-worker changes and compares cold, forward and reverse browser
seeks of the same study. A rendered study and timing evidence substantiate runtime behavior;
they do not establish professional artistic quality or the user's visual acceptance.

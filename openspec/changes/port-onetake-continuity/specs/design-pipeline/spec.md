# Design pipeline delta

## Requirement: named carriers
A storyboard beat joined to the previous beat by a carried handoff SHALL name what survives the
boundary.

## Requirement: rhythm
The storyboard gate SHALL reject near-uniform beat lengths in films of four or more beats and
films of eight seconds or more without any rest.

## Requirement: measured continuity
Film check SHALL report a continuity score over carried boundaries and SHALL fail when a planned
carry renders as a scene cut or when the score is below 0.6 with three or more carried boundaries.

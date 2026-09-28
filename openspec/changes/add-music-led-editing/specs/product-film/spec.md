# Product film delta

## Requirement: music analysis
The pipeline SHALL derive a beat grid, downbeats and per-bar energy from a music file, or use a
score grid when one exists.

## Requirement: edit on the grid
Every cut in an edit SHALL fall within one frame of a beat. The edit check SHALL report timeline
gaps and overlaps, off-grid cuts, non-commercial footage in a commercial edit and reads outside a
source, and SHALL warn on shots under one beat or over sixteen, monotone shot lengths, reused
footage ranges, extreme speed and cuts that are not visible in the render.

## Requirement: shared delivery gates
The rendered edit SHALL be checked by the render, audio and composition gates.

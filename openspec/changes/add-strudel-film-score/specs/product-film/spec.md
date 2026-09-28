# Product film delta

## Requirement: score as code
The pipeline SHALL render a Strudel pattern for the storyboard's duration to a WAV file offline,
SHALL export the pattern's onsets and beat grid, and SHALL record the score as a commercially
usable asset only when no sample libraries are used.

## Requirement: grid alignment
Hard and match cuts and downbeat, accent and impact cues SHALL be within one frame of a beat or
pattern onset, and each finding SHALL give the nearest grid time.

## Requirement: license boundary
The package SHALL NOT include Strudel code. Strudel SHALL be installed into the user's project on
first use and invoked in a separate process.

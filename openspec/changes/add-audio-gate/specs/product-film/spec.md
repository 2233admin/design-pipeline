# Product film delta

## ADDED Requirements

### Requirement: audio delivery gate
The pipeline SHALL fail a scored film without audio, integrated loudness outside the selected
target, true peak above -1 dBTP, flat-top clipping, music that becomes audible after the entry
cue, and non-commercial assets in a commercial film. It SHALL warn on unplanned mid-film silence,
audio still loud at the last frame, music ending before the exit cue, and unrecorded licenses.
Every finding SHALL carry a concrete fix, and the result SHALL NOT report creative acceptance.

#### Scenario: Scored film violates delivery constraints
- **WHEN** a scored film has no audio, loudness outside its selected target, true peak above -1 dBTP, flat-top clipping, music that becomes audible only after the entry cue, or non-commercial assets in a commercial film
- **THEN** the pipeline SHALL fail the film and each finding SHALL carry a concrete fix

#### Scenario: Audio has a warning condition
- **WHEN** audio has unplanned mid-film silence, remains loud at the last frame, music ends before the exit cue, or a license is unrecorded
- **THEN** the pipeline SHALL warn and provide a concrete fix

#### Scenario: Audio gate reports its result
- **WHEN** the audio delivery gate completes
- **THEN** its result SHALL NOT report creative acceptance

### Requirement: mastering helper
The pipeline SHALL normalize a soundtrack to a delivery target in two passes with an optional
fade-out and SHALL report when normalization had to compress dynamics.

#### Scenario: Soundtrack is mastered
- **WHEN** the helper masters a soundtrack for a delivery target
- **THEN** it SHALL use two normalization passes, apply a fade-out only when requested, and report when normalization had to compress dynamics

# Product film delta

## Requirement: audio delivery gate
The pipeline SHALL fail a scored film without audio, integrated loudness outside the selected
target, true peak above -1 dBTP, flat-top clipping, music that becomes audible after the entry
cue, and non-commercial assets in a commercial film. It SHALL warn on unplanned mid-film silence,
audio still loud at the last frame, music ending before the exit cue, and unrecorded licenses.
Every finding SHALL carry a concrete fix, and the result SHALL NOT report creative acceptance.

## Requirement: mastering helper
The pipeline SHALL normalize a soundtrack to a delivery target in two passes with an optional
fade-out and SHALL report when normalization had to compress dynamics.

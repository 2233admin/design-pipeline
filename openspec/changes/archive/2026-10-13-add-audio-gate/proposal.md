# Add an audio gate

Promotional films are audiovisual, but the only sound check was whether cuts land on audio
onsets. A real HyperFrames render passed every film gate at -21.2 LUFS, 7 LU below web delivery
loudness, and ended with the music still playing at the last frame. Licensing was a free-text
`sound.source` string.

Add a runtime-agnostic audio gate (loudness, true peak, clipping, silence, ending, cue alignment,
licensing) with concrete fixes, and an `audio master` helper that performs the repair the
loudness findings point to, so an agent does not hand-tune two-pass loudnorm.

# Strengthen film cue binding and add a song map

The storyboard gate only requires half of the action beats to bind a sound cue, and checks that a
bound cue id exists. A declared accent, downbeat, impact or riser that no beat references, or a cue
bound to a storyboard beat it does not fall inside, passes
silently: the music hits and the picture does not answer. The `sound.md` scaffold is five
free-text bullets, and no document maps music events to motion responses, so an agent has no vocabulary for what a drop, a riser or a break should do to
the edit.

Add two storyboard warnings (`cue-unbound`, `cue-outside-beat`), replace the `sound.md` scaffold with a song-map table, and document a music-to-motion vocabulary.

Idea borrowed from github.com/bizarro/evangelion: music events mapped to a motion vocabulary, and
a song-map table from bars and sections to picture.

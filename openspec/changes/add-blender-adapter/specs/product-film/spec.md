# Product film delta

## Requirement: Blender shots
The pipeline SHALL render a declared Blender template headless from validated parameters, SHALL
encode the frames into a film, and SHALL convert the scene's keyframes into the film timeline
format so the timeline gate applies.

## Requirement: external tools and assets
The package SHALL NOT include Blender or downloaded assets. Downloaded HDRIs SHALL be verified
against the publisher's checksum.

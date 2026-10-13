# product-film Specification

## Purpose
Define the deterministic contracts and gates for promotional product films: storyboard structure, objective render evidence, seek-safe choreography and related film tooling, kept separate from reviewed creative acceptance, which gates never grant.

## Requirements

### Requirement: storyboard gate
The pipeline SHALL validate `storyboard.json` against `design-pipeline.film-storyboard.v1`. It
SHALL fail open or gapped timelines, action beats without a product action or before/after
transformation, surface-only action motion, slideshow handoff patterns, dominant or chained holds,
unknown choreography ids, and scored films without an entry cue or beat-bound sound. It SHALL
report `creativeAcceptance: not-assessed`.

#### Scenario: Storyboard violates structure or choreography
- **WHEN** `storyboard.json` has an open or gapped timeline, an action beat without a product action or before/after transformation, surface-only action motion, a slideshow handoff, dominant or chained holds, or an unknown choreography id
- **THEN** the pipeline SHALL fail storyboard validation

#### Scenario: Scored film lacks required sound cues
- **WHEN** a scored film has no entry cue or beat-bound sound
- **THEN** the pipeline SHALL fail storyboard validation

#### Scenario: Storyboard gate reports acceptance
- **WHEN** storyboard validation completes
- **THEN** it SHALL report `creativeAcceptance: not-assessed`

### Requirement: render evidence
The pipeline SHALL measure a rendered film's duration against the storyboard, detect scene cuts
and compare them with planned cut handoffs, report the share of cuts aligned with audio onsets,
flag a scored film without audio, and optionally write one midpoint frame per beat and a contact
sheet. Evidence SHALL NOT be reported as creative acceptance.

#### Scenario: Render evidence is collected
- **WHEN** a rendered film is checked
- **THEN** the pipeline SHALL measure duration against the storyboard, detect scene cuts, compare them with planned cut handoffs, and report the share of cuts aligned with audio onsets
- **AND** it MAY write one midpoint frame per beat and a contact sheet
- **AND** evidence SHALL NOT be reported as creative acceptance

#### Scenario: Scored film has no audio
- **WHEN** a scored film has no audio
- **THEN** the pipeline SHALL flag it

### Requirement: choreography library
The package SHALL ship parametric choreography patterns that tween only seek-safe properties at
absolute times, are deterministic, and match a registry consumed by the storyboard gate.

#### Scenario: Choreography is packaged
- **WHEN** the package includes choreography patterns
- **THEN** patterns SHALL be parametric, tween only seek-safe properties at absolute times, be deterministic, and match the registry consumed by the storyboard gate

### Requirement: timeline gate
The pipeline SHALL check a `design-pipeline.film-timeline.v1` manifest against its storyboard and
SHALL report layout-property tweens, infinite repeats, tweens past the film end, duration drift,
action beats without animated tweens, action beats that animate only opacity or scale, and planned
continuation, morph or camera-carry handoffs that no non-ambient subject carries.

#### Scenario: Timeline contains invalid timing or layout motion
- **WHEN** a timeline has layout-property tweens, infinite repeats, tweens past the film end, or duration drift
- **THEN** the gate SHALL report each condition

#### Scenario: Action beat lacks qualifying motion
- **WHEN** an action beat has no animated tween or animates only opacity or scale
- **THEN** the gate SHALL report the action beat

#### Scenario: Planned handoff has no carrier
- **WHEN** a planned continuation, morph, or camera-carry handoff has no non-ambient subject carrying it
- **THEN** the gate SHALL report the handoff

### Requirement: timeline probe
The package SHALL ship a read-only probe that serializes a GSAP timeline, including nested
timelines, into absolute-time tween records without seeking or playing it.

#### Scenario: Nested timeline is probed
- **WHEN** the probe receives a GSAP timeline, including nested timelines
- **THEN** it SHALL serialize absolute-time tween records without seeking or playing the timeline

### Requirement: cross-model film evaluation
The pipeline SHALL convert per-system film runs into benchmark v2 measurements using only the
film gates, SHALL leave missing scenario runs unmeasured, and SHALL rely on the existing benchmark
evaluation for fairness, channels and required-scenario verdicts.

#### Scenario: Film evaluation has missing scenario runs
- **WHEN** a film evaluation has a missing scenario run
- **THEN** that run SHALL remain unmeasured
- **AND** evaluation SHALL rely on the existing benchmark evaluation for fairness, channels, and required-scenario verdicts

### Requirement: film project workflow
The pipeline SHALL scaffold a film project whose storyboard passes the storyboard gate and whose
composition script names each beat, SHALL refuse to overwrite existing files without an explicit
replace flag, and SHALL run all applicable film gates in one check that reports skipped gates
with the command that unblocks them.

#### Scenario: Film project is scaffolded
- **WHEN** a film project is scaffolded
- **THEN** its storyboard SHALL pass the storyboard gate and its composition script SHALL name each beat

#### Scenario: Project files already exist
- **WHEN** scaffolding would overwrite existing files without an explicit replace flag
- **THEN** the pipeline SHALL refuse to overwrite them

#### Scenario: Film project is checked
- **WHEN** the pipeline runs the combined film check
- **THEN** it SHALL run all applicable film gates and report skipped gates with the command that unblocks each one

### Requirement: actionable findings
Every film gate finding SHALL carry a concrete fix. Contract errors for enumerated values and
unsupported properties SHALL list the allowed values.

#### Scenario: Finding or contract error is returned
- **WHEN** a film gate returns a finding or reports an enumerated-value or unsupported-property error
- **THEN** findings SHALL include a concrete fix and the error SHALL list allowed values

### Requirement: timeline capture
The pipeline SHALL capture a composition's registered GSAP timeline in headless Chrome without
adding a package dependency, and SHALL name the install command when the browser stack is absent.

#### Scenario: Timeline is captured
- **WHEN** a composition has a registered GSAP timeline and the browser stack is available
- **THEN** the pipeline SHALL capture it in headless Chrome without adding a package dependency

#### Scenario: Browser stack is absent
- **WHEN** the browser stack is absent
- **THEN** the pipeline SHALL name the install command

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

### Requirement: catalog reuse
The pipeline SHALL search the HyperFrames block catalog for a beat's action, SHALL let a
storyboard beat name a block, and SHALL report a named block that the project's catalog does not
contain.

#### Scenario: Beat action is routed through catalog
- **WHEN** the pipeline routes a beat's action
- **THEN** it SHALL search the HyperFrames block catalog and allow the storyboard beat to name a block

#### Scenario: Named block is absent
- **WHEN** a storyboard names a block not present in the project's catalog
- **THEN** the pipeline SHALL report the missing named block

### Requirement: runtime-faithful capture
The pipeline SHALL capture HyperFrames project timelines under the HyperFrames runtime and SHALL
fail, rather than return an empty timeline, when nested compositions cannot load.

#### Scenario: Nested composition cannot load
- **WHEN** a nested composition cannot load during timeline capture
- **THEN** the pipeline SHALL fail rather than return an empty timeline

#### Scenario: Project timeline is captured
- **WHEN** a HyperFrames project timeline is captured
- **THEN** capture SHALL run under the HyperFrames runtime

### Requirement: procedural motion
Tweens that animate only non-DOM driver objects SHALL NOT count as subject motion in the timeline
gate. The render gate SHALL measure per-beat pixel motion and SHALL fail an action beat that is
frozen in the rendered film.

#### Scenario: Tween animates only driver objects
- **WHEN** a tween animates only non-DOM driver objects
- **THEN** it SHALL NOT count as subject motion in the timeline gate

#### Scenario: Action beat is frozen in render
- **WHEN** per-beat pixel measurement finds an action beat frozen in the rendered film
- **THEN** the render gate SHALL fail the beat

### Requirement: score as code
The pipeline SHALL render a Strudel pattern for the storyboard's duration to a WAV file offline,
SHALL export the pattern's onsets and beat grid, and SHALL record the score as a commercially
usable asset only when no sample libraries are used.

#### Scenario: Storyboard uses a Strudel score
- **WHEN** the pipeline scores a storyboard of a declared duration
- **THEN** it SHALL render the Strudel pattern offline to WAV and export its onsets and beat grid
- **AND** it SHALL record the score as commercially usable only when no sample libraries are used

### Requirement: grid alignment
Hard and match cuts and downbeat, accent and impact cues SHALL be within one frame of a beat or
pattern onset, and each finding SHALL give the nearest grid time.

#### Scenario: Score event is off grid
- **WHEN** a hard cut, match cut, downbeat, accent, or impact cue is more than one frame from a beat or pattern onset
- **THEN** the pipeline SHALL report the finding and nearest grid time

### Requirement: license boundary
The package SHALL NOT include Strudel code. Strudel SHALL be installed into the user's project on
first use and invoked in a separate process.

#### Scenario: Strudel is first used
- **WHEN** Strudel is first used in a user's project
- **THEN** it SHALL be installed into that project and invoked in a separate process
- **AND** the package SHALL NOT include Strudel code

### Requirement: one time source per property
The timeline gate SHALL fail two tweens that drive the same property of the same element at
overlapping times, and SHALL warn on linear easing for travelling elements.

#### Scenario: Two tweens overlap on one property
- **WHEN** two tweens drive the same property of the same element at overlapping times
- **THEN** the timeline gate SHALL fail

#### Scenario: Travelling element uses linear easing
- **WHEN** a travelling element uses linear easing
- **THEN** the timeline gate SHALL warn

### Requirement: declared endings and action arcs
When a storyboard declares `endState: rest`, the render SHALL end on its opening frame within
codec tolerance; when it declares `loop`, the last-to-first step SHALL NOT jump. Beats with
`arc: anticipate-act-settle` SHALL be warned when they start at full speed or stop without
settling.

#### Scenario: Storyboard declares rest ending
- **WHEN** a storyboard declares `endState: rest`
- **THEN** the render SHALL end on its opening frame within codec tolerance

#### Scenario: Storyboard declares loop ending
- **WHEN** a storyboard declares `endState: loop`
- **THEN** the last-to-first step SHALL NOT jump

#### Scenario: Action arc starts or stops abruptly
- **WHEN** a beat declares `arc: anticipate-act-settle` and starts at full speed or stops without settling
- **THEN** the gate SHALL warn

### Requirement: capture integrity
A film check SHALL NOT pass on a timeline captured before the current run when capture fails.

#### Scenario: Current timeline capture fails
- **WHEN** the timeline capture fails and only a capture from before the current run is available
- **THEN** the film check SHALL NOT pass

### Requirement: Blender shots
The pipeline SHALL render a declared Blender template headless from validated parameters, SHALL
encode the frames into a film, and SHALL convert the scene's keyframes into the film timeline
format so the timeline gate applies.

#### Scenario: Valid Blender shot is rendered
- **WHEN** a shot declares a Blender template and validated parameters
- **THEN** the pipeline SHALL render it headlessly, encode its frames into a film, and convert its keyframes into the film timeline format used by the timeline gate

### Requirement: external tools and assets
The package SHALL NOT include Blender or downloaded assets. Downloaded HDRIs SHALL be verified
against the publisher's checksum.

#### Scenario: Package excludes Blender and downloaded assets
- **WHEN** the package is built
- **THEN** Blender and downloaded assets SHALL NOT be included in the package

#### Scenario: Downloaded HDRI is verified
- **WHEN** an HDRI is downloaded
- **THEN** it SHALL be verified against the publisher's checksum

### Requirement: music analysis
The pipeline SHALL derive a beat grid, downbeats and per-bar energy from a music file, or use a
score grid when one exists.

#### Scenario: Music file has no score grid
- **WHEN** a music file is provided without a score grid
- **THEN** the pipeline SHALL derive a beat grid, downbeats, and per-bar energy from the file

#### Scenario: Music file has a score grid
- **WHEN** a score grid exists for the music
- **THEN** the pipeline MAY use that score grid instead of deriving the beat grid, downbeats, and per-bar energy from the file

### Requirement: edit on the grid
Every cut in an edit SHALL fall within one frame of a beat. The edit check SHALL report timeline
gaps and overlaps, off-grid cuts, non-commercial footage in a commercial edit and reads outside a
source, and SHALL warn on shots under one beat or over sixteen, monotone shot lengths, reused
footage ranges, extreme speed and cuts that are not visible in the render.

#### Scenario: Cut is off grid
- **WHEN** a cut falls more than one frame from a beat
- **THEN** the edit check SHALL report it

#### Scenario: Edit contains a delivery defect
- **WHEN** the timeline has gaps or overlaps, footage is non-commercial in a commercial edit, or a read is outside its source
- **THEN** the edit check SHALL report each defect

#### Scenario: Edit has a warning condition
- **WHEN** a shot is under one beat or over sixteen beats, shot lengths are monotone, footage ranges are reused, speed is extreme, or a cut is not visible in the render
- **THEN** the edit check SHALL warn

### Requirement: shared delivery gates
The rendered edit SHALL be checked by the render, audio and composition gates.

#### Scenario: Rendered edit is checked
- **WHEN** an edit is rendered
- **THEN** the render, audio, and composition gates SHALL check the rendered edit

### Requirement: Material requirements determine the film rendering route

Reference-led replication SHALL record observed material and geometry requirements in `storyboard.json.rendering` before build. The existing storyboard gate SHALL reject a declared route that cannot implement the declared requirements. A missing installation SHALL NOT justify silently removing the reference's defining effects.

#### Scenario: Enamel reference with flat rendering

- GIVEN solid depth, bevel, clearcoat or view-dependent color is required
- WHEN the plan selects DOM, Canvas 2D or CSS 3D
- THEN the storyboard gate fails with an actionable route repair

#### Scenario: View-dependent appearance

- GIVEN view-dependent color is required
- WHEN fewer than two distinct in-range material inspection times are planned
- THEN the storyboard gate fails with an angle-sampling repair

#### Scenario: Replicate plan lacks material routing

- GIVEN replicate mode and a passed legacy storyboard without rendering
- WHEN `next` is called
- THEN plan remains open and asks the author to record material requirements and route

#### Scenario: Honest acceptance

- GIVEN routing, runtime and film gates pass
- THEN the result still reports creativeAcceptance as not-assessed
- AND actual material matching is reviewed against rendered reference angles

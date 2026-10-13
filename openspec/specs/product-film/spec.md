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

### Requirement: film check samples visible text between beats
When `film check` captures a composition, its existing composition gate SHALL also sample the
visible text at least five times a second and on both sides of every beat boundary. Held overlap
of two legible texts SHALL fail the gate; a passing overlap, a steady faint copy under legible
text, resting text near the frame edge and small resting text SHALL be warnings. No new gate or
acceptance state SHALL be added.

#### Scenario: Text arrives over other text at a beat boundary
- **WHEN** a legible text overlaps another legible text for two consecutive samples around a beat boundary
- **THEN** the composition step SHALL fail with a `text-overlap` error that names both texts, the time and the beat, with a fix

#### Scenario: Dissolves, covered and deliberate layers
- **WHEN** two texts crossfade, one is covered by an opaque element or clipped away, or one is marked `data-layout-allow-overlap`
- **THEN** no `text-overlap` finding SHALL be reported for them

#### Scenario: Layout capture is unavailable
- **WHEN** the layout samples cannot be captured
- **THEN** the composition step SHALL report the reason and the pixel checks SHALL still run

#### Scenario: Deliberate warning
- **WHEN** the author passes `film check --allow <code>` for a warning code
- **THEN** that warning SHALL move to the allowed list and an unknown code SHALL be rejected

### Requirement: quick film ends with the owner's review
The quick film tier SHALL run plan, build, check and review. After the film check passes, `next`
SHALL return the existing review ask with an instruction to review the checked draft one frame
per second and record it in `qa.md` first, and SHALL return `done` only after the owner accepts
the current checked draft. Other quick tiers SHALL be unchanged.

#### Scenario: Quick film passes its check
- **WHEN** a quick film's check passes
- **THEN** `next` SHALL ask for the owner's verdict with the frame-review instruction instead of returning `done`

#### Scenario: Owner rejects or the draft changes
- **WHEN** the owner rejects the draft, or a new draft is checked after acceptance
- **THEN** a rejection SHALL be recorded as a project rule and reopen the check, and `next` SHALL ask for a new verdict before `done`

### Requirement: film scaffold pins the reviewed runtime
`film scaffold` SHALL write a `package.json` pinning the reviewed `hyperframes` and `gsap`
releases and SHALL load GSAP from the local install, so that after one install the composition
renders and is captured without network access. HyperFrames preview and catalog calls SHALL
default to the reviewed release.

#### Scenario: Fresh film project
- **WHEN** a film project is scaffolded into an empty directory
- **THEN** `package.json` SHALL pin `hyperframes` 0.8.137 and `gsap` 3.15.0, the composition SHALL load no remote script, and the guide SHALL use `npx --no-install hyperframes`

#### Scenario: Existing package.json
- **WHEN** the target already has a `package.json`
- **THEN** scaffolding SHALL refuse without an explicit replace flag, and with it SHALL keep the existing fields and only set the pins and missing scripts

### Requirement: Next actions separate runnable commands from instructions
A `next` action's `command`, when present, SHALL be only an executable command, spelled `node <absolute path of designer-pipeline.cjs> ...` (quoted when the path needs it) so it runs as given from any directory; an `ask` action's `record` SHALL use the same invocation. Free-text steps MUST be in a separate `instruction` field, an action with nothing to execute MUST carry only `instruction`, and the one-line `line` summary MUST include both. This holds for film, edit, web and ui actions.

#### Scenario: Prose is not a command
- **WHEN** `next` returns the film source, plan, sample, build or delivery action, an edit analyze action without sources, or a web concepts, build or probe action
- **THEN** the prose steps are in `instruction` and `command` is absent or one runnable `node <absolute path> ...` command

#### Scenario: Command runs as given
- **WHEN** the command of a product promo's source action is run from an unrelated directory with `--root <project>`
- **THEN** it starts the CLI, because the path is absolute and `designer-pipeline` need not be on PATH

#### Scenario: Plan ids cannot carry shell syntax into a command
- **WHEN** a visual design plan names a task `id` outside `[A-Za-z0-9][A-Za-z0-9_.-]*`, such as `a;rm -rf x`, `a b`, `$(x)` or `-x`
- **THEN** plan validation fails with `phases[<i>].id must be a path- and shell-safe identifier`, so the visual-task `command` and `record` that carry the id never contain shell syntax from the plan

### Requirement: film scaffold of a bound product promo lists its next steps
`film scaffold` for a project bound to a `product-launch-video` job plan SHALL add the `productSource` record step and the sample step to `next[]`; other scaffolds SHALL keep their `next[]`.

#### Scenario: Scaffold of a bound product promo
- **GIVEN** a project bound to a `product-launch-video` job plan
- **WHEN** `film scaffold` runs
- **THEN** its `next[]` also names the `productSource` record (before reference and storyboard) and the sample step (before the build), each citing its section of `workflow-film.md`
- **AND** the scaffold of a project with another or no bound form has the same `next[]` as before

### Requirement: Product source is an admission precondition

A film whose Stage 0 deliverableForm is product-launch-video, or whose storyboard declares productSource, SHALL be evaluated only after its productSource is admitted. Until then the storyboard gate MUST return only admission findings with no metrics. Admission MUST NOT be a weighted score component, and non-product films without productSource MUST keep their previous results.

#### Scenario: Card-only product promo

- **GIVEN** a product-launch-video storyboard with no productSource, built from text and cards
- **WHEN** the storyboard gate runs
- **THEN** it fails with `product-source-missing` and `metrics: null`
- **AND** no structure, rhythm or sound check result is reported

#### Scenario: Admitted product promo

- **GIVEN** an admitted productSource whose files match and whose shots are sourced
- **WHEN** the storyboard gate runs
- **THEN** the existing checks run and the result carries an `admission` summary with repository and commit

#### Scenario: Non-product film

- **GIVEN** a motion-graphics film without productSource
- **WHEN** the storyboard gate runs
- **THEN** the result is unchanged and has no `admission` key

### Requirement: Product source record pins the real product

An admitted productSource SHALL record a credential-free repository URL, a full commit SHA, the run command, observation time and hashed run log, hashed UI-state and operation captures, and an action → response → result flow of capture ids. Malformed records MUST be contract errors. Local paths, file URLs, branches, tags and short SHAs MUST be rejected. Run and capture times MUST be RFC 3339 with seconds and Z or ±hh:mm.

#### Scenario: Branch instead of commit

- **WHEN** productSource.commit is `main` or a short SHA
- **THEN** the storyboard is rejected with a contract error naming the full-SHA requirement

#### Scenario: Local checkout as repository

- **WHEN** productSource.repository is a local path or `file://` URL
- **THEN** the storyboard is rejected with a contract error

#### Scenario: Unknown capture reference

- **WHEN** flow or `beats[].source` cites a capture id that the record does not contain
- **THEN** the storyboard is rejected with a contract error

#### Scenario: Timezone-less capture time

- **WHEN** run.observedAt or a capture's capturedAt has no `Z` or `±hh:mm` offset, such as `2026-10-11T10:00`
- **THEN** the storyboard is rejected with a contract error instead of being ordered in the host's timezone

### Requirement: Product source files stay bound

Admission SHALL hash the run log and every capture inside the project root. A missing or changed file, a run log that does not show the pinned commit, captures lacking a UI state or an operation, a flow action that cites no operation, a capture timed before the run, or any action capture timed after a response capture (or response after result) MUST fail admission with a fix.

#### Scenario: Capture changed after recording

- **WHEN** a capture's bytes no longer match its recorded sha256
- **THEN** admission fails with `product-source-file-changed` and the checks that hashed it reopen

#### Scenario: Unpinned run

- **WHEN** the run log does not contain the recorded commit
- **THEN** admission fails with `product-source-run-unpinned`

#### Scenario: Screenshots without an operation

- **WHEN** every capture is a ui-state and none records the user's operation
- **THEN** admission fails with `product-source-captures-incomplete`

#### Scenario: Capture predates the run

- **WHEN** a capture's capturedAt is earlier than run.observedAt
- **THEN** admission fails with `product-source-time-order`

#### Scenario: Flow captures only look ordered

- **WHEN** action captures are timed at 10 s and 30 s, the response at 20 s and the result at 40 s
- **THEN** admission fails with `product-source-time-order`, because every action capture must precede every response capture

### Requirement: Shots are built from the captures

When beats are planned, every beat of an admitted product promo SHALL cite the captures it shows in beats[].source, except a pure brand card (brand-hold, transformation none). Unsourced beats MUST stay within 25% of durationSec. Each flow step MUST be shown by an action beat citing its capture, action no later than response no later than result; a title, card or hold cannot show a step.

#### Scenario: Invented action beat

- **WHEN** an action beat has no `source`
- **THEN** admission fails with `shot-source-missing` for that beat

#### Scenario: Half real captures plus invented result cards

- **WHEN** real captures cover half the film and unsourced title-holds present result or benefit claims
- **THEN** admission fails with `shot-source-missing` for each card, whatever the sourced share

#### Scenario: Result claimed only by a title-hold

- **WHEN** no action beat cites a capture of the flow's result step, even if a title-hold cites one
- **THEN** admission fails with `flow-unshown`

#### Scenario: Flow shown out of order

- **WHEN** an action beat shows the result before any action beat shows the response
- **THEN** admission fails with `flow-out-of-order`

#### Scenario: Brand cards dominate

- **WHEN** unsourced brand cards take more than a quarter of the film
- **THEN** admission fails with `source-share-low`

### Requirement: Unsourceable products block explicitly

A product that cannot be run or captured SHALL be recorded as productSource status blocked with blocker kind no-repository, access-denied, build-failed, run-failed, needs-credentials or capture-failed, plus reason and needs. A blocked record MUST NOT carry run, captures or flow. `next` MUST return a blocked action with CLI exit 2 and MUST NOT advance or invite invented scenes.

#### Scenario: Product needs credentials

- **GIVEN** productSource status blocked with kind `needs-credentials`
- **WHEN** `next` is called
- **THEN** it returns `type: "blocked"` with the blocker, exits 2 and stays on the source stage
- **AND** the storyboard gate reports status `blocked` with `product-source-blocked`

#### Scenario: Blocked record with captures

- **WHEN** a blocked productSource also carries captures
- **THEN** the storyboard is rejected with a contract error

#### Scenario: Physical product

- **GIVEN** a non-software product with no repository
- **WHEN** its source is recorded
- **THEN** it is blocked with `no-repository` and `next` returns the blocked action until a follow-up contract exists

### Requirement: Film workflow binds the Stage 0 plan

Film workflow state SHALL bind jobId, jobPlanSha256, jobPlanPath and deliverableForm from a valid Stage 0 job plan supplied by `next --job-plan` or found at job-plan.json, using the existing job-plan validation. A missing, changed or form-conflicting bound plan MUST stop `next` with JOB_PLAN_STALE and the re-plan command; plans MUST NOT be rewritten.

#### Scenario: Bind an existing film project

- **WHEN** `next --project-root . --job-plan job-plan.json` is called on a film state
- **THEN** the four binding fields are stored and the plan becomes a checked input

#### Scenario: Plan edited after binding

- **WHEN** the bound plan's content no longer matches its jobPlanSha256
- **THEN** `next` fails with `JOB_PLAN_STALE` naming the route re-plan and rebind commands

#### Scenario: Plan for a non-film deliverable

- **WHEN** a job plan is supplied while initializing an edit or web deliverable
- **THEN** initialization fails with a contract error

### Requirement: Product promos source and sample before building

Product-launch-video films SHALL source, and at standard and full also sample, before building. Before asking the owner, sample.mp4 MUST fully decode as video and its video stream MUST run 5–8 s inclusive, else `next` returns findings with a recut fix and decide refuses with SAMPLE_INVALID; an earlier accept of an invalid file no longer finishes the stage. Owner `decide --stage sample` MUST bind the sample bytes and productSource hash; plan and check MUST hash the run log, captures and plan.

#### Scenario: Stage lists

- **WHEN** a product-launch-video film is walked
- **THEN** its stages are source, plan, build, check, review at quick and intake, source, reference, concepts, plan, sample, build, check, review, deliver at standard and full

#### Scenario: Sample rejected

- **WHEN** the owner records `decide --stage sample --verdict reject --answer <reason>`
- **THEN** the reason becomes a project rule and sample stays open

#### Scenario: Sample is not a decodable 5–8 s video

- **WHEN** sample.mp4 is not a video, fails to decode, or runs under 5 s or over 8 s
- **THEN** `next` returns a run action whose findings carry a recut fix and does not ask the owner, `decide --stage sample` fails with `SAMPLE_INVALID`, and an earlier accept of such a file no longer finishes the stage

#### Scenario: A longer audio track does not stretch the sample

- **WHEN** sample.mp4's video stream runs under 5 s or over 8 s while its audio track makes the container run 5–8 s, or its video stream runs 5–8 s under a longer audio track
- **THEN** the sample length is the video stream's: the first is refused with `sample-duration` and the second reaches the owner
- **AND** a video stream that reports no duration yields `sample-duration-unknown` and no verdict, never a container-measured length

#### Scenario: Source changed after sample acceptance

- **WHEN** sample.mp4 or productSource changes after an accept verdict
- **THEN** that verdict no longer finishes the sample stage and a new sample decision is required

#### Scenario: Scaffolded before the reference stage

- **GIVEN** a standard or full product promo whose source stage ran `film scaffold`
- **WHEN** reference.md still holds the scaffold's empty template and no `decide --stage reference --answer none` is recorded
- **THEN** `next` returns the reference stage instead of completing it

#### Scenario: Non-product film stages

- **WHEN** the bound form is not product-launch-video
- **THEN** the film stage list and actions are unchanged

### Requirement: Evaluation surfaces stop before evaluating

`film check`, `verify film-storyboard` and `verify film-render` SHALL receive the bound form and project root and MUST stop at the admission result when admission is required and not granted, without timeline, render or composition evaluation. `film-eval measure` MUST leave such product-promo runs unmeasured and report them under admission, so the existing benchmark reports blocked.

#### Scenario: Render of an unadmitted promo

- **WHEN** `verify film-render` runs on a product promo without an admitted source
- **THEN** it returns the admission result with "Not evaluated" limits and does not sample the video

#### Scenario: Fictional-product benchmark scenario

- **GIVEN** the `canvas-launch` scenario run has no admitted productSource
- **WHEN** `film-eval measure` runs
- **THEN** the run is unmeasured, listed under `admission`, and `benchmark evaluate` reports `blocked`

#### Scenario: Repair scenario

- **WHEN** the `repair-slideshow` scenario is measured
- **THEN** it is scored by the existing gates as before

### Requirement: Stage 0 recognizes product-promo film phrasings

The Stage 0 classifier SHALL map English and Chinese product-promo film phrasings such as promo film, launch film, product trailer, 宣传视频 and 推广片 to product-launch-video. Promo pages, sites, banners, promo codes, UI hover and plans such as 制作产品宣传页面 or 产品推广方案 MUST keep their forms. A persisted plan whose form changes MUST fail validation, not be rewritten.

#### Scenario: Chinese promo video

- **WHEN** the brief asks for a 产品宣传视频
- **THEN** the deliverableForm is `product-launch-video`

#### Scenario: Promo page

- **WHEN** the brief asks for a product promo page or 制作产品宣传页面
- **THEN** the deliverableForm is not `product-launch-video`

#### Scenario: Plan classified under the old rules

- **WHEN** a persisted plan's stored form differs from its query's current classification
- **THEN** validation reports a deliverable-form conflict and the plan must be re-planned

### Requirement: Admission is not acceptance

Admission and every film gate SHALL report technical conformance only, with creativeAcceptance not-assessed. Gates bind records and file hashes and MUST NOT claim that captured pixels, the run log or the shown flow are genuine. Owner Visual Acceptance SHALL remain a separate review verdict, and historical films and frozen scores MUST remain unmodified diagnostics.

#### Scenario: Admitted and passing film

- **GIVEN** admission is granted and all film gates pass
- **THEN** the result still reports `creativeAcceptance: "not-assessed"`
- **AND** `next` asks the owner for the review verdict

#### Scenario: Earlier rubric score

- **WHEN** a historical fictional-product film has a high frozen rubric score
- **THEN** the score stays a diagnostic and does not count as admission or acceptance

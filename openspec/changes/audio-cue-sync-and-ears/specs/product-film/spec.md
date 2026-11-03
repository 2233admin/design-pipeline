## MODIFIED Requirements

### Requirement: audio delivery gate
The pipeline SHALL fail a scored film without audio, loudness off target, true peak above -1 dBTP, flat-top clipping, late music entry, non-commercial assets in a commercial film, and an impact cue with no onset within 100 ms. It SHALL warn on unplanned silence, a loud last frame, early exit, unrecorded licenses, an unsounded accent or downbeat, a hit cue off its frame, and onsets dense enough that chance explains the matches. Every finding SHALL carry a fix; the result SHALL NOT report creative acceptance.

#### Scenario: Scored film violates delivery constraints
- **WHEN** a scored film has no audio, loudness outside its selected target, true peak above -1 dBTP, flat-top clipping, music that becomes audible only after the entry cue, or non-commercial assets in a commercial film
- **THEN** the pipeline SHALL fail the film and each finding SHALL carry a concrete fix

#### Scenario: Audio has a warning condition
- **WHEN** audio has unplanned mid-film silence, remains loud at the last frame, music ends before the exit cue, or a license is unrecorded
- **THEN** the pipeline SHALL warn and provide a concrete fix

#### Scenario: Hit cues are timed against the mix
- **WHEN** the storyboard declares `impact`, `accent` or `downbeat` cues
- **THEN** the result SHALL list each cue's offset (onset minus cue), the chance baseline and `chanceOnFrame` (the share of audible time within one frame of an onset) in `metrics.cueSync`
- **AND** a cue within one frame SHALL raise no finding, and one within 100 ms SHALL warn `cue-off-frame` with the shift in ms
- **AND** when the offset is 50 ms or more, the fix SHALL first ask to rule out that the effect is buried under the music before giving the shift

#### Scenario: A hit cue has no sound
- **WHEN** no onset lies within 100 ms of a hit cue
- **THEN** an impact cue SHALL fail with `impact-unsounded`
- **AND** an accent or downbeat cue SHALL warn with `cue-unsounded`

#### Scenario: The file has audio but nothing audible
- **WHEN** the file has an audio stream but no window reaches the audible level and the storyboard declares hit cues
- **THEN** every hit cue SHALL be unsounded, an impact cue SHALL fail with `impact-unsounded`, and `metrics.cueSync` SHALL still be reported

#### Scenario: Onsets are too dense to prove sync
- **WHEN** at least one hit cue is timed and random times would land within 100 ms of an onset at least half the time
- **THEN** the pipeline SHALL warn `sync-at-chance` and point to checking the effects stem alone
- **AND** a `cue-off-frame` fix SHALL NOT prescribe a shift in ms, because the onset may be the bed's, and SHALL point to checking the effects stem alone

#### Scenario: Audio gate reports its result
- **WHEN** the audio delivery gate completes
- **THEN** its result SHALL NOT report creative acceptance

## ADDED Requirements

### Requirement: Listening is evidence, not acceptance
The film guidance SHALL tell the agent it cannot hear: report measured numbers, never describe how a soundtrack sounds without a listening reading or the words "measured, not listened to". It SHALL route effects and listening to the optional earshot companion when `doctor` lists it, and SHALL NOT let an earshot reading pass a gate or count as Visual Acceptance.

#### Scenario: earshot is absent
- **WHEN** `doctor` does not find the earshot skills
- **THEN** it SHALL list the "Listening and film sound" group as optional with its install line and fallback, without blocking

#### Scenario: earshot critiques a film
- **WHEN** an agent runs earshot's critique or timeline on a delivered film
- **THEN** the reading SHALL be creative-review evidence only, and the owner SHALL still accept or reject the film

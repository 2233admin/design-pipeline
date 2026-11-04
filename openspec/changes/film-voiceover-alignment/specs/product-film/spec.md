## ADDED Requirements

### Requirement: narration phrase cues
`film voiceover` SHALL measure a narration take's phrases with ffmpeg silencedetect at a threshold relative to the take's peak, without a speech model. Pauses of at least `--min-pause` end phrases, or with a script of N lines the N-1 longest pauses. With `--write` it SHALL record `vo-NN` voiceover cues with `endSec` and the take's path and SHA-256 in `sound.narration`.

#### Scenario: Take with sentence pauses
- **WHEN** a take has three spoken stretches separated by 0.5 s pauses and a 70 ms pause inside the first
- **THEN** the result SHALL list three phrases within 0.02 s of the spoken times, with the 70 ms pause as a word boundary of the first

#### Scenario: Script lines
- **WHEN** a script of four lines accompanies a take with four sentences
- **THEN** each phrase SHALL carry its line in order as the cue note

#### Scenario: Script longer than the take's pauses
- **WHEN** the script has more lines than the take has stretches of speech
- **THEN** the command SHALL fail with `PHRASES_UNMATCHED` and a fix

#### Scenario: Take outside the project or silent
- **WHEN** the take is outside the project root or its peak is under -60 dBFS
- **THEN** the command SHALL fail with a contract error naming the fix and write nothing

#### Scenario: Re-measure drops a bound phrase
- **WHEN** a re-measured take no longer has a cue id that a beat binds
- **THEN** the command SHALL report `voiceover-binding-broken` and SHALL NOT write the storyboard

### Requirement: beats land on their phrase
The storyboard gate SHALL fail `voiceover-off-phrase` when a beat binds a voiceover cue whose phrase starts more than 0.1 s before the beat or at or after its end, or shares less than half of the shorter span. It SHALL fail `voiceover-stale` when the recorded take's SHA-256 changed and SHALL record the take as a gate input. Each finding SHALL carry a fix.

#### Scenario: Picture late on the words
- **WHEN** a beat starts 0.3 s after the phrase it binds
- **THEN** the gate SHALL fail with `voiceover-off-phrase` naming the beat and the lag

#### Scenario: Beat clips the phrase
- **WHEN** a bound phrase of 1.9 s overlaps its beat for 0.2 s
- **THEN** the gate SHALL fail with `voiceover-off-phrase`

#### Scenario: Take re-recorded
- **WHEN** the narration file changes after its cues were written
- **THEN** the gate SHALL fail with `voiceover-stale` until `film voiceover --write` runs again

#### Scenario: End only on lasting cues
- **WHEN** an accent cue has `endSec`, or a voiceover cue's `endSec` is not after its `atSec`
- **THEN** storyboard validation SHALL reject it; an `endSec` after the film's end SHALL be `cue-outside-film`

#### Scenario: Narrated film with no bound phrase
- **WHEN** a storyboard records narration but no beat binds a phrase
- **THEN** the gate SHALL report the review warning `voiceover-unbound` without failing

# Product film delta

## ADDED Requirements

### Requirement: Storyboard cue binding warnings

The storyboard gate SHALL warn `cue-unbound` when a declared `downbeat`, `accent`, `impact` or
`riser` cue is listed in no beat's `soundCues`, and SHALL warn `cue-outside-beat` when a bound
cue's `atSec` lies outside the scene window (`startSec` to `endSec`) of every storyboard beat that
binds it, beyond the 0.05 s frame tolerance. A cue bound to several beats SHALL NOT warn when it
lies inside any one of them. Each warning SHALL carry a concrete fix. A warning SHALL NOT change a
passing storyboard to failed, and any finding without warn severity SHALL still fail it. The gate
SHALL NOT check alignment to the music's beat grid; that is an optional policy and a review item.

#### Scenario: A declared hit cue no beat binds

- **WHEN** a storyboard declares an `accent` cue that no beat lists in `soundCues`
- **THEN** the gate SHALL report `cue-unbound` with severity `warn` and a fix
- **AND** the storyboard status SHALL remain `passed` when no other finding exists.

#### Scenario: A bound cue outside its storyboard beat

- **WHEN** a cue's `atSec` is more than 0.05 s outside every beat that binds it
- **THEN** the gate SHALL report `cue-outside-beat` with severity `warn` naming the first binding beat
- **AND** a cue inside any one of its binding beats SHALL NOT be reported.

#### Scenario: A warning does not hide an error

- **WHEN** a storyboard has both a `cue-unbound` warning and a timeline error
- **THEN** the storyboard status SHALL be `failed`.

### Requirement: Song map scaffold and music-to-motion vocabulary

`film scaffold` SHALL write `sound.md` with a song-map table whose columns are beat id, window,
bars, music event and motion response. The film references SHALL document a music-to-motion
vocabulary covering downbeat/impact, riser, break/silence and accent.

#### Scenario: Scaffolded sound notes

- **WHEN** `film scaffold` writes a project
- **THEN** `sound.md` SHALL contain the song-map table header.

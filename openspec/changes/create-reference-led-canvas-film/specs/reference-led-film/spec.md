## ADDED Requirements

### Requirement: A separate reference-led audiovisual preview

The experiment SHALL deliver a new local HTML promotional film with moving source footage,
a recorded relationship to the user's moving reference, and an audible soundtrack started by
an explicit playback action.

#### Scenario: The user plays the new film
- **WHEN** the user starts the preview at port 4176
- **THEN** the 32-second composition plays footage, annotations, a connected canvas passage
  and a branded ending with synchronized music
- **AND** earlier experiments remain separately available.

### Requirement: Evidence distinguishes mechanics and creative reception

The review SHALL record full playback and source-media behavior, audio timing and limitations,
and responsive viewing separately from the user's creative acceptance.

#### Scenario: The local preview passes runtime checks
- **WHEN** playback, audio synchronization and controls work
- **THEN** QA records those observations
- **AND** it does not imply that the user has accepted the style or that an unavailable listening
  review has been completed.

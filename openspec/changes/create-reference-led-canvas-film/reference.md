# Reference and asset inventory

Style reference: https://www.liblib.tv/detail/8eee3e10b8c3442882ac631511100ce2 . Prior browser
inspection covered the player plus read-only workflow/storyboard. Reuse the timestamped findings in
`../ground-films-in-references-and-sound/reference.md`; no additional unrelated reference is needed.

Local source: `seedcontrol/static/login/videos`, declared as product login showcase assets in
`seedcontrol/frontend/src/lib/public-assets.ts`. FFmpeg inspected metadata and frames at 0.5/2.5/4.5s:

| Asset | Duration | Dimensions / rate | Selection |
| --- | --- | --- | --- |
| city-ruins.mp4 | 5.06s | 1280x720 / 24fps | Cool architectural depth, walking subject, opening and close crop |
| night-ride.mp4 | 4.06s | 1280x720 / 24fps | Blue nighttime motion and a faster edit passage |
| moon-piano.mp4 | 11.05s | 1280x720 / 24fps | Luminous subject, long shot and a quiet brand close |
| spring-bloom.mp4 | 11.05s | 864x496 / 24fps | Excluded: warmer anime direction conflicts with the selected palette |

The selected files contain audio tracks, but source audio will be muted under a newly composed score.
An extracted short audio audition could be displayed but the model runtime explicitly reported that
audio input is unsupported. Do not claim an auditory review of the source or resulting mix.
Sound will be checked structurally, numerically and through browser playback/synchronization;
subjective listening remains a reported limitation, not a reason to omit the requested soundtrack.

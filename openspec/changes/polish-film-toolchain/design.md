# Design

Scope: film tooling and CLI ergonomics on 0.11.0-beta.1. Verified end to end with HyperFrames
0.8.81: a scaffold-shaped composition built from the shipped patterns passed `hyperframes check`,
rendered to a 12.0 s MP4 with audio, and `film check` captured its timeline, found an uncarried
handoff at 2.4 s, and passed after the hinted one-line fix and a re-render.

Capture runs in a kernel (`capture-film-timeline.cjs`) because the CLI is synchronous; it
resolves `puppeteer-core` from the composition's project (installed by HyperFrames) and Chrome
from `--chrome`, `PUPPETEER_EXECUTABLE_PATH` or the HyperFrames chrome-headless-shell cache. It
pre-registers `window.__timelines`, which the HyperFrames runtime normally provides. Missing tools
fail with the command that installs them.

`film check` runs storyboard, then timeline (capture when `index.html` exists, else an existing
`timeline.json`), then render (newest `out.mp4` or `renders/*.mp4`). Skipped gates report the
unblocking command; status is passed, failed or incomplete; exit 0 only when passed. Fix hints
live in one table keyed by gate and code, and a test asserts every emitted code has one.

Deferred from the audit: the motion gate throws instead of returning failed findings, the
standalone check scripts diverge from their CLI actions, and status vocabularies differ across
gate families. These need their own changes.

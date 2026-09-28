# Design

Catalog: `film blocks` runs `npx hyperframes catalog --json` once per project and caches it in
`.design-pipeline/hyperframes-catalog.json`. Search is deterministic and lexical: name or title
hits score 3, tag hits 2, description hits 1, with optional tag and type filters. A beat may name
a `block`; when the project has a catalog cache, the storyboard gate reports `block-unknown`. The
scaffold emits the host snippet and the install command at the beat's time.

Capture: for projects with `hyperframes.json`, `film check` reuses a running preview or starts one
(`preview --background`), captures from `<serverUrl>/api/projects/<id>/preview` (the built
document with the runtime and nested scenes), and stops only a preview it started. Raw-file
capture of a page with `data-composition-src` hosts and no runtime now fails and names the fix.
npx runs through npm's `npx-cli.js` without a shell.

Drivers: the probe tags tweens whose targets are all non-DOM objects as `driver`. The timeline
gate excludes drivers from subject, carry and fade analysis, skips `beat-static` for beats covered
only by drivers, and reports `proceduralBeats` and `proceduralHandoffs`.

Pixel motion: the render gate decodes 10 fps grayscale frames at 160x90 and measures the share of
pixels changing by more than 4 levels between frames, averaged per beat. An action beat of at
least 0.5 s below 0.02% is `render-static-beat`. Calibration: a frozen clip measured 0.000%; the
smallest real motion in the HyperFrames demo (a fading logo) measured 0.086%. The 3D dolly-zoom
block measured 15.7%. Two older test fixtures of solid colour segments were legitimately frozen
and now carry a moving box.

End-to-end evidence: a HyperFrames project hosting `camera-dolly-zoom` passed `hyperframes
check`, rendered, and `film check` captured through the preview runtime (one driver tween, the
beat judged procedural), measured pixel motion, and passed all gates.

Music as code (Strudel), researched for this change and deferred to its own change: every
@strudel package is AGPL-3.0-or-later (npm, verified), so it can only be an optional external
backend invoked across a process boundary, never bundled. Its default sample libraries have mixed
or unknown licenses. Its pattern `queryArc` event grid could drive exact cut-on-beat checks and
automatic sound cues. Tone.js (MIT) is the bundleable alternative for offline rendering.

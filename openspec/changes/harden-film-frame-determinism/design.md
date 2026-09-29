# Design

## Where it runs

`checkFilmProject` reads `index.html` and `compositions/*.html` (one level, sorted) and passes
them to `scanCompositionSource` in `film-timeline-core.cjs`. The findings join the existing
`timeline` step. The scan needs no browser capture:

- with a timeline: step findings are the timeline findings plus the source findings, and the
  step fails if either has a non-warn finding;
- without a timeline (capture unavailable or no `timeline.json`): the step stays `skipped`
  unless the scan found an error, in which case it is `failed`, so an unseekable film is not
  hidden behind a missing capture. Warnings alone leave it `skipped` and are attached.

The step also lists `sourceFiles`. `checkTimeline` and the timeline manifest schema are
unchanged, as are `verify film-timeline` and `film-eval` (they have no project source).
`fixes` entries gain `file` and `line` when a finding has them.

## What is flagged

| Source | Severity |
| --- | --- |
| `Math.random` | error |
| `Date.now` | error |
| `performance.now` | error |
| `requestAnimationFrame` | error |
| `<video autoplay>`, `<audio autoplay>` | error |
| `setTimeout`, `setInterval` | warn |

Severity follows how the sibling timeline findings are graded: findings that make the film
unseekable or its frames unreproducible (`layout-tween`, `infinite-repeat`, `tween-past-end`,
`property-conflict`) are errors; style findings (`linear-motion`) are warnings. Clock reads, an
unseeded random stream, a frame callback and element-owned media playback each make a frame
depend on something other than the seeked time, and `hyperframes.md` already forbids them, so
they are errors. Timers are warnings: they are also wall-clock, but a timeout that only defers
setup glue (not a visual value) is legitimate, and the gate cannot tell the two apart statically.

## Scanner

Static text scan, no parser dependency and no execution. Inline `<script>` bodies (JavaScript
types only) are scanned after blanking comments and string contents, so `// Math.random`, a
`"Date.now"` string, an `https://` URL and `<p>` prose do not fire. Template literal text is
blanked but `${...}` expressions are scanned. Markup is scanned for autoplay after removing
HTML comments, scripts and styles. Every blanking step preserves length and newlines, so the
reported line is the line in the file. A seeded generator (mulberry32, `hash(seed, frameIdx)`)
uses none of these APIs and passes.

Local `<script src>` files are scanned with the same rules and reported by their own path and
line. A root-relative `src` (`/js/app.js`) resolves against the project root, the composition's
serve root, from any HTML file. Any other relative `src` resolves relative to the HTML file that
names it, then relative to the project root. A file is read only if the file exists and both its lexical path and its real path (symlinks
resolved) stay inside the project root. Each file is scanned once. Not read, and listed in the
step's `unscannedScripts` with a reason (no finding):

- network URLs (any scheme, or protocol-relative), for example the GSAP CDN tag every scaffold
  carries; a warning there would fire on every project;
- filesystem-absolute forms: drive letters (`C:\`, `C:/`), UNC (`\\host\share`) and `file:`;

A local minified script (`*.min.js`) is also not scanned, because a bundled library owns its own
clocks (GSAP reads `Date.now`) and would fire on every project. It may be the project's own bundle,
though, so it is never skipped silently: it is listed in `unscannedScripts` with the reason
`minified, not scanned` and raises the same warning, so the reviewer checks its source.

A `src` that escapes the project root (`/../x.js`, `../x.js`, or a symlink out), or names a file that does not exist, is not read and
raises the warning `external-script-unscanned`: unlike a CDN URL, the project's own script
should be scannable. The step lists the scanned files as `scriptFiles`.

Limits, stated in `hyperframes.md`: a regex literal containing a quote can confuse string
skipping, and scripts loaded at runtime (dynamic import, injected tags) are not followed.
Vendored catalog blocks under `compositions/` are scanned like any other file; a finding names
the file.

## Documentation

`hyperframes.md` gains the `hash(seed, frameIndex)` rule (constant across the shutter interval,
identical in preview and export), the scan description, and a four-point beat author contract
(overwrite-only output, deterministic in `t`, palette constants, where to edit). The
`patterns.js` header carries the same jitter rule.

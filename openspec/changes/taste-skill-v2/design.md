## Decisions

1. Three sources, one bundle: `skill/vendor/taste-skill/{v2,classics,imagegen}/upstream/`, one `manifest.json` with
   a `sources[]` entry per repository (url, commit, tree, file list, sha256 per file).
2. Tools run with Node from the package path; they never execute at import time. `inspect.mjs` receives the browser
   path from `browser-locate.cjs`. Their output is evidence; none of it is a gate.
3. `taste draw` feeds the style-roulette source (a draw is labelled `roulette/taste-draw`); the stage keeps three
   sources and six thumbnails, and the draw is recorded in the appearance ledger like any roulette pick.
4. Size: v2's JSON libraries are about 37k lines; binary assets above 1 MB are fetched on demand with the existing
   `sources fetch` mechanism instead of shipped.

## Risks

- v2 tells overlap Hallmark's gates. Keeping v2 advisory and Hallmark as the only hard lint avoids double reporting.

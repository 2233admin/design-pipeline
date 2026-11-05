# Tasks

## 1. Change records

- [x] 1.1 proposal.md, design.md and the `product-film` spec delta.
- [x] 1.2 `npm exec -- openspec validate film-voiceover-alignment --strict` and `npm run specs:check`.

## 2. Behaviour

- [x] 2.1 `voiceover-core.cjs`: peak-relative silencedetect, phrases by pause or script, word boundaries, `--write` of `vo-NN` cues and `sound.narration`, binding-broken guard.
- [x] 2.2 `film-core.cjs`: `endSec` on voiceover/silence cues, `sound.narration` shape, `voiceover-off-phrase`, `voiceover-stale`, `voiceover-narration-missing`, `voiceover-unbound`, `cue-outside-film` on `endSec`, `narrationFiles`.
- [x] 2.3 `film-hints.cjs` fixes; `cli-core.cjs` `film voiceover`, `--min-pause`/`--script` in `KNOWN_OPTIONS`, narration in `filmEvidenceInputs`.

## 3. Tests and docs

- [x] 3.1 `tests/film-voiceover.test.cjs` (tone bursts at known times clean, noisy and quiet; script ties; off-phrase, clip and lead cases; CLI write, stale take, binding-broken, outside/silent/unmatched; flite speech when the filter exists) in `scripts/test-manifest.json`; existing focused checks `film-gates`, `film-project`, `film-storyboard-values`, `film-score`.
- [x] 3.2 `references/workflow-film.md` narration bullet; `package-resources.json`; CHANGELOG.

## 4. Verification

- [x] 4.1 Real take: flite narration of four lines into a scaffolded project, `film voiceover --write`, bind beats, `verify film-storyboard` pass; move a beat, re-record the take, see `voiceover-off-phrase` / `voiceover-stale`.
- [x] 4.2 Repository QA `npm test`.

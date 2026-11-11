# Design: motion-vocabulary

## Decisions

- **One data file, generated records.** `motion-vocabulary.json` is the only hand-edited copy.
  `scripts/refresh-motion-vocabulary.cjs --catalog` rewrites the `motion-vocabulary/*` doc records
  (and one project-owned source record) of `component-source-catalog.json`; `--check` and a test
  fail when the two differ. The record carries the definition as `description` and a
  `motionVocabulary` object (close terms with their term names, anti-patterns, local links), so a
  search result is a complete answer and works with any `--snapshot`.
- **Definitions are quoted, not restated.** The upstream skill tells its reader to quote the
  glossary verbatim; restating 91 one-line definitions would only add drift. The text is MIT; the
  quote, its file and revision are recorded in the data, the guide frontmatter, the catalog records
  and `THIRD_PARTY_NOTICES.md`. `animation-opportunity-and-review.md` said upstream content is not
  copied; it now names this one quoted part.
- **Record type `term`.** Term records are not methods (no implementation) and not sources. The
  existing `recordType` enum gains `term` in the core and both JSON schemas; nothing else about the
  record contract changes. Web component routing already ignores non-component records.
- **Lexical ranking inside `searchCatalog`.** Only `term` records are ranked; every other record
  keeps the literal substring match and catalog order, so recipe search returns what it returned.
  Tokens: Latin words lower-cased, stop words removed, light suffix stemming; each run of CJK
  characters, after question and filler phrases are removed, as bigrams. Field weights: name 3,
  alias 2, keyword 1.5, definition 1. Each token is weighted by its rarity across term records.
  A term is listed when the matched share of the query's known tokens is at least 0.5; the three
  best are listed from 0.25, as the closest names for a description nothing fits well. Tokens no
  term knows are left out of the share, so a long sentence is not penalised for filler and a query
  of unknown words lists no term. Ties are broken by id. A query whose tokens are exactly a name or
  an alias ranks first. No model, no embedding, no randomness.
- **What lexical matching cannot do.** A description that shares no word with a term's name,
  aliases or definition is missed. Measured on 24 descriptions written after tuning: right term
  first for 15, in the first three for 19. The fixture (27 descriptions, 26 first, 27 in the first
  three) was used to tune three aliases and the thresholds, so it is a regression guard, not an
  accuracy figure. The guide therefore says the search is a shortcut: when the listed definitions do
  not fit, read the category's terms in the data and choose by definition, and say "approximation"
  when nothing fits.
- **Anti-patterns are project-owned.** The upstream author's page for the skill names
  `scale from zero`, `hover flicker` and `layered entry`; the public glossary at the locked revision
  has no such entries. `scale-from-zero` rests on a rule that is bundled (`emil-design-eng`, "Never
  animate from scale(0)") and on upstream `review-animations/STANDARDS.md` "Physicality". The
  descriptions of `hover-flicker` (hover target moves out from under the pointer, or a touch tap
  fires hover) and `layered-entry` (container and children each run their own entrance) are this
  repository's reading of the names, tied to packaged rules (touch hover gating; TR-04 one
  coordination owner). Each record states that origin. The owner may reword them.
- **"Shared layout animation".** Not an upstream term. It is an alias of
  `shared-element-transition`, and both `layout-animation` and `shared-element-transition` say in
  `closeTerms` that Motion's `layoutId` feature is the latter.
- **Lock.** No new lock entry. `skill/references/motion-vocabulary.md` joins the `documents` of
  `emilkowalski-animation-review` with `single-source` frontmatter, so `sources:update` recomputes
  its content hash from the new upstream file. `motion-vocabulary.json` is not a lock document: lock
  documents are Markdown with frontmatter (`reviewedRevision:` text, `contentHashScope`), and adding
  a JSON form would be a second document contract. The JSON pairs the repository URL with
  `revision`, which the existing pin scan checks against the lock and `sources:update` rewrites.
- **Staleness.** `tests/fixtures/` is outside the pin scan, so the pinned term list keeps the file
  hash it was read at. After `sources:update`, the guide's `reviewedContentHash` differs from the
  fixture's `sha256` if and only if the glossary file changed; the test then fails and names the
  refresh command. An upstream commit that leaves the file alone needs no refresh.
- **Routing.** A scored job (priority 46) so an explicit job or a stronger scored match keeps the
  brief. Keywords are naming phrasings ("what's it called", "name the motion", "效果叫什么",
  "动效术语"), not motion words, so ordinary motion briefs do not move. The primary knowledge door
  is `design-system search`, the command the guide uses.

## File ownership

- Hand-edited: `skill/references/motion-vocabulary.json`, `skill/references/motion-vocabulary.md`,
  `tests/fixtures/motion-vocabulary/lookup-queries.json`.
- Generated: `motion-vocabulary/*` and `source/design-pipeline/motion-vocabulary` records in
  `component-source-catalog.json` (`--catalog`); `tests/fixtures/motion-vocabulary/upstream-terms.json`
  (`--checkout <clone>`).

## Compatibility

- `searchCatalog` without a query, and for catalogs with no `term` record, returns exactly what it
  returned before. With `--limit`, term records count toward the limit; `--category` selects either
  side.
- No migration: no artifact shape, receipt or state changes.

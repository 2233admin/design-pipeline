# motion-vocabulary: the animation glossary, reverse lookup and named anti-patterns inside the package

## Why

Closes #365 (part of #346). The package ships far more motion effects than the upstream
`animation-vocabulary` skill of `emilkowalski/skills` (782 recipes in 64 categories, 866 doc records
in `component-source-catalog.json`), but not the layer that skill is: a mapping from a loose
description ("the popover seems to grow out of the button") to the exact term, one definition per
term, and the difference between close terms.

Measured before this change:

- `references/animation-opportunity-and-review.md` names 9 terms without definitions; 16 of the 91
  upstream terms appear nowhere outside `skill/vendor/`.
- `design-system search --kind doc` finds a recipe when the word is known (`stagger` 38 records) and
  nothing for a description (`popover grows out of the button`, `按钮按下去缩一下`: 0 records).
- `route` sends "what's it called when…", "这个…效果叫什么" and "name the motion effect…" to the
  default job with score 0 and confidence `low`.
- `companion-capabilities.json` lists `animation-vocabulary` as a companion the user installs.

The owner's ruling: the package is a superset of that skill; whatever it does, the package does.

## What Changes

- **Vocabulary data** `references/motion-vocabulary.json` (`design-pipeline.motion-vocabulary.v1`):
  the 91 terms and 12 categories of the upstream glossary with each definition quoted verbatim, plus
  this repository's additions per term: `aliases` (colloquial descriptions, English and Chinese),
  `closeTerms` (`{ id, difference }`) and `local` (primitive ids, recipe ids and guide anchors that
  already ship).
- **Named anti-patterns** in the same file (`antiPatterns`): `scale-from-zero`, `hover-flicker`,
  `layered-entry`, each with a description, the term to use instead, a fix and the packaged rule it
  rests on. The data part of #366 moves here; the rest of #366 (terms required in specs and
  receipts) is not in this change.
- **Catalog records**: every term and anti-pattern is a generated doc record (`recordType: "term"`,
  category `motion-vocabulary`) in the existing `component-source-catalog.json`.
- **Search**: the existing `design-system search` ranks `term` records by lexical overlap between
  the query and the record's name, aliases and definition, and lists them before the literal
  matches. No command, flag or model call is added.
- **Routing**: job `motion-vocabulary` in `job-registry.json` (scored, English and Chinese
  keywords), guide `references/motion-vocabulary.md`.
- **Provenance**: the guide becomes a document of the existing lock entry
  `emilkowalski-animation-review`; a pinned term list and a refresh script make an upstream change to
  the glossary fail the tests after `sources:update`.
- **Docs**: `animation-vocabulary` is described as built in; the reference that said upstream
  content is not copied now says which part is quoted.

## Capabilities

- `design-pipeline`: motion naming (lookup, definitions, close terms, anti-patterns) and its routing.

## Reuse

- `design-system search`, `component-source-catalog.json` and its normalization, hashing and source
  records; the job registry and `route`; `sources.lock.json` adapted-reference documents with
  `single-source UTF-8 bytes at reviewedRevision` frontmatter and the pin scan; the fixture pattern
  of `ui-rule-coverage-map` (#356); `motion-primitives.json`, `motion-recipes/full-inventory.json`,
  `ui-transition-rules.md` and the bundled `emil-design-eng` snapshot as link targets.

## Impact

- New: `skill/references/motion-vocabulary.json`, `skill/references/motion-vocabulary.md`,
  `scripts/refresh-motion-vocabulary.cjs`, `tests/motion-vocabulary.test.cjs`,
  `tests/fixtures/motion-vocabulary/` (pinned upstream terms, lookup descriptions).
- Changed: `skill/scripts/design-system-catalog-core.cjs` (record type `term`, term ranking in
  `searchCatalog`), the two catalog JSON schemas (`recordType` enum), `component-source-catalog.json`
  (95 generated records), `job-registry.json`, `sources.lock.json` (`documents`),
  `companion-capabilities.json`, `companion-skills.md`, `feature-routes.md`, `pipeline-reference.md`,
  `capability-routing.md`, `animation-opportunity-and-review.md`, `SKILL.md`,
  `package-resources.json`, `scripts/test-manifest.json`, `THIRD_PARTY_NOTICES.md`, `CHANGELOG.md`;
  the record-type list in `tests/component-source-completeness.test.cjs`.
- Search results change in one way: a query that matches vocabulary terms now lists them first.
  Every record the search returned before is still returned, in the same relative order.
- No new CLI command or flag, gate, receipt field or lock entry.

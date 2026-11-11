# Design

## Files and ownership

| File | Role | Maintained by |
| --- | --- | --- |
| `sources.lock.json` | Revision of each rule source | `npm run sources:update` |
| `skill/references/web-interface-guidelines.md`, `skill/references/ibelick-ui-skills.md` | Record documents; frontmatter carries `reviewedRevision` and `reviewedContentHash` over the rule files | `sources:update` rewrites revision, hash and date; prose by hand |
| `skill/references/ui-rule-coverage.json` | The map | By hand |
| `tests/fixtures/ui-rule-coverage/upstream-rules.json` | Pinned rule lines with the revision and content hash they were read at | `scripts/refresh-ui-rule-fixture.cjs` only |
| `skill/references/ui-craft-sources.md` | Audit table and `UC-` checklist the map points to | By hand |

## Map shape

`design-pipeline.ui-rule-coverage.v1`: `sources[]`, each with `id` (the lock id), `repo`,
`revision`, `license`, `record`, `files[]` and `rules[]`. `repo` with `revision` is a derived pin,
so the existing lock agreement check already fails when it differs from the lock, and
`sources:update` rewrites it.

A file is extracted as `bullets` (every top-level list item between a `from` heading and a `to`
heading, numbered inside the nearest heading: `command/forms/03`) or `selected` (hand-picked lines
of a file that is not mapped line by line; used for four `README.md` rules).

A row has `id`, `rule` (the upstream line, quoted) and `status`:

| Status | Requires |
| --- | --- |
| `audit` | `targets` with at least one `audit.*` code |
| `uc` | `targets` with at least one `UC-` id, no audit code |
| `local` | `targets` that are all `references/…md` or `vendor/…md`, optionally `#heading-anchor` |
| `pending` | `issue` (number) |
| `not-adopted` | `reason` |
| `duplicate` | `duplicateOf`: a mapped row of the same file (the anti-pattern list of `command.md` restates 13 earlier rules) |

Optional: `issue` on a mapped row (the issue that will measure it), `partial: true` with a `note`
when the local rule differs. Replacing `pending` later is one edit: change `status` and add
`targets`. A new source (#359) is one more `sources[]` entry, one lock entry and one record.

No JSON Schema file is added: the map is read only by its test, which validates the shape and
rejects unknown fields. Schema files in `skill/references/` describe receipts and gate inputs.

## Why the fixture compares hashes, not revisions

`sources:update` runs weekly and moves every source to upstream HEAD. ibelick/ui-skills moves
often without touching the three skill files (the locked commit and HEAD differ only in
`src/data/`). Comparing revisions would turn every such bump red. The record document's
`reviewedContentHash` covers exactly the rule files and is recomputed by the existing update code;
the fixture stores the hash it was read at. Equal hashes mean the rule lines are the same, so the
bump stays green; a different hash fails the coverage test with the command to run.

`tests/fixtures/` is outside the lock's derived-pin scope, so the fixture keeps the revision it was
read at and is not rewritten by the update.

## Companion change

`web-design-guidelines` follows the `emil-design-eng` precedent: removed from the Visual taste
group of `companion-capabilities.json` (with its install hint), described as built in by the
companion documents. No profile, schema or self-check code changes.

## Not changed

Lock schema and kinds, `sources:update`, `sources:check`, importers, the measured audit, receipts,
gates, CLI commands and flags.

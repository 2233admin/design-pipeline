## Context

`skill/references/astryx-design-system-snapshot.json` is the bundled Astryx catalog behind
`design-system normalize|search|project-tokens|decide` when no snapshot is supplied. It was produced
once from Astryx CLI JSON output, and the lock held `astryx` at 0.2.0 because regenerating needed the
CLI (#263). The recommendation on #263 was to derive the snapshot statically from the npm tarballs,
prove parity on 0.2.0 first, then move to 0.7.7, with dropping the snapshot as the fallback.

## Decisions

### Read the tarballs, never run them

The generator takes the two `.tgz` files, gunzips them in memory and walks the tar members itself:
only regular files are kept, links are ignored and a member path that leaves `package/` fails the
run, so nothing from upstream touches the filesystem. Each `*.doc.mjs` is parsed with
`@babel/parser` (new root dev dependency, 8.1.0) and its exports are evaluated by a small literal
evaluator: object/array literals (with spreads of local literals), strings, numbers, booleans,
`null`, `undefined` (dropped as JSON drops it), template literals and `+ - * /` over literals, and
references to other literal top-level constants of the same file (`anatomy` in 103 places). Every
other node fails with `file:line`. Top-level statements are never evaluated; a test plants an
`fs.writeFileSync` statement and checks nothing ran.

Four 0.7.7 CLI topics are computed by CLI code at run time (`field-reference`, `icon-set-files`
call authoring helpers; `template-grading-rubric` and `grade-template-with-agent` build tables with
`Object.freeze` and `.map`). They describe CLI authoring and grading, not the design system, and are
skipped by name in `COMPUTED_TOPICS`; any other non-literal topic fails the run.

### Restate the CLI's projection rules

The snapshot shape is the CLI list output: `component list --detail full`, `hook list`, `docs`
detail per topic, `template list`. The generator restates those rules: component discovery from
`src/` (`.tsx` with a sibling doc, `hidden`, `hiddenComponents`, group keys, doc fallback search),
hook discovery (`src/hooks/*.doc.mjs`, then `use*.doc.mjs` elsewhere), lens overlays (the current
upstream `overlayAuthoredDoc`/`mergeTranslation`), docs topics from `docs/` (0.2 layout) or
`assets/docs/` and `assets/docs/tree/` (0.7 layout) with `.doc.zh.mjs`/`.doc.dense.mjs` overlays and
token-ref inlining, and pages plus blocks from the templates root. Two deliberate departures:

- Discovery reads `group`, `hidden`, `hiddenComponents` and hook `category` from the parsed `docs`
  export. The 0.2 CLI scanned file text with regular expressions and picked up a translated `group`
  prop description as the category of `ChatMessageBubble` and `TypeaheadItem`.
- A token-ref to a namespace topic (0.7 `tokens` is a namespace whose guides hold the tables) takes
  the one guide placed under that namespace that has the section, as the 0.7 CLI documents.

The tokens topic gets `theme.tokens` from `Token/Light/Dark` and `Token/Value` tables: its own
sections in 0.2, the guides placed under `namespace:tokens` in 0.7 (285 tokens, 15 categories).

### Keep the lenses, store them only when they differ

The issue comment proposed dropping `docsZh`/`docsDense` and bumping the schema because they had "no
source in the tarball". They do: 205 of 206 core doc files in 0.2.0 and 240 of 242 in 0.7.7 export
`docsDense`, 152 and 156 export `docsZh`, and the CLI ships `*.doc.zh.mjs`/`*.doc.dense.mjs` topic
overlays. So the lenses are kept, the schema stays `design-pipeline.design-system-snapshot.v1` (it is
the shared provider-snapshot schema; a bump would ripple into custom adapters and
`component-source-catalog.json`), and no consumer changes. To keep size in check a lens is stored
only where it differs from the entry; the CLI prints the entry itself for a missing lens, and
`design-system-catalog-core.cjs` already treats a missing `docsDense` as absent. 0.7.7 is 4.7 MB with
this rule, 6.9 MB without (the 0.2.0 snapshot was 3.5 MB).

### Wire it into sources:update as an npm importer

An `npm` lock entry may carry `importer`. After the bundle importers, `sources-update.cjs` fetches
each `{pack:<package>}` at the resolved release with `npm pack <pkg>@<version> --ignore-scripts
--json` (npm verifies registry integrity; nothing is installed or run), substitutes `{revision}` with
the release tag's commit, runs the importer with `--reviewed-at`, and restores the entry's site files
if it fails. The existing npm site rewrite and hex replacement then move the notices, catalog link
and lock. `SOURCES_NPM_PACKS` maps `name@version` to a local tarball for tests. The `astryx` entry
gains the notice line as a second version site.

### Token types for the two new tokens

0.7.7 adds `--focus-outline-color: var(--color-accent)` and `--focus-outline-style: solid`, which
the projection could not type, turning the bundled projection from `ready` to `review`. `inferType`
now maps a `-color` suffix to `color` and a CSS border-style keyword under a `-style` name to
`strokeStyle`; on the 0.2.0 data no token changes type.

## Acceptance: parity before the upgrade

The committed snapshot says 0.2.0 at `921d3db`, but `v0.2.0` is `e4013c9`; `921d3db` is two days
later. Generating from the two npm 0.2.0 tarballs differed only where the CLI at `921d3db` had newer
text (the `cli-integrations` topic, one `theme` table cell, one template). Generating from the npm
`@astryxdesign/core` 0.2.0 tarball plus `packages/cli` at `921d3db` (`git archive`, root LICENSE
added) reproduces how the snapshot was made: the CLI ran from that checkout and read core from
`node_modules`. Per collection, after treating an omitted lens as the entry:

| Collection | Entries | Identical | Differences |
| --- | --- | --- | --- |
| components | 154 / 154 | 147 | 7 in `docsZh.usage.anatomy` only: the current overlay keeps the authored anatomy a lens omits; the 0.2 CLI dropped it |
| docs | 20 / 20 | 20 | none |
| templates | 655 / 655 | 655 | none |
| hooks | 42 / 42 | 42 apart from `docsDense` | the 0.2 `hook list` ignored `--dense`, so every committed hook `docsDense` was the English entry; the generator applies the authored dense lens |

Before the `group` fix two more components differed (the regex category above). Every difference is
explained by a known CLI behaviour, so the generator was trusted and the drop fallback not taken.

## 0.2.0 to 0.7.7

`npm run sources:update -- --only astryx` produced the committed snapshot (byte-identical to a direct
generator run): 171 components (+17, none removed), 61 hooks (+19, none removed), 144 docs topics
(`cli-integrations` gone; the 0.7 docs tree adds 125), 735 templates (4 removed:
`dashboard-portfolio`, `table-page-chart`, `table-page-heatmap-status`,
`table-page-shoe-store-heatmap`), 285 theme tokens (all 184 earlier names kept, 18 values changed,
e.g. `--spacing-4` 16px to 1rem). No route, guide or test named a removed entry. The repository LICENSE
blob is unchanged between the two revisions.

## Risks

- Docs entries carry authored topic text: 0.7 link and command tokens are not rendered, so a reader
  may see `[[...]]`-style links. Reference use only; the CLI remains the renderer.
- The rules are a restatement; a future CLI that changes discovery would drift silently. The
  bundled-snapshot tests and the weekly bump PR's diff are the review.
- A future doc file with real code fails the weekly update for `astryx` loudly; the fix is a reviewed
  `COMPUTED_TOPICS` entry or evaluator support, not running the file.

## File ownership

| Path | Change |
| --- | --- |
| `scripts/generate-astryx-snapshot.cjs` | rewritten: tarball reader, literal evaluator, projection |
| `scripts/sources-update.cjs`, `scripts/sources-lock.cjs` | npm importer step and validation (stacked on #268) |
| `sources.lock.json` | `astryx` importer and notice site, `held` removed, moved to 0.7.7 |
| `skill/references/astryx-design-system-snapshot.json` | regenerated |
| `skill/scripts/design-system-decision-core.cjs` | two inference rules |
| `tests/astryx-snapshot-generator.test.cjs` | new; adversarial fixtures |

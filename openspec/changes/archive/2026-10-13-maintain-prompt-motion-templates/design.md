## Scope and existing pieces

Use the existing clean release worktree and PR #85 branch, starting at
`48ea3ce185c724fe5a4625c2c3e9434616c272a1`. Preserve the dirty original project checkout.
Existing `film methods`, choreography, HyperFrames and reference evidence remain execution
consumers. This change maintains recipes and discovery; it does not instantiate a project.

## Data and maintenance

- `skill/references/prompt-motion/source-index.json` stores current homepage card metadata and
  retrieval date/page digest. A card is indexed, not prompt-reviewed or motion-observed.
- `skill/references/prompt-motion/templates.json` stores authored concise recipe records with
  stable IDs, source case IDs, taxonomy, parameters, beat sequence, invariants, gotchas, existing
  local method paths and page-only/unrendered observation limits. Preserve original ownership;
  do not copy complete prompts or ship remote media. Each template states what is not supplied.
- `scripts/refresh-prompt-motion-index.cjs` reads a locally retrieved homepage HTML snapshot.
  Parse JSON only; never evaluate scripts. Produce an unused local candidate/diff for review.
  Missing/malformed/duplicate cards fail closed. Compare metadata, not videos or inferred motion.
  Removed upstream cases remain reviewable; refreshing the index never approves or deletes a
  curated recipe. Fetching and periodic scheduling remain explicit separate operations.
- `skill/tools/prompt-motion/library.cjs` reads bundled data from its own package, validates local
  identities and source links, and returns search/detail results without network or writes.
  CLI `film templates --query <terms>` searches curated recipes; `--template <id>` returns one;
  `--all` includes discovery candidates. These are supporting records, not receipts or gates.

## Ownership and reach

- Index worker: refresh script, source-index.json, parser/diff negative tests.
- Recipe workers: independently owned recipe batch JSON in ignored scratch; primary merges into
  one catalog after source/content review. No shared-catalog edits by parallel workers.
- Primary: OpenSpec, read-only helper/CLI/tests, recipe merge, guides, package/test manifest,
  installation, verification and PR delivery. Everyone preserves others' work.

Use existing option names; any needed new flag is registered in CLI option tables. Keep the
package relocatable. No source recipe's canvas, fps, engine, brand bans or approval rounds become
global policy. Maintenance validation checks consistency only; it does not grant creative,
component or user acceptance. Ordinary UI/CSS remains on its existing route.

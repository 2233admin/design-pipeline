## Decisions

1. Each refresh uses the bundle's existing importer and integrity record; the reviewed commit, date and file count in
   the manifest and `THIRD_PARTY_NOTICES.md` move together.
2. Guides that paraphrase a refreshed bundle are re-read against the new text; a number or rule we quote must match
   upstream or say why it differs.
3. A removed upstream is frozen, not deleted: our users keep the guidance, and the manifest says it has no upstream.
4. The HyperFrames version stays at the one users already get; the eval pin follows it. Upgrading the runtime changes
   routes, check output and render bytes and needs its own change.

## Risks

- Refreshing `interface-discipline` rewords many files; tests that cite rule anchors (`UC-*`, `audit.*`) must still
  resolve, or the citations are updated in the same change.

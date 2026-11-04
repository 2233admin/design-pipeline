# Design

## Decision: drop, not keep or replace

- **Keep (frozen):** contradicts "track latest, no old versions"; the updater could never refresh it
  and the lock would carry a permanent `held`.
- **Replace with upstream `motion`:** adds a bundle from a repository restructured within a week,
  with new importer and Emil-conflict rules, for rules the pipeline already has.
- **Drop:** chosen. Upstream history and overlap were checked in the #264 investigation comment.

## Where each rule goes

| 12-principles rules | Existing coverage |
| --- | --- |
| `timing-under-300ms`, `timing-consistent` | UC-03 via `EM`, `MI/animations.md`, motion gate duration rule (300ms) |
| `easing-entrance-ease-out`, `easing-*` | UC-03 and the "Curves" / "Exit easing" resolutions (exit ease-in was already overridden) |
| `physics-*` (springs, squash, press) | `emil-design-eng`; "Press feedback" resolution |
| `staging-*` stagger | Motion gate stagger row, "Stagger" resolution (the 50 ms cap was already overridden) |
| `staging-*` one prominent mover | UC-02 now cites `animation-thinking.md#direct-the-change` ("readable pose before competing movement") |
| focal point, dim background, z-index | Layout concerns, covered by W1 and UC-21, not motion |

The precedence list loses its fourth level ("Checklists"); the last resolution now speaks of
"bundled rules". `ui-transition-rules.md` keeps citing UC-02, which still exists.

## File ownership and migration

- Deleted: `skill/vendor/12-principles-of-animation/**`, its `package-resources.json` entries, the
  `component-source-catalog.json` doc entry, lock entry, notice section, `.gitattributes` line and
  vendor README row.
- `scripts/import-ui-craft-sources.cjs`: the `frontmatter` license kind and the `license` field of
  `skillMetadata` existed only for this bundle and are removed rather than kept as dead paths.
- Archived change records and the `track-latest-upstream` history text are left as history.
- No migration: no project artifact or receipt references the bundle by path; reviewers who cited
  `12P` in an existing `qa.md` keep that text, and new reviews cite the sources above.
- This change is stacked on `track-latest-upstream` (#268) and modifies the requirement text as that
  change leaves it ("locked" snapshots, importer rejection wording).

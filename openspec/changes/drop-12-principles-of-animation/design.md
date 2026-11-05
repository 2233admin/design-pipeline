# Design

## Decision: drop, not keep or replace

- **Keep (frozen):** contradicts "track latest, no old versions"; the updater could never refresh it
  and the lock would carry a permanent `held`.
- **Replace with upstream `motion`:** adds a bundle from a repository restructured within a week,
  with new importer and Emil-conflict rules, for rules the pipeline already has.
- **Drop, keeping the knowledge:** chosen. The bundle's 14 rules were checked one by one: nine are
  covered by existing sources, and the five without real coverage are restated in our own words as
  UC-25 to UC-29, sourced "from the former 12-principles bundle (raphaelsalaja/skill, archived
  upstream)", so dropping the snapshot loses no rule.

## Where each rule goes

Line numbers are at this change's head; `EM` is
`skill/vendor/emil-design-eng/upstream/skills/emil-design-eng/UPSTREAM-SKILL.md` and `MI` is
`skill/vendor/make-interfaces-feel-better/upstream/skills/make-interfaces-feel-better/animations.md`.

| # | Upstream rule | Coverage |
| --- | --- | --- |
| 1 | `timing-under-300ms` | `UI:138` Duration resolution; `GATE:48`, `GATE:243`; `EM:135` |
| 2 | `timing-consistent` | `UI:83` UC-03 "similar elements share timing"; `ui-transition-rules.md:98` TR-05 |
| 3 | `timing-no-entrance-context-menu` | New `UI:105` UC-25 |
| 4 | `easing-entrance-ease-out` | `UI:83` UC-03; `EM:121` |
| 5 | `easing-exit-ease-in` | Overridden: `UI:142` Exit easing resolution (ease-out); `EM:121` |
| 6 | `easing-no-linear-motion` | `UI:83` UC-03 "linear only for constant-rate fills" |
| 7 | `easing-natural-decay` | New `UI:106` UC-26 |
| 8 | `physics-active-state` | `UI:136` Press feedback resolution; `MI:285`; `EM:429` |
| 9 | `physics-subtle-deformation` | New `UI:107` UC-27 (press part also `UI:136`, `MI:285`) |
| 10 | `physics-spring-for-overshoot` | `EM:147`-`EM:191` (springs, subtle bounce) |
| 11 | `physics-no-excessive-stagger` | Overridden: `UI:143` Stagger resolution; `GATE:244` |
| 12 | `staging-one-focal-point` | `UI:82` UC-02, reworded to `animation-thinking.md:29` |
| 13 | `staging-dim-background` | New `UI:108` UC-28 (layout, not motion) |
| 14 | `staging-z-index-hierarchy` | New `UI:109` UC-29 (layout, not motion) |

`UI` is `skill/references/ui-craft-sources.md`, `GATE` is
`skill/references/animation-opportunity-and-review.md`.

UC-02 now states what `animation-thinking.md#direct-the-change` says (readable pose before
competing movement; separate overlapping actions when order matters, overlap when simultaneity is
the point) instead of the stricter "one element at a time", which no remaining source states.
UC-28 and UC-29 say they are layout rules so motion review does not own them alone. UC-27 keeps the
upstream 0.95-1.05 range and defers to the narrower 0.95-0.98 press range already resolved.

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

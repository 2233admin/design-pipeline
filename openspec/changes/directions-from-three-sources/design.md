# Design

## File ownership

- `skill/scripts/directions-core.cjs` (new) parses the catalog from the library's
  `references/design-styles.md`, owns the roulette `draw` and the card, thumbs and version findings.
- `skill/scripts/appearance-ledger-core.cjs` (new) reads and writes the ledger, measures a delivered
  page and decides collisions.
- `skill/scripts/workflows/directions.cjs` (new) is the run and ask builder shared by ui and web.
- `direction-preview-core.cjs` accepts the new optional keys, merges findings into blockers and keeps
  its schema id. `composition-core.cjs` exposes `checkTextLegibility`; `capture-composition.cjs` adds
  font family, block fill and root background to its elements.
- `workflow-core.cjs` writes the ledger on delivery and handles `--taste`; `cli-core.cjs` adds
  `direction draw` and the `--mix`, `--taste`, `--medium`, `--second`, `--pool`, `--east-pool` flags.
- `workflows/ui.cjs` gains the playback and the multi-id pick; `workflows/web.cjs` loses the variants
  page and the switcher and gains the same directions action.

## Roulette

`draw(catalog, section, S, {avoid, pool})` starts at `S % n` (n is the section size, or the pool
length when the owner named a style or brand), then advances past styles in the ledger's last three
deliveries and records the numbers it skipped. The receipt stores second, section, number, style,
specimen path, fidelity and skipped; the check recomputes the draw and flags any mismatch. A style
under 70% fidelity must say what degrades. Source keys are `designer:<name>`,
`reference:<url>`, `style:<section>/NN`.

## Check

Findings are `{code, message, fix}` and are also merged into `blockers`. The ledger is read only at the
preview stage and excludes the project's own entry, so delivering a project never reopens its own
direction. Collision is a shared source key, or a palette match (`lightness:first hue`) together with
a matching display font or skeleton. At most one version may be marked overdone.

## Ledger

An entry is `{project, date, appearance:{measured, lightness, hues, fonts, skeleton, motion}, sources}`,
upserted per project and capped at 200. `project` is a hash of the project path. The appearance is
measured from the browser capture of `index.html` when one is available, else from its CSS source
(`measured: "source"`). Nothing measurable, no page or a failed write records `skipped` with a reason
and never blocks delivery.

## Owner pick

The ask lists the three captured versions with card summaries, the thumbnail board and the three
alternates. A pick takes one id, or several with `--mix part=id` limited to the shown versions.
`selectedDirectionIds` and `mix` are stored in the receipt decision (ui) or in
`decisions.conceptMix` (web). `--taste` is owner-only at the concept stage and goes through
`rules.addRule` with `from: "direction taste"`.

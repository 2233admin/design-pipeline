# Edit workflow

PV, MAD or beat montage cut from existing footage and music. `designer-pipeline next` names the
current stage; read only that section. Stage order:

- `quick`: analyze, cut, render, check.
- `standard` and `full`: intake, analyze, style, cut, render, check, review, deliver.
- `replicate` mode adds reference after analyze at every tier.

Full command reference: `film-edit.md`. Movement and phrasing decisions: `animation-thinking.md`.
This workflow assembles clips; PV/MAD visual language can also require authored animation,
compositing and typography from the film workflow. A voice track does not dictate a diagram style.

## intake

Ask the four intake questions in one numbered round, each with its recommendation; record the
reply with `decide --stage intake`. For an edit, the asset question matters most: footage and
music must be licensed for the use.

Intake is complete only when `decisions.intake` is recorded in `.design-pipeline/state.json`;
`brief.md` or `BRIEF.md` alone does not complete it. If recording refuses a case-insensitive
`brief.md` collision with a file intake did not write, preserve that file by moving or renaming it,
then retry the returned intake record command. Refusal leaves the existing brief and state unchanged.

## analyze

Put the footage in `sources/`, the music in `assets/`, and each clip's license in
`sources/licenses.json`. Then `film-edit analyze --project-root . --audio <music file>` writes
`edit/analysis.json` (beat grid and footage shots).

## reference

Replicate mode only. Watch the reference edit and write `reference.md`: shot lengths per
section, where cuts land (beat, bar, accent), speed ramps, repeats and text moments, and what to
transfer. It cannot be skipped.

## style

The `mad` and `pv` choices are rough-cut presets, not creative limits. Record the already agreed
direction when present. For automatic assembly choose `mad` (shorter cuts) or `pv` (longer shots):
`decide --stage concept --choice mad|pv`. Quick tier skips this and cuts as MAD.

## cut

`film-edit auto --project-root . --style mad|pv` places shots on the beat grid in `edit.json`.
Adjust `edit.json` by hand afterwards; hand edits reopen check. Judge the first phrase against
the reference before extending it: subject movement, staging, motif, cut relationship and sound.
Off-grid cuts can be intentional; review their effect instead of snapping every cut mechanically.

## render

`film-edit render --project-root .` assembles `renders/edit.mp4`.

## check

`film-edit check --project-root .` checks timeline, beat grid, licenses, rhythm and reuse, then runs the render, audio and composition gates on the result. Apply each
finding's `fix` and rerun. A new render or a changed `edit.json` reopens this stage.

## review

Show the draft, the contact sheet and a one-paragraph gate summary. The user accepts, or rejects
with one sentence (`decide --stage review --verdict accept|reject`). A rejection becomes a
rule, returned until the owner accepts a draft.

## deliver

`decide --stage deliver --answer renders/edit.mp4`.

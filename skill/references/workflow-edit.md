# Edit workflow

PV, MAD or beat montage cut from existing footage and music. `designer-pipeline next` names the
current stage; read only that section. Stage order:

- `quick`: analyze, cut, render, check.
- `standard` and `full`: intake, analyze, style, cut, render, check, review, deliver.
- `replicate` mode adds reference after analyze at every tier.

Full command reference: `film-edit.md`.

## intake

Ask the four intake questions in one numbered round, each with its recommendation; record the
reply with `decide --stage intake`. For an edit, the asset question matters most: footage and
music must be licensed for the use.

## analyze

Put the footage in `sources/`, the music in `assets/`, and each clip's license in
`sources/licenses.json`. Then `film-edit analyze --project-root . --audio <music file>` writes
`edit/analysis.json` (beat grid and footage shots).

## reference

Replicate mode only. Watch the reference edit and write `reference.md`: shot lengths per
section, where cuts land (beat, bar, accent), speed ramps, repeats and text moments, and what to
transfer. It cannot be skipped.

## style

The user picks `mad` (fast, energy-driven cuts) or `pv` (readable shots on phrases):
`decide --stage concept --choice mad|pv`. Quick tier skips this and cuts as MAD.

## cut

`film-edit auto --project-root . --style mad|pv` places shots on the beat grid in `edit.json`.
Adjust `edit.json` by hand afterwards; hand edits reopen check.

## render

`film-edit render --project-root .` assembles `renders/edit.mp4`.

## check

`film-edit check --project-root .` checks timeline, beat grid, licenses, rhythm and reuse, then runs the render, audio and composition gates on the result. Apply each
finding's `fix` and rerun. A new render or a changed `edit.json` reopens this stage.

## review

Show the draft, the contact sheet and a one-paragraph gate summary. The user accepts, or rejects
with one sentence (`decide --stage review --verdict accept|reject`). A rejection becomes a
project rule.

## deliver

`decide --stage deliver --answer renders/edit.mp4`.

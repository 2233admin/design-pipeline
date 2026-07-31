# Proposal: Per-Region Structure Checklist In Reference Evidence

## Problem

`reference-spec.md` asks for "observable composition, type, color, material, lighting, and motion
evidence" as prose. Prose invites generalisation, and generalisation is exactly the failure mode
when reading a layout: the agent finds a pattern in two of three regions and writes it as if it held
for all three, because the uniform model is shorter and tidier to state.

Observed in the `jst-hud-clock` run: the reference has three registers. Two share a
`[label][mark][readout]` column structure; the first does not, placing its label above a full-width
readout. `reference.md` recorded "each register splits into three columns" and then added the
exception as an afterthought in a later sentence. The structural claim that reached `design.md` and
then the implementation was the uniform one.

The existing spatial-cue checklist works precisely because it is enumerated and adversarial: it asks
for evidence *for* and *against* a 3D route in separate sections. Composition gets no equivalent
treatment, so the one part of the reading most likely to be wrong is the least structured.

## Change

- Require a per-region structural breakdown in `reference.md`, one row per region, authored
  independently.
- Require an explicit uniformity question with a named answer: does every region share the same
  row and column structure, and if not, which regions are the exceptions.
- Require exceptions to be named in the same table as the regions they break from, not in
  surrounding prose.
- Record the breakdown in `reference-evidence.json` so the claim is machine-readable and can be
  compared against the graybox.
- Forbid "as above" and "same as previous" as region descriptions; each region is described from the
  reference.

## Non-goals

- Requiring pixel coordinates for each region.
- Replacing the composition prose section; the table supplements it.
- Applying the checklist to changes with no visual reference.

# Proposal: Pending Source State For Reference Evidence

## Problem

`reference-evidence.schema.json` requires `source.path`, `source.width`, `source.height`, and a
`source.sha256` matching `^[a-fA-F0-9]{64}$`. There is no null, pending, or unavailable variant.

When a user supplies the reference by pasting an image into the conversation instead of committing
it to the repository, none of those four fields can be filled honestly. The agent is left with two
options, both bad:

1. fabricate a hash, which makes the contract validate while proving nothing and silently converts
   a hard gate into decoration;
2. skip `reference-evidence.json` entirely, which removes the normative route classification, the
   fidelity record, the approval field, and every downstream gate that reads them.

Observed in the `jst-hud-clock` run: option 2 was taken. The route decision, the four independent
classification decisions, the fidelity request, and the invariants all survived only as prose in
`reference.md`. Nothing machine-readable recorded that the user had asked for an exact
reconstruction, so no tool could enforce it.

The schema currently treats "the reference cannot be measured" and "there is no reference" as the
same state. They are not.

## Change

- Add `source.availability` with values `resolved` and `pending`.
- When `availability` is `pending`, allow `sha256`, `width`, and `height` to be `null`, and require
  `pendingReason` and `requestedFrom`.
- Keep every other field required. Route, classification, spatial cues, fidelity intent, required
  artifacts, and approval are all authorable without the raster and SHALL still be recorded.
- Make `reference check` report `blocked` with reason `source-pending` rather than failing
  validation, so the contract exists and is inspectable while the source is missing.
- Forbid `resolved` without a real hash, and forbid any measured stage from running against a
  `pending` source.
- Record the transition when a source later becomes available, so a run that started pending is
  distinguishable from one that always had the file.

## Non-goals

- Allowing a `pending` source to satisfy the geometry or final fidelity gates.
- Weakening the hash requirement for a `resolved` source.
- Inferring dimensions or identity from a conversation attachment.

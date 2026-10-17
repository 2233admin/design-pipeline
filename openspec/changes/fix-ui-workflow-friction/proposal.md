## Why

Running the `ui` deliverable on a real project (the Shinka Research console, Relates to #147) hit four
frictions:

- **Intake asks a film's questions.** `ui` intake asked "How long?" and about footage and music.
- **The direction is skipped.** `next` for `ui/standard` went from intake straight to work: Stage 0 and
  the direction preview existed only in the reference docs, so the owner never picked between
  rendered candidates unless the agent remembered to.
- **A relative `--project-root` fails obscurely.** It is resolved against `--root`, and the error
  only printed the doubled path.
- **The MOTION.md source-decisions error is vague.** It did not say that `Adopted:` and `Rejected:`
  must each start a line.

## What Changes

- `ui` intake asks for the job, users and devices (and whether it is shared), the content source and
  its states, and licensed assets.
- At the standard and full tiers outside replicate mode, `ui` gains a direction stage (`concepts`,
  checkpoint `concept`) between intake and work: Stage 0, then `direction-preview.json` at the project
  root checked with the existing `direction check`; the owner's pick is recorded with
  `decide --stage concept --by owner`, written into the receipt only after the selection check
  passes and the state is saved. A waived preview needs the owner's agreement.
- The relative `--project-root` error names `--root`; the MOTION.md error names the missing lines.

## Capabilities

- `design-pipeline`: ADDED `ui intake asks interface questions`, `ui work starts from an owner-picked
  direction`, `Path and foundation errors say how to fix them`.

## Reuse

- The direction-preview contract and `checkDirectionPreview` (preview and selection stages).
- The `concept` checkpoint, its delegation map and `reason()`.
- The existing intake record and `decide` flow.

## Impact

- `ui` standard and full runs gain one owner decision before work; quick and replicate are unchanged.

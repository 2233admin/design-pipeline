# Design

## File ownership

- `skill/scripts/workflows/replicate.cjs` (new) owns the replicate reference text, the `extract`
  stage, the findings that block it, the confirmation record and the clone-verdict lookup.
- `skill/scripts/workflows/shared.cjs` owns `extractionDigest` (the digest later stages bind to),
  the ui `reviewInputHashes` extraction and the clearing of `deliveredExtraction`; `reference()` takes
  an optional `work` text.
- `workflow-core.cjs` wires `extract` into the ui stages, `decide --stage extract`, the ui delivery
  binding and the extra interaction inputs; `workflows/web.cjs` wires it into the web replicate
  stages, the description approval inputs, the probe and delivery.
- `workflows/roles.cjs`: `extract` is a locked owner checkpoint ("Extraction"); `extractions` joins
  the stamped histories.

## What `next` checks

The extract step is finished when the latest `extractions` entry is an accept whose stored hashes
equal the current files and the checks below produce no finding:

1. `reference-evidence.json` exists and `checkReferenceEvidence` does not throw. Its status may be
   `blocked` only for the graybox, the geometry stage or a pending source, which the build
   handles; `approval-pending`, `approval-rejected` and `video-analysis-incomplete` block.
2. `checkDesignFoundation` and `checkMotionFoundation` are ready (`foundation check --kind all`), and
   DESIGN.md Source Decisions mentions what is not borrowed (content, copy, brand, logo).
3. At standard and full (or at quick when it exists) `checkDesignSystemPackage` is ready.

These are the functions behind `reference check` and `foundation check`; nothing is reimplemented.
The full `reference check` also needs the graybox, which only exists after the build starts, so its
graybox and geometry stages stay with the build as before.

## Binding

`extractions` entries hold `{verdict, inputs: {DESIGN.md, MOTION.md, reference.md,
reference-evidence.json}: sha256|null, at, by}`. `extractionDigest(state)` is the canonical-JSON
digest of the latest accepted entry's `inputs`, `null` outside replicate.

- Web description: `approvalInputs` adds `extraction` only in replicate (older approvals keep their
  inputs); `diffInputs` treats a changed digest as a structural change.
- Web probe: the interaction pass binds `reference.md` and `reference-evidence.json` in replicate;
  the review draft and the delivery already bind the pass's inputs.
- ui: the delivery stores `deliveredExtraction`; the work stage is finished only while it equals the
  digest, and the review inputs include it.
- A file edited after confirmation makes `extract` unfinished (first in stage order), so every later
  stage waits; re-confirming changes the digest and reopens the stages bound above.

## Clone verdict

`evaluate-website-clone.cjs` persists its verdict into `website-cloning.json` (`status`,
`verification`). `findManifest` looks at the project root and the change directories under the
OpenSpec-style roots `init-website-clone.cjs` uses. The web probe and delivery are unfinished while a
manifest exists and is not `complete` with a passed verification. The evaluator is a script that
mutates the change, so `next` consults its result and names the command, rather than running it.
`init-website-clone.cjs` needs a change id, the allowed differences and the protected invariants, so
the extract step names it and `next` does not run it; this keeps `next` free of a second set of flags.

## Compatibility and migration

None. A project whose state says `mode: freeform` is read as before (the mode only selected the
`replicate` branches); `--mode freeform` fails with the enum error. Existing replicate ui and web
projects reach `extract` when `next` runs next; there is no migration of stored decisions.

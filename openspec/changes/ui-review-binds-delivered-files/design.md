## Decisions

1. Store `state.decisions.deliveredFiles: {"<project-relative path>": "sha256:…"}` sorted by path.
   `reviewInputHashes(state)` for ui returns `{files: deliveredFiles, extraction?}`; `deliveryInputHashes` is
   written for ui like the other deliverables.
2. `deliveryRecorded` for ui re-reads every listed file. Missing or changed means not recorded; the owner review
   that follows names each changed path.
3. `--file` is repeatable and resolved with `resolveInside(root, …, {mustExist: true})`; directories are refused.
   Up to 200 files; more is refused with a message to name the reviewed entry points instead.
4. No compatibility path for older ui state (AGENTS.md: delete superseded paths). A state with `delivered` but no
   `deliveredFiles` is treated as an unrecorded delivery.

## Out of scope

- Running a gate inside the ui flow (the side observation in #182).

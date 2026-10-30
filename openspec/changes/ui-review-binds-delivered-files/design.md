## Decisions

1. Delivery stores `state.decisions.deliveredFiles: {"<project-relative path>": "sha256:…"}` sorted by path, and
   `deliveryInputHashes = {files: deliveredFiles, extraction?}` like the other deliverables.
2. `reviewInputHashes(state, root)` for ui reads every listed file on each call and returns its current hashes (a
   missing file hashes as `missing`), so a comparison with the stored `deliveryInputHashes` sees edits.
3. The ui completion path (`codeStages` in `workflow-core.cjs`) uses `deliveryRecorded(state, root)` instead of the
   presence of `decisions.delivered`; a changed or missing file makes the delivery unrecorded and the final review asks
   again, naming each changed path.
4. `--file` is already parsed as a repeatable option; the `decide` handler in `cli-core.cjs` passes
   `optionList(parsed, "--file")` to `workflow.decide`, which resolves each with `resolveInside(root, …, {mustExist: true})`
   and refuses directories. Up to 200 files.
5. The ui deliver command is built by `codeStages.work.action` in `workflow-core.cjs`; it carries `--file index.html`
   when that file exists.
6. No compatibility path for older ui state (AGENTS.md: delete superseded paths). A state with `delivered` but no
   `deliveredFiles` is an unrecorded delivery.

## Out of scope

- Running a gate inside the ui flow (the side observation in #182).

## Why

Relates to #182. A ui delivery's owner acceptance binds only the sentence passed to `decide --stage deliver
--answer`. After the owner accepts, the page can be replaced entirely and `next` still returns `done`, so `done`
says the owner accepted some version, not this one. Web, film and edit already bind their acceptance to file
hashes and ask again when the files change ("The owner accepted an earlier version…"). This contradicts the
rule that every tier ends with the owner accepting the actual deliverable.

## What Changes

- ui delivery requires one or more `--file <path>` on `decide --stage deliver` naming the files under review
  (inside the project root, files not directories). `--answer` stays as the description.
- The delivery records each file's sha256; `reviewInputHashes` for ui returns those hashes (plus the extraction
  digest in replicate mode, unchanged).
- `next` recomputes the hashes. When a reviewed file changed or disappeared after the owner accepted, the workflow
  returns to the final review with the existing "accepted an earlier version" wording, listing the changed files.
- The deliver command `next` returns for ui (built in `workflow-core.cjs`) carries `--file` with the project's
  `index.html` when it exists, as a placeholder the agent must confirm.
- **BREAKING:** ui delivery without `--file` is refused with `INPUT_MISSING`. No migration for old state files:
  their delivery has no file hashes and is asked again.

## Capabilities

- `design-pipeline`: ADDED `ui acceptance binds the reviewed files`.

## Reuse

- `reviewInputHashes`, `deliveryRecorded`, the earlier-version re-ask in `workflows/shared.cjs`, and the
  film/edit file-hash pattern in `workflow-core.cjs`. Film, edit and web bindings are unchanged.

## Impact

- `workflow-core.cjs` (deliver stage, ui completion path and deliver command), `workflows/shared.cjs`, `cli-core.cjs`
  (`decide` handler passes `--file`), docs and tests.

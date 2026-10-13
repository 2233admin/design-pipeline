## Why

The full repository QA run has 34 unresolved failures in Git/native task verification and browser pointer capture. Windows long/short directory aliases split one physical Git root into different path strings, blocking native baselines and scope checks. A browser sampling failure also needs a reproducible diagnosis. The user requests fixing QA before publishing the Good CSS integration to GitHub.

## What Changes

- Repair physical path identity through existing containment and Git snapshot helpers, retaining escape and symlink rejection.
- Canonicalize Good CSS study source/output coordinates so Windows aliases cannot bypass the preserved-source boundary.
- Diagnose the existing native completion/component evaluation failures and pointer sampling check; fix proven causes without weakening gates or acceptance.
- Run focused regressions and the complete repository QA, strict specifications and source checks before committing and pushing the authorized work.

## Impact

Existing CommonJS runtime helpers, existing tests and this change's evidence. No new gate, receipt schema, dependency or public command. Preserve all existing working-tree edits and audit publication scope.

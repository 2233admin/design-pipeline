## 1. Implement

- [x] 1.1 Add focused Windows CI using existing path/storyboard regressions, with actual alias coverage and explicit optional-capability skips.
- [x] 1.2 Stream the repository test batch without changing other captured QA subprocesses or failure handling.
- [x] 1.3 Move PR-target reconciliation before full QA and align template verification commands.
- [x] 1.4 Reproduce and repair the six existing Ubuntu CI failures while preserving real-browser verification and failure assertions.

## 2. Verify and publish

- [x] 2.1 Run the exact Windows regression command, inspect the final diff and validate specifications.
- [ ] 2.2 Freeze the integrated tree and run full `npm test`, retaining visible progress, complete output and exit evidence.
- [ ] 2.3 Record evidence and limitations, update the existing PR and inspect its CI status.

# QA: Internalize DeepCloneWebsite

## Source Integrity

- Reviewed commit: `ab180fbe14a0f86c478bf033b375b1d40fabe6b1`.
- Reviewed Git tree: `6deeff7edb181ed4f50dff024c3620fe138e32a7`.
- Snapshot: 29 LF-normalized files, 137,508 normalized bytes.
- Canonical tree SHA-256: `367261a81cf3ef5a3cf4c087664af8a7fafbc8d422ef63a064ab233970006658`.
- Normalized comparison against the reviewed clone: 0 mismatches.

## Verification

- `node --test tests/deepclonewebsite-reference.test.cjs`: passed (2/2).
- `node scripts/qa.cjs`: passed (47 test files; 392 tests; 0 failures).
- Fixed-epoch package runs produced reproducible `.tgz` and `.zip` archives.
- Isolated install, dependency self-check, bundled-source verification, and public CLI smoke passed.

## Boundary Evidence

- No project runtime dependency was added.
- The upstream Next.js/Open Lovable application was not executed.
- The protocol preserves the local Browser/Builder/Evidence gates and rejects swallowed errors,
  blind retries, implicit host equivalence, scriptless interaction claims, and unsupported backend
  certainty.

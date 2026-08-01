## Validation evidence

- `openspec validate enforce-template-authority-clone-gates --strict`: passed.
- `node --test tests/website-cloning-init.test.cjs`: 27 tests passed.
- `node scripts/qa.cjs`: 199 repository tests passed; reproducible tgz, zip, and checksums passed; isolated archive install, installed dependency self-check, installed-package CLI smoke, and byte-identical repository-status check passed.
- `Invoke-SentruxAgentTool.ps1 check_rules`: passed with quality signal 8940 and 0 violations.

## Known repository governance debt

The normal Code Intel run reports `domain_failed` because this fresh worktree has no `.sentrux/baseline.json`. The direct Sentrux rule check passes. This change does not manufacture or copy an unrelated baseline; the missing baseline remains explicit repository governance debt.

# QA

Verified locally on 2026-07-20 as part of the `v0.6.0` release candidate.

## Evidence

- `node --test --experimental-test-coverage tests/*.test.cjs`: 112 passed, 0 failed; total line
  coverage 89.90%.
- `PACKAGE_VERSION=0.6.0 node scripts/qa.cjs`: repository structure, schemas, isolated self-check,
  all 112 tests, and package generation passed.
- Anti-slop regression coverage includes strict nested-shape validation and output paths that escape
  through symlinks or Windows directory junctions.
- `sentrux check .`: all 4 rules passed; quality score 6908.
- `sentrux gate .`: the reviewed post-merge release baseline showed no quality, coupling, cycle,
  or god-file regression.
- Installed `check-deps.cjs --json`: core resources passed. The existing optional Anime.js
  capability warning remains non-blocking.
- `git diff --check`: no whitespace errors; Git only reported line-ending conversion warnings.

## Dual-site calibration

Both website-reference fixtures reviewed all 13 applicable rules:

| Fixture | Result | Passed | Accepted context | Blockers | Warnings |
| --- | --- | ---: | ---: | ---: | ---: |
| Arknights | blocked | 8 | 2 | 3 | 0 |
| Endfield | blocked | 8 | 2 | 3 | 0 |

The accepted contextual decisions preserve each site's intentional visual language instead of
misclassifying it as generic "slop." The three blockers in both fixtures are evidence gaps for
operable controls, responsive content integrity, and reduced-motion behavior.

## Packaging and installation

- Repository packages were generated under `dist/`.
- The previously installed skill was backed up before mutation.
- The updated skill was installed to the local Codex skill directory and passed its self-check.

## Known boundary

The evaluator reviews structured implementation evidence. It does not infer interaction,
responsive, or reduced-motion behavior from screenshots alone.

## Publication boundary

Remote publication follows the release-candidate commit.

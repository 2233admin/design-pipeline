## Why

`CI / qa-and-package` runs all 187 test files in one job. `npm test` takes about 10 minutes and the job 12-16 minutes on main (five consecutive successes, 736-960 s). Pull-request pushes that supersede an earlier push kept running to completion.

## What Changes

- `scripts/qa.cjs` accepts `DESIGN_PIPELINE_QA_SHARD=i/n`. Shard 1 runs every repository check, packaging, installed-package smoke and its slice of the test manifest; shards 2..n run only their slice. Unset, QA behaves as before. A malformed value, an index outside `1..n`, or a shard that selects no test file fails instead of falling through to `node --test` auto-discovery.
- `.github/workflows/ci.yml` runs `qa-and-package` as a three-way matrix: specs check, packaging and artifact upload on shard 1, `test:browser` on shard 2. A concurrency group cancels a superseded pull-request run. The QA job timeout drops from 45 to 25 minutes.
- No new gate, receipt, or test file. Every file in `scripts/test-manifest.json` still runs exactly once across the shards.

## Impact

- The single `qa-and-package` check becomes `qa-and-package (1)` to `(3)`; main has no branch protection that names it.
- `windows-path-regressions` is unchanged and still runs on `windows-latest`.

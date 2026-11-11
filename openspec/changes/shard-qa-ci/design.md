## Scope and decisions

Using change: `shard-qa-ci`.

- **Partition**: manifest position modulo `n`, so the union of shards equals the manifest and each file runs once (187 files give 63/62/62 at `n = 3`). Round-robin is a starting point; rebalance from measured per-shard job times if one dominates.
- **Shard 1 owns the non-test checks** (repository files, syntax, CLI envelopes, packaging reproducibility, installed-package smoke) so they run once, not per shard.
- **Empty or malformed shards fail**: `node --test` without paths auto-discovers nested upstream fixtures, which the repository forbids, so an empty slice is reported as a failure and never reaches the runner.
- **Concurrency inside a shard stays at four files**, matching the four-core hosted runner; parallelism comes from more jobs, not more processes per job.

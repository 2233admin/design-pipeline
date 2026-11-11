## 1. QA sharding

- [x] 1.1 Add `DESIGN_PIPELINE_QA_SHARD=i/n` to `scripts/qa.cjs`: shard 1 keeps all checks and its slice, shards 2..n run only their slice; reject malformed values, out-of-range indexes and empty slices.
- [x] 1.2 Verify the partition covers `scripts/test-manifest.json` exactly once (187 files, 63/62/62).

## 2. CI

- [x] 2.1 Make `qa-and-package` a three-way matrix with specs check, packaging and upload on shard 1 and `test:browser` on shard 2.
- [x] 2.2 Add a concurrency group that cancels superseded pull-request runs; lower the QA timeout to 25 minutes.
- [ ] 2.3 Record per-shard job times from the first green run and rebalance the partition if one shard dominates.

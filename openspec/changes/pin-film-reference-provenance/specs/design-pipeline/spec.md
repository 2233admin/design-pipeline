# Design pipeline delta

## Requirement: non-commercial reference provenance
Each non-commercially licensed reference skill that the pipeline studies SHALL have a source record
that pins the canonical repository, revision, content hash and license, marks `codeCopied: false`,
and limits use to ideas. Repository QA SHALL fail when a record is older than its freshness window.

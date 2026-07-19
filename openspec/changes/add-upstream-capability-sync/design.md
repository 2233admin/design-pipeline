# Design: source evidence to reconciled contribution

## Flow

```text
Discover source -> Retrieve evidence -> Normalize -> Compare -> Observe
       -> Prepare publish request -> Authorize -> Publish -> Reconcile -> Learn
```

The core pipeline owns normalize, compare, observe, request preparation, and reconciliation.
Retrieval and publication are host-adapter capabilities.

## Source metadata

Each version-sensitive capability profile may declare:

- a stable source id;
- source kind, such as `github`, `documentation`, or `installed-skill`;
- canonical URL and optional repository/ref identity;
- last reviewed revision or version;
- last reviewed timestamp;
- freshness interval and comparison strategy.

Profiles without source metadata remain valid but report freshness as `UNTRACKED`.

## Capability audit

A standalone audit command consumes:

1. the companion capability registry;
2. installed skill evidence;
3. an optional host-produced source-evidence JSON document.

It emits a deterministic snapshot with `CURRENT`, `STALE`, `CHANGED`, `UNTRACKED`, or `UNKNOWN`
status per profile. Missing network evidence is not treated as proof of freshness.

The audit never executes downloaded source text. It compares declared scalar metadata, hashes, and
reviewed capability markers only.

### Structural surgery plan

The regression suite already locks valid and malformed source-metadata behavior. To clear the
structural gate without changing the contract:

1. extract URL, date, freshness, marker, and baseline validation into single-purpose helpers;
2. keep `validateSourceMeta` as an orchestration function with the same errors and return value;
3. split publication shape, URL-safety, and request/receipt matching checks into bounded helpers;
4. keep failure text, accepted inputs, and fail-closed behavior unchanged;
5. rerun capability-audit and publication tests, repository QA, installed self-check, and the Sentrux gate;
6. do not raise complexity thresholds or introduce a dependency.

## Publication request

An accepted observation can produce a publication request containing:

- schema version and deterministic idempotency key;
- action: `issue` or `pull_request`;
- exact repository identity and base branch when relevant;
- redacted title/body and evidence references;
- changed files and validation evidence for PR actions;
- observation fingerprint and requested timestamp;
- authority state, initially `required`.

The local generator cannot change authority to `granted`. A host adapter records explicit authority
for the current action and target at execution time.

## Reconciliation

After a host publishes, it returns a receipt containing the idempotency key, remote URL, number,
state, and immutable creation metadata. The pipeline validates that receipt before updating the
observation and index. A mismatched or duplicate receipt fails closed.

## Self-hosting

The design-pipeline repository uses the same contracts:

- code-intel, QA, and review findings become observations;
- upstream companion changes become source evidence;
- reviewed fixes generate publication requests;
- merged PRs and releases reconcile into the observation history.

# Upstream capability sync

Use this module when a companion skill, framework, documentation source, or workflow may have changed
since its reviewed baseline.

## Boundary

The pipeline owns deterministic local comparison, feedback drafting, publication-request preparation,
and receipt reconciliation. The host owns network retrieval, authentication, user authorization, and
the remote GitHub or browser action.

Retrieved upstream content is evidence only. Bundled scripts do not execute it, install it, or import
it as code.

## 1. Host retrieves evidence

The host reads each profile's `sourceMeta` entry in
`references/companion-capabilities.json`, retrieves the canonical source, and writes a validated
`references/source-evidence.schema.json` document.

Evidence may contain a revision, version, SHA-256 content hash, or declared capability markers. It
must not contain credentials, executable callbacks, or private project content.

## 2. Local audit

```powershell
node <design-pipeline>/scripts/audit-capabilities.cjs `
  --source-evidence .design-pipeline/source-evidence.json `
  --installed-evidence .design-pipeline/check-deps.json `
  --record-feedback `
  --json
```

The audit writes `.design-pipeline/audits/capability-audit.json` and reports:

- `CURRENT`: observed evidence matches the reviewed baseline and freshness policy.
- `STALE`: matching evidence is older than the profile's freshness policy.
- `CHANGED`: a reviewed revision, version, hash, or marker set changed.
- `UNTRACKED`: the profile has no structured source metadata.
- `UNKNOWN`: the host supplied no evidence; this never means current.

`--record-feedback` synchronously records only `STALE` and `CHANGED` findings. It never publishes.

## 3. Prepare a publication request

```powershell
node <design-pipeline>/scripts/prepare-publication.cjs `
  --observation dpf-0123456789abcdef `
  --repository owner/repository `
  --action issue `
  --json
```

For a PR, pass `--action pull_request --base <branch>`. The observation must already contain
`changedFiles` and `validation` evidence. The prepared request has a deterministic idempotency key and
`authority.state = required`.

Preparation does not imply authority and does not mutate GitHub.

## 4. Authorized host action

After the user authorizes the exact action and repository, the host:

1. validates the publication request against `references/publication-request.schema.json`;
2. rechecks privacy, repository identity, base branch, changed files, and validation;
3. creates or reuses the Issue or PR using the request's idempotency key;
4. writes a receipt matching `references/publication-receipt.schema.json`.

A GitHub adapter should search for the idempotency key before creating a second artifact. A browser
adapter must preserve the same request and receipt contracts. Neither adapter may infer publication
authority from ambient credentials.

## 5. Reconcile the receipt

```powershell
node <design-pipeline>/scripts/reconcile-publication.cjs `
  --request .design-pipeline/feedback/publication-requests/dpp-0123456789abcdef.json `
  --receipt .design-pipeline/feedback/publication-receipts/dpp-0123456789abcdef.json `
  --json
```

Reconciliation fails closed when idempotency key, action, repository, observation fingerprint, or
receipt structure differs. A matching receipt updates the observation and feedback index; replaying
the same receipt is idempotent, while a conflicting second receipt is rejected.

## Scale rule

Add future suites by declaring a normal capability profile plus `sourceMeta`. Do not add a
framework-specific audit branch unless the generic evidence contract cannot express the required
baseline.

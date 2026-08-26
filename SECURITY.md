# Security

Vendored trees under `skill/references/*/upstream/` are inert snapshots. The pipeline
does not install, execute, or ship those package graphs as a runtime. Dependabot alerts
on those manifests are unused; do not bump them in place.

Do not include secrets, tokens, cookies, private credentials, or proprietary data in:

- `state.json`
- `events.jsonl`
- `handoff.md`
- QA evidence
- OpenSpec artifacts
- examples or templates

## Reporting

If you find a security issue, open a private advisory if available or contact the maintainer through the repository's configured security contact.

Do not publish exploit details in a public issue before maintainers have had a chance to respond.


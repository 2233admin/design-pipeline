# Design: snapshot-backed README index

```text
references/shadcnio-react-components/upstream/  exact two-file source snapshot
references/shadcnio-react-components/manifest.json  provenance, counts, integrity
references/shadcnio-react-components.md         pipeline policy and stage routing
scripts/shadcnio-react-components-core.cjs      parser, search, verification
```

The derived index remains in memory: the parser reads the bundled README, so there is no duplicated
component catalog to drift from upstream text. The canonical snapshot hash is SHA-256 over sorted
`relative-path + NUL + file-SHA-256 + newline` records. Verification also checks file and byte
counts, safe paths, source scope, and README category totals.

Search ranks entry IDs, names, and descriptions. Each hit names the local README source and carries
`reference-adaptation`, `review`, and `implementationLicense: unverified`. This preserves the
distinction between MIT-licensed repository metadata and code hosted on linked pages.

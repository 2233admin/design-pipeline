# Design

## Existing integration boundary

Use `design-system-catalog-core.cjs` for v1 validation, normalization and search, the existing `design-system route` command for capability routing, and the current token projection command. KATANA is explicitly selected by snapshot path. The existing provider profile contract is not generalized or bypassed: it currently describes a different MIT/React/StyleX provider.

## Source and generated resources

Initial source: `2233admin/KATANAview`, commit `65f1a5317b7b7217d8ad6c453315cd30e89aee5b`, path `design/katana-console/`.

- `skill/references/katana-console/source/`: exact tracked source files.
- `skill/references/katana-console/manifest.json`: original paths, SHA256, sizes, source commit, original maturity and external dependencies.
- `skill/references/katana-console-design-system-snapshot.json`: existing v1 snapshot.
- `skill/scripts/sync-katana-console.cjs`: explicit-ref importer/generator.
- `skill/scripts/preview-katana-console.cjs`: local read-only preview.

The importer reads Git objects at the specified commit rather than uncommitted working files. It only writes its declared KATANA resource subtree and snapshot. No executable source is evaluated while importing or indexing.

## Maturity and selection

Source declarations such as IMPLEMENTED are preserved as declarations, independently from pipeline verification. Static previews, interactive fixtures and specification-only entries remain distinguishable. Catalog normalization, source hashes, search and routing are tested, but none upgrades a component to FIXTURE VERIFIED or PRODUCTION VERIFIED. Imported component routes use `reference-adaptation` so that the current route resolver cannot incorrectly treat them as ready project implementations.

## Portable preview

Serve only manifest-listed files under the reference source, on loopback. Refuse traversal and access outside the allowlist. Card HTML lacks the Claude host's root tokens; inject the exported token CSS into the HTTP response while preserving original vendored bytes. Existing prototype root tokens remain authoritative. Keep component identity, source, maturity and fixture labels visible. Fonts remain upstream external links with fallback fonts; no remote font or media download is performed.

## Packaging and local use

Register load-bearing scripts and resources in the existing package manifest, and tests in the existing QA manifest. Local installation must preserve unrelated installed resources and record the explicit reference path. Imported source permission is internal-use authorization, not an open-source license; external publication is outside this request.

## Reconciliation

| Specified | Implemented | Evidence or reason |
|---|---|---|
| Versioned source copy and component index | 290 tracked files, 105 component directories, 104 READMEs | Cover has no README; that absence is recorded. Every imported file retains its original bytes and hash. |
| Preserve semantic tokens | 63 Paper/Console color tokens and other token categories; 19 aliases resolved for projection | Original `tokens.json` is unchanged. The existing token projection validates the generated index. |
| Preview outside the Claude host | A loopback allowlisted server supplies missing host tokens in card responses | Browser inspection confirms DOMLadder renders and its settings open. Standalone prototypes retain their own root tokens. |
| Explicit snapshot selection | Read-only commands use the installed skill directory as `--root` | The CLI contains snapshot paths within its root. Other projects read the reference through that scope without weakening containment. |
| Internal source permission | `LicenseRef-User-Authorized-Internal-Reuse` | The source declares no open-source license. This change is activated locally without public redistribution. |

Validation: all seven importer/catalog tests and all four preview tests pass. Required `node scripts/qa.cjs` finishes with exit code 0, including package and isolated installation checks and byte-identical repository status. Browser inspection confirms the DOM card and settings render while FIXTURE and locked trading labels remain visible. These results validate import and preview behavior; they do not independently accept every upstream component.

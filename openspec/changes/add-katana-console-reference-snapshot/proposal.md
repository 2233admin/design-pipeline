# Add the KATANA Console reference snapshot

## Why

The user wants their KATANA Console design system to be reusable from design-pipeline. Its tokens, rules, 105 component directories, 104 component specifications and previews currently live in a separate repository and Claude artifact. The pipeline already has a versioned snapshot, catalog, search and routing contract; a copied folder alone does not make this knowledge discoverable or make the previews portable.

## What changes

- Import tracked `design/katana-console/` files from an explicit KATANAview Git commit, preserving original bytes and recording file hashes and source identity.
- Generate a `katana-console` snapshot using the existing `design-pipeline.design-system-snapshot.v1` contract, with searchable component descriptions, foundations and tokens.
- Preserve source maturity and verification limitations. Reference routing requires adaptation and review; it does not declare production or conformance acceptance.
- Add a loopback preview that supplies the missing Claude host tokens without changing imported files.
- Document repeatable import, search, token projection, routing and preview commands, and install the validated reference resources for local use.

## Scope and permission

The user explicitly authorized copying their design system for internal reuse. The source commit has no repository open-source license. Imported content is recorded as `LicenseRef-User-Authorized-Internal-Reuse`, with upstream authorship and dependency notices preserved. This change does not relicense the content as MIT or GPL and does not authorize publishing a redistributable upstream package.

## Impact

This extends the existing snapshot lifecycle. Astryx and project-owned design choices remain governed by their existing selection rules. No application backend, account state, credentials, node_modules, host configuration or Claude session state is imported. Component conformance and visual acceptance remain separate from import validation.

# Design: Hermetic Interface-Discipline Source

## Source Boundary

The vendored snapshot is passive Markdown/YAML/reference material under
`skill/references/interface-discipline/upstream/`. It is not an executable dependency, not an
optional companion, and not a replacement for project-local implementation conventions.

`manifest.json` binds the package to the repository, revision, MIT license, declared import scope,
file count, and a canonical SHA-256 over sorted `relative-path + NUL + file-sha256 + newline`
records. The test recomputes that fingerprint from the vendored tree.

## Pipeline Boundary

`interface-discipline.md` maps the upstream router and seven specialized skills to Stage 0, Stage
3, Stage 4/5, and Stage 6. It keeps the upstream files authoritative for detailed rules while the
pipeline owns artifact placement, actual-UI evidence, and finding classification in `qa.md`.

The integration does not add a runtime package, a network fetch, an installation check, or a second
machine-readable companion registry. The existing companion registry remains only for optional,
version-sensitive companion capabilities.

## Verification

The focused test checks origin metadata, exact skills, source fingerprint, license, and pipeline
linkage. The existing package-resource and release tests prove the manifest and protocol ship in
the packed artifact.

# Design: DeepCloneWebsite Reference Integration

## Source Boundary

The source snapshot contains the upstream LICENSE, Chinese README, package manifest, i18n module,
all `lib/crawl` modules, all `app/api/crawl` routes, and `app/site-clone/page.tsx`. This is the
complete feature slice identified by the upstream project without the 371-file Open Lovable host
application. Files are inert and line endings are normalized to LF for cross-platform hashing.

## Pipeline Boundary

`deepclonewebsite.md` maps the reviewed mechanics into the existing website-cloning module. The
pipeline keeps its current URL-first initializer and Browser/Builder/Evidence ports; the reference
adds site-wide capture decisions and artifact expectations without adding a runtime dependency or
new CLI abstraction.

The local protocol intentionally strengthens upstream behavior: errors remain visible, retries are
classified and finite, hosts are explicitly authorized, scriptless snapshots are not called
interactive, and inferred product/backend documents are labeled hypotheses.

## Verification

The focused test recomputes the normalized tree hash and byte count, verifies required source
files and package resources, and checks linkage from the main website-cloning protocol and skill.
Normal package and release tests prove the snapshot ships in the installed artifact.

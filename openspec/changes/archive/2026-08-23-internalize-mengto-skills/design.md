# Design: byte-preserved source plus pipeline overlay

## Shape

```text
references/mengto-skills.md                  pipeline policy
references/kage-scroll-world.md              clean-room Kage delta and source boundary
references/mengto-skills/manifest.json       provenance, integrity, catalog, routing metadata
references/mengto-skills/upstream/**          exact reviewed upstream tree
scripts/mengto-skills-core.cjs               local validation and search
scripts/import-mengto-skills.cjs              maintainer-only atomic importer
```

The upstream tree is read from Git blobs rather than platform-filtered checkout files, so provenance
and later comparison stay trustworthy. The
manifest is generated from Git-tracked files and provides the only derived inventory. Pipeline
adaptation lives in the overlay, CLI, OpenSpec requirement, and QA—not inside copied skills.

The independent `MengTo/kage` repository is not part of the snapshot and grants no license for its
original code or artwork. Its current responsive fixes are captured only as paraphrased failure
modes and verification rules in `kage-scroll-world.md`; the source, assets, and provenance stay
separate.

## Routing

`mengto search` ranks name, description, category, and pipeline-stage text. Design-related skills
are automatic candidates. Account-bound, publication, voice, social, profiling, TTS, and recording
workflows are retained but explicit-only.

## Integrity

The canonical hash is SHA-256 over sorted `relative-path + NUL + file-SHA-256 + newline` entries.
Verification also checks byte count, skill count, upstream executable-mode metadata, safe paths,
unique IDs, and an exact match between discovered and declared `SKILL.md` files. Any partial copy or
byte drift blocks verification.

## Spec Reconciliation

| Value | Specified | Implemented | Cause |
| --- | --- | --- | --- |
| Upstream count | Complete tracked repository | Generated from Git rather than README | Upstream README reports 123 while the reviewed tree contains 127 `SKILL.md` files. |

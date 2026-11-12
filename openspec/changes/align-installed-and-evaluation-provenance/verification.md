# Provenance correction record

Date: 2026-10-14. This is a new record for issue #76, not a rewrite of a frozen experiment. It distinguishes identity observations/documentary corrections from pending integrated-runtime verification.

## Observed in this documentation slice

- Read the complete issue #76 body, GitHub stable/prerelease release metadata and historical partial-sync verification at baseline `3661adedccce7678336c719f485d9685a71f7158`.
- Assigned worktree initially clean; `git rev-parse HEAD HEAD:skill` returned commit `18a688abb4ded14b8a8c4f47cf805255ca9a992f` and skill Git tree `708898d57212c08088516952f4cae44bbc955468`. Tag commits/skill trees and API asset digests are retained in [the maintained guide](../../../docs/installation-and-evaluation-provenance.md).
- Read existing packager/installer source: full `skill/` archive plus generated resources; copied staged installation rejects links and runs `doctor` before promotion. No second version resolver, schema, receipt or runtime gate was added.
- Read-only link/realpath inspection found the live user skill resolves to original `<developer-checkout>/skill`. Original HEAD was `6e3b695f4cb540b7e6bfef4fe3f311ffe9c1ce32`; staged/unstaged/untracked differences were present. Sorted path/file-SHA-256 inventory observed 3,423 files, aggregate `e4ef2774eee1a0ed649d6584b07474c63954c0196ccfbba391c8d0c05ac3c02b`. Convention and example preserved differences are in the guide. This mutable copy is development/unverified; earlier audit reported unrelated-resource doctor failures. No rerun or modification of the junction/source was performed.
- Read historical model-evaluation records with V3/V3q and 2026-10-06 pilot snapshot digests, dirty source lineage, rejected badge visuals and absent new-run claims. Read 2026-10-08 frozen CSS/page-answer source lineage and deterministic regression limits. Available Git objects were resolved; ignored raw evidence was not reachable here. Recorded historical snapshot hashes were not freshly recomputed.
- Read all three later-round `case.json` owner approval blocks: MAD, UI promo, explainer each `accept` by user on 2026-09-29, tied to the exact reviewed render SHA-256. Only the stale later-round checkbox was corrected, with links to those unchanged records. No render, model call or new owner verdict was produced.
- Wrote the maintained provenance guide and standalone installed-consumer installation instructions selecting a full copied project-scoped publication snapshot. Historical experiment logs/assets, the original working tree and developer junction were left untouched. Issues #65 and #71–#75 remain open.

The identity reads above are observational commands, not build/test/installation verification. Release digests were read from GitHub metadata; release archives were not downloaded in this slice. The reproduction commands are documented, not exercised here.

## Pending integration-owner record

Append actual new evidence here after both implementation slices land. Do not fill these values from the baseline or a historical release:

| Required evidence | Current status |
| --- | --- |
| Final integrated source commit and skill Git tree | Pending integration freeze |
| Final source entry/runtime/manifest file identities | Pending integration freeze |
| Candidate package version, source snapshot digest, tgz/zip/checksum digests and generated `PACKAGE.json` | Pending final package |
| Full extracted versus copied installed file inventories/digests and path/realpath/link status | Pending project-scoped copied installation |
| Installer result, installed `doctor`, installed `check-deps`, affected public CLI/web smoke stdout/stderr and exit codes | Pending final technical exercise |
| Targeted affected regression, strict OpenSpec, repository QA and required CI | Pending integration-owner validation |
| Preserved original local differences and live junction | Preserved by this slice; integration owner must retain them |
| New model benefit experiment | Not performed or claimed |
| Owner Visual Acceptance of new work | Not recorded or claimed |

Use [the reproducible procedure](../../../docs/installation-and-evaluation-provenance.md#reproduce-the-selected-snapshotpackageinstall-strategy) against a clean, verified integrated commit. Candidate-package technical conformance is not a new publication, model experiment or creative acceptance. Parent owns GitHub updates, final validation, publication and closure; no commits, pushes, active installs or issue writes were made by this slice.

# Taste-Skill internalization verification

Verified on 2026-10-08 using Windows, Node.js 26.3.1 and npm 12.2.0.
Implementation commit: `a64d7b1a5399dff1e75b23efbcb8e0d77cb8316a`.
Tested Git tree: `4fa83b3a96de781846f0f853136b59437ca6357d`.
The following closeout changes only this verification record and task checkboxes.

## Source and capability coverage

- Reviewed upstream: `Leonxlnx/taste-skill` at
  `b482f7a970abb98c4108d4a9f761e458c64cefc8`, MIT, copyright 2026 Leonxlnx.
- Complete source: 62 files, 4,824,721 bytes, thirteen original skill entries;
  Git tree `2589404b7fd08979aafbeb8074d4bc416fe428a3`.
- Canonical source SHA-256:
  `5c05edf236140ec2152a02c95f079911ce4636dd1b15089ad9292be9d0b5a40a`.
  All 62 staged Git blob identities and modes matched upstream, including assets and research.
- All thirteen source entries were read and mapped to triggers, outputs, existing stages,
  project adaptations and checks in `skill/references/taste-skill.md`.
- The existing skill, frontend, redesign, brand, image and tool routes reach the local guide.
  `visual-direction-review` now checks the built-in entry; no external Taste installation
  is required. All 64 new load-bearing resources are registered.
- V2 remains explicitly experimental; v1 remains selectable. Project/user references,
  accessibility, CJK, existing stack, motion and evidence contracts govern adaptation.
  Image-only methods require a host image provider. Stitch's example is translated into
  the existing Google-format project foundation, not copied as approved design.

## Checks performed

| Check | Result |
| --- | --- |
| Taste focused tests | 6/6 passed |
| Existing check-deps tests | 13/13 passed |
| `npm run sources:check` | 45/45 passed, zero skipped |
| `npm run specs:check` | 52/52 passed |
| `npm test` repository suite | 1,042/1,042 passed in 111 files, zero failed/skipped |
| Real packaged installation public CLI smoke | 12/12 passed |
| Browser adapter and BuilderPort self-tests | Both passed |
| TGZ, ZIP and checksum reproducibility | Passed |
| Archive resource presence, isolated install/replacement and installed dependency checks | Passed |
| QA working-tree preservation | Repository status byte-identical before/after |
| Original-workspace Taste tests after transfer | 6/6 passed |

The importer reused the existing Git snapshot helper and atomic replacement pattern.
An actual clean-source import succeeded. Automated checks reject an unreviewed commit
with the correct source tree, dirty content, incorrect license, an incomplete source and
an invalid date while preserving previous output. A separate owned temporary experiment
injected a publish-rename failure and confirmed restoration of the previous snapshot.
That last fault is a manual verification, not an additional automated test case.

The first focused run exposed a test-runner issue: nested `node --test` inherited
`NODE_TEST_CONTEXT` and skipped execution. The test now clears that child environment
entry and requires an actual one-test passing baseline before changing, removing or adding
a source blob. All three corruptions then cause the actual source check to fail.

Independent read-only review found no blocking integration issue. It checked all thirteen
entries, local source links, consumer links/anchors, profile markers, removed external
install hints and the test-runner correction. Static checks establish availability and
integrity; they do not establish that a model follows every design instruction.

## Evidence and preservation

Local logs remain in ignored `.design-pipeline/`:

- `taste-skill-focused.log`: SHA-256
  `4ae65abdef132edb0a059190139d3a5702ec5885f206f1fd0e89fc06f690e90c`.
- `taste-skill-sources.log`: SHA-256
  `e87a6ca0564ae9f75570061659cec3326a5640bbc7570a0c42e841f241d7e2e7`.
- `taste-skill-specs.log`: SHA-256
  `99c2fef0a6ffc70c9e0c40d2ed9d878e7703a2877884b86ffdad07295a89e0e1`.
- `taste-skill-npm-test.log`: SHA-256
  `daac89152bdd58daf5d960a58c09a2ca35b03c3aae65a89700a45845a85d8467`.

Work was isolated on `codex/internalize-taste-skill`, based on the verified Good CSS
commit `7b83274771081e243ef75c90893660c7a21f334f`. Only this change's 90 implementation
paths were transferred to the original workspace. A conflicting SKILL insertion retained
its existing frontend-redesign entry; removing the five inserted Taste lines recovers the
original file byte-for-byte. Hashes confirm 247 unrelated dirty/untracked files were
unchanged. The original branch and index were preserved. Transfer records and the
post-transfer focused log remain in that workspace's ignored `.design-pipeline/`.

The configured Multica CLI returned a temporary server error when listing projects.
Authorized work continued with scope, provenance and evidence recorded in this change
and the dedicated branch; no substitute remote tracker was created.

## Acceptance and limits

- Component Conformance: no downstream UI target was evaluated; package/source checks passed.
- Visual Acceptance: unclaimed. No generated concepts, implemented design or owner visual
  approval was part of this integration task.
- No image provider/model, upstream installer, plugin or sponsor script was executed.
  Existing host skill installations were left intact.
- GitHub/Linux CI and Safari/Firefox were not run. Full QA applies to the isolated
  implementation commit above; unrelated original-workspace changes were not included
  in that full run. The branch has not been merged into the default branch.

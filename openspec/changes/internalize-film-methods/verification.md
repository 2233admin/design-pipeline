# Film methods delivery verification

## Frozen implementation and scope

Implementation commit: `5c6bb65302a6d12f6251eb451527b5db76847801`.
Tested Git tree: `2a2e0c74de9b45a2986970377922935878cd7085`.
Date: 2026-10-09, native Windows PowerShell, Node 26.3.1.
All implementation and evidence work used the existing release worktree on
`codex/internalize-taste-skill`. The dirty original project checkout was not edited.
Subsequent delivery records change only OpenSpec documents; the implementation remains frozen.

This change imports the entire reviewed Cinetic tree (137 files at
`bee5d7807205d5543472c38312507f9bf366cbbf`) and product-film-skill tree (30 files at
`fe11efc429d5903e37274d0b294e1b95745b2881`). Original blob bytes, modes, Git identities,
hashes and MIT licenses are preserved. It adds bounded `film methods` preparation and a
maintained caller-fps motion adapter, not an execution promise for every upstream script.
The full method mapping and source-only/maintained boundaries are in
`skill/references/film-methods.md`. Prompt Motion attribution and page-observation limits
are in `skill/references/prompt-motion.md`.

## Checks actually performed

| Check | Result | Local evidence under `.design-pipeline/film-methods/` |
| --- | --- | --- |
| Locked workspace install | `npm ci` passed; no dependencies or allowScripts policy changed | `npm-ci.log` |
| Source suite | 52/52 passed, including seven new film-source checks | `source-suite.log` |
| Method and existing film-project focused checks | 17/17 passed | Focused output, also included in full QA |
| Browser film eval regression | 2/2 passed; actual timeline/easing/return and non-static pixels | Film eval output, also included in full QA |
| Strict OpenSpec validation | 56/56 passed | `specs-final.log` |
| Frozen-tree repository QA, final run | 1,080/1,080 passed, zero skipped | `full-qa-retry.log` |
| Installed-package public CLI | 12/12 passed, zero skipped | `full-qa-retry.log` |
| Browser-tool self-tests | Both prewalk adapter and BuilderPort passed | `full-qa-retry.log` |
| Repository mutation check | QA left Git status byte-identical | `full-qa-retry.log` |
| Actual package and ZIP extraction | TGZ/ZIP creation, ZIP extraction and isolated install passed | `package/`, `package.log`, `zip/`, `isolated-skills/` |
| Relocated installed methods | Both locked sources selected, four files written, Node adapter invoked at 24fps | `relocated-install.json`, `relocated-project/` |

The first full QA run is retained in `full-qa.log`: 1,079 passed, one failed, zero skipped.
The failed FontTools fixture was caused by using the Python executable from an ephemeral
`uv run` environment that had already been removed. It was not counted as a passing run.
A persistent isolated environment under the ignored evidence directory was created with
FontTools 4.66.1; the focused font-subset check passed and the entire unchanged implementation
was rerun successfully. No global Python environment or committed machine path was changed.

The source suite reconstructs original pinned Git commits offline and exercises dirty, wrong,
missing and malformed import rejection without replacing the previous snapshot. It also
compares all 167 new source blobs byte-for-byte after extraction from the actual release TGZ.
Windows system tar failed to extract preexisting Huashu Chinese paths from the whole archive;
that diagnostic remains in `source-tar-failure.log`. The new ASCII vendor trees passed that tar
extraction; full ZIP extraction and the existing QA's full JavaScript TGZ extraction passed.
This is not a claim that Windows system tar handles every package path.

Independent implementation review found and fixed the output-parent-file preflight and
non-finite spring-parameter boundaries. Their rejection tests passed. A final read-only review
of this increment found no remaining high-confidence blocking defect; it did not re-review the
entire earlier PR or watch the rendered videos continuously.

## Rendered evidence and acceptance

Actual successful evidence: `.design-pipeline/film-methods-eval-d8ZGyL/`.
The six-second product demo and four-second loop use the unchanged real evaluation form,
computed tokens and its actual input/toggle/save handlers. Both rendered at 1920×1080/30fps
through existing HyperFrames and passed existing storyboard, timeline, render, composition
and film checks. See [film execution QA](qa.md) for hashes, selected methods, observations,
failed attempts, pixel thresholds and warnings.

The QA worker inspected ordered decoded first/middle/last frames. The primary independently
inspected the saved promo's final frame and the loop's decoded first/middle/last frames with
`view_image`. The loop visibly returns on → off → on; measured rendered seam difference was
0.034192%, while both middles were non-static. These are technical and bounded frame observations.
Film technical checks passed; formal **Component Conformance is not assessed** and
**Visual Acceptance is not assessed**. Neither these checks nor the independent review grant
user creative approval.

No uninterrupted full-speed playback or audio listening is claimed. Both examples are silent.
The existing `dead-band`/`no-focal-point` warnings and Windows font-mapping limitation remain
documented. Prompt Motion pages and repository links were read; their embedded videos and
audio were not observed. Cinetic shell workflows/WSL, Python/Bun/TS/TSX tools, Product Film's
Remotion kit, cloud providers, generated music and alternate export targets remain unexecuted.

## Canonical installation

Before replacement, the canonical `.codex/skills/design-pipeline` installation contained
2,831 files identical to the prior release commit `74ab0a3cf1d6cb5b59eb5c6854e0524f9ba98c86`,
with no modifications or extras. All files were backed up to the ignored
`.design-pipeline/film-methods/canonical-backup-8A6ado/`; immediately before replacement both
the live baseline and backup hashes were checked again. Evidence: `install-before.json` and
`install-backup.json`.

The existing transactional `scripts/install-local.cjs --replace` synchronized the canonical
installation. All **3,004 files** then matched the release `skill/` bytes, with zero modifications
and zero extras (`install-after.json`). Its installed CLI doctor passed (`canonical-doctor.json`).
Its public `film methods` invocation successfully selected both locked revisions against the
relocated real component project, returned the documented `planned` status with no writes,
and retained `creativeAcceptance: not-assessed` (`canonical-methods.json`).

The existing independent `.agents/skills/design-pipeline` compatibility directory was
preserved. Same-name discovery ambiguity remains; this delivery does not claim all agent hosts
choose the canonical copy. The original dirty repository and unrelated local installations
were not overwritten.

## Publication and tracking

Target remains [PR #85](https://github.com/2233admin/design-pipeline/pull/85), base `main`,
branch `codex/internalize-taste-skill`; no merge is authorized. The final PR description records
the complete branch scope and the exact-head CI result after publication.

Multica was retried at closeout against the canonical project and still returned service
unavailable/server error. No substitute issue tracker was created; scope, implementation,
failures and delivery evidence remain in this change and PR for deduplicated reconciliation
when the service recovers. Code Intel's graph-size/bootstrap limitation prevented its use;
bounded source inspection and independent review were used instead.

# Practice round 1 design

## Scope and decisions

Reuse the existing workflow state and public `next`/`decide` seams. Intake completion comes from `decisions.intake`, never an incidental file. Before writing `brief.md`, inspect case-insensitive root-name collisions and refuse any file the intake did not write, with a recovery instruction. New intake decisions store `{ answer, briefSha256 }` in the existing decisions container; a matching regular-file digest authorizes re-recording. Legacy truthy intake decisions remain complete but do not grant overwrite ownership. Preserve user bytes and state on refusal; handle film/edit/UI shared intake too. No parallel ownership schema is introduced.

Every executable workflow action and record template must carry the selected absolute root with existing `shellPath` quoting. Bind `--root` as well as absolute `--project-root` where used: the CLI otherwise contains project selection within the shell cwd. Audit contained inputs, attached resample arguments, scaffold/runtime handoffs and recorded repair instructions as well as `decide`; the executable CLI path alone does not bind the project. Execute returned actions from an unrelated temporary working directory with project paths containing spaces. No CLI flags are added.

Web concepts must differ in first-screen layout skeleton, focal element, type position and image role, not just colour/copy. Cards declare their skeleton in one line. The agent renders equal-size first screens, combines a contact sheet, rejects same-skeleton/common-template/collapsed-hierarchy cards and revises before asking. Action text and guides express the same obligation. This is method guidance, not a new gate or proof of Visual Acceptance.

Reference layout study measures the native reference ratio before separate adaptation. Record subject position/scale, the text lockup's actual scene region and minimum lockup–subject distance/no-overlap together. Size matching cannot break reading order or legibility, empty the scene or displace the subject. Same-size thumbnail screening and visual judgement govern presentation; metrics support but cannot replace them.

## Ownership and integration

- Runtime worker: A/B workflow runtime and focused public-command regressions; owns shared helpers and command tests. Leave web concepts prose unchanged for parent integration.
- Method worker: C/D existing reference guides and applicable intake documentation. No runtime or test edits.
- Parent: OpenSpec, C web action text and its required regression, integrated smoke/QA, commit and final report.

Workers do not run full QA, formatters or validation mid-flight. Required focused fail-before/pass-after regressions are an explicit exception; record exact command/outcome evidence for tasks.md.

## Compatibility and migration

No artifact paths, schemas, gates or receipt formats change. Existing projects with an intake decision remain complete. A brief alone no longer skips intake; move/rename a user-owned collision before recording. Returned commands remain public CLI commands but become independent of shell cwd. Existing rejection, snapshot and downstream lineage remain intact. Agent pre-screening never records owner approval.

## Verification

Each runtime fix and action-text change gets a focused failing-before/passing-after regression at existing public seams. Review C/D against the six supplied evidence documents. Parent exercises the CLI from an unrelated cwd, then runs `npm test` with the requested local `FONTTOOLS_PYTHON` environment, the pinned strict change validation and `npm run specs:check`. Keep machine-specific paths and local logs out of committed documents. Commit on the current branch without pushing; the original worktree is read-only except the explicitly requested practice report.

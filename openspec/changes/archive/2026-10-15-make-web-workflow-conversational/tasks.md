## 1. Change records

- [x] 1.1 Write proposal.md, design.md and the `design-pipeline` and `web-workflow` spec deltas; the
  delta MODIFIES `two human decisions`, `single next step` and the component decision requirement
  instead of adding a parallel workflow.
- [x] 1.2 `npm exec -- openspec validate make-web-workflow-conversational --strict` is valid and
  `npm run specs:check` passes (75 passed, 0 failed). The validator's INFO lines come from the
  archive order in 1.3.
- [x] 1.3 Archive after redesign-user-workflow, consolidate-component-index-and-web-sources,
  let-agents-discover-open-source-resources and add-web-treatment-and-section-briefs (in that
  order); this delta MODIFIES requirements they add.
- [x] 1.4 Moved to `owner-attention-asks` (RENAMED delta, to `Owner decision points per deliverable`) when this change was archived. Original: after the archive chain lands, RENAME the `two human decisions` header to one that names
  the web checkpoints.

## 2. Workflow behaviour

- [x] 2.1 `workflows/web.cjs`: conversational `intake` (skip line, one open question, confirm, correct,
  stated skip), quick stated-decision `intake`, variants `concepts` with findings, grilling `components`
  round, `description` gate, section-by-section `build`, and the new stage lists.
- [x] 2.2 `workflows/web.cjs` decide records for intake, concept, description and section, each
  rejection appended to `state.rules`; `workflow-core.cjs` routes web stages to them, refuses
  `description`/`section` outside web and routes section asks to an art director. Variant picks and
  rejections are refused until the owner has been shown the variants page.
- [x] 2.3 Web final review states final acceptance; `cli-core.cjs` help names the new stages and
  passes repeatable `--evidence` to decide (no new flag; 7.5 later adds the repeatable `--anti-goal`).
- [x] 2.4 `skill/tools/variant-switcher/` switcher and guide; build stays unfinished while
  `index.html` ships the switcher.

## 3. Guides and packaging

- [x] 3.1 `workflow-web.md` (stage order, intake, concepts, components, new `description`, build,
  review), `web-direction.md`, `stages.md`, `pipeline-reference.md` and the tools index describe the
  new flow; stale four-question intake and web "immediately before build" wording is gone.
- [x] 3.2 `package-resources.json` lists the switcher files; CHANGELOG `[Unreleased]` records the
  change.

## 4. Tests

- [x] 4.1 The flow and switcher tests live in existing suites (7.11), each run alone with TEMP/TMP
  on D: at 39cc1da: `workflow-next` 111/111 (intake, description, sections, lineage, rules and
  earlier records), `web-concept-screening` 16/16 (concepts, the switcher in real Chrome,
  every shipped form), `workflow-components` 67/67, `workflow-action-commands` 30 pass + 1 platform
  skip, `interaction-audit` 15/15, `reference-analysis-entry` 6/6, `runtime-review` 21/21,
  `designer-pipeline-cli` 12/12.
- [x] 4.2 Existing web tests walk through the shared `tests/helpers/web-flow.cjs`, whose description
  now carries a `## Sections` list; wording pins became behaviour assertions.

## 5. Verification

- [x] 5.1 `npm test` at de9b593 with TEMP/TMP on D: (local Windows): repository tests 1457, pass
  1450, fail 3, skipped 4. All three failures are the known Windows `EPERM ... rename` flake in
  website-clone and palette temp directories (files this change does not touch; an earlier run failed
  one different test the same way). "QA leaves repository status byte-identical" and the
  installed-package smoke passed. QA failed, so the chained browser self-tests did not run locally;
  CI is the authority (5.3).
- [x] 5.2 Real CLI smoke in scratch projects on D: (outside the repository), walking the standard
  flow to `done` with a real `verify interaction` in Chrome, plus the quick and standard skip paths.
  Transcript (commands as run with `--root <project> --project-root <project> --json`; long lines
  cut). It predates the PR #102 review fixes (section 7), so it shows the earlier texts and refusals:

```text
## standard web
$ designer-pipeline next --deliverable web --tier standard
  exit 0 stage=intake type=ask
  line: web/standard: intake (1/9) - If you'd rather skip the questions and have me start, say so. Is there a site you saw recently that felt exactly like this one should? What about it?
$ designer-pipeline decide --stage intake --verdict reject --answer "It is for team leads choosing a plan, not for developers"
  exit 0 status=recorded next=intake/ask
$ designer-pipeline next
  exit 0 stage=intake type=ask rules=1
  line: ... The owner corrected the playback ("It is for team leads choosing a plan, not for developers"); each correction is now a project rule. Play it back again with the corrections applied, then ask: What is wrong or m…
$ designer-pipeline decide --stage intake --answer default
  exit 1 CONTRACT_INVALID: workflow: web intake records the confirmed playback (--verdict accept ...), a correction (--verdict reject ...) or a stated skip (--choice skip ...)
$ designer-pipeline decide --stage intake --verdict accept --answer "A pricing page for team leads choosing a plan (you said). ... My guess: plans first, usage proof second, contact last."
  exit 0 status=recorded next=reference/run
$ designer-pipeline decide --stage reference --answer none
  exit 0 status=recorded next=concepts/run
# write concepts.md; write concepts.html (three data-variant first screens + inlined tools/variant-switcher)
$ designer-pipeline next
  exit 0 stage=concepts type=ask rules=1
  line: ... Open concepts.html and flip through A, B and C with the arrows or the ← → keys. Which first screen should I build, or what should I combine from them (for example B's header with C's layout)?
$ designer-pipeline decide --stage concept --verdict reject --answer "A looks like every SaaS template"
  exit 0 status=recorded next=concepts/ask
$ designer-pipeline next
  exit 0 stage=concepts type=ask rules=2
  line: ... The owner rejected these variants ("A looks like every SaaS template"); the reason is now a project rule. Redo what it rules out in concepts.html and pre-screen again, then ask: ...
# write concepts.html (A redone)
$ designer-pipeline decide --stage concept --choice B,C --answer "B's plan header with C's grid"
  exit 0 status=recorded next=components/ask
$ designer-pipeline next
  exit 0 stage=components type=ask questions=sections,components rules=2
  line: ... These decisions are ready now, each with my recommendation. Which would you change?
$ designer-pipeline decide --stage components --choice scratch --answer "Write them from scratch"
  exit 0 status=recorded next=description/run
# write brief.md (one-page description naming hero, plans, contact)
$ designer-pipeline next
  exit 0 stage=description type=ask rules=2
$ designer-pipeline decide --stage section --choice hero --verdict accept
  exit 1 WORKFLOW_NOT_READY: workflow: no section can be reviewed until the owner approves the current description. Fix: follow next
$ designer-pipeline decide --stage description --verdict reject --answer "Say plainly that there is no sales call"
  exit 0 status=recorded next=description/ask
# write brief.md (revised)
$ designer-pipeline decide --stage description --verdict accept --choice hero,plans,contact
  exit 0 status=recorded next=build/run/hero
# write component-manifest.json (scratch); write index.html (first screen only: hero)
$ designer-pipeline next
  exit 0 stage=build type=ask section=hero rules=3
  line: ... The hero section is built (1 of 3). Look at it in the page and point at anything that is wrong. Accept it as it is, or tell me what to change?
$ designer-pipeline decide --stage section --choice plans --verdict accept
  exit 1 WORKFLOW_NOT_READY: workflow: section plans is not built: index.html has no data-section="plans". Fix: follow next
$ designer-pipeline decide --stage section --choice hero --verdict reject --answer "Start trial must read as the one main action"
  exit 0 status=recorded next=build/ask/hero
$ designer-pipeline next
  exit 0 stage=build type=ask section=hero rules=4
  line: ... The owner asked for changes to section hero ("Start trial must read as the one main action"); each comment is now a project rule. Revise the section, then ask: ...
# write index.html (hero revised)
$ designer-pipeline decide --stage section --choice hero --verdict accept
  exit 0 status=recorded next=build/run/plans
# write index.html (plans added)
$ designer-pipeline decide --stage section --choice plans --verdict accept
  exit 0 status=recorded next=build/run/contact
# write index.html (contact added: the full page)
$ designer-pipeline decide --stage section --choice contact --verdict accept
  exit 0 status=recorded next=probe/run
# write interaction.json (audit probe)
$ designer-pipeline verify interaction --probe interaction.json --chrome <chrome-headless-shell> --puppeteer-module <worktree>/node_modules/puppeteer-core
  exit 0 status=passed
$ designer-pipeline next
  exit 0 stage=review type=ask rules=4
  line: web/standard: review (8/9) - Inspect the checked page and its key interactions. Accept it, or reject it with one sentence on what is wrong?
$ designer-pipeline decide --stage review --verdict accept
  exit 0 status=recorded next=deliver/run
$ designer-pipeline decide --stage deliver --answer index.html
$ designer-pipeline next
  exit 0 stage=done type=done
  state.json `rules` (shown as `from: text`): ["playback 1: It is for team leads choosing a plan, not for developers","variants 1: A looks like every SaaS template","description 1: Say plainly that there is no sales call","section hero 1: Start trial must read as the one main action"]

## quick web
$ designer-pipeline next --deliverable web --tier quick
  exit 0 stage=intake type=run
$ designer-pipeline decide --stage intake --choice skip --answer "just start"
  exit 1 CONTRACT_INVALID: workflow: --answer must state in one line what you decided on the owner's behalf; a bare go-ahead is a silent default
$ designer-pipeline decide --stage intake --choice skip
  exit 1 CONTRACT_INVALID: (same)
$ designer-pipeline decide --stage intake --choice skip --answer "Building one pricing card in the site's existing type and colours, from the project's own components."
  exit 0 status=recorded next=components/ask

## standard web, owner says "just start"
$ designer-pipeline decide --stage intake --choice skip --answer "默认"
  exit 1 CONTRACT_INVALID: workflow: --answer must state in one line what you decided on the owner's behalf; a bare go-ahead is a silent default
$ designer-pipeline decide --stage intake --choice skip --answer "I decided: a calm one-page pricing site for team leads, three plans, trial first, no sales call."
  exit 0 status=recorded next=reference/run
```

- [x] 5.3 Pushed `feat/conversational-web-flow` and opened PR #102. CI run 38391510746 on a258b56:
  `qa-and-package` and `windows-path-regressions` both succeeded, with no rerun. Review fixes
  4fe5369, 2079568, 39cc1da, 8b33d52 and de9b593: CI run 38404533542 on de9b593, both jobs
  succeeded on attempt 1. Cutover and `--anti-goal` placeholder (7.14, 7.15) ac9ef50 and eb02366:
  CI run 38408102382 on eb02366, both jobs succeeded on attempt 1.

## 6. Planned follow-up

- [x] 6.1 Superseded by `design-owner-attention` phase 3 (page review lite: an overlay injected when the pipeline serves the page). The original note: follow-up change (owner-approved, not in this PR): extend runtime-review with clickable
  element regions on a captured section screenshot; the click produces the Feedback that section
  verdicts cite with --evidence.

## 7. PR #102 review fixes

- [x] 7.1 The variant switcher forces hidden variants out of the layout, so a page's own `display`
  rules cannot show them.
- [x] 7.2 Build rejects a shipped switcher in any form: `data-variant` panels, switcher markup or
  inline script, a `<script src>` that names it, or a local script file that carries it.
- [x] 7.3 `brief.md` carries a `## Sections` list that the description approval must match exactly,
  and an approval can be recorded again to correct it.
- [x] 7.4 The description no longer copies the project rules, so a rule recorded mid-build needs no
  brief edit and does not reset accepted sections.
- [x] 7.5 Decision-round corrections and the anti-goals of a confirmed playback or a skip (the new
  repeatable `--anti-goal`) become project rules.
- [x] 7.6 A minimum-content rule replaces the go-ahead word list: six words for a stated decision and
  three for every "no".
- [x] 7.7 Section and variant markers inside HTML comments no longer count.
- [x] 7.8 Prompt texts: the opening asks one question with no `first`, `first` is always a step for
  the agent, build steps are whole sentences, and no prompt claims element picking (point 8, step 1).
- [x] 7.9 The component sources are offered as plain-language options, and the ids stay in the
  record command.
- [x] 7.10 Section verdicts check cited Feedback with runtime-review's exported `validateShape`,
  tested against a real recorded fixture.
- [x] 7.11 The flow and switcher tests are folded into existing suites, and no new test file remains.
- [x] 7.12 proposal.md, design.md and both spec deltas describe the fixed behaviour, the point-8
  follow-up and the archive order; strict validation passes and `npm run specs:check` reports 75
  passed, 0 failed.
- [x] 7.13 The review repros were replayed on fresh scratch projects outside the repository. The
  reviewer's switcher scripts show only the chosen variant (`?variant=B` with full-height grid
  screens: centre B, rendered B). Through the CLI, every shipped-switcher form keeps build open,
  `pickup,hero,site,story` and a reordered list are refused, "OK, start.", "do it" and "no" are
  refused, a commented `data-section` stays unbuilt, and a hand-written partial Feedback record is
  refused while the real one is cited.
- [x] 7.14 Clean cutover: the "finished under the earlier flow" exception is gone from `web.cjs`
  with its test and its mentions in the guides, change records and CHANGELOG; such projects follow
  the new flow like any other.
- [x] 7.15 The intake `record` and `skip` commands and the quick intake `command` end in the optional
  repeatable `[--anti-goal "<anti-goal>" ...]` (the `correction` command does not). A
  `workflow-next` test fills each returned command with its answer and two anti-goals, runs it with
  the real CLI (split into arguments, no shell) and finds both in `state.rules`. Each run alone with
  TEMP/TMP on D:: `workflow-next` 111/111; `workflow-action-commands`, `workflow-components` and
  `designer-pipeline-cli` 109 pass + 1 platform skip; `returned-command-audit`,
  `returned-command-safety`, `returned-edit-commands` and `returned-shell-paths` 23/23. Strict
  validation passes and `npm run specs:check` reports 75 passed, 0 failed.
- [x] 7.16 Clean cutover for in-flight projects: `web.cjs` no longer finishes intake for an intake
  without playback history or the concepts stage for a pick without variant history, so an old
  intake goes through the playback and an old pick through the variants page. The legacy
  `workflow-next` test is gone, `workflow-action-commands` now expects a legacy web intake to stay at
  intake (ui intake unchanged), and the exceptions are gone from the guide, change records and
  CHANGELOG. With TEMP/TMP on D:, `workflow-next`, `web-concept-screening`, `workflow-components`
  and `workflow-action-commands` together: 224 tests, 223 pass + 1 platform skip, 0 fail. Strict
  validation passes and `npm run specs:check` reports 75 passed, 0 failed. PR #102 CI on `9b7065c`
  (run 38411328427): `windows-path-regressions` and `qa-and-package` both passed.

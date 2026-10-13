## 1. Change records

- [x] 1.1 Write proposal.md, design.md and the `design-pipeline` and `web-workflow` spec deltas; the
  delta MODIFIES `two human decisions`, `single next step` and the component decision requirement
  instead of adding a parallel workflow.
- [x] 1.2 `npm exec -- openspec validate make-web-workflow-conversational --strict` is valid and
  `npm run specs:check` passes (75 passed, 0 failed). Archive must follow the archive of
  `redesign-user-workflow`, `add-web-treatment-and-section-briefs` and
  `let-agents-discover-open-source-resources`, whose requirements this delta modifies (the validator
  reports this as INFO).

## 2. Workflow behaviour

- [x] 2.1 `workflows/web.cjs`: conversational `intake` (skip line, one open question, confirm, correct,
  stated skip), quick stated-decision `intake`, variants `concepts` with findings, grilling `components`
  round, `description` gate, section-by-section `build`, and the new stage lists.
- [x] 2.2 `workflows/web.cjs` decide records for intake, concept, description and section, each
  rejection appended to `state.rules`; `workflow-core.cjs` routes web stages to them, refuses
  `description`/`section` outside web and routes section asks to an art director. Variant picks and
  rejections are refused until the owner has been shown the variants page.
- [x] 2.3 Web final review states final acceptance; `cli-core.cjs` help names the new stages and
  passes repeatable `--evidence` to decide (no new flag).
- [x] 2.4 `skill/tools/variant-switcher/` switcher and guide; build stays unfinished while
  `index.html` ships the switcher.

## 3. Guides and packaging

- [x] 3.1 `workflow-web.md` (stage order, intake, concepts, components, new `description`, build,
  review), `web-direction.md`, `stages.md`, `pipeline-reference.md` and the tools index describe the
  new flow; stale four-question intake and web "immediately before build" wording is gone.
- [x] 3.2 `package-resources.json` lists the switcher files; CHANGELOG `[Unreleased]` records the
  change.

## 4. Tests

- [x] 4.1 New behaviour tests `tests/web-conversation-flow.test.cjs` (20 tests: opening ask, stated
  skip, playback loop before concepts, variants page, decision round, description gate, section order
  and review, rules from every rejection, runtime-review Feedback citation, lineage invalidation,
  legacy states) and `tests/variant-switcher.test.cjs` (6 real-browser tests), registered in
  `scripts/test-manifest.json`. Twelve deliberate faults in a scratch copy of `web.cjs` each failed at
  least one flow test.
- [x] 4.2 Existing web tests migrated to the shared `tests/helpers/web-flow.cjs` walk:
  `workflow-components` 67/67, `workflow-next` 87/87 (one wording pin of the old four-question intake
  deleted), `workflow-action-commands` 30 pass + 1 platform skip (web brief-ownership cases moved to
  film/edit/ui; a new web test proves intake never touches a brief), `web-concept-screening` 4/4,
  `interaction-audit` 15/15, `reference-analysis-entry` 6/6.

## 5. Verification

- [x] 5.1 `npm test` with TEMP/TMP on D: (local Windows): repository tests 1447, pass 1439, fail 4,
  skipped 4; browser self-tests 12/12. All four failures are the known Windows `EPERM ... rename`
  flake in the palette-foundation and website-cloning temp directories, unrelated to this change.
  "QA leaves repository status byte-identical" also failed because the branch was committed while
  QA ran. CI is the authority.
- [x] 5.2 Real CLI smoke in scratch projects on D: (outside the repository), walking the standard
  flow to `done` with a real `verify interaction` in Chrome, plus the quick and standard skip paths.
  Transcript (commands as run with `--root <project> --project-root <project> --json`; long lines
  cut):

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
  rules: ["playback 1: It is for team leads choosing a plan, not for developers","variants 1: A looks like every SaaS template","description 1: Say plainly that there is no sales call","section hero 1: Start trial must read as the one main action"]

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
  `qa-and-package` and `windows-path-regressions` both succeeded, with no rerun.

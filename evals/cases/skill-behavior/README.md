# Skill behavior regressions

`input.css` is the raw local-button task input. `result.css` and `index.html` preserve the
outputs of two independent forward tests on 2026-10-08 at commit
`4b860c10bf0528b624f6e2d9d94799e871948aac`. Their original requests, reads, commands and
browser evidence remain in the ignored `.design-pipeline/skill-creator-review/css/`
and `page/` directories. These frozen answers stay outside `skill/` and the release package.

`tests/skill-evals.test.cjs` executes three cases from `skill/evals/evals.json`:

| Case | Observable deterministic coverage |
| --- | --- |
| `supporting-css-focus-motion` | Original CSS reproduces missing focus and unwanted reduced-motion transition; frozen replacement preserves computed palette/layout, keyboard focus, reduced motion and forced-colors outline. `css-artifact-footprint` checks only the emitted files. |
| `quick-chinese-profile-page` | Frozen HTML runs native required/email validation, keyboard toggle/save, persistence, 320px reflow and no animation; public `next`/`decide` produces `ui/quick/freeform`, `done` and `visualAcceptance: not-evaluated`. |
| `blocked-reference-source` | Public reference check returns exit 2 / `source-pending`; resolution without the requested image fails and preserves pending input bytes. |

Each case checks its `expectedState`, all `requiredSignals`, and actual nonempty
`requiredArtifacts`. Negative controls reject a wrong state, a missing signal and a missing
artifact. Temporary observations are ordinary browser/CLI JSON, not a new gate or receipt.
Browser cases require the existing workspace Playwright and shared Chrome resolver; a missing
browser prerequisite is reported as a skipped test.

All other cases receive manifest and canonical-job routing checks only. The tests do not invoke
an agent, prove that instructions were followed, or grant Component Conformance or Visual
Acceptance. In a new independent forward pass, give the agent only the case prompt, current
packaged skill and raw input; keep this directory and expected answers out of its task context.
Review its actual artifacts and scope separately.

The simple keyword `route` command also matches negated motion words: the original quick-page
request includes `无框架、后端和动画` and dispatches to `technique` / `motion-graphics`. The
manifest records that observed advisory classification separately from the UI behavior case;
it does not claim motion was requested or produced. Fixing keyword negation is outside this
regression change. The tested UI workflow is initialized from the user's deliverable and tier,
and its actual state must be `ui/quick/freeform` regardless of that keyword classification.

# Skill selection and behavior coverage review fixes

## Confirmed gaps and scope

The 2026-10-08 Skill Creator review found that `pipeline-reference.md` applied all six
React/Next engineering companions to ordinary React/Next work, contradicting its capability
selection rule. It also found that skill eval tests ran `route` but did not execute the declared
state, behavior signals or artifact requirements. Baseline: all six eval tests passed even
though dispatch produces no requested artifact or completion state.

Affected surfaces: the maintained pipeline guide, existing skill eval manifest, its test file,
and three frozen browser fixtures in `evals/cases/skill-behavior/`. No public command,
dependency, gate, target resolver, policy digest, receipt or acceptance contract changes.

## Implementation

The guide selects each of the existing six companions by current framework and actual
capability need. React UI work cannot trigger Next.js methods merely through framework naming;
Next.js visual work cannot trigger cache adoption or optimization without the required task or
affected existing cache boundaries. Missing selected companions retain bounded local fallbacks.

The existing eval test executes only three behavior cases: local CSS, quick Chinese profile
page, and missing required reference input. It uses actual browser observations and the public
CLI, and checks `expectedState`, `requiredSignals` and produced `requiredArtifacts`. Wrong
state, absent signal and absent artifact controls must fail. The remaining manifest cases keep
their routing/manifest coverage without being reported as behavioral passes.

CSS and HTML are frozen outputs of the earlier independent-agent tests, kept outside the
published skill so a new forward evaluator receives no answer key. Their deterministic replay
tests product behavior and CLI contracts; a new independent pass separately tests instruction
selection and preservation of user scope. `css-artifact-footprint` describes only output files.
An unavailable browser is a visible skip, not a behavior pass.

The quick page retains its original negative constraint `无框架、后端和动画`. The existing
keyword route observes `technique` / `motion-graphics` because it matches the negated motion
word. This advisory classification is recorded separately from the tested `ui/quick` workflow;
the prompt is not rewritten to hide the limit. Keyword negation is not added to the resolver.

## Verification and limits

Run `node --test tests/skill-evals.test.cjs` with the supported Node 22 runtime and existing
browser tooling, then the repository's strict specs and `npm test`. Original raw independent
evidence is in ignored `.design-pipeline/skill-creator-review/`; current focused logs are in
ignored `.design-pipeline/skill-behavior-review/`. Root delivery records the final full QA and
independent forward results.

Performed on 2026-10-08 with Node 22.23.2: the focused suite passed all 9 tests with 0 skips;
both actual browser regressions ran. `npm exec -- openspec validate internalize-taste-skill
--strict` passed. `git diff --check` reported no whitespace errors. The original route-only
coverage gap is retained as `baseline-probe.json`; focused and strict-change output are
`focused.log` and `specs.log` in the ignored evidence directory.

Formal Component Conformance is not evaluated by these cases. Quick UI `done` retains
`visualAcceptance: not-evaluated`. No paid service, new image provider, external skill install,
complete-project process for CSS support, or all-case agent evaluation is added.

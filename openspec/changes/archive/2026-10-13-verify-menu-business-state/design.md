# Design

## Context

See proposal.md for motivation. Existing interaction capture reloads once per probe and records rAF motion; the pure evaluator derives findings. Native complete invokes that shared verifier and binds its report, Git window and current artifact hashes. Failure records currently hold one string. The badge Workbench and film golden cases are specialized; neither should dictate a menu task's structure.

## Goals / Non-Goals

Verify one menu's initial state, open, selection, close and keyboard/focus recovery through actual browser input, and give the implementing agent concrete repair evidence. Keep legacy motion probes and all lineage protections. DOM observations establish only declared UI states; they do not prove persistence, backend correctness, full accessibility, screenshot fidelity or Visual Acceptance. No generic workflow framework, new runner, new receipt family or complete codebase reorganization.

## Decisions

### Ordered state journeys extend the existing v1 probe

Keep the legacy `{id, target, input, expect}` unchanged. Add the mutually exclusive `{id, target, steps}` shape to the same probe document. `target` is a stable wrapper; one navigation serves every step in that probe. Do not split a journey into probes because each probe intentionally resets its page.

Each step is `{id, input?, assertions, timeoutMs?}`. IDs are unique, steps and assertions are nonempty and each is capped at 16. Timeout defaults to 1,000 ms, accepts 1..5,000 ms and all step windows sum to at most 15,000 ms. The existing outer kernel deadline stays 60,000 ms. An omitted input observes initial/current state. Inputs are real `{kind: "click", selector}` and `{kind: "key", key}`; keys are Escape, Enter, ArrowDown, ArrowUp and Tab. Selectors must identify one element; no JavaScript expressions, test setters or artificial DOM events.

Assertion shapes are `{selector, kind: "visible"|"text"|"focused", equals}` and `{selector, kind: "attribute", name, equals}`. Visible/focused compare booleans, text compares trimmed textContent to a literal string, and attribute compares a literal string or null. Null means an existing element lacks the attribute. Missing or ambiguous elements cannot satisfy an assertion. Click and assertion selectors bind one node inside the declared stable wrapper (including the wrapper itself); the actual business readout belongs there too. Visible means positive rendered geometry without display/visibility/opacity hiding on the element or ancestors; it does not claim click reachability or artistic quality.

Observe at the end of each bounded window rather than preserving a transient match. Recheck selected state at the final step to prove it survived subsequent input. Each input and observation retains the existing actual canonical local-page guard; redirects do not transfer evidence to another page. Journey evaluation also retains the existing external-request check over real load and step requests. Motion probes keep their real-frame completeness and motion criteria.

### The evaluator owns comparisons and completeness

Raw journey capture uses `{id, steps: [{id, elapsedMs, observations: [{selector, kind, name?, found, actual}]}], requests}`. Captured values carry no caller verdict. The existing evaluator compares declared literal expectations to actual typed values, rejects missing/extra/reordered rows and returns the existing result.v1 envelope.

Journey result rows contain `{id, status, steps: [{id, status, elapsedMs, assertions: [{selector, kind, name?, expected, actual, found, matched}], findings}], findings}`. They do not invent samples or metrics. Findings reuse code/severity/message/fix and probe/step identifiers. Actual mismatches produce failed results; malformed or partial capture does not produce a pass. Journey capture must name the declared file/HTTP(S) origin; optional capture URL must be supported and match that origin. This prevents missing provenance from bypassing external-request checks. Legacy-only capture compatibility remains unchanged. Native report checking branches on the normalized original probe, never a report-provided mode label, and revalidates literal comparisons and declared coverage. Existing motion report checks remain unchanged.

### Recovery stays inside native progress

Allow `visualTasks.failures[id]` to remain a legacy string or become strict `{message, findings, inputHashes, attempts}`. `next.feedback` still exposes its message; `next.findings` exposes observed repairs. Count only actual stable-snapshot verifier failures, using existing bound input hashes plus measured output hashes. A byte change resets the consecutive count, even if mtime is restored. Repeated next, scope failures, missing tools, CAS conflicts and owner decisions do not fabricate observed attempts.

After three identical measured failures, return a stop-repeating hint with the existing repair action. This is a host instruction, not permission to skip completion, reset the baseline or accept a result. Installed code, state and selected dependencies still assume a trusted host. No automatic model-launch service is introduced.

### Prove the menu with an actual agent

Use an owned ignored Git study root, an independently frozen brief/plan/probe and the installed OMP execution already used by the evaluation tooling. Keep model identity and public tool-event evidence; do not substitute scripted HTML fixtures for model output. Dispatch through native next before editing. The model may edit index.html and implementation.md only. Feed actual failed check findings back to the same agent and rerun the unchanged probe. If the first build already passes, label any deliberately injected selection defect as a fault-injection trial. Final real output stops at exact-version owner review; no fabricated acceptance. Runtime paths and private execution logs remain ignored.

## File Ownership

- Browser worker: interaction-core.cjs, interaction-capture-core.cjs and existing interaction evaluator/capture/CLI tests.
- Native worker: workflow-core.cjs, pipeline-state-core.cjs and existing workflow/state tests; coordinate exact journey result fields with the browser worker.
- Trial worker: owned `.design-pipeline/menu-loop-20261008/real-agent/` only, using actual installed agent execution and public native commands.
- Root: OpenSpec artifacts, stages.md/qa-checklist.md examples, integration review and repository QA.

No new load-bearing packaged file or test file is needed. cli-core.cjs keeps existing command/preflight ownership. A broad CLI/workflow dependency refactor is outside this behavior slice.

## Risks / Trade-offs

- DOM state can misrepresent backend outcomes → claim only the declared visible interaction and explicitly list uncovered behavior.
- Timing and transient success → bound windows, capture final values, repeat enduring state assertions at journey end.
- Report drift or partial states → strict declared-order validation plus existing hashes, scope and CAS checks before promotion.
- Repeated agent failure → report same-snapshot attempts and stop-repeating guidance; preserve the original failed window.
- Real execution may lack a usable provider → retain precise unavailable evidence and use actual collaborative builder execution only if needed, without claiming OMP provenance.

## Migration Plan

Old motion probes and failure strings stay readable. Only new journeys require the new step observations; cached evidence with missing declared journey observations cannot complete a journey. Keep all existing invalidation and exact-version review. Revert this change's owned edits to remove the optional journey path, retaining previous evidence for audit; never discard unrelated workspace edits.

## Publication verification

Publish the five connected harness changes from an isolated branch based on the current remote
`improve-beta-motion` revision. Exclude independent frontend-redesign and film study edits, while
retaining remote fixes. Re-run QA on the selected candidate; historical working-tree test counts
are not its result. The remote source fix adds tracked
`skill/vendor/mengto-skills/upstream/agent-skills/game-combat/water-crystal-skill-vfx/demo/layout/layout.bin`.
A personal `*.bin` ignore exposed an existing repository-audit failure. Add only that exact path's
exception to the existing root `.gitignore`, preserving upstream bytes, source locks and the audit.
Do not change global Git preferences, remove the source file or waive ignored-file checks.

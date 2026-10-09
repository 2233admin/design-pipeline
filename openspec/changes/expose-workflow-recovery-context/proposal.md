# Proposal

## Why

The project-root workflow blocks stale or failed checks but returns the same command without explaining what changed or preserving the previous verifier's repair hints. Its shared review also asks web owners to watch a generic video. The user asked to additionally adapt Matt Pocock's engineering skills; these are concrete public-interface gaps that hinder an agent resuming the work.

## What Changes

- Return current-check diagnostics with the existing next action: missing/unbound/changed inputs and the last verifier's findings, fixes and recovery instruction.
- Centralize this projection beside existing workflow content bindings; keep next read-only and preserve all pass/review/delivery rules.
- Show the actual checked web page or film/edit video at shared review, plus only existing contained supplemental evidence.
- Extend the existing QA guide with public-interface, one-step red/green and focused diagnosis methods. Reuse its existing SKILL link and packaging registration.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `design-pipeline`: Resumable workflow verification context, review display paths and engineering verification instructions.

## Impact

Existing shared workflow helpers, film/edit/web stage declarations, workflow next/recordGate, public CLI verifier callers, workflow-next tests and existing QA/stage guides. Additive workflow-state.v1 and next-result fields only; native state/events/receipts, models, runtime defaults and user working-tree edits remain intact. No new command, flag, dependency, runner or copied upstream skill.

Method references, pinned to Matt Pocock's official revision `f3fc5632f401156837ee3872f14fe33ccf1024ea`: [codebase-design](https://github.com/mattpocock/skills/blob/f3fc5632f401156837ee3872f14fe33ccf1024ea/skills/engineering/codebase-design/SKILL.md), [tdd](https://github.com/mattpocock/skills/blob/f3fc5632f401156837ee3872f14fe33ccf1024ea/skills/engineering/tdd/SKILL.md), [diagnosing-bugs](https://github.com/mattpocock/skills/blob/f3fc5632f401156837ee3872f14fe33ccf1024ea/skills/engineering/diagnosing-bugs/SKILL.md). Adapt the methods to the established public CLI, OpenSpec and owner decisions rather than running upstream setup or installing another workflow.

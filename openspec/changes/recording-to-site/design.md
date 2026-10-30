## Decisions

1. **The table lives in `reference.md`.** It is the observation record the owner already confirms at extract; the
   confirmation's hash binding then covers the behaviour list, and a later edit reopens the confirmation.
2. **Parse, do not interpret.** The extract step reads the table under the exact heading: columns `id`, `time`,
   `change`, `control`, `keyboard`. Ids match `rb-[0-9]+` and are unique. `control` and `keyboard` must be
   non-empty; `keyboard` may be `none: <reason>` only for behaviours with no user input (an ambient loop).
3. **Coverage takes the ids as input.** `checkInteractionStateCoverage(matrix, { recordedBehaviours })` keeps its
   current result when the option is absent. With it, every id must be named by at least one entry, and that
   entry's own blockers count against it; an entry naming an unknown id is a blocker.
4. **Simulated input is guidance, not a gate.** Detecting a fake cursor or an autoplayed demo mechanically is
   unreliable (ambient motion is legitimate); the reference states the rule and the page review checklist asks it.

## Risks

- Hand-written tables drift from the recording: the extract confirmation shows the table to the owner beside the
  analysis frames, and the owner confirms both.

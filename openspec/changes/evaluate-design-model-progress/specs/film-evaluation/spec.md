## ADDED Requirements

### Requirement: The active experiment is limited to the enamel badge

The current comparison and score export SHALL contain only the supplied enamel badge reconstruction. The reference SHALL be directly visible. Existing unrelated experiments SHALL remain historical records and SHALL NOT be presented as current tasks or trigger further model calls. User-authorized additional models SHALL be added only as badge direct/tool pairs, without rerunning unrelated experiments.

#### Scenario: User narrows the experiment

- GIVEN existing frontend, component and VFX experiment records
- WHEN the user requests only the enamel badge
- THEN the active page presents only badge artifacts and badge ratings
- AND prior unrelated records are preserved without running further experiments

### Requirement: Enamel iterations retain an auditable version record

The local experiment SHALL preserve prior outputs and record each version's brief, workflow, tool revision, requested and actual models, reasoning setting, input and output digests, execution outcome, technical evidence and separate visual acceptance.

#### Scenario: Completed independent model run

- GIVEN the common reference brief and one permitted treatment
- WHEN OMP returns responses from the requested provider and model and a new deliverable passes the recorded checks
- THEN the version links its prompt, event log, source, export and evidence
- AND creative acceptance remains unassessed until human review

#### Scenario: Model fallback or provider failure

- GIVEN a requested model is rejected or OMP emits a fallback event
- WHEN the command exits successfully on another model or no requested-model deliverable exists
- THEN the requested model's version is recorded as failed or blocked
- AND it is not labeled as a successful work by that model

### Requirement: Badge model attribution is visible by default

The badge page and score exports SHALL show actual model attribution and treatment alongside each run.

#### Scenario: A user identifies a badge or a failed run

- GIVEN the recorded actual model and treatment for every displayed badge run
- WHEN the user loads the page or exports ratings
- THEN the matching model and treatment are directly available
- AND a missing artifact remains explicitly failed rather than attributed as a completed work

#### Scenario: Paired, pending, and rated runs are presented

- GIVEN same-model direct/tool runs, pending requests, and saved ratings
- WHEN the badge page or score export is displayed
- THEN same-model pairs appear together with direct on the left and tool on the right, without requiring a disclosure action
- AND pending runs show requested models until actual responses are recorded
- AND new ratings are recorded as nonblind while prior ratings retain their original metadata

### Requirement: Tool progress is evaluated within a paired model experiment

Paired runs SHALL use separate contexts and ownership directories, the same public brief, reference assets, base runtime, time allowance, export conditions and external checks. Only the availability of the design-pipeline toolkit differs. Technical measurements SHALL remain separate from visual ratings.

#### Scenario: Comparable paired deliverables

- GIVEN two fresh runs of the same model with permitted tool availability
- WHEN both complete and their actual exports are inspected at the same times
- THEN the report presents a same-model comparison and records actual time and token use
- AND different-model and historical iteration comparisons are identified separately

#### Scenario: Contaminated or unreviewed comparison

- GIVEN a run reads a sibling or historical reconstruction, or human blind review has not occurred
- WHEN the comparison is measured
- THEN the relevant fairness field remains false and the benchmark cannot report fair evaluation passed
- AND missing visual ratings remain unscored rather than inferred from film gates

### Requirement: Playback is checked independently of deterministic seeking

The local badge engineering evaluation SHALL test visible canvas progression after its play control. Successful sampleTime seeking SHALL NOT substitute for actual playback. Public checks and additional external behavior checks SHALL retain separate records.

#### Scenario: Triggered animation advances

- GIVEN a scene paused at a fixed sample time
- WHEN the evaluator activates play and captures two canvas frames during playback
- THEN the animation visibly progresses
- AND the evaluator separately checks seeking, controls and reduced-motion initialization

#### Scenario: Trigger only resets to an idle frame

- GIVEN deterministic seeking works but the play operation leaves its clock paused
- WHEN two frames are captured during the expected active interval
- THEN the engineering result fails even if the public shader and seek checks passed
- AND the unchanged model artifact and concrete playback failure remain available for human review

### Requirement: Badge tasks expose the dispatched work and actual execution

The component evaluation foundation SHALL expose each task's scope and distinguish requested work, actual execution, and technical evidence.

#### Scenario: A running task performs a file edit

- GIVEN a dispatched blue-enamel task and an active OMP event stream
- WHEN a public file-edit completion event is received before the overall run finishes
- THEN the task view exposes the recorded action and result without waiting for overall completion
- AND the recorded edit does not imply visual acceptance or reconstruct unavailable historical file versions

#### Scenario: No actual model response is available

- GIVEN a requested model and no recorded responding identity
- WHEN the task is displayed with a pending request or provider error
- THEN the actual model is explicitly unknown and the requested model remains visible
- AND a different responding model is not silently attributed to the requested model

#### Scenario: Task is dispatched

- GIVEN a small badge task ready for dispatch
- WHEN the task is presented to a model
- THEN it exposes its goal, inputs, dependencies, permitted change scope, tool guidance, deliverable, acceptance conditions, dispatched prompt, and requested model
- AND public model progress statements remain distinguishable from observed tool actions and technical evidence
- AND OMP logs and pipeline state events retain their respective provenance

### Requirement: Critical badge stages wait for artifact-bound human review

The component evaluation foundation SHALL wait at task boundaries for human review of critical geometry and material deliverables. Dependent tasks SHALL remain waiting until their required deliverable is accepted. Human feedback and checks SHALL reference the reviewed artifact version; a changed artifact SHALL NOT inherit the previous artifact's visual acceptance or ratings. Other eligible tasks SHALL proceed automatically under the confirmed workflow.

#### Scenario: A geometry deliverable is rejected

- GIVEN a completed geometry artifact awaiting human review and tasks requiring its acceptance
- WHEN the user rejects that artifact and supplies feedback
- THEN those dependent tasks remain waiting and the feedback is associated with the rejected version
- AND a subsequent correction retains the prior artifact and review record

#### Scenario: A reviewed deliverable is accepted

- GIVEN a geometry artifact and tasks waiting for its human acceptance
- WHEN the user accepts that artifact version
- THEN eligible dependent tasks may proceed
- AND the decision does not automatically accept later changed artifacts

#### Scenario: An accepted upstream source changes before a later review

- GIVEN a previously accepted geometry version and a material artifact waiting for review
- WHEN the geometry file no longer matches its registered digest
- THEN review of the material version is refused and affected downstream evidence becomes stale
- AND original decisions and scores remain recorded with invalid validity rather than being deleted or reused

#### Scenario: A rejected version is corrected

- GIVEN feedback bound to a rejected geometry artifact
- WHEN the correction is dispatched
- THEN the previous attempt, source snapshot and review remain available
- AND the new attempt receives that feedback and waits for a fresh human decision before material tasks proceed

### Requirement: New badge evaluation runs do not use token consumption as elimination

Under the user-provided unlimited-token execution condition, new component evaluation runs SHALL record token usage and elapsed time without imposing an aggregate token elimination threshold or inheriting the historical uniform twelve-minute production elimination limit. Actual provider failures, user stops and visual rejection SHALL remain distinct recorded outcomes. Historical run allowances and time-limit outcomes SHALL retain their original values.

#### Scenario: New execution exceeds the old experiment limit

- GIVEN a new component task using the confirmed execution policy
- WHEN its elapsed production time exceeds twelve minutes or it consumes additional tokens
- THEN those observations alone do not eliminate the task
- AND actual usage and any concrete termination reason remain observable

#### Scenario: A historical run reached its time allowance

- GIVEN an older badge run with a recorded twelve-minute allowance and time-limit outcome
- WHEN the new execution policy is displayed or adopted
- THEN the older run retains its original allowance and outcome
- AND it is not relabeled as completed under the new policy

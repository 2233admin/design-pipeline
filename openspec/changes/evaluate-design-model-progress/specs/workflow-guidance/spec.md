## ADDED Requirements

### Requirement: Visual checkpoints consume real owner decisions

The native visual-task next/decide flow SHALL bind owner review to current task evidence and use existing progress and invalidation.

#### Scenario: First visible material is ready for owner calibration

- GIVEN a task with visual.review true and passed hash-bound technical evidence
- WHEN complete is recorded and next is requested
- THEN next asks the owner to inspect the actual target and outputs
- AND dependent tasks remain undispatched until an accept for those exact artifacts
- AND a technical pass is reported separately from the owner decision

#### Scenario: Review is rejected or no longer matches

- GIVEN a failed, changed, unreviewed, or mismatched target version
- WHEN visual acceptance is evaluated
- THEN the version receives no visual acceptance
- AND rejecting a completed planned target preserves its evidence, records concrete feedback, and invalidates that target and downstream evidence through the existing mechanism
- AND an accepted decision binds the current completion artifacts in existing native progress

#### Scenario: Owner notices an earlier problem after later work exists

- GIVEN completed geometry and dependent material evidence
- WHEN the owner rejects the completed geometry with concrete feedback and matching completion artifacts
- THEN the existing native records mark geometry and its dependants stale
- AND the next repair retains the feedback and prior artifact evidence
- AND an older completion version cannot invalidate or approve a newer version

### Requirement: Customer artifacts and development inspection have distinct entry modes

Production guidance SHALL distinguish a requested customer surface from an explicitly requested inspection or evaluation workbench.

#### Scenario: Enamel component has a developer inspection mode

- GIVEN a badge component and an explicitly available inspection entry
- WHEN the default component is opened
- THEN it displays the badge and intended interactive animation
- AND inspection controls and implementation metadata are not visible in that customer surface
- AND reduced motion and deterministic render mode remain supported

#### Scenario: Evaluation workbench is requested

- GIVEN a user explicitly requests an evaluation workbench
- WHEN production guidance selects its entry
- THEN the workbench uses the packaged design workflow and preserves actual model, action, and evidence controls
- AND work/reference and owner calibration appear above implementation details
- AND inspection controls, model metadata, material diagnostics, scores, prompts, and source links remain in this requested inspection/evaluation entry

### Requirement: Owner feedback follows a bounded tool improvement path

The packaged skill SHALL connect owner calibration and reusable capability defects to their existing review and maintainer paths.

#### Scenario: User correction reveals a reusable capability gap

- GIVEN actual visual evidence and an explicit user correction
- WHEN the correction is translated into a repair
- THEN the agent names the target, suspected cause, minimal capability change and preserved invariants
- AND compares the revised output on the same reference before offering a reusable tool change
- AND records technical evidence and user visual judgment separately without fabricating scores
- AND a critical choice or unresolved discrepancy is presented with a concrete frame or short clip and a scoped question
- AND the owner's answer is recorded against that version, one target is repaired, and before/after outputs are compared

#### Scenario: Reusable tool defect is recorded

- GIVEN a reusable tool defect or quality gap
- WHEN a packaged tool improvement is proposed
- THEN it uses the existing local feedback recorder, OpenSpec repair, and regression/review evidence
- AND it is not represented as adaptation promotion or autonomous model-weight learning
- AND external collaboration adaptation keeps its independent evaluation and approval boundaries
- AND the enamel badge remains the sole current visual benchmark and one result does not claim general aesthetic improvement

### Requirement: Implementation dispatch returns one evidence-bound visual task

The packaged next and decide commands SHALL dispatch implementation subtasks in native change state using existing plan and artifact contracts.

#### Scenario: One current task rather than a complete graybox

- GIVEN a native implementation change and a valid visual task plan
- WHEN next is invoked with its change root
- THEN it returns one dependency-ready task with its inputs, guides, scope and checks
- AND it does not initialize a legacy workflow state or create another progress store

#### Scenario: Evidence fails or was produced for an earlier output

- GIVEN a current visual task and artifact metadata for outputs and check reports
- WHEN decide evaluates completion
- THEN the actual outputs, task definition, plan, reference inputs and dependency versions must match the recorded evidence
- AND each passed check report must bind the exact current task outputs
- AND missing, failed or stale evidence keeps the current task open with a repair reason

#### Scenario: Upstream or reference changes after completion

- GIVEN completed tasks with dependent evidence
- WHEN an input, task definition, plan or upstream output changes
- THEN next revalidates the versions and invalidates affected downstream completion
- AND old evidence remains recorded but cannot advance the new version

#### Scenario: Evaluation dispatch consumes the packaged task action

- GIVEN a new tool-treatment component evaluation
- WHEN reference observation and decomposition have been delivered
- THEN the dispatcher obtains the current task from the frozen packaged tool and displays its exact goal, scope and checks
- AND direct treatment receives the shared reference and final goals without the tool task plan
- AND historical runs preserve their prior tasks, artifacts and review records

#### Scenario: Task plan is incomplete or state is updated

- GIVEN a task plan with missing decomposition or a subtask ready to mutate state
- WHEN next dispatches work or a native subtask mutation is applied
- THEN missing decomposition returns a bounded decomposition action rather than a whole implementation action
- AND state mutation uses the existing lock, compare-and-swap, and state/event transaction
- AND technical completion does not grant Visual Acceptance
- AND each dispatched task identifies one target property, reference files, dependencies, literal modification scope, applicable guides, outputs, and real check reports

### Requirement: Reference reconstruction is preserved by lightweight frontend workflows

The existing web and UI workflows SHALL preserve reference observation in replicate mode at quick tier. Replicate build guidance SHALL use the reference and its declared invariants rather than require replacement concepts. Ordinary brief/freeform lightweight work SHALL preserve its existing workflow. Observation SHALL NOT be mistaken for complete graybox, geometry or visual acceptance.

#### Scenario: Quick reconstruction without observations

- GIVEN a web or UI quick replicate workflow without reference.md
- WHEN next is requested
- THEN it returns the reference work before implementation
- AND it names applicable existing evidence guidance and bounded graybox work
- AND it does not demand full aggregate fidelity readiness before the graybox can exist
- AND reference.md existence records observation-document delivery only, not verified observation
- AND build guidance separates bounded graybox work from dependent material/polish work, which uses complete results of the existing checks

### Requirement: Frontend implementation guidance decomposes verifiable visual targets

The existing task and build guidance SHALL require each visual task to name its applicable reference region or scene node, goal and invariants, inputs, literal modification scope, outputs, runtime/comparison checks and failure return step. Structure and occlusion SHALL precede dependent material and motion work. This guidance SHALL reuse tasks.md and existing reference, scene and receipt contracts; it SHALL NOT hard-code the evaluation badge or treat task-file existence as verification.

#### Scenario: Referenced graphics component

- GIVEN reference regions and an applicable scene contract for a frontend component
- WHEN implementation tasks are prepared
- THEN tasks isolate independently verifiable visual goals with explicit dependencies
- AND the agent has the inputs, checks and repair path for the current goal
- AND creating the task file alone does not grant engineering or visual acceptance

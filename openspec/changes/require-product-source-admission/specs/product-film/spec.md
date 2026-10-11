## ADDED Requirements

### Requirement: Product source is an admission precondition

A film whose Stage 0 deliverableForm is product-launch-video, or whose storyboard declares productSource, SHALL be evaluated only after its productSource is admitted. Until then the storyboard gate MUST return only admission findings with no metrics. Admission MUST NOT be a weighted score component, and non-product films without productSource MUST keep their previous results.

#### Scenario: Card-only product promo

- **GIVEN** a product-launch-video storyboard with no productSource, built from text and cards
- **WHEN** the storyboard gate runs
- **THEN** it fails with `product-source-missing` and `metrics: null`
- **AND** no structure, rhythm or sound check result is reported

#### Scenario: Admitted product promo

- **GIVEN** an admitted productSource whose files match and whose shots are sourced
- **WHEN** the storyboard gate runs
- **THEN** the existing checks run and the result carries an `admission` summary with repository and commit

#### Scenario: Non-product film

- **GIVEN** a motion-graphics film without productSource
- **WHEN** the storyboard gate runs
- **THEN** the result is unchanged and has no `admission` key

### Requirement: Product source record pins the real product

An admitted productSource SHALL record a credential-free repository URL, a full commit SHA, the run command, observation time and hashed run log, hashed UI-state and operation captures, and an action → response → result flow of capture ids. Malformed records MUST be contract errors. Local paths, file URLs, branches, tags and short SHAs MUST be rejected. Run and capture times MUST be RFC 3339 with seconds and Z or ±hh:mm.

#### Scenario: Branch instead of commit

- **WHEN** productSource.commit is `main` or a short SHA
- **THEN** the storyboard is rejected with a contract error naming the full-SHA requirement

#### Scenario: Local checkout as repository

- **WHEN** productSource.repository is a local path or `file://` URL
- **THEN** the storyboard is rejected with a contract error

#### Scenario: Unknown capture reference

- **WHEN** flow or `beats[].source` cites a capture id that the record does not contain
- **THEN** the storyboard is rejected with a contract error

#### Scenario: Timezone-less capture time

- **WHEN** run.observedAt or a capture's capturedAt has no `Z` or `±hh:mm` offset, such as `2026-10-11T10:00`
- **THEN** the storyboard is rejected with a contract error instead of being ordered in the host's timezone

### Requirement: Product source files stay bound

Admission SHALL hash the run log and every capture inside the project root. A missing or changed file, a run log that does not show the pinned commit, captures lacking a UI state or an operation, a flow action that cites no operation, a capture timed before the run, or any action capture timed after a response capture (or response after result) MUST fail admission with a fix.

#### Scenario: Capture changed after recording

- **WHEN** a capture's bytes no longer match its recorded sha256
- **THEN** admission fails with `product-source-file-changed` and the checks that hashed it reopen

#### Scenario: Unpinned run

- **WHEN** the run log does not contain the recorded commit
- **THEN** admission fails with `product-source-run-unpinned`

#### Scenario: Screenshots without an operation

- **WHEN** every capture is a ui-state and none records the user's operation
- **THEN** admission fails with `product-source-captures-incomplete`

#### Scenario: Capture predates the run

- **WHEN** a capture's capturedAt is earlier than run.observedAt
- **THEN** admission fails with `product-source-time-order`

#### Scenario: Flow captures only look ordered

- **WHEN** action captures are timed at 10 s and 30 s, the response at 20 s and the result at 40 s
- **THEN** admission fails with `product-source-time-order`, because every action capture must precede every response capture

### Requirement: Shots are built from the captures

When beats are planned, every beat of an admitted product promo SHALL cite the captures it shows in beats[].source, except a pure brand card (brand-hold, transformation none). Unsourced beats MUST stay within 25% of durationSec. Each flow step MUST be shown by an action beat citing its capture, action no later than response no later than result; a title, card or hold cannot show a step.

#### Scenario: Invented action beat

- **WHEN** an action beat has no `source`
- **THEN** admission fails with `shot-source-missing` for that beat

#### Scenario: Half real captures plus invented result cards

- **WHEN** real captures cover half the film and unsourced title-holds present result or benefit claims
- **THEN** admission fails with `shot-source-missing` for each card, whatever the sourced share

#### Scenario: Result claimed only by a title-hold

- **WHEN** no action beat cites a capture of the flow's result step, even if a title-hold cites one
- **THEN** admission fails with `flow-unshown`

#### Scenario: Flow shown out of order

- **WHEN** an action beat shows the result before any action beat shows the response
- **THEN** admission fails with `flow-out-of-order`

#### Scenario: Brand cards dominate

- **WHEN** unsourced brand cards take more than a quarter of the film
- **THEN** admission fails with `source-share-low`

### Requirement: Unsourceable products block explicitly

A product that cannot be run or captured SHALL be recorded as productSource status blocked with blocker kind no-repository, access-denied, build-failed, run-failed, needs-credentials or capture-failed, plus reason and needs. A blocked record MUST NOT carry run, captures or flow. `next` MUST return a blocked action with CLI exit 2 and MUST NOT advance or invite invented scenes.

#### Scenario: Product needs credentials

- **GIVEN** productSource status blocked with kind `needs-credentials`
- **WHEN** `next` is called
- **THEN** it returns `type: "blocked"` with the blocker, exits 2 and stays on the source stage
- **AND** the storyboard gate reports status `blocked` with `product-source-blocked`

#### Scenario: Blocked record with captures

- **WHEN** a blocked productSource also carries captures
- **THEN** the storyboard is rejected with a contract error

#### Scenario: Physical product

- **GIVEN** a non-software product with no repository
- **WHEN** its source is recorded
- **THEN** it is blocked with `no-repository` and `next` returns the blocked action until a follow-up contract exists

### Requirement: Film workflow binds the Stage 0 plan

Film workflow state SHALL bind jobId, jobPlanSha256, jobPlanPath and deliverableForm from a valid Stage 0 job plan supplied by `next --job-plan` or found at job-plan.json, using the existing job-plan validation. A missing, changed or form-conflicting bound plan MUST stop `next` with JOB_PLAN_STALE and the re-plan command; plans MUST NOT be rewritten.

#### Scenario: Bind an existing film project

- **WHEN** `next --project-root . --job-plan job-plan.json` is called on a film state
- **THEN** the four binding fields are stored and the plan becomes a checked input

#### Scenario: Plan edited after binding

- **WHEN** the bound plan's content no longer matches its jobPlanSha256
- **THEN** `next` fails with `JOB_PLAN_STALE` naming the route re-plan and rebind commands

#### Scenario: Plan for a non-film deliverable

- **WHEN** a job plan is supplied while initializing an edit or web deliverable
- **THEN** initialization fails with a contract error

### Requirement: Product promos source and sample before building

Product-launch-video films SHALL source and sample before building. Before the owner is asked, sample.mp4 MUST fully decode as video and run 5–8 s inclusive, else `next` returns findings with a recut fix and decide refuses with SAMPLE_INVALID; an accept recorded earlier of an invalid file no longer finishes the stage. Owner `decide --stage sample` MUST bind the sample bytes and productSource hash; plan and check MUST hash the run log, captures and plan.

#### Scenario: Stage lists

- **WHEN** a product-launch-video film is walked
- **THEN** its stages are source, plan, build, check, review at quick and intake, source, reference, concepts, plan, sample, build, check, review, deliver at standard and full

#### Scenario: Sample rejected

- **WHEN** the owner records `decide --stage sample --verdict reject --answer <reason>`
- **THEN** the reason becomes a project rule and sample stays open

#### Scenario: Sample is not a decodable 5–8 s video

- **WHEN** sample.mp4 is not a video, fails to decode, or runs under 5 s or over 8 s
- **THEN** `next` returns a run action whose findings carry a recut fix and does not ask the owner, `decide --stage sample` fails with `SAMPLE_INVALID`, and an earlier accept of such a file no longer finishes the stage

#### Scenario: Source changed after sample acceptance

- **WHEN** sample.mp4 or productSource changes after an accept verdict
- **THEN** that verdict no longer finishes the sample stage and a new sample decision is required

#### Scenario: Scaffolded before the reference stage

- **GIVEN** a standard or full product promo whose source stage ran `film scaffold`
- **WHEN** reference.md still holds the scaffold's empty template and no `decide --stage reference --answer none` is recorded
- **THEN** `next` returns the reference stage instead of completing it

#### Scenario: Non-product film stages

- **WHEN** the bound form is not product-launch-video
- **THEN** the film stage list and actions are unchanged

### Requirement: Evaluation surfaces stop before evaluating

`film check`, `verify film-storyboard` and `verify film-render` SHALL receive the bound form and project root and MUST stop at the admission result when admission is required and not granted, without timeline, render or composition evaluation. `film-eval measure` MUST leave such product-promo runs unmeasured and report them under admission, so the existing benchmark reports blocked.

#### Scenario: Render of an unadmitted promo

- **WHEN** `verify film-render` runs on a product promo without an admitted source
- **THEN** it returns the admission result with "Not evaluated" limits and does not sample the video

#### Scenario: Fictional-product benchmark scenario

- **GIVEN** the `canvas-launch` scenario run has no admitted productSource
- **WHEN** `film-eval measure` runs
- **THEN** the run is unmeasured, listed under `admission`, and `benchmark evaluate` reports `blocked`

#### Scenario: Repair scenario

- **WHEN** the `repair-slideshow` scenario is measured
- **THEN** it is scored by the existing gates as before

### Requirement: Stage 0 recognizes product-promo film phrasings

The Stage 0 classifier SHALL map English and Chinese product-promo film phrasings such as promo film, launch film, product trailer, 宣传视频 and 推广片 to product-launch-video. Promo pages, sites, banners, promo codes, UI hover and plans such as 制作产品宣传页面 or 产品推广方案 MUST keep their forms. A persisted plan whose form changes MUST fail validation, not be rewritten.

#### Scenario: Chinese promo video

- **WHEN** the brief asks for a 产品宣传视频
- **THEN** the deliverableForm is `product-launch-video`

#### Scenario: Promo page

- **WHEN** the brief asks for a product promo page or 制作产品宣传页面
- **THEN** the deliverableForm is not `product-launch-video`

#### Scenario: Plan classified under the old rules

- **WHEN** a persisted plan's stored form differs from its query's current classification
- **THEN** validation reports a deliverable-form conflict and the plan must be re-planned

### Requirement: Admission is not acceptance

Admission and every film gate SHALL report technical conformance only, with creativeAcceptance not-assessed. Gates bind records and file hashes and MUST NOT claim that captured pixels, the run log or the shown flow are genuine. Owner Visual Acceptance SHALL remain a separate review verdict, and historical films and frozen scores MUST remain unmodified diagnostics.

#### Scenario: Admitted and passing film

- **GIVEN** admission is granted and all film gates pass
- **THEN** the result still reports `creativeAcceptance: "not-assessed"`
- **AND** `next` asks the owner for the review verdict

#### Scenario: Earlier rubric score

- **WHEN** a historical fictional-product film has a high frozen rubric score
- **THEN** the score stays a diagnostic and does not count as admission or acceptance

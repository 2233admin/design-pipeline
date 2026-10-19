## ADDED Requirements

### Requirement: Replicate mode extracts the reference before it builds

For ui and web, `next --mode replicate` SHALL hold an `extract` step after the reference step. It SHALL return a `run` with findings until the reference evidence, `DESIGN.md`, `MOTION.md` and, at standard and full, the design-system package pass the existing reference and foundation checks, run by `next` itself.

#### Scenario: Nothing is built from a bare reference note

- **WHEN** a ui or web replicate project has only a filled `reference.md`
- **THEN** `next` SHALL return the `extract` stage as a `run` whose findings name the missing `reference-evidence.json`, `DESIGN.md` and `MOTION.md` with their fixes
- **AND** it SHALL NOT return the build, work or components stage.

#### Scenario: Source Decisions name what is not borrowed

- **WHEN** `DESIGN.md` passes `foundation check` but its Source Decisions section does not say that the reference's content, copy, brand marks and logos are not borrowed
- **THEN** `next` SHALL keep the `extract` stage with a `design-source-decisions-incomplete` finding.

#### Scenario: The reference step is not the film step

- **WHEN** `next` returns the reference stage of a ui or web replicate project
- **THEN** its instruction SHALL name `reference-evidence.json` and the `primary-target` role and SHALL NOT ask for timed frames or a graybox study.

### Requirement: The owner confirms the extraction and later stages stay bound to it

After the checks pass, `next` SHALL ask the owner to confirm the extraction. `decide --stage extract --by owner` SHALL store the sha256 of `DESIGN.md`, `MOTION.md`, `reference.md` and `reference-evidence.json`. A changed file SHALL reopen the confirmation.

#### Scenario: Only the owner confirms

- **WHEN** an agent records `decide --stage extract --by agent`
- **THEN** it SHALL be refused
- **AND** the ask SHALL carry the token summary, the Source Decisions text and the compiled design-system previews when they exist.

#### Scenario: Editing DESIGN.md reopens the confirmation

- **WHEN** `DESIGN.md` changes after the owner confirmed the extraction
- **THEN** `next` SHALL return the `extract` ask again with a `first` naming the changed file
- **AND** after the owner confirms again, a ui delivery and review, a web description approval and a web interaction pass recorded before SHALL be stale.

#### Scenario: A rejection becomes a rule

- **WHEN** the owner rejects the extraction
- **THEN** a rule SHALL hold their words and `next` SHALL return a `run` to revise the files until one changes.

### Requirement: Web replicate consults the website-clone fidelity verdict

When a web replicate project holds a `website-cloning.json`, the web probe and delivery SHALL stay unfinished until its recorded verdict is `complete` with a passed verification, and `next` SHALL return the existing evaluator command with the manifest's protected invariants and allowed differences.

#### Scenario: A clone that is not complete blocks the probe

- **WHEN** the interaction pass is current and the manifest status is not `complete`
- **THEN** `next` SHALL return a `run` naming `evaluate-website-clone.cjs`, the manifest status and reasons
- **AND** it SHALL NOT reimplement the evaluator.

### Requirement: Natural reference phrasings route to the clone and reconstruction jobs

The job registry SHALL route "copy this page", "make it like this", "like this site", "照着做", "照这个做", "像这个网站", "仿照" and "参考这个页面" to `website-clone`, and "screenshot to code" to `reference-reconstruction`. `SKILL.md` SHALL route a supplied reference page or screenshot to `next --mode replicate`.

#### Scenario: A casual phrasing finds the job

- **WHEN** `route --query "照这个做"` runs
- **THEN** the job SHALL be `website-clone`.

### Requirement: Workflow modes are brief and replicate

The workflow SHALL accept `--mode brief` and `--mode replicate` only. `--mode freeform` SHALL fail as an unknown value, with no alias.

#### Scenario: Freeform is rejected

- **WHEN** `next --deliverable ui --tier quick --mode freeform` runs
- **THEN** it SHALL fail naming the allowed modes `brief, replicate`.

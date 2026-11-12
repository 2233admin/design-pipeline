## ADDED Requirements

### Requirement: Toast and notification briefs route to their judgment guide

A brief about a toast, snackbar, notification, unread badge, undo prompt or progress prompt
(or 消息提醒) SHALL route through the job registry to the `toast-notification` job, whose primary
knowledge is `references/toast-notification.md`. The route SHALL add no step beyond the kernel
and SHALL add no gate, receipt or CLI command.

#### Scenario: A toast or notification brief in English or Chinese

- **WHEN** `designer-pipeline route --query` receives "should this be a toast or a notification", "add an undo toast after archiving", "snackbar for upload progress", "撤销提示和未读角标" or "给上传加进度提示"
- **THEN** the route SHALL be `ready` with job `toast-notification`, a top candidate score above 0 and a confidence other than `low`
- **AND** `primaryKnowledge.id` SHALL be `toast-notification` and `next` SHALL hold only the kernel steps.

#### Scenario: A brief with no such word

- **WHEN** the brief names none of the job's keywords and matches no other job
- **THEN** the route SHALL stay on the default job with confidence `low`.

#### Scenario: Another job matches more strongly

- **WHEN** a toast keyword appears beside an explicit job's keyword, or beside more keywords of another scored job
- **THEN** that other job SHALL remain the primary
- **AND** a naming question ("what's it called when toasts stack") SHALL stay with `motion-vocabulary`.

### Requirement: The toast and notification guide judges first and yields to package rules

`references/toast-notification.md` SHALL keep the judgment flow (read the product, three toast
kinds, notification, the four "neither" cases, seven settling questions, a report table, and a stop
until the owner picks rows and a restyle option). Its kubai restyle values SHALL be defaults that
land on the project's tokens, and each value that conflicts with UC-19, UC-03, the exit-easing
rule or UC-39 SHALL name the governing rule. The guide SHALL name kubai as the source.

#### Scenario: The guide is read for a review

- **WHEN** an agent follows the guide on an existing product
- **THEN** it SHALL list every message with trigger, wording, buttons, place, duration and whether it can be found again
- **AND** it SHALL give one row per message with where, now, should be, why and change
- **AND** it SHALL ask which rows to change and which restyle option (toast, notification, both, neither) before editing code.

#### Scenario: A kubai value conflicts with a package rule

- **WHEN** a kubai default is shorter than the UC-19 floor of 5 seconds, longer than the 300 ms rule without a recorded reason, or exits on ease-in
- **THEN** the guide SHALL state the governing rule and the value to use
- **AND** the review SHALL record the kubai value as not applicable, naming that rule.

#### Scenario: The guide is packaged

- **WHEN** repository QA reads `package-resources.json`, `scripts/test-manifest.json` and the ablation layers
- **THEN** the guide SHALL be listed in `required`, the `ui-craft` layer SHALL list it, and the guide's relative links SHALL resolve to files and headings that exist.

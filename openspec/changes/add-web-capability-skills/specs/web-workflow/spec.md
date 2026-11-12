# Web workflow delta: web guides

## ADDED Requirements

### Requirement: The web guidance is packaged as web guides, not as extra skills

The web treatment guidance and the web review guidance SHALL be the reference documents
`skill/references/web-treatment.md` and `skill/references/web-review.md`. Each SHALL be listed in
`required` of `skill/references/package-resources.json` and named once by path in `skill/SKILL.md`, in
the one bullet that replaces the single web bullet of `add-web-treatment-and-section-briefs`; that
bullet SHALL keep naming `references/web-direction.md`. This change SHALL NOT add a file named
`SKILL.md` under `skill/` other than inside the vendored `upstream` folders that already exist. The
front door SHALL stay under 5,120 bytes and under 500 lines.

#### Scenario: No additional skill entry point

- **WHEN** the `SKILL.md` files under `skill/` are listed, leaving out paths that contain an `upstream` folder
- **THEN** the list SHALL be `skill/SKILL.md` alone.

#### Scenario: The front door stays small and its links resolve

- **WHEN** `skill/SKILL.md` is measured and the `references/` paths it names are resolved under `skill/`
- **THEN** it SHALL be under 5,120 bytes and under 500 lines
- **AND** every named path SHALL exist.

#### Scenario: The package carries the guides

- **WHEN** the package is built
- **THEN** it SHALL contain `references/web-treatment.md` and `references/web-review.md`.

### Requirement: The front-door description is rewritten once and stays loadable

The `description` in the front matter of `skill/SKILL.md` SHALL be rewritten by this change. It SHALL be
one line of at most 1,024 characters that contains no colon followed by a space and no space followed
by `#`, so that a strict YAML reader loads it. It SHALL start with what the skill builds, in words users
say (including landing pages, websites, design systems, components and website clones), SHALL name the
cases it is for, and SHALL end with what it is not for (code or pull-request review, API or module
interface design, UX research documents). It SHALL NOT name a skill of another package. The `name`
SHALL stay `design-pipeline`.

#### Scenario: A strict loader accepts the description

- **WHEN** the front matter of `skill/SKILL.md` is read
- **THEN** the description SHALL be one line of 1 to 1,024 characters
- **AND** it SHALL contain neither a colon followed by a space nor a space followed by `#`.

#### Scenario: The description says what the skill is not for

- **WHEN** the description is read by a person
- **THEN** its last part SHALL say what the skill is not for
- **AND** it SHALL name no skill of another package.

#### Scenario: A host lists the skill with its whole description

- **WHEN** the package is installed into a temporary Codex home and the skills are listed with `skills/list`
- **THEN** `design-pipeline` SHALL be listed with its whole description
- **AND** the loader SHALL report no error for its path.

### Requirement: Concept cards differ on a parameter table

`references/web-treatment.md` SHALL define a concept parameter table with the parameters dominant
element, driver, ground strategy, density curve, motion verb, type voice, boundary language and accent
technique, each with a set of values. It SHALL require the three cards of `concepts.md` to be the
columns of a filled table in which every pair of cards differs on at least four parameters, including
the dominant element or the driver, with the pairwise counts written under the table. No gate, finding
code or check SHALL be added for the rule.

#### Scenario: The concepts action names the table

- **WHEN** `next` runs for a standard web project with a brief, a reference decision and no `concepts.md`
- **THEN** the `run` command SHALL contain `references/web-treatment.md` and state the rule of at least four differing parameters
- **AND** it SHALL still contain `## Treatment` and the word section, and SHALL NOT match `between beats` or `the picture`.

#### Scenario: The guide defines the table

- **WHEN** `references/web-treatment.md` is read
- **THEN** it SHALL define the eight parameters with their value sets
- **AND** it SHALL state the rule of at least four differing parameters and the requirement to write the pairwise counts.

### Requirement: The treatment carries a mandatory Style table

`references/web-treatment.md` SHALL define a Style table with these mandatory slots: a ground per
section, ink, accent, extra colour, at most three type voices, type scale, space unit, radius, stroke,
shape vocabulary, motion verbs, a blacklist with its exceptions, and exactly three must-deviate lines.
It SHALL require every slot to hold a concrete value and never a placeholder, SHALL provide a default
blacklist of ten template patterns that a page may keep only with a written exception, and SHALL state
that in `replicate` mode the table records the reference's values and the must-deviate rule does not
apply, and that in `freeform` mode the deviations are written against the default template of the page
type. The Style table SHALL be the single definition of the treatment's style seed: the "Style-bible
seed" row of `references/web-direction.md` SHALL point to it and SHALL NOT list slots of its own. Its
values SHALL land only in existing artifacts: project `DESIGN.md` (Colors, Typography, Layout, Do's and
Don'ts) and `MOTION.md`, without adding sections.

#### Scenario: The build action points to the Style table

- **WHEN** `next` runs for a standard or full web project whose concept is chosen and that has no `index.html`
- **THEN** the `build` command SHALL contain `references/web-treatment.md` and `## Treatment`
- **AND** the action's stage id SHALL be `build` and `remaining` SHALL equal the count before this change.

#### Scenario: The quick tier is unchanged

- **WHEN** `next` runs for a quick web project with no `index.html`
- **THEN** the `build` command SHALL NOT mention a treatment or `references/web-treatment.md`.

#### Scenario: The seed has one definition

- **WHEN** the "Style-bible seed" row of `references/web-direction.md` is read
- **THEN** it SHALL point to the Style table of `references/web-treatment.md`
- **AND** it SHALL NOT list the slots itself.

### Requirement: The web next actions point to the web guides

At the standard and full tiers the web `concepts` run action, the web `build` action and the web
`review` ask SHALL each name the matching guide (`references/web-treatment.md` for the first two,
`references/web-review.md` for the third). The `review` ask SHALL keep naming
`references/web-direction.md` and the screenshot sizes 375x812, 768x1024 and 1440x900, and SHALL
contain none of the words video, contact sheet, footage or beat. Every `references/` path a web action
names SHALL exist under `skill/`. Stage ids, `finished` conditions, `record` strings, `guide` anchors
and stage order per tier SHALL NOT change, and the film, edit and `ui` actions SHALL NOT change. No web
action SHALL name `evals/`.

#### Scenario: The review ask names both guides

- **WHEN** `next` runs for a standard web project whose `index.html` exists and whose `interaction` gate passed
- **THEN** the action `type` SHALL be `ask` and its `stage` SHALL be `review`
- **AND** the serialized action SHALL contain `references/web-review.md`, `references/web-direction.md`, `375x812`, `768x1024` and `1440x900`
- **AND** it SHALL NOT match `video`, `contact.sheet`, `footage` or `beat` (case-insensitive).

#### Scenario: Every named path exists

- **WHEN** the web actions of every tier and stage are serialized
- **THEN** every `references/` path they name SHALL resolve to a file under `skill/`
- **AND** none of them SHALL contain `evals/`.

#### Scenario: Film, edit and ui output is unchanged

- **WHEN** `next` runs at the stages that film, edit and `ui` projects share with web
- **THEN** each action's question, questions, show, recommended, record and reason text SHALL deep-equal the corresponding shared action.

### Requirement: The two web guides are registered in the tool list

`scripts/tool-list.json` SHALL hold one entry for each web guide: `references/web-treatment.md`
(`public`, `active`, group Web pages, stages `web:concepts` and `web:build`, audience author) and
`references/web-review.md` (`public`, `active`, group Web pages, stage `web:review`, audience author and
reviewer), each with a summary of at most 160 characters. Each claimed stage SHALL be named by a `next`
action at that stage or by the matching `##` section of `references/workflow-web.md`. The existing
mentions of `references/web-direction.md` in the `concepts`, `build`, `probe` and `review` sections of
`references/workflow-web.md` SHALL stay, because the tool list claims that guide for those stages.
`skill/references/tool-map.md` SHALL be rewritten with `node scripts/tool-list.cjs --write` and never
edited by hand. `node scripts/tool-list.cjs --check` SHALL exit 0 with the entries in place.

#### Scenario: Both guides are registered

- **WHEN** `scripts/tool-list.json` is read
- **THEN** it SHALL hold exactly one entry for `references/web-treatment.md` and one for `references/web-review.md`, each `public` and `active` with the stages above.

#### Scenario: The claimed stages are named

- **WHEN** the web `next` actions of every tier and the sections of `references/workflow-web.md` are read
- **THEN** `web:concepts` and `web:build` SHALL be named for `web-treatment.md` and `web:review` for `web-review.md`
- **AND** `web-direction.md` SHALL still be named in `## concepts`, `## build`, `## probe` and `## review` of `workflow-web.md`.

#### Scenario: The registry check passes and the map is current

- **WHEN** `node scripts/tool-list.cjs --check` runs after `--write`
- **THEN** it SHALL exit 0
- **AND** no file in the repository SHALL change during the check.

### Requirement: The review guide separates Visual Acceptance from Conformance and names a missing capture tool

`references/web-review.md` SHALL require a capture preflight before evidence is gathered. A failed
preflight SHALL name the missing tool from the error, mark each evidence cell that needed a screenshot
`not-verified`, and let the review continue on the live page. The guide SHALL define the first-viewport
test (five seconds, the product and one action, yes or no, `pending` without the reviewer). It SHALL
require each of W1 to W7 to be answered `yes`, `no` or `not-verified` with an evidence path and one
sentence, a rule being `yes` only when every clause of its "Looks right" cell holds, with no scores. It
SHALL state that on a page taller than the window `text-off-canvas` findings whose position lies outside
the window are ignored and that the report says so. It SHALL order the report: Visual Acceptance first
(`PENDING` unless the user recorded a result), then the W table and the first-viewport result, then the
Conformance block, then a secondary review if one was made. A secondary review by a model SHALL appear
only under the heading `SECONDARY REVIEW - model, NON-BLIND, NOT COUNTED`, after the user has answered,
and SHALL NOT change or replace the user's answers or Visual Acceptance. The agent SHALL NOT record
Visual Acceptance.

#### Scenario: A missing tool is named

- **WHEN** the capture preflight fails because `puppeteer-core` is not resolvable
- **THEN** the report SHALL name `puppeteer-core` and the `--puppeteer-module` option
- **AND** screenshot-based evidence cells SHALL read `not-verified` and the review SHALL continue on the live page.

#### Scenario: The report opens with Visual Acceptance

- **WHEN** a review report is written and the user has recorded no result
- **THEN** its first block SHALL read `Visual Acceptance: PENDING`
- **AND** the Conformance block SHALL come after the W table.

#### Scenario: A secondary review is labelled

- **WHEN** a model fills the W table for a page the user has already answered
- **THEN** its block SHALL carry the heading `SECONDARY REVIEW - model, NON-BLIND, NOT COUNTED`
- **AND** the user's answers and Visual Acceptance SHALL be unchanged.

### Requirement: The web guides add no gate, receipt, schema, command or artifact

This change SHALL NOT add a gate, a finding code, a receipt, an analysis schema, a workflow stage, a
workflow-state field, a CLI command or action, a benchmark manifest or a script, and SHALL NOT add a
field to the interaction probe, component-state-matrix, direction-preview or motion contracts.
Everything the guides produce SHALL land in files the web workflow already writes. Component
Conformance and Visual Acceptance SHALL be reported separately, and gate findings SHALL keep their
existing meaning and severity.

#### Scenario: Contracts are unchanged

- **WHEN** the schema identifiers and finding-code sets of the interaction, composition, component-state-matrix, direction-preview and workflow-state contracts, and the actions of the `benchmark` command, are compared with the previous release
- **THEN** they SHALL be equal.

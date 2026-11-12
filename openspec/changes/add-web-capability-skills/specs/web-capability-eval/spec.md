# Web capability evaluation delta

## ADDED Requirements

### Requirement: The evaluation compares two skill packages built from git commits

An evaluation SHALL compare a baseline arm and a changed arm, each a git commit whose `skill/` is
packaged with `scripts/package.cjs` in its own worktree with the same `PACKAGE_VERSION` and
`SOURCE_DATE_EPOCH`, and installed for generation with `scripts/install-local.cjs` into its own skills
root. The record SHALL name the comparison and hold the sha256 of each package,
`git log --oneline <baseline>..<changed>` and `git diff --stat <baseline>..<changed> -- skill/`, and
every path in the diff SHALL be part of the change under test or declared as accepted, with a reason.

The default comparison, A, SHALL measure the increment of this change. Its baseline arm SHALL be the
commit just before the first Phase A commit, recorded by hash when Phase A starts, so that the commits
of `fix-tool-guidance-errors` and `add-capability-registry`, which land before Phase A, are in both
arms. Its changed arm SHALL be the last Phase A commit. If a commit of another change lands between the
first and the last Phase A commit, its paths SHALL be declared as accepted with a reason, or the commit
SHALL be avoided; a path that is neither part of the change nor accepted SHALL be removed by building
the changed arm from a branch without it.

An optional comparison, B, SHALL measure the whole web creative layer: its baseline arm is `bbf7fa4` and
its changed arm is the same changed-arm commit. The guidance-fix and registry paths in its diff SHALL be
declared as accepted. B SHALL have its own pack, key, rounds, count and verdicts, SHALL be reported
separately from A and SHALL NOT be combined with it. Neither package of either comparison SHALL contain
`evals/web/`.

#### Scenario: The arms are commits

- **WHEN** an evaluation record is written
- **THEN** it SHALL name the comparison, both commits, the sha256 of both packages and the diff stat
- **AND** it SHALL state which paths of the diff are the change under test and which are accepted.

#### Scenario: The default comparison measures this change's increment

- **WHEN** the record of comparison A is written
- **THEN** its baseline arm SHALL be the commit just before the first Phase A commit
- **AND** the diff between its arms SHALL list only files of Phase A of this change.

#### Scenario: A stray commit is declared or avoided

- **WHEN** a commit of another change lies between the first and the last Phase A commit
- **THEN** the record SHALL list each of its paths as accepted with a reason, or the commit SHALL NOT be between them.

#### Scenario: A whole-layer comparison is separate

- **WHEN** a comparison with the baseline arm `bbf7fa4` is run
- **THEN** its record SHALL be separate from that of comparison A
- **AND** no rate, count or verdict SHALL combine the two.

#### Scenario: Neither package holds evaluation material

- **WHEN** the arms of a comparison are packaged
- **THEN** neither package SHALL contain `evals/web/`.

### Requirement: The numbers are written down and locked before the held-out briefs

`skill/evals/web/README.md` SHALL contain a table of the protocol's numbers, each a number or an exact
rule: generations per arm, model and brief; the number of held-out briefs; the pilot size; the pairing;
the win-rate threshold; the brief-majority rule; the comprehension rule; the responsive and accessibility
safety checks; the consistency threshold; the blinding threshold; the void re-run limit; the generation
budget; the review time limits; and the size and delay of round 2. The table SHALL be provisional until a
lock commit. One amendment window between the pilot and the lock commit SHALL be allowed, each amendment
recorded with its reason and the pilot evidence. The order SHALL be: changed-arm commit, lock commit,
held-out briefs commit, first confirmatory generation. A number changed after the lock commit SHALL void
the confirmatory run. The evaluation SHALL use at least three generations per arm, model and brief, and at
least five held-out briefs of page types that differ.

#### Scenario: The lock precedes the held-out briefs

- **WHEN** the git history of an evaluation is read
- **THEN** the lock commit SHALL precede the commit that adds the held-out briefs
- **AND** both SHALL precede the first confirmatory generation.

#### Scenario: A number changes after the lock

- **WHEN** a number of the table differs from its locked value at the time of a confirmatory generation
- **THEN** the record SHALL mark the confirmatory run void.

### Requirement: Generations are independent, isolated and equal in budget

Every generation SHALL start in a fresh session with memory features off, use a pinned model id and
version, the same sampling settings and one declared budget for both arms, an empty project folder and
the installed package of its arm only, and its transcript SHALL be saved. The operator SHALL answer the
workflow's questions from the brief's four facts and SHALL apply one policy: the concept is the model's
own recommended card, the reference is none, the review is accepted at the first draft. A generation
with no page, or a page that does not open, SHALL count as a loss for its arm and SHALL NOT be dropped.
A generation that read anything under `evals/web/`, ran with memory features on, or used the wrong
package SHALL be void, re-run at most once and reported per arm.

#### Scenario: A failed generation is a loss

- **WHEN** a generation ends without an `index.html`
- **THEN** its pair SHALL count as a loss for that arm
- **AND** the pair SHALL NOT be removed from the counts.

#### Scenario: A run that read the evaluation guide is void

- **WHEN** a saved transcript shows a read of a path under `evals/web/`
- **THEN** the generation SHALL be void and re-run once
- **AND** the void SHALL be reported for its arm.

### Requirement: Briefs are held out and do not name the answer

`skill/evals/web/briefs.md` SHALL list briefs with an id, a set (`dev` or `heldout`), a page type and the
four intake facts (product, audience, scope, assets). A brief SHALL describe product, audience and goal
and SHALL NOT name a dominant element, a driver or a layout. The `dev` briefs are used by the pilot. The
`heldout` briefs SHALL be written and committed after the lock commit by a session that edits no skill
file, SHALL cover at least five page types that differ, and SHALL be approved by the user. No brief SHALL
use film wording (video, film, promo, footage, beat) or ask for a duration.

#### Scenario: A brief names no solution

- **WHEN** a brief of `briefs.md` is read
- **THEN** it SHALL state the four facts
- **AND** it SHALL NOT name a dominant element, a driver or a layout.

#### Scenario: Held-out briefs land after the lock

- **WHEN** the commit that adds `heldout` briefs is compared with the lock commit
- **THEN** it SHALL come after it.

### Requirement: The capture tools are checked first and a gap is named

The procedure SHALL start with a preflight that records the Node version, the operating system, the
Chrome build and the `puppeteer-core` path and version, and runs `composition capture` and
`verify composition` once on a scratch page outside the repository. A failure SHALL be copied word for
word into the record with the tool it names; the safety checks SHALL then be `not-run` and every
model-level verdict SHALL be `blocked`. Nothing else SHALL start before the preflight has passed or been
recorded. The responsive safety check SHALL count only `text-off-canvas` errors whose position lies
inside the window height, because the composition gate reports text below the fold of a taller page as
off canvas; the accessibility safety check SHALL count `text-contrast` and `low-contrast` errors.

#### Scenario: A missing puppeteer-core blocks the evaluation

- **WHEN** the preflight fails because `puppeteer-core` is not resolvable
- **THEN** the record SHALL name `puppeteer-core`
- **AND** every model-level verdict SHALL read `blocked`.

#### Scenario: Text below the fold is not a responsive failure

- **WHEN** a page taller than the window yields `text-off-canvas` errors at positions outside the window height
- **THEN** the responsive safety check SHALL NOT count them.

### Requirement: The blind pack hides the arm and can be audited

The pack SHALL be built from a recorded seed. Orientation SHALL be balanced so that within each model
the two orientations differ by at most one; the presentation order and the ids SHALL derive from the seed
and reveal nothing about the cell. The pack SHALL hold only pages and screenshots, with HTML comments and
generator metadata removed, non-page files removed and timestamps not kept. A leak scan SHALL search every
text file for the arm labels, the model ids and the tool names, and each hit SHALL be looked at. The key
SHALL be stored outside the pack and outside the repository and SHALL NOT be opened before both counted
rounds are recorded. Both arms' pages SHALL be reviewed from the same path, browser and window size.

#### Scenario: The assignment can be recomputed

- **WHEN** the recorded seed and the pair keys are applied to the recipe
- **THEN** the orientation and the order SHALL equal those of the key
- **AND** within each model the orientations SHALL differ by at most one.

#### Scenario: The pack names no arm

- **WHEN** the leak scan runs on the finished pack
- **THEN** no hit SHALL remain that names the tool or an arm.

### Requirement: The counted review is the user's and the model's review is labelled and later

The counted verdicts SHALL come from the user working from the blind pack in two passes. Pass 1 asks, for
each page and after a five-second look at its first screen, whether the reviewer can say what the
product is and name one action. Pass 2 asks, for each pair, which page makes the reviewer want to keep
scrolling, and which page the reviewer believes is the changed one. A first-look note SHALL be written
before pass 2. A second round by the same reviewer SHALL be held later on a random subset with new
orientation, order and ids while the key stays sealed. Only the first round SHALL count; the second SHALL
give the consistency. The model's review SHALL be made after unblinding, SHALL appear only under the
heading `SECONDARY REVIEW - model, NON-BLIND, NOT COUNTED`, SHALL NOT be read by the count and SHALL NOT
be shown to the user before both counted rounds are recorded. Agents SHALL NOT record Visual Acceptance.

#### Scenario: Only the first round counts

- **WHEN** the second round disagrees with the first on a pair
- **THEN** the pair SHALL keep its first-round answer
- **AND** the disagreement SHALL lower the reported consistency.

#### Scenario: The secondary review does not count

- **WHEN** a secondary review exists
- **THEN** the count SHALL be identical with and without it.

### Requirement: Verdicts are per model level and fail closed

Each model level (weak, mid, strong) SHALL receive one verdict: `pass` when every locked threshold holds
for that level, `fail` when a threshold was measured and missed, `blocked` when a required measurement
did not run (capture unavailable, round 2 not held, a condition false), `inconclusive` when the
consistency is below its threshold or the blinding guess reaches its threshold. Verdicts SHALL NOT be
combined across model levels. A `pass` SHALL NOT be reported as the Visual Acceptance of any page.
Component Conformance and Visual Acceptance SHALL be separate blocks of the record.

#### Scenario: A missing measurement blocks

- **WHEN** round 2 has not been held
- **THEN** the verdict of each model level SHALL be `blocked`.

#### Scenario: A compromised blind is not a pass

- **WHEN** the guess accuracy of a model level reaches the blinding threshold
- **THEN** the verdict of that level SHALL NOT be `pass`.

#### Scenario: Model levels are not combined

- **WHEN** three model levels have verdicts
- **THEN** the record SHALL list one verdict per level and no combined verdict.

### Requirement: Every record declares its made-up steps, its conditions and its limits

Each evaluation record SHALL contain a table declaring each of these steps as `real`, `synthetic` or
`not-run` with a reason: briefs, product facts and assets, the workflow's decisions, generation, capture,
gate outputs, the counted review, the secondary review, the rendering used for review, and real visitors.
It SHALL contain the six conditions (same prompts, same environment class, blind evaluator, expected
answers hidden, fresh context, representative delivery), each recorded as holding or not, the validity
limits of the protocol, and a list of what was not verified. A record without the made-up-steps table
SHALL be invalid.

#### Scenario: A record without the table is invalid

- **WHEN** an evaluation record has no made-up-steps table
- **THEN** it SHALL NOT be reported as an evaluation result.

#### Scenario: A condition fails

- **WHEN** one of the six conditions does not hold
- **THEN** every model-level verdict SHALL be `blocked`.

### Requirement: The evaluation guide sits under `evals/`, is reached by maintainers only, and is registered as internal

The evaluation guide SHALL be `skill/evals/web/README.md`, next to `skill/evals/web/briefs.md`, and SHALL
NOT be under `skill/references/`. Both files SHALL be listed in `required` of
`skill/references/package-resources.json`. `skill/SKILL.md` SHALL NOT name the guide, the repo router
`.claude/skills/design-pipeline/SKILL.md` SHALL carry one `<intake>` bullet that names it, and no `next`
action SHALL name it. `scripts/tool-list.json` SHALL hold an entry for it with exposure `internal`, status
`active`, audience maintainer, no stages and a `reason`, so that the registry test passes with the router
bullet. The files and the bullet SHALL land in a commit after the changed arm of the comparisons of this
change.

#### Scenario: The front door does not name the evaluation guide

- **WHEN** `skill/SKILL.md` is read
- **THEN** it SHALL NOT contain `evals/`.

#### Scenario: No next action names the evaluation guide

- **WHEN** the web `next` actions of every tier and stage are serialized
- **THEN** none SHALL contain `evals/`.

#### Scenario: The router path is registered

- **WHEN** the router names `skill/evals/web/README.md`
- **THEN** `scripts/tool-list.json` SHALL hold an `internal`, `active` entry for `evals/web/README.md` with a reason
- **AND** `node scripts/tool-list.cjs --check` SHALL exit 0.

#### Scenario: The package carries the evaluation files

- **WHEN** the package is built from the protocol commit
- **THEN** it SHALL contain `evals/web/README.md` and `evals/web/briefs.md`.

### Requirement: The evaluation adds no gate, receipt, schema, command, manifest or script

The evaluation SHALL use only existing commands: `scripts/package.cjs`, `scripts/install-local.cjs`,
`composition capture`, `verify composition` and `verify interaction`. It SHALL NOT add a gate, a finding
code, a receipt, a schema, a CLI command or action, a benchmark manifest, scoring code or a blind-pack
script. The `benchmark` command and the film benchmark manifest SHALL NOT change. A script file for the
blind pack (`skill/evals/web/blind-pack.cjs`, not a CLI command) SHALL be a separate step with its own
spec delta.

#### Scenario: The benchmark surface is unchanged

- **WHEN** the actions of the `benchmark` command and `skill/evals/film/film-benchmark.json` are compared with the previous release
- **THEN** they SHALL be equal.

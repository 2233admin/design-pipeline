# Design: a conversational web workflow on the existing next/decide machine

## Context

`next` walks the stages that `skill/scripts/workflows/web.cjs` declares for a tier and mode. It
returns the first unfinished stage as one `run` or `ask` action, and `decide` records the owner's
replies in `.design-pipeline/state.json`.

Before this change the web stages were:

| Tier and mode | Stages |
| --- | --- |
| Quick | `components, build, probe` |
| Quick replicate | `reference, components, build, probe` |
| Standard and full | `intake, reference, concepts, components, build, probe, review, deliver` |
| Standard and full replicate | the standard list without `concepts` |

Two records already turn a "no" into a project rule:

- `decide --stage review --verdict reject` appends `{text, from: "draft N", scope: "project"}` to
  `state.rules`;
- a film `sample` rejection does the same.

`next` returns the rule texts on every action before `done`. The film sample stage is also the
existing pattern for a repeated ask: its verdict binds the bytes it judged, and a rejection of
unchanged bytes adds a `first` line telling the agent to redo the work before asking again.

## Goals and non-goals

**Goals:** the ten owner-approved UX points (proposal), using only the state file, decide records,
`state.rules`, the existing gates and the evidence lineage.

**Non-goals:**

- film, edit and ui flows;
- new gates, receipt schemas or feedback systems;
- changes to the runtime-review contract (the planned point-8 follow-up);
- enforcing conversation style in code. The playback length and "one question per message" are
  prompt text, not checks; the only word count in code is the minimum-content rule (Decision 2).

## Decisions

### 1. Stage sequences

| Tier and mode | Stages |
| --- | --- |
| Quick | `intake` (stated decision), `components`, `build`, `probe` |
| Quick replicate | `intake` (stated decision), `reference`, `components`, `build`, `probe` |
| Standard and full | `intake`, `reference`, `concepts`, `components`, `description`, `build` (section loop), `probe`, `review`, `deliver` |
| Standard and full replicate | the standard list without `concepts`, because the reference keeps its direction |

Point 7 is a stage that blocks build (not a `state.gates` gate), and it follows from stage order:
`description` precedes `build`, so `next` returns no build action until the description approval is
current. If the approval goes stale later, `next` walks back to it.

### 2. Intake is a conversation with two exits

The standard/full `intake` ask is:

- `question`: the skip line, "If you'd rather skip the questions and have me start, say so.", then
  one open, concrete question with exactly one `?`: "What site have you seen recently that felt the
  way this page should, and what about it?", or in replicate mode "What must stay exactly as it is
  in the page you want reproduced?";
- `instruction`: the conversation rules (facts are looked up, never asked; the opening question is
  sent as its own message; one open question per message; anti-goals and prior art; a 200-300 word
  playback that marks the owner's words apart from the agent's guesses; each correction recorded;
  the confirmed playback or the skip recorded with each anti-goal as its own `--anti-goal`);
- three commands: `record`, `correction` and `skip`.

It has no `questions`, `options` or `recommended`, which is why the delta modifies the
`single next step` requirement.

The opening has no `first`. Everywhere in the web flow `first` has one meaning: a step the agent
takes before it asks. After a correction, for example, the intake ask carries the `first` "The owner
corrected the playback ("…"); each correction is now a project rule. Play it back again with the
corrections applied, then ask:" and the question "What is wrong or missing in this?". The variants,
description and section asks use `first` the same way, and `line` joins `first` and `question`.

`decide --stage intake` for web (`recordIntake`) accepts three forms:

| Form | Effect |
| --- | --- |
| `--verdict accept --answer "<confirmed playback>" [--anti-goal "<anti-goal>" ...]` | Writes `decisions.intake = {answer, playback: "confirmed"}`. |
| `--verdict reject --answer "<correction>"` | Appends a rule `playback N` and reopens intake. |
| `--choice skip --answer "<one line of decisions>" [--anti-goal "<anti-goal>" ...]` | Writes `decisions.intake = {answer, skipped: true}`. |

Every form appends to the history in `decisions.playbacks`.

**Anti-goals.** `--anti-goal "<text>"` is the one new CLI flag: repeatable, registered in
`cli-core.cjs` and passed to decide as `antiGoals`. It goes only with a web intake's confirmed
playback or skip, the quick skip included. Each anti-goal becomes a rule `anti-goal N` unless a
rule with the same text already exists. With a correction it is refused ("a correction is already a
project rule"), and at any other stage or on a film, edit or ui project it is refused before any
state change. The `record` and `skip` commands that `next` returns, and the quick skip command,
end in the optional repeatable `[--anti-goal "<anti-goal>" ...]`, so an agent that runs a returned
command as given cannot drop the owner's anti-goals; the `correction` command does not carry it.

**Minimum-content rule.** Point 4 requires stated decisions, never silent defaults, and a rule
(point 9) is only useful if it says what is wrong. A list of go-ahead words cannot hold either, so
the list is gone and a recorded answer must carry enough words instead. Words are runs of letters or
digits (an apostrophe inside one, as in "don't", keeps it one word), and two CJK characters count as
one.

- Stated decisions need at least six words: the skip line (standard and quick) and the confirmed
  playback. "OK, start.", "proceed", "do it", "just start", "yes, build it as shown", "默认" and
  "直接开始吧" are refused as a skip line.
- Every "no" needs at least three words: a playback correction, a variants rejection, the notes of a
  combination (`--choice B,C --answer`), a decision-round correction, a description rejection, a
  section rejection's `--answer` (a rejection that cites only `--evidence` stays allowed) and each
  `--anti-goal`. "no", "nope", "Too dark" and "首屏太暗了" are refused; "No stock photos" and "The
  hero is too dark" are recorded.

A refused answer fails with `CONTRACT_INVALID`, ending "(at least N words; two CJK characters count
as one)", and leaves the state unchanged.

Web intake no longer writes `brief.md`; the description stage owns it (Decision 5). Film, edit and
ui intake keep the four-question form and its brief-writing ownership rules unchanged.

The quick tier's `intake` is a `run` action: tell the owner in one line what was decided for them,
then record it with `--choice skip`, adding each thing the request rules out as its own
`--anti-goal`. This is the "skip path natural" form of point 4. Quick keeps its short path
(owner-approved): it states its decisions (point 4) and asks only the component sources; it has no
opening question, playback, variants, description approval or section reviews.

### 3. Concepts become a switchable variants page

The `concepts` run action asks for two files:

- `concepts.md` with cards A, B and C, using the same structural-divergence requirements as before;
- `concepts.html`, one self-contained page whose first screens are marked `data-variant="A|B|C"`
  and shown one at a time by `?variant=`.

The page inlines the packaged `skill/tools/variant-switcher/variant-switcher.js`. The switcher adds
a bar at the bottom centre with a left arrow, a label and a right arrow. The ← → keys also cycle,
except while a form field has focus. It rewrites `?variant=`, and it lives in a shadow root so it is
visibly not part of the design. This follows the UI branch of `prototype`.

The switcher hides the variants not shown with the `hidden` attribute. A page's own CSS
(`section { display: grid }`, an id rule or an inline `style="display:grid"`) would override that
and show every variant at once, with the label naming one variant while the owner sees another, and
the agent's `?variant=` pre-screen screenshots would be wrong too. So the switcher adds
`<style data-variant-switcher-style>[data-variant][hidden] { display: none !important; }</style>`
to the page head once, and a hidden variant stays out of the layout whatever the page's CSS says.

The agent pre-screen (same-size contact sheet; redo same-skeleton, common-template or
collapsed-hierarchy variants) is unchanged.

Before the ask, `next` checks only that the three markers and the switcher are present (findings
`variants-incomplete` and `variant-switcher-missing` in the run action). HTML comments are stripped
first, so a marker or a switcher inside a comment does not count. The pick is recorded by
`recordConcept`:

| Form | Effect |
| --- | --- |
| `--choice B` | Records one variant. |
| `--choice B,C --answer "B's header with C's layout"` | Combines variants; combining requires notes of at least three words. |
| `--verdict reject --answer` | Appends a rule `variants N` and reopens the pick. The record binds the hash of `concepts.html`, and while those bytes are unchanged the ask carries a `first` line asking for the variants to be redone. |

History is kept in `decisions.variants`; `decisions.concept` and `conceptNotes` keep their meaning.

The switcher never ships, in any form. With HTML comments stripped, `buildStatus` keeps build
unfinished, with the error finding `variant-switcher-shipped` ("index.html ships part of the
prototype variant switcher: <what>."), while `index.html` carries any of:

- `data-variant` or `data-variant-name` attributes (the variant panels);
- the text `variant-switcher` anywhere: an inline script, `data-variant-switcher` markup, or a
  `<script src>` URL that names it, local or remote;
- a local `<script src>` file whose content contains `variant-switcher` (a renamed copy).

The fix text says the switcher stays in `concepts.html` only when the project has a concepts stage
(standard and full outside replicate); the quick and replicate fix texts do not name it.

### 4. Numbered grilling rounds of concrete decisions

At standard and full, the `components` ask opens a round of numbered questions, each with a
recommendation:

- `sections`: the sections in build order, first screen first;
- `components`: the PR #100 source question, "Where should the components come from?".

The source options are in plain words, as `{choice, label}` objects in canonical order:

| `choice` | `label` |
| --- | --- |
| `project` | Components this project already has |
| `github` | A GitHub library you name |
| `index` | This skill's component index |
| `discover` | Let me find open-source libraries |
| `scratch` | Write from scratch |

The recommended answer names labels only: "Components this project already has first, then this
skill's component index, then let me find open-source libraries." The ids stay in the `record`
command (`--choice <project|github|index|discover|scratch, comma-separated> --answer`), so the
PR #100 decision and its validation are unchanged.

Its instruction gives the grilling rules: format each round as ❓/➡️ with the options shown by
label, look up facts instead of asking for them, and add only questions that cannot be settled
otherwise. The agent MAY ask further numbered rounds (each question with a recommended answer) for
questions that depended on earlier answers, and SHALL record `components` once, after the last
round; the settled answers go into the description.

Each "no" the owner gives in a round (a recommendation turned down, something ruled out) is
recorded with the ask's new `correction` command:
`decide --stage components --verdict reject --answer "<what the owner turned down or ruled out, in their words>"`.
It appends `{verdict: "reject", reason, at}` to `decisions.rounds` and a rule `decisions N`, and it
does not record or change the components decision. It is refused with `WORKFLOW_NOT_READY` while
`next` has not reached `components`, and with `CONTRACT_INVALID` for `--verdict accept` or for a
correction that carries `--choice`.

The components record moved from `workflow-core.cjs` into `web.cjs` (`decisions.components`) with
the same validation and messages, and `invalidateCheckedEvidence` moved to `workflows/shared.cjs`,
exported for core and web. Core still refuses `--stage components`, `description` and `section` on
a film, edit or ui project before any state change.

Quick asks only the component question, with the same options. At standard and full the sections
settled in the rounds go into the description, where the approval records them.

### 5. `brief.md` is the description, and its approval binds its lineage

The repository already treats `brief.md` as the project brief (Stage 1 lists its fields). The
`description` stage asks the agent to make it a one-page description containing:

- what the page is and why;
- who it is for and the one thing a visitor should do;
- how it should feel, in the owner's words;
- goals, non-goals and anti-goals;
- the chosen first screen and anything combined into it, or, in replicate mode, what is reproduced;
- a `## Sections` list: one top-level list item per section, in build order, first screen first,
  each starting with its id (for example `- hero: today's bakes and the reserve button`);
- the component sources and the constraints;
- which choices are the owner's and which are the agent's calls.

It does not copy the project rules. They stay in `state.rules` and come back with every action, so
a rule recorded mid-build, such as a section rejection, needs no edit to `brief.md` and does not
reset the sections already accepted. Changes to `brief.md` itself still invalidate the downstream
work: the approval and every section review are asked again.

`decide --stage description --verdict accept --choice <ids in build order>` stores
`{sha256 of brief.md, upstream, sections}` in `decisions.descriptions`. Here `upstream` hashes the
confirmed playback, the variant pick and notes, and the component decision digest. Before that:

- `next` must have reached the description stage (the description ask or any later stage, up to
  `done`) and `brief.md` must exist; otherwise the record fails with `WORKFLOW_NOT_READY`.
- `brief.md` must carry a `## Sections` heading (`^##\s+sections\b`, case-insensitive) followed by
  top-level list items at column 0 (`- `, `* `, `+ `, `1. ` or `1) `), each starting with its id,
  backticks allowed. The list ends at the next `#` or `##` heading.
- Ids are lowercase letters, digits and hyphens, none may repeat, and `--choice` must equal the list
  exactly, in order. A word that only appears in the prose no longer counts.

These failures are `CONTRACT_INVALID`; a `--choice` that differs from the list gets a message
naming the list. Because the record is allowed after `next` has moved on, an approval can be
recorded again to correct it. Section verdicts bind the approval id, a hash of the brief's sha256,
`upstream` and `sections`, so re-recording the identical approval keeps them. Any different
approval asks every section again, and it is possible only after `brief.md` changed, because the
ids must equal its list. The ask's `why` starts "The stage that blocks building (not a state.gates
gate)".

`currentApproval` is current only while the brief bytes and `upstream` are unchanged. A changed
brief, a re-picked variant, a new playback or a different component decision therefore asks for
approval again. A rejection appends a rule `description N`, and the ask carries a `first` line
asking for a revision while the brief is unchanged.

### 6. Section-by-section build

Build at standard and full is a loop over the approved sections. `sectionProgress` finds the first
section, in order, that is either unbuilt (no `data-section="<id>"` in `index.html` once HTML
comments are stripped, the same check `decide --stage section` uses) or not accepted under the
current approval. From there:

- **No page yet, or a page whose first section is not marked.** The action is the full build
  instruction for the first screen only: component decision, OpenSpec at full, then (outside
  replicate) the treatment and the section briefs, then the first section. The treatment's section
  arc must list exactly the approved section ids in the approved order; a different arc goes back
  to the owner as a description correction before anything is built. Later section ids are not
  named in this step.
- **Next section unbuilt.** A run action builds that section and keeps accepted ones as the owner
  accepted them.
- **Section built.** An ask (`section: <id>`) asks the owner to look at the section in the real
  page: "The <id> section is built (k of n). Look at it in the page: accept it as it is, or tell me
  what to change, naming each element by its text, label or where it sits?"

`decide --stage section --choice <id> --verdict accept|reject [--answer] [--evidence <record>]`
(`recordSection`) records `{section, verdict, reason, evidence, description: approvalId,
pageSha256, at}`:

- **Accept** is allowed only for the section `next` is asking about, so sections advance in order.
- **Reject** is allowed for any built, approved section once build is reached. It reopens that
  section, and the answer plus each cited Feedback become rules `section <id> N`.

`pageSha256` hashes `index.html`, its manifest and the local files the page names. It drives the
"revise before asking again" `first` line, so a CSS-only revision counts.

Verdicts bind the approval they were given under, so re-approving a changed description makes every
section ask again. Rules apply going forward; they never silently re-open accepted sections.
Section verdicts are owner review of work in progress. They are not Visual Acceptance of the page,
and Component Conformance stays the build provenance check.

**Runtime-review (point 8).** The owner asked that section comments use the existing runtime-review
capability. Its contract cannot take a web section as it stands:

- the manifest schema fixes `acceptedDesign.kind` to `playground-selection`;
- it requires a component-first v2 artifact, UI IR, a pattern catalog, DTCG tokens, a design-code
  map, declared sources, a captured observation and an evidence receipt, none of which the
  `next`/`decide` web workflow produces;
- its own design limits it to "object browsing and feedback" on an offline page: objects are chosen
  from a list of UI IR ids, not clicked on the live page.

Three options were weighed:

| Option | What it means | Verdict |
| --- | --- | --- |
| (a) | Extend runtime-review's contract for web sections. Before every section review the agent would author six to eight files. | Deferred to a planned follow-up change (owner decision). It extends the runtime-review contract, for example with clickable regions on a captured section screenshot, so it gets its own security review. |
| (b) | Record section comments through `decide` (extending the existing verdict → rule record), and cite runtime-review Feedback records when a project already has its inputs. | Taken. |
| (c) | Build a click-to-comment overlay. | Rejected: it is a new feedback system. Clicking comes with (a), inside runtime-review. |

`reviewFeedback` accepts only contained files that validate against the `Record` definition in
`skill/references/runtime-review.schema.json`. It reuses `runtime-review-core`'s `validateShape`,
now exported and required lazily, instead of a hand-written partial check, so a record that
runtime-review's own schema rejects is refused with the validator's message (`CONTRACT_INVALID`).
It stores each record's path, hash, object and category, and it does not re-check bundle lineage,
which stays `runtime-review check`'s job. The test fixture
`tests/fixtures/runtime-review-record.json` holds bytes written by the real `runtime-review build`
and `runtime-review record` commands.

Point 8 ships in two steps (owner decision). This change: section comments are text that names
elements, and Feedback is cited when a project already has runtime-review inputs. Planned follow-up:
a separate change that extends runtime-review so the owner clicks elements on a captured screenshot
of the section and the click produces the Feedback that `--evidence` cites.

Until then the section ask says so. Its instruction reads "Comments are text: ask them to name each
element they comment on by its text, label or place, and do not offer to let them click or pick
elements on the page." No prompt claims element picking.

### 7. Every "no" becomes a rule

The owner decided that every "no" becomes a rule, including the ones given in conversation.
`addRule` appends `{text, from, scope: "project"}`, the same record a rejected draft writes, with
`from` set to one of:

| `from` | Source |
| --- | --- |
| `playback N` | A playback correction (`intake --verdict reject`). |
| `anti-goal N` | Each `--anti-goal` given with the confirmed playback or a skip; a text already among the rules is not added again. |
| `variants N` | A variants rejection. |
| `decisions N` | A decision-round correction (`components --verdict reject`). |
| `description N` | A description rejection. |
| `section <id> N` | A section rejection: its answer and each cited Feedback. |
| `draft N` | A final review rejection (unchanged). |

`N` counts that kind of "no" so far, per section for `section <id> N`. Every reason meets the
minimum-content rule (Decision 2). `next` returns the rule texts on every action before `done`; the
`done` action has no `rules` field. Rules are never removed; the owner's later decisions refine
them.

### 8. Final acceptance stays

`review`, `probe` and `deliver` are unchanged, including the review's binding to the interaction
gate hashes and the component decision digest, and delivery's binding to the review. For web, the
review's `why` now reads as final acceptance after the section reviews instead of "the second human
decision".

## UX point → implementation map

| # | Point | Stage / next action | decide record | Rule | Lineage |
| --- | --- | --- | --- | --- | --- |
| 1 | Skip line + one open question | `intake` ask: `question` (the skip line, then one open question) | — | — | — |
| 2 | Facts are the agent's job | `intake` and `components` `instruction` | — | — | — |
| 3 | Style: open questions, then grilling | `intake` instruction; `components` numbered rounds with plain-language options | `components` (unchanged); `components --verdict reject` | `decisions N` | component digest → description |
| 4 | Skip states its decisions | `intake` `skip`; quick `intake` run | `intake --choice skip` (stated, at least six words), with `--anti-goal` | `anti-goal N` | playback → description |
| 5 | Playback until confirmed | `intake` ask with `correction` | `intake --verdict accept/reject`; accept with `--anti-goal` | `playback N`, `anti-goal N` | playback → description |
| 6 | Switchable variants, mix | `concepts` run (page and switcher) and ask | `concept --choice A,B,C` / reject | `variants N` | pick → description; switcher may not ship |
| 7 | Approved description gate | `description` run and ask | `description --verdict accept --choice <ids of the ## Sections list>` | `description N` | brief bytes and upstream → sections |
| 8 | Section build; text comments that name elements (clicking elements: planned follow-up) | `build` section loop; section ask | `section --choice id --verdict … [--evidence]` | `section id N` | approval → section verdicts |
| 9 | Every "no" is a rule | all of the above | — | `state.rules` | — |
| 10 | Final acceptance stays | `review` (unchanged) | `review` | `draft N` | interaction hashes, component digest |

## Lineage chain

```text
playback ─┐
variant ──┼─▶ description approval (brief.md bytes + upstream + sections) ─▶ section verdicts ─▶ build done
components┘                                                                   (index.html + manifest)
                                                                                        │
                       interaction gate (index.html, loaded files, DESIGN.md, MOTION.md) ◀┘
                                     │
                                     ▼
                      final review (gate hashes + component digest) ─▶ delivery
```

A component decision change still drops the interaction pass and delivery
(`invalidateCheckedEvidence`). At standard and full it now also makes the description approval
stale, so `next` returns to the description and then to each section before probe.

## File ownership

| File | Change |
| --- | --- |
| `skill/scripts/workflows/web.cjs` | Stages, actions and the web decide records (`decisions` export), now including the components record moved from `workflow-core.cjs`; the minimum-content rule; the shipped-switcher check. |
| `skill/scripts/workflow-core.cjs` | `decide` stage enum, delegation to the web records (components included) and the `--anti-goal` placement check; art-director routing for section asks. |
| `skill/scripts/workflows/shared.cjs` | Web review `why`; `invalidateCheckedEvidence`, moved here from `workflow-core.cjs` and exported for core and web. |
| `skill/scripts/cli-core.cjs` | `decide` help; `--evidence` passthrough; one new repeatable flag, `--anti-goal`, registered in `REPEATABLE_OPTIONS` and passed to decide as `antiGoals`. |
| `skill/scripts/runtime-review-core.cjs` | Exports `validateShape`, which `reviewFeedback` reuses. |
| `skill/tools/variant-switcher/` | New packaged tool, listed in `references/package-resources.json` and the tools index; it forces hidden variants out of the layout. |
| Guides | `SKILL.md` (an ask's `first`, `correction` and `skip`), `workflow-web.md` (new `## description` section), `web-direction.md`, `stages.md`, `pipeline-reference.md`. |
| Tests | Folded into existing suites: `tests/workflow-next.test.cjs`, `tests/web-concept-screening.test.cjs` and `tests/workflow-components.test.cjs`, with the shared walk in `tests/helpers/web-flow.cjs` and the real fixture `tests/fixtures/runtime-review-record.json`. No new test file. |

## Compatibility and migration

- **No new state schema.** The new records are optional `decisions` fields (`playbacks`, `variants`,
  `rounds`, `descriptions`, `sections`) and entries in `state.rules`; no `state.gates` entry,
  receipt, schema identifier or feedback record format is added. A web intake recorded by the old
  form, and a concept picked before variant history existed, still complete their stages.
- **Web projects finished before this change get no exception:** they follow the new flow like any
  other project, so `next` returns the first stage the new flow still needs.
- **In-flight standard/full web projects** keep their intake, concept and components records. They
  are asked to approve the description, then to review each section; an existing `index.html` gains
  `data-section` markers as the loop reaches each section. Nothing is waived silently.
- **In-flight quick web projects** first record the stated-decision line.
- **Web `decide --stage intake --answer` without `--verdict` or `--choice skip`** is refused with a
  fix naming the three forms.
- **`decide --stage concept --choice 1|2|3` for web** is refused. Film keeps numbers and edit keeps
  `mad|pv`.
- **CLI:** one new flag, the repeatable `--anti-goal <text>` (Decision 2). `--stage` accepts
  `description` and `section`. On a film, edit or ui project these stages and `--anti-goal` are
  refused before any state change.

## Risks and trade-offs

- **More asks per project.** Each ask is small, and nothing is built twice for a wrong first screen.
- **Section markers.** The `data-section` markers are a new markup convention. They are checked only
  by presence, so a page that drops a marker returns to building that section. HTML comments are
  stripped before every marker check, so a marker left in a comment
  (`<!-- TODO: data-section="rail" goes here -->`) does not count as a built section.
- **CSS-only revisions.** `pageSha256` follows the local files the page names, not runtime imports
  from inside scripts, so the "revise first" hint can miss such a revision. It is only a hint and
  never blocks a verdict.
- **Brief bytes.** Binding the approval to `brief.md` bytes means a typo fix asks for approval again,
  and therefore for section reviews again. This is deliberate: the owner approved those bytes. It is
  also why the project rules stay out of the brief (Decision 5): a rule recorded mid-build needs no
  brief edit, so it does not reset accepted sections.
- **A changed reference keeps the approval (owner decision).** In replicate mode `reference.md` is
  not in the approval's `upstream`, so a reference changed or recorded again after the approval
  keeps the description approval and the section verdicts.
- **A playback correction after delivery (owner decision).** It reopens intake, the description and
  each section, but the final review is not asked again while the checked page bytes and the
  component decision are unchanged, because the review binds the interaction gate hashes and the
  component digest. A rule from such a correction reaches the final review only if the page changes.

# Web workflow

Motion-first websites and pages. `designer-pipeline next` names the current stage; read only that
section. Stage order:

- `quick` brief/freeform: intake, components, build, probe, review; `quick` replicate: intake,
  reference, components, build, probe, review.
- `standard` and `full` brief/freeform: intake, reference, concepts, components, description, build,
  probe, review, deliver. Replicate keeps the reference direction and omits replacement concepts:
  intake, reference, components, description, build, probe, review, deliver.

At `standard` and `full` the agent talks before it builds: a conversation that ends in a playback
the owner confirms, three switchable first-screen variants (not in replicate), the concrete
decisions (component sources and the sections), and a one-page description. Only then is the page
built, one section at a time, each reviewed, before the owner's final review. `quick` states what
was decided for the owner instead of asking, and still ends with the owner's final review: a
passed probe shows the page works, never that it looks right.

By default the owner meets the work three times: the playback, the variant pick and the final
review. Component sources, the description and each section review are the agent's
**self-checks**: `next` returns them as a run with `selfCheck: true`, a `check` to make against
what the owner already settled, a `command` that records the result `--by agent`, and a
`correction` (`--by owner`) for a "no" from the owner. Ask the owner during a self-check only
about a trade-off they have not settled: something that changes cost, content or behaviour, and
for component sources only a new dependency, a license obligation or a notable cost. Ask it in one
message: what is new, your recommendation and its cost, and how they can see the difference.
Record their answer with `--by owner --tradeoff "<what you asked>"`: the command with `--by owner`
in place of `--by agent` when they take your recommendation, the correction when they say no. The
owner can keep any self-check as their own ask with `--keep` on the playback record; the playback
offers "review each section with me" as `--keep section`. The diligence statement shows each
trade-off you asked beside the owner's answer.

**When the owner says "not now".** Record it with `decide --root <project> --project-root <project>
--later`, adding `--until <ISO time>` with the offset of the owner's time zone when they name one (`2026-10-16T09:00:00+08:00`); nothing else
goes beside it. Until then `next` returns `blocked` (kind `owner`, exit 2) with the `deferred`
question and its `record` command: do not ask again before the time unless the owner writes, and do
not build on a guess about their answer. `next` asks again once the time passes, once what is asked
or the page it is about changes, once another ask is current, or once any answer of the owner's is
recorded; when the owner writes earlier, just ask and record the answer as usual. Your own records
do not end it. This works the same for every deliverable.

**Catching the owner up.** When you decided anything under your delegation or a check ran since the
owner's last recorded answer, an owner ask carries `away` (`since`, `decided`, `checks`, `needed`)
and its `first` starts with that: tell the owner in a line or two what happened while they were
away, then ask the one question. Stale acceptances and their before/after pictures follow in the
same `first`, as before.

Every ask and self-check carries `language`: speak to the owner in the project's language (the
brief's, else the one the owner writes in), translating the wording `next` returns while keeping
commands, ids and file names unchanged.

Each project keeps a delegation map in `state.delegation`: per checkpoint (`decide --stage`
names plus `creative-intent`), whether the owner or the agent decides it. The intake ask carries
it as `delegation`; tell the owner in the playback what you will decide, and record their changes
on the intake record with repeatable `--delegate <checkpoint>` and `--keep <checkpoint>`. Every
`decide` names its recorder with `--by owner|agent`; returned commands already carry it.
`--by agent` is refused where the owner decides, and always for final acceptance and creative
intent. An agent never records a "no": `--by agent --verdict reject` is refused except for an art
director's pick under `--director`. An agent cannot accept a section or description the owner
rejected until it changes (`WORKFLOW_NOT_READY`).

Every "no" the owner gives on the way becomes a rule in `state.rules`, the same record a rejected
draft makes. The rule's `from` is `playback N`, `anti-goal N`, `variants N`, `decisions N`,
`description N`, `section <id> N` or `draft N`. A rule binds to what it was about:

- a section "no" binds to that section and is returned, as `section <id>: <text>`, until the
  section is next accepted;
- every other "no" (playback, variants, a decision round, the description, a draft) binds to the
  result under review, because it shapes the whole build, and is returned until the owner accepts
  the page;
- an anti-goal of the confirmed playback or stated skip is a project rule from the start, and is
  not added again when a project rule already has its text.

When the owner says "from now on", add `--scope project` to the record of their "no"; `--scope`
on a record without a "no" is refused. `next` lists the open rules in `rules` on every later
action; a retired rule stays in `state.rules`. The final review carries `ruleCandidates` (every
rule bound to one object, open or retired): ask the owner once whether to keep, for the rest of the
project, those given about more than one thing or phrased as a principle, and add
`--promote "<from>"` (repeatable) to their review record for each one they keep. Promoting an
origin promotes every rule recorded with it, and nothing changes scope without the owner's answer.

A recorded decision or "no" must say something. A decision you state for the owner (a skip line,
the confirmed playback) needs at least six words, two CJK characters counting as one: "OK, start.",
"just start" or "默认" is not a skip line. Every "no" (a playback, variants, decision-round,
description or section correction, a combine note, each `--anti-goal`) is the owner's own feedback
and is taken as given: it needs at least two words, each CJK character counting as one, so
"首屏太暗了", "太挤" or "Too dark" is a complete reason and a bare "no" or "ok" is not. Never ask the
owner to lengthen feedback; when a short reason is ambiguous, ask about the real ambiguity
("brighter background, or more text contrast?"). Shorter records are refused with
`CONTRACT_INVALID` and change nothing.

For new-site design, existing-site redesign or visual critique, use [taste-skill.md](taste-skill.md)
to select and read the complete built-in method. On an existing site, audit brand, routes, content,
states and stack before changing its design. Preserve supplied references in replicate mode;
Taste's generate-first preferences do not require replacement images. Image concepts and brand
boards use the matched image-only method with an available provider, then become selected
reference/concept inputs through the existing workflow. No external Taste install is required.

## intake

Facts are the agent's job. Before asking, take what you can from the conversation and the
project's files (README, existing pages, `DESIGN.md`, brand assets; in an existing project run
`project inspect`), and never ask the owner for something you can look up.

At `standard` and `full`, `next` returns an ask with no question list, options or recommended
answer. Its `question` is the opening: the skip line ("If you'd rather skip these questions, say
so: I'll tell you what I assumed, then show you options.") followed by one open question ("What site have you seen recently that felt the
way this page should, and what about it?"; in replicate mode, "What must stay exactly as it is in
the page you want reproduced?"). Send it as its own message, as it is. Then:

- Ask one open question per message, with no list of example answers unless the owner is stuck.
- Anchor on real specifics (a site they saw, the moment a visitor arrives). Ask what would make
  them wince (the anti-goals: what the page must never be or do) and what they have seen elsewhere
  and loved or hated.
- When you can describe the page, play it back as a short card, one line each:
  - three intent lines: what the page expresses, who it connects with and how, what makes it
    unlike other pages;
  - the uncertainties still open;
  - one line on what you will decide and what stays theirs (the delegation line).

  Mark what the owner said as theirs and what you guessed as your guess, and end by asking what is
  wrong or missing. The card the owner confirms, recorded with its line breaks, is the project's
  creative intent: recording it with `--by owner` records creative intent as theirs (a
  one-paragraph playback records none). A stated skip leaves creative intent not
  stated by the owner.

An ask's `first`, when present, is a step for you before you ask its `question`. After a
correction, `first` says to play the page back again with the corrections applied, and `question`
is "What is wrong or missing in this?".

Record each reply with the command the ask returns:

| Owner's reply | Record | Effect |
| --- | --- | --- |
| Confirms the playback | `record`: `decide --stage intake --verdict accept --answer "<the playback the owner confirmed>" [--anti-goal "<anti-goal>" ...]` | `decisions.intake` holds the playback, marked `playback: "confirmed"`; intake is done |
| Corrects it | `correction`: `decide --stage intake --verdict reject --answer "<what the owner said is wrong or missing>"` | The correction becomes a rule (`playback N`) and intake stays open |
| Asks you to just start | `skip`: `decide --stage intake --choice skip --answer "<the line telling the owner what you decided on their behalf>" [--anti-goal "<anti-goal>" ...]` | Tell the owner that line first; `decisions.intake` holds it, marked `skipped: true` |

Replace the optional `[--anti-goal "<anti-goal>" ...]` in the `record` or `skip` command with one
`--anti-goal "<text>"` for each anti-goal the owner named, or drop it when there are none. Each
becomes a project rule (`anti-goal N`); a text that is already a project rule is not added again.
`--anti-goal` is refused with a correction (the correction is already a rule) and on any stage
other than web intake.

Each record is appended to `decisions.playbacks`, and a later correction reopens intake. Records
follow the minimum-content rule above; a web `--answer` without `--verdict` or `--choice skip` is
refused.

At `quick`, `next` returns a run instead: do not interview the owner. A quick piece is settled by
the request, the conversation and the project's files. Tell the owner in one plain line what you
decided on their behalf (what you will build, for whom, the look or reference you follow), then
record that line with the returned `decide --stage intake --choice skip --answer "<the line you told
the owner>" [--anti-goal "<anti-goal>" ...]`, with one `--anti-goal "<text>"` for each thing the
request rules out. Ask first only about something essential that you can neither look up nor
reasonably decide.

Web intake writes no `brief.md`: the brief is written later as the [description](#description).
A `quick` project started before quick intake existed records its stated line first.

## reference

For a local video run `reference analyze-video --path <contained-video> --output <new-dir>`.
Inspect ordered timed windows, record named target/property/state observations and uncertainties,
and bind `videoAnalysis` in the existing reference carrier. A note alone does not finish temporal
observation. Resample uncertain intervals with `--start <sec> --end <sec> --fps 12`; a local range
does not replace whole-source observation. In an existing project use `project inspect` and trace
the observed targets to actual renderer/component/material/animation source evidence.

Watch 1-3 moving web references at full speed and write `reference.md`: observed motion, timing,
easing, structure, and what to transfer. In `replicate` mode the reference is the thing being
reproduced and cannot be skipped. Otherwise the user may decline references
(`decide --stage reference --answer none`).

Use `reference-spec.md` for observed regions, invariants and unknowns; for reconstruction read
`reconstruction-spec.md` and applicable `3d-spec.md`. Record animation observations against timed
frames when supplied, and mark missing timestamps or uncertain motion. `reference.md` records
document delivery, not verified understanding. Full reference checks include graybox evidence;
do not require that aggregate to be ready before building the bounded graybox.

## concepts

Write `concepts.md` with three cards, `A`, `B` and `C`, with genuinely different first-screen
structures: vary the layout skeleton, focal element, type position and image role (including no
image), not just copy, colour or styling. Each card starts with its central idea as one sentence
about the page and a one-line `Skeleton:` declaration naming those four choices. Then record the
section arc (one line per section: what it is for and its dominant element), what carries the eye
down the page, the look, tools in one line, and any missing license.

Then build `concepts.html`, the variants page: one self-contained page with the three first screens
as real markup, each in an element marked `data-variant="A"`, `"B"` or `"C"` (with a short
`data-variant-name`), one shown at a time by `?variant=A|B|C`. Inline the packaged switcher,
`tools/variant-switcher/variant-switcher.js` ([how to use it](../tools/variant-switcher/README.md)):
it adds a floating bar with left and right arrows around the variant label, and the ← → keys do the
same; hidden variants stay hidden whatever the page's own `display` rules say. Until the page marks
all three variants and contains the switcher (`data-variant-switcher`), `next` returns a run with
the finding `variants-incomplete` or `variant-switcher-missing` and its fix. Markers inside HTML
comments do not count.

Before asking the owner, pre-screen the three variants: render each first viewport at the same size
and combine them into one contact sheet. Check it for structural divergence, a clear focal point and
readable hierarchy. Redo any same-skeleton, common-template or collapsed-hierarchy variant, rerender
and compare again without showing failed variants to the owner (`web-direction.md`). This
pre-screen is not Visual Acceptance and adds no gate or schema; only the owner picks a direction.

Then ask the owner to open `concepts.html`, flip through A, B and C with the arrows or the ← → keys,
and say which first screen to build or what to combine from them (for example B's header with C's
layout). Recommend the variant whose structure best serves what the visitor should do first, and
say why. Record:

- a pick: `decide --stage concept --choice B`;
- a mix: `decide --stage concept --choice B,C --answer "<what to take from each, in the owner's words>"`.
  Combining requires the answer, kept as `decisions.conceptNotes`;
- a rejection: `decide --stage concept --verdict reject --answer "<what is wrong, in the owner's words>"`.
  It becomes a rule (`variants N`) and reopens the stage. While `concepts.html` is
  unchanged, `next` tells you to redo what the rule rules out and pre-screen again before asking.

Letters are case-insensitive; numbers are refused. A pick is refused (`WORKFLOW_NOT_READY`) until
`next` has reached the variants ask. `decisions.concept` holds the pick (`B` or `B,C`) and
`decisions.variants` the history.
`quick` and replicate have no concepts stage and refuse concept records.

The variants are throwaway prototypes. Fold the chosen variant, and anything combined from the
others, into the real page, rewritten properly; the switcher never ships in `index.html` in any
form ([build](#build)). The first build step extends the chosen card with `## Treatment`
(`web-direction.md`); for a combination, extend the first card named and say what it takes from
the others.

When a Taste method is selected, record its exact entry, brief/dial read and adapted decisions in
these cards. For an explicitly requested web concept-image set, produce separate readable
horizontal images per section; do not confuse those images with implemented or tested UI.

## components

By default this is your self-check: settle the questions below yourself, from the project's files
and the chosen variant, and record the decision with the returned `command` (`--by agent`). Ask the
owner only for a new dependency, a license obligation or a notable cost (see the overview). When
the owner kept it (`--keep components`), it is the owner's ask described below.

A numbered round of concrete decisions, each with your recommended answer. At `standard` and
`full` it follows the variants (the reference in replicate mode) and comes before the
[description](#description); at `quick` it comes immediately before build. The ask's `questions`
are:

- `sections` (`standard` and `full` only): which sections the page should have, in build order,
  starting with the first screen. Recommend the chosen variant's section arc from `concepts.md`, or
  in replicate mode the reference's sections in its order. The sections the owner settles go into
  the description.
- `components`: where the components should come from. Its `options` are `{choice, label}` pairs;
  show the owner each option by its label and keep the `choice` id for the record:
  1. "Components this project already has" (`project`; name the paths you found).
  2. "A GitHub library you name" (`github`).
  3. "This skill's component index" (`index`: `references/component-source-catalog.json`).
  4. "Let me find open-source libraries" (`discover`: maintained component libraries and icon sets
     on GitHub beyond the index).
  5. "Write from scratch" (`scratch`).

Ask them as one numbered round: one `❓ Qn` per question with its body and options, then `➡️` your
recommended answer, and wait for the reply. Settle facts yourself first: find the project's
existing components and their paths, and the assets and their licenses, and name what you found
instead of asking for it. Add a question only for a concrete decision you can neither look up nor
settle from the conversation, such as whether supplied material is licensed for this use. A
question whose answer depends on one still open waits for a further numbered round, asked the
same way.

Record each "no" the owner gives in a round (a recommendation turned down, something ruled out)
with the ask's `correction` command:
`decide --stage components --verdict reject --answer "<what the owner turned down or ruled out, in their words>"`.
It becomes a rule (`decisions N`), is kept in `decisions.rounds` and does not record or
change the components decision. It is refused (`WORKFLOW_NOT_READY`) until `next` has reached the
components stage. Record the components decision once, after the last round, with the choice ids.

The recommendation is "Components this project already has first, then this skill's component
index, then let me find open-source libraries.", recorded as `project,index,discover`. Preserve the
user's exact nonempty reply in `decisions.components`; earlier intake does not replace this
decision. Supply `--choice` as a comma-separated set of
`project`, `github`, `index`, `discover` or `scratch`. Missing or unknown choices are rejected;
duplicates are removed and `decisions.componentSources` is stored in canonical
`project,github,index,discover,scratch` order. `scratch` is exclusive. Selecting `github` requires
an HTTPS GitHub owner/repo URL such as `https://github.com/owner/repo` in the unchanged answer.
`discover` needs no URL: the agent finds GitHub repositories and records each one with its pinned
license in the manifest (see [build](#build)).
Legacy answer-only web decisions ask again; do not infer the source set from prose. Recording a
different answer or set later, or the first explicit decision on a legacy state that already has a
checked page, drops the interaction pass and delivery; earlier review verdicts stay recorded but no
longer complete review. At `quick`, `next` then returns to probe, not build, so update `index.html`
and `component-manifest.json` for the new decision yourself before rechecking. At `standard` and
`full` the change also makes the description approval stale: `next` returns to the
[description](#description), then reviews each section again before probe.
Set `SKILL_ROOT` to the installed skill's absolute path and `PROJECT_ROOT` to the project's absolute
path, then record the reply using the returned command, equivalent to:

```sh
node "$SKILL_ROOT/scripts/designer-pipeline.cjs" decide \
  --root "$PROJECT_ROOT" --project-root "$PROJECT_ROOT" \
  --stage components --choice project,index,discover --answer "<the user's reply>"
```

## description

`standard` and `full` only: the stage that blocks building (not a `state.gates` gate). Nothing is
built until the owner approves a written description of it.

While `brief.md` is missing, `next` returns a run to write it. An owner-supplied brief with
different casing, such as `BRIEF.md`, is extended in place: keep the owner's words and extend them
rather than replacing them. `brief.md` is one page in plain words that a builder could work from
without asking again:

- what the page is and why;
- who it is for and the one thing a visitor should do;
- how it should feel, in the owner's words;
- goals, non-goals and anti-goals (what would make the owner wince);
- the chosen first screen (the variant and anything combined from the others), or in replicate mode
  what is reproduced, its invariants and what changes;
- a `## Sections` list of the sections in build order, first screen first (see below);
- where the components come from;
- constraints such as devices, assets and their licenses;
- which choices are the owner's and which are your calls, marked as yours.

Do not copy the rules into it: they stay in `state.rules` and come back with every action,
so a rule recorded later needs no edit here.

The `## Sections` heading is followed by one top-level list item per section (`- `, `* `, `+ `,
`1. ` or `1) ` at the start of the line), each starting with its id (backticks allowed) and giving
one line on its job: the rest of the item line after a `:`, `-` or `—`, with whitespace collapsed
(continuation lines are not part of it). The list ends at the next `#` or `##` heading. Ids are lowercase letters,
digits and hyphens, each listed once; `all` and `none` are reserved for `--affects`. A section named only in prose does not count. For example:

```md
## Sections

- hero: today's bakes and the reserve button
- `menu`: the week's bread, with prices
- visit: opening hours, map and the reserve button again
```

By default the approval is your self-check: check `brief.md` against the confirmed playback (or
the stated skip), the chosen variant and the component decision, then record the returned
`command` (`--by agent`). When the owner kept it (`--keep description`), show it and ask: "Here is
the one-page description of what I will build (brief.md). Approve it, or tell me what is wrong?"
Record:

- an approval: `decide --stage description --verdict accept --choice hero,menu,visit`
  (optionally `--answer "<the owner's words>"`). `--choice` must equal the `## Sections` list
  exactly, in its order; a missing list, an item that does not start with a valid id, a duplicate
  or a different `--choice` is refused (`CONTRACT_INVALID`, naming the list). The approval is
  refused (`WORKFLOW_NOT_READY`) until `next` has reached the description and `brief.md` exists.
  After that it can be recorded again at any later stage to correct it.
- a rejection: `decide --stage description --verdict reject --answer "<what is wrong, in the owner's words>"`.
  It becomes a rule (`description N`); while `brief.md` is unchanged, `next` asks you to
  revise it before asking again.

The approval stores its `inputs`: the `brief.md` bytes, each section's line, the confirmed
playback, the direction (the chosen variant and its notes) and the component decision. It fixes the
sections the page is built in. Any change to them makes it stale: `next` returns here, and its
`first` names what changed and which `--revision` fits, and the returned commands already carry
it (`--affects` stays a placeholder for you to fill). Re-record the approval with the tier of the
change:

- **Wording only** (the brief's prose, not a section line): `--revision bytes`. No section is
  reviewed again.
- **A commitment** (a goal, a section added, removed, reordered or reworded, a new playback, a
  re-picked variant, a different component decision): `--revision commitment --affects <ids>`,
  `all` or `none`. Name the sections the change touches.
  - Sections whose own line changed, and every section when the direction or the component
    decision changed, are reviewed again either way.
  - A section added back after a removal is reviewed again.
  - A reorder keeps the verdicts and the build follows the new order.
  - `--revision bytes` is refused (`CONTRACT_INVALID`, naming the change) whenever one of these
    changed.

A first approval, and the identical approval recorded again, take neither flag and keep the
section verdicts. When the owner kept the description, a `--revision bytes` re-approval is yours to
record with `--by agent`, as long as their latest record on it is an accept: `next` returns it as a
`run` with `carryForward: true` and the command, not as an owner ask. If the reworded prose changes
what the page promises, show the owner instead and record a commitment. The diligence statement
lists it as a carried-forward change. Anything else on a kept description, including an approval
after their "no", is theirs. An approval made before change tiers counts as a first one, and its
sections are reviewed once more. History is in `decisions.descriptions`.

## build

At `quick` build the whole page in one pass: `index.html` from the decisions you told the owner, or
in replicate mode from the reference and its invariants. At the `full` tier, open an OpenSpec
change under `openspec/changes/<id>/` first and build inside it.

At `standard` and `full` the page is built in the sections of the approved description, first
screen first, and the owner reviews each section before the next one starts:

1. **First screen only.** This step (no page yet, or a page whose first section is not marked)
   carries the full instruction, starting with the component decision. At `full`, open the
   OpenSpec change first. Unless replicating, extend the chosen card in `concepts.md` with
   `## Treatment`: its section arc lists exactly the sections of the approved description's
   `## Sections` list, in that order. A different arc goes back to the owner as a description
   correction before anything is built. Then write a brief per section (`web-direction.md`); the
   briefs land in `design.md`, `motion.md`, `component-state-matrix.json` and `interaction.json`.
   Then build only the first section into `index.html`, from the chosen variant and the approved
   description (in replicate mode, from the reference and its invariants), inside an element
   marked `data-section="<id>"`, with the component manifest below.
2. **Review it.** Once the page and its manifest are valid and the section's marker is in
   `index.html`, the section is reviewed (the action carries `section: <id>`). By default this is
   your self-check: open the section in a real browser, check it against the confirmed playback,
   the chosen direction, its section brief and the rules, fix what does not match, then record
   `decide --stage section --choice <id> --verdict accept --by agent`. When the owner kept section
   reviews (`--keep section`), `next` asks them instead: "The <id>
   section is built (k of n). Look at it in the page: accept it as it is, or tell me what to
   change, naming each element by its number on the numbered page or by its text, label or where it
   sits?". Its `first` step offers the [numbered page](#element-references): run `evidence refs`
   when there is no capture of the current page, then show `evidence/refs.png`. Open `index.html`
   at the section in a real browser and let the owner look and interact. Comments are text: ask
   them to name each element they comment on by its reference (`hero-2`) or by its text, label or
   place, or let them click elements on the [review page](#element-references) when `first` offers
   it. Record `decide --stage section --choice <id> --verdict accept` only when
   nothing in the section needs to change. Any change they ask for is a rejection:
   `decide --stage section --choice <id> --verdict reject --answer "<the owner's comments>" --ref hero-2`,
   with one `--ref` per element they cite. Each comment becomes a rule (`section <id> N`), and a
   cited element travels with it to every later action's `rules`. Revise the section before asking again: while
   the page (`index.html`, its manifest and the local files it names) is unchanged since the
   rejection, `next` tells you to revise first.
3. **Next section.** `next` returns a run with `section: <id>` for the next approved section: build
   it from its brief inside its own `data-section` element, keep the accepted sections as the owner
   accepted them unless a rule requires a change, and add every component it uses to
   `component-manifest.json`. Then review it as in step 2.

A section can be accepted only while `next` asks about it or returns its self-check
(`WORKFLOW_NOT_READY` otherwise, including while the build run shows findings); any
built section of the approved description can be rejected again later, which reopens it. A page
that drops a section's marker returns to building that section; a `data-section` marker inside an
HTML comment does not count. A verdict binds its section's key: the section's line, the direction,
the component decision and how often a re-approval reopened it. A section counts as accepted while
its latest verdict is an accept under its current key, so a wording change keeps every verdict, and
an owner's "no" holds even if the line is changed back (see [description](#description)). Rules
apply going forward and never silently reopen accepted sections. With `--director`, the section
asks go to the art director, which records with `--by agent` and is named on the record; final
acceptance never goes to the director. History in `decisions.sections`.

When the project already carries runtime-review inputs ([runtime-review.md](runtime-review.md)),
Feedback the owner leaves on its runtime-review page can be recorded with `runtime-review record`
and cited on the rejection with `--evidence runtime-review/feedback/<hash>.json` (repeatable, with
or without `--answer`). Each cited file must be contained in the project and valid against the
`Record` definition of `references/runtime-review.schema.json`, checked with runtime-review's own
validator; otherwise the record is refused (`CONTRACT_INVALID`) with that validator's message.
Each Feedback becomes a rule `<objectId>: <actual> Expected: <expected>`. The workflow
checks only the record's shape; `runtime-review check` stays the authority on its bundle lineage.
Ordinary web projects do not have those inputs: runtime-review needs a component-first artifact,
UI IR, tokens, a design-code map and a captured observation, which this workflow does not produce.
Their comments are text that names elements by their text, label or place.

A section verdict is the owner's review of work in progress, not Visual Acceptance of the page; the
final [review](#review) is.

Follow the component decision and write the manifest below before building `index.html`. Motion
follows `web-motion.md` (spring-damper parameters, stepped motion as a style); design tokens and
components come from `pipeline-reference.md`.

Honor `decisions.components` and its explicit `decisions.componentSources` set: reuse the specified
project paths, inspect the named GitHub library, search the index, find open-source sources, or
author the components from scratch as selected. When searching, search the index first:

```sh
node "$SKILL_ROOT/scripts/designer-pipeline.cjs" design-system route \
  --root "$PROJECT_ROOT" --query "<page brief>" --platform web
node "$SKILL_ROOT/scripts/designer-pipeline.cjs" design-system search \
  --root "$SKILL_ROOT" --snapshot "$SKILL_ROOT/references/component-source-catalog.json" \
  --query "<page brief>" --platform web
```

The route and search with `--platform web` use the component-source index; search without a
platform or explicit snapshot retains Astryx. Load only returned entries and needed source guides/implementations, not every
catalog. Keep catalog artifacts inside the selected root.

When `discover` is selected and nothing indexed fits, look for maintained open-source component
libraries or icon sets on GitHub yourself, using the method in `tools/open-source-design.md`. Read
the repository's license at the exact commit or tag you will use and record its manifest entry
before using it. Prefer genuinely reusing a fitting source over hand-writing an equivalent. Without
`discover`, stay within the selected sources.

Choose fonts through `tools/fonts.md`; do not silently fall back to the system stack unless the
treatment (in quick and replicate builds, the page's direction) deliberately calls for it. Record
the chosen family under Typography in `DESIGN.md`, where the audit probe's `thresholds.fonts`
reads the approved families ([probe](#probe)). Bundle or self-host discovered code and fonts
inside the project and keep their license notices: the page loads no CDN scripts or remote fonts
at runtime (`web-motion.md#self-contained-pages`).

Before writing `index.html`, write project-local `component-manifest.json`. Its `entries` array
records every component source used. The existing catalog core's
`validateComponentManifest` checks this evidence; the web workflow stays at build if it is invalid.

```json
{
  "entries": [
    {
      "name": "Project navigation",
      "sourceId": "src/components/Navigation.tsx",
      "availability": "project-owned",
      "license": { "state": "project-owned" },
      "usedIn": [{
        "file": "index.html",
        "marker": "Navigation",
        "how": "Adapt the project's Navigation component"
      }]
    }
  ]
}
```

The example requires the source file to exist and `Navigation` to appear in `index.html`. A
discovered library copied into the page looks like this; the angle-bracket values are the ones you
checked:

```json
{
  "name": "<library>",
  "url": "https://github.com/<owner>/<repo>",
  "revision": "<commit SHA or tag>",
  "availability": "bundled-implementation",
  "license": {
    "state": "verified",
    "id": "MIT",
    "evidence": ["https://github.com/<owner>/<repo>/blob/<commit SHA or tag>/LICENSE"],
    "file": "licenses/<repo>.txt"
  },
  "usedIn": [{
    "file": "index.html",
    "marker": "<import path or class>",
    "how": "Copy <library> into vendor/<repo>.js; keep its MIT license notice in licenses/<repo>.txt"
  }]
}
```

For each entry:

- `name` is nonempty. `sourceId` resolves to an indexed source in
  `references/component-source-catalog.json`, or names an existing project-owned file inside the
  project. Alternatively, `url` names a GitHub repository URL present in the recorded components
  decision, a discovered GitHub repository (below), or a contained project-owned file path/file
  URL. Cite an indexed source by its `sourceId`: a URL of its GitHub repository, or a deep link into
  it, is rejected unless it is the decision-named repository URL, and a deep link inside a named
  repository is rejected in favour of the repository URL. Other URLs (npm pages, project
  homepages, other hosts), URLs with credentials and invented IDs do not resolve. Containment
  follows real paths, so a symlink cannot point outside the project.
- `availability` is `bundled-implementation`, `downloaded-implementation` (index entries whose code
  `designer-pipeline sources fetch` installs: MengTo and iart; their search commands return the
  installed paths), `reference-link`, `metadata-only` or `project-owned`.
  `license.state` is `verified`, `unverified`, `commercial`, `project-owned` or `platform`.
  An indexed source's license state matches the index, including when identified by its named
  GitHub repository URL. Project files use project-owned availability and license state.
- Any other `https://github.com/<owner>/<repo>` URL (neither named in the decision nor indexed) is a
  discovered source; GitHub pages such as `topics`, `orgs`, `sponsors` or `marketplace` are not
  repositories. It needs availability `bundled-implementation`, `reference-link` or
  `metadata-only`, a `revision` (the commit SHA or tag you checked, never `HEAD`, `main` or
  `master`), `license.evidence` (a non-empty array of https URLs, at least one on the same
  repository whose `blob`, `tree`, `raw`, `commit`, `releases/tag` or `archive` ref is exactly the
  revision, such as `https://github.com/<owner>/<repo>/blob/<revision>/LICENSE`; the URL path is
  compared undecoded) and `license.state` `verified`, `unverified` or `commercial`, never
  `project-owned` or `platform`.
  Record `license.id`, the SPDX expression at that revision, whenever you know it; copying or
  importing requires it (below). Validation checks this auditable shape offline; it does not fetch
  the evidence or authenticate the upstream repository, revision or license.
- Each entry's source category must be in the recorded `componentSources`, judged by how it cites
  its source: `project` for a contained project file or the indexed `project-components` record,
  `github` for a decision-named GitHub URL, `discover` for a discovered GitHub repository, and
  `index` for every other indexed `sourceId`, `platform` records such as `native-dom` included. To
  use a named GitHub library under a `github`-only set, cite it by `url`, not by its indexed
  `sourceId`. Scratch keeps its own rules below.
- Every `usedIn` has an existing contained `file`, a nonempty `marker` that literally appears in
  that file, and a nonempty `how`. Choose a real import path, class name, custom element name or
  component identifier as the marker, not a fabricated usage description.
- `how` describes use. Unverified/commercial sources allow only study/reimplementation, never
  copying or importing; availability does not grant permission. A `how` that bundles, vendors,
  self-hosts or downloads the source counts as copying. For example:
  `Study and reimplement the Navigation interaction independently`.
- For verified imports/copies, `how` explicitly records attribution/license-notice handling,
  for example `Import Navigation; retain upstream copyright/license notices in LICENSES.md`.
  This documents handling; validation does not independently audit legal compliance or verify
  a non-indexed repository's declared license.
- Copying or importing a discovered source requires `license.state: verified`, a permissive
  `license.id` (`MIT`, `Apache-2.0`, `BSD-2-Clause`, `BSD-3-Clause`, `ISC`, `0BSD`, `Zlib`,
  `Unlicense` or `CC0-1.0`; the whole id, case-insensitive) and `license.file`: a non-empty file
  contained in the project that holds the copied license text. Validation does not read the text
  to recognise the license. Anything else, including compound expressions such as
  `MIT OR Apache-2.0`, allows only study/reimplementation.

For the exclusive `scratch` set, write `{"fromScratch":true,"entries":[]}` or include only
project-owned entries satisfying the same per-entry rules. `fromScratch: true` is required;
the answer language (including `从零写`) does not determine scratch status. For every nonscratch
set, `fromScratch: true` is forbidden and `entries` must be nonempty. These rules use the explicit
source set, not inferred library names or phrases in the answer.

Build finishes only when `index.html` and a valid manifest both exist, `index.html` does not carry
the variant switcher in any form and, at `standard` and `full`, every approved section is accepted
under the current description approval. At every tier, build stays open with the error finding
`variant-switcher-shipped` ("index.html ships part of the prototype variant switcher: <what>.")
while `index.html`, with its HTML comments removed, carries `data-variant` or `data-variant-name`
panels, any `variant-switcher` text (`data-variant-switcher` markup, an inline script, or a
`<script src>` naming it, local or remote), or a local `<script src>` file whose content contains
`variant-switcher` (a renamed copy). Remove the switcher, its script and the panels; at `standard`
and `full` outside replicate they belong only in `concepts.html`. Invalid evidence returns
the build instructions with the validator message and an existing finding whose `code` is
`CONTRACT_INVALID`, `severity` is `error`, `message` is that validator message, and `fix` gives
remediation. Repair the reported manifest/source-set, source identity, license declaration or
file/marker provenance before running `next` again. This is Component Conformance stage-completion
evidence, not a new gate or receipt schema, and does not grant Visual Acceptance.

Apply the selected Taste source through the approved design and existing component/runtime owners.
Keep complete requested artifacts, real content and loading/empty/error/focus states. Bind
image-to-code inputs to the existing reference evidence and inspect actual renders for drift;
Stitch semantic output must use the project-owned Google-format foundation via design-synthesis.

Use `tools/README.md` when a bounded visual task needs drawing, image placement, text fitting,
material techniques or pixel comparison. Load only that tool, preserve the existing DOM/runtime,
and inspect the resulting surface at its real viewport. Source tools support the chosen direction;
their example styles, coordinates and characters do not define the product.

For page/component styles, follow `good-css.md` and its matched original entries across CSS,
utility classes and CSS-in-JS. Prefer a fitting intrinsic/native solution, preserve project
DESIGN/MOTION tokens, and verify target-browser support and usable fallbacks. Use the bundled
offline specimen builder for a bounded study; keep film seeking and interaction evidence on
their existing routes. In probe/review, record applied entries and actual fallback, focus,
content/viewport and reduced-motion observations in the existing QA evidence.

For components, polish and accessibility, follow `ui-craft-sources.md` and load only the matched
sources: the component source from the catalog and `design-system route`, plus `shadcn` rules only
in a shadcn project or a selected shadcn-registry route; `emil-design-eng` and
`make-interfaces-feel-better` details expressed in the existing styling system; and
`fixing-accessibility` for every added control, form or dialog.

Before selecting a non-trivial UI state transition, read [UI transition rules](ui-transition-rules.md):
choose from the actual content/layout/overlay/navigation/list/value change, or explicitly keep it
static. Reuse the existing opportunity screen, project motion tokens and motion/task record.

Use the task fields in `stages.md#stage-4-tasks`: one visual goal with explicit inputs, scope,
outputs, checks and repair path. For references, first render bounded structure/occlusion in a
graybox. Then read complete `reference check`, `reconstruction check` and applicable `scene check`
results before dependent material, polish or motion; repair the reported prerequisite failures.
Follow reconstruction's existing permissions: graybox readiness releases optical treatment even
if geometry is blocked; detail geometry and fidelity claims still require their own readiness.
Creating files or passing engineering checks does not grant visual acceptance.

## probe

If `interaction.json` is missing, write it, schema `design-pipeline.interaction-probe.v1`: one probe
per key interaction (a section with no driver has none, but the page keeps at least one; see
`web-direction.md`) and one audit probe for the page. Every tier needs the audit: while the file
has none, `next` asks for it instead of returning the verify command.

```json
{
  "schema": "design-pipeline.interaction-probe.v1",
  "id": "landing",
  "url": "index.html",
  "viewport": { "width": 1280, "height": 800 },
  "probes": [
    {
      "id": "card-follows-pointer",
      "target": "#card",
      "input": { "kind": "pointer-sweep", "from": [200, 400], "to": [1080, 400], "durationMs": 600 },
      "expect": { "responds": true, "settleWithinMs": 1200, "returnsToRest": true, "response": "spring" }
    },
    {
      "id": "page-audit",
      "kind": "audit",
      "viewports": [{ "width": 1280, "height": 800 }, { "width": 390, "height": 844 }],
      "thresholds": { "fonts": ["Inter"], "fontSizes": [12, 14, 16, 20, 24, 32, 48], "minTargetPx": 24 },
      "declare": {
        "numbers": [".price"],
        "stacks": [".features", ".plans"],
        "controlContainers": [".toolbar"],
        "alignGroups": [{ "selector": ".hero", "items": ".hero > *", "edge": "start" }],
        "contentBoxes": [".card"]
      }
    }
  ]
}
```

The audit measures the rendered page at each of its `viewports` (default: the file's `viewport`),
after a fresh load, the fonts and two frames, against the codes in
`ui-craft-sources.md#measured-audit`. It needs the bindable local page: `url` names the project's
local `index.html`, and every asset the page loads (stylesheets, scripts, fonts, images, data) is a
file inside the project. An `http(s)` page or a page outside the project is a contract error before
the browser starts.

- `thresholds`: copy them from `DESIGN.md`; a list replaces its default. `fonts` is required: the
  approved families from `DESIGN.md`, so `audit.font-family` always runs. Defaults: `minFontPx` 12,
  `minTargetPx` 24, `minControlGapPx`, `minControlInsetPx` and `minLayoutGapPx` 8,
  `contrastNormal` 4.5 and `contrastLarge` 3 (text of 24 px, or bold at 18.67 px); the `fontSizes`
  scale has none.
- `declare`: selectors for what the markup means, so the delivered page carries no audit
  attributes: `numbers` (changing or compared values; numeric table cells are found without it),
  `stacks`, `controlContainers`, `alignGroups` (`edge` is `start`, `center` or `end`),
  `radiusPairs` (`outer`, `inner`) and `contentBoxes`. A declared selector that matches nothing
  fails, so a typo cannot pass.

No probe field can skip a subtree, suppress a finding or waive a result; any other field is
rejected before the browser starts. Unresolved results are fixed in the page, not in the probe.

Each check reports, per viewport, `passed`, `failed`, `not-declared`, `not-applicable` (nothing
visible in scope) or `indeterminate`, with a `checked` count; nothing checked is never `passed`.
Six optional checks measure only what is declared: `audit.tabular-numbers` (`numbers`, or the
page's numeric table cells), `audit.content-overflow` (`contentBoxes`), `audit.control-inset`
(`controlContainers`), `audit.layout-gap` (`stacks`), `audit.layout-alignment` (`alignGroups`) and
`audit.nested-radius` (`radiusPairs`). Without their declaration they report `not-declared` in the
coverage with a hint naming what to declare: it is never counted as passed and does not fail the
audit. Once declared, an optional check is judged like the others. `indeterminate` means the page
could not be measured, for example text over a gradient, image, translucent layer, filter, blend
mode or shadow; it fails the audit with the fix to put the text on a measurable solid surface or
scrim. A CDN or dev-server URL, or a file outside the project, fails the verifier's existing
`external-request` finding once per audit probe; copy the resource into the project and reference
it locally. A file outside the project that a motion or journey probe's interaction loads fails
that probe the same way. The audit fails on any `failed` or `indeterminate` result at any viewport.

Then run the `verify interaction` command `next` returns. It exits 2 when a probe fails, and 1 for a
malformed probe, a page the audit cannot bind or a selector the page rejects; neither records a
pass. In `evidence/interaction.json` each finding has its `code`, the element `selector` (a request
finding has none), the `viewport`, the measured `actual`, the `expected` threshold and a `fix`; the
audit row's `coverage` lists every check's status and count, with the hint of each `not-declared`
check. Apply the fix or declare what was not declared, and rerun. A pass binds the hashes of the
local files the page loaded and of `DESIGN.md` and `MOTION.md`; remote URLs (only a probe file
without an audit can pass with them) are recorded but never fetched or hashed. Editing
`interaction.json`, the page, any local file it loaded or the project's `DESIGN.md` and `MOTION.md`
afterwards reopens this stage, and with it review and delivery.

## review

Final acceptance of the whole checked page, after each section was reviewed in the build (at
`quick`, right after the probe). The section verdicts do not replace it. It is locked to the owner:
record it only with `--by owner`, and never route it to an art director.

Before showing the page, walk the `UC-` items of `ui-craft-sources.md#review-checklist` that apply
to what changed (motion feel and timing, focus, semantics, forms, copy, states). Record each result
by its id in `qa.md` as Component Conformance evidence, never as Visual Acceptance; record a rule
that conflicts with the project's precedence as not applicable. The measured audit already covered
the codes in `ui-craft-sources.md#measured-audit`. Name in `qa.md` the surfaces left unmeasured by
`not-declared` checks.

For changed UI transitions, also run the applicable manual cases in
[UI transition rules](ui-transition-rules.md#manual-review-matrix) and record the `TR-` ids and
observations alongside UC findings without duplicating them. These cases are not automated
`audit.*` checks or Visual Acceptance.

Show the page, its motion at full speed and a one-paragraph gate summary. When the build used a
treatment (not in `replicate` mode), the reviewer also reads W1 to W7 (`web-direction.md`) and
reports them under Visual Acceptance in `qa.md`; the agent never records acceptance and gate
findings stay Conformance. Offer the [numbered page](#element-references) as at a section review.

The owner accepts, or rejects with one sentence. Either way, record their own words from the
conversation: `decide --stage review --verdict accept|reject --answer "<the owner's words>"`. An
acceptance needs at least two words (each CJK character counts as one, so "可以" is enough and "ok"
is not), and the returned command holds a placeholder for them, never a ready-made acceptance. The
diligence statement shows their words and the page version they accepted. Add `--ref` for each
element a rejection cites; at the final review a reference outside the sections (`3`) counts too.

A rejection becomes a rule and returns to build: the page the owner rejected is repaired before it
is probed and shown again, so an unchanged page never comes back for review. A page changed after
the owner accepted it comes back to this review, and `first` says they accepted an earlier version.

## Element references

`evidence refs --root <project> --project-root <project>` numbers the built page for the owner:

- It loads `index.html` at desktop width (1440×900) and as an emulated phone shows it (390×844, mobile
  and touch emulation: a page without `<meta name="viewport">` lays out 980 wide, and
  `(pointer: coarse)` rules apply) in the browser the probe uses, scrolls through
  it so scroll-revealed content settles, and numbers the visible headings, text blocks, list items,
  links, buttons, form controls and media in document order: `<section>-<n>` inside each
  `data-section`, `<n>` outside every section (a page without sections is numbered `1, 2, 3`).
  Wrappers, hidden elements and content inside a numbered element (an image inside a link) get no
  number; a link inside a paragraph gets its own.
- It writes `evidence/refs.json` (each reference with its selector, tag, text and box; the page
  digest; the hash of every local file the browser loaded, CSS-imported fonts and images included;
  and the screenshot's own hash) and `evidence/refs.png`, the full page with a badge on each element,
  and the phone's `evidence/refs-mobile.json` and `evidence/refs-mobile.png`, whose references carry
  `m:` (`m:hero-2`). The badges exist only in the browser: `index.html` is never changed. The phone
  capture is an emulated Chromium phone, not a device check, and differs on purpose from the probe's
  width-only audit.
- A capture is current while all of those hashes still match; a current capture is never
  overwritten, so a number the owner has seen keeps its meaning. Each viewport is kept or taken
  again on its own; the result lists `captures` per viewport, and `status` is `current` only when
  both were kept. When one viewport fails, the other is still written and the command exits 1
  naming the failed one. After the
  page or any file it loads changes, run it again and show the new numbers. A section review routed
  to an art director offers the numbered page to the director.
- `--ref` is checked against these files: an `m:` reference against the phone capture, any other
  against the desktop one (case does not matter). The reference must be on the current capture and,
  at a section review, in that section. The rule keeps the reference with its tag and text, so a later
  renumbering does not change what the comment meant.
- It needs a browser and `puppeteer-core`, like the probe. When neither is available, ask the owner
  to name elements in words; only `--ref` needs a capture.
- **The review page.** With a current desktop capture, an owner's section or final-review ask also
  offers `evidence review-page --root <project> --project-root <project>`. It writes
  `evidence/review.html`: a copy of `index.html` with `<base href="../">` (so it loads the page's
  files from the project; the owner opens it where they open `index.html`) and a comment overlay.
  `index.html` is never changed. In comment mode the numbered element under the pointer is outlined
  and a click opens a comment on its reference (`hero-2`, or `m:hero-2` when the window is phone
  width); at a section review only that section's elements are numbered, and a click elsewhere is a
  comment on the section. Pending comments survive a reload. The owner submits once: **Request
  changes** (comments or words, at least two words in all) or **Accept** (no pending comments; words
  needed at the final review). Submit shows the block to copy and offers it as a download
  (`page-review-<digest8>.json`); nothing is sent anywhere. Save what they send back to a file inside
  the project and record it with `decide --root <project> --project-root <project> --page-review
  <file>` (only `--promote`, `--scope` and `--evidence` may go beside it; the block decides the
  rest, and any other flag is refused). It
  is recorded as the owner's verdict with their words, then each comment as `<ref>: <text>`, and
  every cited reference as `--ref`; the block is kept at `evidence/page-review/<sha256>.json`, and
  the role entry's `via` names it, shown as "given on the page" in the statement. A block from an
  earlier page version or desktop or phone capture, for another ask, or not valid is refused and records nothing. A
  directed section review or a delegated self-check has no review page. The block is the owner's
  submission as the agent received it: evidence bound to the page version, not proof of who
  clicked.
- **Before and after.** When the owner (or the art director, at a section) records a section or
  final-review verdict, each numbered screenshot current at that moment, and its reference list, is
  copied to `evidence/reviewed/<sha256>.png|.json` and named on the record (`captures`). When the
  same section or the final review is asked again and the new screenshot differs, `next` shows the
  copy (then) beside the new one (now) and says when and how that verdict went. A self-check keeps
  nothing; a deleted or edited copy is not shown.
- **What changed.** Each capture also records a fingerprint of the pixels inside every numbered
  element and every section (from a clean screenshot, before the badges), each section's box and its
  palette. Comparing two captures pairs elements within each section by tag and text in order, as a
  text diff pairs lines, so content that moved is still paired: a pair that looks different is
  changed, an unpaired one added or removed, and a section that looks different with no numbered
  element changed is listed on its own. A section that moved is compared by its size and palette,
  since its contents round to new pixels when it moves by a fraction of a pixel.
- **The page tier.** Once every section is built and accepted, a section the owner (or the art
  director) accepted with kept captures stays accepted after the page changes only while comparing
  those captures with current ones finds it unchanged at every kept viewport. Otherwise `next` asks
  about it again, listing the changed elements (`pageChanges`), or, without a current capture, saying
  it cannot be compared until the page is captured. Self-checked sections keep the key rule. The
  final review asked again after the owner's acceptance lists what changed since. The comparison
  never accepts anything: it only keeps a person's acceptance standing.

## deliver

`decide --stage deliver --answer <url or path>`.

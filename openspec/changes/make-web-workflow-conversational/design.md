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

`next` returns the rule texts on every action. The film sample stage is also the existing pattern
for a repeated ask: its verdict binds the bytes it judged, and a rejection of unchanged bytes adds
a `first` line telling the agent to redo the work before asking again.

## Goals and non-goals

**Goals:** the ten owner-approved UX points (proposal), using only the state file, decide records,
`state.rules`, the existing gates and the evidence lineage.

**Non-goals:**

- film, edit and ui flows;
- new gates, receipt schemas or feedback systems;
- changes to the runtime-review contract;
- enforcing conversation style in code. Word counts and "one question per message" are prompt text,
  not checks.

## Decisions

### 1. Stage sequences

| Tier and mode | Stages |
| --- | --- |
| Quick | `intake` (stated decision), `components`, `build`, `probe` |
| Quick replicate | `intake` (stated decision), `reference`, `components`, `build`, `probe` |
| Standard and full | `intake`, `reference`, `concepts`, `components`, `description`, `build` (section loop), `probe`, `review`, `deliver` |
| Standard and full replicate | the standard list without `concepts`, because the reference keeps its direction |

The hard gate (point 7) follows from stage order: `description` precedes `build`, so `next` returns
no build action until the description approval is current. If the approval goes stale later, `next`
walks back to it.

### 2. Intake is a conversation with two exits

The standard/full `intake` ask is:

- `first`: the skip line;
- `question`: one open, concrete question, with a different wording in replicate mode;
- `instruction`: the conversation rules (facts are looked up, one open question per message,
  anti-goals, prior art, a 200-300 word playback that marks the owner's words and the agent's
  guesses);
- three commands: `record`, `correction` and `skip`.

It has no `questions`, `options` or `recommended`, which is why the delta modifies the
`single next step` requirement.

`decide --stage intake` for web (`recordIntake`) accepts three forms:

| Form | Effect |
| --- | --- |
| `--verdict accept --answer "<confirmed playback>"` | Writes `decisions.intake = {answer, playback: "confirmed"}`. |
| `--verdict reject --answer "<correction>"` | Appends a rule `playback N` and reopens intake. |
| `--choice skip --answer "<one line of decisions>"` | Writes `decisions.intake = {answer, skipped: true}`. |

Every form appends to the history in `decisions.playbacks`. A bare go-ahead (`default`, `ok`,
`just start`, `默认` and similar) is refused: point 4 requires stated decisions, never silent
defaults.

Web intake no longer writes `brief.md`; the description stage owns it (Decision 5). Film, edit and
ui intake keep the four-question form and its brief-writing ownership rules unchanged.

The quick tier's `intake` is a `run` action: tell the owner in one line what was decided for them,
then record it with `--choice skip`. This is the "skip path natural" form of point 10's quick clause.

### 3. Concepts become a switchable variants page

The `concepts` run action asks for two files:

- `concepts.md` with cards A, B and C, using the same structural-divergence requirements as before;
- `concepts.html`, one self-contained page whose first screens are marked `data-variant="A|B|C"`
  and shown one at a time by `?variant=`.

The page inlines the packaged `skill/tools/variant-switcher/variant-switcher.js`. The switcher adds
a bar at the bottom centre with a left arrow, a label and a right arrow. The ← → keys also cycle,
except while a form field has focus. It rewrites `?variant=`, and it lives in a shadow root so it is
visibly not part of the design. This follows the UI branch of `prototype`.

The agent pre-screen (same-size contact sheet; redo same-skeleton, common-template or
collapsed-hierarchy variants) is unchanged.

Before the ask, `next` checks only that the three markers and the switcher are present (findings
`variants-incomplete` and `variant-switcher-missing` in the run action). The pick is recorded by
`recordConcept`:

| Form | Effect |
| --- | --- |
| `--choice B` | Records one variant. |
| `--choice B,C --answer "B's header with C's layout"` | Combines variants; combining requires an answer. |
| `--verdict reject --answer` | Appends a rule `variants N` and reopens the pick. The record binds the hash of `concepts.html`, and while those bytes are unchanged the ask carries a `first` line asking for the variants to be redone. |

History is kept in `decisions.variants`; `decisions.concept` and `conceptNotes` keep their meaning.

The switcher never ships: `buildStatus` keeps build unfinished, with the error finding
`variant-switcher-shipped`, while `index.html` contains `data-variant-switcher`.

### 4. One grilling round of concrete decisions

At standard and full, the `components` ask is a round of numbered questions, each with a
recommendation:

- `sections`: the sections in build order, first screen first;
- `components`: the PR #100 source question and its options.

Its instruction gives the grilling rules: format the round as ❓/➡️, look up facts instead of asking
for them, add only questions that cannot be settled otherwise, and leave dependent questions for a
later round.

Quick asks only the component question. Recording is unchanged (`--choice` source set and
`--answer`). The sections settled in the round go into the description, where the approval records
them.

### 5. `brief.md` is the description, and its approval binds its lineage

The repository already treats `brief.md` as the project brief (Stage 1 lists its fields). The
`description` stage asks the agent to make it a one-page description containing:

- what the page is and why;
- who it is for and the one thing a visitor should do;
- how it should feel, in the owner's words;
- goals, non-goals and anti-goals, including the project rules;
- the chosen first screen and anything combined into it, or, in replicate mode, what is reproduced;
- the sections in build order, each with its id;
- the component sources and the constraints;
- which choices are the owner's and which are the agent's calls.

`decide --stage description --verdict accept --choice <ids in build order>` stores
`{sha256 of brief.md, upstream, sections}` in `decisions.descriptions`. Two checks run first: every
id must appear in `brief.md`, and the action `next` returned must be the description ask. Here
`upstream` hashes the confirmed playback, the variant pick and notes, and the component decision
digest.

`currentApproval` is current only while the brief bytes and `upstream` are unchanged. A changed
brief, a re-picked variant, a new playback or a different component decision therefore asks for
approval again. A rejection appends a rule `description N`, and the ask carries a `first` line
asking for a revision while the brief is unchanged.

### 6. Section-by-section build

Build at standard and full is a loop over the approved sections. `sectionProgress` finds the first
section, in order, that is either unbuilt (no `data-section="<id>"` in `index.html`) or not accepted
under the current approval. From there:

- **No page yet.** The action is the full build instruction for the first screen only: component
  decision, OpenSpec at full, treatment and section briefs, then the first section.
- **Next section unbuilt.** A run action builds that section and keeps accepted ones as the owner
  accepted them.
- **Section built.** An ask (`section: <id>`) asks the owner to look at the section in the real page
  and say what is wrong.

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
| (a) | Extend runtime-review's contract for web sections. Before every section review the agent would author six to eight files. | Not taken: it changes an approved, security-reviewed contract. |
| (b) | Record section comments through `decide` (extending the existing verdict → rule record), and cite runtime-review Feedback records when a project already has its inputs. | Taken. |
| (c) | Build a click-to-comment overlay. | Rejected: it is a new feedback system. |

`reviewFeedback` accepts only contained `design-pipeline.runtime-review-record.v1` files with a
recorded Feedback. It stores their path, hash, object and category, and it does not re-check bundle
lineage, which stays `runtime-review check`'s job.

Ordinary web projects therefore get text comments that name elements, not element picking. This
point is reported as partially implemented. Element picking for every web project needs a separate,
owner-approved runtime-review change (option (a), ideally with clickable regions on the captured
screenshot). The escalation channel to the parent agent was unavailable in this session, so (b) was
chosen as the conservative default.

### 7. Every "no" becomes a rule

`addRule` appends `{text, from, scope: "project"}`, the same record a rejected draft writes, with
`from` set to one of:

- `playback N`
- `variants N`
- `description N`
- `section <id> N`
- `draft N` (unchanged)

`next` already returns `rules` on every action. Rules are never removed; the owner's later
decisions refine them.

### 8. Final acceptance stays

`review`, `probe` and `deliver` are unchanged, including the review's binding to the interaction
gate hashes and the component decision digest, and delivery's binding to the review. For web, the
review's `why` now reads as final acceptance after the section reviews instead of "the second human
decision".

## UX point → implementation map

| # | Point | Stage / next action | decide record | Rule | Lineage |
| --- | --- | --- | --- | --- | --- |
| 1 | Skip line + one open question | `intake` ask: `first`, `question` | — | — | — |
| 2 | Facts are the agent's job | `intake` and `components` `instruction` | — | — | — |
| 3 | Style: open questions, then grilling | `intake` instruction; `components` `questions` round | `components` (unchanged) | — | component digest → description |
| 4 | Skip states its decisions | `intake` `skip`; quick `intake` run | `intake --choice skip` (stated) | — | playback → description |
| 5 | Playback until confirmed | `intake` ask with `correction` | `intake --verdict accept/reject` | `playback N` | playback → description |
| 6 | Switchable variants, mix | `concepts` run (page and switcher) and ask | `concept --choice A,B,C` / reject | `variants N` | pick → description; switcher may not ship |
| 7 | Approved description gate | `description` run and ask | `description --verdict accept --choice ids` | `description N` | brief bytes and upstream → sections |
| 8 | Section build with element feedback | `build` section loop; section ask | `section --choice id --verdict … [--evidence]` | `section id N` | approval → section verdicts |
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
| `skill/scripts/workflows/web.cjs` | Stages, actions and the web decide records (`decisions` export). |
| `skill/scripts/workflow-core.cjs` | `decide` stage enum and delegation to web records; art-director routing for section asks. |
| `skill/scripts/workflows/shared.cjs` | Web review `why`. |
| `skill/scripts/cli-core.cjs` | `decide` help and `--evidence` passthrough. No new flags; `--evidence` is already a registered repeatable option. |
| `skill/tools/variant-switcher/` | New packaged tool; listed in `references/package-resources.json` and the tools index. |
| Web guides | `workflow-web.md` (new `## description` section), `web-direction.md`, `stages.md`, `pipeline-reference.md`. |
| Tests | `tests/web-conversation-flow.test.cjs` and `tests/variant-switcher.test.cjs`, both new; existing web tests migrated. |

## Compatibility and migration

- **No new state schema.** The new records are optional `decisions` fields. A web intake recorded
  by the old form, and a concept picked before variant history existed, still complete their stages.
- **In-flight standard/full web projects** keep their intake, concept and components records. They
  are asked to approve the description, then to review each section; an existing `index.html` gains
  `data-section` markers as the loop reaches each section. Nothing is waived silently.
- **In-flight quick web projects** first record the stated-decision line.
- **Web `decide --stage intake --answer` without `--verdict` or `--choice skip`** is refused with a
  fix naming the three forms.
- **`decide --stage concept --choice 1|2|3` for web** is refused. Film keeps numbers and edit keeps
  `mad|pv`.
- **CLI:** no new flags. `--stage` accepts `description` and `section`; on a film, edit or ui
  project they are refused before any state change.

## Risks and trade-offs

- **More asks per project.** Each ask is small, and nothing is built twice for a wrong first screen.
- **Section markers.** The `data-section` markers are a new markup convention. They are checked only
  by presence, so a page that drops a marker returns to building that section.
- **CSS-only revisions.** `pageSha256` follows the local files the page names, not runtime imports
  from inside scripts, so the "revise first" hint can miss such a revision. It is only a hint and
  never blocks a verdict.
- **Brief bytes.** Binding the approval to `brief.md` bytes means a typo fix asks for approval again,
  and therefore for section reviews again. This is deliberate: the owner approved those bytes.

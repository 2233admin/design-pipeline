# Web Treatment and Section Briefs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the web workflow its own `next` intake and concepts prompts (removing the film "How long?" wording), a treatment and section-brief template built on artifacts a web change already writes, and review rules W1 to W7 as Visual Acceptance guidance, with no new gate, receipt, analyzer or schema.

**Architecture:** `skill/scripts/workflows/web.cjs` defines web `INTAKE` and `CONCEPTS` objects with the same stage ids, `finished` predicates and `record` strings as the shared ones, and adds one treatment sentence to the standard and full `build` action; `shared.cjs` is not edited, so film, edit and `ui` output is unchanged by construction. One new reference, `skill/references/web-direction.md`, holds the treatment template, the section-brief field mapping and W1 to W7; `workflow-web.md` and existing references point to it. Behavioural tests go into the existing `tests/workflow-next.test.cjs`.

**Tech Stack:** Node.js CommonJS, Markdown, OpenSpec, Node built-in test runner driven only by `node scripts/qa.cjs`.

**Spec:** `openspec/changes/add-web-treatment-and-section-briefs/` (`proposal.md`, `design.md`, `tasks.md`, `specs/web-workflow/spec.md`); design summary `docs/superpowers/specs/2026-09-29-web-creative-layer.md` (change 1 only, its default answers to the open questions).

## Global Constraints

- Change 1 of the approved spec only. Do not start the section kit, the golden case, or multi-viewport capture.
- No new gate, finding code, receipt, analysis schema, workflow stage, workflow-state field, or field on the interaction probe, component-state-matrix, direction-preview or motion contracts.
- Agents never record Visual Acceptance. W1 to W7 are guidance reported under Visual Acceptance in `qa.md`, never as Component Conformance; existing gate findings keep their meaning and severity.
- Do not edit `skill/scripts/workflows/shared.cjs`, `skill/scripts/workflow-core.cjs`, `film.cjs`, `edit.cjs` or `skill/scripts/film-core.cjs`. Film, edit and `ui` `next` output stays identical.
- Web stage ids, their order per tier, the `record` strings and the `guide` anchors stay as they are; `remaining` and the "n/m" counts for web do not change.
- Web intake text contains no duration question and none of the words film, promo, video, footage or beat.
- No wording or source-text tests: assert behaviour of `next` output (ids, structure, absence of a question, equality with shared exports), not prose.
- The only sanctioned verification is `node scripts/qa.cjs`, run directly with no pipe or redirect into the repository; never bare `node --test`. Only Task 4 runs it, on a quiet tree.
- Each task edits only the files it owns. No file appears under two tasks. Preserve unrelated working-tree changes; do not commit.
- `docs/superpowers/specs/2026-09-29-web-creative-layer.md` is untracked user work: leave it as is.
- Spec deltas use `## ADDED Requirements`, `### Requirement:`, `#### Scenario:` and must pass `openspec validate add-web-treatment-and-section-briefs --strict`.

## Fixed interfaces (shared by Tasks 1 to 3)

- Web intake question ids: `product`, `audience`, `scope`, `assets`. `scope` replaces `duration`.
- Treatment fields, in order: Premise; Section arc (section id, job, dominant element, ground, density, escalation role); Style-bible seed (ground per section, ink, accent, type voices, spacing unit, radius, stroke, must-not-copy line); Motion language (driver, response, primitive, reduced-motion substitute); Escalation and negative space.
- Escalation roles: `opens`, `builds`, `lands`, `rests`. Density values: `sparse`, `medium`, `dense`.
- Section brief keys and where each lands: dominant element and job to `design.md` Component inventory; supporting layers (at most three) to further inventory rows; ground and density to `design.md` Layout grid and Color tokens; states to `component-state-matrix.json`; driver and response to a `motion.md` Interaction Inventory row; proof to an `interaction.json` probe; first-viewport signature to the direction-preview signature; escalation or landing line to the Layout grid row.
- Review rules: W1 dominant element and first-viewport signal; W2 adjacent density contrast; W3 a purposeful empty section; W4 ground or structure change per section; W5 scroll pacing builds then lands; W6 motion answers a named driver, no opacity-only entrance; W7 type and colour inside the style seed.
- `web-direction.md` headings: `## Treatment`, `## Section briefs`, `## Review rules W1 to W7`, `## What these rules are not`.
- Existing evidence names the rules may cite, verbatim: composition findings `no-focal-point`, `flat-hierarchy`, `dead-band`, `clutter`, `weak-separation`, `palette-sprawl`, `type-scale-sprawl`; anti-slop rubric item `template-pattern-density`; interaction findings `dead-interaction`, `opacity-only`, `linear-response`; screenshots at 375x812, 768x1024, 1440x900.

---

### Task 1: Web Prompts and Tests

**Files:**

- Modify: `skill/scripts/workflows/web.cjs`
- Modify: `tests/workflow-next.test.cjs`

**Interfaces:**

- `web.cjs` still exports only `stages(state)`. It defines local `INTAKE` and `CONCEPTS` objects shaped like the shared ones (`id`, `finished(state, root)`, `action(state, root)`) and imports only `CLI`, `REVIEW`, `exists`, `gatePassed`, `reference` from `./shared.cjs`.
- Web `INTAKE.action()` returns `type: "ask"`, four `questions` with ids `product`, `audience`, `scope`, `assets`, and the same `record` string as the shared intake (`decide --project-root . --stage intake --answer "<the user's reply>"`).
- Web `CONCEPTS` keeps `finished: (state) => Boolean(state.decisions?.concept)`; with `concepts.md` present the ask action keeps the shared `record` string; without it the `run` action asks for three cards with central idea, section arc (one line per section), what carries the eye down the page, look, tools, license, one first-viewport frame per card, and says the chosen card is extended with `## Treatment` (`references/web-direction.md`).
- Web `REVIEW` override (added after approval, same defect class): `web.cjs` defines a local review stage with the same stage id, `finished` predicate and `record` string as the shared `REVIEW`, whose action text speaks of the page and screenshots at 375x812, 768x1024 and 1440x900 (no "draft video", no `evidence/contact-sheet.png`) and points the reviewer to W1 to W7 in `references/web-direction.md` for Visual Acceptance. Shared stage contract is unchanged; film, edit and ui review output stays byte-identical, proven by a deep-equality test like the intake and concepts ones. The `ui` deliverable's intake ("How long?") stays out of scope and is listed as a residual.
- `BUILD.action` at `tier` standard and full says to extend the chosen card in `concepts.md` with `## Treatment` before writing `index.html`; the quick-tier command string is byte-identical to today's.

- [x] **Step 1: Add failing tests to `tests/workflow-next.test.cjs`**

Use the existing helpers (`tmp`, `touch`, `initState`, `nextAction`, `decide`). Import the shared exports with `require("../skill/scripts/workflows/shared.cjs")`. Cases:

- Standard web with no `brief.md`: `nextAction` is `ask`, question ids equal `["product","audience","scope","assets"]`, no question has id `duration`, `JSON.stringify(action)` does not match `/how long|duration|film|promo|video|footage|beat/i`, and `record` equals the shared `INTAKE.action().record`.
- Standard web with `brief.md` and `decisions.reference = "none"`, no `concepts.md`: the `run` command matches `/section/i` and `/## Treatment/`, and does not match `/between beats|the picture/i`; with `concepts.md` present it is an `ask` whose `record` equals the shared concepts ask's record.
- For film, edit and ui at standard at intake, for film at concepts, and for film and edit at review (edit and ui have no concepts stage, ui has no review stage): the action's question, questions, recommended, record and why equal the shared exports' (deep equality on those fields), and film and edit intake still include the `duration` question.
- Web stage ids per tier: quick `["build","probe"]`; standard and full `["intake","reference","concepts","build","probe","review","deliver"]`.
- Web standard with `concepts` decided and no `index.html`: `stage` is `build`, `command` matches `/## Treatment/`; quick web build command does not. `remaining` for standard web equals 4 at build (build, probe, review, deliver).

- [x] **Step 2: Implement `web.cjs`**

Define the two objects and the build sentence as specified; change the `stages()` lists to use the local objects. Keep every other line of `web.cjs` as is.

- [x] **Step 3: Hand off**

Report the files changed and the case names. Do not run `node scripts/qa.cjs`; Task 4 owns the run. Optionally check by hand with a throwaway script outside the repository that calls `nextAction` on a temporary directory.
Expected: the case names in the report match Step 1.

---

### Task 2: Web Direction Reference and Workflow Guide

**Files:**

- Create: `skill/references/web-direction.md`
- Modify: `skill/references/workflow-web.md`

**Interfaces:**

- `web-direction.md` uses the headings and content fixed above and in `design.md` sections 3 to 5, in the same order: `## Treatment` (template with the field table and one sentence per field), `## Section briefs` (key-to-artifact table and a worked brief, including a JSON probe that is valid under `design-pipeline.interaction-probe.v1` with `input.kind` in `pointer-sweep`, `wheel`, `click` and `expect.response` in `spring`, `linear`, `stepped`), `## Review rules W1 to W7` (table: rule, evidence read, looks right), `## What these rules are not`.
- `workflow-web.md` keeps exactly one `##` heading per stage id (`intake`, `reference`, `concepts`, `build`, `probe`, `review`, `deliver`) and the existing `interaction.json` example.
- Target size: `web-direction.md` under 9 KB; `workflow-web.md` under 5 KB.

- [x] **Step 1: Write `web-direction.md`**

State that the treatment is a `## Treatment` section under the chosen card of `concepts.md`, written before `index.html` at standard and full. State how the seed feeds project `DESIGN.md` (Colors, Typography, Layout; no new sections) and how the motion language feeds `MOTION.md` and `motion.md`. Give the brief mapping. Give W1 to W7 with the evidence each reads, marked as Visual Acceptance guidance: they add no finding code, change no gate, are reported only in `qa.md` under Visual Acceptance, agents never record acceptance, thresholds are uncalibrated heuristics, and overlapping gate findings stay Conformance findings with their existing meaning. Mention that a section with no driver has no Interaction Inventory row and no probe. Do not invent thresholds beyond `design.md` section 5.

- [x] **Step 2: Update `workflow-web.md`**

`intake`: the four web questions (product, audience, scope, assets) in one round with recommendations. `concepts`: three cards with section arc and first-viewport frame; after the pick the chosen card is extended with `## Treatment`. `build`: first step writes the treatment and section briefs (`web-direction.md`), then the existing build text. `review`: the reviewer reads W1 to W7 for Visual Acceptance in `qa.md`; the agent does not record acceptance. Leave `reference`, `probe` and `deliver` as they are apart from a pointer in `probe` if useful.

- [x] **Step 3: Read-through against the spec**

Compare both files with `specs/web-workflow/spec.md` requirements 2 to 5 and with the fixed interfaces. Expected: every requirement has a place in the text, and the probe example parses as JSON with the fields named above.

- [x] **Step 4: Hand off**

Report the two paths and any place where the text deviates from `design.md`. Do not run `node scripts/qa.cjs`.

---

### Task 3: Pointers in Existing References

**Files:**

- Modify: `skill/references/pipeline-reference.md`
- Modify: `skill/references/design-spec.md`
- Modify: `skill/references/motion-spec.md`
- Modify: `skill/references/anti-slop-review.md`
- Modify: `skill/references/qa-checklist.md`
- Modify: `skill/SKILL.md`

**Interfaces:**

- Every pointer names `references/web-direction.md` and the W rule or field it concerns; none restates the template.
- `qa-checklist.md` gains a new section `## Web Treatment And Section Review (Visual Acceptance)` placed after `## Browser / Visual Checks`, with rows W1 to W7 (name, evidence read, result), a `Reviewer:` line, a `Visual Acceptance: pending / recorded by <reviewer>` line, and the sentence that agents never record acceptance and that gate findings remain Conformance.
- `SKILL.md` stays under 5 KB (currently about 4.0 KB); add one line only, in the web bullet of "Where the details are".

- [x] **Step 1: Add the pointers**

`pipeline-reference.md`: in the `design.md` stage text (near "Component inventory and states"), two or three lines saying a web page's section arc from the treatment becomes Layout grid rows and Component inventory rows, and the style-bible seed feeds project `DESIGN.md`. `design-spec.md`: one line under Owns. `motion-spec.md`: one line under Interaction Inventory that a section brief's driver and response are one row. `anti-slop-review.md`: one line under Two-sided craft check that W2 and W4 are the reviewer's companion to `template-pattern-density`. No new stage, gate or command anywhere.

- [x] **Step 2: Add the checklist section and the front-door line**

Write the `qa-checklist.md` section as specified and the `SKILL.md` line, then confirm `SKILL.md` size is below 5120 bytes.
Expected: size below 5120.

- [x] **Step 3: Hand off**

Report the six paths and the `SKILL.md` byte count. Do not run `node scripts/qa.cjs`.

---

### Task 4: Registration, Changelog, QA and Smoke (integrator)

**Files:**

- Modify: `skill/references/package-resources.json`
- Modify: `CHANGELOG.md`
- Create: `openspec/changes/add-web-treatment-and-section-briefs/qa.md`
- Modify: `openspec/changes/add-web-treatment-and-section-briefs/tasks.md` (tick boxes only)

**Interfaces:**

- `package-resources.json`: add `references/web-direction.md` to `required`, next to `references/workflow-web.md`.
- `CHANGELOG.md` under `[Unreleased]`: a Changed entry (web `next` intake asks scope instead of duration and drops film wording; web concepts asks for a section arc and a treatment; web build asks for the treatment; film, edit and ui unchanged) and an Added entry (treatment template, section briefs, W1 to W7 as Visual Acceptance guidance, in `references/web-direction.md`), each naming the change id.
- `qa.md` follows `openspec/changes/add-music-driven-plate-kit/qa.md`: Conformance (verified), Open questions and answers, Visual Acceptance: PENDING with no reviewer, Not verified.

- [x] **Step 1: Register and record the change**

Edit `package-resources.json` and `CHANGELOG.md` as specified. Run `openspec validate add-web-treatment-and-section-briefs --strict`.
Expected: valid.

- [x] **Step 2: Run the QA gate on a quiet tree**

Run: `node scripts/qa.cjs` (directly, no pipe or redirect into the repository).
Expected: exit 0. On failure, return the failing file to its owner (Task 1, 2 or 3), wait for the fix, rerun.

- [x] **Step 3: Smoke the CLI on temporary projects**

In two temporary directories outside the repository, run `node skill/scripts/designer-pipeline.cjs next --project-root <dir> --deliverable web --tier standard`, then the same with `--deliverable film`. Record the web intake questions, then create `brief.md` and run `decide --stage reference --answer none` in the web directory and record the concepts `run` text; record the film intake and concepts text.
Expected: web text has the four web questions, no duration or film wording, and a section-arc and `## Treatment` concepts command; the film text still asks "How long?" and speaks of the picture and beats, byte-for-byte as before.

- [x] **Step 4: Write `qa.md` and tick the tasks**

Record the exit codes and smoke output observed. List Visual Acceptance as pending, with no reviewer and the statement that agents never record it. Tick the boxes of `tasks.md` that are done.
Expected: `openspec validate add-web-treatment-and-section-briefs --strict` still valid after the final edit.

---

## Acceptance

- `openspec validate add-web-treatment-and-section-briefs --strict` reports valid.
- `node scripts/qa.cjs`, run directly, exits 0.
- The smoke of Task 4 Step 3 shows web text without film wording and film text unchanged.
- `git status` shows changes only in the files owned by Tasks 1 to 4, this plan, and the untracked spec that was already there.

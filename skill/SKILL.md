---
name: design-pipeline
description: Art and design literacy for agents, carried in code - promotional films and explainers, PV and MAD edits, motion websites, product UI and design systems. One next step at a time, two user decisions, gates before anything is shown. Use for product promo animations and HTML films, beat-cut edits, logo stings, 3D product shots, motion pages, UI work, design reviews and anything that must not look generic.
---

# design-pipeline

Talk with the user; drive the work with one command. The CLI is `node scripts/designer-pipeline.cjs`
inside this skill (below: `designer-pipeline`).

## Loop

1. `designer-pipeline next --project-root <project>` returns exactly one action:
   - `run`: do it (a command or a short task), then call `next` again.
   - `ask`: put the question to the user with its recommended answer, then record the reply with
     the `record` command it gives.
   - `done`: report the evidence.
2. Never skip ahead, never repeat a finished step, never show the user a draft whose error gates
   failed: apply each finding's `fix` and rerun the check.
3. `rules` in a `next` result are the user's earlier rejections. Obey them.

First call in a new project: pick the deliverable and tier and pass them to `next`:

| Deliverable | For |
|---|---|
| `film` | generated promo, explainer, logo sting, feature demo, 3D product shot |
| `edit` | PV, MAD, beat montage cut from existing footage and music |
| `web` | motion-first websites and pages |
| `ui` | product UI, components, design systems, clones |

| Tier | When | Ceremony |
|---|---|---|
| `quick` | one motion, shot, component or fix | build, gates, evidence |
| `standard` | one whole deliverable | brief, concepts, draft review (two user decisions) |
| `full` | large or shared work | adds an OpenSpec change and full lineage |

Add `--mode replicate` when the user gives a reference to reproduce, `--mode freeform` when they
give no direction. Choose the tier yourself from the request size; the user can override it.

## Talking to the user

- Ask everything missing in one round, numbered, each with your recommendation; "default"
  accepts all. Ask only facts that change the result: product, audience, duration, assets and
  their licenses. Decide style from references and judgment.
- The user decides twice in standard work: which of three concepts, and accept or reject the
  draft. A rejection needs one sentence; it becomes a project rule.
- Show drafts with the video, `evidence/contact-sheet.png` and a one-paragraph gate summary.
- Name the tools on each concept card in one line (for example "3D shot in Blender, score in
  Strudel"). Raise missing licenses there, not at delivery.

## Where the details are

Read only what the current step needs. For `film`, `edit` and `web`, each `next` action names its
`guide` section: `references/workflow-film.md`, `references/workflow-edit.md`,
`references/workflow-web.md`.

- Film direction and storyboards: `references/product-film-direction.md`,
  `references/film-choreography/` (patterns, timeline probe, example storyboard)
- Film that answers its music (treatment, instruments, chrome, review rules R1-R7):
  `references/product-film-direction.md` (Music-driven films), `references/hyperframes.md` (Instrument kit)
- Film tools: `references/hyperframes.md`, `references/film-blender.md` (3D shots),
  `references/film-score.md` (music as code), `references/audio-gate.md`,
  `references/composition-gate.md`
- Edits (PV, MAD): `references/film-edit.md`
- UI, web, design systems, website cloning, stage contracts and full-tier work:
  `references/pipeline-reference.md`
- Every command: `designer-pipeline --help`

## Always

- Gates judge failure shapes; they never grant creative acceptance. Watch the film.
- Keep licenses honest: record every asset's license; non-commercial material never ships in
  commercial work.
- In this repository itself, behavior changes need an OpenSpec change; in user projects only the
  `full` tier does.

# Film workflow

Generated promo, explainer, logo sting, feature demo or 3D product shot. `designer-pipeline next`
names the current stage; read only that section. Stage order:

- `quick`: plan, build, check (replicate mode adds reference first).
- `standard` and `full`: intake, reference, concepts, plan, build, check, review, deliver.

## intake

Ask the four intake questions in one numbered round, each with its recommendation; record the
reply with `decide --stage intake`. Details: `product-film-direction.md`.

## reference

Watch 1-3 moving references at full speed and write `reference.md`: observed timings, cuts,
rests, sound, and what to transfer. In `replicate` mode the reference is the thing being
reproduced and cannot be skipped. Otherwise the user may decline references
(`decide --stage reference --answer none`).

## concepts

Write `concepts.md` with three cards whose central ideas differ, not the same scenes retold three
ways. Each card starts with the central idea as one sentence about the picture ("one dot becomes
every screen of the app"), then what carries attention between beats, look, tools in one line (for
example "3D shot in Blender, score in Strudel"), and any missing license. Render one key frame per
card. The user picks one (`decide --stage concept --choice 1|2|3`).

For a music-led film (the score has events and the concept is that the picture answers them), each
card also states its instrument premise: which product or concept object plays the music ("the
canvas is an instrument"). An instrument that represents nothing the product or concept has is
decoration, and the card is not finished.

## plan

- `film scaffold --output .` starts a passing `storyboard.json` and a composition.
- Fill the beats from the chosen concept; patterns: `film-choreography/`.
- Carry: every beat whose handoff is `continuation`, `morph`, `camera-carry` or `match-cut` names
  a `carrier` — what survives the boundary and what it becomes ("prompt bar opens into the app
  window"). A claimed carry with nothing named for it to carry is a placeholder, not a plan.
- Rhythm: near-equal beat lengths read as a metronome, not a film; in a film of four or more beats,
  the longest should run at least 3x the shortest. A film of 8 s or more needs a rest — a hold
  beat, or any beat with `holdSec` of at least 0.3 s — or nothing on screen ever lands.
- Music-led film, in this order (`product-film-direction.md`, Music-driven films):
  1. Write `## Treatment` under the chosen card of `concepts.md`: premise, instrument arc (plate,
     kit id, the product or concept object it is, the audio role that drives it), style-bible seed
     (the chrome slots, a ground per section, a must-not-copy line from `reference.md`), motion
     language, escalation and negative space.
  2. Fill `sound.md` with the `Section` column and a header for BPM, bar length and the start of bar 1.
  3. Write one storyboard beat per plate, each plate brief mapped onto existing fields
     (`subject`, `productAction`, `transformation`, `motion`, `choreography`, `soundCues`, `holdSec`,
     `note`), and vary plate lengths so the film clears `uniform-cadence`.
- `verify film-storyboard --storyboard storyboard.json` must pass. Editing the storyboard later
  reopens this stage until the gate passes again.

## build

Pick the lowest-rung tool that reaches each beat:

| Need | Command | Guide |
|---|---|---|
| Ready-made block or transition | `film blocks --project-root . --query <action words>` | `hyperframes.md` |
| 3D product shot | `film blender --project-root . --template product-turntable` | `film-blender.md` |
| Music as code | `film score --project-root . --bpm <n> --template <name>` | `film-score.md` |
| Loudness and fades | `audio master --input <audio> --output <wav>` | `audio-gate.md` |

Fill `sound.md`'s song map before binding cues: each music event gets a motion response from the
vocabulary in `film-score.md`, and each hit cue is bound in a beat's `soundCues`.

Music-led film: build the plates from the six instruments in `film-choreography/registry.json`
(`hyperframes.md`, kit contract), take their hits from `FilmAudio` (`film-score.md`), and dress
them with `lib/instrument-chrome.css` and the film's one `STYLE` table. Give every cut a different
ground or a flash accent so the render gate can see it.

Then render the draft: `npx hyperframes render --output out.mp4`.

## check

`film check --project-root .` runs the storyboard, timeline and render gates. Apply each
finding's `fix` and rerun. Frame layout: `composition capture` then `verify composition`
(`composition-gate.md`). A re-render reopens this stage.

## review

Show the draft video, `evidence/contact-sheet.png` and a one-paragraph gate summary. The user
accepts, or rejects with one sentence (`decide --stage review --verdict accept|reject`). A
rejection becomes a project rule that every later `next` returns.

For a music-led film, also fill the music-driven section of `qa.md`: rules R1 to R7, each with the
field it read (`holdSec`, handoff kind, `cuts.missedSec`, per-beat `changedShare`, the contact
sheet), and any instrument that is not a product or concept object (`product-film-direction.md`).
They are Visual Acceptance guidance; only R7 has a gate counterpart, `planned-cuts-missing`. The
`check` stage above shows the gate findings, and the rules add no finding.

## deliver

Render the final quality once (`npx hyperframes render --quality high --output final.mp4`), then
`decide --stage deliver --answer final.mp4`.

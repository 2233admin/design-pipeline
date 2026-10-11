# Product film delta

## ADDED Requirements

### Requirement: film check samples visible text between beats
When `film check` captures a composition, its existing composition gate SHALL also sample the
visible text at least five times a second and on both sides of every beat boundary. Held overlap
of two legible texts SHALL fail the gate; a passing overlap, a steady faint copy under legible
text, resting text near the frame edge and small resting text SHALL be warnings. No new gate or
acceptance state SHALL be added.

#### Scenario: Text arrives over other text at a beat boundary
- **WHEN** a legible text overlaps another legible text for two consecutive samples around a beat boundary
- **THEN** the composition step SHALL fail with a `text-overlap` error that names both texts, the time and the beat, with a fix

#### Scenario: Dissolves, covered and deliberate layers
- **WHEN** two texts crossfade, one is covered by an opaque element or clipped away, or one is marked `data-layout-allow-overlap`
- **THEN** no `text-overlap` finding SHALL be reported for them

#### Scenario: Layout capture is unavailable
- **WHEN** the layout samples cannot be captured
- **THEN** the composition step SHALL report the reason and the pixel checks SHALL still run

#### Scenario: Deliberate warning
- **WHEN** the author passes `film check --allow <code>` for a warning code
- **THEN** that warning SHALL move to the allowed list and an unknown code SHALL be rejected

### Requirement: quick film ends with the owner's review
The quick film tier SHALL run plan, build, check and review. After the film check passes, `next`
SHALL return the existing review ask with an instruction to review the checked draft one frame
per second and record it in `qa.md` first, and SHALL return `done` only after the owner accepts
the current checked draft. Other quick tiers SHALL be unchanged.

#### Scenario: Quick film passes its check
- **WHEN** a quick film's check passes
- **THEN** `next` SHALL ask for the owner's verdict with the frame-review instruction instead of returning `done`

#### Scenario: Owner rejects or the draft changes
- **WHEN** the owner rejects the draft, or a new draft is checked after acceptance
- **THEN** a rejection SHALL be recorded as a project rule and reopen the check, and `next` SHALL ask for a new verdict before `done`

### Requirement: film scaffold pins the reviewed runtime
`film scaffold` SHALL write a `package.json` pinning the reviewed `hyperframes` and `gsap`
releases and SHALL load GSAP from the local install, so that after one install the composition
renders and is captured without network access. HyperFrames preview and catalog calls SHALL
default to the reviewed release.

#### Scenario: Fresh film project
- **WHEN** a film project is scaffolded into an empty directory
- **THEN** `package.json` SHALL pin `hyperframes` 0.8.137 and `gsap` 3.15.0, the composition SHALL load no remote script, and the guide SHALL use `npx --no-install hyperframes`

#### Scenario: Existing package.json
- **WHEN** the target already has a `package.json`
- **THEN** scaffolding SHALL refuse without an explicit replace flag, and with it SHALL keep the existing fields and only set the pins and missing scripts

### Requirement: Next actions separate runnable commands from instructions
A `next` action's `command`, when present, SHALL be only an executable command, spelled `node <absolute path of designer-pipeline.cjs> ...` (quoted when the path needs it) so it runs as given from any directory; an `ask` action's `record` SHALL use the same invocation. Free-text steps MUST be in a separate `instruction` field, an action with nothing to execute MUST carry only `instruction`, and the one-line `line` summary MUST include both. This holds for film, edit, web and ui actions.

#### Scenario: Prose is not a command
- **WHEN** `next` returns the film source, plan, sample, build or delivery action, an edit analyze action without sources, or a web concepts, build or probe action
- **THEN** the prose steps are in `instruction` and `command` is absent or one runnable `node <absolute path> ...` command

#### Scenario: Command runs as given
- **WHEN** the command of a product promo's source action is run from an unrelated directory with `--root <project>`
- **THEN** it starts the CLI, because the path is absolute and `designer-pipeline` need not be on PATH

#### Scenario: Plan ids cannot carry shell syntax into a command
- **WHEN** a visual design plan names a task `id` outside `[A-Za-z0-9][A-Za-z0-9_.-]*`, such as `a;rm -rf x`, `a b`, `$(x)` or `-x`
- **THEN** plan validation fails with `phases[<i>].id must be a path- and shell-safe identifier`, so the visual-task `command` and `record` that carry the id never contain shell syntax from the plan

### Requirement: film scaffold of a bound product promo lists its next steps
`film scaffold` for a project bound to a `product-launch-video` job plan SHALL add the `productSource` record step and the sample step to `next[]`; other scaffolds SHALL keep their `next[]`.

#### Scenario: Scaffold of a bound product promo
- **GIVEN** a project bound to a `product-launch-video` job plan
- **WHEN** `film scaffold` runs
- **THEN** its `next[]` also names the `productSource` record (before reference and storyboard) and the sample step (before the build), each citing its section of `workflow-film.md`
- **AND** the scaffold of a project with another or no bound form has the same `next[]` as before

# Refine Intents

Four requests about a surface that already exists: judge it ([critique](#critique)), finish it
([polish](#polish)), strip it to what it needs ([distill](#distill)) or lower its intensity
([quieter](#quieter)). `designer-pipeline route` selects the `refine-intents` job for them, and
`candidates[0].matchedKeywords` names the intent. Open that one section.

These are project-owned steps. The method is distilled from the Impeccable references
([Provenance](#provenance)); upstream personas, slash commands and output formats are not pipeline
behavior ([ui-craft-sources.md](ui-craft-sources.md)). No section adds a gate, a receipt or a CLI
command. Findings and results go into the existing review record in `qa.md`; Component Conformance
and Visual Acceptance stay separate, and only the owner records acceptance.

Before any of the four:

1. Fix the target: one named page, screen, flow or component, and the files that render it. A
   request with no existing render is new work, not a refinement: a word such as "restrained" or
   "polished" is then direction input, and the work starts at
   [Stage 1](stages.md#stage-1-guided-design-intake).
2. Read the authority that already exists: project `DESIGN.md`, tokens, shared components and
   neighboring flows ([impeccable-contract.md](impeccable-contract.md#authority-and-intent), items
   3 and 4).
3. Name the visitor mode of the surface: `Persuade`, `Operate`, `Read` or `Experience` (the same
   section, item 2). [Quieter](#quieter) changes meaning with it.
4. Capture the current render at desktop and mobile before changing anything, so the result has
   something to be compared with.

When the product job, the audience or the scope cannot be read from the project, ask the owner one
question and wait. Do not guess.

Polish, distill and quieter keep the incumbent identity, copy, behavior and everything outside the
named target. When the direction itself is wrong, say so and return to direction work
([stages.md](stages.md#stage-2-design-directions)); a refinement never carries a redesign.

## Critique

Judge whether the surface is specific, clear and right for its visitor. A critique changes no file.

### Before you start

- The request asks for a judgement, a score or "how good is this". A request to change the surface
  is [polish](#polish), [distill](#distill) or [quieter](#quieter).
- Measurable questions (contrast, focus, reading measure, reduced motion, state contrast) are an
  audit, not a critique: use the [measured audit](ui-craft-sources.md#measured-audit).
- There is a render to judge. A film or an edit is reviewed in its own workflow
  ([workflow-film.md](workflow-film.md), [workflow-edit.md](workflow-edit.md)).

### Steps

1. Capture the render at desktop and mobile, plus every state the request names.
2. Open the review guide whose own trigger matches the request:
   - the owner asked for a critique or a score of any visual output:
     [Critique on request](web-direction.md#critique-on-request);
   - a rendered design needs a scored critique before delivery or revision:
     [design-review-dimensions.md](design-review-dimensions.md#dimensions).
3. Follow that guide's dimensions, levels and output form as written. Name the guide in the record.
4. Write the text under a `Critique` heading in `qa.md`, beside and never inside the Visual
   Acceptance block.

### Do not

- Edit the surface while judging it.
- Report a score as Visual Acceptance or as Component Conformance. A clean gate is not a design
  verdict, and a critique line never turns a failing finding into a pass.
- Mix the scales of two guides in one critique, convert one into the other, or add a scale here.
- Override an owner's decision. Say what the critique would change and leave the choice with them.

### Done when

- The record names the guide used and the render judged (path and viewport).
- Every finding gives the current state, why it matters and a concrete fix, as the guide requires.
- The text is in `qa.md` under `Critique`.

### Hand-off

A finding the owner wants fixed goes to the section that fits it: too much on the surface to
[distill](#distill), too intense to [quieter](#quieter), defects and drift inside a correct
direction to [polish](#polish), measurable defects to the audit, a wrong concept back to direction
work. Nothing is changed from a critique until the owner asks.

## Polish

Finish a surface whose direction is right, without changing what it is.

### Before you start

- The path is functionally complete. If the task cannot be finished yet, build it first.
- The direction is correct. If the concept is wrong, say so; never smuggle a redesign into a polish
  pass ([impeccable-contract.md](impeccable-contract.md#authority-and-intent), item 4).
- The scope is a whole path, from arrival to the finished task with its states, not one screenshot.
- The quality bar, the shipping constraint and anything deliberately unfinished are known.

### Steps

1. Read the system: `DESIGN.md`, tokens, shared components, patterns and neighboring flows. With no
   formal system, the project's coherent conventions are the system.
2. Use the path yourself at desktop and mobile, with the states, content lengths, roles and input
   methods users will meet ([worst-case-content.md](worst-case-content.md#how-to-select-scenarios)).
3. Collect defects with the rules the project already owns: the
   [measured audit](ui-craft-sources.md#measured-audit) and
   [review checklist](ui-craft-sources.md#review-checklist),
   [interface-defaults.md](interface-defaults.md) and the
   [craft floor](impeccable-contract.md#craft-floor). An earlier critique in `qa.md` is one input;
   it does not replace looking.
4. Fix across the whole path at one quality bar:
   - flow and hierarchy: terminology, disclosure and save behavior match neighboring flows; the
     primary task and the current state are obvious;
   - layout and type: project grid and spacing scale, optical alignment, same-role type consistent,
     real copy at every supported viewport;
   - color, imagery and icons: semantic tokens, contrast in every state, one icon family, no image
     layout shift;
   - interaction and state: every control has the states it can enter, visible focus, logical tab
     order, platform touch targets;
   - copy: consistent terms, capitalization and punctuation. Ask before changing a claim.
5. Walk the path again with mouse, keyboard and touch, and rerun the checks from step 3.

### Do not

- Change the concept, the copy's claims, behavior or anything outside the target.
- Add animation or decoration to make the pass visible.
- Treat a clean audit as finished. Inspect the render and the real interaction path.
- Perfect one corner while the rest of the path stays below the same bar.
- Create a token or a shared abstraction for one local exception.

### Done when

- The craft floor holds on every state of the path at desktop and mobile.
- Every finding from step 3 is fixed, or recorded in `qa.md` with the reason it stays.
- Before and after captures exist for the same viewports and states.
- The source diff touches only the target.

### Hand-off

Record the results in the existing review record in `qa.md` as Component Conformance evidence, and
show the owner the before and after captures; Visual Acceptance is theirs. Polish is the last pass:
[distill](#distill) and [quieter](#quieter) both end here.

## Distill

Remove what stands between the visitor and the one thing the surface is for. Simplicity removes
obstacles, not capability.

### Before you start

- The request is about an existing surface having too much on it. Drafting a style pack from
  reference images is `template distill` ([template-bank.md](template-bank.md)), a different job.
- The direction is right. If the surface is only loud, not crowded, use [quieter](#quieter).
- The complexity is not the task's own. A dense tool for a complex job keeps the complexity the
  job needs; match the surface to the task, do not thin it below it.
- Removing a capability from the product is the owner's decision. Hiding or merging one is not.

### Steps

1. Name the complexity sources, each with where it shows:
   - too many elements: competing buttons, repeated information;
   - excess variation: colors, fonts, sizes and styles without a reason;
   - everything visible at once, nothing disclosed on demand;
   - visual noise: borders, shadows, backgrounds and decoration that carry nothing;
   - unclear hierarchy: no answer to what matters most;
   - too many options, actions or ways forward.
2. Name the one primary goal of the surface in one sentence, from the brief or product truth. There
   is exactly one; if two compete, ask. Then sort every element: necessary, hide until needed,
   combine, or remove. The keep-only-if table in
   [creative-prompting.md](creative-prompting.md#4-deliver-a-final-pass-of-subtraction) is the test.
3. Simplify the information architecture: cut secondary actions and repeated information; merge
   similar actions, forms and groups; put rarely needed complexity behind one clear entry point;
   leave a single primary action, a few secondary ones, and the rest tertiary or hidden.
4. Simplify the visuals: one or two brand colors plus neutrals. Keep the semantic colors (success,
   warning, error) and give each a non-color cue such as an icon, a label or a shape. One type
   family, three or four sizes, two or three weights unless `DESIGN.md` says otherwise. Remove
   borders, shadows and backgrounds that carry neither hierarchy nor function. Flatten nesting; no
   card inside a card, and no card where spacing and alignment do the grouping. One spacing scale.
5. Make the layout linear: one vertical flow where the content allows it instead of a complex grid;
   sidebar content moved inline or behind an entry point; one alignment axis.
6. Simplify the interaction: fewer choices; smart defaults, asking only when the answer changes the
   outcome; inline editing instead of a modal flow where it fits; one step fewer where the flow can
   lose one; one obvious next action.
7. Shorten the copy: cut filler, not meaning; say each thing once
   ([plain-language.md](plain-language.md#interface-copy)). Claims stay as they are.
8. Clean the code: remove dead CSS, unused components and orphaned files; flatten component trees;
   merge near-duplicate styles; drop component variants nothing uses.
9. Write the removal record in the change's `design.md`, or in the `qa.md` review record when the
   work has no change folder. One line per feature, option or piece of information that was
   removed, hidden or merged: what it was, why it went, where it can still be reached (or that it
   is gone, and who decided), and what to watch afterwards.

### Do not

- Remove a function users need, or information they need to decide.
- Trade away accessibility: labels, accessible names and visible focus stay.
- Simplify into mystery, such as an icon with no label or an action with no visible entry.
- Flatten the hierarchy until nothing stands out.
- Delete words to fake minimalism.

### Done when

- The primary goal is written down, and the render shows one primary action as the most visible
  control at desktop and mobile.
- Every necessary function is still reachable; the tasks were walked after the cuts.
- Each semantic state carries its non-color cue.
- The removal record lists every removed, hidden or merged item with its reason and where it can
  still be reached.
- Before and after captures exist for the same viewports.

### Hand-off

Go on to [polish](#polish) for the final pass over what remains.

## Quieter

Lower the intensity of a surface that is too loud, aggressive or overstimulating, and keep its
point of view. Quiet takes more precision than loud.

### Before you start

- The direction is right and the surface has the right things on it. If it has too many things, do
  [distill](#distill) first.
- Name the visitor mode; "quieter" means two different things:

| Visitor mode | What quieter means | What must survive |
| --- | --- | --- |
| `Persuade`, `Experience` | A more restrained palette, more whitespace, more air in the type. Drama is reduced, not removed. | The point of view and the signature of the piece |
| `Operate`, `Read` | Less visual noise: fewer background accents, flatter cards, less color, less motion. The tool recedes behind the task. | Every affordance and the reading order |

- Know what already works and what the core message is, so the pass does not throw them away.

### Steps

1. Take stock of the intensity sources and write down, for each, what is loud and where:
   saturation (bright or fully saturated color), contrast (high-contrast pairs everywhere), weight
   (many heavy elements competing), motion (too much, or too dramatic), complexity (patterns,
   decoration, layered effects) and scale (everything large, no hierarchy).
2. Decide what stays strong: very few anchors, and everything else recedes.
3. Color: bring fully saturated colors down to 70-85% saturation; use fewer colors; let neutrals
   carry most of the surface and keep accent color to about 10% of it; keep high contrast only
   where it matters most; prefer grays tinted warm or cool over pure gray. Never put gray text on a
   colored ground: use a darker shade of that same color. Lowering the text's opacity is not a
   substitute, because the contrast then depends on whatever sits behind it. The contrast floor
   (4.5:1 body, 3:1 large text) still holds.
4. Weight: step type weights down (900 to 600, 700 to 500) and sizes where they shout; carry
   hierarchy with weight, size and space instead of color and boldness; add breathing room; thin,
   fade or remove borders and rules.
5. Effects: remove gradients, shadows, patterns and textures that serve nothing; reduce blur, glow
   and stacked shadows; pull extreme corner radii back; flatten layering.
6. Motion: shorten travel to 10-20px; keep functional motion and remove flourishes; use a smooth
   ease-out with no overshoot, never bounce or elastic; remove an animation that has no purpose.
   Project `MOTION.md` tokens win over these numbers, and the reduced-motion path stays intact.
7. Composition: smaller jumps between sizes, stray elements back on the grid, one even spacing
   rhythm.
8. Check the result against the generic quiet described below before calling it done.

### Do not

- Arrive at the same quiet as every other page: gray text on white, one sans at one weight and a
  grid of identical cards. Restraint still needs a point of view.
- Make everything the same size and weight; hierarchy still matters, and some anchors stay.
- Remove all color. Quiet is not grayscale.
- Make everything small and light, or weaken the affordances of working controls.
- Change the concept. A surface that needs a different direction is not a quieter pass.

### Done when

- Each intensity source from step 1 has its before and after written down (saturation, weights,
  travel distance, effects removed).
- `Persuade` or `Experience`: the point of view and the signature are still recognizable in the
  render. `Operate` or `Read`: the tasks still complete, and long text is easier to read.
- No gray text sits on a colored ground, and the contrast floor holds.
- Before and after captures exist for the same viewports.

### Hand-off

Go on to [polish](#polish) for the final pass.

## Provenance

Method distilled from [pbakaus/impeccable](https://github.com/pbakaus/impeccable) (Apache-2.0),
`.claude/skills/impeccable/reference/critique.md`, `polish.md`, `distill.md` and `quieter.md`, read
at upstream HEAD `f2baa414a87d9acf1e21ccf776bfaec0262ad6df`. The source lock records the catalog
revision reviewed for the whole command surface; between the two, `distill.md` and `quieter.md`
each changed one rule (semantic colors keep a non-color cue; no opacity substitute for gray text on
color), and this guide follows the later wording. No upstream file is vendored or copied. Scoring
scales, recorded critique history and the cause and order of polish fixes are not defined here.

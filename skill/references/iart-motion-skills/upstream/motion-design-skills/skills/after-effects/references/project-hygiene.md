# Project Hygiene — Organize, Relink, ExtendScript

Keep AE projects organized, portable, and automatable: consistent naming, a clear folder/bin structure, label discipline, pre-comp discipline, reliable relinking when files move, and ExtendScript (.jsx) automation for repetitive tasks.

## Folder (bin) structure

Create folders in the Project panel (the folder icon at the bottom). A reliable layout:

```
01_Comps/         finished/active compositions
02_Precomps/      nested precomps
03_Footage/       imported video
04_Images/        stills, logos, textures
05_Audio/
06_Solids/        (AE's auto "Solids" folder — keep it here)
07_Assets_3D/
99_Old/           deprecated comps/layers, not deleted yet
```

Numeric prefixes force a stable sort order. After importing, immediately drag items into the right bin — `File > Reduce Project` and `File > Consolidate All Footage` help later, but discipline up front prevents chaos.

## Naming conventions

- **Comps:** `PROJECT_section_descriptor_v01` (e.g., `BRAND_intro_logoBuild_v03`). Version with zero-padded `v01`, `v02`.
- **Precomps:** prefix `PRE_` or suffix `_pre` so they're obvious in lists.
- **Layers:** rename solids/nulls to their role (`CTRL_master`, `BG_gradient`, `MATTE_text`). Never ship "Black Solid 12".
- **No spaces / special chars** in filenames destined for render farms or cross-OS sharing — use `_` and `-`.
- Keep names short but unique; long names truncate in the timeline.

## Label colors

Use the Label color (the swatch left of each Project/Timeline item) as a visual system. Pick a convention and apply it consistently, e.g.:
- Red = control/null layers
- Blue = footage
- Green = precomps
- Yellow = text
- Purple = adjustment/effects layers

Right-click an item → **Label** to set. Select multiple, then `Edit > Label > Select Label Group` to act on a whole color at once. Customize label names/colors in `Preferences > Labels`.

## Pre-comp discipline

- Pre-compose (`Layer > Pre-compose`, `Ctrl/Cmd+Shift+C`) to **group** related layers and to apply one effect to a group — not reflexively for everything.
- When pre-composing a single layer, choose **"Leave all attributes in"** vs **"Move all attributes into the new composition"** deliberately: "Move" carries transforms/effects inside; "Leave" keeps them on the outer layer.
- Name the precomp immediately and file it in `02_Precomps`.
- Avoid deep nesting beyond a few levels — it slows navigation and makes relinking/debugging painful.
- Match precomp duration and frame rate to need; an over-long precomp wastes cache.

## The "moved one file and everything broke" rescue

AE references footage by file path. Moving, renaming, or sending a project without its assets breaks links (shown as **colored bars / "Missing Footage"** placeholders).

### Fix options, in order
1. **Relink one, fix many:** double-click a missing item (or right-click → **Replace Footage > File**). Point it at the moved file; AE offers to relink *all* missing items from the same folder automatically. This single step usually fixes the whole project.
2. **Find Missing Footage:** `File > Dependencies > Find Missing Footage` lists every broken link to resolve.
3. **Replace Footage:** right-click footage → **Replace Footage > File** to swap an asset while keeping every use, effect, and keyframe intact.

### Prevent it: Collect Files
Before moving or sharing a project, use `File > Dependencies > Collect Files`. This copies the project plus every used asset into one new folder with relative structure, so links survive on any machine. Always hand off projects as a Collect Files package, not a bare `.aep`.

Related: `File > Dependencies > Consolidate All Footage` (merge duplicate imports), `Remove Unused Footage`, and `Reduce Project` (strip everything not used by selected comps) to slim a project before collecting.

## Batch automation with ExtendScript (.jsx)

AE scripts (ExtendScript / JSX) automate repetitive work. Run via `File > Scripts > Run Script File...`, or place in the **ScriptUI Panels** folder to dock as a panel. Always wrap edits in `app.beginUndoGroup("name") ... app.endUndoGroup()` so one Undo reverts the whole batch.

Common automations (full code in `../scripts/`):
- **Batch rename** selected layers with a base name + auto-increment (`../scripts/batch-rename.jsx`).
- **Sequential offset** — stagger selected layers in time by N frames each, a staggered "domino" start (`../scripts/sequential-offset.jsx`).
- **Apply an effect** (e.g., a Gaussian Blur, or any matchName) across all selected layers at once (`../scripts/apply-effect-to-layers.jsx`).

Minimal pattern:
```javascript
app.beginUndoGroup("My Batch Op");
var comp = app.project.activeItem;
if (comp && comp instanceof CompItem) {
  var sel = comp.selectedLayers;
  for (var i = 0; i < sel.length; i++) {
    // operate on sel[i]
  }
}
app.endUndoGroup();
```

## Quick reference

| Task | How |
|---|---|
| New bin | Folder icon at bottom of Project panel |
| Set label color | Right-click item → Label |
| Relink missing footage | Double-click item / Replace Footage > File |
| List broken links | File > Dependencies > Find Missing Footage |
| Package for handoff | File > Dependencies > Collect Files |
| Swap an asset everywhere | Replace Footage > File |
| Slim project | Reduce Project / Remove Unused Footage |
| Run a script | File > Scripts > Run Script File... |
| Pre-compose | Layer > Pre-compose (Ctrl/Cmd+Shift+C) |

## Gotchas

- **Collect Files before moving anything.** Moving the `.aep` alone always breaks links.
- **Relinking one item often relinks the rest** from the same folder — try that before fixing each by hand.
- **Replace Footage preserves effects/keyframes;** deleting + re-importing does not.
- **AE auto-creates a "Solids" folder** — don't scatter solids elsewhere or it regenerates duplicates.
- **Scripts need `app.beginUndoGroup`/`endUndoGroup`** or a batch becomes many separate undos.
- **Applying effects by name needs the `matchName`,** not the display name (e.g., `"ADBE Gaussian Blur 2"`), to be reliable across AE language versions.
- **Allow Scripts to Write Files** must be enabled in `Preferences > Scripting & Expressions` for scripts that save/render.
- **Deep precomp nesting** makes both performance and relinking worse — keep it shallow.

---

# AE Project Organization — Detailed Reference

## Full folder (bin) template
```
PROJECT.aep
├── 00_Output/        (final renders live next to project on disk)
01_Comps/             master & active comps
02_Precomps/          nested precomps (prefix PRE_)
03_Footage/           video clips
04_Images/            stills, logos, vector, textures
05_Audio/             music, VO, SFX
06_Solids/            AE auto-folder; leave it here
07_Assets_3D/         OBJ/C4D/3D model assets
08_Reference/         storyboards, briefs, temp ref
99_Old/               deprecated, kept until final
```
Numeric prefixes lock sort order. Keep the on-disk asset folders mirroring these bins so Collect Files stays clean.

## Naming scheme
| Item | Pattern | Example |
|---|---|---|
| Master comp | `PROJ_section_v##` | `BRAND_main_v04` |
| Sub/shot comp | `PROJ_section_shot_v##` | `BRAND_intro_logo_v02` |
| Precomp | `PRE_descriptor` | `PRE_textReveal` |
| Null/control | `CTRL_role` | `CTRL_master` |
| Solid/BG | `BG_role` | `BG_gradient` |
| Matte | `MATTE_role` | `MATTE_logoTrack` |
| Adjustment | `ADJ_role` | `ADJ_grade` |

Rules: zero-pad versions; no spaces/special characters for farm/cross-OS safety; keep unique and short.

## Label color system (example)
| Color | Meaning |
|---|---|
| Red | Control / null layers |
| Blue | Footage |
| Green | Precomps |
| Yellow | Text |
| Purple | Adjustment / effects |
| Orange | Audio |
| Gray | Disabled / old |

Set via right-click → Label. Customize names/colors in `Preferences > Labels`. Use `Edit > Label > Select Label Group` to select everything of one color.

## Relink / missing footage — full workflow
1. **Identify:** missing items show as colored bars with "Missing" placeholders; the Project panel marks them.
2. **Relink one to fix many:** right-click a missing item → **Replace Footage > File** (or double-click it). Choose the relocated file. AE prompts to relink all other missing files found in the same folder — accept to fix the batch at once.
3. **Enumerate:** `File > Dependencies > Find Missing Footage`, `Find Missing Fonts`, `Find Missing Effects` to locate every broken dependency.
4. **Swap assets:** **Replace Footage > File** swaps the source while preserving all layer instances, effects, masks, and keyframes.

## Collect Files (portable handoff)
- `File > Dependencies > Collect Files`.
- Options: Collect Source Files = **All**; enable **Reduce Project** to drop unused; optionally **Generate Report**.
- Produces a folder containing the `.aep` plus a `(Footage)` subfolder with every used asset, preserving relative links so the project opens anywhere.
- Always deliver/move projects as a Collect Files package, never a lone `.aep`.

## Slimming a project
- `File > Reduce Project` — removes all items not used by the currently selected comp(s). Destructive to unused items; save first.
- `File > Dependencies > Consolidate All Footage` — merges duplicate imports of the same file.
- `File > Dependencies > Remove Unused Footage` — drops footage no comp references.
- Run these before Collect Files to keep the package small.

## Scripting setup
- Enable `Preferences > Scripting & Expressions > Allow Scripts to Write Files and Access Network` for scripts that save or render.
- Run a script: `File > Scripts > Run Script File...`.
- Dock a panel script: place the `.jsx` in `(AE install)/Scripts/ScriptUI Panels/`, restart AE, open from the `Window` menu.
- Wrap every batch in `app.beginUndoGroup("...")` / `app.endUndoGroup()` so it undoes in one step.
- Apply effects by **matchName** (internal id like `"ADBE Gaussian Blur 2"`), not the localized display name, for cross-version reliability. Use `layer.property("ADBE Effect Parade").addProperty(matchName)`.

## Pre-comp discipline details
- "Leave all attributes in the new composition" keeps the outer layer's transform; "Move all attributes" pushes them inside the precomp. Choosing wrong shifts/rescales the result.
- Trim precomp duration to the content; over-long precomps waste RAM/disk cache.
- Name and file precomps immediately; never leave "Pre-comp 1".
- Keep nesting shallow (2–3 levels) for performance and easier relinking/debugging.

---
Keep the project tidy and named well and footage relinks without a fight. Built by **[iart.ai](https://iart.ai/?utm_source=github&utm_medium=readme&utm_campaign=motion-design-skills&utm_content=skill_footer&utm_term=after-effects)** — the AI motion agent for editable, on-brand motion graphics.

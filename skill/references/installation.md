# Install and upgrade

`design-pipeline` installs as one Codex skill. Its scripts and bundled tools live in the installed
skill directory; the project you are working on remains a separate directory. The command-line
entry is a Node.js script, not a standalone binary. Use Node.js 22 or newer.

## Verify a complete publication snapshot

For current-version verification, use a **full copied project-scoped installation from the
verified publication snapshot**, not a few synchronized files and not the live global developer
junction. Pin the source commit and `skill/` Git tree, package the complete frozen snapshot,
record the archive SHA-256, and extract it before installing. A local candidate archive is not
a published release; `VERSION` and generated `PACKAGE.json` alone do not identify its source
commit or prove that the copy was evaluated by a model.

From a disposable verification project, install the complete extracted `design-pipeline/`
directory using the installer bundled in that same archive:

```powershell
$ExtractedSkill = "C:/verification/extracted/design-pipeline"
$Project = "C:/verification/project"
$SkillsRoot = Join-Path $Project ".agents/skills"
$Installed = Join-Path $SkillsRoot "design-pipeline"
node "$ExtractedSkill/scripts/install-local.cjs" `
  --source $ExtractedSkill --root $SkillsRoot --target $Installed
if ($LASTEXITCODE -ne 0) { throw "Copied installation failed" }
node "$Installed/scripts/designer-pipeline.cjs" doctor --root $Project --json
if ($LASTEXITCODE -ne 0) { throw "Installed doctor failed" }
$PreviousRoots = $env:DESIGN_PIPELINE_SKILL_ROOTS
$env:DESIGN_PIPELINE_SKILL_ROOTS = $SkillsRoot
Push-Location $Project
try {
  node "$Installed/scripts/check-deps.cjs" --json
  if ($LASTEXITCODE -ne 0) { throw "Installed dependency check failed" }
} finally {
  Pop-Location
  $env:DESIGN_PIPELINE_SKILL_ROOTS = $PreviousRoots
}
```

Use a fresh destination, without `--replace`; compare full extracted and installed file
inventories and hashes.
The installer refuses junctions/symlinks, copies the whole directory and checks the staged copy
with `doctor` before promotion. Its `installed` result does not replace the separate
project-context checks above. Explicit dependency roots prevent an older global copy from
winning discovery.

Record path/realpath, source commit/tree, package version and archive digest, generated
`PACKAGE.json`, installed file inventory/digest, command outputs and exit codes together.
An agent's loaded `SKILL.md` path must match the intended installation. `doctor`/`check-deps`
are technical diagnostics, not model experiments or owner Visual Acceptance.

The maintained repository guide,
[Installation and evaluation provenance](https://github.com/2233admin/design-pipeline/blob/main/docs/installation-and-evaluation-provenance.md),
contains pinned historical identities and the complete snapshot/package/install procedure.
Final verification of a newly integrated commit belongs in a new record, not an old experiment
log. Keep frozen snapshots, logs and original outputs unchanged.

## Install a development checkout

To put the current checkout in the legacy Codex `~/.codex/skills/design-pipeline` location, run
the repository's local installer from the repository root:

```sh
node scripts/install-local.cjs \
  --source skill \
  --root "$HOME/.codex/skills" \
  --target "$HOME/.codex/skills/design-pipeline"
```

On Windows PowerShell, the same command is:

```powershell
node scripts/install-local.cjs `
  --source skill `
  --root (Join-Path $HOME ".codex/skills") `
  --target (Join-Path $HOME ".codex/skills/design-pipeline")
```

The local installer refuses to replace an existing target unless `--replace` is supplied. If an
older installation contains local changes you need, first preserve it outside Codex skill
discovery roots. Then run the same command with `--replace` to upgrade the installed copy:

```sh
node scripts/install-local.cjs \
  --source skill \
  --root "$HOME/.codex/skills" \
  --target "$HOME/.codex/skills/design-pipeline" \
  --replace
```

The standard [Skills CLI](https://github.com/vercel-labs/skills) can also install just this skill.
For a project-scoped copy from a local checkout, run this from the project directory and replace
the source placeholder with the absolute path to the checkout's `skill/` directory:

```sh
npx skills add "/absolute/path/to/design-pipeline/skill" \
  --skill design-pipeline --agent codex --copy --yes
```

Project-scoped Codex installation uses `.agents/skills/design-pipeline` in the project.
Add `--global` for a user-level installation under `~/.agents/skills/design-pipeline`.
Use the actual path from the Skills CLI output or the `SKILL.md` loaded by your agent when
calling scripts; the repository's local installer uses the legacy `~/.codex/skills` destination.

The project also documents the portable skill-manager command for a pushed repository version:

```sh
npx skills add 2233admin/design-pipeline --skill design-pipeline --agent codex --global
```

That remote form installs the version already pushed to the repository. For changes still in a
local checkout, use the local installer or the local source path so the installed copy includes
those changes.

A checkout install is a development copy unless its complete bytes are tied to a verified
snapshot. A global symlink/junction tracks local edits immediately: preserve it and its source,
do not treat it as a copied release or replace it to perform verification. If diagnostics fail,
label that copy development/unverified and record the failures separately.

## Call a tool from a project

Call the installed CLI by its absolute path, run it from the project you want to affect, and pass
that project's root explicitly. Set `SKILL_ROOT` to the path reported by your installer or agent;
this example uses the repository installer's legacy destination:

```sh
SKILL_ROOT="$HOME/.codex/skills/design-pipeline"
node "$SKILL_ROOT/scripts/designer-pipeline.cjs" \
  composition scaffold --root "$PWD" --template visual-craft --output "visual-craft-study"
```

The scaffold creates a new output directory and copies the Visual Craft study, Canvas helper and
its license there. It will not replace existing project content and does not initialize film or
workflow state. Open [the Visual Craft guide](../tools/visual-craft/README.md) for the copied
files, APIs and a small browser study.

Check the installed copy with `node "<installed-skill-root>/scripts/designer-pipeline.cjs"
doctor --root <project>`. Ask the agent to load that installation's `design-pipeline` skill;
the file paths in its loaded instructions identify which copy it is using.

`doctor` diagnoses the installed copy and runtime environment; it does not automatically
install, replace or repair skills.

## Self-check discovery roots

Run the installed dependency self-check from the project directory:

```sh
node "$SKILL_ROOT/scripts/check-deps.cjs" --json
```

With no nonempty explicit root setting, the self-check searches these directories in order:

1. `<CODEX_HOME>/skills` when `CODEX_HOME` is set, otherwise `~/.codex/skills`.
2. `~/.agents/skills` for standard Skills CLI user installations.
3. `<current-working-directory>/.agents/skills` for standard project installations.

Default directories are resolved to absolute paths and de-duplicated in first-seen order.
`CODEX_HOME` changes only the legacy candidate, not the user or project `.agents` roots.
Run from the intended project: the project root is the current working directory, not the
installed script's directory. The legacy root remains first when multiple copies are available.

For custom locations, set `DESIGN_PIPELINE_SKILL_ROOTS`, or `CODEX_SKILLS_DIR` when the
former is unset or empty. Each value is a list of skills directories (the parents of
`design-pipeline` and companion directories), separated by `:` on macOS/Linux or `;` on
Windows. Entries are resolved relative to the current working directory when not absolute.
The first nonempty setting wins: `DESIGN_PIPELINE_SKILL_ROOTS` takes precedence over
`CODEX_SKILLS_DIR`. An explicit list replaces all defaults; no default directory is appended,
so an invalid configured root still fails even if a complete default installation exists.

The JSON report includes searched roots, discovered companions and missing core resources.
A missing required skill or resource returns `FAIL` and exit 1; a complete core package returns
`OK` and exit 0 even when optional companions are absent. This check is diagnostic only and
does not install or repair anything.

## Runtime notes

- Most CLI commands and project checks use Node.js 22 or newer.
- Video analysis and film rendering need `ffmpeg` and `ffprobe` on `PATH` when those operations
  are used; a small Canvas study does not.
- Visual Craft draws with the browser's native Canvas API and needs no extra rendering engine,
  package installation, remote image or remote font.
- Art Motion's browser study and Canvas runtime also run without npm dependencies. Use
  `--template art-motion` for its editable material study and clip example; load its
  [tool guide](../tools/art-motion/README.md) only when needed.
- Headless Art Motion rendering (`designer-pipeline art-motion render`) uses the existing
  project-local `puppeteer-core` and Chrome resolver. An existing HyperFrames project provides
  both. Otherwise install `puppeteer-core` in the consuming project and pass
  `--chrome <existing-browser-path>`; `--puppeteer-module` can select an existing module
  explicitly. No global npm install is needed.
- Font subsetting alone needs FontTools: invoke its script with scoped
  `uv run --with fonttools python`. For repository tests, run
  `uv run --with fonttools --python 3.14 node scripts/qa.cjs`, then `npm run test:browser`.
  Alternatively set `FONTTOOLS_PYTHON` to an existing Python with FontTools for `npm test`.
- The global skill installation provides the agent instructions and CLI entry point. It is not an
  independent executable; invoke the CLI through `node` and the installed absolute path.

# Install and upgrade

`design-pipeline` installs as one Codex skill. Its scripts and bundled tools live in the installed
skill directory; the project you are working on remains a separate directory. The command-line
entry is a Node.js script, not a standalone binary. Use Node.js 22 or newer.

## Install the current checkout

To put the current checkout in Codex's canonical `~/.codex/skills/design-pipeline` location, run
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
Add `--global` for a user-level installation. Take the actual root from the Skills CLI output
or the `SKILL.md` path loaded by your agent; it can differ from the repository installer's
`~/.codex/skills` destination.

The project also documents the portable skill-manager command for a pushed repository version:

```sh
npx skills add 2233admin/design-pipeline --skill design-pipeline --agent codex --global
```

That remote form installs the version already pushed to the repository. For changes still in a
local checkout, use the local installer or the local source path so the installed copy includes
those changes.

## Call a tool from a project

Call the installed CLI by its absolute path, run it from the project you want to affect, and pass
that project's root explicitly. Set `SKILL_ROOT` to the path reported by your installer or agent;
this example uses the repository installer's canonical destination:

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

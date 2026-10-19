# Install and upgrade

`design-pipeline` is one skill. Its scripts and bundled tools live in the installed skill
directory; the project you are working on is a separate directory. The command-line entry is a
Node.js script, not a standalone binary. It needs Node.js 22.12 or newer.

Both install paths below use the GitHub Release package (`design-pipeline-skill.zip`, about 50 MB;
the large MengTo and iart libraries are downloaded later, see Runtime notes). The step-by-step page
for people is `docs/install.md` in the repository.

## Where the skill is installed

| Installed with | Skill directory |
| --- | --- |
| Claude Code plugin | `~/.claude/plugins/cache/design-pipeline/design-pipeline/<version>/` |
| Skills CLI for Codex and other agents (`-g`) | `~/.agents/skills/design-pipeline` |
| Skills CLI without `-g` | `<project>/.agents/skills/design-pipeline` |
| `scripts/install-local.cjs` (offline package or checkout) | `~/.agents/skills/design-pipeline` unless `--root` or `--target` say otherwise |

The loaded `SKILL.md` path tells you which copy you are using. Call the CLI by its absolute path:
`node "<skill-root>/scripts/designer-pipeline.cjs" <command>`, from the project you want to affect
or with `--root <project>`.

## Install commands

Claude Code (run in a session):

```text
/plugin marketplace add 2233admin/design-pipeline
/plugin install design-pipeline@design-pipeline
```

Codex and other agents (the package is larger than the Skills CLI defaults, so raise its limits):

```sh
SKILLS_DOWNLOAD_MAX_BYTES=104857600 SKILLS_EXTRACT_MAX_BYTES=268435456 SKILLS_EXTRACT_MAX_FILES=5000 \
  npx skills add https://github.com/2233admin/design-pipeline/releases/latest/download/design-pipeline-skill.zip \
  --skill design-pipeline -a codex -g
```

An installer that is not on this list, or an offline machine, uses the local installer from the
extracted package or a checkout. It refuses to replace an existing target unless `--replace` is
given:

```sh
node scripts/install-local.cjs --source skill            # checkout, to ~/.agents/skills/design-pipeline
node design-pipeline/scripts/install-local.cjs --replace # extracted Release package, upgrade in place
```

Upgrade: `claude plugin update design-pipeline@design-pipeline`, or run the Skills CLI command again.

## Check the install

Run `node "<skill-root>/scripts/designer-pipeline.cjs" doctor`. It prints where the skill is
installed, which agents it found, and three tiers: required (Node.js 22.12+, skill files; a missing
item exits 2), recommended (a Chromium-based browser for evidence gates) and optional (the MengTo
and iart libraries, ffmpeg and ffprobe, Blender). Every missing item prints one command to run.
Missing recommended or optional items exit 0. `doctor --json` prints the machine result. `doctor`
never installs, replaces or repairs anything; run a printed command only when the task needs that
tool, and tell the user what you are about to install first.

## Call a tool from a project

Run the CLI from the project and pass that project's root explicitly:

```sh
node "<skill-root>/scripts/designer-pipeline.cjs" \
  composition scaffold --root "$PWD" --template visual-craft --output "visual-craft-study"
```

The scaffold creates a new output directory and copies the Visual Craft study, Canvas helper and
its license there. It will not replace existing project content and does not initialize film or
workflow state. Open [the Visual Craft guide](../tools/visual-craft/README.md) for the copied
files, APIs and a small browser study.

## Self-check discovery roots

Run the dependency self-check from the project directory:

```sh
node "<skill-root>/scripts/check-deps.cjs" --json
```

With no nonempty explicit root setting, the self-check searches these directories in order:

1. The directory that holds the running copy, when that copy sits in a folder named
   `design-pipeline` (the running copy always counts as the core skill, wherever it is).
2. `~/.claude/skills`.
3. `~/.agents/skills`.
4. `<current-working-directory>/.agents/skills`.
5. `<current-working-directory>/.claude/skills`.
6. `<CODEX_HOME>/skills` when `CODEX_HOME` is set, otherwise `~/.codex/skills` (older installs).

Default directories are resolved to absolute paths and de-duplicated in first-seen order. Run from
the intended project: the project root is the current working directory, not the script's
directory.

For custom locations, set `DESIGN_PIPELINE_SKILL_ROOTS`, or `CODEX_SKILLS_DIR` when the former is
unset or empty. Each value is a list of skills directories (the parents of `design-pipeline` and
companion directories), separated by `:` on macOS/Linux or `;` on Windows. Entries are resolved
relative to the current working directory when not absolute. The first nonempty setting wins:
`DESIGN_PIPELINE_SKILL_ROOTS` takes precedence over `CODEX_SKILLS_DIR`. An explicit list replaces
all defaults, including the running copy, so an invalid configured root still fails even if a
complete default installation exists.

The JSON report includes searched roots, discovered companions and missing core resources.
A missing required skill or resource returns `FAIL` and exit 1; a complete core package returns
`OK` and exit 0 even when optional companions are absent. This check is diagnostic only and
does not install or repair anything.

## Runtime notes

- Most CLI commands and project checks use Node.js 22.12 or newer.
- Video analysis and film rendering need `ffmpeg` and `ffprobe` on `PATH` when those operations
  are used; a small Canvas study does not. The error for a missing one names the install command
  (`brew install ffmpeg`, `winget install Gyan.FFmpeg` or `sudo apt install ffmpeg`).
- Blender (4.2 LTS or newer) is needed only for the Blender film templates; `BLENDER_PATH` or
  `--blender` points at an existing install.
- Visual Craft draws with the browser's native Canvas API and needs no extra rendering engine,
  package installation, remote image or remote font.
- Art Motion's browser study and Canvas runtime also run without npm dependencies. Use
  `--template art-motion` for its editable material study and clip example; load its
  [tool guide](../tools/art-motion/README.md) only when needed.
- MengTo and iart upstream skills (about 200 MB) are not in the package. Run
  `designer-pipeline sources fetch --all` (or `--bundle mengto-skills|iart-motion-skills`) once
  with network access to `raw.githubusercontent.com`; every file is checked against the pinned
  manifest before the tree is installed in the user cache (`~/.cache/design-pipeline`,
  `~/Library/Caches/design-pipeline`, `%LOCALAPPDATA%\design-pipeline\Cache`, or
  `DESIGN_PIPELINE_CACHE`). `doctor` lists bundles still to fetch; an offline machine can receive a
  copy of that cache directory.
- The design direction library ships its text and HTML specimens in the package; its specimen
  images and audio (about 40 MB) are fetched the same way with
  `designer-pipeline sources fetch --bundle design-direction-library`. Without them the library's
  text still works.
- Browser-backed commands (film and composition capture, score render, interaction probes, Art
  Motion render) use the project-local `puppeteer-core` and one shared browser resolver. It takes
  `--chrome <path>`, then `PUPPETEER_EXECUTABLE_PATH`, then the HyperFrames headless shell
  (`npx hyperframes browser ensure`, pinned and preferred for comparable renders), then an
  installed Chrome, Edge or Chromium. A wrong explicit path fails instead of falling back. When
  none is found the error names `npx hyperframes browser ensure`, the same command `doctor`
  prints. Art Motion's `render-report.json` and interaction results record the browser and its
  version. An existing HyperFrames project provides `puppeteer-core`; otherwise install it in the
  consuming project or pass `--puppeteer-module`. No global npm install is needed.
- Font subsetting alone needs FontTools: invoke its script with scoped
  `uv run --with fonttools python`. For repository tests, run
  `uv run --with fonttools --python 3.14 node scripts/qa.cjs`, then `npm run test:browser`.
  Alternatively set `FONTTOOLS_PYTHON` to an existing Python with FontTools for `npm test`.
- The skill installation provides the agent instructions and CLI entry point. It is not an
  independent executable; invoke the CLI through `node` and the installed absolute path.

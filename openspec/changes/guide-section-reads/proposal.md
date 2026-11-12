# Proposal: read one section of a guide, and one command's usage

## Why

An agent that needs one stage of the workflow has to load the whole file. `references/stages.md` is
93,614 bytes in 1,249 lines; Stage 4 is lines 620–837, a sixth of it. The largest guide,
`motion-recipes/families/web.md`, is 118,976 bytes. There are 183 packaged guides. `SKILL.md`
already links into them by anchor (`references/stages.md#stage-4-tasks`), so the section is
named, but nothing reads it as a section.

The same holds for the CLI. `designer-pipeline --help` is 20,297 bytes for 57 commands. An agent
that wants the flags of `fonts query` loads all of it.

The MotionHarness CLI (npm `@motionharness/cli` 0.1.5) shows the shape that works: `mh skill
--reference <name> --section <heading>` returns one heading with its subsections, and
`mh describe <command>` returns one command. The comparison is in
[docs/research/motionharness-cli-comparison-2026-11-12.md](../../../docs/research/motionharness-cli-comparison-2026-11-12.md)
(gap G3). Ideas only: no MotionHarness text or code is used.

Less context per lookup helps every model that runs the pipeline, including small ones.

## What changes

- New command `designer-pipeline skill`:
  - `skill --list` lists the packaged guides (name, title, heading count).
  - `skill --reference <name> --list` lists that guide's headings with level and anchor.
  - `skill --reference <name> --section <heading-or-anchor>` returns that heading and its
    subsections. Without `--json` it prints the Markdown only.
- New command `designer-pipeline describe <command> [action]`: prints the `--help` entries of that
  command, taken from the same lines `--help` prints.
- New module `skill/scripts/guide-core.cjs` holds the heading parser, anchor rule, section
  extraction and help splitting. `cli-core.cjs` gains two `COMMANDS` entries and the new `--section`
  and `--list` options.
- `SKILL.md` gains one sentence naming the two commands. Routing rows keep meaning "open the file".

## Reused, not added

- Anchor rule: the GitHub-style heading anchors that `tests/impeccable-product-design.test.cjs`
  already computes (fence-aware, links and code marks stripped, repeats numbered). That copy moves
  into `guide-core.cjs` and the test imports it, so there is one rule. The anchors that existing
  links use stay valid.
- Path containment: `resolveInside` and the JSON result envelope from `contract-utils.cjs`.
- Help text: `publicHelp()` stays the only source of usage lines.
- Option registration: `--reference` is already a known option; `--section` and `--list` are added
  to `KNOWN_OPTIONS` / `BOOLEAN_OPTIONS`.

## Boundaries

- No gate, receipt, schema, finding code or workflow stage. Guide files are not edited or split.
- No per-command JSON Schema and no `capabilities` command. `describe` returns usage text, not a
  machine schema; typed schemas would mean rewriting each handler's option reading.
- No ticket: this line of work records in OpenSpec and the PR.
- A section read is partial. A route row that says to open a guide still means the whole file
  unless it names a section.

## Capabilities

- `design-pipeline`: ADDED four requirements (section read, list, rejection cases, describe).

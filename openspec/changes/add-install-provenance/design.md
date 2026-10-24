# Design: install provenance

## Record

`PACKAGE.json` at the skill root. `scripts/package.cjs` already generated it (`name`, `version`,
`packagedAt`, `source`, `install`); this change adds the provenance fields to it rather than a
second file:

```json
{
  "schema": "design-pipeline.install-provenance.v1",
  "version": "0.13.0",
  "commit": "<40 hex> | null",
  "dirty": "true | false | null",
  "treeDigest": "sha256:<64 hex>",
  "digestRules": "v1"
}
```

`version` is the package version in an archive (`PACKAGE_VERSION`, the tag, or `0.0.0-dev`) and the
repository `VERSION` for a checkout install. `dirty: null` means unknown and never blocks. A
`PACKAGE.json` without this `schema` (packages built before this change) counts as no record.

Ownership: `skill/scripts/install-provenance.cjs` owns the schema, the digest and the Git probe;
`scripts/package.cjs`, `scripts/install-local.cjs` and `doctor` call it. The packaged installer
loads it from its own `scripts/` folder, the repository installer from `skill/scripts/`.

## Digest rules v1

1. Walk the skill root. Hash regular files only; symbolic links and junctions inside the root are
   neither followed nor hashed (`install-local.cjs` and `package.cjs` already refuse them).
2. Path: relative to the root, `/` separators.
3. Exclude `PACKAGE.json` at the root and everything under `.design-pipeline/` at the root.
4. Sort by the bytes of the UTF-8 path (not UTF-16 code units, not locale order).
5. For each file append `<path>\0<sha256 hex of the raw bytes>\n` (no newline normalization).
6. `treeDigest` = `sha256:` + SHA-256 of the concatenation.

Exclusions are the locations the skill writes into its own root after install. Observed in the code:

| Location | Writer | In the root? |
| --- | --- | --- |
| `.design-pipeline/` | the CLI's project state under `--root` (default: cwd) | only when the CLI runs from the skill root |
| `sources fetch` bundles | `vendor-cache.cjs` `cacheRoot` | no: per-user cache (`DESIGN_PIPELINE_CACHE`, `%LOCALAPPDATA%`, XDG) |
| appearance ledger | `appearance-ledger-core.cjs` | no: `~/.design-pipeline/ledger.json` |
| HyperFrames catalog, Strudel | `film-blocks-core.cjs`, `score-core.cjs` | no: the project directory |
| Python bytecode | `skill/tools/**/*.py` | no: they set `sys.dont_write_bytecode` |

`package.cjs` computes the digest over the bytes it writes into the archive, so an extracted copy
recomputes the same value. The Skills CLI drops `metadata.json` files and `.git/`, `__pycache__/`
and `__pypackages__/` directories when it copies a skill; packaging fails on them instead of
excluding them from the digest.

## Install

`install-local.cjs` copies the source to the temporary sibling, then:

- the source carries a record: it must be well formed and its `treeDigest` must equal the staged
  copy's digest, else the install fails and nothing is renamed;
- otherwise the source is probed with Git (only when `SKILL.md` is tracked there, so an extracted
  package inside an unrelated repository is not attributed to it): `rev-parse HEAD`,
  `status --porcelain -- .`, and `VERSION` at the work-tree top; a pre-provenance `PACKAGE.json`
  keeps its fields. The record is written into the staged copy.

The staged `doctor --json` run still validates the copy. It accepts exit 2 only when the sole cause
is `dirty: true` with a matching digest, so a copy of uncommitted work installs and then reports
itself blocked. The install result prints the recorded `provenance`.

## Doctor

`inspectDoctor` adds `provenance` (`status` recorded, absent or invalid; version, commit, dirty,
recorded and actual digest, `digestMatch`, `blocking`) and sets `status: blocked` when `blocking`
is set. The report:

| Record | Location | Result |
| --- | --- | --- |
| recorded, digest matches, dirty false or null | any | required item ok |
| recorded, digest differs | any | required item failed, blocked |
| recorded, dirty true | any | required item failed, blocked |
| unreadable or malformed | any | required item failed, blocked |
| absent | standard agent location | recommended warning "provenance not recorded" |
| absent | other, Git work tree | `environment.install.git` {commit, branch, dirty}; never blocks |

A `Source` line under `Installed as` repeats the facts. The fix for every provenance item is
`claude plugin update design-pipeline@design-pipeline` for a plugin install and otherwise
`installCommand("skill", platform)`, the documented Skills CLI command.

A junction from a standard location to a checkout resolves to the checkout (`__dirname` follows the
junction), so it is classified `other` and shows the checkout's Git state without blocking; this
step does not change that.

## Compatibility

Existing installs have no record: one recommended warning, nothing blocks. Repository QA packages
the working tree; with uncommitted changes the installed copy is blocked by provenance alone, and
the QA doctor check and `designer-pipeline-cli.test.cjs` accept exactly that case.

# Design

The root retains the README, agent entry points, DESIGN/MOTION foundations, contribution and
security policies, release notes, notices, license and tool configuration. Long-form documentation
belongs under `docs/`; change artifacts belong under `openspec/changes/<change-id>/`; generated
captures, logs and experiments from the agent belong under ignored `.design-pipeline/`.

Google's [DESIGN.md specification](https://github.com/google-labs-code/design.md/blob/main/docs/spec.md)
defines visual-system documents, not repository layout or OpenSpec engineering decisions. The
root foundation will use the official section order and `version: alpha`; token groups delegated
to the user's terminal or Markdown renderer will use `omitted` entries with reasons. Repository
context and source decisions remain explicitly identified local extensions. No palette, viewport,
font size or component theme will be invented for this host-rendered package.

Historical files are moved byte-for-byte, with their former locations recorded in an archive
index. Existing source-path text in historical documents remains historical. The active README
links the new documentation index. A small check in `scripts/qa.cjs` enforces the agreed root
Markdown set; it does not introduce a distributed design gate.

Verify Google format with its official CLI, the existing local foundation checker, archive byte
hashes, current documentation links, strict OpenSpec validation and the existing repository QA.

## Public repository boundary

The user's follow-up excludes BMAD and local dot-directories from GitHub. Root dotpaths are local
by default, with explicit exceptions for `.github/`, `.gitignore` and `.gitattributes`. Ignore
`_bmad/`, `_bmad-output/` and the root `skills-lock.json` as local installations and generated data.
Use index-only removal for tracked local files; preserve their working copies and hashes. Move
the obsolete BMAD handoff note into local `_bmad-output/` as well.

`CLAUDE.md` imports the shared `AGENTS.md` and points to the packaged `skill/SKILL.md`; the public
repository no longer depends on a locally installed `.claude` router or BMAD-managed block.
The existing QA runner checks Git's ignored-but-tracked list to prevent force-added local state
from slipping into a later commit. Verify ignore semantics with a temporary Git repository and
run QA on a publication snapshot without local tooling. Do not push, rewrite history, or include
unrelated changes in a commit.

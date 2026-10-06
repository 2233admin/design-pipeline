# Design

The skill remains one `design-pipeline` installation. The installed skill root supplies scripts
and bundled inputs; `--root` or the caller's current directory supplies project inputs/outputs.
Calling a helper does not initialize the deliverable workflow.

`composition scaffold` accepts the existing `--template` and `--output` options. Only the
`visual-craft` template is supported initially. It reads all three bundled files relative to
its module, resolves output with the existing containment helper, and requires a new directory.
It refuses replacement, including with `--replace`, so authored project files are preserved.
The copied entry references its sibling helper and needs only a browser. No dependency install
or generated animation style is part of this operation.

Reuse `scripts/install-local.cjs` for canonical Codex installation. Preserve the old directory
outside discovery roots before explicit replacement. The other `.agents` installation belongs
to a separate consumer and remains unchanged. A portable skills CLI route is documented only
with the selected `design-pipeline` skill; nested upstream skills are not installed as entries.

Verification: add a CLI smoke scenario to the existing installed-package test file; run the
focused tests and normal repository QA. Check the skill-manager install in isolation, then
verify canonical installed bytes, doctor and scaffold from a separate project directory.
Installation/content evidence does not establish fresh-client model behavior or visual quality.

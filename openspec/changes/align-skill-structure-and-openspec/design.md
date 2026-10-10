# Design

State and authorization: see [README.md](README.md).

## OpenSpec

Use the verified stable [v1.14.1](https://github.com/Fission-AI/OpenSpec/releases/tag/v1.14.1).
Follow its [migration guide](https://github.com/Fission-AI/OpenSpec/blob/v1.14.1/docs/migration-guide.md):
move concise project context into `openspec/config.yaml`, put only relevant rules on each artifact,
and refresh generated Codex skills locally. Preserve the global custom workflow profile and
unrelated local skills. Repository instructions point to the current config instead of retaining
two maintained context bodies. Old archived documents remain historical.

The upstream Codex initializer installs five project-local skills and retires the matching global
`opsx-apply`, `opsx-archive`, `opsx-explore` and `opsx-propose` prompt files after their replacements
exist. Keep that migration explicit; the global custom profile, workflow selection and delivery
setting remain unchanged. The generated project skills stay ignored.

Normalize malformed active delta and scenario headings, adding concrete scenarios drawn from the
existing stated requirements where absent. Split overly long requirement prose into its stated
scenarios without weakening it. Do not use `skip_specs`, downgrade validation, infer acceptance,
or archive existing changes to make validation pass. Preserve a before/after validation report.

## Guidance ownership

`SKILL.md` selects bounded support or a complete deliverable. `tools/README.md` selects one helper.
The route reference and `stages.md` serve the selected workflow; each stage has one maintained body.
Keep compatibility anchors in the route reference pointing to the owning stage. Specialist guides
retain their technical contracts. Existing checks continue to own errors, hashes and receipts;
guidance never grants creative acceptance from test counts.

## Source organization

Move complete source bundles from `references/{deepclonewebsite,design-md,holosticker,
iart-motion-skills,interface-discipline,mengto-skills,prism-system,shadcnio-react-components}` and
`tools/art-motion-reference` into `vendor/<same-name>`. Their internal relative paths and source bytes
stay identical. Update project-owned importers, default catalog locations, documentation links,
package required paths and tests. Keep source IDs, revisions, licenses, hashes and CLI commands.
Do not rewrite raw upstream source or historical logs to match today's paths.

The maintained Art Motion reference bundle README becomes `references/art-motion-reference.md` with updated links;
it is guidance, not upstream source. All other 1,508 moved files retain their original SHA-256.

Keep adapted tools and their browser studies together. Keep existing schema/catalog file paths in
`references/` for compatibility; their role is explicit in navigation. Generated local captures
remain ignored. Do not merge repository tooling with code shipped in the skill.

## Verification

Use existing catalog integrity tests, installed-CLI tests and package QA. Compare every moved file
against its pre-move SHA-256. Check live Markdown targets, entry-to-guide routing and the absence
of stale source paths in maintained consumers. Validate all active OpenSpec changes and main specs
with the upgraded strict validator and inspect injected context via `openspec instructions`.
Run `node scripts/qa.cjs`; report the existing native Blender skip separately if still unavailable.
Back up the installed canonical skill before replacement, then verify its source and tool entry.

Rollback can restore changed consumer files and reverse the recorded moves. Do not restore the
whole Git index or overwrite unrelated edits. No commit, push or mass archival belongs to this change.

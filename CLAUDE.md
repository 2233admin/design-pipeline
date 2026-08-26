<project>
`design-pipeline` is a design-first frontend workflow and packaged agent skill.
The canonical package entrypoint is `skill/SKILL.md`; the project-local Claude
Code router is `.claude/skills/design-pipeline/SKILL.md`.
</project>

<working_rules>
- Read `openspec/project.md` and the relevant change files before changing behavior.
- Behavior changes require an OpenSpec change under `openspec/changes/<change-id>/`.
- Preserve existing user changes. Inspect `git status` before editing; do not reset,
  discard, or overwrite unrelated work.
- Keep target, snapshot, policy digest, and receipt lineage intact. Reuse existing
  v1 gates and contracts instead of creating parallel gate systems.
- Keep Component Conformance separate from Visual Acceptance.
</working_rules>

<entrypoints>
- CLI: `node skill/scripts/designer-pipeline.cjs <command>`
- Full skill contract: `skill/SKILL.md`
- Contribution and release rules: `CONTRIBUTING.md`
- OpenSpec project contract: `openspec/project.md`
</entrypoints>

<verification>
Run `node scripts/qa.cjs` after repository changes. Use the declared test
manifest through that command; do not rely on bare `node --test` discovery,
which can include nested upstream fixtures.
</verification>

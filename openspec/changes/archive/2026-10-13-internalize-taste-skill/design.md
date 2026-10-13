## Context and scope

Upstream revision `b482f7a970abb98c4108d4a9f761e458c64cefc8` has 62 tracked blobs, 4,824,721 bytes and thirteen SKILL.md entries. The v2 default is explicitly experimental; v1 remains an explicit compatibility choice. Existing host installations are not publication evidence. This work uses the clean attached worktree starting at the verified Good CSS commit `7b83274771081e243ef75c90893660c7a21f334f`.

## Decisions

1. Reuse the Git tree snapshot/canonical-hash importer pattern and v1 package-resource/source-check mechanisms. Preserve original bytes, modes, paths and MIT attribution. Verify the clean pinned checkout before replacing an existing snapshot, with rollback on failed staging. Never run upstream installers or sponsor-asset scripts.
2. Make `references/taste-skill.md` the maintained selection/adaptation door. It must expose all thirteen complete local entries, their intended outputs, relevant stage/artifact, verification and incompatibility boundaries. Read selected original entries; do not load all variants or flatten them into generic advice.
3. Reuse `visual-direction-review` for built-in Taste readiness and keep other companion behavior. Remove Taste from external install hints and route it locally. Package required-resource checks supply completeness; source checks supply identity. Neither claims that a model followed every rule or that a rendered design was accepted.
4. Keep user/project DESIGN.md, existing components, frameworks, accessibility, localization, motion budgets and evidence authoritative. Upstream style bans, Python randomization, AIDA layout, GSAP defaults, density presets and generated-reference-first rules are task-specific options. They do not replace user-supplied reference authority, require a new runtime or add a mandatory image-generation stage to every UI change.
5. Web/mobile/brandkit guidance uses the available image-generation capability to produce images only; it does not promise a bundled image model. Preserve the explicit missing-provider limitation. The image-to-code route can use already-authorized reference images and must verify a live implementation. Generated pixels and shipped research claims are not interaction tests or deterministic film playback.
6. Stitch's shipped DESIGN.md is an example, not a project foundation. Translate the selected visual decisions into the existing Google DESIGN.md format and preserve the project-owned provenance and component contracts.

## Ownership

- Source owner: `scripts/import-taste-skill.cjs`, `skill/vendor/taste-skill/**`; source audit and manifest inventory.
- Integration owner: `skill/references/taste-skill.md`, existing SKILL/reference/tool routing documents and `companion-capabilities.json`.
- Verification owner: `tests/taste-skill.test.cjs` and any existing check-deps regression adjustments.
- Primary owner: this OpenSpec change, package/test manifests, package scripts, attributes, notices, changelog, full QA, final integration and publication.

All contributors share this worktree; preserve other owners' edits. Do not write into the dirty original checkout while implementing. After verification, transfer only this change's hunks/new files back without replacing unrelated edits.

## Verification and compatibility

Check original Git blob/mode/tree/count/license and all thirteen frontmatter names; dirty/wrong-revision/incomplete imports preserve prior output. Resolve every maintained guide/source link. Exercise built-in marker/resource checks and reading all thirteen entries from a relocated isolated installation with no ambient Taste skills. Run the existing source suite, strict specs and full `npm test` on a frozen code tree; independently review integration and boundaries before delivery. No generated design is required by this integration task, so Component Conformance and Visual Acceptance remain unclaimed.

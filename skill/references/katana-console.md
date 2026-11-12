# KATANA Console reference

KATANA Console is a locally imported reference for operations and trading workspaces. It includes the Console/Paper semantic colors, typography and dot-matrix conventions, layout and motion rules, component specifications and interactive fixture prototypes.

The initial source is `2233admin/KATANAview`, commit `65f1a5317b7b7217d8ad6c453315cd30e89aee5b`, directory `design/katana-console/`. The manifest records every imported file and SHA256. At this commit there are 105 component directories and 104 component READMEs; Cover has a preview but no README. No missing specification is invented.

## Read and select

Run the read-only reference commands with the installed skill as `--root`, so the snapshot stays inside the existing CLI path boundary even when your working directory is another project. In a repository checkout, the skill root is `<checkout>/skill`.

```powershell
$pipelineSkill = 'C:/Users/Administrator/.agents/skills/design-pipeline'
node "$pipelineSkill/scripts/designer-pipeline.cjs" design-system search --root "$pipelineSkill" --snapshot references/katana-console-design-system-snapshot.json --query DOMLadder --json
node "$pipelineSkill/scripts/designer-pipeline.cjs" design-system route --root "$pipelineSkill" --snapshot references/katana-console-design-system-snapshot.json --query "data table" --platform web --json
node "$pipelineSkill/scripts/designer-pipeline.cjs" design-system project-tokens --root "$pipelineSkill" --snapshot references/katana-console-design-system-snapshot.json --json
```

The general component source catalog also exposes `katana-console/system`, linking here and to the snapshot. Select the individual KATANA snapshot to search its full catalog. Routing uses `reference-adaptation`; imported cards need target-project implementation and independent verification.

Read `katana-console/source/project/tokens.json` for original token semantics and `typography.md`, `readability.md`, `themes.md`, `layout.md`, `motion.md` and `states.md` for design rules. Read `spec.md`, `tools.md`, `atas.md`, `coverage.md` and the relevant component README for behavior and acceptance. Some older source documents contain historical implementation choices; current source precedence and explicit product decisions remain authoritative.

## Preview

```powershell
node "$pipelineSkill/scripts/preview-katana-console.cjs" --port 0
```

Open the loopback URL printed by the command. The preview supplies the missing Claude host tokens in its responses; imported source bytes remain unchanged. Standalone prototypes retain their own root tokens. Google Fonts links remain external and use fallback fonts when offline. This import does not contain downloaded fonts or icon packages.

## Synchronize from a new source version

Fetch or check out the desired KATANAview commit first, then run:

```powershell
node "$pipelineSkill/scripts/sync-katana-console.cjs" --source-root D:/projects/KATANAview --ref <full-commit-sha>
```

The importer reads tracked Git objects at that ref, so uncommitted or untracked source changes cannot enter the snapshot. Review the resulting manifest and catalog diff, run the registered tests and `node scripts/qa.cjs` in the pipeline repository, and inspect the preview before activating an update. Existing default providers and another project's design foundation are selected through their normal contracts.

## Source maturity and permission

The source's IMPLEMENTED declarations are separate from FIXTURE VERIFIED, BACKEND CONNECTED and PRODUCTION VERIFIED. Static cards, fixture prototypes and specifications remain distinguishable. Hash verification or catalog normalization does not upgrade component behavior, source capability or visual acceptance. Keep FIXTURE/PAPER labels and dependency limitations when using a prototype.

The user authorized internal copying. Upstream has no declared repository open-source license. The imported content is recorded as `LicenseRef-User-Authorized-Internal-Reuse`; it is not relicensed as design-pipeline's MIT code. Preserve source attribution and external dependency notices. Public redistribution or release of this imported snapshot needs its own source permission and is outside this local import.

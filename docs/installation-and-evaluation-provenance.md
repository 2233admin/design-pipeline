# Installation and evaluation provenance

Use this guide to identify which copy was packaged, installed or evaluated. For ordinary tool invocation and dependency discovery, see [Install and upgrade](../skill/references/installation.md). The issue motivating this correction is [#76](https://github.com/2233admin/design-pipeline/issues/76); new integration evidence belongs in [the new verification record](../openspec/changes/align-installed-and-evaluation-provenance/verification.md), not in old experiment logs.

## What each identity proves

| Evidence subject | Identity to retain | Permitted conclusion |
| --- | --- | --- |
| Committed source | Full commit, `skill/` Git tree, relevant Git blobs or file SHA-256 | These committed instructions/runtime bytes exist; not that they were installed or evaluated. |
| Published archive | Release tag and commit, archive SHA-256, generated `PACKAGE.json` | Identifies published bytes; a version label alone is insufficient. |
| Installed copy | Discovery path, realpath/link status, complete file inventory/digest and package metadata | Identifies the copy actually invoked; checks belong to this copy and project context. |
| Frozen model experiment | Recorded source lineage, frozen snapshot digest, inputs, actual model response identity, original outputs/logs | Describes that historical experiment only; not current model benefits. |
| Owner visual acceptance | Explicit owner verdict bound to the reviewed artifact SHA-256 | Accepts that artifact, not future outputs or the whole current tool. |

Keep four claims separate: **implemented**, **technically exercised**, **model experiment**, and **owner Visual Acceptance**. Technical smoke cannot establish instruction-following, causal model improvement or aesthetic quality. New implementation does not invalidate a historical failure by rewriting its log. Issues **#65 and #71–#75 remain open**; this guide does not complete them.

## Source and published releases: observed 2026-10-14

The integration baseline is committed source, not the final corrected publication snapshot:

- Commit: `18a688abb4ded14b8a8c4f47cf805255ca9a992f`.
- `skill/` Git tree: `708898d57212c08088516952f4cae44bbc955468`.
- `skill/SKILL.md` Git blob: `10b2d420c076fc20b7b025104770dee0db8865e4`; file SHA-256: `06e65375fe702c1434edcf1320d0bec8a66a32f6206324b1451c59bd9b2d281f`.
- `skill/scripts/designer-pipeline.cjs` Git blob: `eba17fae93168b47fd3e55444d04d3f6b466be6e`; file SHA-256: `a64731af352a94378b0be993b15dc59429231e62fbe49e1e30878be99399dc70`.
- `VERSION` contains `0.12.0-beta.1`, but this baseline's skill tree is not the published beta tree.

| Published line | Commit | `skill/` Git tree | Publication (UTC) |
| --- | --- | --- | --- |
| [Stable v0.10.0](https://github.com/2233admin/design-pipeline/releases/tag/v0.10.0) | `e688ec8e03b5185122943adbc0ded79c69d43484` | `b1c00e917b03a05290406662271c949b48e8e8bf` | 2026-09-02 10:51:11 |
| [Prerelease v0.12.0-beta.1](https://github.com/2233admin/design-pipeline/releases/tag/v0.12.0-beta.1) | `c5365897585e27acca1fdb929041311648255a7d` | `afdf727cc3a79da787f661af002fdc2b3393cb6f` | 2026-09-28 17:15:53 |

GitHub's release asset metadata reports these SHA-256 values. They were read from the API; archives were not downloaded or independently rehashed in this documentation slice.

| Release | Asset | Reported SHA-256 |
| --- | --- | --- |
| v0.10.0 | `design-pipeline-skill.tgz` | `697a188997dd804999688da444962b760b97c1bc4eb1b6dd696ea1c72a92e7ea` |
| v0.10.0 | `design-pipeline-skill.zip` | `aed0294b598fc4e712220027d386f69eaab63c65714985924734cc8277c1be68` |
| v0.10.0 | `checksums.txt` | `97050ca19abd3522dcf4c487624285fa2a20b49c5a1bb447ace0b61332b96b82` |
| v0.12.0-beta.1 | `design-pipeline-skill.tgz` | `82cbdc2a022fa9d3b7a10bbfed1850ddc3b71f58ac3a960ab1b79e152e45fdbb` |
| v0.12.0-beta.1 | `design-pipeline-skill.zip` | `e87da12103ac505c3728bada8fd7c1cfef64156d065a2a0d88f1abb0f66b50ee` |
| v0.12.0-beta.1 | `checksums.txt` | `6567cc28cf2e09db1a004330dbfc12509999091f94f34bcd27fdc6277226326f` |

Re-read immutable tag objects and metadata with:

```powershell
git rev-parse 'v0.10.0^{commit}' 'v0.10.0:skill' 'v0.12.0-beta.1^{commit}' 'v0.12.0-beta.1:skill'
gh api repos/2233admin/design-pipeline/releases/tags/v0.10.0
gh api repos/2233admin/design-pipeline/releases/tags/v0.12.0-beta.1
```

## Installations are distinct copies

**Live user-level developer entry, preserved:** `<user-home>/.agents/skills/design-pipeline` is a link/junction resolving to `<developer-checkout>/skill`. It is not a copied release. The original checkout's observed HEAD was `6e3b695f4cb540b7e6bfef4fe3f311ffe9c1ce32`, committed skill tree `ba8f2cd3f7b5f0ef359dbd25703d27b4d59558bf`; staged, unstaged and untracked differences were present. The observed live tree had 3,423 regular files and inventory digest `e4ef2774eee1a0ed649d6584b07474c63954c0196ccfbba391c8d0c05ac3c02b` using the convention below. This is a point-in-time identity of mutable development bytes, not a publication pin.

Observed preserved differences include `skill/SKILL.md` (live SHA-256 `e1f69a97ad4033ee158d2c175423349146cd4738e60de44216aa4d24634e7f5b`) and `skill/references/package-resources.json` (live SHA-256 `5caf5a59bd6bc176501fca8a7b7cb58b903d090e04defa1e1470b36983eafbf0`), motion recipes, catalogs, vendor/helper additions and local OpenSpec work. The audit reported unrelated-resource `doctor` failures for this entry; these failures were not rerun here. Its status is **development/unverified**. Neither the junction nor the original differences were changed.

**Historical canonical installation:** the [2026-10-07 verification record](../openspec/changes/archive/2026-10-13-complete-art-motion-internalization/verification.md) describes the legacy `<user-home>/.codex/skills/design-pipeline` location, a scoped synchronization of 2,606 files (347 added/changed, 17 obsolete paths removed, 2,259 unrelated files preserved), and a backup. Concurrent video-handoff runtime changes were explicitly not copied. Its historical staged/installed hash match is not a statement that the current whole checkout was installed. The [original record at #76's baseline](https://github.com/2233admin/design-pipeline/blob/3661adedccce7678336c719f485d9685a71f7158/openspec/changes/complete-huashu-internalization/verification.md) retains the original path/naming. Ignored installation logs and that backup are not reachable in the assigned worktree; no current identity or fresh check is asserted for this historical copy.

**Current verification target:** a fresh copied installation in a disposable project's `.agents/skills/design-pipeline`, derived from the entire verified integrated publication snapshot. This is the selected strategy, not partial-file synchronization. Final source/package/installed identities and checks remain pending for the integration owner. Do not replace a global developer entry to perform it.

## Frozen evaluation lineage

These are recorded historical identities, not rehashed snapshots or newly executed model runs:

| Record | Available lineage/identity | Limits |
| --- | --- | --- |
| [Historical V1/V2 and V3 results](../openspec/changes/evaluate-design-model-progress/results.md) | Development line `improve-beta-motion@139dca4`; full commit available: `139dca4daea470f0ca7529973421f55a403fc7eb`, committed skill tree `3dcba2e53a741ab5dc2d597bb7ccfcd440b95004`. V2 used uncommitted `require-film-material-routing` work. V3/V3q recorded snapshot SHA-256: `e082332c13613e1cf620503e4b9450b00be1095cb436c04fc2e6729f9fedf7da`. | No exact clean commit for those locally modified frozen bytes is established. V1 shared context/assets; V2 changed assets; not independent causal tests. Badge outputs were rejected by the owner; technical passes do not reverse that. |
| [2026-10-06 component pilot](../openspec/changes/evaluate-design-model-progress/component-evaluation-pilot-20261006.md) | HEAD `139dca4daea470f0ca7529973421f55a403fc7eb` plus retained local changes; recorded snapshot SHA-256 `f4871fe7212a6f57e93fe16d8ef65d88cfb6d168cd31c3145149150785bbe20c`; common input digest `729509854db56fae41f0c6b4c58093f860892800f7dcfad2dce7d91ff87c4212`. | Historical V3 stayed unchanged. Actual provider/model response identity is distinct from independently verifying provider weights. The pilot diagnoses problems, not improved visuals. |
| [2026-10-08 forward CSS/page answers](../evals/cases/skill-behavior/README.md) | Source commit `4b860c10bf0528b624f6e2d9d94799e871948aac`, committed skill tree `614f8d9d3d75984a50d2d5ad8171c6f9edb05abd`; preserved `input.css`, `result.css`, `index.html`. | Browser/CLI regressions consume frozen answers; they do not invoke an agent or grant Visual Acceptance. |

The ignored `.design-pipeline/video-ab/model-eval/toolkit-snapshot/` was not found in the assigned worktree or at the checked original-checkout path on this workstation. Original experiment logs/assets and CSS/page raw review logs are not supplied with this worktree; the absence of the checked snapshot path does not establish their absence from every machine or backup. Their maintained records remain reachable; snapshot digest algorithms and raw bytes cannot be freshly reconciled here. Do not equate a historical snapshot SHA-256 with the Git tree or the new inventory convention. Preserve old prompts, failures, timings, scores, model outputs and raw assets; add a new experiment record only when a real new model run is authorized and performed.

## Historical owner acceptance and task correction

The later-round task in `add-golden-case-library/tasks.md` was stale. All three existing case records explicitly record user acceptance on 2026-09-29 and the exact reviewed render:

| Case record | Accepted render SHA-256 |
| --- | --- |
| [MAD](../evals/cases/mad/openalice-mad-90s/case.json) | `1b795d0f07fe0613f340685d2a54d82a0bb9faf5c2b958e843650c62ebef4566` (CRF 23 preview) |
| [UI promo](../evals/cases/ui-promo/openalice-promo-15s/case.json) | `5f729c72e263808531a4a06525b319353264b92ccd97794f4c24e87bcbdc21fa` |
| [Explainer](../evals/cases/explainer/carry-the-eye-45s/case.json) | `59a5604e8ccc29326472f60fc6e1ba950cce7afa86b5742e66f7f353e206b9db` |

Only that task state was corrected. No rendering, model evaluation, acceptance of new frontend work or closure of deferred issues follows from these historical approvals.

## Reproduce the selected snapshot/package/install strategy

These commands are a procedure for the integration owner, **not evidence that this slice ran them**. Run after all changes are integrated, the final source commit is verified, and the workspace is clean. Use a fresh disposable destination. In PowerShell, from the integrated repository:

```powershell
$Commit = (git rev-parse HEAD).Trim()
if ($LASTEXITCODE -ne 0) { throw "Cannot identify source commit" }
if (git status --porcelain) { throw "Freeze only a clean integrated commit" }
$SkillTree = (git rev-parse "${Commit}:skill").Trim()
$Epoch = (git show -s --format=%ct $Commit).Trim()
$Run = Join-Path $PWD ".design-pipeline/provenance/$Commit"
if (Test-Path $Run) { throw "Use a fresh verification destination" }
New-Item -ItemType Directory -Path $Run | Out-Null
$SnapshotZip = Join-Path $Run "source-snapshot.zip"
git archive --format=zip --output=$SnapshotZip $Commit
if ($LASTEXITCODE -ne 0) { throw "Source snapshot failed" }
$Snapshot = Join-Path $Run "source"
Expand-Archive -LiteralPath $SnapshotZip -DestinationPath $Snapshot
$Dist = Join-Path $Run "package"
$OldVersion = $env:PACKAGE_VERSION
$OldEpoch = $env:SOURCE_DATE_EPOCH
try {
  $env:PACKAGE_VERSION = "0.0.0-dev+" + $Commit.Substring(0,12)
  $env:SOURCE_DATE_EPOCH = $Epoch
  node "$Snapshot/scripts/package.cjs" --output-root $Dist
  if ($LASTEXITCODE -ne 0) { throw "Package failed" }
} finally {
  $env:PACKAGE_VERSION = $OldVersion
  $env:SOURCE_DATE_EPOCH = $OldEpoch
}
Get-FileHash -Algorithm SHA256 $SnapshotZip
Get-Content "$Dist/checksums.txt"
Get-FileHash -Algorithm SHA256 "$Dist/design-pipeline-skill.tgz", "$Dist/design-pipeline-skill.zip"
$Extracted = Join-Path $Run "extracted"
Expand-Archive -LiteralPath "$Dist/design-pipeline-skill.zip" -DestinationPath $Extracted
$ExtractedSkill = Join-Path $Extracted "design-pipeline"
Get-Content "$ExtractedSkill/PACKAGE.json"
$Project = Join-Path $Run "project"
$SkillsRoot = Join-Path $Project ".agents/skills"
$Installed = Join-Path $SkillsRoot "design-pipeline"
node "$ExtractedSkill/scripts/install-local.cjs" --source $ExtractedSkill --root $SkillsRoot --target $Installed
if ($LASTEXITCODE -ne 0) { throw "Copied installation failed" }
```

The candidate uses a development version so it does not impersonate the published beta. For an actual release, use its approved version and release checks instead. `SOURCE_DATE_EPOCH` pins package timestamps to the source commit even though the extracted source has no `.git`. The packager includes all `skill/` files and generated `PACKAGE.json`/installer resources; retain their identities too. The root maintenance npm workspace is separate from the shipped skill.

### Exact file inventory and copy comparison

For this guide, the inventory is all regular files with slash-relative paths, each file's SHA-256, sorted by code-unit path order. The aggregate is SHA-256 of the UTF-8 `JSON.stringify(rows)` bytes (no trailing newline). This is an observational inventory, not a new receipt schema. The following inline Node command rejects links inside the tree and writes each complete inventory outside the measured tree:

```powershell
$Inventory = @'
const fs=require("node:fs"), p=require("node:path"), c=require("node:crypto");
const input=p.resolve(process.argv[1]), root=fs.realpathSync(input), rows=[];
function hash(b){return c.createHash("sha256").update(b).digest("hex");}
function walk(d){for(const n of fs.readdirSync(d).sort()){const f=p.join(d,n),s=fs.lstatSync(f);if(s.isSymbolicLink())throw Error("Link within tree: "+f);if(s.isDirectory())walk(f);else if(s.isFile())rows.push([p.relative(root,f).split(p.sep).join("/"),hash(fs.readFileSync(f))]);}}
walk(root);rows.sort((a,b)=>a[0]<b[0]?-1:a[0]>b[0]?1:0);
fs.writeFileSync(process.argv[2],JSON.stringify(rows)+"\n");
console.log(JSON.stringify({path:input,realpath:root,isLink:fs.lstatSync(input).isSymbolicLink(),files:rows.length,treeSha256:hash(JSON.stringify(rows))}));
'@
node -e $Inventory $ExtractedSkill "$Run/extracted-files.json"
if ($LASTEXITCODE -ne 0) { throw "Extracted inventory failed" }
node -e $Inventory $Installed "$Run/installed-files.json"
if ($LASTEXITCODE -ne 0) { throw "Installed inventory failed" }
if ((Get-Content "$Run/extracted-files.json" -Raw) -cne (Get-Content "$Run/installed-files.json" -Raw)) {
  throw "Installed bytes differ from extracted package"
}
```

For original development-copy observations, run the same inventory read against its path, storing output outside its source. Do not replace or synchronize it. To identify pinned source files independently, use `git rev-parse "${Commit}:skill/SKILL.md" "${Commit}:skill/scripts/designer-pipeline.cjs"` and `Get-FileHash` on those files in the extracted source. Git hashes and SHA-256 hashes are different identities.

### Installed CLI checks and new record

```powershell
node "$Installed/scripts/designer-pipeline.cjs" doctor --root $Project --json
if ($LASTEXITCODE -ne 0) { throw "Installed doctor failed" }
$OldRoots = $env:DESIGN_PIPELINE_SKILL_ROOTS
Push-Location $Project
try {
  $env:DESIGN_PIPELINE_SKILL_ROOTS = $SkillsRoot
  node "$Installed/scripts/check-deps.cjs" --json
  if ($LASTEXITCODE -ne 0) { throw "Installed dependency check failed" }
} finally {
  Pop-Location
  $env:DESIGN_PIPELINE_SKILL_ROOTS = $OldRoots
}
```

Retain stdout/stderr and exit codes for packaging, installation, `doctor`, `check-deps` and the affected public CLI/web smoke. The integration owner also runs targeted regression, `npm run specs:check`, repository QA and required CI. Record source commit/tree/file identities, candidate package version/digests, installation path/realpath/inventory, actual invoked entry and preserved original differences in the new change's verification record. A failed check stays failed until its cause is resolved and the affected path is exercised again; do not inherit a previous release's success. New model experiments and owner visual acceptance remain separate and unclaimed.

# Verification — 2026-10-06

## Results

| Check | Result |
| --- | --- |
| Document migration | Ten files moved: five root documents and five tracked scratch planning documents. SHA-256 is unchanged for every file; all former paths are absent. |
| Active navigation | All 22 local Markdown links found in the six affected entry/guidance documents resolve. Historical snapshots are explicitly labelled; their original root-relative source text is preserved. |
| Google format | `npx --yes --package "@google/design.md@0.4.0" designmd lint DESIGN.md`: exit 0, zero errors, zero warnings, five informational messages for the explicitly omitted host-owned token groups. |
| Existing foundation | `node skill/scripts/check-design-foundation.cjs --project-root . --json`: `ready`; DESIGN.md SHA-256 `21f5aadf511fb5c9033146f631d1055b72bacfd0a70e7068462f0e2259eef58b`. |
| Root hygiene guard | Existing QA accepts the ten allowed root Markdown documents. The actual guard, evaluated with additional directory entries `scratch-review.md`, `README_OLD.md` and `TEMP.MD`, rejects each and reports its name. |
| Repository regression | `node scripts/qa.cjs`: exit 0; 913 tests, 912 passed, zero failed, one skipped. Packaged CLI: 12/12 passed. Reproducible TGZ/ZIP/checksums passed; QA preserved repository status byte-for-byte. Existing Chromium and browser module were reused. |
| Installed skill guidance | Backed up and updated only `references/design-synthesis.md` in the canonical installed skill. Its bytes match the reviewed source, SHA-256 `411401e5796f11f323e6be2c52d1aa90cc157f4cf0ea1275b75da2d01d543bfd`. |
| Change hygiene | Strict OpenSpec validation and `git diff --check` passed. |

Raw local records are under ignored `.design-pipeline/root-cleanup/`: `migrations.json`,
`checks.json`, `repository-qa.log`, `installed-guide.json`, and the pre-edit document copies.
The Google lint output and foundation result are also retained in the session tool record.

## Scope

This verifies document organization, format and runtime/package compatibility. No graphical
deliverable was introduced, and these checks do not grant Visual Acceptance. Google defines the
visual document format; the root layout policy is this repository's convention. Archived evidence
hashes remain historical and were not rewritten to claim validation of the changed foundation.

## Follow-up: exclude local tools from publication

- Removed 304 entries from the Git index: root local-tool dotpaths, BMAD installation/output,
  the skill-manager lockfile and the obsolete BMAD handoff. The six previously relocated root/
  scratch entries were already absent from their old working paths. All 297 remaining local files
  retained their SHA-256; the BMAD handoff moved byte-for-byte to `_bmad-output/bmad-start.md`.
- Root dotpaths are ignored by default. The only tracked root dotpaths are now `.github/`,
  `.gitignore` and `.gitattributes`; Git reports zero ignored-but-tracked files. Nested bundled
  source dotfiles remain eligible for publication. The ignore policy and index removals are staged;
  no commit, push or history rewrite was performed.
- Root `CLAUDE.md` now imports `AGENTS.md` and points to `skill/SKILL.md`. The project entry test
  no longer reads a machine-local router or requires a BMAD-managed block. A temporary-Git test
  proves normal staging excludes local tools and that Git detects a force-added ignored file.
  Both tests first failed on the old configuration, then passed after the changes.
- A 2,813-file publication snapshot was copied from the current eligible working-tree files into
  a temporary repository, excluding local agent installations and generated state. Its tree hash
  is `6fb7a6514d2a1dee28b07b51af320302930253ad9e6c4ec8b18fc6576fccf853`.
- First full QA exposed an existing component-evaluation state-wait timeout: 912 passed, one
  failed, one skipped; package/install checks passed. The unchanged component suite passed
  12/12 alone. A full unchanged rerun then exited 0: 914 tests, 913 passed, zero failed, one
  skipped for missing native Blender; packaged CLI 12/12. Reproducibility, publication hygiene
  and repository-status preservation checks passed. No timeout or behavior was weakened.

Records in `.design-pipeline/root-cleanup/`: `local-exclusion.json`,
`publication-boundary-check.json`, `publication-snapshot.json`, `publication-qa.log`,
`publication-component-recheck.log` and `publication-qa-retry.log`. The owned temporary snapshot
is removed after verification; the local tools and the pre-change index backup are preserved.

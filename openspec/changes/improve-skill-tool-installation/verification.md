# Verification — 2026-10-06

The user requested continued tool improvement and installation as a skill. This change keeps
one `design-pipeline` skill, provides a contained project-copy command, and documents the real
installed-root invocation. No Site, release or remote repository was published.

Local evidence is retained under `.design-pipeline/skill-installation/`; host-specific paths,
the backup location and full install records remain there rather than in the distributed skill.

## Results

| Conclusion | Verification | Result and limits |
| --- | --- | --- |
| Project scaffolding works through the CLI | `node --test tests/designer-pipeline-cli.test.cjs` | Exit 0, 12/12 passed. The new scenario first failed with `UNKNOWN_COMMAND`, then passed after implementation. Original red/green output remains in this session's tool record. |
| Source and distributable remain compatible | `node scripts/qa.cjs` with the existing browser module and Chromium configured | Exit 0. 913 repository tests: 912 passed, 1 skipped because Blender is unavailable. Installed-package CLI: 12/12 passed. Reproducible ZIP/TGZ/checksums passed and repository status was unchanged. Raw record: `repository-qa.log`. |
| Standard skill installation selects the complete bundle | `npx skills add <local-skill-directory> --skill design-pipeline --agent codex --copy --yes`, run in a separate temporary project | Exit 0, exactly one skill selected; all 386 required resources present. Installed doctor and scaffold both exited 0. Records: `skills-cli-install.log`, `skills-cli-verification.json`. This checks project scope, not the global skills-CLI path or an unpublished remote revision. |
| Canonical Codex installation is updated | Existing `scripts/install-local.cjs` with explicit source, canonical root/target and `--replace`, after a byte-verified backup outside discovery roots | Exit 0; all 1,844 installed files match the source tree. The separate `.agents/skills/design-pipeline` consumer is unchanged. Record: `canonical-install.json`; installer output: `canonical-install.log`. |
| Actual installed entry can be used from a project | Installed absolute CLI path invoked `doctor`, `composition scaffold`, `composition capture` and `composition compare` from an independent project directory | Every command exited 0. Browser capture produced a real 1280×900 PNG; comparison found the expected 8,161 changed pixels in the existing example inputs. Record: `installed-entry.json`; output: `project/`. |
| Installed rendering is visible | Lead opened `project/capture/screenshot.png` with the image tool | Stroke, fitted caption, semantic copy and progress control rendered. This establishes the installed technical example, not professional artwork quality or user Visual Acceptance. |

## Acceptance conditions

| Condition | Evidence | Result |
| --- | --- | --- |
| Portable visual-craft study | `installed visual-craft scaffold works outside the skill and preserves authored files` in `tests/designer-pipeline-cli.test.cjs`; actual canonical installed capture | Passed. HTML/helper/license are byte-identical to bundled inputs, the copied module executes, and no workflow state is created. The same test runs against source and extracted-package installations. |
| Preserve authored work | The same CLI scenario exercises existing output, `--replace`, unsupported template, lexical path escape and an escaping directory link | Passed. Authored content remains unchanged and no outside output is created. |
| Install the current local skill | Verified backup, canonical install tree hashes, installed doctor/scaffold/capture/compare, compatibility-tree comparison | Passed for installed content and command entry. Fresh-session automatic model selection/loading is not measured. |
| Select the skill explicitly | Real skills-CLI install and installed-resource checks | Passed for a local project-scoped copy; exactly one skill selected. Documentation distinguishes published repository versions and local changes, and uses the installer-reported path. |

## Review and boundaries

The lead reviewed path resolution, bundled-file lookup, the generated script reference, license
copying and refusal to overwrite. The initial documentation incorrectly paired skills-CLI
installation with the local installer's destination; the actual install exposed this and the
instructions were corrected. Reused flags are already registered. No new receipt, gate,
dependency, installer or workflow state was introduced.

The canonical host installation and the older compatibility copy coexist for different
consumers; the loaded `SKILL.md` path identifies the selected copy. No client configuration or
compatibility consumer was changed. No claim is made about universal model behavior, fresh
client loading or aesthetic improvement. Blender remains the single environment skip.

---
name: design-pipeline
description: Routes work on this repository and applies its pipeline to target projects - promotional films, PV/MAD edits, 3D shots, scores, motion websites, product UI and design systems - through the front door's `next` loop, gates and OpenSpec contracts.
---

<objective>
Apply the repository's design-first workflow without bypassing its evidence,
receipt, gate, and release contracts. This file is a Claude Code router; the
packaged front door is `skill/SKILL.md`, which drives user projects one `next` step at a time;
its full stage contracts live in `skill/references/pipeline-reference.md`.
</objective>

<essential_principles>
- Design decisions precede implementation: preserve `DESIGN.md`, `MOTION.md`, and OpenSpec traceability.
- Reuse the existing v1 Gate, target/policyDigest, and selection receipts.
- Bind each stage receipt to its upstream receipt; upstream changes make downstream evidence stale.
- Keep Component Conformance and Visual Acceptance as separate acceptance dimensions.
- Treat target paths, snapshots, policy digests, and promotion receipts as immutable evidence inputs.
</essential_principles>

<quick_start>
1. Read `AGENTS.md` and the relevant OpenSpec change.
2. For a user deliverable, read `skill/SKILL.md` and loop on `node skill/scripts/designer-pipeline.cjs next --project-root <project>`.
3. For repository work, load only the reference the change touches and use `node skill/scripts/designer-pipeline.cjs <command>`.
4. Finish with `node scripts/qa.cjs` and report any remaining stale or blocked receipt.
</quick_start>

<intake>
Classify the request from its explicit context; ask only if the route is genuinely ambiguous:

- promo film, explainer, logo sting, 3D shot, score → `next` with `--deliverable film` (`skill/references/product-film-direction.md`);
- PV, MAD, beat montage from footage → `next` with `--deliverable edit` (`skill/references/film-edit.md`);
- design, reconstruction, motion pages or UI → `next` with `--deliverable web` or `ui` (`skill/references/pipeline-reference.md`);
- component-first, gate, receipt, or promotion → read the component-first OpenSpec change and matching tests;
- repository implementation or bug fix → read `openspec/project.md`, then proposal, tasks, and specs;
- release or packaging → read `CONTRIBUTING.md`, run the QA entrypoint, and verify package artifacts.
</intake>

<routing>
Use repository-relative paths with forward slashes. Do not invent a second gate,
receipt schema, target resolver, or policy digest. If an upstream receipt changes,
recompute or invalidate downstream evidence before proceeding.
</routing>

<validation>
Run `node scripts/qa.cjs`. For focused work, run the relevant declared test file
and the CLI command that exercises the changed contract. Confirm generated files
stay inside their declared target and temporary roots.
</validation>

<reference_guides>
- Front door and `next` loop: `skill/SKILL.md`
- Stage contracts and route catalog: `skill/references/pipeline-reference.md`
- Workflow design decisions: `openspec/changes/redesign-user-workflow/design.md`
- Project rules: `AGENTS.md`
- Change contracts: `openspec/changes/`
- Test manifest: `scripts/test-manifest.json`
</reference_guides>

<success_criteria>
The request is complete only when the selected route is satisfied, evidence is
fresh and lineage-valid, the required tests pass, and `node scripts/qa.cjs`
finishes without repository mutation.
</success_criteria>

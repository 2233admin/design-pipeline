---
name: design-pipeline
description: Routes design-first frontend work through this repository's OpenSpec, design evidence, component-first gates, and CLI contracts. Use when changing this repository or applying its design pipeline to a target project.
---

<objective>
Apply the repository's design-first workflow without bypassing its evidence,
receipt, gate, and release contracts. This file is a Claude Code router; the
complete packaged workflow remains in `skill/SKILL.md`.
</objective>

<essential_principles>
- Design decisions precede implementation: preserve `DESIGN.md`, `MOTION.md`, and OpenSpec traceability.
- Reuse the existing v1 Gate, target/policyDigest, and selection receipts.
- Bind each stage receipt to its upstream receipt; upstream changes make downstream evidence stale.
- Keep Component Conformance and Visual Acceptance as separate acceptance dimensions.
- Treat target paths, snapshots, policy digests, and promotion receipts as immutable evidence inputs.
</essential_principles>

<quick_start>
1. Read `CLAUDE.md` and the relevant OpenSpec change.
2. Read `skill/SKILL.md`, then load only the referenced section needed for the request.
3. Use `node skill/scripts/designer-pipeline.cjs <command>` for pipeline operations.
4. Finish with `node scripts/qa.cjs` and report any remaining stale or blocked receipt.
</quick_start>

<intake>
Classify the request from its explicit context; ask only if the route is genuinely ambiguous:

- design, reconstruction, or motion → read `skill/SKILL.md` and the design/motion contracts;
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
- Full workflow and route catalog: `skill/SKILL.md`
- Project rules: `CLAUDE.md`
- Change contracts: `openspec/changes/`
- Test manifest: `scripts/test-manifest.json`
</reference_guides>

<success_criteria>
The request is complete only when the selected route is satisfied, evidence is
fresh and lineage-valid, the required tests pass, and `node scripts/qa.cjs`
finishes without repository mutation.
</success_criteria>

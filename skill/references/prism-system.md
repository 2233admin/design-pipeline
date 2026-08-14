# Prism System, internalized

The complete reviewed Prism design-skill layer is bundled at
`references/prism-system/upstream/skills/`: 107 skills across design, discovery, Figma,
foundations, handoff, quality, React, and workflow. The snapshot is pinned to
`e93f2a3019162f1da19a9a8c3a5db0f1fba48631` and retains the upstream MIT license.

```bash
# Find one narrow recipe without loading the whole library
node skill/scripts/designer-pipeline.cjs prism search --query "dark mode token contrast" --category foundations --json

# Classify a design ask into Prism's five-route front door
node skill/scripts/designer-pipeline.cjs prism route --query "review this settings screen for accessibility" --json

# Prove the offline snapshot still matches the reviewed Git tree
node skill/scripts/designer-pipeline.cjs prism verify --json
```

## Native pipeline contract

Prism contributes five rules to the existing pipeline; it does not create a parallel design
system:

1. Load product Design DNA before proposing a direction: identity, voice, visual rules, target
   surface, and reference evidence must be explicit.
2. Route work as `prototype`, `ui-craft`, `new-experience`, `handoff`, or `corpus-distill`, then
   execute the returned skills inside the pipeline's existing brief, directions, implementation,
   and QA stages.
3. Keep brand inputs and semantic design tokens as the sources of truth. Derived values must name
   their recipe; light/dark and platform projections must remain traceable to the same roles.
4. Treat captured screens as evidence: retain raw inputs, distil patterns separately, version the
   learned rules, and never let a screenshot silently become a component or token source.
5. Verify the rendered result, not only generated files: token derivation, literal leakage,
   interaction no-op defaults, documented variables, contrast, and painted browser values are
   distinct checks.

## Boundary

Only the reusable skill layer is mirrored. Prism's component packages, sample brand, fonts,
screenshots, controller, Storybook, generated themes, and build dependencies are intentionally not
bundled: this repository already owns those runtime contracts. Bundled skills are inert reference
material; their `autonomy` field does not authorize paid, credentialed, destructive, publishing,
messaging, or other external actions. Current workspace rules and project `DESIGN.md`/`MOTION.md`
remain authoritative.

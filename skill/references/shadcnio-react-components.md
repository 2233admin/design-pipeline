# shadcnio/react-shadcn-components index

The complete reviewed upstream repository is bundled at
`vendor/shadcnio-react-components/upstream/`: its MIT `LICENSE` and `README.md`. The README
indexes 75 React component and hook references across AI, buttons, hooks, and text.

This repository does **not** include the implementation shown on linked `www.shadcn.io` pages.
Search results are therefore reference candidates, not copy authority. The owner's **2026-10-12**
decision for all 75 linked implementations is **study and reimplement only, never copy code**;
no paid entitlement was stated. The index's MIT grant covers its two bundled files, not the external
implementations. Check dependencies, accessibility, server/client boundary and project fit when
reimplementing an idea. Do not install, execute a generator or adopt paid implementations merely
because this index returns them.

```bash
# Find a narrow component or hook pattern from the bundled README index
node skill/scripts/designer-pipeline.cjs shadcnio search \
  --query "AI prompt input" --category ai --json

# Verify the pinned two-file upstream snapshot and generated index counts
node skill/scripts/designer-pipeline.cjs shadcnio verify --json
```

## Pipeline use

- **Stage 0:** Search only when React, Tailwind, shadcn-style UI, AI-chat, button, hook, or text
  behavior is relevant. Record the selected page as reference evidence, not source code evidence.
- **Stages 2–3:** Adapt the behavior into the project's `DESIGN.md`, existing tokens, semantics,
  responsive rules, and dependency constraints. Prefer existing project primitives and browser APIs.
- **Stage 5:** Treat each result as `reference-adaptation` with status `review`; external
  implementation licenses remain unassessed, and the dated owner no-copy decision still applies.
- **Stage 6:** Verify keyboard behavior, focus, reduced motion, SSR/client placement, cleanup, and
  any network or storage effects before closing the change.

The manifest records the pinned revision and a canonical snapshot hash. `shadcnio verify` blocks on
missing, added, or byte-altered upstream files.

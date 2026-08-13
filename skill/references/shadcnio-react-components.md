# shadcnio/react-shadcn-components index

The complete reviewed upstream repository is bundled at
`references/shadcnio-react-components/upstream/`: its MIT `LICENSE` and `README.md`. The README
indexes 75 React component and hook references across AI, buttons, hooks, and text.

This repository does **not** include the implementation shown on linked `www.shadcn.io` pages.
Search results are therefore reference candidates, not copy authority: verify the selected page's
implementation license, dependencies, accessibility, server/client boundary, and project fit before
adapting an idea or adding code. Do not install a package, execute a generator, or copy webpage code
solely because this index returns it.

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
- **Stage 5:** Treat each result as `reference-adaptation` with status `review`; implementation
  license remains `unverified` until primary-source evidence is recorded.
- **Stage 6:** Verify keyboard behavior, focus, reduced motion, SSR/client placement, cleanup, and
  any network or storage effects before closing the change.

The manifest records the pinned revision and a canonical snapshot hash. `shadcnio verify` blocks on
missing, added, or byte-altered upstream files.

# Brief

## Goal

Make Koboyo discoverable for explicit hand-drawn icon requests without turning an uncommon visual
style into a default dependency or a shadcn preset.

## Scope

- Add one governed Koboyo icon-source entry to the existing frontend-stack registry.
- Route explicit Koboyo and hand-drawn-icon intent through `resolve-stack`.
- Preserve official license, read-only MCP, credential, and mutation boundaries in the decision.
- Keep ordinary frontend requests and shadcn icon presets unchanged.

## Constraints

- No icon corpus, package, API key, remote prompt, or MCP runtime is bundled or executed.
- Canvas mutations are outside this icon-source route.
- Bulk use remains `review` because the live catalog and license page publish different icon counts.

## Acceptance

- `design-system options` exposes one hand-drawn icon source.
- An explicit Koboyo brief routes `koboyo/icons` with its source, license, endpoint, read-only tools,
  requirements, and constraints intact.
- An ordinary dashboard brief does not route Koboyo, and `koboyo` is not a shadcn icon library.

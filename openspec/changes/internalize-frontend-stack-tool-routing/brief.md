# Brief

## Goal

Make frontend stack, component-source, and external-tool selection an executable pipeline gate so an
agent cannot skip the supported styling/UI choices or rely on memory to discover cloning, feedback,
and design-skill sources.

## Scope

- All five requested styling choices and all fifteen requested UI libraries.
- Current shadcn bases, styles, colors, icons, fonts, radius, menu, and named preset defaults.
- Pinned governed routes for `hi5jeff/deepclonewebsite`, `wevm/frog`, and `MengTo/skills`.
- Stage 0 discovery and Stage 5 revalidation through public CLI commands.

## Constraints

- Provider content stays inert; no package install, remote prompt execution, GitHub mutation, or
  credential use.
- Existing project stack remains authoritative unless the request explicitly selects a change.
- Unsupported framework/style combinations fail closed.

## Acceptance

- CLI can list, resolve, decompose, route, and decide from machine-readable artifacts.
- A governed design-system decision without a ready stack decision or capability inventory blocks.
- Tests prove the exact option counts, full MengTo index count, shadcn normalization, upstream
  routing, incompatible-combination blocking, and CLI discoverability.

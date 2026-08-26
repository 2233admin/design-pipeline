# Proposal: add a job dispatcher route

## Why

The pipeline now has many catalogs and CLI families. Stage 0 tells agents to search them as peers.
That does not scale: each new capability becomes another mandatory search. Routing must go through
one dispatcher so a new feature is a registry entry, not a new Stage 0 door.

## What

- Add a versioned job registry as the extension point for knowledge and execution allocation.
- Add public `designer-pipeline route` that classifies a brief into exactly one primary job.
- Keep existing catalog CLIs as escape hatches. Stage 0 opens only the primary knowledge door.
- Kernel checks (`foundation`, `toolchain`) remain attached to every ready route.

## Non-Goals

- Do not merge Astryx, MengTo, Prism, shadcnio, and DesignMD into one index.
- Do not delete catalog commands.
- Do not change Methodology Kernel gates or make DesignMD executable-ready.
- Do not auto-install providers.

## Impact

Agents start with one command. Adding a capability means adding a job with keywords, a primary
knowledge source, admission, and next commands. Ambiguous briefs fail closed instead of searching
every catalog.

# Astryx Design System Provider

Use Astryx as attributed candidate evidence, not as a required dependency or project design
authority. The complete local workflow works from a supplied JSON snapshot. If an Astryx CLI
already exists inside the project root, the bundled read-only translator can acquire a fresh local
snapshot from it. Design Pipeline never installs Astryx.

## What Owns What

| Concern | Authority |
| --- | --- |
| Product visual, layout, typography, color, component, and accessibility decisions | Project `DESIGN.md` |
| Motion language or explicit static posture | Project `MOTION.md` |
| Candidate components, docs, templates, hooks, and tokens | Attributed design-system snapshot/catalog |
| Validation, projection loss, runtime decision, benchmark, and receipts | `designer-pipeline` |

Provider evidence cannot overwrite `DESIGN.md` or `MOTION.md`. It is also separate from
`ui-pattern-catalog.json`: design-system search never copies provider entries into that catalog.

## Choose An Input Path

| You have | Use |
| --- | --- |
| A reviewed JSON export | Supplied snapshot; no Astryx runtime is needed |
| An existing local Astryx CLI | Bundled read-only translator plus `--provider-cli-path` |
| Another provider or a custom export process | A reviewed local `--adapter-path` |
| None of the above | Use the bundled profile/catalog only as pinned reference evidence, or keep the project `custom` |

Start by checking the Agent-discoverable command and profile surface:

```powershell
node skill/scripts/designer-pipeline.cjs --help
node skill/scripts/designer-pipeline.cjs design-system profiles --root . --json
```

The profile result identifies Astryx, its official sources, reviewed license, compatible runtime
range, supported provider API, and canary policy. A profile is metadata; it does not prove that
Astryx is installed or suitable for adoption.

When `--snapshot` and `--catalog` are both omitted, normalize, search, token projection, and decision
use the packaged pinned Astryx snapshot. That snapshot is inert, versioned candidate evidence, not a
live provider lookup. Supply your own snapshot or acquired catalog when current local state matters.

## Path A: Prepare A Supplied Snapshot

Create a JSON file inside the project root with schema
`design-pipeline.design-system-snapshot.v1`. Use a stable namespace and preserve the source and
license of every item. Top-level collections are `components`, `docs`, `templates`, and `hooks`.
At least one collection must contain an item.

This minimal snapshot includes a provider manifest entry so runtime and token decisions have an
explicit source:

```json
{
  "schema": "design-pipeline.design-system-snapshot.v1",
  "version": "1",
  "namespace": "astryx-local",
  "provenance": {
    "source": "Astryx local JSON export",
    "url": "https://github.com/facebook/astryx",
    "license": "MIT",
    "attribution": "Copyright Meta Platforms, Inc. and affiliates"
  },
  "components": [
    {
      "id": "Button",
      "name": "Button",
      "kind": "component",
      "category": "Actions",
      "status": "stable",
      "package": "@astryxdesign/core"
    }
  ],
  "docs": [
    {
      "id": "provider-manifest",
      "name": "Astryx provider manifest",
      "category": "provider",
      "status": "stable",
      "runtime": {
        "react": ">=19",
        "react-dom": ">=19",
        "@stylexjs/stylex": "^0.19"
      },
      "theme": {
        "tokens": {
          "color.action.primary": {
            "value": "#0866ff",
            "type": "color",
            "role": "color.action.primary"
          },
          "spacing.small": {
            "value": "0.5rem",
            "type": "dimension",
            "role": "space.inline.small"
          }
        }
      }
    }
  ]
}
```

Keep snapshot content inert:

- include JSON values only;
- use relative contained paths if an item has `path` or a key ending in `Path`;
- do not embed functions, imports, executable source, secrets, or credentials;
- do not flatten missing license or attribution into an unverified guess;
- record prerelease items as `canary`, `beta`, or `experimental` rather than `stable`.

Normalize without writing:

```powershell
node skill/scripts/designer-pipeline.cjs design-system normalize `
  --root . `
  --snapshot evidence/astryx-snapshot.json `
  --json
```

Expected: exit `0` and a `design-pipeline.cli-result.v1` result containing `status: "valid"` and a
`design-pipeline.design-system-catalog.v1` catalog. The source file is unchanged and no output file
is created.

Write the validated catalog explicitly:

```powershell
node skill/scripts/designer-pipeline.cjs design-system normalize `
  --root . `
  --snapshot evidence/astryx-snapshot.json `
  --output evidence/astryx-catalog.json `
  --write `
  --json
```

Expected: the same catalog is atomically written below `--root`. `--output` without `--write` does
not authorize a write.

## Path B: Acquire From An Existing Local Astryx CLI

Prepare the local CLI outside Design Pipeline. The CLI file must already exist inside `--root` and
end in `.js` or `.mjs`. Do not use this command as an installation step.

Run the bundled translator with an explicit path:

```powershell
node skill/scripts/designer-pipeline.cjs design-system acquire `
  --root . `
  --provider astryx `
  --provider-cli-path node_modules/@astryxdesign/cli/clients/cli/bin/astryx.mjs `
  --api-version 1 `
  --output-root evidence/astryx-acquisition `
  --json
```

If the installed package uses another internal layout, replace `--provider-cli-path` with the actual
root-contained Astryx CLI file. When the known project-local default exists, the flag may be
omitted; explicit paths are preferable for reproducible evidence.

The bundled translator issues only read-only JSON requests corresponding to:

- provider manifest;
- component catalog/details;
- documentation catalog/details;
- template catalog/details;
- hook catalog/details.

It does not expose Astryx install, init, swizzle, upgrade, codemod, theme build, or Agent instruction
installation. It does not import Astryx `.doc.mjs` files into the Design Pipeline process.

Expected on success:

- exit `0`;
- result `status: "complete"`;
- validated snapshot, normalized catalog, and
  `design-pipeline.design-system-provider-receipt.v1` in the JSON response;
- `evidence/astryx-acquisition/provider.json` atomically containing the validated snapshot, normalized
  catalog, and receipt;
- receipt hashes for adapter results, the local provider CLI, and the snapshot.

Expected on unavailable/invalid acquisition:

- exit `2` for a valid attempt that did not complete, or `1` for invalid input;
- receipt `status: "failed"` with failures;
- no partial snapshot presented as successful.

## Path C: Prepare A Custom Local Adapter

A custom adapter is executable trusted code. Keep it inside `--root`, review it before use, and pass
it explicitly with `--adapter-path`. It receives:

```text
--api-version <version> --type <manifest|component|docs|template|hook> [--id <resource-id>]
```

It must write exactly one JSON object to stdout:

```json
{
  "schema": "design-pipeline.design-system-provider-envelope.v1",
  "apiVersion": "1",
  "type": "component",
  "provider": {
    "id": "astryx",
    "version": "0.2.0",
    "license": "MIT"
  },
  "data": {
    "id": "Button",
    "name": "Button",
    "category": "Actions",
    "status": "stable"
  }
}
```

Adapter rules:

1. Return JSON data only; send diagnostics to stderr.
2. Keep provider ID, version, and license stable across the acquisition.
3. Return `data.id` equal to the requested `--id`.
4. Use the manifest to report runtime compatibility, tokens, item IDs, and projection loss.
5. Read only local, reviewed inputs. Do not install, mutate the project, publish, or inject
   instructions.
6. Do not import provider `.doc.mjs` modules merely to obtain metadata; consume reviewed JSON output
   or a pre-exported snapshot.
7. Exit nonzero on unsupported input instead of returning a plausible placeholder.

Run it:

```powershell
node skill/scripts/designer-pipeline.cjs design-system acquire `
  --root . `
  --provider astryx `
  --adapter-path tools/read-only-design-system-adapter.mjs `
  --api-version 1 `
  --output-root evidence/custom-acquisition `
  --json
```

The custom adapter receives the same timeout, output-size, environment, envelope, identity, license,
hash, and path checks as the bundled translator.

## Search The Catalog

Search a normalized catalog:

```powershell
node skill/scripts/designer-pipeline.cjs design-system search `
  --root . `
  --catalog evidence/astryx-catalog.json `
  --query Button `
  --kind component `
  --category Actions `
  --status stable `
  --json
```

All filters are optional. `--kind` is one of `component`, `doc`, `template`, or `hook`.
`--limit` may cap results. Expected: exit `0` with `status: "valid"`, catalog namespace, and
deterministically ordered results. Search is read-only and does not query the network.

## Project Tokens And Inspect Loss

Project catalog tokens without writing:

```powershell
node skill/scripts/designer-pipeline.cjs design-system project-tokens `
  --root . `
  --catalog evidence/astryx-catalog.json `
  --json
```

Write only after reviewing `projection.losses`:

```powershell
node skill/scripts/designer-pipeline.cjs design-system project-tokens `
  --root . `
  --catalog evidence/astryx-catalog.json `
  --output evidence/astryx-token-projection.json `
  --write `
  --json
```

Projection status means:

| Status | Meaning | Next action |
| --- | --- | --- |
| `ready` | The existing token validator accepts the projection and no unresolved loss remains | Use as attributed input to project synthesis |
| `review` | A type, role, mode, or other semantic mapping needs human review | Resolve or explicitly map every loss |
| `blocked` | Collision or invalid/unsafe mapping prevents a valid token artifact | Correct the source/mapping; do not adopt |

Projection does not update `DESIGN.md`. Map accepted tokens into the project foundation through the
normal design synthesis and review flow.

## Record The Runtime Decision

Create a request file. Keep the catalog outside the request and pass it with `--catalog`:

```json
{
  "schema": "design-pipeline.design-system-decision-request.v1",
  "version": "1",
  "mode": "reference",
  "candidateId": "astryx:doc:provider-manifest",
  "project": {
    "designMd": true,
    "runtime": {
      "react": "19.1.0",
      "reactDom": "19.1.0",
      "stylex": "0.19.0"
    }
  }
}
```

Evaluate without writing:

```powershell
node skill/scripts/designer-pipeline.cjs design-system decide `
  --root . `
  --artifact evidence/design-system-request.json `
  --catalog evidence/astryx-catalog.json `
  --json
```

Add `--output evidence/design-system-decision.json --write` only after reviewing
`decision.selected`, `decision.rejected`, `decision.rationale`, `decision.evidence`, and
`decision.projectAuthority`.

### Decision Modes

| Mode | Use it when | Additional gate |
| --- | --- | --- |
| `reference` | Astryx contributes docs, patterns, or examples while the project keeps its runtime | No runtime adoption; prerelease still requires explicit allowance |
| `adopt` | The project will use the selected provider runtime/components | Compatible React/React DOM/StyleX plus admitted adapter intake |
| `substitute` | The project intentionally replaces an existing/candidate system with a compatible alternative | Admitted intake; existing system is recorded as explicitly substituted |
| `custom` | The project keeps or creates its own design system | Provider candidate is not required |

An existing project system remains governing authority. No eligible candidate produces `blocked`;
the command never silently selects Astryx. Prerelease entries require `--allow-canary`, which is an
explicit evidence decision, not a recommendation.

## Run A Fair Benchmark

`benchmark evaluate` still accepts v1 manifest/measurement pairs. A v2 manifest must map every
system to exactly one release channel and set all fairness conditions to true:

```json
{
  "systems": ["astryx", "custom"],
  "systemChannels": {
    "astryx": "stable",
    "custom": "stable"
  },
  "fairness": {
    "samePrompts": true,
    "sameEnvironmentClass": true,
    "evaluatorBlind": true,
    "expectedAnswersHidden": true,
    "freshContext": true,
    "representativeDelivery": true
  }
}
```

Channels are `stable`, `canary`, `beta`, or `experimental`. The `systemChannels` keys must exactly
match `systems`; unknown channels and missing or extra mappings fail closed. A stable system cannot
be compared with any prerelease channel unless the manifest explicitly sets
`"allowCanaryMix": true`. The permission applies equally to every candidate and comparator; it does
not grant Astryx special treatment.

Before giving tasks to a development Agent, derive a brief that removes private expectations and
expected components:

```powershell
node skill/scripts/designer-pipeline.cjs benchmark brief `
  --root . `
  --manifest evidence/design-system-benchmark-v2.json `
  --json
```

Expected: a `design-pipeline.benchmark-developer-brief.v1` containing scenario IDs, operations,
dimensions, and prompts only. Give this brief to the candidate Agent; keep the full manifest with
the evaluator so expected answers remain hidden.

Run:

```powershell
node skill/scripts/designer-pipeline.cjs benchmark evaluate `
  --root . `
  --manifest evidence/design-system-benchmark-v2.json `
  --measurements evidence/design-system-measurements-v2.json `
  --json
```

Apply the same required scenarios, prompts, thresholds, environment class, evidence requirements,
and evaluator to Astryx, another provider, a substitute, and a custom system. Keep expected answers
private from candidates. A required failure makes the result fail even when the aggregate passes;
missing required evidence blocks. Invalid fairness or channel mapping cannot pass. Results retain
the verified per-system channels, mix decision, and invalid reasons. Do not mix stable and
prerelease admission results without `allowCanaryMix: true` in that benchmark manifest.

## Safety Boundary

The acquisition process is bounded, but a custom adapter is still executable code:

- Design Pipeline does not install Astryx or any provider.
- Design Pipeline does not fetch a hosted catalog or grant network authority.
- The adapter environment removes common proxy, token, credential, secret, password,
  authorization, and API-key variables.
- Adapter and provider CLI paths must resolve to existing files under `--root`.
- Adapter execution uses no shell and has bounded time and stdout.
- Output remains below `--output-root` and publishes atomically.
- Unknown schemas, API versions, commands, provider identity, licenses, and prerelease status fail
  closed.
- The bundled translator does not make the Astryx CLI trusted beyond the requested read-only JSON
  surface.
- The process boundary is not an OS network sandbox. For offline proof, run in an offline or
  sandboxed host and retain the receipt.
- Provider output never gains authority to edit `AGENTS.md`, `DESIGN.md`, `MOTION.md`, or the UI
  pattern catalog.

## License And Source

The built-in Astryx profile and pinned snapshot record the official source, revision/version,
license, and attribution. Acquisition verifies that adapter-reported provider identity and license
match the profile and binds the result to content hashes.

The profile's MIT assertion applies to the reviewed Astryx source identified by the profile. It is
not a blanket license for third-party integrations, copied examples, or user-supplied content.
Preserve item-level provenance when it differs, and do not adopt artifacts with missing or
conflicting license evidence.

Official references:

- [Astryx repository and MIT license](https://github.com/facebook/astryx)
- [Astryx design-system site](https://astryx.atmeta.com/)
- [Astryx CLI integrations](https://astryx.atmeta.com/docs/cli-integrations)
- [Astryx migration and JSON CLI examples](https://astryx.atmeta.com/docs/migration)
